"""Список всех зарегистрированных пользователей (только для админов)."""
import json
import os
import psycopg2

SCHEMA = "t_p49537415_secre_club_access"

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def handler(event: dict, context) -> dict:
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Authorization",
        "Content-Type": "application/json",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    all_headers = event.get("headers") or {}
    raw_token = all_headers.get("X-Authorization", "") or all_headers.get("Authorization", "")
    token = raw_token.replace("Bearer ", "").strip()

    if not token:
        return {"statusCode": 401, "headers": headers, "body": json.dumps({"error": "Нет авторизации"})}

    conn = get_conn()
    cur = conn.cursor()

    try:
        cur.execute("SELECT user_id FROM " + SCHEMA + ".sessions WHERE token = %s", (token,))
        row = cur.fetchone()
        if not row:
            return {"statusCode": 401, "headers": headers, "body": json.dumps({"error": "Сессия недействительна"})}
        user_id = row[0]

        cur.execute("SELECT 1 FROM " + SCHEMA + ".admins WHERE user_id = %s", (user_id,))
        if not cur.fetchone():
            return {"statusCode": 403, "headers": headers, "body": json.dumps({"error": "Нет прав администратора"})}

        cur.execute(
            "SELECT u.id, u.username, u.created_at, "
            "(SELECT COUNT(*) FROM " + SCHEMA + ".passes p WHERE p.user_id = u.id) AS passes_count "
            "FROM " + SCHEMA + ".users u ORDER BY u.created_at DESC"
        )
        rows = cur.fetchall()
        users = []
        for r in rows:
            uid, username, created_at, passes_count = r
            if created_at and created_at.tzinfo is None:
                from datetime import timezone
                created_at = created_at.replace(tzinfo=timezone.utc)
            users.append({
                "id": uid,
                "username": username,
                "created_at": created_at.isoformat(),
                "passes_count": passes_count,
            })

        return {"statusCode": 200, "headers": headers, "body": json.dumps({"users": users})}

    finally:
        cur.close()
        conn.close()
