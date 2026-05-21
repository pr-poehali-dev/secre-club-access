"""Получение пропусков пользователя и создание/редактирование/удаление (только для админов)."""
import json
import os
import psycopg2
from datetime import datetime, timezone, timedelta

SCHEMA = "t_p49537415_secre_club_access"

PRIV_LABEL = {
    "client": "Клиент",
    "helper": "Помощник",
    "admator": "Администратор",
    "developer": "Разработчик",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def get_user_id_by_token(cur, token):
    cur.execute(
        "SELECT user_id FROM " + SCHEMA + ".sessions WHERE token = %s",
        (token,)
    )
    row = cur.fetchone()
    return row[0] if row else None

def is_admin(cur, user_id):
    cur.execute(
        "SELECT 1 FROM " + SCHEMA + ".admins WHERE user_id = %s",
        (user_id,)
    )
    return cur.fetchone() is not None

def handler(event: dict, context) -> dict:
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Authorization",
        "Content-Type": "application/json",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    all_headers = event.get("headers") or {}
    raw_token = all_headers.get("X-Authorization", "") or all_headers.get("Authorization", "")
    token = raw_token.replace("Bearer ", "").strip()
    method = event.get("httpMethod", "GET")

    conn = get_conn()
    cur = conn.cursor()

    try:
        # GET — пропуска текущего пользователя
        if method == "GET":
            if not token:
                return {"statusCode": 401, "headers": headers, "body": json.dumps({"error": "Нет авторизации"})}

            user_id = get_user_id_by_token(cur, token)
            if not user_id:
                return {"statusCode": 401, "headers": headers, "body": json.dumps({"error": "Сессия недействительна"})}

            admin = is_admin(cur, user_id)

            # Если admin — вернуть все пропуска всех пользователей с именами
            if admin:
                cur.execute(
                    "SELECT p.id, p.display_name, p.privilege, p.no_timer, p.expires_at, p.created_at, p.user_id, u.username "
                    "FROM " + SCHEMA + ".passes p "
                    "JOIN " + SCHEMA + ".users u ON u.id = p.user_id "
                    "ORDER BY p.created_at DESC"
                )
            else:
                cur.execute(
                    "SELECT p.id, p.display_name, p.privilege, p.no_timer, p.expires_at, p.created_at, p.user_id, u.username "
                    "FROM " + SCHEMA + ".passes p "
                    "JOIN " + SCHEMA + ".users u ON u.id = p.user_id "
                    "WHERE p.user_id = %s ORDER BY p.created_at DESC",
                    (user_id,)
                )

            rows = cur.fetchall()
            now = datetime.now(timezone.utc)
            passes = []
            for r in rows:
                pid, display_name, privilege, no_timer, expires_at, created_at, pass_user_id, username = r
                if expires_at and expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                if created_at and created_at.tzinfo is None:
                    created_at = created_at.replace(tzinfo=timezone.utc)
                active = no_timer or privilege == "developer" or (expires_at is not None and expires_at > now)
                passes.append({
                    "id": pid,
                    "display_name": display_name,
                    "privilege": privilege,
                    "privilege_label": PRIV_LABEL.get(privilege, privilege),
                    "no_timer": no_timer,
                    "expires_at": expires_at.isoformat() if expires_at else None,
                    "created_at": created_at.isoformat(),
                    "active": active,
                    "user_id": pass_user_id,
                    "username": username,
                })
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"passes": passes, "is_admin": admin})}

        # POST — создать пропуск (только админ)
        if method == "POST":
            if not token:
                return {"statusCode": 401, "headers": headers, "body": json.dumps({"error": "Нет авторизации"})}

            admin_id = get_user_id_by_token(cur, token)
            if not admin_id:
                return {"statusCode": 401, "headers": headers, "body": json.dumps({"error": "Сессия недействительна"})}

            if not is_admin(cur, admin_id):
                return {"statusCode": 403, "headers": headers, "body": json.dumps({"error": "Нет прав администратора"})}

            body = json.loads(event.get("body") or "{}")
            target_username = (body.get("username") or "").strip()
            display_name = (body.get("display_name") or "").strip()
            privilege = body.get("privilege", "client")
            no_timer = bool(body.get("no_timer", False))
            duration_value = body.get("duration_value")
            duration_unit = body.get("duration_unit", "hours")

            if not target_username or not display_name:
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Заполните все поля"})}

            if privilege not in ("client", "helper", "admator", "developer"):
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Неверная привилегия"})}

            cur.execute(
                "SELECT id FROM " + SCHEMA + ".users WHERE username = %s",
                (target_username,)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": headers, "body": json.dumps({"error": "Пользователь не найден"})}

            target_user_id = row[0]

            expires_at = None
            if privilege != "developer" and not no_timer and duration_value:
                dv = int(duration_value)
                if duration_unit == "minutes":
                    delta = timedelta(minutes=dv)
                elif duration_unit == "hours":
                    delta = timedelta(hours=dv)
                else:
                    delta = timedelta(days=dv)
                expires_at = datetime.now(timezone.utc) + delta

            cur.execute(
                "INSERT INTO " + SCHEMA + ".passes (user_id, display_name, privilege, no_timer, expires_at, created_by) "
                "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                (target_user_id, display_name, privilege, no_timer, expires_at, admin_id)
            )
            new_id = cur.fetchone()[0]
            conn.commit()

            return {"statusCode": 200, "headers": headers, "body": json.dumps({
                "id": new_id,
                "message": "Пропуск создан"
            })}

        # PUT — редактировать пропуск (только админ)
        if method == "PUT":
            if not token:
                return {"statusCode": 401, "headers": headers, "body": json.dumps({"error": "Нет авторизации"})}

            admin_id = get_user_id_by_token(cur, token)
            if not admin_id:
                return {"statusCode": 401, "headers": headers, "body": json.dumps({"error": "Сессия недействительна"})}

            if not is_admin(cur, admin_id):
                return {"statusCode": 403, "headers": headers, "body": json.dumps({"error": "Нет прав администратора"})}

            body = json.loads(event.get("body") or "{}")
            pass_id = body.get("id")
            display_name = (body.get("display_name") or "").strip()
            privilege = body.get("privilege", "client")
            no_timer = bool(body.get("no_timer", False))
            duration_value = body.get("duration_value")
            duration_unit = body.get("duration_unit", "hours")

            if not pass_id or not display_name:
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Заполните все поля"})}

            if privilege not in ("client", "helper", "admator", "developer"):
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Неверная привилегия"})}

            cur.execute("SELECT id FROM " + SCHEMA + ".passes WHERE id = %s", (pass_id,))
            if not cur.fetchone():
                return {"statusCode": 404, "headers": headers, "body": json.dumps({"error": "Пропуск не найден"})}

            expires_at = None
            if privilege != "developer" and not no_timer and duration_value:
                dv = int(duration_value)
                if duration_unit == "minutes":
                    delta = timedelta(minutes=dv)
                elif duration_unit == "hours":
                    delta = timedelta(hours=dv)
                else:
                    delta = timedelta(days=dv)
                expires_at = datetime.now(timezone.utc) + delta

            cur.execute(
                "UPDATE " + SCHEMA + ".passes SET display_name = %s, privilege = %s, no_timer = %s, expires_at = %s WHERE id = %s",
                (display_name, privilege, no_timer, expires_at, pass_id)
            )
            conn.commit()

            return {"statusCode": 200, "headers": headers, "body": json.dumps({"message": "Пропуск обновлён"})}

        # DELETE — удалить пропуск (только админ)
        if method == "DELETE":
            if not token:
                return {"statusCode": 401, "headers": headers, "body": json.dumps({"error": "Нет авторизации"})}

            admin_id = get_user_id_by_token(cur, token)
            if not admin_id:
                return {"statusCode": 401, "headers": headers, "body": json.dumps({"error": "Сессия недействительна"})}

            if not is_admin(cur, admin_id):
                return {"statusCode": 403, "headers": headers, "body": json.dumps({"error": "Нет прав администратора"})}

            body = json.loads(event.get("body") or "{}")
            pass_id = body.get("id")

            if not pass_id:
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Не указан ID пропуска"})}

            cur.execute("SELECT id FROM " + SCHEMA + ".passes WHERE id = %s", (pass_id,))
            if not cur.fetchone():
                return {"statusCode": 404, "headers": headers, "body": json.dumps({"error": "Пропуск не найден"})}

            cur.execute("DELETE FROM " + SCHEMA + ".passes WHERE id = %s", (pass_id,))
            conn.commit()

            return {"statusCode": 200, "headers": headers, "body": json.dumps({"message": "Пропуск удалён"})}

        return {"statusCode": 405, "headers": headers, "body": json.dumps({"error": "Method not allowed"})}

    finally:
        cur.close()
        conn.close()
