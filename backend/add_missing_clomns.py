"""
Script para adicionar as colunas faltantes na tabela chamados
Execute este script antes de substituir os arquivos do modelo e rotas
"""
import sqlite3
import os

# Caminho do banco de dados
DB_PATH = os.path.join(os.path.dirname(__file__), 'instance', 'cmms.db')

def add_columns():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Lista de colunas para adicionar
    columns_to_add = [
        ('fornecedor_id', 'INTEGER'),
        ('contrato_id', 'INTEGER'),
        ('orcamento_id', 'INTEGER'),
        ('ativo_id', 'INTEGER'),
        ('valor_total', 'REAL')
    ]
    
    # Verificar quais colunas já existem
    cursor.execute("PRAGMA table_info(chamados)")
    existing_columns = [row[1] for row in cursor.fetchall()]
    
    print("Colunas existentes na tabela 'chamados':")
    for col in existing_columns:
        print(f"  - {col}")
    
    print("\nAdicionando colunas faltantes...")
    
    # Adicionar cada coluna se não existir
    for column_name, column_type in columns_to_add:
        if column_name not in existing_columns:
            try:
                cursor.execute(f"ALTER TABLE chamados ADD COLUMN {column_name} {column_type}")
                print(f"✓ Coluna '{column_name}' adicionada com sucesso")
            except sqlite3.OperationalError as e:
                print(f"✗ Erro ao adicionar coluna '{column_name}': {e}")
        else:
            print(f"⊙ Coluna '{column_name}' já existe")
    
    conn.commit()
    conn.close()
    print("\nMigração concluída!")

if __name__ == '__main__':
    if not os.path.exists(DB_PATH):
        print(f"Erro: Banco de dados não encontrado em {DB_PATH}")
        print("Certifique-se de que o caminho está correto.")
    else:
        print(f"Banco de dados encontrado: {DB_PATH}")
        add_columns()
