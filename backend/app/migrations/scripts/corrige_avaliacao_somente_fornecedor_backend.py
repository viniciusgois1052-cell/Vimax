from pathlib import Path
from datetime import datetime
import py_compile
import shutil
import sys


ROOT = Path.cwd()
ARQUIVO = ROOT / "app" / "routes" / "fornecedor_avaliacao_routes.py"
STAMP = datetime.now().strftime("%Y%m%d-%H%M%S")


if not ARQUIVO.exists():
    print(
        "ERRO: execute em /var/www/cmms_project/backend; "
        "rota de avaliação não encontrada"
    )
    sys.exit(1)


original = ARQUIVO.read_text(encoding="utf-8")
conteudo = original

import_old = "from sqlalchemy import case, func\n"
import_new = "from sqlalchemy import case, func\n"

supplier_anchor = '''    fornecedor = Fornecedor.query.get(fornecedor_id)
    if not fornecedor:
        return None

'''
supplier_new = supplier_anchor + '''    if fornecedor.tipo_entidade != 'fornecedor':
        return None

'''

ranking_anchor = '''        query.join(
            Fornecedor,
            Fornecedor.id == FornecedorAvaliacao.fornecedor_id
        )
        .with_entities(
'''
ranking_new = '''        query.join(
            Fornecedor,
            Fornecedor.id == FornecedorAvaliacao.fornecedor_id
        )
        .filter(Fornecedor.tipo_entidade == 'fornecedor')
        .with_entities(
'''

if "fornecedor.tipo_entidade != 'fornecedor'" not in conteudo:
    if supplier_anchor not in conteudo:
        print("ERRO: validação do fornecedor não encontrada")
        sys.exit(1)
    conteudo = conteudo.replace(
        supplier_anchor,
        supplier_new,
        1
    )

if ".filter(Fornecedor.tipo_entidade == 'fornecedor')" not in conteudo:
    if ranking_anchor not in conteudo:
        print("ERRO: consulta do ranking não encontrada")
        sys.exit(1)
    conteudo = conteudo.replace(
        ranking_anchor,
        ranking_new,
        1
    )

backup = ARQUIVO.with_name(
    ARQUIVO.name + ".bak-somente-fornecedor-" + STAMP
)
shutil.copy2(ARQUIVO, backup)
print("Backup criado:", backup)

try:
    ARQUIVO.write_text(conteudo, encoding="utf-8")
    py_compile.compile(str(ARQUIVO), doraise=True)
except Exception as exc:
    shutil.copy2(backup, ARQUIVO)
    print("ERRO:", exc)
    print("Backup restaurado automaticamente.")
    sys.exit(1)

print()
print("=" * 60)
print("BACKEND — SOMENTE FORNECEDORES")
print("=" * 60)
print("Prestadores bloqueados na avaliação.")
print("Ranking filtrado por tipo_entidade=fornecedor.")
print("Sintaxe validada.")