"""
Adiciona coluna tipo_entidade à tabela fornecedores
"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    # Adiciona coluna tipo_entidade (default: 'fornecedor')
    op.add_column('fornecedores', 
        sa.Column('tipo_entidade', sa.String(20), nullable=False, server_default='fornecedor')
    )

def downgrade():
    op.drop_column('fornecedores', 'tipo_entidade')