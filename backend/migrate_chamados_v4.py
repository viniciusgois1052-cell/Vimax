#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de migração para adicionar os campos tipo, infraestrutura_id e opcoes_selecionadas
à tabela chamados.
Execute com: python migrate_chamados_v4.py
"""

import sys
import os

# Adicionar o diretório pai ao path para importar a app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from sqlalchemy import text

app = create_app()

def run_migration():
    with app.app_context():
        conn = db.engine.connect()
        
        # Verificar se as colunas já existem
        try:
            result = conn.execute(text("SHOW COLUMNS FROM chamados LIKE 'tipo'"))
            tipo_exists = result.fetchone() is not None
        except Exception:
            tipo_exists = False
        
        try:
            result = conn.execute(text("SHOW COLUMNS FROM chamados LIKE 'infraestrutura_id'"))
            infra_id_exists = result.fetchone() is not None
        except Exception:
            infra_id_exists = False
        
        try:
            result = conn.execute(text("SHOW COLUMNS FROM chamados LIKE 'opcoes_selecionadas'"))
            opcoes_exists = result.fetchone() is not None
        except Exception:
            opcoes_exists = False
        
        # Adicionar coluna tipo
        if not tipo_exists:
            try:
                conn.execute(text("ALTER TABLE chamados ADD COLUMN tipo VARCHAR(50) DEFAULT 'maquinario'"))
                conn.commit()
                print("✓ Coluna 'tipo' adicionada com sucesso")
            except Exception as e:
                print(f"⚠ Erro ao adicionar coluna 'tipo': {e}")
        else:
            print("✓ Coluna 'tipo' já existe")
        
        # Adicionar coluna infraestrutura_id
        if not infra_id_exists:
            try:
                conn.execute(text("ALTER TABLE chamados ADD COLUMN infraestrutura_id INTEGER NULL"))
                conn.commit()
                print("✓ Coluna 'infraestrutura_id' adicionada com sucesso")
                
                # Tentar adicionar FK (pode falhar se a tabela infraestrutura não existir)
                try:
                    conn.execute(text(
                        "ALTER TABLE chamados ADD CONSTRAINT fk_chamado_infraestrutura "
                        "FOREIGN KEY (infraestrutura_id) REFERENCES infraestrutura(id)"
                    ))
                    conn.commit()
                    print("✓ Foreign key para infraestrutura adicionada")
                except Exception as e:
                    print(f"⚠ FK não adicionada (pode ser ignorado): {e}")
                    
            except Exception as e:
                print(f"⚠ Erro ao adicionar coluna 'infraestrutura_id': {e}")
        else:
            print("✓ Coluna 'infraestrutura_id' já existe")
        
        # Adicionar coluna opcoes_selecionadas
        if not opcoes_exists:
            try:
                conn.execute(text("ALTER TABLE chamados ADD COLUMN opcoes_selecionadas TEXT NULL"))
                conn.commit()
                print("✓ Coluna 'opcoes_selecionadas' adicionada com sucesso")
            except Exception as e:
                print(f"⚠ Erro ao adicionar coluna 'opcoes_selecionadas': {e}")
        else:
            print("✓ Coluna 'opcoes_selecionadas' já existe")
        
        conn.close()
        print("\n✅ Migração concluída!")

if __name__ == '__main__':
    run_migration()
