import mysql.connector
import os
import sys
from app.config.config import Config

def migrate():
    try:
        print(f"Conectando ao banco de dados {Config.MYSQL_DB} em {Config.MYSQL_HOST}...")
        
        conn = mysql.connector.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            database=Config.MYSQL_DB
        )
        cursor = conn.cursor()
        
        # Verificar se a coluna 'tipo_servico_id' já existe
        cursor.execute("SHOW COLUMNS FROM fornecedores LIKE 'tipo_servico_id'")
        result = cursor.fetchone()
        
        if not result:
            print("Coluna 'tipo_servico_id' não encontrada. Adicionando...")
            cursor.execute("ALTER TABLE fornecedores ADD COLUMN tipo_servico_id INT AFTER servico")
            cursor.execute("ALTER TABLE fornecedores ADD CONSTRAINT fk_fornecedor_tipo_servico FOREIGN KEY (tipo_servico_id) REFERENCES tipos_servico(id)")
            conn.commit()
            print("Coluna 'tipo_servico_id' e constraint adicionadas com sucesso!")
        else:
            print("A coluna 'tipo_servico_id' já existe na tabela 'fornecedores'.")
            
        cursor.close()
        conn.close()

    except Exception as e:
        print(f"Erro ao migrar o banco de dados: {e}")

if __name__ == "__main__":
    migrate()
