"""Регистрация и вход по username + пароль. При логине проверяет бан."""
import json
import os
import hashlib
import secrets
import psycopg2

SCHEMA = "t_p49537415_secre_club_access"

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def handler(event: dict, context) -> dict:
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    body = json.loads(event.get("body") or "{}")
    action = body.get("action")
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""

    if not username or not password:
        return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Заполните все поля"})}

    if len(username) < 3:
        return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Имя пользователя минимум 3 символа"})}

    if len(password) < 6:
        return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Пароль минимум 6 символов"})}

    conn = get_conn()
    cur = conn.cursor()

    try:
        if action == "register":
            cur.execute(
                "SELECT id FROM " + SCHEMA + ".users WHERE username = %s",
                (username,)
            )
            if cur.fetchone():
                return {"statusCode": 409, "headers": headers, "body": json.dumps({"error": "Пользователь уже существует"})}

            pw_hash = hash_password(password)
            cur.execute(
                "INSERT INTO " + SCHEMA + ".users (username, password_hash) VALUES (%s, %s) RETURNING id",
                (username, pw_hash)
            )
            user_id = cur.fetchone()[0]

        elif action == "login":
            pw_hash = hash_password(password)
            cur.execute(
                "SELECT id FROM " + SCHEMA + ".users WHERE username = %s AND password_hash = %s",
                (username, pw_hash)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 401, "headers": headers, "body": json.dumps({"error": "Неверный логин или пароль"})}
            user_id = row[0]

            # Проверка бана
            cur.execute("SELECT 1 FROM " + SCHEMA + ".bans WHERE user_id = %s", (user_id,))
            if cur.fetchone():
                return {"statusCode": 403, "headers": headers, "body": json.dumps({"error": "BANNED", "banned": True})}

        else:
            return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Неизвестное действие"})}

        token = secrets.token_hex(32)
        cur.execute(
            "INSERT INTO " + SCHEMA + ".sessions (token, user_id) VALUES (%s, %s)",
            (token, user_id)
        )
        conn.commit()

        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({"token": token, "username": username, "user_id": user_id})
        }

    finally:
        cur.close()
        conn.close()
