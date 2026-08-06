#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de migração para adicionar os campos ativo_id e infraestrutura_id
à tabela formulario_chamado.
Execute com: python migrate_formulario_v2.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from sqlalchemy import text

app = create_app()

def run_migration():
    with app.app_context():
        conn = db.engine.connect()
        
        # Verificar se as colunas já existem
        try:
            result = conn.execute(text("SHOW COLUMNS FROM formulario_chamado LIKE 'ativo_id'"))
            ativo_id_exists = result.fetchone() is not None
        except Exception:
            ativo_id_exists = False
        
        try:
            result = conn.execute(text("SHOW COLUMNS FROM formulario_chamado LIKE 'infraestrutura_id'"))
            infra_id_exists = result.fetchone() is not None
        except Exception:
            infra_id_exists = False
        
        # Adicionar coluna ativo_id
        if not ativo_id_exists:
            try:
                conn.execute(text("ALTER TABLE formulario_chamado ADD COLUMN ativo_id INTEGER NULL"))
                conn.commit()
                print("✓ Coluna 'ativo_id' adicionada com sucesso")
                
                # Tentar adicionar FK
                try:
                    conn.execute(text(
                        "ALTER TABLE formulario_chamado ADD CONSTRAINT fk_formulario_ativo "
                        "FOREIGN KEY (ativo_id) REFERENCES ativos(id)"
                    ))
                    conn.commit()
                    print("✓ Foreign key para ativo adicionada")
                except Exception as e:
                    print(f"⚠ FK para ativo não adicionada (pode ser ignorado): {e}")
                    
            except Exception as e:
                print(f"⚠ Erro ao adicionar coluna 'ativo_id': {e}")
        else:
            print("✓ Coluna 'ativo_id' já existe")
        
        # Adicionar coluna infraestrutura_id
        if not infra_id_exists:
            try:
                conn.execute(text("ALTER TABLE formulario_chamado ADD COLUMN infraestrutura_id INTEGER NULL"))
                conn.commit()
                print("✓ Coluna 'infraestrutura_id' adicionada com sucesso")
                
                # Tentar adicionar FK
                try:
                    conn.execute(text(
                        "ALTER TABLE formulario_chamado ADD CONSTRAINT fk_formulario_infraestrutura "
                        "FOREIGN KEY (infraestrutura_id) REFERENCES infraestrutura(id)"
                    ))
                    conn.commit()
                    print("✓ Foreign key para infraestrutura adicionada")
                except Exception as e:
                    print(f"⚠ FK para infraestrutura não adicionada (pode ser ignorado): {e}")
                    
            except Exception as e:
                print(f"⚠ Erro ao adicionar coluna 'infraestrutura_id': {e}")
        else:
            print("✓ Coluna 'infraestrutura_id' já existe")
        
        conn.close()
        print("\n✅ Migração concluída!")

if __name__ == '__main__':
    run_migration()
