import pymysql

def col_exists(cursor, table, col):
    cursor.execute(f"SHOW COLUMNS FROM {table} LIKE %s", (col,))
    return cursor.fetchone() is not None

def add_col(cursor, table, col_sql):
    cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col_sql}")

def migrate():
    print("Iniciando migração: adicionar colunas IMAP em config_email...")

    conn = pymysql.connect(
        host='localhost',
        user='cmms_user',
        password='cmms_pass',
        database='cmms_db'
    )
    cursor = conn.cursor()

    table = "config_email"

    # IMAP
    if not col_exists(cursor, table, "imap_enabled"):
        add_col(cursor, table, "imap_enabled TINYINT(1) DEFAULT 0")
        print("✓ imap_enabled")

    if not col_exists(cursor, table, "imap_host"):
        add_col(cursor, table, "imap_host VARCHAR(255) NULL")
        print("✓ imap_host")

    if not col_exists(cursor, table, "imap_port"):
        add_col(cursor, table, "imap_port INT DEFAULT 993")
        print("✓ imap_port")

    if not col_exists(cursor, table, "imap_use_ssl"):
        add_col(cursor, table, "imap_use_ssl TINYINT(1) DEFAULT 1")
        print("✓ imap_use_ssl")

    if not col_exists(cursor, table, "imap_username"):
        add_col(cursor, table, "imap_username VARCHAR(255) NULL")
        print("✓ imap_username")

    if not col_exists(cursor, table, "imap_password"):
        add_col(cursor, table, "imap_password VARCHAR(255) NULL")
        print("✓ imap_password")

    if not col_exists(cursor, table, "imap_folder"):
        add_col(cursor, table, "imap_folder VARCHAR(255) DEFAULT 'INBOX'")
        print("✓ imap_folder")

    # Defaults de chamado via email
    if not col_exists(cursor, table, "email_default_prioridade"):
        add_col(cursor, table, "email_default_prioridade VARCHAR(32) DEFAULT 'media'")
        print("✓ email_default_prioridade")

    if not col_exists(cursor, table, "email_default_tipo"):
        add_col(cursor, table, "email_default_tipo VARCHAR(50) DEFAULT 'maquinario'")
        print("✓ email_default_tipo")

    if not col_exists(cursor, table, "email_default_categoria_id"):
        add_col(cursor, table, "email_default_categoria_id INT NULL")
        print("✓ email_default_categoria_id")

    conn.commit()
    conn.close()
    print("Migração concluída com sucesso!")

if __name__ == "__main__":
    migrate()
