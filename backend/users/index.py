"""Список пользователей, управление правами администратора и банами."""
import json
import os
import psycopg2

SCHEMA = "t_p49537415_secre_club_access"

HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Authorization",
    "Content-Type": "application/json",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def get_caller(cur, token):
    cur.execute("SELECT user_id FROM " + SCHEMA + ".sessions WHERE token = %s", (token,))
    row = cur.fetchone()
    if not row:
        return None, None, None
    user_id = row[0]
    cur.execute("SELECT is_superadmin FROM " + SCHEMA + ".admins WHERE user_id = %s", (user_id,))
    admin_row = cur.fetchone()
    is_admin = admin_row is not None
    is_superadmin = admin_row[0] if admin_row else False
    return user_id, is_admin, is_superadmin

def is_banned(cur, user_id):
    cur.execute("SELECT 1 FROM " + SCHEMA + ".bans WHERE user_id = %s", (user_id,))
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
        user_id, is_admin, is_superadmin = get_caller(cur, token)
        if user_id is None:
            return {"statusCode": 401, "headers": HEADERS, "body": json.dumps({"error": "Сессия недействительна"})}

        if is_banned(cur, user_id):
            return {"statusCode": 403, "headers": HEADERS, "body": json.dumps({"error": "BANNED", "banned": True})}

        if not is_admin:
            return {"statusCode": 403, "headers": HEADERS, "body": json.dumps({"error": "Нет прав администратора"})}

        method = event.get("httpMethod", "GET")

        if method == "GET":
            cur.execute(
                "SELECT u.id, u.username, u.created_at, "
                "(SELECT COUNT(*) FROM " + SCHEMA + ".passes p WHERE p.user_id = u.id) AS passes_count, "
                "a.user_id IS NOT NULL AS is_admin, "
                "COALESCE(a.is_superadmin, false) AS is_superadmin, "
                "b.user_id IS NOT NULL AS is_banned "
                "FROM " + SCHEMA + ".users u "
                "LEFT JOIN " + SCHEMA + ".admins a ON a.user_id = u.id "
                "LEFT JOIN " + SCHEMA + ".bans b ON b.user_id = u.id "
                "ORDER BY u.created_at DESC"
            )
            rows = cur.fetchall()
            users = []
            for r in rows:
                uid, username, created_at, passes_count, u_is_admin, u_is_superadmin, u_is_banned = r
                if created_at and created_at.tzinfo is None:
                    from datetime import timezone
                    created_at = created_at.replace(tzinfo=timezone.utc)
                users.append({
                    "id": uid,
                    "username": username,
                    "created_at": created_at.isoformat(),
                    "passes_count": passes_count,
                    "is_admin": bool(u_is_admin),
                    "is_superadmin": bool(u_is_superadmin),
                    "is_banned": bool(u_is_banned),
                })
            return {"statusCode": 200, "headers": HEADERS, "body": json.dumps({
                "users": users,
                "caller_is_superadmin": is_superadmin
            })}

        if method == "POST":
            body = json.loads(event.get("body") or "{}")
            target_user_id = body.get("user_id")
            action = body.get("action")

            if not target_user_id or action not in ("grant", "revoke", "ban", "unban"):
                return {"statusCode": 400, "headers": HEADERS, "body": json.dumps({"error": "Укажите user_id и action"})}

            if target_user_id == user_id:
                return {"statusCode": 400, "headers": HEADERS, "body": json.dumps({"error": "Нельзя менять свои права"})}

            cur.execute("SELECT is_superadmin FROM " + SCHEMA + ".admins WHERE user_id = %s", (target_user_id,))
            target_admin_row = cur.fetchone()
            target_is_superadmin = target_admin_row[0] if target_admin_row else False

            if action in ("grant", "revoke"):
                if not is_superadmin:
                    return {"statusCode": 403, "headers": HEADERS, "body": json.dumps({"error": "Только суперадмин может управлять правами"})}
                if target_is_superadmin:
                    return {"statusCode": 403, "headers": HEADERS, "body": json.dumps({"error": "Нельзя изменить права суперадмина"})}
                if action == "grant":
                    cur.execute(
                        "INSERT INTO " + SCHEMA + ".admins (user_id, is_superadmin) VALUES (%s, false) ON CONFLICT (user_id) DO NOTHING",
                        (target_user_id,)
                    )
                else:
                    cur.execute(
                        "DELETE FROM " + SCHEMA + ".admins WHERE user_id = %s AND is_superadmin = false",
                        (target_user_id,)
                    )

            elif action in ("ban", "unban"):
                if target_is_superadmin:
                    return {"statusCode": 403, "headers": HEADERS, "body": json.dumps({"error": "Нельзя забанить суперадмина"})}
                if not is_superadmin and target_admin_row is not None:
                    return {"statusCode": 403, "headers": HEADERS, "body": json.dumps({"error": "Нельзя забанить администратора"})}
                if action == "ban":
                    cur.execute(
                        "INSERT INTO " + SCHEMA + ".bans (user_id, banned_by) VALUES (%s, %s) ON CONFLICT (user_id) DO NOTHING",
                        (target_user_id, user_id)
                    )
                    cur.execute("DELETE FROM " + SCHEMA + ".sessions WHERE user_id = %s", (target_user_id,))
                else:
                    cur.execute("DELETE FROM " + SCHEMA + ".bans WHERE user_id = %s", (target_user_id,))

            conn.commit()
            return {"statusCode": 200, "headers": HEADERS, "body": json.dumps({"ok": True})}

        return {"statusCode": 405, "headers": HEADERS, "body": json.dumps({"error": "Метод не поддерживается"})}

    finally:
        cur.close()
        conn.close()
