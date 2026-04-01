import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    FaPlus, FaEdit, FaTrashAlt, FaFilter, FaEye, FaTag, 
    FaDollarSign, FaCalendarAlt, FaMapMarkerAlt, FaFileContract, 
    FaShoppingCart, FaTimes, FaBox, FaUser, FaPaperclip, FaCheckCircle,
    FaExclamationCircle, FaClock, FaInfoCircle, FaSearch, FaBuilding, 
    FaBolt, FaTools, FaQrcode, FaTruck, FaIndustry, FaLayerGroup,
    FaComments, FaHistory, FaSave, FaArrowRight, FaPlay, FaPause,
    FaStop, FaRedo, FaUndo, FaExpandArrowsAlt, FaCompressArrowsAlt,
    FaStar, FaStarHalf, FaPrint, FaDownload, FaShare, FaCopy,
    FaUserClock, FaUserCheck, FaCalendarDay, FaChartLine
} from 'react-icons/fa';
import { format, parseISO, differenceInHours, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEntity } from '../context/EntityContext';
import { useAuth } from '../context/AuthContext';

const Chamados = () => {
    const { selectedEntity } = useEntity();
    const { user } = useAuth();
    
    // Estados principais
    const [chamados, setAtivosChamados] = useState([]);
    const [fornecedores, setFornecedores] = useState([]);
    const [localizacoes, setLocalizacoes] = useState([]);
    const [contratos, setContratos] = useState([]);
    const [orcamentos, setOrcamentos] = useState([]);
    const [ativos, setAtivos] = useState([]);
    const [infraestruturas, setInfraestruturas] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    const [categorias, setCategorias] = useState([]);
    
    // Estados de filtros e busca
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Não Encerrados');
    const [empresaFilter, setEmpresaFilter] = useState('Todas');
    const [tipoFilter, setTipoFilter] = useState('Todos');
    const [prioridadeFilter, setPrioridadeFilter] = useState('Todas');
    const [dataFilter, setDataFilter] = useState('Todas');
    const [responsavelFilter, setResponsavelFilter] = useState('Todos');
    
    // Estados de interface
    const [viewMode, setViewMode] = useState('table');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentChamado, setCurrentChamado] = useState(null);
    const [selectedChamados, setSelectedChamados] = useState([]);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isAnexosModalOpen, setIsAnexosModalOpen] = useState(false);
    const [selectedAnexos, setSelectedAnexos] = useState([]);
    
    // Estados específicos para modal de visualização
    const [activeTab, setActiveTab] = useState('detalhes');
    const [comentarios, setComentarios] = useState([]);
    const [novoComentario, setNovoComentario] = useState('');
    const [historico, setHistorico] = useState([]);
    
    // Estados do formulário
    const [formData, setFormData] = useState({
        titulo: '', descricao: '', status: 'Aberto',
        empresa_id: '', fornecedor_id: '', localizacao_id: '', 
        contrato_id: '', orcamento_id: '', ativo_id: '', 
        infraestrutura_id: '', categoria_id: '',
        criticidade_informada: 'Média', criticidade_real: 'Média',
        valor_total: 0, anexos: [], tipo: 'maquinario',
        data_prevista: '', data_conclusao: '', responsavel_id: ''
    });
    
    const [uploading, setUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const API_BASE = window.location.origin.includes('5173') 
        ? `${window.location.protocol}//${window.location.hostname}:5002`
        : window.location.origin;
    const API_URL = `${API_BASE}/api`;

    const criticidades = ['Muito Baixa', 'Baixa', 'Média', 'Alta', 'Muito Alta'];
    const statusOptions = ['Aberto', 'Em Atendimento', 'Aguardando Cliente', 'Pausado', 'Concluído', 'Cancelado'];

    // ====== FUNÇÕES DO MODAL DE CRIAÇÃO/EDIÇÃO ======

    const handleOpenModal = (chamado = null) => {
        if (chamado) {
            setIsEditing(true);
            setCurrentChamado(chamado);
            setFormData({
                titulo: chamado.titulo || '',
                descricao: chamado.descricao || '',
                status: chamado.status || 'Aberto',
                empresa_id: chamado.empresa_id?.toString() || '',
                fornecedor_id: chamado.fornecedor_id?.toString() || '',
                localizacao_id: chamado.localizacao_id?.toString() || '',
                contrato_id: chamado.contrato_id?.toString() || '',
                orcamento_id: chamado.orcamento_id?.toString() || '',
                ativo_id: chamado.ativo_id?.toString() || '',
                infraestrutura_id: chamado.infraestrutura_id?.toString() || '',
                categoria_id: chamado.categoria_id?.toString() || '',
                criticidade_informada: chamado.criticidade_informada || 'Média',
                criticidade_real: chamado.criticidade_real || 'Média',
                valor_total: chamado.valor_total || 0,
                anexos: Array.isArray(chamado.anexos) ? chamado.anexos : (typeof chamado.anexos === 'string' ? JSON.parse(chamado.anexos) : []),
                tipo: chamado.tipo || 'maquinario'
            });
        } else {
            setIsEditing(false);
            setCurrentChamado(null);
            setFormData({
                titulo: '', descricao: '', status: 'Aberto',
                empresa_id: '', fornecedor_id: '', localizacao_id: '', 
                contrato_id: '', orcamento_id: '', ativo_id: '', 
                infraestrutura_id: '', categoria_id: '',
                criticidade_informada: 'Média', criticidade_real: 'Média',
                valor_total: 0, anexos: [], tipo: 'maquinario'
            });
        }
        setIsModalOpen(true);
    };

    const handleAtivoChange = (ativoId) => {
        if (!ativoId) {
            setFormData({ ...formData, ativo_id: '' });
            return;
        }

        const selectedAtivo = ativos.find(a => a.id.toString() === ativoId);
        if (selectedAtivo) {
            setFormData({
                ...formData,
                ativo_id: ativoId,
                empresa_id: selectedAtivo.empresa_id?.toString() || formData.empresa_id,
                localizacao_id: selectedAtivo.localizacao_id?.toString() || formData.localizacao_id,
                fornecedor_id: selectedAtivo.fornecedor_id?.toString() || formData.fornecedor_id,
                contrato_id: selectedAtivo.contrato_id?.toString() || formData.contrato_id,
                orcamento_id: selectedAtivo.orcamento_id?.toString() || formData.orcamento_id
            });
        } else {
            setFormData({ ...formData, ativo_id: ativoId });
        }
    };

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        setUploading(true);
        const newAnexos = [...formData.anexos];
        
        for (const file of files) {
            const fData = new FormData();
            fData.append('file', file);
            
            try {
                const res = await fetch(`${API_BASE}/api/upload`, { 
                    method: 'POST', 
                    body: fData 
                });
                
                if (res.ok) {
                    const data = await res.json();
                    newAnexos.push({
                        name: file.name,
                        filename: data.filename,
                        path: data.path,
                        url: data.url
                    });
                }
            } catch (err) {
                console.error('Upload error', err);
            }
        }
        
        setFormData({ ...formData, anexos: newAnexos });
        setUploading(false);
    };

    const removeAnexo = (index) => {
        const updated = formData.anexos.filter((_, i) => i !== index);
        setFormData({ ...formData, anexos: updated });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        
        const headers = { 'Content-Type': 'application/json' };
        if (user?.api_token) headers['X-API-Token'] = user.api_token;
        
        const url = isEditing ? `${API_URL}/chamados/${currentChamado.id}` : `${API_URL}/chamados`;
        const method = isEditing ? 'PUT' : 'POST';
        
        try {
            const payload = {
                ...formData,
                empresa_id: formData.empresa_id ? parseInt(formData.empresa_id) : null,
                fornecedor_id: formData.fornecedor_id ? parseInt(formData.fornecedor_id) : null,
                localizacao_id: formData.localizacao_id ? parseInt(formData.localizacao_id) : null,
                contrato_id: formData.contrato_id ? parseInt(formData.contrato_id) : null,
                orcamento_id: formData.orcamento_id ? parseInt(formData.orcamento_id) : null,
                ativo_id: formData.tipo === 'maquinario' && formData.ativo_id ? parseInt(formData.ativo_id) : null,
                infraestrutura_id: formData.tipo === 'infraestrutura' && formData.infraestrutura_id ? parseInt(formData.infraestrutura_id) : null,
                categoria_id: formData.categoria_id ? parseInt(formData.categoria_id) : null,
                anexos: formData.anexos
            };
            
            const res = await fetch(url, {
                method, 
                headers,
                body: JSON.stringify(payload)
            });
            
            if (res.ok) { 
                setIsModalOpen(false); 
                fetchData(); 
            } else {
                const error = await res.json();
                console.error('Error saving chamado:', error);
                alert('Erro ao salvar chamado: ' + (error.message || 'Erro desconhecido'));
            }
        } catch (err) { 
            console.error('Save error', err); 
            alert('Erro ao salvar chamado: ' + err.message);
        } finally { 
            setIsSaving(false); 
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Deseja realmente excluir este chamado?')) return;
        
        const headers = {};
        if (user?.api_token) headers['X-API-Token'] = user.api_token;
        
        try {
            const res = await fetch(`${API_URL}/chamados/${id}`, { method: 'DELETE', headers });
            if (res.ok) fetchData();
        } catch (err) { 
            console.error('Delete error', err); 
        }
    };

    const handleOpenAnexosModal = (anexos) => {
        setSelectedAnexos(anexos || []);
        setIsAnexosModalOpen(true);
    };

    const getAnexoHref = (path) => {
        if (!path) return '#';
        if (path.startsWith('http')) return path;
        return `${API_BASE}/${path}`;
    };

    // ====== RESTO DAS FUNÇÕES ======

    const calculateResponseTime = (createdAt, status) => {
        if (!createdAt) return null;
        const created = parseISO(createdAt);
        const now = new Date();
        const hours = differenceInHours(now, created);
        const days = differenceInDays(now, created);
        
        if (days > 0) return `${days}d ${hours % 24}h`;
        return `${hours}h`;
    };

    const getPriorityColor = (priority) => {
        const colors = {
            'Muito Baixa': 'bg-gray-100 text-gray-600 border-gray-200',
            'Baixa': 'bg-blue-100 text-blue-600 border-blue-200',
            'Média': 'bg-yellow-100 text-yellow-600 border-yellow-200',
            'Alta': 'bg-orange-100 text-orange-600 border-orange-200',
            'Muito Alta': 'bg-red-100 text-red-600 border-red-200'
        };
        return colors[priority] || colors['Média'];
    };

    const getStatusColor = (status) => {
        const colors = {
            'Aberto': 'bg-blue-100 text-blue-700 border-blue-200',
            'Em Atendimento': 'bg-amber-100 text-amber-700 border-amber-200',
            'Aguardando Cliente': 'bg-purple-100 text-purple-700 border-purple-200',
            'Pausado': 'bg-gray-100 text-gray-700 border-gray-200',
            'Concluído': 'bg-green-100 text-green-700 border-green-200',
            'Cancelado': 'bg-red-100 text-red-700 border-red-200'
        };
        return colors[status] || colors['Aberto'];
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value || 0);
    };

    const fetchData = useCallback(async () => {
        try {
            const headers = {};
            if (user?.api_token) {
                headers['X-API-Token'] = user.api_token;
            }

            let queryParams = '';
            if (user?.role === 'empresa_restrita' && user?.empresa_id) {
                queryParams = `?empresa_id=${user.empresa_id}`;
            } else if (selectedEntity && selectedEntity !== 'all') {
                queryParams = `?empresa_id=${selectedEntity}`;
            }

            const [c, f, l, con, o, a, infra, emp, cat] = await Promise.all([
                fetch(`${API_URL}/chamados${queryParams}`, { headers }),
                fetch(`${API_URL}/fornecedores${queryParams}`, { headers }),
                fetch(`${API_URL}/localizacoes${queryParams}`, { headers }),
                fetch(`${API_URL}/contratos${queryParams}`, { headers }),
                fetch(`${API_URL}/orcamentos${queryParams}`, { headers }),
                fetch(`${API_URL}/ativos${queryParams}`, { headers }),
                fetch(`${API_URL}/infraestruturas${queryParams}`, { headers }),
                fetch(`${API_URL}/empresas`, { headers }),
                fetch(`${API_URL}/categorias-chamado`, { headers })
            ]);
            
            if (c.ok) {
                const data = await c.json();
                setAtivosChamados(Array.isArray(data.chamados) ? data.chamados : (Array.isArray(data) ? data : []));
            }
            if (f.ok) setFornecedores(await f.json());
            if (l.ok) setLocalizacoes(await l.json());
            if (con.ok) setContratos(await con.json());
            if (o.ok) setOrcamentos(await o.json());
            if (a.ok) setAtivos(await a.json());
            if (infra.ok) {
                const infraData = await infra.json();
                setInfraestruturas(Array.isArray(infraData.infraestruturas) ? infraData.infraestruturas : (Array.isArray(infraData) ? infraData : []));
            }
            if (emp.ok) setEmpresas(await emp.json());
            if (cat.ok) setCategorias(await cat.json());
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        }
    }, [user?.api_token, user?.role, user?.empresa_id, selectedEntity, API_URL]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleViewChamado = (chamado) => {
        setCurrentChamado(chamado);
        setIsViewModalOpen(true);
        setActiveTab('detalhes');
        loadChamadoDetails(chamado.id);
    };

    const loadChamadoDetails = async (chamadoId) => {
        try {
            const headers = {};
            if (user?.api_token) headers['X-API-Token'] = user.api_token;
            
            setComentarios([]);
            setHistorico([]);
        } catch (error) {
            console.error("Erro ao carregar detalhes do chamado:", error);
        }
    };

    const handleAddComentario = async () => {
        if (!novoComentario.trim()) return;
        
        try {
            const novoComent = {
                id: Date.now(),
                autor: user.username,
                texto: novoComentario,
                data: new Date().toISOString()
            };
            setComentarios([...comentarios, novoComent]);
            setNovoComentario('');
        } catch (error) {
            console.error("Erro ao adicionar comentário:", error);
        }
    };

    const handleStatusChange = async (chamadoId, novoStatus) => {
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (user?.api_token) headers['X-API-Token'] = user.api_token;
            
            const res = await fetch(`${API_URL}/chamados/${chamadoId}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ status: novoStatus })
            });
            
            if (res.ok) {
                fetchData();
                if (currentChamado && currentChamado.id === chamadoId) {
                    setCurrentChamado({ ...currentChamado, status: novoStatus });
                }
            }
        } catch (error) {
            console.error("Erro ao alterar status:", error);
        }
    };

    const filteredChamados = useMemo(() => {
        return chamados.filter(c => {
            const matchesSearch = c.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 c.id?.toString().includes(searchTerm) ||
                                 c.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = statusFilter === 'Todos' || 
                                 (statusFilter === 'Não Encerrados' ? 
                                  !['Concluído', 'Cancelado'].includes(c.status) : 
                                  c.status === statusFilter);
            
            const matchesEmpresa = empresaFilter === 'Todas' || c.empresa_id?.toString() === empresaFilter;
            const matchesTipo = tipoFilter === 'Todos' || c.tipo === tipoFilter;
            const matchesPrioridade = prioridadeFilter === 'Todas' || c.criticidade_real === prioridadeFilter;
            
            return matchesSearch && matchesStatus && matchesEmpresa && matchesTipo && matchesPrioridade;
        });
    }, [chamados, searchTerm, statusFilter, empresaFilter, tipoFilter, prioridadeFilter]);

    const filteredAtivosForm = useMemo(() => {
        if (!formData.empresa_id) return ativos;
        return ativos.filter(a => a.empresa_id?.toString() === formData.empresa_id);
    }, [ativos, formData.empresa_id]);

    const filteredInfraForm = useMemo(() => {
        if (!formData.empresa_id) return infraestruturas;
        return infraestruturas.filter(i => i.empresa_id?.toString() === formData.empresa_id);
    }, [infraestruturas, formData.empresa_id]);

    const filteredLocalizacoesForm = useMemo(() => {
        if (!formData.empresa_id) return localizacoes;
        return localizacoes.filter(l => l.empresa_id?.toString() === formData.empresa_id);
    }, [localizacoes, formData.empresa_id]);

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        try {
            const date = parseISO(dateStr);
            return format(date, "dd/MM/yy HH:mm", { locale: ptBR });
        } catch (e) { return '-'; }
    };

    const TipoBadge = ({ tipo }) => {
        if (tipo === 'infraestrutura') {
            return (
                <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <FaLayerGroup size={8} /> Infra
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase bg-blue-50 text-blue-600 border border-blue-100">
                <FaIndustry size={8} /> Maq.
            </span>
        );
    };

    const ChamadoRow = ({ chamado }) => {
        const [expanded, setExpanded] = useState(false);
        
        return (
            <>
                <tr 
                    className={`hover:bg-slate-50/50 transition-all cursor-pointer border-l-4 ${
                        chamado.criticidade_real === 'Muito Alta' ? 'border-red-500' :
                        chamado.criticidade_real === 'Alta' ? 'border-orange-500' :
                        chamado.criticidade_real === 'Média' ? 'border-yellow-500' :
                        chamado.criticidade_real === 'Baixa' ? 'border-blue-500' : 'border-gray-300'
                    }`}
                    onClick={() => setExpanded(!expanded)}
                >
                    <td className="p-4">
                        <div className="flex items-center gap-3">
                            <input 
                                type="checkbox" 
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setSelectedChamados([...selectedChamados, chamado.id]);
                                    } else {
                                        setSelectedChamados(selectedChamados.filter(id => id !== chamado.id));
                                    }
                                }}
                                className="rounded border-gray-300"
                            />
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-primary">#{chamado.id}</span>
                                    {chamado.criticidade_real === 'Muito Alta' && (
                                        <FaBolt className="text-red-500 animate-pulse" size={12} />
                                    )}
                                </div>
                                <span className="text-sm font-bold text-slate-700 max-w-[200px] truncate">
                                    {chamado.titulo}
                                </span>
                                <span className="text-[10px] text-slate-400 uppercase font-bold">
                                    {chamado.empresa_nome || 'Empresa não vinculada'}
                                </span>
                            </div>
                        </div>
                    </td>
                    
                    <td className="p-4">
                        <div className="flex flex-col gap-2">
                            <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase border ${getStatusColor(chamado.status)}`}>
                                {chamado.status}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${getPriorityColor(chamado.criticidade_real)}`}>
                                {chamado.criticidade_real}
                            </span>
                        </div>
                    </td>
                    
                    <td className="p-4">
                        <div className="flex flex-col gap-1">
                            <TipoBadge tipo={chamado.tipo} />
                            {chamado.tipo === 'infraestrutura' ? (
                                <span className="text-sm font-bold text-slate-700 flex items-center gap-1">
                                    <FaLayerGroup className="text-indigo-400" size={12} /> 
                                    {chamado.infraestrutura_nome || 'Sem Infraestrutura'}
                                </span>
                            ) : (
                                <span className="text-sm font-bold text-slate-700 flex items-center gap-1">
                                    <FaBox className="text-primary/60" size={12} /> 
                                    {chamado.ativo_nome || 'Sem Ativo'}
                                </span>
                            )}
                            <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                                <FaTruck className="text-slate-300" size={10} /> 
                                {chamado.fornecedor_nome || 'Sem Fornecedor'}
                            </span>
                        </div>
                    </td>
                    
                    <td className="p-4">
                        <div className="flex flex-col text-[11px]">
                            <span className="text-slate-400 font-bold uppercase">Abertura</span>
                            <span className="text-slate-600 font-medium">
                                {formatDate(chamado.created_at)}
                            </span>
                            {chamado.data_solucao && (
                                <>
                                    <span className="text-green-500 font-bold uppercase mt-1">Solução</span>
                                    <span className="text-green-600 font-medium">{formatDate(chamado.data_solucao)}</span>
                                </>
                            )}
                        </div>
                    </td>
                    
                    <td className="p-4">
                        <span className="text-sm font-bold text-slate-700">
                            {formatCurrency(chamado.valor_total)}
                        </span>
                    </td>
                    
                    <td className="p-4">
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            {chamado.anexos && chamado.anexos.length > 0 && (
                                <button 
                                    onClick={() => handleOpenAnexosModal(chamado.anexos)}
                                    className="p-2 text-primary hover:bg-primary/5 rounded-lg transition-all" 
                                    title="Ver Anexos"
                                >
                                    <FaPaperclip size={16} />
                                </button>
                            )}
                            <button 
                                onClick={() => handleViewChamado(chamado)}
                                className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                title="Ver Detalhes"
                            >
                                <FaEye size={14} />
                            </button>
                            <button 
                                onClick={() => handleOpenModal(chamado)}
                                className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                                title="Editar"
                            >
                                <FaEdit size={14} />
                            </button>
                            <button 
                                onClick={() => handleDelete(chamado.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                                <FaTrashAlt size={16} />
                            </button>
                        </div>
                    </td>
                </tr>
                
                {expanded && (
                    <tr className="bg-slate-50/50">
                        <td colSpan={6} className="p-4">
                            <div className="bg-white rounded-lg p-4 border border-slate-200">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <strong>Descrição:</strong>
                                        <p className="text-slate-600 mt-1">
                                            {chamado.descricao || 'Sem descrição'}
                                        </p>
                                    </div>
                                    <div>
                                        <strong>Categoria:</strong>
                                        <p className="text-slate-600 mt-1">
                                            {chamado.categoria_nome || 'Sem categoria'}
                                        </p>
                                    </div>
                                    <div>
                                        <strong>Localização:</strong>
                                        <p className="text-slate-600 mt-1">
                                            {chamado.localizacao_nome || 'Não definida'}
                                        </p>
                                    </div>
                                </div>
                                
                                {chamado.anexos && chamado.anexos.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-slate-200">
                                        <strong className="text-sm">Anexos:</strong>
                                        <div className="flex gap-2 mt-1">
                                            {chamado.anexos.map((anexo, idx) => (
                                                <a 
                                                    key={idx}
                                                    href={getAnexoHref(anexo.path || anexo.url)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition-colors"
                                                >
                                                    📎 {anexo.name || anexo.filename}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </td>
                    </tr>
                )}
            </>
        );
    };

    const showEmpresaFilter = user?.role !== 'empresa_restrita';

    return (
        <div className={`p-4 md:p-8 space-y-6 max-w-full mx-auto transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50 bg-white overflow-auto' : 'max-w-7xl'}`}>
            {/* Header aprimorado */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                            <FaTools className="text-primary" /> 
                            Gestão de Chamados
                            {user?.role === 'empresa_restrita' && (
                                <span className="text-sm bg-orange-100 text-orange-600 px-3 py-1 rounded-full font-medium">
                                    {user.empresa_nome}
                                </span>
                            )}
                        </h1>
                        <p className="text-slate-500 text-sm">
                            {filteredChamados.length} chamado(s) encontrado(s)
                        </p>
                    </div>
                    <button 
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all"
                        title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                    >
                        {isFullscreen ? <FaCompressArrowsAlt /> : <FaExpandArrowsAlt />}
                    </button>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="flex rounded-lg border border-slate-200 bg-white">
                        <button 
                            onClick={() => setViewMode('table')}
                            className={`px-3 py-2 text-sm font-medium rounded-l-lg transition-all ${
                                viewMode === 'table' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            Tabela
                        </button>
                        <button 
                            onClick={() => setViewMode('kanban')}
                            className={`px-3 py-2 text-sm font-medium transition-all ${
                                viewMode === 'kanban' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            Kanban
                        </button>
                        <button 
                            onClick={() => setViewMode('timeline')}
                            className={`px-3 py-2 text-sm font-medium rounded-r-lg transition-all ${
                                viewMode === 'timeline' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            Timeline
                        </button>
                    </div>
                    
                    <button 
                        onClick={() => handleOpenModal()} 
                        className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
                    >
                        <FaPlus /> Novo Chamado
                    </button>
                </div>
            </div>

            {/* Filtros avançados */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    <div className="lg:col-span-2 relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar por título, ID ou descrição..." 
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                    </div>
                    
                    <select 
                        className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium" 
                        value={statusFilter} 
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="Não Encerrados">Não Encerrados</option>
                        <option value="Todos">Todos os Status</option>
                        {statusOptions.map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                    
                    <select 
                        className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium" 
                        value={prioridadeFilter} 
                        onChange={(e) => setPrioridadeFilter(e.target.value)}
                    >
                        <option value="Todas">Todas Prioridades</option>
                        {criticidades.map(crit => (
                            <option key={crit} value={crit}>{crit}</option>
                        ))}
                    </select>
                    
                    <select 
                        className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium" 
                        value={tipoFilter} 
                        onChange={(e) => setTipoFilter(e.target.value)}
                    >
                        <option value="Todos">Todos os Tipos</option>
                        <option value="maquinario">Maquinário</option>
                        <option value="infraestrutura">Infraestrutura</option>
                    </select>
                    
                    {showEmpresaFilter && (
                        <select 
                            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium" 
                            value={empresaFilter} 
                            onChange={(e) => setEmpresaFilter(e.target.value)}
                        >
                            <option value="Todas">Todas as Empresas</option>
                            {empresas.map(e => (
                                <option key={e.id} value={e.id.toString()}>{e.nome}</option>
                            ))}
                        </select>
                    )}
                </div>
                
                {selectedChamados.length > 0 && (
                    <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-primary">
                                {selectedChamados.length} chamado(s) selecionado(s)
                            </span>
                            <div className="flex gap-2">
                                <button className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors">
                                    Marcar como Concluído
                                </button>
                                <button className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors">
                                    Alterar Prioridade
                                </button>
                                <button className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                                    Atribuir Responsável
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabela melhorada */}
            {viewMode === 'table' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                                    <th className="p-4 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="checkbox" 
                                                className="rounded border-gray-300"
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedChamados(filteredChamados.map(c => c.id));
                                                    } else {
                                                        setSelectedChamados([]);
                                                    }
                                                }}
                                            />
                                            ID / Título
                                        </div>
                                    </th>
                                    <th className="p-4 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Status / Prioridade</th>
                                    <th className="p-4 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Tipo / Item</th>
                                    <th className="p-4 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Datas</th>
                                    <th className="p-4 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Valor</th>
                                    <th className="p-4 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredChamados.map((chamado) => (
                                    <ChamadoRow key={chamado.id} chamado={chamado} />
                                ))}
                                {filteredChamados.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-slate-400">
                                            <FaTools className="mx-auto mb-3 text-slate-200" size={32} />
                                            <p className="font-medium">Nenhum chamado encontrado</p>
                                            <p className="text-sm mt-1">Tente ajustar os filtros ou abrir um novo chamado</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal de Anexos */}
            {isAnexosModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><FaPaperclip className="text-primary" /> Anexos do Chamado</h2>
                            <button onClick={() => setIsAnexosModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><FaTimes /></button>
                        </div>
                        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
                            {selectedAnexos.map((anexo, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-primary/30 transition-all">
                                    <div className="flex items-center gap-3 truncate">
                                        <div className="p-3 bg-white rounded-xl shadow-sm"><FaPaperclip className="text-primary" /></div>
                                        <span className="text-sm font-bold text-slate-700 truncate">{anexo.name || anexo.filename}</span>
                                    </div>
                                    <button onClick={() => window.open(getAnexoHref(anexo.path || anexo.url), '_blank')} className="p-2 bg-white text-primary hover:bg-primary hover:text-white rounded-xl shadow-sm transition-all"><FaEye size={18} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Cadastro/Edição - FUNCIONAL AGORA! */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-800">{isEditing ? `Editar Chamado #${currentChamado.id}` : 'Abrir Novo Chamado'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><FaTimes /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8">
                            {/* TIPO DE CHAMADO */}
                            <div className="mb-8 border-2 border-blue-400 rounded-xl p-4 bg-blue-50">
                                <label className="block text-sm font-bold text-gray-700 mb-3">TIPO DE CHAMADO *</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.tipo === 'maquinario' ? 'border-blue-600 bg-blue-100' : 'border-gray-300 bg-white hover:border-blue-300'}`}>
                                        <input 
                                            type="radio" 
                                            value="maquinario" 
                                            checked={formData.tipo === 'maquinario'}
                                            onChange={(e) => setFormData({...formData, tipo: e.target.value, ativo_id: '', infraestrutura_id: ''})}
                                            className="mr-2"
                                        />
                                        <span className="font-bold"><FaIndustry className="inline mr-1 text-blue-600" /> Maquinário</span>
                                    </label>
                                    <label className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.tipo === 'infraestrutura' ? 'border-indigo-600 bg-indigo-100' : 'border-gray-300 bg-white hover:border-indigo-300'}`}>
                                        <input 
                                            type="radio" 
                                            value="infraestrutura" 
                                            checked={formData.tipo === 'infraestrutura'}
                                            onChange={(e) => setFormData({...formData, tipo: e.target.value, ativo_id: '', infraestrutura_id: ''})}
                                            className="mr-2"
                                        />
                                        <span className="font-bold"><FaLayerGroup className="inline mr-1 text-indigo-600" /> Infraestrutura</span>
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Informações do Problema</h3>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-600 uppercase ml-1">Título do Chamado *</label>
                                            <input type="text" required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all" placeholder="Ex: Ar condicionado não liga" value={formData.titulo} onChange={(e) => setFormData({...formData, titulo: e.target.value})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-600 uppercase ml-1">Descrição Detalhada</label>
                                            <textarea rows="4" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none" placeholder="Descreva o problema..." value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})}></textarea>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-600 uppercase ml-1">Status</label>
                                                <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                                                    {statusOptions.map(status => (
                                                        <option key={status} value={status}>{status}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-600 uppercase ml-1">Criticidade Real</label>
                                                <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={formData.criticidade_real} onChange={(e) => setFormData({...formData, criticidade_real: e.target.value})}>
                                                    {criticidades.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-600 uppercase ml-1">Criticidade Informada (QR)</label>
                                            <input type="text" disabled className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl outline-none text-slate-500 cursor-not-allowed" value={formData.criticidade_informada} />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Vínculos e Ativos</h3>
                                        
                                        {formData.tipo === 'maquinario' ? (
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-600 uppercase ml-1 flex items-center gap-1">
                                                    <FaIndustry className="text-blue-500" /> Equipamento / Ativo
                                                </label>
                                                <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={formData.ativo_id} onChange={(e) => handleAtivoChange(e.target.value)}>
                                                    <option value="">Selecione um Ativo (Opcional)</option>
                                                    {filteredAtivosForm.map(a => <option key={a.id} value={a.id.toString()}>{a.nome} {a.numero_serie ? `(S/N: ${a.numero_serie})` : ''}</option>)}
                                                </select>
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-600 uppercase ml-1 flex items-center gap-1">
                                                    <FaLayerGroup className="text-indigo-500" /> Item de Infraestrutura
                                                </label>
                                                <select className="w-full px-4 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-300 transition-all" value={formData.infraestrutura_id} onChange={(e) => setFormData({...formData, infraestrutura_id: e.target.value})}>
                                                    <option value="">Selecione uma Infraestrutura (Opcional)</option>
                                                    {filteredInfraForm.map(i => <option key={i.id} value={i.id.toString()}>{i.nome}</option>)}
                                                </select>
                                            </div>
                                        )}

                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-600 uppercase ml-1">Empresa / Clínica *</label>
                                            <select required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={formData.empresa_id} onChange={(e) => setFormData({...formData, empresa_id: e.target.value})}>
                                                <option value="">Selecione uma Empresa</option>
                                                {empresas.map(e => <option key={e.id} value={e.id.toString()}>{e.nome}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-600 uppercase ml-1">Localização Interna</label>
                                            <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={formData.localizacao_id} onChange={(e) => setFormData({...formData, localizacao_id: e.target.value})}>
                                                <option value="">Selecione um Local (Opcional)</option>
                                                {filteredLocalizacoesForm.map(l => <option key={l.id} value={l.id.toString()}>{l.nome}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-600 uppercase ml-1">Categoria do Chamado</label>
                                            <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={formData.categoria_id} onChange={(e) => setFormData({...formData, categoria_id: e.target.value})}>
                                                <option value="">Selecione uma Categoria</option>
                                                {categorias.map(c => <option key={c.id} value={c.id.toString()}>{c.nome}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Custos e Fornecedores</h3>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-600 uppercase ml-1">Valor Total do Serviço (R$)</label>
                                            <input type="number" step="0.01" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={formData.valor_total} onChange={(e) => setFormData({...formData, valor_total: parseFloat(e.target.value) || 0})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-600 uppercase ml-1">Fornecedor Responsável</label>
                                            <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={formData.fornecedor_id} onChange={(e) => setFormData({...formData, fornecedor_id: e.target.value})}>
                                                <option value="">Selecione um Fornecedor</option>
                                                {fornecedores.map(f => <option key={f.id} value={f.id.toString()}>{f.nome}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-600 uppercase ml-1">Contrato Vinculado</label>
                                            <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={formData.contrato_id} onChange={(e) => setFormData({...formData, contrato_id: e.target.value})}>
                                                <option value="">Selecione um Contrato</option>
                                                {contratos.map(c => <option key={c.id} value={c.id.toString()}>{c.numero || c.nome}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-600 uppercase ml-1">Orçamento Vinculado</label>
                                            <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={formData.orcamento_id} onChange={(e) => setFormData({...formData, orcamento_id: e.target.value})}>
                                                <option value="">Selecione um Orçamento</option>
                                                {orcamentos.map(o => <option key={o.id} value={o.id.toString()}>{o.numero || o.titulo}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Anexos e Documentos</h3>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="relative group">
                                                <input type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleFileUpload} disabled={uploading} />
                                                <div className="h-32 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 bg-slate-50 group-hover:bg-primary/5 group-hover:border-primary/30 transition-all">
                                                    <div className="p-3 bg-white rounded-xl shadow-sm text-slate-400 group-hover:text-primary transition-colors"><FaPaperclip size={20} /></div>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{uploading ? 'Enviando...' : 'Clique ou arraste arquivos'}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                                {formData.anexos.map((file, idx) => (
                                                    <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 group animate-in zoom-in duration-200">
                                                        <div className="flex items-center gap-3 truncate">
                                                            <FaPaperclip className="text-primary shrink-0" size={12} />
                                                            <span className="text-xs font-bold text-slate-600 truncate">{file.name}</span>
                                                        </div>
                                                        <button type="button" onClick={() => removeAnexo(idx)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><FaTimes size={12} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 flex justify-end gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all">Cancelar</button>
                                <button type="submit" disabled={isSaving} className="px-8 py-2.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50">{isSaving ? 'Salvando...' : 'Salvar Chamado'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de visualização detalhada */}
            {isViewModalOpen && currentChamado && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header do modal */}
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-2xl">
                                    <FaTools className="text-primary" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">
                                        Chamado #{currentChamado.id} - {currentChamado.titulo}
                                    </h2>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${getStatusColor(currentChamado.status)}`}>
                                            {currentChamado.status}
                                        </span>
                                        <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${getPriorityColor(currentChamado.criticidade_real)}`}>
                                            {currentChamado.criticidade_real}
                                        </span>
                                        <span className="text-xs text-slate-500">
                                            📅 {format(parseISO(currentChamado.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all">
                                    <FaPrint size={16} />
                                </button>
                                <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all">
                                    <FaShare size={16} />
                                </button>
                                <button 
                                    onClick={() => setIsViewModalOpen(false)}
                                    className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all"
                                >
                                    <FaTimes size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-200 bg-slate-50">
                            {['detalhes', 'comentarios', 'historico', 'anexos'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-6 py-3 text-sm font-medium capitalize transition-all ${
                                        activeTab === tab 
                                            ? 'text-primary border-b-2 border-primary bg-white' 
                                            : 'text-slate-600 hover:text-slate-800'
                                    }`}
                                >
                                    {tab === 'detalhes' ? 'Detalhes' : 
                                     tab === 'comentarios' ? 'Comentários' :
                                     tab === 'historico' ? 'Histórico' : 'Anexos'}
                                </button>
                            ))}
                        </div>

                        {/* Conteúdo das tabs */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {activeTab === 'detalhes' && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800 mb-4">Informações Gerais</h3>
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-500 uppercase">ID</label>
                                                        <p className="text-sm font-medium text-slate-700">#{currentChamado.id}</p>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-500 uppercase">Tipo</label>
                                                        <p className="text-sm font-medium text-slate-700 capitalize">{currentChamado.tipo}</p>
                                                    </div>
                                                </div>
                                                
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase">Título</label>
                                                    <p className="text-sm font-medium text-slate-700">{currentChamado.titulo}</p>
                                                </div>
                                                
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase">Descrição</label>
                                                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                                                        {currentChamado.descricao || 'Sem descrição fornecida'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800 mb-4">Status e Prioridade</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase">Status Atual</label>
                                                    <div className="mt-1">
                                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(currentChamado.status)}`}>
                                                            {currentChamado.status}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase">Criticidade</label>
                                                    <div className="mt-1">
                                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${getPriorityColor(currentChamado.criticidade_real)}`}>
                                                            {currentChamado.criticidade_real}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800 mb-4">Vínculos</h3>
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                                    <FaBuilding className="text-slate-400" />
                                                    <div>
                                                        <span className="text-xs font-bold text-slate-500 uppercase">Empresa</span>
                                                        <p className="text-sm font-medium">{currentChamado.empresa_nome || 'Não vinculada'}</p>
                                                    </div>
                                                </div>
                                                
                                                {currentChamado.tipo === 'infraestrutura' ? (
                                                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                                        <FaLayerGroup className="text-indigo-400" />
                                                        <div>
                                                            <span className="text-xs font-bold text-slate-500 uppercase">Infraestrutura</span>
                                                            <p className="text-sm font-medium">{currentChamado.infraestrutura_nome || 'Não vinculada'}</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                                        <FaBox className="text-primary/60" />
                                                        <div>
                                                            <span className="text-xs font-bold text-slate-500 uppercase">Ativo</span>
                                                            <p className="text-sm font-medium">{currentChamado.ativo_nome || 'Não vinculado'}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                                    <FaTruck className="text-slate-400" />
                                                    <div>
                                                        <span className="text-xs font-bold text-slate-500 uppercase">Fornecedor</span>
                                                        <p className="text-sm font-medium">{currentChamado.fornecedor_nome || 'Não atribuído'}</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                                    <FaDollarSign className="text-green-400" />
                                                    <div>
                                                        <span className="text-xs font-bold text-slate-500 uppercase">Valor</span>
                                                        <p className="text-sm font-medium">{formatCurrency(currentChamado.valor_total)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800 mb-4">Cronologia</h3>
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                                    <FaClock className="text-blue-500" />
                                                    <div>
                                                        <span className="text-xs font-bold text-blue-600 uppercase">Aberto em</span>
                                                        <p className="text-sm font-medium text-blue-700">
                                                            {format(parseISO(currentChamado.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                {currentChamado.data_solucao && (
                                                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                                        <FaCheckCircle className="text-green-500" />
                                                        <div>
                                                            <span className="text-xs font-bold text-green-600 uppercase">Concluído em</span>
                                                            <p className="text-sm font-medium text-green-700">
                                                                {format(parseISO(currentChamado.data_solucao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'comentarios' && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-slate-800">Comentários</h3>
                                        <span className="text-sm text-slate-500">{comentarios.length} comentário(s)</span>
                                    </div>
                                    
                                    <div className="space-y-4 max-h-[400px] overflow-y-auto">
                                        {comentarios.length === 0 ? (
                                            <div className="text-center py-8 text-slate-400">
                                                <FaComments size={32} className="mx-auto mb-2" />
                                                <p>Nenhum comentário ainda</p>
                                            </div>
                                        ) : (
                                            comentarios.map((comentario) => (
                                                <div key={comentario.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                                                                {comentario.autor.charAt(0).toUpperCase()}
                                                            </div>
                                                            <span className="font-medium text-slate-700">{comentario.autor}</span>
                                                        </div>
                                                        <span className="text-xs text-slate-500">
                                                            {format(parseISO(comentario.data), "dd/MM HH:mm", { locale: ptBR })}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-600">{comentario.texto}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    
                                    <div className="border-t pt-4">
                                        <div className="flex gap-3">
                                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                                                {user.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1">
                                                <textarea
                                                    value={novoComentario}
                                                    onChange={(e) => setNovoComentario(e.target.value)}
                                                    placeholder="Adicionar um comentário..."
                                                    rows="3"
                                                    className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                                                />
                                                <div className="flex justify-end mt-2">
                                                    <button
                                                        onClick={handleAddComentario}
                                                        disabled={!novoComentario.trim()}
                                                        className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                    >
                                                        Comentar
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'historico' && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-slate-800">Histórico de Alterações</h3>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        {historico.length === 0 ? (
                                            <div className="text-center py-8 text-slate-400">
                                                <FaHistory size={32} className="mx-auto mb-2" />
                                                <p>Nenhuma alteração registrada</p>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200"></div>
                                                {historico.map((evento, index) => (
                                                    <div key={index} className="relative flex items-center gap-4 pb-6">
                                                        <div className="w-8 h-8 bg-white border-2 border-primary rounded-full flex items-center justify-center relative z-10">
                                                            <FaClock className="text-primary" size={12} />
                                                        </div>
                                                        <div className="flex-1 bg-slate-50 p-4 rounded-lg border border-slate-200">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="font-medium text-slate-700">{evento.acao}</span>
                                                                <span className="text-xs text-slate-500">{evento.data}</span>
                                                            </div>
                                                            <p className="text-sm text-slate-600">{evento.detalhes}</p>
                                                            <span className="text-xs text-slate-500">por {evento.usuario}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'anexos' && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-slate-800">Anexos</h3>
                                        <span className="text-sm text-slate-500">
                                            {currentChamado.anexos?.length || 0} arquivo(s)
                                        </span>
                                    </div>
                                    
                                    {(!currentChamado.anexos || currentChamado.anexos.length === 0) ? (
                                        <div className="text-center py-8 text-slate-400">
                                            <FaPaperclip size={32} className="mx-auto mb-2" />
                                            <p>Nenhum anexo encontrado</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {currentChamado.anexos.map((anexo, index) => (
                                                <div key={index} className="bg-slate-50 p-4 rounded-lg border border-slate-200 hover:border-primary/30 transition-all group">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className="p-3 bg-white rounded-lg shadow-sm group-hover:shadow-md transition-all">
                                                            <FaPaperclip className="text-primary" size={20} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-slate-700 truncate">
                                                                {anexo.name || anexo.filename}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                Anexado em {format(parseISO(currentChamado.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => window.open(getAnexoHref(anexo.path || anexo.url), '_blank')}
                                                            className="flex-1 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <FaEye size={12} /> Ver
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const link = document.createElement('a');
                                                                link.href = getAnexoHref(anexo.path || anexo.url);
                                                                link.download = anexo.name || anexo.filename;
                                                                link.click();
                                                            }}
                                                            className="px-3 py-2 bg-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-300 transition-all"
                                                        >
                                                            <FaDownload size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer com ações */}
                        <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-slate-600">Alterar status:</span>
                                <div className="flex gap-1">
                                    {statusOptions.filter(s => s !== currentChamado.status).slice(0, 3).map(status => (
                                        <button
                                            key={status}
                                            onClick={() => handleStatusChange(currentChamado.id, status)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${getStatusColor(status).replace('border-', 'border-2 border-')}`}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => {
                                        setIsViewModalOpen(false);
                                        handleOpenModal(currentChamado);
                                    }}
                                    className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-all flex items-center gap-2"
                                >
                                    <FaEdit size={14} /> Editar
                                </button>
                                <button 
                                    onClick={() => setIsViewModalOpen(false)}
                                    className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-300 transition-all"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chamados;
