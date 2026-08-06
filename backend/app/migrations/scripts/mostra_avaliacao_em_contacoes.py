from pathlib import Path
from datetime import datetime
import shutil
import subprocess
import sys


ROOT = Path.cwd()
ARQUIVO = ROOT / "src" / "pages" / "compras" / "OrcamentosCompras.jsx"
STAMP = datetime.now().strftime("%Y%m%d-%H%M%S")


def fail(message):
    print("ERRO: {}".format(message))
    sys.exit(1)


if not ARQUIVO.exists():
    fail(
        "execute em /var/www/cmms_project/frontend; "
        "OrcamentosCompras.jsx não encontrado"
    )


original = ARQUIVO.read_text(encoding="utf-8")
conteudo = original


state_old = '''  const [sucesso,        setSucesso]        = useState('')

  const fmt ='''
state_new = '''  const [sucesso,        setSucesso]        = useState('')
  const [avaliacoes,     setAvaliacoes]     = useState({})

  const fmt ='''

fetch_anchor = '''  const abrirCotacao = async (id) => {
'''
fetch_block = r'''  const fetchAvaliacoes = async (empresaId) => {
    try {
      const params = new URLSearchParams()
      if (empresaId) params.set('empresa_id', empresaId)
      const query = params.toString() ? `?${params.toString()}` : ''
      const r = await fetch(
        `${API_BASE}/api/compras/classificacao-fornecedores/ranking${query}`,
        { headers }
      )
      const d = await r.json()
      if (!r.ok || !Array.isArray(d)) {
        setAvaliacoes({})
        return
      }
      const mapa = {}
      d.forEach(item => {
        mapa[String(item.fornecedor_id)] = item
      })
      setAvaliacoes(mapa)
    } catch {
      setAvaliacoes({})
    }
  }

  const abrirCotacao = async (id) => {
'''

detail_old = '''      const d = await r.json()
      setCotacaoAtiva(d)
'''
detail_new = '''      const d = await r.json()
      setCotacaoAtiva(d)
      await fetchAvaliacoes(d.empresa_id)
'''

helper_anchor = '''  const menorValor = propostasRespondidas.length > 0
    ? Math.min(...propostasRespondidas.map(p => p.valor_total).filter(v => v > 0))
    : null

  return (
'''
helper_new = '''  const menorValor = propostasRespondidas.length > 0
    ? Math.min(...propostasRespondidas.map(p => p.valor_total).filter(v => v > 0))
    : null

  const avaliacaoFornecedor = (fornecedorId) => (
    avaliacoes[String(fornecedorId)] || null
  )

  const badgeAvaliacao = (fornecedorId, compacta = false) => {
    const avaliacao = avaliacaoFornecedor(fornecedorId)
    if (!avaliacao) {
      return (
        <span className="text-[11px] text-gray-400 whitespace-nowrap">
          ☆ Sem avaliação
        </span>
      )
    }
    return (
      <span
        className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 whitespace-nowrap"
        title={`${avaliacao.total_avaliacoes} avaliação(ões) nesta clínica`}
      >
        <span className="text-amber-500">★</span>
        {Number(avaliacao.nota_media || 0).toFixed(1)}
        {!compacta && (
          <span className="font-normal text-amber-600">
            ({avaliacao.total_avaliacoes})
          </span>
        )}
      </span>
    )
  }

  return (
'''

card_old = '''                                <h3 className="font-bold text-gray-900 text-sm">{p.fornecedor?.nome || 'Fornecedor'}</h3>
                                <p className="text-xs text-gray-500">{p.email_fornecedor}</p>
'''
card_new = '''                                <h3 className="font-bold text-gray-900 text-sm">{p.fornecedor?.nome || 'Fornecedor'}</h3>
                                <div className="mt-1">
                                  {badgeAvaliacao(p.fornecedor_id)}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{p.email_fornecedor}</p>
'''

table_old = '''                                <th key={p.id} className="text-center px-3 py-2 text-gray-600 max-w-[120px]">
                                  {p.fornecedor?.nome}
                                </th>
'''
table_new = '''                                <th key={p.id} className="text-center px-3 py-2 text-gray-600 max-w-[140px]">
                                  <div className="flex flex-col items-center gap-1">
                                    <span>{p.fornecedor?.nome}</span>
                                    {badgeAvaliacao(p.fornecedor_id, true)}
                                  </div>
                                </th>
'''


for name, old, new in (
    ("estado de avaliação", state_old, state_new),
    ("função abrirCotacao", fetch_anchor, fetch_block),
    ("carregamento do detalhe", detail_old, detail_new),
    ("cálculo do menor valor", helper_anchor, helper_new),
    ("nome do fornecedor no card", card_old, card_new),
    ("fornecedor na tabela comparativa", table_old, table_new),
):
    if new in conteudo:
        continue
    if old not in conteudo:
        fail(
            "{} não encontrado; nenhum arquivo foi alterado".format(name)
        )
    conteudo = conteudo.replace(old, new, 1)


backup = ARQUIVO.with_name(
    ARQUIVO.name + ".bak-avaliacoes-" + STAMP
)
shutil.copy2(ARQUIVO, backup)
print("Backup criado:", backup)

try:
    ARQUIVO.write_text(conteudo, encoding="utf-8")
    resultado = subprocess.run(
        ["npm", "run", "build"],
        cwd=str(ROOT),
        text=True
    )
    if resultado.returncode != 0:
        raise RuntimeError("npm run build retornou erro")
except Exception as exc:
    shutil.copy2(backup, ARQUIVO)
    print("ERRO:", exc)
    print("Backup restaurado automaticamente.")
    sys.exit(1)


print()
print("=" * 60)
print("AVALIAÇÕES EXIBIDAS EM ORÇAMENTOS/COTAÇÕES")
print("=" * 60)
print("Nota média exibida nos cards das propostas.")
print("Nota média exibida na tabela comparativa.")
print("Média filtrada pela clínica da cotação.")
print("Fornecedores sem nota aparecem como 'Sem avaliação'.")
print("Build validado.")