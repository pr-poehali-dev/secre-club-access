"""Промокоды: GET — список (admin), POST — создать (admin), DELETE — удалить (admin), PUT — активировать промокод (user)."""
import json
import os
from datetime import timezone
import psycopg2

SCHEMA = "t_p49537415_secre_club_access"

HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Authorization",
    "Content-Type": "application/json",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def get_user(cur, token):
    cur.execute("SELECT user_id FROM " + SCHEMA + ".sessions WHERE token = %s", (token,))
    row = cur.fetchone()
    return row[0] if row else None

def is_admin(cur, user_id):
    cur.execute("SELECT 1 FROM " + SCHEMA + ".admins WHERE user_id = %s", (user_id,))
    return cur.fetchone() is not None

def is_banned(cur, user_id):
    cur.execute("SELECT 1 FROM " + SCHEMA + ".bans WHERE user_id = %s", (user_id,))
    return cur.fetchone() is not None

def serialize_promo(r):
    pid, code, display_name, privilege, no_timer, duration_seconds, max_uses, uses_count, expires_at, created_at = r
    if created_at and created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return {
        "id": pid,
        "code": code,
        "display_name": display_name,
        "privilege": privilege,
        "no_timer": no_timer,
        "duration_seconds": duration_seconds,
        "max_uses": max_uses,
        "uses_count": uses_count,
        "expires_at": expires_at.isoformat() if expires_at else None,
        "created_at": created_at.isoformat(),
    }

def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": HEADERS, "body": ""}

    all_headers = event.get("headers") or {}
    raw_token = all_headers.get("X-Authorization", "") or all_headers.get("Authorization", "")
    token = raw_token.replace("Bearer ", "").strip()

    if not token:
        return {"statusCode": 401, "headers": HEADERS, "body": json.dumps({"error": "Нет авторизации"})}

    conn = get_conn()
    cur = conn.cursor()

    try:
        user_id = get_user(cur, token)
        if not user_id:
            return {"statusCode": 401, "headers": HEADERS, "body": json.dumps({"error": "Сессия недействительна"})}

        if is_banned(cur, user_id):
            return {"statusCode": 403, "headers": HEADERS, "body": json.dumps({"error": "BANNED", "banned": True})}

        method = event.get("httpMethod", "GET")

        # GET — список промокодов (только admin)
        if method == "GET":
            if not is_admin(cur, user_id):
                return {"statusCode": 403, "headers": HEADERS, "body": json.dumps({"error": "Нет прав"})}
            cur.execute(
                "SELECT id, code, display_name, privilege, no_timer, duration_seconds, max_uses, uses_count, expires_at, created_at "
                "FROM " + SCHEMA + ".promo_codes ORDER BY created_at DESC"
            )
            promos = [serialize_promo(r) for r in cur.fetchall()]
            return {"statusCode": 200, "headers": HEADERS, "body": json.dumps({"promos": promos})}

        # POST — создать промокод (только admin)
        if method == "POST":
            if not is_admin(cur, user_id):
                return {"statusCode": 403, "headers": HEADERS, "body": json.dumps({"error": "Нет прав"})}
            body = json.loads(event.get("body") or "{}")
            code = (body.get("code") or "").strip().upper()
            display_name = (body.get("display_name") or "").strip()
            privilege = body.get("privilege", "client")
            no_timer = bool(body.get("no_timer", False))
            duration_seconds = body.get("duration_seconds")
            max_uses = body.get("max_uses")
            promo_expires_seconds = body.get("promo_expires_seconds")

            if not code or not display_name:
                return {"statusCode": 400, "headers": HEADERS, "body": json.dumps({"error": "Код и название обязательны"})}

            promo_expires_at = None
            if promo_expires_seconds:
                from datetime import datetime, timedelta
                promo_expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(promo_expires_seconds))

            cur.execute(
                "INSERT INTO " + SCHEMA + ".promo_codes (code, display_name, privilege, no_timer, duration_seconds, max_uses, expires_at) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
                (code, display_name, privilege, no_timer, duration_seconds, max_uses, promo_expires_at)
            )
            new_id = cur.fetchone()[0]
            conn.commit()
            return {"statusCode": 200, "headers": HEADERS, "body": json.dumps({"ok": True, "id": new_id})}

        # DELETE — удалить промокод (только admin)
        if method == "DELETE":
            if not is_admin(cur, user_id):
                return {"statusCode": 403, "headers": HEADERS, "body": json.dumps({"error": "Нет прав"})}
            body = json.loads(event.get("body") or "{}")
            promo_id = body.get("id")
            if not promo_id:
                return {"statusCode": 400, "headers": HEADERS, "body": json.dumps({"error": "id обязателен"})}
            cur.execute("SELECT id FROM " + SCHEMA + ".promo_codes WHERE id = %s", (promo_id,))
            if not cur.fetchone():
                return {"statusCode": 404, "headers": HEADERS, "body": json.dumps({"error": "Промокод не найден"})}
            cur.execute("DELETE FROM " + SCHEMA + ".promo_uses WHERE promo_id = %s", (promo_id,))
            cur.execute("DELETE FROM " + SCHEMA + ".promo_codes WHERE id = %s", (promo_id,))
            conn.commit()
            return {"statusCode": 200, "headers": HEADERS, "body": json.dumps({"ok": True})}

        # PUT — активировать промокод пользователем
        if method == "PUT":
            body = json.loads(event.get("body") or "{}")
            code = (body.get("code") or "").strip().upper()
            if not code:
                return {"statusCode": 400, "headers": HEADERS, "body": json.dumps({"error": "Код обязателен"})}

            from datetime import datetime, timedelta

            cur.execute(
                "SELECT id, display_name, privilege, no_timer, duration_seconds, max_uses, uses_count, expires_at "
                "FROM " + SCHEMA + ".promo_codes WHERE code = %s",
                (code,)
            )
            promo = cur.fetchone()
            if not promo:
                return {"statusCode": 404, "headers": HEADERS, "body": json.dumps({"error": "Промокод не найден"})}

            pid, display_name, privilege, no_timer, duration_seconds, max_uses, uses_count, promo_expires_at = promo

            if promo_expires_at:
                if promo_expires_at.tzinfo is None:
                    promo_expires_at = promo_expires_at.replace(tzinfo=timezone.utc)
                if datetime.now(timezone.utc) > promo_expires_at:
                    return {"statusCode": 400, "headers": HEADERS, "body": json.dumps({"error": "Промокод истёк"})}

            if max_uses is not None and uses_count >= max_uses:
                return {"statusCode": 400, "headers": HEADERS, "body": json.dumps({"error": "Лимит использований исчерпан"})}

            # Проверка: этот пользователь уже активировал данный промокод
            cur.execute(
                "SELECT 1 FROM " + SCHEMA + ".promo_uses WHERE promo_id = %s AND user_id = %s",
                (pid, user_id)
            )
            if cur.fetchone():
                return {"statusCode": 400, "headers": HEADERS, "body": json.dumps({"error": "Вы уже активировали этот промокод"})}

            expires_at = None
            if not no_timer and duration_seconds:
                expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(duration_seconds))

            cur.execute(
                "INSERT INTO " + SCHEMA + ".passes (user_id, display_name, privilege, no_timer, expires_at, created_by) "
                "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                (user_id, display_name, privilege, no_timer, expires_at, user_id)
            )
            pass_id = cur.fetchone()[0]
            cur.execute(
                "INSERT INTO " + SCHEMA + ".promo_uses (promo_id, user_id) VALUES (%s, %s)",
                (pid, user_id)
            )
            cur.execute("UPDATE " + SCHEMA + ".promo_codes SET uses_count = uses_count + 1 WHERE id = %s", (pid,))
            conn.commit()
            return {"statusCode": 200, "headers": HEADERS, "body": json.dumps({"ok": True, "pass_id": pass_id, "display_name": display_name, "privilege": privilege})}

        return {"statusCode": 405, "headers": HEADERS, "body": json.dumps({"error": "Method not allowed"})}

    finally:
        cur.close()
        conn.close()