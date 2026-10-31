import os
import time
import requests
from flask import Flask, jsonify, request
from flask_cors import CORS
from supabase import Client, create_client

app = Flask(__name__)
# Habilitar CORS para permitir peticiones desde el navegador (GitHub Pages)
CORS(app)

# Cargar de forma segura las variables de entorno configuradas en Render
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_ADMIN_CHAT_ID = os.getenv("TELEGRAM_ADMIN_CHAT_ID")

# Inicializar el cliente de Supabase con privilegios de servidor (service role)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def send_telegram_payment_notification(payment_id, amount_usd, amount_ves, reference_number, bcv_rate, phone_number):
  """Envía alerta a Telegram con botones interactivos de aprobación y rechazo."""
  if not TELEGRAM_BOT_TOKEN or not TELEGRAM_ADMIN_CHAT_ID:
    return
  url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
  
  msg = (
      f"<b>💳 Nuevo Pago Móvil Reportado (${amount_usd})</b>\n\n"
      f"• Referencia: <code>#{reference_number}</code>\n"
      f"• Monto VES: Bs. {amount_ves}\n"
      f"• Tasa BCV: {bcv_rate}\n"
      f"• Teléfono: {phone_number}"
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
  return (
      jsonify({
          "status": "Viper Royale Backend Activo y Conectado a Supabase 🚀",
          "ok": True,
      }),
      200,
  )


# Endpoint para entregar las variables de entorno públicas de Supabase al frontend
@app.route("/api/config", methods=["GET"])
def get_config():
  return (
      jsonify({
          "supabase_url": SUPABASE_URL,
          "supabase_anon_key": SUPABASE_ANON_KEY,
      }),
      200,
  )


# 1. Endpoint para reportar un Pago Móvil desde el juego
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

    return (
        jsonify({
            "success": True,
            "message": "Comprobante reportado con éxito",
            "data": response.data,
        }),
        200,
    )
  except Exception as e:
    return jsonify({"error": str(e)}), 500


# NUEVO: Endpoint para procesar Solicitudes de Retiro (Cash Out) con los datos del usuario
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
    # Consultar los datos de perfil/registro del usuario en Supabase (ej: teléfono, banco, etc.)
    user_phone = "0412-1234567" # Valor por defecto o extraído de la tabla de perfiles
    try:
        profile_resp = supabase.table("users").select("*").eq("id", user_id).execute()
        if profile_resp.data and len(profile_resp.data) > 0:
            user_phone = profile_resp.data[0].get("phone", "0412-1234567")
    except Exception:
        pass

    # Registrar la transacción de retiro en payment_transactions con status 'cashout_pending'
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

    # Enviar notificación a Telegram del Administrador con los datos de pago del usuario
    if TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID:
      url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
      msg = (
          f"💸 <b>¡Solicitud de Retiro (Cash Out)!</b>\n\n"
          f"👤 <b>Usuario ID:</b> <code>{user_id}</code>\n"
          f"💵 <b>Monto USD:</b> ${amount_usd}\n"
          f"🇻🇪 <b>Monto VES:</b> Bs. {amount_ves}\n"
          f"📱 <b>Teléfono / Datos de Pago:</b> <code>{user_phone}</code>\n"
          f"🔢 <b>ID Transacción:</b> <code>{payment_id}</code>"
      )
      keyboard = {
          "inline_keyboard": [
              [
                  {"text": "✅ Pagado / Aprobar", "callback_data": f"cashoutpaid_{payment_id}"},
                  {"text": "❌ Rechazar", "callback_data": f"cashoutreject_{payment_id}"}
              ]
          ]
      }
      payload = {
          "chat_id": TELEGRAM_ADMIN_CHAT_ID,
          "text": msg,
          "parse_mode": "HTML",
          "reply_markup": keyboard
      }
      requests.post(url, json=payload, timeout=5)

    return jsonify({"success": True, "message": "Solicitud de retiro enviada con éxito"}), 200
  except Exception as e:
    return jsonify({"error": str(e)}), 500


# 2. Endpoint Webhook para recibir clics en los botones de Telegram (Aprobar / Rechazar)
@app.route("/api/telegram/webhook", methods=["POST"])
def telegram_webhook():
  data = request.json or {}
  
  if "callback_query" in data:
    callback = data["callback_query"]
    callback_data = callback.get("data") # Ej: approve_UUID, reject_UUID, cashoutpaid_UUID, cashoutreject_UUID
    message = callback.get("message", {})
    message_id = message.get("message_id")
    chat_id = message.get("chat", {}).get("id")
    callback_query_id = callback.get("id")

    if callback_data and "_" in callback_data:
      prefix, payment_id = callback_data.split("_", 1)

      try:
        tx_resp = (
            supabase.table("payment_transactions")
            .select("*")
            .eq("id", payment_id)
            .single()
            .execute()
        )
        tx = tx_resp.data
        if tx:
          current_status = tx.get("status")
          
          # Manejo de Pagos Entrantes (Recargas)
          if prefix in ["approve", "reject"] and current_status == "pending":
            action = "approved" if prefix == "approve" else "rejected"
            new_status = "verified" if action == "approved" else "rejected"

            supabase.table("payment_transactions").update({"status": new_status}).eq(
                "id", payment_id
            ).execute()

            if action == "approved":
              user_id = tx["user_id"]
              amount = float(tx["amount_usd"])

              wallet_resp = (
                  supabase.table("user_wallets")
                  .select("*")
                  .eq("user_id", user_id)
                  .execute()
              )
              if wallet_reg := wallet_resp.data:
                current_bal = float(wallet_reg[0]["balance_usd"])
                new_bal = current_bal + amount
                supabase.table("user_wallets").update({"balance_usd": new_bal}).eq(
                    "user_id", user_id
                ).execute()
              else:
                supabase.table("user_wallets").insert({
                    "user_id": user_id,
                    "balance_usd": amount,
                    "total_earnings_usd": amount,
                }).execute()

            answer_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery"
            requests.post(answer_url, json={"callback_query_id": callback_query_id, "text": f"¡Pago {action} con éxito!"}, timeout=5)

            edit_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/editMessageText"
            original_text = message.get("text", "Pago Móvil Reportado")
            status_text = "\n\n<b>✅ ESTADO: APROBADO Y ACREDITADO</b>" if action == "approved" else "\n\n<b>❌ ESTADO: RECHAZADO</b>"
            requests.post(edit_url, json={
                "chat_id": chat_id,
                "message_id": message_id,
                "text": original_text + status_text,
                "parse_mode": "HTML"
            }, timeout=5)

          # Manejo de Retiros (Cash Out)
          elif prefix in ["cashoutpaid", "cashoutreject"] and current_status == "cashout_pending":
            is_paid = (prefix == "cashoutpaid")
            new_status = "paid" if is_paid else "cashout_rejected"

            supabase.table("payment_transactions").update({"status": new_status}).eq(
                "id", payment_id
            ).execute()

            action_text = "pagado al usuario" if is_paid else "rechazado"
            answer_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery"
            requests.post(answer_url, json={"callback_query_id": callback_query_id, "text": f"¡Retiro {action_text}!"}, timeout=5)

            edit_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/editMessageText"
            original_text = message.get("text", "Solicitud de Retiro")
            status_text = "\n\n<b>✅ ESTADO: RETIRO PAGADO CON ÉXITO</b>" if is_paid else "\n\n<b>❌ ESTADO: RETIRO RECHAZADO</b>"
            requests.post(edit_url, json={
                "chat_id": chat_id,
                "message_id": message_id,
                "text": original_text + status_text,
                "parse_mode": "HTML"
            }, timeout=5)

          else:
            answer_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery"
            requests.post(answer_url, json={"callback_query_id": callback_query_id, "text": "Esta transacción ya fue procesada previamente."}, timeout=5)

      except Exception as e:
        print(f"Error procesando webhook de Telegram: {e}")

  return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
  port = int(os.getenv("PORT", 5000))
  app.run(host="0.0.0.0", port=port)
