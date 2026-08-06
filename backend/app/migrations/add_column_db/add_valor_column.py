import mysql.connector
from app.config.config import Config

def migrate():
    try:
        # Conectar ao MySQL
        conn = mysql.connector.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            database=Config.MYSQL_DB
        )
        cursor = conn.cursor()
        
        # Verificar se a coluna já existe
        cursor.execute("SHOW COLUMNS FROM chamados LIKE 'valor_total'")
        result = cursor.fetchone()
        
        if not result:
            print("Adicionando coluna 'valor_total' à tabela 'chamados'...")
            cursor.execute("ALTER TABLE chamados ADD COLUMN valor_total FLOAT DEFAULT 0.0")
            conn.commit()
            print("Coluna 'valor_total' adicionada com sucesso.")
        else:
            print("A coluna 'valor_total' já existe na tabela 'chamados'.")
            
        cursor.close()
        conn.close()
            
    except Exception as e:
        print(f"Erro ao migrar o banco de dados: {e}")

if __name__ == "__main__":
    migrate()

