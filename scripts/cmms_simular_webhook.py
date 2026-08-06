import os, requests, json, datetime

API = os.environ.get("CMMS_API", "http://127.0.0.1:5002").rstrip("/")
RELATORIO_ID = int(os.environ.get("RELATORIO_ID", "53"))

payload = {
  "reportId": "req-simulado",
  "requestId": "26300a36-1958-43e8-97ad-9b936cd2e4e8",
  "status": "completed",
  "message": "Relatório processado com sucesso. 2 registros encontrados.",
  "rowCount": 2,
  "hasData": True,
  "downloadUrl": "https://example.com/test.csv",
  "createdAt": datetime.datetime.utcnow().isoformat() + "Z",
  "completedAt": datetime.datetime.utcnow().isoformat() + "Z",
}

r = requests.post(
    f"{API}/api/mobilemed/webhook",
    headers={"Content-Type":"application/json", "X-Vimax-Relatorio-Id": str(RELATORIO_ID)},
    data=json.dumps(payload),
    timeout=30
)
print("HTTP:", r.status_code)
print(r.text)
