"""Cria e preenche as relações N:N de ativos com fornecedores e contratos.

Execução:
    cd /var/www/cmms_project/backend
    python3 app/migrations/scripts/20260721_ativo_multiplos_vinculos.py
"""

from sqlalchemy import text

from app import create_app, db


def executar():
    app = create_app()
    with app.app_context():
        with db.engine.begin() as conexao:
            conexao.execute(text("""
                CREATE TABLE IF NOT EXISTS ativo_fornecedores (
                    ativo_id INT NOT NULL,
                    fornecedor_id INT NOT NULL,
                    PRIMARY KEY (ativo_id, fornecedor_id),
                    CONSTRAINT fk_ativo_fornecedores_ativo
                        FOREIGN KEY (ativo_id) REFERENCES ativos(id)
                        ON DELETE CASCADE,
                    CONSTRAINT fk_ativo_fornecedores_fornecedor
                        FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)
                        ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """))

            conexao.execute(text("""
                CREATE TABLE IF NOT EXISTS ativo_contratos (
                    ativo_id INT NOT NULL,
                    contrato_id INT NOT NULL,
                    PRIMARY KEY (ativo_id, contrato_id),
                    CONSTRAINT fk_ativo_contratos_ativo
                        FOREIGN KEY (ativo_id) REFERENCES ativos(id)
                        ON DELETE CASCADE,
                    CONSTRAINT fk_ativo_contratos_contrato
                        FOREIGN KEY (contrato_id) REFERENCES contratos(id)
                        ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """))

            # Preserva os vínculos existentes nas colunas antigas.
            conexao.execute(text("""
                INSERT IGNORE INTO ativo_fornecedores (ativo_id, fornecedor_id)
                SELECT id, fornecedor_id
                FROM ativos
                WHERE fornecedor_id IS NOT NULL
            """))
            conexao.execute(text("""
                INSERT IGNORE INTO ativo_contratos (ativo_id, contrato_id)
                SELECT id, contrato_id
                FROM ativos
                WHERE contrato_id IS NOT NULL
            """))

            fornecedores = conexao.execute(
                text('SELECT COUNT(*) FROM ativo_fornecedores')
            ).scalar()
            contratos = conexao.execute(
                text('SELECT COUNT(*) FROM ativo_contratos')
            ).scalar()

        print('Migração concluída com sucesso.')
        print(f'Vínculos ativo/fornecedor: {fornecedores}')
        print(f'Vínculos ativo/contrato: {contratos}')


if __name__ == '__main__':
    executar()