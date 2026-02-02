import mysql.connector
import os
import sys

# Adicionar o diretório atual ao path para importar as configurações
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app.config.config import Config
    
    print(f"Conectando ao banco de dados {Config.MYSQL_DB} em {Config.MYSQL_HOST}...")
    
    conn = mysql.connector.connect(
        host=Config.MYSQL_HOST,
        user=Config.MYSQL_USER,
        password=Config.MYSQL_PASSWORD,
        database=Config.MYSQL_DB
    )
    cursor = conn.cursor()
    
    # Verificar se a coluna 'role' já existe
    cursor.execute("SHOW COLUMNS FROM usuarios LIKE 'role'")
    result = cursor.fetchone()
    
    if not result:
        print("Coluna 'role' não encontrada. Adicionando...")
        cursor.execute("ALTER TABLE usuarios ADD COLUMN role VARCHAR(20) DEFAULT 'admin' AFTER empresa_id")
        conn.commit()
        print("Coluna 'role' adicionada com sucesso!")
    else:
        print("A coluna 'role' já existe na tabela 'usuarios'.")
        
    cursor.close()
    conn.close()

except Exception as e:
    print(f"Erro ao corrigir o banco de dados: {e}")
