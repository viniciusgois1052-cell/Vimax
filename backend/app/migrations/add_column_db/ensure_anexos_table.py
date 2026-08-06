import MySQLdb

def ensure_tables():
    try:
        db = MySQLdb.connect(
            host="localhost",
            user="root",
            passwd="",
            db="cmms_db"
        )
        cursor = db.cursor()
        
        print("Verificando/Criando tabela 'anexos'...")
        
        # Criar a tabela anexos se ela não existir
        # Importante: orcamento_id deve ser a chave estrangeira correta
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS anexos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                caminho VARCHAR(255) NOT NULL,
                orcamento_id INT NOT NULL,
                CONSTRAINT fk_orcamento FOREIGN KEY (orcamento_id) 
                REFERENCES orcamentos(id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        """)
        
        # Garantir que localizacao_id em orcamentos seja NULL
        cursor.execute("ALTER TABLE orcamentos MODIFY localizacao_id INT NULL;")
        
        db.commit()
        print("✅ Banco de dados verificado e atualizado com sucesso!")
        
        db.close()
    except Exception as e:
        print(f"❌ Erro ao atualizar banco de dados: {e}")

if __name__ == "__main__":
    ensure_tables()
