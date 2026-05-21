"""Системные сообщения: GET — получить для текущего юзера, POST — отправить (только admin)."""
import json
import os
import psycopg2

SCHEMA = "t_p49537415_secre_club_access"

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Authorization",
    "Content-Type": "application/json",
}

def get_user(cur, token):
    cur.execute(
        "SELECT user_id FROM " + SCHEMA + ".sessions WHERE token = %s", (token,)
    )
    row = cur.fetchone()
    return row[0] if row else None

def is_admin(cur, user_id):
    cur.execute("SELECT 1 FROM " + SCHEMA + ".admins WHERE user_id = %s", (user_id,))
    return cur.fetchone() is not None

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

        method = event.get("httpMethod", "GET")

        # GET — вернуть сообщения для текущего пользователя (global + личные)
        if method == "GET":
            cur.execute(
                "SELECT id, target_user_id, text, created_at FROM " + SCHEMA + ".system_messages "
                "WHERE target_user_id IS NULL OR target_user_id = %s "
                "ORDER BY created_at DESC",
                (user_id,)
            )
            rows = cur.fetchall()
            messages = []
            for r in rows:
                mid, tuid, text, created_at = r
                if created_at and created_at.tzinfo is None:
                    from datetime import timezone
                    created_at = created_at.replace(tzinfo=timezone.utc)
                messages.append({
                    "id": mid,
                    "target_user_id": tuid,
                    "text": text,
                    "created_at": created_at.isoformat(),
                })
            return {"statusCode": 200, "headers": HEADERS, "body": json.dumps({"messages": messages})}

        # POST — отправить сообщение (только admin)
        if method == "POST":
            if not is_admin(cur, user_id):
                return {"statusCode": 403, "headers": HEADERS, "body": json.dumps({"error": "Нет прав"})}

            body = json.loads(event.get("body") or "{}")
            text = (body.get("text") or "").strip()
            target_user_id = body.get("target_user_id")  # None = всем

            if not text:
                return {"statusCode": 400, "headers": HEADERS, "body": json.dumps({"error": "Текст обязателен"})}

            cur.execute(
                "INSERT INTO " + SCHEMA + ".system_messages (target_user_id, text) VALUES (%s, %s) RETURNING id",
                (target_user_id, text)
            )
            new_id = cur.fetchone()[0]
            conn.commit()
            return {"statusCode": 200, "headers": HEADERS, "body": json.dumps({"ok": True, "id": new_id})}

        return {"statusCode": 405, "headers": HEADERS, "body": json.dumps({"error": "Method not allowed"})}

    finally:
        cur.close()
        conn.close()
