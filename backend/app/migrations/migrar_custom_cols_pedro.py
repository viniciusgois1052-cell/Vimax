# migrar_custom_cols_pedro.py — rodar uma vez: python migrar_custom_cols_pedro.py
from app import create_app, db
from app.models.crm_custom_column import CrmCustomColumn

app = create_app()

with app.app_context():
    # 1. Garante que a tabela existe (não mexe em tabelas já existentes)
    db.create_all()
    print("✅ Tabela crm_custom_columns OK")

    # 2. Migra os dados do Pedro (empresa_id=45)
    dados = [
        {"key": "cx_1780489344756", "label": "Cidade Interesse"},
        {"key": "cx_1780489360932", "label": "Estado (Brasil)"},
        {"key": "cx_1780489391708", "label": "Profissão/Função"},
    ]

    for i, d in enumerate(dados):
        existe = CrmCustomColumn.query.filter_by(
            empresa_id=45, entity_type='oportunidades', key=d['key']
        ).first()
        if not existe:
            db.session.add(CrmCustomColumn(
                empresa_id=45,
                entity_type='oportunidades',
                key=d['key'],
                label=d['label'],
                ordem=i
            ))
            print(f"➕ Adicionada: {d['label']}")
        else:
            print(f"⏭️  Já existe: {d['label']}")

    db.session.commit()
    print("🎉 Migração concluída!")
