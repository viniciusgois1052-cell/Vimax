# -*- coding: utf-8 -*-
"""
Migracao V5 - ACL Marketing por usuario + multi-empresa por usuario.

Adiciona:
 - coluna `criado_por` (INT, FK usuarios.id, nullable) em todas as
   tabelas de marketing.
 - coluna `empresas_ids` (TEXT JSON, nullable, default '[]') em usuarios.

Idempotente: pode rodar varias vezes sem erro.
Compativel com MySQL/MariaDB e SQLite.

Uso:
    cd backend
    python migrate_v5_acl.py
"""
from app import create_app, db
from sqlalchemy import text


MARKETING_TABLES = [
    'marketing_contatos',
    'marketing_grupos',
    'marketing_campanhas',
    'marketing_modelos',
    'marketing_notas',
    'marketing_smtp',
]


def column_exists(conn, table, column):
    dialect = conn.dialect.name
    if dialect == 'sqlite':
        rows = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
        return any(r[1] == column for r in rows)
    # MySQL / MariaDB
    rows = conn.execute(text(
        "SELECT COLUMN_NAME FROM information_schema.COLUMNS "
        "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t AND COLUMN_NAME = :c"
    ), {'t': table, 'c': column}).fetchall()
    return len(rows) > 0


def add_criado_por(conn, table):
    if column_exists(conn, table, 'criado_por'):
        print(f'  -> {table}.criado_por ja existe, ignorando.')
        return
    print(f'  -> ADICIONANDO {table}.criado_por ...')
    if conn.dialect.name == 'sqlite':
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN criado_por INTEGER NULL"))
    else:
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN criado_por INT NULL"))


def add_empresas_ids(conn):
    if column_exists(conn, 'usuarios', 'empresas_ids'):
        print('  -> usuarios.empresas_ids ja existe, ignorando.')
        return
    print('  -> ADICIONANDO usuarios.empresas_ids ...')
    if conn.dialect.name == 'sqlite':
        conn.execute(text("ALTER TABLE usuarios ADD COLUMN empresas_ids TEXT NULL DEFAULT '[]'"))
    else:
        conn.execute(text("ALTER TABLE usuarios ADD COLUMN empresas_ids TEXT NULL"))
        conn.execute(text("UPDATE usuarios SET empresas_ids = '[]' WHERE empresas_ids IS NULL"))


def main():
    app = create_app()
    with app.app_context():
        with db.engine.connect() as conn:
            trans = conn.begin()
            try:
                print('== Marketing tables ==')
                for t in MARKETING_TABLES:
                    add_criado_por(conn, t)
                print('== Usuarios ==')
                add_empresas_ids(conn)
                trans.commit()
                print('OK - migracao concluida.')
            except Exception as e:
                trans.rollback()
                print('ERRO:', e)
                raise


if __name__ == '__main__':
    main()
