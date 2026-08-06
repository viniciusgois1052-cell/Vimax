import mysql.connector
import os
from app.config.config import Config

def init_db():
    try:
        # Conectar ao MySQL sem especificar o banco de dados
        conn = mysql.connector.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD
        )
        cursor = conn.cursor()
        
        # Criar o banco de dados se não existir
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {Config.MYSQL_DB}")
        print(f"Banco de dados '{Config.MYSQL_DB}' verificado/criado.")
        
        cursor.close()
        conn.close()
        
        # Agora usar o SQLAlchemy para criar as tabelas
        from app import create_app, db
        app = create_app()
        with app.app_context():
            db.create_all()
            print("Tabelas criadas com sucesso via SQLAlchemy.")
            
    except Exception as e:
        print(f"Erro ao inicializar o banco de dados: {e}")

if __name__ == "__main__":
    init_db()
