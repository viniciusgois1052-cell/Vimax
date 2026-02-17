from app import create_app, db
from sqlalchemy import text

app = create_app()
with app.app_context():
    try:
        # Adicionando novas colunas à tabela chamados
        with db.engine.connect() as conn:
            # Colunas de Criticidade
            try:
                conn.execute(text("ALTER TABLE chamados ADD COLUMN criticidade_informada VARCHAR(32)"))
                print("Coluna criticidade_informada adicionada.")
            except Exception as e:
                print(f"Coluna criticidade_informada já existe ou erro: {e}")

            try:
                conn.execute(text("ALTER TABLE chamados ADD COLUMN criticidade_real VARCHAR(32)"))
                print("Coluna criticidade_real adicionada.")
            except Exception as e:
                print(f"Coluna criticidade_real já existe ou erro: {e}")

            # Colunas de Data/Hora
            try:
                conn.execute(text("ALTER TABLE chamados ADD COLUMN data_abertura DATETIME"))
                print("Coluna data_abertura adicionada.")
            except Exception as e:
                print(f"Coluna data_abertura já existe ou erro: {e}")

            try:
                conn.execute(text("ALTER TABLE chamados ADD COLUMN data_solucao DATETIME"))
                print("Coluna data_solucao adicionada.")
            except Exception as e:
                print(f"Coluna data_solucao já existe ou erro: {e}")

            conn.commit()
        print("Migração de banco de dados concluída com sucesso.")
    except Exception as e:
        print(f"Erro durante a migração: {e}")
