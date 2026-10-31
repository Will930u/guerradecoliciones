import os
import time
import requests
from flask import Flask, jsonify, request
from flask_cors import CORS
from supabase import Client, create_client

app = Flask(__name__)
CORS(app)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_ADMIN_CHAT_ID = os.getenv("TELEGRAM_ADMIN_CHAT_ID")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def send_telegram_payment_notification(payment_id, amount_usd, amount_ves, reference_number, bcv_rate, phone_number):
  if not TELEGRAM_BOT_TOKEN or not TELEGRAM_ADMIN_CHAT_ID:
    return
  url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
  
  msg = (
      f"<b>💳 Nuevo Pago Móvil Reportado (${amount_usd})</b>\n\n"
      f"• Referencia: <code>#{reference_number}</code>\n"
      f"• Monto VES: Bs. {amount_ves}\n"
      f"• Tasa BCV: {bcv_rate}\n"
      f"• Teléfono: {phone_number}\n\n"
      f"🆔 <b>ID Transacción:</b> <code>{payment_id}</code>"
  )
  
  keyboard = {
      "inline_keyboard": [
          [
              {"text": "✅ Aprobar", "callback_data": f"approve_{payment_id}"},
              {"text": "❌ Rechazar", "callback_data": f"reject_{payment_id}"}
          ]
      ]
  }
  
  payload = {
      "chat_id": TELEGRAM_ADMIN_CHAT_ID,
      "text": msg,
      "parse_mode": "HTML",
      "reply_markup": keyboard
  }
  
  try:
    requests.post(url, json=payload, timeout=5)
  except Exception as e:
    print(f"Error enviando notificación interactiva a Telegram: {e}")


@app.route("/")
def home():
  return jsonify({"status": "Viper Royale Backend Activo 🚀", "ok": True}), 200


@app.route("/api/config", methods=["GET"])
def get_config():
  return jsonify({
      "supabase_url": SUPABASE_URL,
      "supabase_anon_key": SUPABASE_ANON_KEY,
  }), 200


@app.route("/api/payment/report", methods=["POST"])
def report_payment():
  data = request.json or {}
  user_id = data.get("user_id")
  amount_usd = data.get("amount_usd", 2.00)
  bcv_rate = data.get("bcv_rate")
  amount_ves = data.get("amount_ves")
  reference_number = data.get("reference_number")
  phone_number = data.get("phone_number")

  if not reference_number or not user_id:
    return jsonify({"error": "Faltan datos obligatorios (user_id, ref)"}), 400

  try:
    response = (
        supabase.table("payment_transactions")
        .insert({
            "user_id": user_id,
            "amount_usd": amount_usd,
            "bcv_rate": bcv_rate,
            "amount_ves": amount_ves,
            "reference_number": reference_number,
            "phone_number": phone_number,
            "status": "pending",
        })
        .execute()
    )

    tx_data = response.data
    if tx_data and len(tx_data) > 0:
      payment_id = tx_data[0].get("id")
      send_telegram_payment_notification(
          payment_id, amount_usd, amount_ves, reference_number, bcv_rate, phone_number
      )

    return jsonify({"success": True, "message": "Comprobante reportado con éxito", "data": response.data}), 200
  except Exception as e:
    return jsonify({"error": str(e)}), 500


@app.route("/api/cashout/request", methods=["POST"])
def request_cashout():
  data = request.json or {}
  user_id = data.get("user_id")
  amount_usd = data.get("amount_usd")
  amount_ves = data.get("amount_ves")
  bcv_rate = data.get("bcv_rate")

  if not user_id or not amount_usd:
    return jsonify({"error": "Faltan datos obligatorios para el retiro"}), 400

  try:
    user_phone = "0412-1234567"
    try:
        profile_resp = supabase.table("users").select("*").eq("id", user_id).execute()
        if profile_resp.data and len(profile_resp.data) > 0:
            user_phone = profile_resp.data[0].get("phone", "0412-1234567")
    except Exception:
        pass

    tx_resp = (
        supabase.table("payment_transactions")
        .insert({
            "user_id": user_id,
            "amount_usd": amount_usd,
            "bcv_rate": bcv_rate,
            "amount_ves": amount_ves,
            "reference_number": f"CASHOUT_{user_id[:6]}_{int(time.time())}",
            "phone_number": user_phone,
            "status": "cashout_pending",
        })
        .execute()
    )

    tx_data = tx_resp.data
    if not tx_data or len(tx_data) == 0:
      return jsonify({"error": "No se pudo registrar la solicitud de retiro"}), 500

    payment_id = tx_data[0].get("id")

    if TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID:
      url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
      msg = (
          f"💸 <b>¡Solicitud de Retiro (Cash Out)!</b>\n\n"
          f"👤 <b>Usuario ID:</b> <code>{user_id}</code>\n"
          f"💵 <b>Monto USD:</b> ${amount_usd}\n"
          f"🇻🇪 <b>Monto VES:</b> Bs. {amount_ves}\n"
          f"📱 <b>Teléfono / Datos de Pago:</b> <code>{user_phone}</code>\n\n"
          f"🆔 <b>ID Transacción:</b> <code>{payment_id}</code>"
      )
      payload = {
          "chat_id": TELEGRAM_ADMIN_CHAT_ID,
          "text": msg,
          "parse_mode": "HTML"
      }
      requests.post(url, json=payload, timeout=5)

    return jsonify({"success": True, "message": "Solicitud de retiro enviada con éxito"}), 200
  except Exception as e:
    return jsonify({"error": str(e)}), 500


@app.route("/api/telegram/webhook", methods=["POST"])
def telegram_webhook():
  data = request.json or {}
  
  if "message" in data:
    msg = data["message"]
    chat_id = msg.get("chat", {}).get("id")
    text = msg.get("text", "").strip()
    reply_to = msg.get("reply_to_message")

    if reply_to and text:
      reply_text = reply_to.get("text", "") or reply_to.get("caption", "")
      
      try:
        import re
        payment_id = None
        
        # Extracción universal: busca la línea de ID Transacción y extrae cualquier valor posterior
        for line in reply_text.split("\n"):
          if "ID Transacción:" in line or "Transacción:" in line:
            # Limpiar etiquetas HTML como <code> o </code>
            clean_line = re.sub(r'<[^>]+>', '', line)
            parts = clean_line.split(":")
            if len(parts) > 1:
              payment_id = parts[1].strip()
              break

        print(f"DEBUG: ID Extraído del mensaje original por Reply: {payment_id}")

        if payment_id:
          # Intentar buscar por el ID exacto (sea número o string/UUID)
          tx_resp = supabase.table("payment_transactions").select("*").eq("id", payment_id).single().execute()
          tx = tx_resp.data
          
          if tx:
            current_status = tx.get("status")
            print(f"DEBUG: Estado actual en Supabase: {current_status}")
            
            # Retiro Aprobado por Reply
            if current_status == "cashout_pending":
              supabase.table("payment_transactions").update({
                  "status": "paid",
                  "reference_number": text
              }).eq("id", payment_id).execute()

              send_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
              requests.post(send_url, json={
                  "chat_id": chat_id,
                  "text": f"✅ ¡Retiro aprobado y pagado con referencia: <code>{text}</code>!",
                  "parse_mode": "HTML",
                  "reply_to_message_id": msg.get("message_id")
              }, timeout=5)

            # Recarga Aprobada por Reply
            elif current_status == "pending":
              supabase.table("payment_transactions").update({
                  "status": "verified",
                  "reference_number": text
              }).eq("id", payment_id).execute()

              user_id = tx["user_id"]
              amount = float(tx["amount_usd"])

              wallet_resp = supabase.table("user_wallets").select("*").eq("user_id", user_id).execute()
              if wallet_reg := wallet_resp.data:
                current_bal = float(wallet_reg[0]["balance_usd"])
                new_bal = current_bal + amount
                supabase.table("user_wallets").update({"balance_usd": new_bal}).eq("user_id", user_id).execute()
              else:
                supabase.table("user_wallets").insert({
                    "user_id": user_id,
                    "balance_usd": amount,
                    "total_earnings_usd": amount,
                }).execute()

              send_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
              requests.post(send_url, json={
                  "chat_id": chat_id,
                  "text": f"✅ ¡Recarga aprobada y acreditada! Referencia: <code>{text}</code>",
                  "parse_mode": "HTML",
                  "reply_to_message_id": msg.get("message_id")
              }, timeout=5)

      except Exception as e:
        print(f"Error procesando reply en Telegram: {e}")

  elif "callback_query" in data:
    callback = data["callback_query"]
    callback_data = callback.get("data")
    message = callback.get("message", {})
    message_id = message.get("message_id")
    chat_id = message.get("chat", {}).get("id")
    callback_query_id = callback.get("id")

    if callback_data and "_" in callback_data:
      prefix, payment_id = callback_data.split("_", 1)
      try:
        tx_resp = supabase.table("payment_transactions").select("*").eq("id", payment_id).single().execute()
        tx = tx_resp.data
        if tx:
          if prefix == "cashoutpaid" and tx.get("status") == "cashout_pending":
            supabase.table("payment_transactions").update({"status": "paid"}).eq("id", payment_id).execute()
            answer_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery"
            requests.post(answer_url, json={"callback_query_id": callback_query_id, "text": "¡Retiro pagado con éxito!"}, timeout=5)
      except Exception as e:
        print(f"Error en callback: {e}")

  return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
  port = int(os.getenv("PORT", 5000))
  app.run(host="0.0.0.0", port=port)
