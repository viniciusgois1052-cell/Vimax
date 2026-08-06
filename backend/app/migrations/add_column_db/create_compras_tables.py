# backend/create_compras_tables.py
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.compra import Compra, ItemCompra

app = create_app()

with app.app_context():
    print("Criando tabelas...")
    db.create_all()
    print("✅ Tabelas criadas com sucesso!")
