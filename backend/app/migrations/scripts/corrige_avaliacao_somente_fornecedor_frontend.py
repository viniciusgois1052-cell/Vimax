from pathlib import Path
from datetime import datetime
import shutil
import subprocess
import sys


ROOT = Path.cwd()
ARQUIVO = ROOT / "src" / "pages" / "Fornecedores.jsx"
STAMP = datetime.now().strftime("%Y%m%d-%H%M%S")


def fail(message):
    print("ERRO: {}".format(message))
    sys.exit(1)


if not ARQUIVO.exists():
    fail(
        "execute em /var/www/cmms_project/frontend; "
        "Fornecedores.jsx não encontrado"
    )


original = ARQUIVO.read_text(encoding="utf-8")
conteudo = original


replacements = []

replacements.append((
'''    const [avaliacaoResumo, setAvaliacaoResumo] = useState(null);
    const [avaliacaoForm, setAvaliacaoForm] = useState({
''',
'''    const [avaliacaoResumo, setAvaliacaoResumo] = useState(null);
    const [avaliacaoHistorico, setAvaliacaoHistorico] = useState([]);
    const [avaliacaoForm, setAvaliacaoForm] = useState({
'''
))

replacements.append((
'''        setAvaliacaoResumo(null);
        setAvaliacaoErro('');
''',
'''        setAvaliacaoResumo(null);
        setAvaliacaoHistorico([]);
        setAvaliacaoErro('');
'''
))

replacements.append((
'''            !isAvaliacaoOpen
            || !avaliacaoForm.fornecedor_id
            || !avaliacaoForm.empresa_id
            || !user?.api_token
''',
'''            !isAvaliacaoOpen
            || !avaliacaoForm.fornecedor_id
            || !user?.api_token
'''
))

replacements.append((
'''                const params = new URLSearchParams({
                    empresa_id: avaliacaoForm.empresa_id
                });
                const resposta = await fetch(
                    `${API_URL}/compras/classificacao-fornecedores/fornecedor/${avaliacaoForm.fornecedor_id}?${params}`,
''',
'''                const params = new URLSearchParams();
                if (avaliacaoForm.empresa_id) {
                    params.set('empresa_id', avaliacaoForm.empresa_id);
                }
                const query = params.toString()
                    ? `?${params.toString()}`
                    : '';
                const resposta = await fetch(
                    `${API_URL}/compras/classificacao-fornecedores/fornecedor/${avaliacaoForm.fornecedor_id}${query}`,
'''
))

replacements.append((
'''                const minha = dados.minha_avaliacao;
                setAvaliacaoResumo(dados.resumo || null);
                setAvaliacaoForm(anterior => ({
''',
'''                const minha = avaliacaoForm.empresa_id
                    ? dados.minha_avaliacao
                    : null;
                setAvaliacaoResumo(dados.resumo || null);
                setAvaliacaoHistorico(dados.avaliacoes || []);
                setAvaliacaoErro('');
                setAvaliacaoForm(anterior => ({
'''
))

replacements.append((
'''                    setAvaliacaoResumo(null);
                    setAvaliacaoErro(erro.message);
''',
'''                    setAvaliacaoResumo(null);
                    setAvaliacaoHistorico([]);
                    setAvaliacaoErro(erro.message);
'''
))

replacements.append((
'''            setAvaliacaoSucesso('Avaliação salva com sucesso.');
            setAvaliacaoResumo(anterior => ({
                ...(anterior || {}),
                nota_media: dados.nota_geral,
                total_avaliacoes: anterior?.total_avaliacoes || 1
            }));
''',
'''            setAvaliacaoSucesso('Avaliação salva com sucesso.');
            const proximoHistorico = [
                dados,
                ...avaliacaoHistorico.filter(item => item.id !== dados.id)
            ];
            const media = proximoHistorico.reduce(
                (total, item) => total + Number(
                    item.nota_geral || item.qualidade || 0
                ),
                0
            ) / proximoHistorico.length;
            setAvaliacaoHistorico(proximoHistorico);
            setAvaliacaoResumo({
                nota_media: Number(media.toFixed(2)),
                total_avaliacoes: proximoHistorico.length
            });
'''
))

replacements.append((
'''                    resumo={avaliacaoResumo}
                    erro={avaliacaoErro}
''',
'''                    resumo={avaliacaoResumo}
                    avaliacoes={avaliacaoHistorico}
                    erro={avaliacaoErro}
'''
))

replacements.append((
'''    fornecedores, empresas, form, setForm, resumo, erro, sucesso,
    salvando, onSubmit, onClose
''',
'''    fornecedores, empresas, form, setForm, resumo, avaliacoes,
    erro, sucesso, salvando, onSubmit, onClose
'''
))

replacements.append((
'''            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
''',
'''            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
'''
))

replacements.append((
'''                            Fornecedor ou prestador *
''',
'''                            Fornecedor *
'''
))

replacements.append((
'''                            {[...fornecedores]
                                .sort((a, b) => a.nome.localeCompare(b.nome))
                                .map(item => (
                                    <option key={item.id} value={item.id}>
                                        {item.nome} — {
                                            item.tipo_entidade === 'prestador'
                                                ? 'Prestador'
                                                : 'Fornecedor'
                                        }
                                    </option>
                                ))}
''',
'''                            {[...fornecedores]
                                .filter(item => (
                                    item.tipo_entidade === 'fornecedor'
                                ))
                                .sort((a, b) => a.nome.localeCompare(b.nome))
                                .map(item => (
                                    <option key={item.id} value={item.id}>
                                        {item.nome}
                                    </option>
                                ))}
'''
))

replacements.append((
'''                                Média da clínica: {resumo.nota_media}/5 em{' '}
''',
'''                                {form.empresa_id
                                    ? 'Média da clínica'
                                    : 'Média geral'}: {resumo.nota_media}/5 em{' '}
'''
))

history_anchor = '''                    <div className="flex gap-3 pt-2">
'''
history_block = r'''                    {avaliacoes?.length > 0 && (
                        <div className="border-t pt-4">
                            <h3 className="text-sm font-bold text-gray-700 mb-3">
                                Avaliações registradas
                            </h3>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {avaliacoes.map(item => (
                                    <div
                                        key={item.id}
                                        className="bg-gray-50 border rounded-lg p-3"
                                    >
                                        <div className="flex justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">
                                                    {item.avaliador_nome || 'Usuário'}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {item.empresa_nome || 'Clínica'}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1 text-amber-500 font-bold">
                                                <FaStar />
                                                {Number(
                                                    item.nota_geral
                                                    || item.qualidade
                                                    || 0
                                                ).toFixed(1)}
                                            </div>
                                        </div>
                                        {item.comentario && (
                                            <p className="text-sm text-gray-600 mt-2">
                                                {item.comentario}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
'''


for old, new in replacements:
    if new in conteudo:
        continue
    if old not in conteudo:
        fail(
            "um ponto esperado não foi encontrado; "
            "nenhum arquivo foi alterado"
        )
    conteudo = conteudo.replace(old, new, 1)


if "Avaliações registradas" not in conteudo:
    if history_anchor not in conteudo:
        fail(
            "ponto do histórico não encontrado; "
            "nenhum arquivo foi alterado"
        )
    conteudo = conteudo.replace(
        history_anchor,
        history_block,
        1
    )


backup = ARQUIVO.with_name(
    ARQUIVO.name + ".bak-avaliacao-visivel-" + STAMP
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
print("FRONTEND — AVALIAÇÃO VISÍVEL")
print("=" * 60)
print("Somente tipo_entidade=fornecedor aparece na seleção.")
print("Superadmin pode consultar sem escolher clínica.")
print("Média e histórico aparecem no formulário.")
print("Build validado.")