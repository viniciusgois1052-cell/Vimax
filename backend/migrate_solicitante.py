import pymysql
import os

def migrate():
    print("Iniciando migração para adicionar solicitante nos chamados...")
    
    try:
        conn = pymysql.connect(
            host='localhost',
            user='cmms_user',
            password='cmms_pass',
            database='cmms_db'
        )
        cursor = conn.cursor()
        
        # Adicionar coluna usuario_solicitante_id
        try:
            cursor.execute("ALTER TABLE chamados ADD COLUMN usuario_solicitante_id INT NULL")
            cursor.execute("ALTER TABLE chamados ADD CONSTRAINT fk_chamado_solicitante FOREIGN KEY (usuario_solicitante_id) REFERENCES usuarios(id)")
            print("✓ Coluna usuario_solicitante_id adicionada com sucesso!")
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("✓ Coluna usuario_solicitante_id já existe.")
            else:
                print(f"❌ Erro ao adicionar coluna: {e}")
        
        conn.commit()
        conn.close()
        print("Migração concluída!")
        return True
    except Exception as e:
        print(f"❌ Erro de conexão: {e}")
        return False

if __name__ == "__main__":
    migrate()
