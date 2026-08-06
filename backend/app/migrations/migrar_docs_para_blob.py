# Rodar dentro da pasta backend:  python migrar_docs_para_blob.py
import os
from app import create_app, db
from app.models.compra import OrdemCompra

UPLOAD_DIR = '/var/www/cmms_project/backend/static/uploads/oc_docs'
MIME = {'pdf': 'application/pdf', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png'}

def ler(url):
    if not url:
        return None, None, None
    nome = os.path.basename(url)
    caminho = os.path.join(UPLOAD_DIR, nome)
    if not os.path.exists(caminho):
        return None, None, None
    with open(caminho, 'rb') as f:
        dados = f.read()
    ext = nome.rsplit('.', 1)[-1].lower() if '.' in nome else ''
    return dados, nome, MIME.get(ext, 'application/octet-stream')

app = create_app()
with app.app_context():
    ocs = OrdemCompra.query.filter(
        (OrdemCompra.nf_arquivo_url.isnot(None)) | (OrdemCompra.boleto_arquivo_url.isnot(None))
    ).all()
    migradas = 0
    for oc in ocs:
        mudou = False
        if oc.nf_arquivo_url and not oc.nf_blob:
            dados, nome, mime = ler(oc.nf_arquivo_url)
            if dados:
                oc.nf_blob, oc.nf_filename, oc.nf_mimetype = dados, nome, mime
                oc.nf_arquivo_url = None
                mudou = True
        if oc.boleto_arquivo_url and not oc.boleto_blob:
            dados, nome, mime = ler(oc.boleto_arquivo_url)
            if dados:
                oc.boleto_blob, oc.boleto_filename, oc.boleto_mimetype = dados, nome, mime
                oc.boleto_arquivo_url = None
                mudou = True
        if mudou:
            migradas += 1
            print(f"Migrada OC {oc.numero_oc}")
    db.session.commit()
    print(f"\n✅ {migradas} OC(s) migradas para BLOB.")
