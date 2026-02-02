import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  FaPlus, FaEdit, FaTrashAlt, FaSearch, FaFileInvoice, FaBuilding,
  FaTimes, FaPaperclip, FaDownload, FaDollarSign, FaCheckCircle, FaUser, FaCalendarAlt, FaRegFileAlt
} from 'react-icons/fa';

/*
  Orcamentos.jsx
  - Removed the small eye icon in the table's attachments column (only the paperclip remains).
  - When the attachments (paperclip) are clicked, the attachments modal opens AND the page behind it is blurred,
    same behavior as the "Novo" modal (applies blur when either modal is open).
  - Keeps attachments viewer layout as requested.
*/

const prettyBytes = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(val >= 100 ? 0 : 1)} ${units[i]}`;
};

import { useEntity } from '../context/EntityContext';
import { useAuth } from '../context/AuthContext';

const Orcamentos = () => {
  const { selectedEntity } = useEntity();
  const { user } = useAuth();
  const [orcamentos, setOrcamentos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [localizacoes, setLocalizacoes] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [empresaFilter, setEmpresaFilter] = useState('');
  const [localizacaoFilter, setLocalizacaoFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewingAttachments, setIsViewingAttachments] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentOrcamento, setCurrentOrcamento] = useState(null);

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    numero: '',
    titulo: '',
    descricao: '',
    valor_total: '',
    data_inicial: '',
    data_final: '',
    data_validade: '',
    status: 'Pendente',
    empresa_id: '',
    localizacao_id: '',
    fornecedor_id: '',
    anexos: []
  });

  const API_URL = import.meta.env.DEV ? 'http://192.168.2.70:5002/api' : '/api';
  const BACKEND_URL = import.meta.env.DEV ? 'http://192.168.2.70:5002' : '';

  const fetchData = useCallback(async () => {
    try {
      const headers = {};
      if (user?.api_token) {
        headers['X-API-Token'] = user.api_token;
      }

      const queryParams = selectedEntity !== 'all' ? `?empresa_id=${selectedEntity}` : '';

      const [o, e, l, f] = await Promise.all([
        fetch(`${API_URL}/orcamentos/${queryParams}`, { headers }).then(res => res.ok ? res.json() : []),
        fetch(`${API_URL}/empresas/`, { headers }).then(res => res.ok ? res.json() : []),
        fetch(`${API_URL}/localizacoes/${queryParams}`, { headers }).then(res => res.ok ? res.json() : []),
        fetch(`${API_URL}/fornecedores/${queryParams}`, { headers }).then(res => res.ok ? res.json() : [])
      ]);
      setOrcamentos(o || []);
      setEmpresas(e || []);
      setLocalizacoes(l || []);
      setFornecedores(f || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  }, [API_URL]);

  useEffect(() => { fetchData(); }, [fetchData, selectedEntity]);

  const buildEmpresaHierarchy = useCallback((empresaId) => {
    if (!empresaId || !empresas.length) return '';
    const empresa = empresas.find(e => Number(e.id) === Number(empresaId));
    if (!empresa) return '';
    let hierarchy = empresa.nome;
    let currentParentId = empresa.parent_id;
    while (currentParentId) {
      const parent = empresas.find(e => Number(e.id) === Number(currentParentId));
      if (parent) {
        hierarchy = `${parent.nome} > ${hierarchy}`;
        currentParentId = parent.parent_id;
      } else break;
    }
    return hierarchy;
  }, [empresas]);

  const renderEmpresaOptions = useCallback(() => {
    if (!empresas.length) return null;
    const buildTree = (parentId = null, level = 0) =>
      empresas
        .filter(e => e.parent_id === parentId)
        .flatMap(emp => [
          <option key={emp.id} value={String(emp.id)}>
            {'\u00A0'.repeat(level * 4)}{level > 0 ? '└─ ' : ''}{emp.nome}
          </option>,
          ...buildTree(emp.id, level + 1)
        ]);
    return buildTree();
  }, [empresas]);

  const localizacoesFiltradas = useMemo(() => {
    if (!formData.empresa_id) return [];
    return localizacoes.filter(l => String(l.empresa_id) === String(formData.empresa_id));
  }, [formData.empresa_id, localizacoes]);

  const filteredOrcamentos = useMemo(() => {
    return orcamentos.filter(o => {
      const matchesSearch = !searchTerm || (o.titulo || o.numero || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEmpresa = !empresaFilter || String(o.empresa_id) === String(empresaFilter);
      const matchesLocalizacao = !localizacaoFilter || String(o.localizacao_id) === String(localizacaoFilter);
      const matchesStatus = !statusFilter || String(o.status) === String(statusFilter);
      return matchesSearch && matchesEmpresa && matchesLocalizacao && matchesStatus;
    });
  }, [orcamentos, searchTerm, empresaFilter, localizacaoFilter, statusFilter]);

  const getFileUrl = (path) => {
    if (!path) return '#';
    if (path.startsWith('http')) return path;
    if (path.startsWith('/')) return `${BACKEND_URL}${path}`;
    if (path.startsWith('uploads') || path.startsWith('static')) return `${BACKEND_URL}/${path}`;
    return `${BACKEND_URL}/static/uploads/${path}`;
  };

  const getStatusColor = (status) => {
    if (status === 'Aprovado') return 'text-green-600 bg-green-50';
    if (status === 'Rejeitado') return 'text-red-600 bg-red-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  const uploadFiles = async (files) => {
    if (!files.length) return;
    if (!formData.numero && !formData.titulo && !formData.descricao) {
      alert('Preencha "Nome do Orçamento ou Número" antes de anexar arquivos.');
      return;
    }

    setUploading(true);
    const newAnexos = [...formData.anexos];

    for (const file of files) {
      const id = `${Date.now()}-${file.name}`;
      newAnexos.push({ id, nome: file.name, caminho: '', size: file.size, uploading: true });
      setFormData(prev => ({ ...prev, anexos: newAnexos.slice() }));

      const data = new FormData();
      data.append('file', file);
      data.append('orcamento_titulo', formData.numero || formData.titulo || formData.descricao || '');
      try {
        const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: data });
        if (!res.ok) {
          console.error('Upload falhou', res.status);
          setFormData(prev => ({ ...prev, anexos: prev.anexos.filter(a => a.id !== id) }));
          continue;
        }
        const result = await res.json();
        const caminho = result.path || result.caminho || result.url || '';
        setFormData(prev => {
          const updated = prev.anexos.map(a => a.id === id ? { nome: file.name, caminho, size: file.size } : a);
          return { ...prev, anexos: updated };
        });
      } catch (err) {
        console.error('Erro no upload:', err);
        setFormData(prev => ({ ...prev, anexos: prev.anexos.filter(a => a.id !== id) }));
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    await uploadFiles(files);
  };

  const removeAnexoFromForm = (index) => {
    setFormData(prev => ({ ...prev, anexos: prev.anexos.filter((_, i) => i !== index) }));
  };

  const handleOpenModal = (orcamento = null) => {
    if (orcamento) {
      setIsEditing(true);
      setCurrentOrcamento(orcamento);
      setFormData({
        numero: orcamento.numero || orcamento.titulo || '',
        titulo: orcamento.titulo || '',
        descricao: orcamento.descricao || '',
        valor_total: orcamento.valor_total != null ? String(orcamento.valor_total) : '',
        data_inicial: orcamento.data_inicial ? orcamento.data_inicial.split('T')[0] : '',
        data_final: orcamento.data_final ? orcamento.data_final.split('T')[0] : '',
        data_validade: orcamento.data_validade ? orcamento.data_validade.split('T')[0] : '',
        status: orcamento.status || 'Pendente',
        empresa_id: orcamento.empresa_id?.toString() || '',
        localizacao_id: orcamento.localizacao_id?.toString() || '',
        fornecedor_id: orcamento.fornecedor_id?.toString() || '',
        anexos: orcamento.anexos ? orcamento.anexos.map(a => ({ nome: a.nome, caminho: a.caminho, size: a.size || 0 })) : []
      });
    } else {
      setIsEditing(false);
      setCurrentOrcamento(null);
      setFormData({
        numero: '', titulo: '', descricao: '', valor_total: '', data_inicial: '', data_final: '',
        data_validade: '', status: 'Pendente', empresa_id: '', localizacao_id: '',
        fornecedor_id: '', anexos: []
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.numero && !formData.titulo) {
      alert('Preencha "Nome do Orçamento ou Número".');
      return;
    }
    if (!formData.empresa_id) {
      alert('Empresa é obrigatória.');
      return;
    }

    let fornecedorToSend = formData.fornecedor_id;
    if (!fornecedorToSend) {
      if (fornecedores.length > 0) fornecedorToSend = String(fornecedores[0].id);
      else { alert('Nenhum fornecedor disponível; crie um fornecedor ou ajuste o banco.'); return; }
    }

    const payload = {
      titulo: formData.numero,
      descricao: formData.descricao || null,
      valor_total: formData.valor_total === '' ? null : parseFloat(formData.valor_total),
      data_inicial: formData.data_inicial || null,
      data_final: formData.data_final || null,
      data_validade: formData.data_validade || null,
      status: formData.status || 'Pendente',
      empresa_id: Number(formData.empresa_id),
      localizacao_id: formData.localizacao_id ? Number(formData.localizacao_id) : null,
      fornecedor_id: Number(fornecedorToSend),
      anexos: formData.anexos || []
    };

    const method = isEditing && currentOrcamento ? 'PUT' : 'POST';
    const url = isEditing && currentOrcamento ? `${API_URL}/orcamentos/${currentOrcamento.id}` : `${API_URL}/orcamentos/`;

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setIsModalOpen(false);
        fetchData();
      } else {
        const text = await response.text();
        console.error('Erro ao salvar:', response.status, text);
        alert('Erro ao salvar. Veja console.');
      }
    } catch (err) {
      console.error('Erro ao submeter:', err);
      alert('Erro ao submeter. Veja console.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deseja realmente excluir este orçamento?')) return;
    try {
      const response = await fetch(`${API_URL}/orcamentos/${id}`, { method: 'DELETE' });
      if (response.ok) fetchData();
      else { const txt = await response.text(); console.error('Erro ao excluir:', response.status, txt); alert('Erro ao excluir.'); }
    } catch (err) { console.error('Erro ao excluir:', err); alert('Erro ao excluir.'); }
  };

  const headerCell = 'text-xs text-gray-600 uppercase font-semibold px-4 py-2';
  const rowCell = 'px-4 py-2 text-sm';
  const iconSmall = 'text-sm';

  // blurActive if either modal (create/edit) or attachments viewer is open
  const blurActive = isModalOpen || isViewingAttachments;

  return (
    <div className="relative">
      {/* Page content will blur when either modal is open */}
      <div className={`p-6 bg-gray-50 min-h-screen transition-filter duration-200 ${blurActive ? 'filter blur-sm pointer-events-none select-none' : ''}`}>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FaFileInvoice className="text-indigo-600" /> Orçamentos
          </h1>
          <button onClick={() => handleOpenModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm shadow">
            <FaPlus className="text-sm" /> Novo
          </button>
        </div>

        <div className="bg-white p-3 rounded-xl shadow-sm mb-4 border border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Pesquisar por título..." className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <select className="p-2 text-sm border rounded-lg" value={empresaFilter} onChange={(e) => { setEmpresaFilter(e.target.value); setLocalizacaoFilter(''); }}>
            <option value="">Todas as Empresas</option>
            {renderEmpresaOptions()}
          </select>

          <select className="p-2 text-sm border rounded-lg" value={localizacaoFilter} onChange={(e) => setLocalizacaoFilter(e.target.value)} disabled={!empresaFilter}>
            <option value="">Todas as Localizações</option>
            {localizacoes.filter(l => l.empresa_id?.toString() === empresaFilter).map(l => <option key={l.id} value={l.id.toString()}>{l.nome}</option>)}
          </select>

          <select className="p-2 text-sm border rounded-lg" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos os Status</option>
            <option value="Pendente">Pendente</option>
            <option value="Aprovado">Aprovado</option>
            <option value="Rejeitado">Rejeitado</option>
          </select>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className={headerCell} style={{ width: '32%' }}>Título</th>
                <th className={headerCell} style={{ width: '22%' }}>Empresa</th>
                <th className={headerCell} style={{ width: '14%' }}>Fornecedor</th>
                <th className={headerCell} style={{ width: '12%' }}>Valor</th>
                <th className={headerCell} style={{ width: '10%' }}>Status</th>
                <th className={headerCell} style={{ width: '5%' }}>Anexos</th>
                <th className={headerCell} style={{ width: '5%' }}></th>
              </tr>
            </thead>

            <tbody>
              {filteredOrcamentos.map(o => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className={rowCell} title={o.titulo || ''}>
                    <div className="flex flex-col">
                      <div className="font-medium text-sm truncate flex items-center gap-2">
                        <FaFileInvoice className={`${iconSmall} text-indigo-400`} /> <span className="truncate">{o.titulo || o.numero}</span>
                      </div>
                      <div className="text-xs text-gray-500 truncate mt-0.5 flex items-center gap-3">
                        {o.data_inicial && <span title="Data inicial"><FaCalendarAlt className="text-xs" /> {o.data_inicial.split('T')[0]}</span>}
                        {o.data_validade && <span title="Validade">Val: {o.data_validade.split('T')[0]}</span>}
                      </div>
                    </div>
                  </td>

                  <td className={`${rowCell} text-sm text-gray-600`} title={buildEmpresaHierarchy(o.empresa_id)}>
                    <div className="flex items-center gap-2">
                      <FaBuilding className={`${iconSmall} text-indigo-400`} />
                      <div className="truncate">{buildEmpresaHierarchy(o.empresa_id) || o.empresa_nome || '-'}</div>
                    </div>
                  </td>

                  <td className={`${rowCell} text-sm text-gray-600`} title={o.fornecedor_nome || ''}>
                    <div className="flex items-center gap-2">
                      <FaUser className={`${iconSmall} text-orange-400`} />
                      <div className="truncate">{o.fornecedor_nome || '-'}</div>
                    </div>
                  </td>

                  <td className={`${rowCell} text-sm text-gray-600`}>
                    <div className="flex items-center gap-2">
                      <FaDollarSign className={`${iconSmall} text-green-400`} />
                      <div>{o.valor_total != null ? Number(o.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</div>
                    </div>
                  </td>

                  <td className={rowCell}>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(o.status)}`}>
                      <FaCheckCircle className="text-xs" /> {o.status}
                    </span>
                  </td>

                  <td className={rowCell}>
                    {/* Attachment action: purple paperclip icon only (no eye icon) */}
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setCurrentOrcamento(o); setIsViewingAttachments(true); }} title="Ver anexos" className="p-1 rounded text-indigo-600 hover:bg-indigo-50">
                        <FaPaperclip />
                      </button>
                      {/* show count only as plain text */}
                      {o.anexos && o.anexos.length > 0 && (
                        <span className="text-indigo-600 text-sm">{o.anexos.length}</span>
                      )}
                    </div>
                  </td>

                  <td className={`${rowCell} text-right`}>
                    <div className="inline-flex items-center gap-1">
                      <button onClick={() => handleOpenModal(o)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Editar">
                        <FaEdit className="text-sm" />
                      </button>
                      <button onClick={() => handleDelete(o.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Excluir">
                        <FaTrashAlt className="text-sm" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredOrcamentos.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-4 text-center text-gray-500">Nenhum orçamento encontrado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attachments viewer modal (new style) */}
      {isViewingAttachments && currentOrcamento && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          {/* backdrop with blur */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsViewingAttachments(false)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-lg shadow-2xl overflow-hidden">
            <div className="bg-indigo-700 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FaPaperclip />
                <div className="font-semibold">Anexos</div>
              </div>
              <button onClick={() => setIsViewingAttachments(false)} className="p-1 rounded hover:bg-white/10"><FaTimes /></button>
            </div>

            <div className="p-4 space-y-3">
              {(currentOrcamento.anexos || []).length ? (
                (currentOrcamento.anexos || []).map((a, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 bg-indigo-50 text-indigo-700 rounded flex items-center justify-center">
                        <FaRegFileAlt />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{a.nome}</div>
                        <div className="text-xs text-gray-400">{a.size ? prettyBytes(a.size) : ''}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <a href={getFileUrl(a.caminho)} target="_blank" rel="noreferrer" className="text-indigo-600 p-2 rounded hover:bg-indigo-50">
                        <FaDownload />
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-gray-500">Nenhum anexo</div>
              )}
            </div>

            <div className="p-4 border-t flex justify-end">
              <button onClick={() => setIsViewingAttachments(false)} className="px-4 py-2 rounded bg-white border text-sm">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit modal overlay (keeps blur behavior already applied by blurActive) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-2xl overflow-hidden z-10">
            <div className="bg-indigo-700 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FaFileInvoice />
                <div>
                  <div className="font-bold">{isEditing ? 'Editar Orçamento' : 'Novo Orçamento'}</div>
                  <div className="text-sm opacity-80">Preencha os dados principais</div>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="rounded-full p-2 hover:bg-white/10">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Identificação</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-600">Nome do Orçamento ou Número *</label>
                      <input
                        value={formData.numero}
                        onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                        className="mt-1 p-3 border rounded-lg w-full"
                        placeholder="Nome do Orçamento ou Número"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-600">Empresa *</label>
                      <select value={formData.empresa_id} onChange={(e) => setFormData({ ...formData, empresa_id: e.target.value, localizacao_id: '' })} className="mt-1 p-3 border rounded-lg w-full" required>
                        <option value="">Selecione a Empresa</option>
                        {renderEmpresaOptions()}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-gray-600">Fornecedor</label>
                      <select value={formData.fornecedor_id} onChange={(e) => setFormData({ ...formData, fornecedor_id: e.target.value })} className="mt-1 p-3 border rounded-lg w-full">
                        <option value="">Selecione o Fornecedor</option>
                        {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-gray-600">Localização</label>
                      <select value={formData.localizacao_id} onChange={(e) => setFormData({ ...formData, localizacao_id: e.target.value })} className="mt-1 p-3 border rounded-lg w-full" disabled={!formData.empresa_id}>
                        <option value="">Selecione a Localização</option>
                        {localizacoesFiltradas.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-gray-600">Observações</label>
                      <textarea rows="3" value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} className="mt-1 p-3 border rounded-lg w-full" />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Vigência e Valores + Status</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-600">Data Início</label>
                      <input type="date" value={formData.data_inicial} onChange={(e) => setFormData({ ...formData, data_inicial: e.target.value })} className="mt-1 p-3 border rounded-lg w-full" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Data Fim</label>
                      <input type="date" value={formData.data_final} onChange={(e) => setFormData({ ...formData, data_final: e.target.value })} className="mt-1 p-3 border rounded-lg w-full" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Valor R$</label>
                      <input type="number" step="0.01" value={formData.valor_total} onChange={(e) => setFormData({ ...formData, valor_total: e.target.value })} className="mt-1 p-3 border rounded-lg w-full" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Data de Validade</label>
                      <input type="date" value={formData.data_validade} onChange={(e) => setFormData({ ...formData, data_validade: e.target.value })} className="mt-1 p-3 border rounded-lg w-full" />
                    </div>
                  </div>

                  <div className="mt-4 p-4 border rounded-lg bg-white shadow-sm">
                    <label className="text-xs text-gray-600 mb-2 block">Status</label>
                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="p-2 border rounded w-full">
                      <option value="Pendente">Pendente</option>
                      <option value="Aprovado">Aprovado</option>
                      <option value="Rejeitado">Rejeitado</option>
                    </select>

                    <div className="mt-3">
                      <div className="text-xs text-gray-500 mb-2">Pré-visualização</div>
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(formData.status)}`}>
                        <FaCheckCircle /> {formData.status}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm text-gray-700 font-semibold">
                    <FaPaperclip className="text-indigo-600" /> Documentos / Anexos
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label htmlFor="fileInputModal" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm cursor-pointer hover:bg-indigo-100">
                    <FaPaperclip /> Escolher arquivos
                  </label>
                  <input id="fileInputModal" ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />

                  <div className="text-sm text-gray-500">
                    {formData.anexos.length === 0 ? 'Nenhum arquivo escolhido' : formData.anexos.map(a => a.nome).join(', ')}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-sm text-gray-600 px-4 py-2 rounded">Cancelar</button>
                <button type="submit" className="text-sm px-5 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg">Criar Orçamento</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orcamentos;
