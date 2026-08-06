import os, requests, json

API = os.environ.get("CMMS_API", "http://127.0.0.1:5002").rstrip("/")
TOKEN = os.environ.get("CMMS_TOKEN", "").strip()

if not TOKEN:
    raise SystemExit("Defina CMMS_TOKEN (X-API-Token do super_admin).")

payload = {
    "unidades": [
        "Hospital Central",
        "Unidade Matriz",
    ]
}

r = requests.post(
    f"{API}/api/mobilemed/auto/diario-prod?ambiente=homolog",
    headers={"X-API-Token": TOKEN, "Content-Type": "application/json"},
    data=json.dumps(payload),
    timeout=60
)
print("HTTP:", r.status_code)
print(r.text)
