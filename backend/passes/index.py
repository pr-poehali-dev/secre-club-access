"""Управление пропусками: создание (только admator/developer), получение своих пропусков."""
import json
import os
import hashlib
import psycopg2

SCHEMA = "t_p49537415_secre_club_access"
ADMIN_ROLES = ("admator", "developer")

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def get_user_by_token(cur, token: str):
    cur.execute(
        "SELECT u.id, u.username, u.role FROM " + SCHEMA + ".sessions s "
        "JOIN " + SCHEMA + ".users u ON u.id = s.user_id "
        "WHERE s.token = %s",
        (token,)
    )
    return cur.fetchone()

def handler(event: dict, context) -> dict:
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
        "Content-Type": "application/json",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    token = (event.get("headers") or {}).get("X-Auth-Token", "")
    method = event.get("httpMethod", "GET")

    conn = get_conn()
    cur = conn.cursor()

    try:
        user = get_user_by_token(cur, token) if token else None

        # GET — получить свои пропуска
        if method == "GET":
            if not user:
                return {"statusCode": 401, "headers": headers, "body": json.dumps({"error": "Не авторизован"})}
            user_id = user[0]
            cur.execute(
                "SELECT id, username, display_name, role, created_at FROM " + SCHEMA + ".passes "
                "WHERE user_id = %s ORDER BY created_at DESC",
                (user_id,)
            )
            rows = cur.fetchall()
            passes = [
                {"id": r[0], "username": r[1], "display_name": r[2], "role": r[3], "created_at": r[4].isoformat()}
                for r in rows
            ]
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"passes": passes})}

        # POST — создать пропуск (только admator/developer)
        if method == "POST":
            if not user:
                return {"statusCode": 401, "headers": headers, "body": json.dumps({"error": "Не авторизован"})}

            user_id, username_self, role_self = user
            if role_self not in ADMIN_ROLES:
                return {"statusCode": 403, "headers": headers, "body": json.dumps({"error": "Недостаточно прав"})}

            body = json.loads(event.get("body") or "{}")
            action = body.get("action", "create")

            if action == "create":
                target_username = (body.get("username") or "").strip()
                display_name = (body.get("display_name") or "").strip()
                pass_role = (body.get("role") or "").strip()

                if not target_username or not display_name or not pass_role:
                    return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Заполните все поля"})}

                if pass_role not in ("client", "helper", "admator", "developer"):
                    return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Неверная роль"})}

                # Найти пользователя по username
                cur.execute(
                    "SELECT id FROM " + SCHEMA + ".users WHERE username = %s",
                    (target_username,)
                )
                target = cur.fetchone()
                target_id = target[0] if target else None

                cur.execute(
                    "INSERT INTO " + SCHEMA + ".passes (user_id, username, display_name, role, created_by) "
                    "VALUES (%s, %s, %s, %s, %s) RETURNING id",
                    (target_id, target_username, display_name, pass_role, user_id)
                )
                new_id = cur.fetchone()[0]
                conn.commit()
                return {"statusCode": 200, "headers": headers, "body": json.dumps({"id": new_id, "ok": True})}

            if action == "list_all":
                cur.execute(
                    "SELECT id, username, display_name, role, created_at FROM " + SCHEMA + ".passes "
                    "ORDER BY created_at DESC"
                )
                rows = cur.fetchall()
                passes = [
                    {"id": r[0], "username": r[1], "display_name": r[2], "role": r[3], "created_at": r[4].isoformat()}
                    for r in rows
                ]
                return {"statusCode": 200, "headers": headers, "body": json.dumps({"passes": passes})}

            if action == "delete":
                pass_id = body.get("pass_id")
                cur.execute("UPDATE " + SCHEMA + ".passes SET user_id = user_id WHERE id = %s RETURNING id", (pass_id,))
                cur.execute("DELETE FROM " + SCHEMA + ".passes WHERE id = %s", (pass_id,))
                conn.commit()
                return {"statusCode": 200, "headers": headers, "body": json.dumps({"ok": True})}

        return {"statusCode": 405, "headers": headers, "body": json.dumps({"error": "Method not allowed"})}

    finally:
        cur.close()
        conn.close()
