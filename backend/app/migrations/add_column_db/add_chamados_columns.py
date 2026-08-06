# salvar como /root/add_chamados_columns.py
from app import create_app, db
from sqlalchemy import text

app = create_app()

# Colunas que o código novo espera (nome -> tipo DDL)
WANTED = {
    'prioridade': "VARCHAR(32) NULL",
    'usuario_responsavel_id': "INT NULL",
    'created_at': "DATETIME NULL",
    'updated_at': "DATETIME NULL",
    'ativo': "TINYINT(1) NOT NULL DEFAULT 1",
    'deleted_at': "DATETIME NULL"
}

def get_existing_columns(conn, db_name):
    q = text("""
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'chamados'
    """)
    res = conn.execute(q, {"db": db_name}).fetchall()
    return set([r[0] for r in res])

def add_column(conn, col, ddl):
    sql = f"ALTER TABLE chamados ADD COLUMN {col} {ddl}"
    print("Executando:", sql)
    conn.execute(text(sql))

def main():
    with app.app_context():
        engine = db.engine
        # descobrir nome do DB ativo
        db_name = engine.url.database
        print("Usando DB:", db_name)
        existing = get_existing_columns(engine, db_name)
        print("Colunas existentes:", sorted(existing))

        for col, ddl in WANTED.items():
            if col in existing:
                print(f"Já existe coluna {col}, pulando.")
                continue
            try:
                add_column(engine, col, ddl)
                print(f"Coluna {col} adicionada com sucesso.")
            except Exception as e:
                print(f"Erro ao adicionar coluna {col}:", e)

        # Opcional: popular created_at com data_abertura quando aplicável
        if 'created_at' in WANTED and 'created_at' not in existing and 'data_abertura' in existing:
            try:
                print("Populando created_at a partir de data_abertura para linhas existentes...")
                engine.execute(text("UPDATE chamados SET created_at = data_abertura WHERE created_at IS NULL"))
                print("População executada.")
            except Exception as e:
                print("Erro ao popular created_at:", e)

        print("Feito. Verifique SHOW COLUMNS FROM chamados; ou reinicie a aplicação e teste endpoints.")

if __name__ == '__main__':
    main()
