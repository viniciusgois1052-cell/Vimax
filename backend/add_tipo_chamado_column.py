"""
Migration script: adds the tipo_chamado column to the chamados table.
Run from the backend directory:
    python add_tipo_chamado_column.py
"""
from app import create_app, db
from sqlalchemy import text

app = create_app()

def main():
    with app.app_context():
        engine = db.engine
        db_name = engine.url.database
        print("Usando DB:", db_name)

        check = text("""
            SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = :db
              AND TABLE_NAME   = 'chamados'
              AND COLUMN_NAME  = 'tipo_chamado'
        """)
        with engine.connect() as conn:
            exists = conn.execute(check, {"db": db_name}).scalar()
            if exists:
                print("Coluna tipo_chamado já existe. Nada a fazer.")
                return

            add = text("ALTER TABLE chamados ADD COLUMN tipo_chamado VARCHAR(32) NULL")
            conn.execute(add)
            conn.commit()
            print("Coluna tipo_chamado adicionada com sucesso.")

if __name__ == '__main__':
    main()
