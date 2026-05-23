"""Системные сообщения + Магазин (Шоколадные Орешки). Маршрутизация через ?type=shop."""
import json
import os
import psycopg2
from datetime import datetime, timezone, timedelta

SCHEMA = "t_p49537415_secre_club_access"
CURRENCY = "Шоколадные Орешки"

PRIV_LABEL = {
    "client": "Клиент",
    "helper": "Помощник",
    "admator": "Администратор",
    "developer": "Разработчик",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Authorization",
    "Content-Type": "application/json",
}

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

def get_balance(cur, user_id):
    cur.execute("SELECT balance FROM " + SCHEMA + ".coins WHERE user_id = %s", (user_id,))
    row = cur.fetchone()
    return row[0] if row else 0

def serialize_item(r):
    iid, name, description, price, privilege, no_timer, duration_seconds, active, created_at = r
    if created_at and created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    return {
        "id": iid,
        "name": name,
        "description": description or "",
        "price": price,
        "privilege": privilege,
        "privilege_label": PRIV_LABEL.get(privilege, privilege),
        "no_timer": no_timer,
        "duration_seconds": duration_seconds,
        "active": active,
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
        params = event.get("queryStringParameters") or {}
        req_type = params.get("type", "messages")
        admin = is_admin(cur, user_id)

        # ======================== SHOP ========================
        if req_type == "shop":

            # GET — список товаров + баланс
            if method == "GET":
                if admin:
                    # admin видит все товары включая неактивные
                    cur.execute(
                        "SELECT id, name, description, price, privilege, no_timer, duration_seconds, active, created_at "
                        "FROM " + SCHEMA + ".shop_items ORDER BY created_at DESC"
                    )
                else:
                    cur.execute(
                        "SELECT id, name, description, price, privilege, no_timer, duration_seconds, active, created_at "
                        "FROM " + SCHEMA + ".shop_items WHERE active = true ORDER BY created_at DESC"
                    )
                items = [serialize_item(r) for r in cur.fetchall()]
                balance = get_balance(cur, user_id)
                return {"statusCode": 200, "headers": HEADERS, "body": json.dumps({
                    "items": items,
                    "balance": balance,
                    "currency": CURRENCY,
                })}

            # POST — купить товар
            if method == "POST":
                body = json.loads(event.get("body") or "{}")
                item_id = body.get("item_id")
                if not item_id:
                    return {"statusCode": 400, "headers": HEADERS, "body": json.dumps({"error": "Укажите item_id"})}

                cur.execute(
                    "SELECT id, name, price, privilege, no_timer, duration_seconds, active "
                    "FROM " + SCHEMA + ".shop_items WHERE id = %s",
                    (item_id,)
                )
                item = cur.fetchone()
                if not item or not item[6]:
                    return {"statusCode": 404, "headers": HEADERS, "body": json.dumps({"error": "Товар не найден"})}

                iid, name, price, privilege, no_timer, duration_seconds, _ = item
                balance = get_balance(cur, user_id)

                if balance < price:
                    return {"statusCode": 400, "headers": HEADERS, "body": json.dumps({
                        "error": f"Недостаточно {CURRENCY}. Нужно: {price}, у вас: {balance}"
                    })}

                cur.execute(
                    "UPDATE " + SCHEMA + ".coins SET balance = balance - %s, updated_at = now() WHERE user_id = %s",
                    (price, user_id)
                )

                expires_at = None
                if not no_timer and duration_seconds and privilege != "developer":
                    expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(duration_seconds))

                cur.execute(
                    "INSERT INTO " + SCHEMA + ".passes (user_id, display_name, privilege, no_timer, expires_at, created_by) "
                    "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                    (user_id, name, privilege, no_timer or privilege == "developer", expires_at, user_id)
                )
                pass_id = cur.fetchone()[0]

                cur.execute(
                    "INSERT INTO " + SCHEMA + ".shop_purchases (user_id, item_id, price_paid) VALUES (%s, %s, %s)",
                    (user_id, iid, price)
                )
                conn.commit()

                new_balance = get_balance(cur, user_id)
                return {"statusCode": 200, "headers": HEADERS, "body": json.dumps({
                    "ok": True,
                    "pass_id": pass_id,
                    "new_balance": new_balance,
                    "item_name": name,
                })}

            # PUT — создать или обновить товар (только admin)
            if method == "PUT":
                if not admin:
                    return {"statusCode": 403, "headers": HEADERS, "body": json.dumps({"error": "Нет прав"})}

                body = json.loads(event.get("body") or "{}")
                item_id = body.get("id")
                name = (body.get("name") or "").strip()
                description = (body.get("description") or "").strip()
                price = body.get("price")
                privilege = body.get("privilege", "client")
                no_timer = bool(body.get("no_timer", False))
                duration_seconds = body.get("duration_seconds")

                if not name or not price:
                    return {"statusCode": 400, "headers": HEADERS, "body": json.dumps({"error": "Название и цена обязательны"})}

                if item_id:
                    cur.execute(
                        "UPDATE " + SCHEMA + ".shop_items SET name=%s, description=%s, price=%s, privilege=%s, no_timer=%s, duration_seconds=%s WHERE id=%s",
                        (name, description, int(price), privilege, no_timer, duration_seconds, item_id)
                    )
                else:
                    cur.execute(
                        "INSERT INTO " + SCHEMA + ".shop_items (name, description, price, privilege, no_timer, duration_seconds) "
                        "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                        (name, description, int(price), privilege, no_timer, duration_seconds)
                    )
                    item_id = cur.fetchone()[0]

                conn.commit()
                return {"statusCode": 200, "headers": HEADERS, "body": json.dumps({"ok": True, "id": item_id})}

            # DELETE — удалить товар (только admin)
            if method == "DELETE":
                if not admin:
                    return {"statusCode": 403, "headers": HEADERS, "body": json.dumps({"error": "Нет прав"})}

                body = json.loads(event.get("body") or "{}")
                item_id = body.get("id")
                if not item_id:
                    return {"statusCode": 400, "headers": HEADERS, "body": json.dumps({"error": "Укажите id"})}

                cur.execute("DELETE FROM " + SCHEMA + ".shop_purchases WHERE item_id = %s", (item_id,))
                cur.execute("DELETE FROM " + SCHEMA + ".shop_items WHERE id = %s", (item_id,))
                conn.commit()
                return {"statusCode": 200, "headers": HEADERS, "body": json.dumps({"ok": True})}

            # PATCH — выдать/забрать монеты (только admin)
            if method == "PATCH":
                if not admin:
                    return {"statusCode": 403, "headers": HEADERS, "body": json.dumps({"error": "Нет прав"})}

                body = json.loads(event.get("body") or "{}")
                target_username = (body.get("username") or "").strip()
                amount = body.get("amount")
                action = body.get("action")  # "give" | "take"

                if not target_username or not amount or action not in ("give", "take"):
                    return {"statusCode": 400, "headers": HEADERS, "body": json.dumps({"error": "Укажите username, amount и action"})}

                try:
                    amount = int(amount)
                    if amount <= 0:
                        raise ValueError()
                except (ValueError, TypeError):
                    return {"statusCode": 400, "headers": HEADERS, "body": json.dumps({"error": "amount должен быть положительным числом"})}

                cur.execute("SELECT id FROM " + SCHEMA + ".users WHERE username = %s", (target_username,))
                target_row = cur.fetchone()
                if not target_row:
                    return {"statusCode": 404, "headers": HEADERS, "body": json.dumps({"error": "Пользователь не найден"})}
                target_id = target_row[0]

                if action == "give":
                    cur.execute(
                        "INSERT INTO " + SCHEMA + ".coins (user_id, balance) VALUES (%s, %s) "
                        "ON CONFLICT (user_id) DO UPDATE SET balance = " + SCHEMA + ".coins.balance + %s, updated_at = now()",
                        (target_id, amount, amount)
                    )
                else:
                    current = get_balance(cur, target_id)
                    deduct = min(amount, current)
                    if deduct > 0:
                        cur.execute(
                            "UPDATE " + SCHEMA + ".coins SET balance = balance - %s, updated_at = now() WHERE user_id = %s",
                            (deduct, target_id)
                        )

                conn.commit()
                new_balance = get_balance(cur, target_id)
                return {"statusCode": 200, "headers": HEADERS, "body": json.dumps({
                    "ok": True,
                    "new_balance": new_balance,
                    "username": target_username,
                    "currency": CURRENCY,
                })}

            return {"statusCode": 405, "headers": HEADERS, "body": json.dumps({"error": "Method not allowed"})}

        # ======================== MESSAGES ========================

        # GET — вернуть сообщения для текущего пользователя
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
            if not admin:
                return {"statusCode": 403, "headers": HEADERS, "body": json.dumps({"error": "Нет прав"})}

            body = json.loads(event.get("body") or "{}")
            text = (body.get("text") or "").strip()
            target_user_id = body.get("target_user_id")

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