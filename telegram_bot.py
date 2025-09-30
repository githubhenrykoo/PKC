import requests
import subprocess
import time

# --- KONFIGURASI ---
BOT_TOKEN = "7992064855:AAGwe1He127qovrAeH4MzQ_wow5uEAXjJzU"
BASE_URL = f"https://api.telegram.org/bot{BOT_TOKEN}"
OLLAMA_MODEL = "llama3:latest"

# --- FUNGSI UNTUK OLLAMA ---
def run_ollama(prompt):
    """Jalankan Ollama dengan prompt user"""
    result = subprocess.run(
        ["ollama", "run", OLLAMA_MODEL, prompt],
        capture_output=True, text=True
    )
    return result.stdout.strip()

# --- FUNGSI UNTUK KIRIM PESAN KE TELEGRAM ---
def send_message(chat_id, text):
    url = f"{BASE_URL}/sendMessage"
    requests.post(url, data={"chat_id": chat_id, "text": text})

# --- MAIN LOOP ---
def main():
    last_update_id = None
    print("Bot Telegram ↔ Ollama sudah berjalan...")

    while True:
        # Ambil update dari Telegram
        url = f"{BASE_URL}/getUpdates"
        if last_update_id:
            url += f"?offset={last_update_id + 1}"

        try:
            response = requests.get(url).json()
            for update in response.get("result", []):
                last_update_id = update["update_id"]

                message = update.get("message")
                if not message:
                    continue

                chat_id = message["chat"]["id"]
                text = message.get("text")

                if text:
                    print(f"[User] {text}")

                    # Kirim ke Ollama
                    reply = run_ollama(text)
                    print(f"[Ollama] {reply}")

                    # Balas ke user
                    send_message(chat_id, reply)

        except Exception as e:
            print("Error:", e)

        time.sleep(2)

if __name__ == "__main__":
    main()
