from app import create_app, db
from sqlalchemy import text

app = create_app()
with app.app_context():
    try:
        with db.engine.connect() as conn:
            # 1. Adicionar valor_total
            try:
                conn.execute(text("ALTER TABLE chamados ADD COLUMN valor_total FLOAT DEFAULT 0.0"))
                print("Coluna valor_total adicionada.")
            except Exception as e:
                print(f"Coluna valor_total já existe ou erro: {e}")

            # 2. Adicionar ativo_id
            try:
                conn.execute(text("ALTER TABLE chamados ADD COLUMN ativo_id INT NULL"))
                conn.execute(text("ALTER TABLE chamados ADD CONSTRAINT fk_chamados_ativos FOREIGN KEY (ativo_id) REFERENCES ativos(id)"))
                print("Coluna ativo_id e chave estrangeira adicionadas.")
            except Exception as e:
                print(f"Coluna ativo_id já existe ou erro: {e}")

            conn.commit()
        print("Migração v3 concluída com sucesso.")
    except Exception as e:
        print(f"Erro durante a migração v3: {e}")
