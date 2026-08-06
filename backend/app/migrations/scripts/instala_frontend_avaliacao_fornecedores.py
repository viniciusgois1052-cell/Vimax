from pathlib import Path
from datetime import datetime
import py_compile
import shutil
import subprocess
import sys


ROOT = Path.cwd()
COMPRAS = ROOT / "src" / "pages" / "Compras.jsx"
FORNECEDORES = ROOT / "src" / "pages" / "Fornecedores.jsx"
APP = ROOT / "src" / "App.jsx"
STAMP = datetime.now().strftime("%Y%m%d-%H%M%S")


def fail(message):
    print("ERRO: {}".format(message))
    sys.exit(1)


for path in (COMPRAS, FORNECEDORES, APP):
    if not path.exists():
        fail(
            "execute em /var/www/cmms_project/frontend; "
            "não encontrei {}".format(path)
        )


originals = {
    COMPRAS: COMPRAS.read_text(encoding="utf-8"),
    FORNECEDORES: FORNECEDORES.read_text(encoding="utf-8"),
    APP: APP.read_text(encoding="utf-8"),
}
updated = dict(originals)


# ---------------------------------------------------------------------------
# Card no módulo de Compras
# ---------------------------------------------------------------------------
if "/fornecedores?avaliar=1" not in updated[COMPRAS]:
    icon_anchor = (
        "import { ShoppingCart, Package, FileText, Truck, ClipboardList, "
        "BarChart2, Inbox, UserPlus, Image, FileCheck } from 'lucide-react'"
    )
    icon_new = (
        "import { ShoppingCart, Package, FileText, Truck, ClipboardList, "
        "BarChart2, Inbox, UserPlus, Image, FileCheck, Star } "
        "from 'lucide-react'"
    )
    link_anchor = "import { Link } from 'react-router-dom'\n"
    auth_import = "import { useAuth } from '../context/AuthContext'\n"
    function_anchor = (
        "export default function Compras() {\n"
        "  const menuItems = ["
    )
    function_new = (
        "export default function Compras() {\n"
        "  const { can } = useAuth()\n"
        "  const menuItems = ["
    )
    item_anchor = (
        "        { path: '/fornecedores?novo=1&origem=compras&tipo=fornecedor', "
        "label: 'Cadastrar Fornecedor', icon: UserPlus, "
        "color: 'bg-emerald-100 text-emerald-600', "
        "desc: 'Abrir cadastro de fornecedor (origem: Compras)' },\n"
    )
    item_new = item_anchor + (
        "        ...(can('compras', 'editar') ? [{ "
        "path: '/fornecedores?avaliar=1', "
        "label: 'Avaliar Fornecedor', icon: Star, "
        "color: 'bg-amber-100 text-amber-600', "
        "desc: 'Avaliar fornecedor ou prestador com 1 a 5 estrelas' "
        "}] : []),\n"
    )

    for name, anchor in (
        ("importação de ícones em Compras.jsx", icon_anchor),
        ("importação do Link em Compras.jsx", link_anchor),
        ("função Compras", function_anchor),
        ("card Cadastrar Fornecedor", item_anchor),
    ):
        if anchor not in updated[COMPRAS]:
            fail("{} não encontrada; nada foi alterado".format(name))

    updated[COMPRAS] = updated[COMPRAS].replace(
        icon_anchor,
        icon_new,
        1
    )
    if auth_import not in updated[COMPRAS]:
        updated[COMPRAS] = updated[COMPRAS].replace(
            link_anchor,
            link_anchor + auth_import,
            1
        )
    updated[COMPRAS] = updated[COMPRAS].replace(
        function_anchor,
        function_new,
        1
    )
    updated[COMPRAS] = updated[COMPRAS].replace(
        item_anchor,
        item_new,
        1
    )


# ---------------------------------------------------------------------------
# Libera a rota para perfil de Compras com permissão de edição
# ---------------------------------------------------------------------------
route_old = (
    "          {p.fornecedores_ver          && "
    "<Route path=\"/fornecedores\"          "
    "element={<Fornecedores />} />}"
)
route_new = (
    "          {(p.fornecedores_ver || p.compras_editar) && "
    "<Route path=\"/fornecedores\" "
    "element={<Fornecedores />} />}"
)
if route_new not in updated[APP]:
    if route_old not in updated[APP]:
        fail(
            "rota condicional /fornecedores não encontrada em App.jsx; "
            "nada foi alterado"
        )
    updated[APP] = updated[APP].replace(route_old, route_new, 1)


# ---------------------------------------------------------------------------
# Modal de avaliação em Fornecedores.jsx
# ---------------------------------------------------------------------------
if "ModalAvaliacaoFornecedor" not in updated[FORNECEDORES]:
    icon_old = (
        "    FaBriefcase, FaTools, FaBoxes, FaUser, FaFilter, "
        "FaShoppingCart\n"
        "} from 'react-icons/fa';"
    )
    icon_new = (
        "    FaBriefcase, FaTools, FaBoxes, FaUser, FaFilter, "
        "FaShoppingCart, FaStar\n"
        "} from 'react-icons/fa';"
    )
    state_anchor = (
        "    const [loadingOrcamentos, setLoadingOrcamentos] = "
        "useState(false);\n"
        "    \n"
        "    const [formData, setFormData] = useState({"
    )
    state_new = (
        "    const [loadingOrcamentos, setLoadingOrcamentos] = "
        "useState(false);\n"
        "\n"
        "    const [isAvaliacaoOpen, setIsAvaliacaoOpen] = useState(false);\n"
        "    const [salvandoAvaliacao, setSalvandoAvaliacao] = "
        "useState(false);\n"
        "    const [avaliacaoErro, setAvaliacaoErro] = useState('');\n"
        "    const [avaliacaoSucesso, setAvaliacaoSucesso] = useState('');\n"
        "    const [avaliacaoResumo, setAvaliacaoResumo] = useState(null);\n"
        "    const [avaliacaoForm, setAvaliacaoForm] = useState({\n"
        "        fornecedor_id: '', empresa_id: '', nota: 0, comentario: ''\n"
        "    });\n"
        "    \n"
        "    const [formData, setFormData] = useState({"
    )
    permission_anchor = (
        "    const canViewPrestador = perfil ? "
        "(perfil.visualizar_prestadores !== false) : true;\n"
    )
    permission_new = permission_anchor + (
        "    const canAvaliarFornecedor = can('compras', 'editar');\n"
    )
    handler_anchor = "    const handleOpenModal = (fornecedor = null) => {"
    handlers = r'''    useEffect(() => {
        if (searchParams.get('avaliar') !== '1') return;

        if (!canAvaliarFornecedor) {
            alert('Seu perfil não possui permissão para avaliar fornecedores.');
            setSearchParams({}, { replace: true });
            return;
        }

        const empresaInicial = (
            selectedEntity && selectedEntity !== 'all'
                ? String(selectedEntity)
                : user?.empresa_id
                    ? String(user.empresa_id)
                    : ''
        );

        setAvaliacaoForm({
            fornecedor_id: '',
            empresa_id: empresaInicial,
            nota: 0,
            comentario: ''
        });
        setAvaliacaoResumo(null);
        setAvaliacaoErro('');
        setAvaliacaoSucesso('');
        setIsAvaliacaoOpen(true);
        setSearchParams({}, { replace: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (
            !isAvaliacaoOpen
            || !avaliacaoForm.fornecedor_id
            || !avaliacaoForm.empresa_id
            || !user?.api_token
        ) return;

        let cancelado = false;
        const carregar = async () => {
            try {
                const params = new URLSearchParams({
                    empresa_id: avaliacaoForm.empresa_id
                });
                const resposta = await fetch(
                    `${API_URL}/compras/classificacao-fornecedores/fornecedor/${avaliacaoForm.fornecedor_id}?${params}`,
                    { headers: { 'X-API-Token': user.api_token } }
                );
                const dados = await resposta.json();
                if (!resposta.ok) {
                    throw new Error(dados.error || 'Erro ao carregar avaliação');
                }
                if (cancelado) return;

                const minha = dados.minha_avaliacao;
                setAvaliacaoResumo(dados.resumo || null);
                setAvaliacaoForm(anterior => ({
                    ...anterior,
                    nota: minha
                        ? Number(minha.nota_geral || minha.qualidade || 0)
                        : 0,
                    comentario: minha?.comentario || ''
                }));
            } catch (erro) {
                if (!cancelado) {
                    setAvaliacaoResumo(null);
                    setAvaliacaoErro(erro.message);
                }
            }
        };
        carregar();
        return () => { cancelado = true; };
    }, [
        isAvaliacaoOpen,
        avaliacaoForm.fornecedor_id,
        avaliacaoForm.empresa_id,
        user?.api_token
    ]);

    const salvarAvaliacaoFornecedor = async (event) => {
        event.preventDefault();
        setAvaliacaoErro('');
        setAvaliacaoSucesso('');

        if (
            !avaliacaoForm.fornecedor_id
            || !avaliacaoForm.empresa_id
            || avaliacaoForm.nota < 1
        ) {
            setAvaliacaoErro(
                'Selecione o fornecedor, a clínica e uma nota de 1 a 5.'
            );
            return;
        }

        setSalvandoAvaliacao(true);
        try {
            const resposta = await fetch(
                `${API_URL}/compras/classificacao-fornecedores`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Token': user.api_token
                    },
                    body: JSON.stringify({
                        fornecedor_id: Number(
                            avaliacaoForm.fornecedor_id
                        ),
                        empresa_id: Number(avaliacaoForm.empresa_id),
                        nota: Number(avaliacaoForm.nota),
                        comentario: avaliacaoForm.comentario
                    })
                }
            );
            const dados = await resposta.json();
            if (!resposta.ok) {
                throw new Error(
                    dados.message || dados.error || 'Erro ao salvar avaliação'
                );
            }

            setAvaliacaoSucesso('Avaliação salva com sucesso.');
            setAvaliacaoResumo(anterior => ({
                ...(anterior || {}),
                nota_media: dados.nota_geral,
                total_avaliacoes: anterior?.total_avaliacoes || 1
            }));
        } catch (erro) {
            setAvaliacaoErro(erro.message);
        } finally {
            setSalvandoAvaliacao(false);
        }
    };

'''
    modal_anchor = '''            {isModalOpen && (
                <ModalFornecedor 
                    isEditing={isEditing}
                    currentFornecedor={currentFornecedor}
                    formData={formData}
                    setFormData={setFormData}
                    modalTab={modalTab}
                    setModalTab={setModalTab}
                    chamadosFornecedor={chamadosFornecedor}
                    loadingChamados={loadingChamados}
                    orcamentosFornecedor={orcamentosFornecedor}
                    loadingOrcamentos={loadingOrcamentos}
                    tiposServico={tiposServico}
                    renderEmpresaOptions={renderEmpresaOptions}
                    canViewFornecedor={canViewFornecedor}
                    canViewPrestador={canViewPrestador}
                    handleSubmit={handleSubmit}
                    setIsModalOpen={setIsModalOpen}
                />
            )}
'''
    modal_new = modal_anchor + r'''
            {isAvaliacaoOpen && (
                <ModalAvaliacaoFornecedor
                    fornecedores={fornecedores}
                    empresas={empresas}
                    form={avaliacaoForm}
                    setForm={setAvaliacaoForm}
                    resumo={avaliacaoResumo}
                    erro={avaliacaoErro}
                    sucesso={avaliacaoSucesso}
                    salvando={salvandoAvaliacao}
                    onSubmit={salvarAvaliacaoFornecedor}
                    onClose={() => setIsAvaliacaoOpen(false)}
                />
            )}
'''
    component_anchor = "// COMPONENTE MODAL SEPARADO\n"
    component = r'''const ModalAvaliacaoFornecedor = ({
    fornecedores, empresas, form, setForm, resumo, erro, sucesso,
    salvando, onSubmit, onClose
}) => {
    const selecionarFornecedor = (valor) => {
        const fornecedor = fornecedores.find(
            item => String(item.id) === String(valor)
        );
        setForm(anterior => ({
            ...anterior,
            fornecedor_id: valor,
            empresa_id: fornecedor?.empresa_id
                ? String(fornecedor.empresa_id)
                : anterior.empresa_id,
            nota: 0,
            comentario: ''
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="bg-amber-500 text-white px-6 py-5 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <FaStar /> Avaliar fornecedor
                        </h2>
                        <p className="text-sm text-amber-100 mt-1">
                            Avaliação interna do módulo de Compras
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-full"
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="p-6 space-y-5">
                    {erro && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                            {erro}
                        </div>
                    )}
                    {sucesso && (
                        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-bold">
                            {sucesso}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                            Fornecedor ou prestador *
                        </label>
                        <select
                            required
                            value={form.fornecedor_id}
                            onChange={event => selecionarFornecedor(
                                event.target.value
                            )}
                            className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-amber-400"
                        >
                            <option value="">Selecione...</option>
                            {[...fornecedores]
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
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                            Clínica/empresa *
                        </label>
                        <select
                            required
                            value={form.empresa_id}
                            onChange={event => setForm(anterior => ({
                                ...anterior,
                                empresa_id: event.target.value,
                                nota: 0,
                                comentario: ''
                            }))}
                            className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-amber-400"
                        >
                            <option value="">Selecione...</option>
                            {empresas.map(empresa => (
                                <option key={empresa.id} value={empresa.id}>
                                    {empresa.nome}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Nota *
                        </label>
                        <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map(nota => (
                                <button
                                    type="button"
                                    key={nota}
                                    onClick={() => setForm(anterior => ({
                                        ...anterior,
                                        nota
                                    }))}
                                    className="p-1 hover:scale-110 transition-transform"
                                    title={`${nota} estrela${nota > 1 ? 's' : ''}`}
                                >
                                    <FaStar
                                        size={32}
                                        className={
                                            nota <= form.nota
                                                ? 'text-amber-400'
                                                : 'text-gray-200'
                                        }
                                    />
                                </button>
                            ))}
                            {form.nota > 0 && (
                                <span className="ml-2 font-bold text-gray-700">
                                    {form.nota}/5
                                </span>
                            )}
                        </div>
                        {resumo?.total_avaliacoes > 0 && (
                            <p className="text-xs text-gray-500 mt-2">
                                Média da clínica: {resumo.nota_media}/5 em{' '}
                                {resumo.total_avaliacoes} avaliação(ões)
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                            Comentário
                        </label>
                        <textarea
                            maxLength={2000}
                            rows={4}
                            value={form.comentario}
                            onChange={event => setForm(anterior => ({
                                ...anterior,
                                comentario: event.target.value
                            }))}
                            placeholder="Comentário opcional sobre o fornecedor..."
                            className="w-full p-3 border rounded-lg resize-none outline-none focus:ring-2 focus:ring-amber-400"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 border rounded-lg font-bold text-gray-600 hover:bg-gray-50"
                        >
                            Fechar
                        </button>
                        <button
                            type="submit"
                            disabled={salvando}
                            className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold disabled:opacity-50"
                        >
                            {salvando ? 'Salvando...' : 'Salvar avaliação'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

'''

    for name, anchor in (
        ("importação de ícones em Fornecedores.jsx", icon_old),
        ("estados de Fornecedores.jsx", state_anchor),
        ("permissão de prestadores", permission_anchor),
        ("handleOpenModal", handler_anchor),
        ("renderização do modal existente", modal_anchor),
        ("marcador do componente modal", component_anchor),
    ):
        if anchor not in updated[FORNECEDORES]:
            fail("{} não encontrada; nada foi alterado".format(name))

    updated[FORNECEDORES] = updated[FORNECEDORES].replace(
        icon_old,
        icon_new,
        1
    )
    updated[FORNECEDORES] = updated[FORNECEDORES].replace(
        state_anchor,
        state_new,
        1
    )
    updated[FORNECEDORES] = updated[FORNECEDORES].replace(
        permission_anchor,
        permission_new,
        1
    )
    updated[FORNECEDORES] = updated[FORNECEDORES].replace(
        handler_anchor,
        handlers + handler_anchor,
        1
    )
    updated[FORNECEDORES] = updated[FORNECEDORES].replace(
        modal_anchor,
        modal_new,
        1
    )
    updated[FORNECEDORES] = updated[FORNECEDORES].replace(
        component_anchor,
        component + component_anchor,
        1
    )


backups = {}
for path in (COMPRAS, FORNECEDORES, APP):
    backup = path.with_name(path.name + ".bak-avaliacao-" + STAMP)
    shutil.copy2(path, backup)
    backups[path] = backup
    print("Backup criado: {}".format(backup))


try:
    for path, content in updated.items():
        path.write_text(content, encoding="utf-8")

    result = subprocess.run(
        ["npm", "run", "build"],
        cwd=str(ROOT),
        text=True
    )
    if result.returncode != 0:
        raise RuntimeError("npm run build retornou erro")

except Exception as exc:
    for path, backup in backups.items():
        shutil.copy2(backup, path)
    print("ERRO: {}".format(exc))
    print("Arquivos restaurados automaticamente.")
    sys.exit(1)


print()
print("=" * 60)
print("AVALIAÇÃO DE FORNECEDOR — FRONTEND INSTALADO")
print("=" * 60)
print("Card adicionado ao módulo de Compras.")
print("Modal aberto automaticamente em /fornecedores?avaliar=1.")
print("Visibilidade controlada por compras_editar.")
print("Build de produção validado.")