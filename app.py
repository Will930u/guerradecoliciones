import os
import requests
from flask import Flask, jsonify, request
from supabase import Client, create_client

app = Flask(__name__)

# Cargar de forma segura las variables de entorno configuradas en Render
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_ADMIN_CHAT_ID = os.getenv("TELEGRAM_ADMIN_CHAT_ID")

# Inicializar el cliente de Supabase con privilegios de servidor (service role)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def send_telegram_notification(message):
  """Envía alertas en tiempo real al chat de Telegram del administrador."""
  if not TELEGRAM_BOT_TOKEN or not TELEGRAM_ADMIN_CHAT_ID:
    return
  url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
  payload = {
      "chat_id": TELEGRAM_ADMIN_CHAT_ID,
      "text": message,
      "parse_mode": "HTML",
  }
  try:
    requests.post(url, json=payload, timeout=5)
  except Exception as e:
    print(f"Error enviando notificación a Telegram: {e}")


@app.route("/")
def home():
  return (
      jsonify({
          "status": "Viper Royale Backend Activo y Conectado a Supabase 🚀",
          "ok": True,
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
    # Insertar transacción en la tabla payment_transactions de Supabase[cite: 2]
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

    # Notificar al Administrador por Telegram
    msg = (
        f"<b>💳 Nuevo Pago Móvil Reportado ($2.00)</b>\n\n"
        f"• Referencia: <code>#{reference_number}</code>\n"
        f"• Monto VES: Bs. {amount_ves}\n"
        f"• Tasa BCV: {bcv_rate}"
    )
    send_telegram_notification(msg)

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


# 2. Endpoint para verificar/aprobar o rechazar pagos (Panel Admin)
@app.route("/api/payment/verify", methods=["POST"])
def verify_payment():
  data = request.json or {}
  payment_id = data.get("payment_id")
  action = data.get("action")  # 'approved' o 'rejected'

  if not payment_id or action not in ["approved", "rejected"]:
    return jsonify({"error": "Parámetros inválidos"}), 400

  try:
    # Consultar la transacción en Supabase
    tx_resp = (
        supabase.table("payment_transactions")
        .select("*")
        .eq("id", payment_id)
        .single()
        .execute()
    )
    tx = tx_resp.data
    if not tx:
      return jsonify({"error": "Transacción no encontrada"}), 404

    new_status = "verified" if action == "approved" else "rejected"

    # Actualizar estado de la transacción
    supabase.table("payment_transactions").update({"status": new_status}).eq(
        "id", payment_id
    ).execute()

    # Si se aprueba, acreditar el saldo en user_wallets[cite: 2]
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

    return (
        jsonify({
            "success": True,
            "message": f"Transacción {action} con éxito",
        }),
        200,
    )
  except Exception as e:
    return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
  port = int(os.getenv("PORT", 5000))
  app.run(host="0.0.0.0", port=port)
