#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.chamado import Chamado
from datetime import datetime

app = create_app()

def test_insert():
    with app.app_context():
        print("--- Iniciando teste de inserção de chamado ---")
        try:
            novo_chamado = Chamado(
                titulo="Teste de Diagnóstico",
                descricao="Teste",
                status="Aberto",
                tipo="maquinario",
                empresa_id=1, # Ajuste se necessário
                data_abertura=datetime.utcnow(),
                ativo=True,
                opcoes_selecionadas='["teste"]',
                anexos='[]'
            )
            db.session.add(novo_chamado)
            db.session.commit()
            print("✅ Sucesso! O banco de dados está aceitando os novos campos.")
            
            # Limpar teste
            db.session.delete(novo_chamado)
            db.session.commit()
            
        except Exception as e:
            print("\n❌ ERRO ENCONTRADO:")
            print(str(e))
            print("\n--- Dica de Solução ---")
            if "no such column" in str(e).lower() or "Unknown column" in str(e):
                print("O banco de dados não tem as colunas novas. Rode: python3 migrate_chamados_v4.py")
            elif "foreign key constraint fails" in str(e).lower():
                print("Erro de chave estrangeira. Verifique se a empresa_id ou ativo_id existem.")
            else:
                print("Erro desconhecido. Verifique se o arquivo app/models/chamado.py está atualizado.")

if __name__ == '__main__':
    test_insert()
