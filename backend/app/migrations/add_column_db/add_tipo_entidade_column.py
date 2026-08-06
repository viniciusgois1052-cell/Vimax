"""
Script para adicionar a coluna tipo_entidade na tabela fornecedores
Execute: python -m scripts.add_tipo_entidade_column
"""
from app import create_app, db
from sqlalchemy import text

def add_tipo_entidade_column():
    app = create_app()
    with app.app_context():
        try:
            # Verifica se a coluna já existe
            result = db.session.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='fornecedores' AND column_name='tipo_entidade'
            """))
            
            if result.fetchone():
                print("✓ Coluna 'tipo_entidade' já existe na tabela 'fornecedores'")
            else:
                print("→ Adicionando coluna 'tipo_entidade'...")
                db.session.execute(text("""
                    ALTER TABLE fornecedores 
                    ADD COLUMN tipo_entidade VARCHAR(20) NOT NULL DEFAULT 'fornecedor'
                """))
                db.session.commit()
                print("✓ Coluna 'tipo_entidade' adicionada com sucesso!")
            
            # Garante que todos os registros tenham um valor
            print("→ Atualizando registros existentes...")
            db.session.execute(text("""
                UPDATE fornecedores 
                SET tipo_entidade = 'fornecedor' 
                WHERE tipo_entidade IS NULL OR tipo_entidade = ''
            """))
            db.session.commit()
            print("✓ Todos os registros atualizados!")
            
        except Exception as e:
            print(f"✗ Erro: {e}")
            db.session.rollback()

if __name__ == '__main__':
    add_tipo_entidade_column()
