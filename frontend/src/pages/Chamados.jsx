import { openSecureFile } from '../utils/openSecureFile';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    FaPlus, FaEdit, FaTrashAlt, FaEye, FaTimes, FaBox, FaUser, FaPaperclip,
    FaSearch, FaBolt, FaTools, FaQrcode, FaTruck, FaIndustry, FaLayerGroup,
    FaComment, FaReply, FaClock, FaCheck, FaBan, FaUnlock, FaInfoCircle,
    FaChevronDown, FaSync, FaPlay, FaPause, FaCalendarAlt, FaListAlt,
    FaCaretDown, FaDollarSign
} from 'react-icons/fa';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEntity } from '../context/EntityContext';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
const FREQ_OPTIONS = [
    { value: 'diario',      label: 'Diário' },
    { value: 'semanal',     label: 'Semanal' },
    { value: 'quinzenal',   label: 'Quinzenal' },
    { value: 'mensal',      label: 'Mensal' },
    { value: 'bimestral',   label: 'Bimestral' },
    { value: 'trimestral',  label: 'Trimestral' },
    { value: 'semestral',   label: 'Semestral' },
    { value: 'anual',       label: 'Anual' },
];

const DIAS_SEMANA = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
const CRITICIDADES = ['Muito Baixa','Baixa','Média','Alta','Muito Alta'];

const statusConfig = {
    'Aberto':         { bg:'bg-blue-50',  text:'text-blue-700',  border:'border-blue-200',  dot:'bg-blue-500',  icon:<FaUnlock size={10}/> },
    'Em Atendimento': { bg:'bg-amber-50', text:'text-amber-700', border:'border-amber-200', dot:'bg-amber-500', icon:<FaClock size={10}/> },
    'Concluído':      { bg:'bg-green-50', text:'text-green-700', border:'border-green-200', dot:'bg-green-500', icon:<FaCheck size={10}/> },
    'Cancelado':      { bg:'bg-red-50',   text:'text-red-700',   border:'border-red-200',   dot:'bg-red-500',   icon:<FaBan size={10}/> },
};
const critConfig = {
    'Muito Alta':'text-red-600','Alta':'text-orange-500',
    'Média':'text-amber-500','Baixa':'text-blue-500','Muito Baixa':'text-slate-400'
};
const obsTypeConfig = {
    'observacao': { bg:'bg-white',     border:'border-slate-200', badge:'bg-slate-100 text-slate-600',  label:'Observação' },
    'solucao':    { bg:'bg-green-50',  border:'border-green-200', badge:'bg-green-100 text-green-700',   label:'Solução' },
    'sistema':    { bg:'bg-blue-50',   border:'border-blue-200',  badge:'bg-blue-100 text-blue-700',    label:'Sistema' },
};

const StatusBadge = ({ status }) => {
    const cfg = statusConfig[status] || statusConfig['Aberto'];
    return (
        <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}/> {status}
        </span>
    );
};

const TipoBadge = ({ tipo }) => tipo === 'infraestrutura'
    ? <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase bg-indigo-50 text-indigo-600 border border-indigo-100"><FaLayerGroup size={8}/> Infra</span>
    : <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase bg-blue-50 text-blue-600 border border-blue-100"><FaIndustry size={8}/> Maq.</span>;

const Avatar = ({ nome, size='sm' }) => {
    const colors=['bg-blue-500','bg-purple-500','bg-green-500','bg-amber-500','bg-red-500','bg-indigo-500','bg-pink-500','bg-teal-500'];
    const idx = nome ? nome.charCodeAt(0)%colors.length : 0;
    const sz = size==='sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
    return <div className={`${sz} ${colors[idx]} rounded-full flex items-center justify-center text-white font-bold shrink-0`}>{(nome||'?').charAt(0).toUpperCase()}</div>;
};

/* ─────────────────────────────────────────────────────────────
   COMPONENTE PRINCIPAL
───────────────────────────────────────────────────────────── */
function FornecedorPicker({ fornecedores, selectedIds, onChange }) {
  const [query, setQuery] = React.useState('')
  const [open,  setOpen]  = React.useState(false)
  const ref = React.useRef(null)
  React.useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  const selected = fornecedores.filter(f => selectedIds.map(Number).includes(Number(f.id)))
  const filtered = fornecedores.filter(f => {
    if (selectedIds.map(Number).includes(Number(f.id))) return false
    const q = query.toLowerCase()
    if (!q) return true
    return (f.nome||'').toLowerCase().includes(q)
  }).slice(0, 8)
  const add = (f) => { onChange([...selectedIds.map(Number), Number(f.id)]); setQuery(''); setOpen(false) }
  const remove = (id) => onChange(selectedIds.map(Number).filter(x => x !== Number(id)))
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-slate-600 uppercase ml-1">Prestadores</label>
      {selected.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {selected.map(f => (
            <div key={f.id} className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-700 truncate">🚚 {f.nome}</div>
              </div>
              <button type="button" onClick={() => remove(f.id)}
                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-100 hover:text-red-500 text-slate-400 font-bold transition-all text-base leading-none">×</button>
            </div>
          ))}
        </div>
      )}
      <div className="relative" ref={ref}>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">🔍</span>
          <input
            className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm"
            placeholder={fornecedores.length === 0 ? 'Nenhum fornecedor cadastrado' : 'Buscar fornecedor...'}
            value={query}
            disabled={fornecedores.length === 0}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
          />
        </div>
        {open && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
            {filtered.length === 0
              ? <div className="px-4 py-3 text-xs text-slate-400 text-center">{query ? 'Nenhum resultado.' : 'Todos os fornecedores já adicionados.'}</div>
              : filtered.map(f => (
                <button key={f.id} type="button" onMouseDown={() => add(f)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/5 transition-colors border-b border-slate-50 last:border-0 text-left">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-700">🚚 {f.nome}</div>
                  </div>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">+ add</span>
                </button>
              ))
            }
          </div>
        )}
      </div>
    </div>
  )
}

function OrcamentoPicker({ orcamentos, selectedIds, onChange }) {
  const [query, setQuery] = React.useState('')
  const [open,  setOpen]  = React.useState(false)
  const ref = React.useRef(null)
  React.useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  const fmt = (v) => parseFloat(v||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })
  const selected = orcamentos.filter(o => selectedIds.map(Number).includes(Number(o.id)))
  const total    = selected.reduce((s, o) => s + parseFloat(o.valor || 0), 0)
  const filtered = orcamentos.filter(o => {
    if (selectedIds.map(Number).includes(Number(o.id))) return false
    const q = query.toLowerCase()
    if (!q) return true
    return (o.numero||'').toLowerCase().includes(q)
        || (o.descricao||'').toLowerCase().includes(q)
        || (o.fornecedor_nome||'').toLowerCase().includes(q)
  }).slice(0, 8)
  const add = (o) => {
    const ids = [...selectedIds.map(Number), Number(o.id)]
    const t = orcamentos.filter(x => ids.includes(Number(x.id))).reduce((s,x) => s + parseFloat(x.valor||0), 0)
    onChange(ids, t); setQuery(''); setOpen(false)
  }
  const remove = (id) => {
    const ids = selectedIds.map(Number).filter(x => x !== Number(id))
    const t = orcamentos.filter(x => ids.includes(Number(x.id))).reduce((s,x) => s + parseFloat(x.valor||0), 0)
    onChange(ids, t)
  }
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-slate-600 uppercase ml-1">Orçamentos</label>
      {selected.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {selected.map(o => (
            <div key={o.id} className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-700 truncate">{o.numero || ("Orç. #" + o.id)}</div>
                {o.fornecedor_nome && <div className="text-[10px] text-slate-400">🚚 {o.fornecedor_nome}</div>}
              </div>
              <span className="text-xs font-bold text-emerald-700 flex-shrink-0">{fmt(o.valor)}</span>
              <button type="button" onClick={() => remove(o.id)}
                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-100 hover:text-red-500 text-slate-400 font-bold transition-all text-base leading-none">×</button>
            </div>
          ))}
          <div className="flex items-center justify-between px-3 py-2 bg-emerald-600 rounded-xl">
            <span className="text-xs font-bold text-white">Total</span>
            <span className="text-sm font-bold text-white">{fmt(total)}</span>
          </div>
        </div>
      )}
      <div className="relative" ref={ref}>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">🔍</span>
          <input
            className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm"
            placeholder={orcamentos.length === 0 ? 'Nenhum orçamento cadastrado' : 'Buscar por número, fornecedor...'}
            value={query}
            disabled={orcamentos.length === 0}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
          />
        </div>
        {open && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
            {filtered.length === 0
              ? <div className="px-4 py-3 text-xs text-slate-400 text-center">{query ? 'Nenhum resultado.' : 'Todos os orçamentos já adicionados.'}</div>
              : filtered.map(o => (
                <button key={o.id} type="button" onMouseDown={() => add(o)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/5 transition-colors border-b border-slate-50 last:border-0 text-left">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-700">{o.numero || ("Orç. #" + o.id)}</div>
                    <div className="text-[10px] text-slate-400 truncate">{[o.fornecedor_nome, o.descricao].filter(Boolean).join(' · ') || 'Sem descrição'}</div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 flex-shrink-0">{fmt(o.valor)}</span>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">+ add</span>
                </button>
              ))
            }
          </div>
        )}
      </div>
    </div>
  )
}

const Chamados = () => {
    const { selectedEntity } = useEntity();
    const { user, can } = useAuth();
    const isSelfService = user?.role === 'self_service';

    /* dados */
    const [chamados, setAtivosChamados] = useState([]);
    const [fornecedores, setFornecedores] = useState([]);
    const [localizacoes, setLocalizacoes] = useState([]);
    const [contratos, setContratos] = useState([]);
    const [orcamentos, setOrcamentos] = useState([]);
    const [ativos, setAtivos] = useState([]);
    const [infraestruturas, setInfraestruturas] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    const [categorias, setCategorias] = useState([]);

    /* filtros */
    const [searchTerm, setSearchTerm]         = useState('');
    const [statusFilter, setStatusFilter]     = useState('Não Encerrados');
    const [empresaFilter, setEmpresaFilter]   = useState(
        user?.role === 'self_service' && user?.empresa_id ? String(user.empresa_id) : 'Todas'
    );
    const [tipoFilter, setTipoFilter]         = useState('Todos');

    /* painel lateral */
    const [selectedChamado, setSelectedChamado] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const [isPanelOpen, setIsPanelOpen]         = useState(false);
    const [activeTab, setActiveTab]             = useState('detalhes');
    const [finForm, setFinForm]         = useState({ anexar: false, fornecedor: '', forma_pagamento: 'PIX', observacao: '', nf: null, boleto: null, smtp_id: '' });
    const [smtpList, setSmtpList]         = useState([]);
    const [finSending, setFinSending]   = useState(false);
    const [finMsg, setFinMsg]           = useState(null);
    const [finExtracted, setFinExtracted] = useState(null);
    const [observacoes, setObservacoes]         = useState([]);
    const [loadingObs, setLoadingObs]           = useState(false);
    const [novaObs, setNovaObs]                 = useState('');
    const [tipoObs, setTipoObs]                 = useState('observacao');
    const [savingObs, setSavingObs]             = useState(false);
    const obsEndRef = useRef(null);

    /* modal chamado */
    const [isModalOpen, setIsModalOpen]   = useState(false);
    const [isEditing, setIsEditing]       = useState(false);
    const [currentChamado, setCurrentChamado] = useState(null);
    const [uploading, setUploading]       = useState(false);
    const [isSaving, setIsSaving]         = useState(false);
    const [formData, setFormData] = useState({
        titulo:'', descricao:'', status:'Aberto',
        empresa_id:'', fornecedor_id:'', localizacao_id:'',
        contrato_id:'', orcamento_id:'', orcamentos_ids:[], ativo_id:'',
        infraestrutura_id:'', categoria_id:'',
        criticidade_informada:'Média', criticidade_real:'Média',
        valor_total:0, anexos:[], tipo:'maquinario'
    });

    /* modal recorrência */
    const [isRecModalOpen, setIsRecModalOpen]   = useState(false);
    const [recorrencias, setRecorrencias]       = useState([]);
    const [recTab, setRecTab]                   = useState('lista');
    const [recForm, setRecForm] = useState({
        titulo:'', descricao:'', tipo:'maquinario',
        criticidade_real:'Média', empresa_id:'', localizacao_id:'',
        ativo_id:'', infraestrutura_id:'', fornecedor_id:'',
        contrato_id:'', orcamento_id:'', orcamentos_ids:[], categoria_id:'',
        frequencia:'mensal', dia_semana:0, dia_mes:1, hora:8, minuto:0,
        data_inicio: new Date().toISOString().slice(0,10), data_fim:''
    });
    const [savingRec, setSavingRec]   = useState(false);
    const [editingRec, setEditingRec] = useState(null);

    /* dropdown Ações */
    const [acDropOpen, setAcDropOpen] = useState(false);
    const acDropRef = useRef(null);

    /* anexos modal */
    const [isAnexosModalOpen, setIsAnexosModalOpen] = useState(false);
    const [selectedAnexos, setSelectedAnexos]       = useState([]);

    const API_BASE = "";
    const API_URL = `${API_BASE}/api`;

    const fmtCurrency = v => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0);
    const fmtDate  = s => { try { return s ? format(parseISO(s),"dd/MM/yy HH:mm",{locale:ptBR}) : '-'; } catch{ return '-'; }};
    const fmtDateF = s => { try { return s ? format(parseISO(s),"dd/MM/yyyy 'às' HH:mm",{locale:ptBR}) : '-'; } catch{ return '-'; }};
    const getAnexoHref = p => {
        if(!p) return '#';
        if(p.startsWith('http')) return p;
        const clean = p.startsWith('/') ? p.slice(1) : p;
        const token = (() => { try { return JSON.parse(localStorage.getItem('user'))?.api_token; } catch{ return null; } })();
        const sep = clean.includes('?') ? '&' : '?';
        return `${API_BASE}/${clean}${token ? sep+'token='+token : ''}`;
    };

    useEffect(() => {
        if (user?.role === 'self_service' && user?.empresa_id) {
            setEmpresaFilter(String(user.empresa_id));
        }
    }, [user]);

    useEffect(() => {
        if (user?.role === 'self_service' && user?.empresa_id) {
            setEmpresaFilter(String(user.empresa_id));
        }
    }, [user]);

    /* ── fetch principal ── */
    const fetchData = useCallback(async () => {
        const h = {}; if(user?.api_token) h['X-API-Token']=user.api_token;
        const q = selectedEntity&&selectedEntity!=='all' ? `?empresa_id=${selectedEntity}` : '';
        const [c,f,l,con,o,a,infra,emp,cat] = await Promise.all([
            fetch(`${API_URL}/chamados${q}`,{headers:h}),
            fetch(`${API_URL}/fornecedores${q}`,{headers:h}),
            fetch(`${API_URL}/localizacoes${q}`,{headers:h}),
            fetch(`${API_URL}/contratos${q}`,{headers:h}),
            fetch(`${API_URL}/orcamentos${q}`,{headers:h}),
            fetch(`${API_URL}/ativos${q}`,{headers:h}),
            fetch(`${API_URL}/infraestruturas${q}`,{headers:h}),
            fetch(`${API_URL}/empresas`,{headers:h}),
            fetch(`${API_URL}/categorias-chamado`,{headers:h})
        ]);
        if(c.ok){ const d=await c.json(); setAtivosChamados(Array.isArray(d.chamados)?d.chamados:(Array.isArray(d)?d:[])); }
        if(f.ok) setFornecedores(await f.json());
        if(l.ok) setLocalizacoes(await l.json());
        if(con.ok) setContratos(await con.json());
        if(o.ok) setOrcamentos(await o.json());
        if(a.ok) setAtivos(await a.json());
        if(infra.ok){ const d=await infra.json(); setInfraestruturas(Array.isArray(d.infraestruturas)?d.infraestruturas:(Array.isArray(d)?d:[])); }
        if(emp.ok) setEmpresas(await emp.json());
        if(cat.ok) setCategorias(await cat.json());
    },[user?.api_token,selectedEntity,API_URL]);

    useEffect(()=>{ fetchData(); },[fetchData]);

    useEffect(() => {
        if (activeTab !== 'financeiro') return;
        let cancelado = false;
        const _base = import.meta.env.VITE_API_URL || '';
        fetch(`${_base}/api/marketing/smtp/`, { headers: { 'X-API-Token': user?.api_token || '' } })
            .then(r => (r.ok ? r.json() : []))
            .then(d => { if (!cancelado && Array.isArray(d)) setSmtpList(d); })
            .catch(() => {});
        return () => { cancelado = true; };
    }, [activeTab, user?.api_token]);

    /* ── re-abrir chamado via URL ?chamado=ID ao recarregar ── */
    useEffect(()=>{
        const cidParam = searchParams.get('chamado');
        if(!cidParam || !chamados.length) return;
        const found = chamados.find(c => String(c.id) === String(cidParam));
        if(found && (!selectedChamado || selectedChamado.id !== found.id)){
            setSelectedChamado(found);
            setIsPanelOpen(true);
            fetchObservacoes(found.id);
        }
    },[searchParams, chamados]);

    /* fechar dropdown ao clicar fora */
    useEffect(()=>{
        const handler = e => { if(acDropRef.current && !acDropRef.current.contains(e.target)) setAcDropOpen(false); };
        document.addEventListener('mousedown', handler);
        return ()=> document.removeEventListener('mousedown', handler);
    },[]);

    /* ── recorrências ── */
    const fetchRecorrencias = useCallback(async () => {
        const h={}; if(user?.api_token) h['X-API-Token']=user.api_token;
        const q = selectedEntity&&selectedEntity!=='all' ? `?empresa_id=${selectedEntity}` : '';
        const res = await fetch(`${API_URL}/recorrencias${q}`,{headers:h});
        if(res.ok) setRecorrencias(await res.json());
    },[user?.api_token,selectedEntity,API_URL]);

    const handleOpenRecModal = () => {
        if (isSelfService) return;
        if (isSelfService) return;
        fetchRecorrencias();
        setRecTab('lista');
        setEditingRec(null);
        resetRecForm();
        setIsRecModalOpen(true);
        setAcDropOpen(false);
    };

    const resetRecForm = () => setRecForm({
        titulo:'', descricao:'', tipo:'maquinario', criticidade_real:'Média',
        empresa_id:'', localizacao_id:'', ativo_id:'', infraestrutura_id:'',
        fornecedor_id:'', contrato_id:'', orcamento_id:'', orcamentos_ids:[], categoria_id:'',
        frequencia:'mensal', dia_semana:0, dia_mes:1, hora:8, minuto:0,
        data_inicio: new Date().toISOString().slice(0,10), data_fim:''
    });

    const handleEditRec = (rec) => {
        if (isSelfService) return;
        if (isSelfService) return;
        setEditingRec(rec);
        setRecForm({
            titulo: rec.titulo||'', descricao: rec.descricao||'',
            tipo: rec.tipo||'maquinario', criticidade_real: rec.criticidade_real||'Média',
            empresa_id: rec.empresa_id?.toString()||'',
            localizacao_id: rec.localizacao_id?.toString()||'',
            ativo_id: rec.ativo_id?.toString()||'',
            infraestrutura_id: rec.infraestrutura_id?.toString()||'',
            fornecedor_id: rec.fornecedor_id?.toString()||'',
            contrato_id: rec.contrato_id?.toString()||'',
            orcamento_id: rec.orcamento_id?.toString()||'',
                            orcamentos_ids: Array.isArray(rec.orcamentos_ids) ? rec.orcamentos_ids.map(Number) : [],
            categoria_id: rec.categoria_id?.toString()||'',
            frequencia: rec.frequencia||'mensal',
            dia_semana: rec.dia_semana??0,
            dia_mes: rec.dia_mes||1,
            hora: rec.hora??8,
            minuto: rec.minuto??0,
            data_inicio: rec.data_inicio ? rec.data_inicio.slice(0,10) : new Date().toISOString().slice(0,10),
            data_fim: rec.data_fim ? rec.data_fim.slice(0,10) : ''
        });
        setRecTab('novo');
    };

    const handleSaveRec = async () => {
        if (isSelfService) return;
        if (isSelfService) return;
        if(!recForm.titulo.trim()) return alert('Informe o título');
        setSavingRec(true);
        const h={'Content-Type':'application/json'}; if(user?.api_token) h['X-API-Token']=user.api_token;
        const si = n => n===''||n===null||n===undefined ? null : parseInt(n);
        const payload = {
            ...recForm,
            empresa_id: si(recForm.empresa_id), localizacao_id: si(recForm.localizacao_id),
            ativo_id: si(recForm.ativo_id), infraestrutura_id: si(recForm.infraestrutura_id),
            fornecedor_id: si(recForm.fornecedor_id), contrato_id: si(recForm.contrato_id),
            orcamento_id: si(recForm.orcamento_id), categoria_id: si(recForm.categoria_id),
            dia_semana: parseInt(recForm.dia_semana), dia_mes: parseInt(recForm.dia_mes),
            hora: parseInt(recForm.hora), minuto: parseInt(recForm.minuto),
            data_inicio: recForm.data_inicio ? new Date(recForm.data_inicio).toISOString() : null,
            data_fim: recForm.data_fim ? new Date(recForm.data_fim).toISOString() : null,
        };
        const url = editingRec ? `${API_URL}/recorrencias/${editingRec.id}` : `${API_URL}/recorrencias`;
        const method = editingRec ? 'PUT' : 'POST';
        const res = await fetch(url,{method,headers:h,body:JSON.stringify(payload)});
        if(res.ok){ fetchRecorrencias(); setRecTab('lista'); setEditingRec(null); resetRecForm(); }
        setSavingRec(false);
    };

    const handleDeleteRec = async (id) => {
        if (isSelfService) return;
        if (isSelfService) return;
        if(!window.confirm('Excluir esta recorrência?')) return;
        const h={}; if(user?.api_token) h['X-API-Token']=user.api_token;
        await fetch(`${API_URL}/recorrencias/${id}`,{method:'DELETE',headers:h});
        fetchRecorrencias();
    };

    const handleToggleRec = async (rec) => {
        if (isSelfService) return;
        if (isSelfService) return;
        const h={'Content-Type':'application/json'}; if(user?.api_token) h['X-API-Token']=user.api_token;
        await fetch(`${API_URL}/recorrencias/${rec.id}`,{method:'PUT',headers:h,body:JSON.stringify({ativo:!rec.ativo})});
        fetchRecorrencias();
    };

    const handleExecutarRec = async (rec) => {
        if (isSelfService) return;
        if (isSelfService) return;
        if(!window.confirm(`Gerar um chamado agora para "${rec.titulo}"?`)) return;
        const h={'Content-Type':'application/json'}; if(user?.api_token) h['X-API-Token']=user.api_token;
        const res = await fetch(`${API_URL}/recorrencias/${rec.id}/executar`,{method:'POST',headers:h});
        if(res.ok){ const d=await res.json(); alert(`✅ Chamado #${d.chamado_id} gerado com sucesso!`); fetchData(); }
    };

    /* ── observações ── */
    const fetchObservacoes = useCallback(async (id) => {
        if(!id) return;
        setLoadingObs(true);
        const h={}; if(user?.api_token) h['X-API-Token']=user.api_token;
        const res = await fetch(`${API_URL}/chamados/${id}/observacoes`,{headers:h});
        if(res.ok) setObservacoes(await res.json());
        setLoadingObs(false);
    },[user?.api_token,API_URL]);

    useEffect(()=>{ if(obsEndRef.current) obsEndRef.current.scrollIntoView({behavior:'smooth'}); },[observacoes]);

    const handleOpenPanel = (c) => {
        setSelectedChamado(c); setIsPanelOpen(true); setSearchParams({ chamado: c.id });
        setActiveTab('detalhes'); setObservacoes([]); setNovaObs('');
        setFinForm({ anexar: false, fornecedor: c.fin_fornecedor||'', forma_pagamento: c.fin_forma_pagamento||'PIX', observacao: c.fin_observacao||'', nf: null, boleto: null });
        setFinMsg(null); setFinExtracted(null);
        fetchObservacoes(c.id);
    };
    const handleClosePanel = () => { setIsPanelOpen(false); setSelectedChamado(null); setSearchParams({}); };

    const handleSaveObs = async () => {
        if(!novaObs.trim()||!selectedChamado) return;
        setSavingObs(true);
        const h={'Content-Type':'application/json'}; if(user?.api_token) h['X-API-Token']=user.api_token;
        const res = await fetch(`${API_URL}/chamados/${selectedChamado.id}/observacoes`,{method:'POST',headers:h,
            body:JSON.stringify({texto:novaObs,tipo:tipoObs,usuario_nome:user?.username||'Usuário'})});
        if(res.ok){ setNovaObs(''); fetchObservacoes(selectedChamado.id); }
        setSavingObs(false);
    };

    const handleDeleteObs = async (obsId) => {
        if (isSelfService) return;
        if (isSelfService) return;
        if(!window.confirm('Excluir esta observação?')) return;
        const h={}; if(user?.api_token) h['X-API-Token']=user.api_token;
        await fetch(`${API_URL}/chamados/${selectedChamado.id}/observacoes/${obsId}`,{method:'DELETE',headers:h});
        fetchObservacoes(selectedChamado.id);
    };

    const handleQuickStatus = async (chamado, newStatus) => {
        if (isSelfService) return;
        if (isSelfService) return;
        const h={'Content-Type':'application/json'}; if(user?.api_token) h['X-API-Token']=user.api_token;
        await fetch(`${API_URL}/chamados/${chamado.id}`,{method:'PUT',headers:h,body:JSON.stringify({...chamado,status:newStatus})});
        fetchData();
        if(selectedChamado?.id===chamado.id) setSelectedChamado({...selectedChamado,status:newStatus});
    };

    /* ── CRUD chamado ── */
    const handleAtivoChange = (ativoId) => {
        if(!ativoId){ setFormData({...formData,ativo_id:''}); return; }
        const a=ativos.find(a=>a.id.toString()===ativoId);
        if(a) {
            const novosFornIds = a.fornecedor_id
                ? [...new Set([...( formData.fornecedores_ids||[]), Number(a.fornecedor_id)])]
                : formData.fornecedores_ids||[];
            setFormData({...formData,ativo_id:ativoId,
                empresa_id:a.empresa_id?.toString()||formData.empresa_id,
                localizacao_id:a.localizacao_id?.toString()||formData.localizacao_id,
                fornecedor_id:a.fornecedor_id?.toString()||formData.fornecedor_id,
                fornecedores_ids:novosFornIds,
                contrato_id:a.contrato_id?.toString()||formData.contrato_id,
                orcamento_id:a.orcamento_id?.toString()||formData.orcamento_id});
        }
        else setFormData({...formData,ativo_id:ativoId});
    };

    const _postFinanceiro = async (enviar) => {
        if (!finForm.fornecedor.trim()) return;
        setFinSending(true); setFinMsg(null);
        try {
            const fd = new FormData();
            fd.append('fornecedor_nome', finForm.fornecedor);
            fd.append('forma_pagamento', finForm.forma_pagamento);
            fd.append('observacao',      finForm.observacao || '');
            fd.append('clinica',         selectedChamado?.empresa_nome || '');
            fd.append('apenas_salvar',   enviar ? '0' : '1');
            if (finForm.nf)     fd.append('nf',     finForm.nf);
            if (finForm.boleto) fd.append('boleto', finForm.boleto);
            const _base = import.meta.env.VITE_API_URL || '';
            const res   = await fetch(`${_base}/api/chamados/${selectedChamado.id}/financeiro`, {
                method:  'POST',
                headers: { 'X-API-Token': user?.api_token || '' },
                body:    fd,
            });
            const data = await res.json();
            if (data.success) {
                const msg = enviar ? 'Email enviado com sucesso para o financeiro!' : 'Dados financeiros salvos!';
                setFinMsg({ type: 'success', text: msg });
                if (data.extracted) setFinExtracted(data.extracted);
                // Atualizar selectedChamado com dados salvos
                const novosAnexos = Array.isArray(data.fin_anexos) ? data.fin_anexos : undefined;
                setSelectedChamado(prev => ({
                    ...prev,
                    fin_fornecedor:      finForm.fornecedor,
                    fin_forma_pagamento: finForm.forma_pagamento,
                    fin_observacao:      finForm.observacao,
                    ...(novosAnexos !== undefined && { fin_anexos: novosAnexos }),
                }));
                // Atualizar lista
                setAtivosChamados(prev => prev.map(c => c.id === selectedChamado.id ? {
                    ...c,
                    fin_fornecedor:      finForm.fornecedor,
                    fin_forma_pagamento: finForm.forma_pagamento,
                    fin_observacao:      finForm.observacao,
                    ...(novosAnexos !== undefined && { fin_anexos: novosAnexos }),
                } : c));
            } else {
                setFinMsg({ type: 'error', text: data.error || 'Erro ao processar.' });
            }
        } catch (e) {
            setFinMsg({ type: 'error', text: 'Erro de conexão: ' + e.message });
        }
        setFinSending(false);
    };
    const handleSalvarFinanceiro = () => _postFinanceiro(false);
    const handleEnviarFinanceiro = () => _postFinanceiro(true);

    const handleOpenModal = (chamado=null) => {
        if (isSelfService && chamado) return;

        if(chamado){
            setIsEditing(true); setCurrentChamado(chamado);
            setFormData({
                titulo:chamado.titulo||'', descricao:chamado.descricao||'',
                status:chamado.status||'Aberto',
                empresa_id:chamado.empresa_id?.toString()||'',
                fornecedor_id:chamado.fornecedor_id?.toString()||'',
                fornecedores_ids:Array.isArray(chamado.fornecedores_ids)?chamado.fornecedores_ids.map(Number):[],
                localizacao_id:chamado.localizacao_id?.toString()||'',
                contrato_id:chamado.contrato_id?.toString()||'',
                orcamento_id:chamado.orcamento_id?.toString()||'',
                ativo_id:chamado.ativo_id?.toString()||'',
                infraestrutura_id:chamado.infraestrutura_id?.toString()||'',
                categoria_id:chamado.categoria_id?.toString()||'',
                criticidade_informada:chamado.criticidade_informada||'Média',
                criticidade_real:chamado.criticidade_real||'Média',
                valor_total:chamado.valor_total||0,
                orcamentos_ids:Array.isArray(chamado.orcamentos_ids)?chamado.orcamentos_ids.map(Number):[],
                anexos:Array.isArray(chamado.anexos)?chamado.anexos:(typeof chamado.anexos==='string'?JSON.parse(chamado.anexos):[]),
                tipo:chamado.tipo||'maquinario'
            });
        } else {
            setIsEditing(false); setCurrentChamado(null);
            setFormData({titulo:'',descricao:'',status:'Aberto',empresa_id:user?.empresa_id ? String(user.empresa_id) : '',fornecedor_id:'',fornecedores_ids:[],localizacao_id:'',contrato_id:'',orcamento_id:'',orcamentos_ids:[],ativo_id:'',infraestrutura_id:'',categoria_id:'',criticidade_informada:'Média',criticidade_real:'Média',valor_total:0,anexos:[],tipo:'maquinario'});
        }
        setIsModalOpen(true);
    };

    const handleFileUpload = async (e) => {
        const files=Array.from(e.target.files); if(!files.length) return;
        setUploading(true);
        const newAnexos=[...formData.anexos];
        for(const file of files){
            const fd=new FormData(); fd.append('file',file);
            try{ const r=await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: fd, headers: user?.api_token ? {'X-API-Token': user.api_token} : {} }); if(r.ok){ const d=await r.json(); newAnexos.push({name:file.name,filename:d.filename,path:d.path,url:d.url}); }}
            catch(e){ console.error(e); }
        }
        setFormData({...formData,anexos:newAnexos}); setUploading(false);
    };

    const handleSubmit = async (e) => {
        if (e?.preventDefault) e.preventDefault();
        if (isSelfService && isEditing) return;

        setIsSaving(true);

        const h = {'Content-Type':'application/json'};
        if (user?.api_token) h['X-API-Token'] = user.api_token;

        const url = isEditing ? `${API_URL}/chamados/${currentChamado.id}` : `${API_URL}/chamados`;
        const method = isEditing ? 'PUT' : 'POST';
        const si = v => v ? parseInt(v) : null;

        const payload = {
            ...formData,
            empresa_id: isSelfService ? si(user?.empresa_id) : si(formData.empresa_id),
            fornecedor_id: si(formData.fornecedor_id),
            fornecedores_ids: formData.fornecedores_ids || [],
            localizacao_id: si(formData.localizacao_id),
            contrato_id: si(formData.contrato_id),
            orcamento_id: si(formData.orcamento_id),
            ativo_id: formData.tipo === 'maquinario' && formData.ativo_id ? si(formData.ativo_id) : null,
            infraestrutura_id: formData.tipo === 'infraestrutura' && formData.infraestrutura_id ? si(formData.infraestrutura_id) : null,
            categoria_id: si(formData.categoria_id),
            anexos: formData.anexos
        };

        try {
            const r = await fetch(url, {
                method,
                headers: h,
                body: JSON.stringify(payload)
            });

            const responseText = await r.text();

            if (!r.ok) {
                alert(`Erro ao salvar chamado (HTTP ${r.status}): ${responseText}`);
                return;
            }

            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar chamado: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (isSelfService) return;
        if(!window.confirm('Deseja excluir este chamado?')) return;
        const h={}; if(user?.api_token) h['X-API-Token']=user.api_token;
        const r=await fetch(`${API_URL}/chamados/${id}`,{method:'DELETE',headers:h});
        if(r.ok){ fetchData(); if(selectedChamado?.id===id) handleClosePanel(); }
    };

    /* ── filtros ── */
    const filteredChamados = useMemo(()=>chamados.filter(c=>{
        const ms=c.titulo?.toLowerCase().includes(searchTerm.toLowerCase())||c.id?.toString().includes(searchTerm);
        const mst=statusFilter==='Todos'||(statusFilter==='Não Encerrados'?['Aberto','Em Atendimento'].includes(c.status):c.status===statusFilter);
        const me=empresaFilter==='Todas'||c.empresa_id?.toString()===empresaFilter;
        const mt=tipoFilter==='Todos'||c.tipo===tipoFilter;
        return ms&&mst&&me&&mt;
    }),[chamados,searchTerm,statusFilter,empresaFilter,tipoFilter]);

    const filtAtivos  = useMemo(()=>!formData.empresa_id?ativos:ativos.filter(a=>a.empresa_id?.toString()===formData.empresa_id),[ativos,formData.empresa_id]);
    const filtInfra   = useMemo(()=>!formData.empresa_id?infraestruturas:infraestruturas.filter(i=>i.empresa_id?.toString()===formData.empresa_id),[infraestruturas,formData.empresa_id]);
    const filtLocs    = useMemo(()=>!formData.empresa_id?localizacoes:localizacoes.filter(l=>l.empresa_id?.toString()===formData.empresa_id),[localizacoes,formData.empresa_id]);

    const recAtivos   = useMemo(()=>!recForm.empresa_id?ativos:ativos.filter(a=>a.empresa_id?.toString()===recForm.empresa_id),[ativos,recForm.empresa_id]);
    const recInfra    = useMemo(()=>!recForm.empresa_id?infraestruturas:infraestruturas.filter(i=>i.empresa_id?.toString()===recForm.empresa_id),[infraestruturas,recForm.empresa_id]);

    const needsDiaSemana = ['semanal','quinzenal'].includes(recForm.frequencia);
    const needsDiaMes    = ['mensal','bimestral','trimestral','semestral','anual'].includes(recForm.frequencia);

    return (
        <div className="flex h-full" style={{minHeight:'calc(100vh - 64px)'}}>
            {/* ── COLUNA PRINCIPAL ── */}
            <div className={`flex-1 p-4 md:p-6 space-y-5 transition-all duration-300 ${isPanelOpen?'mr-[480px]':''}`}>

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            <FaTools className="text-primary"/> Gestão de Chamados
                        </h1>
                        <p className="text-slate-500 text-sm mt-0.5">{filteredChamados.length} chamado(s) encontrado(s)</p>
                    </div>
                    {/* Botões do cabeçalho */}
                    <div className="flex items-center gap-2">
                        {!isSelfService && (
                            <div className="relative" ref={acDropRef}>
                                <button
                                    onClick={() => setAcDropOpen(o => !o)}
                                    className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold transition-all"
                                >
                                    <FaListAlt size={14}/> Ações <FaCaretDown size={12}/>
                                </button>

                                {acDropOpen && (
                                    <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 min-w-[230px] overflow-hidden">
                                        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ações Disponíveis</p>
                                        </div>
                                        <button
                                            onClick={handleOpenRecModal}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                                        >
                                            <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
                                                <FaSync size={13} className="text-indigo-600"/>
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-sm">Chamados Recorrentes</p>
                                                <p className="text-[10px] text-slate-400">Criar e gerenciar recorrências</p>
                                            </div>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {can('chamados','criar') && (
                        <button
                            onClick={() => handleOpenModal()}
                            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
                        >
                            <FaPlus/> Novo Chamado
                        </button>
                        )}
                    </div>
                </div>

                {/* Filtros */}

                <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-3 items-center">
                    <div className="flex-1 min-w-[180px] relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13}/>
                        <input type="text" placeholder="Buscar por título ou ID..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
                    </div>
                    <select className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
                        <option value="Não Encerrados">Não Encerrados</option>
                        <option value="Todos">Todos os Status</option>
                        <option value="Aberto">Aberto</option>
                        <option value="Em Atendimento">Em Atendimento</option>
                        <option value="Concluído">Concluído</option>
                        <option value="Cancelado">Cancelado</option>
                    </select>
                    <select className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium" value={tipoFilter} onChange={e=>setTipoFilter(e.target.value)}>
                        <option value="Todos">Todos os Tipos</option>
                        <option value="maquinario">Maquinário</option>
                        <option value="infraestrutura">Infraestrutura</option>
                    </select>

                    {!isSelfService && (
                        <select className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium" value={empresaFilter} onChange={e=>setEmpresaFilter(e.target.value)}>
                            <option value="Todas">Todas as Empresas</option>
                            {empresas.map(e=><option key={e.id} value={e.id.toString()}>{e.nome}</option>)}
                        </select>
                    )}
                </div>

                {/* Tabela */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="px-4 py-3 w-6"></th>
                                    <th className="px-4 py-3">ID / Título</th>
                                    <th className="px-4 py-3">Tipo / Item</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Prioridade</th>
                                    <th className="px-4 py-3">Abertura</th>
                                    <th className="px-4 py-3">Valor</th>
                                    <th className="px-4 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredChamados.map(c=>{
                                    const isActive=selectedChamado?.id===c.id&&isPanelOpen;
                                    const sCfg=statusConfig[c.status]||statusConfig['Aberto'];
                                    return (
                                        <tr key={c.id} onClick={()=>handleOpenPanel(c)}
                                            className={`cursor-pointer transition-colors ${isActive?'bg-primary/5 border-l-4 border-primary':'hover:bg-slate-50/70'}`}>
                                            <td className="pl-4 pr-0"><div className={`w-2 h-2 rounded-full mx-auto ${sCfg.dot}`}/></td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-primary">#{c.id}</span>
                                                    <span className="text-sm font-semibold text-slate-700 max-w-[220px] truncate">{c.titulo}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium">{c.empresa_nome||'—'}</span>
                                                    <span className="text-[10px] text-slate-500">Req.: {c.usuario_solicitante_nome||'—'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1">
                                                    <TipoBadge tipo={c.tipo}/>
                                                    <span className="text-xs font-semibold text-slate-600 max-w-[160px] truncate">
                                                        {c.tipo==='infraestrutura'?(c.infraestrutura_nome||'—'):(c.ativo_nome||'—')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3"><StatusBadge status={c.status}/></td>
                                            <td className="px-4 py-3"><span className={`text-xs font-bold ${critConfig[c.criticidade_real]||'text-slate-400'}`}>{c.criticidade_real||'—'}</span></td>
                                            <td className="px-4 py-3"><span className="text-xs text-slate-500">{fmtDate(c.created_at)}</span></td>
                                            <td className="px-4 py-3"><span className="text-xs font-bold text-slate-700">{fmtCurrency(c.valor_total)}</span></td>
                                            <td className="px-4 py-3 text-right" onClick={e=>e.stopPropagation()}>
                                                <div className="flex justify-end gap-1">
                                                    <button onClick={()=>handleOpenPanel(c)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg" title="Detalhes">
                                                        <FaEye size={14}/>
                                                    </button>

                                                    {!isSelfService && (
                                                        <>
                                                            {can('chamados','editar') && (
                                                            <button onClick={()=>handleOpenModal(c)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg" title="Editar">
                                                                <FaEdit size={14}/>
                                                            </button>
                                                            )}
                                                            {can('chamados','excluir') && (
                                                            <button onClick={()=>handleDelete(c.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Excluir">
                                                                <FaTrashAlt size={14}/>
                                                            </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredChamados.length===0 && (
                                    <tr><td colSpan={8} className="p-12 text-center text-slate-400">
                                        <FaTools className="mx-auto mb-3 text-slate-200" size={32}/>
                                        <p className="font-medium">Nenhum chamado encontrado</p>
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ── PAINEL LATERAL ── */}
            {isPanelOpen && selectedChamado && (
                <div className="fixed top-0 right-0 h-full w-[480px] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-40 overflow-hidden">
                    <div className="bg-slate-800 text-white px-5 py-4 flex items-start justify-between gap-3 shrink-0">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">#{selectedChamado.id}</span>
                                <TipoBadge tipo={selectedChamado.tipo}/>
                            </div>
                            <h2 className="text-base font-bold text-white leading-snug line-clamp-2">{selectedChamado.titulo}</h2>
                        </div>
                        <button onClick={handleClosePanel} className="p-1.5 hover:bg-white/10 rounded-lg shrink-0"><FaTimes size={16}/></button>
                    </div>

                    <div className="bg-slate-700 px-5 py-2.5 flex items-center gap-2 shrink-0 flex-wrap">
                        {!isSelfService && ['Aberto','Em Atendimento','Concluído','Cancelado'].map(st=>{
                            const cfg=statusConfig[st];
                            const isA=selectedChamado.status===st;
                            return (
                                <button key={st} onClick={()=>handleQuickStatus(selectedChamado,st)}
                                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all flex items-center gap-1 ${isA?`${cfg.bg} ${cfg.text} ${cfg.border}`:'bg-slate-600 text-slate-300 border-slate-500 hover:bg-slate-500'}`}>
                                    {cfg.icon} {st}
                                </button>
                            );
                        })}

                        {!isSelfService && (
                            <div className="ml-auto flex gap-1">
                                {can('chamados','editar') && (
                                <button onClick={()=>handleOpenModal(selectedChamado)} className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-600 rounded-lg">
                                    <FaEdit size={13}/>
                                </button>
                                )}
                                {can('chamados','excluir') && (
                                <button onClick={()=>handleDelete(selectedChamado.id)} className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-slate-600 rounded-lg">
                                    <FaTrashAlt size={13}/>
                                </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex border-b border-slate-200 shrink-0 bg-white">
                        {[['detalhes','Detalhes',<FaInfoCircle size={12}/>],['observacoes',`Observações (${observacoes.length})`,<FaComment size={12}/>],['financeiro','Financeiro',<FaDollarSign size={12}/>]].map(([tab,label,icon])=>(
                            <button key={tab} onClick={()=>setActiveTab(tab)}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold border-b-2 transition-all ${activeTab===tab?'border-primary text-primary':'border-transparent text-slate-400 hover:text-slate-600'}`}>
                                {icon} {label}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {activeTab==='detalhes' && (
                            <div className="p-5 space-y-4">
                                {selectedChamado.descricao && <div className="p-4 bg-slate-50 rounded-xl border border-slate-200"><p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Descrição</p><p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedChamado.descricao}</p></div>}
                                {selectedChamado.opcoes_selecionadas?.length>0 && <div><p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Problemas Reportados</p><div className="flex flex-wrap gap-1.5">{selectedChamado.opcoes_selecionadas.map((op,i)=><span key={i} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-medium">{op}</span>)}</div></div>}
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        ['Status',<StatusBadge status={selectedChamado.status}/>],
                                        ['Empresa',selectedChamado.empresa_nome||'—'],
                                        ['Requerente',selectedChamado.usuario_solicitante_nome||'—'],
                                        ['Localização',selectedChamado.localizacao_nome||'—'],
                                        ['Categoria',selectedChamado.categoria_nome||'—'],
                                        ['Prior. Informada',<span className="text-xs text-slate-500">{selectedChamado.criticidade_informada||'—'}</span>],
                                        ['Prior. Real',<span className={`text-xs font-bold ${critConfig[selectedChamado.criticidade_real]||'text-slate-400'}`}>{selectedChamado.criticidade_real||'—'}</span>],
                                        ['Fornecedor',selectedChamado.fornecedor_nome||'—'],
                                        ['Contrato',selectedChamado.contrato_nome||'—'],
                                        ['Valor Total',<span className="text-xs font-bold text-emerald-600">{fmtCurrency(selectedChamado.valor_total)}</span>],
                                        ['Abertura',<span className="text-xs">{fmtDateF(selectedChamado.created_at)}</span>],
                                    ].map(([label,val],i)=>(
                                        <div key={i} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">{label}</p>
                                            {typeof val==='string'?<p className="text-xs font-semibold text-slate-700 truncate">{val}</p>:val}
                                        </div>
                                    ))}
                                </div>
                                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                    <p className="text-[10px] font-bold text-blue-400 uppercase mb-1">{selectedChamado.tipo==='infraestrutura'?'🏗️ Infraestrutura':'🔧 Equipamento'}</p>
                                    <p className="text-sm font-bold text-blue-800">{selectedChamado.tipo==='infraestrutura'?(selectedChamado.infraestrutura_nome||'—'):(selectedChamado.ativo_nome||'—')}</p>
                                </div>
                                {selectedChamado.anexos?.length>0 && <div><p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Anexos</p><div className="space-y-2">{selectedChamado.anexos.map((a,i)=><button key={i} onClick={()=>openSecureFile(a.path||a.url)} className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-primary/30 hover:bg-primary/5 transition-all"><FaPaperclip className="text-primary shrink-0" size={12}/><span className="text-xs font-medium text-slate-600 truncate">{a.name||a.filename}</span><FaEye className="text-slate-300 shrink-0 ml-auto" size={12}/></button>)}</div></div>}
                            </div>
                        )}

                        {activeTab==='observacoes' && (
                            <div className="flex flex-col h-full">
                                <div className="flex-1 p-5 space-y-4 overflow-y-auto">
                                    {loadingObs && <div className="text-center py-8 text-slate-400 text-sm">Carregando...</div>}
                                    {!loadingObs&&observacoes.length===0 && <div className="text-center py-12"><FaComment className="mx-auto mb-3 text-slate-200" size={32}/><p className="text-sm font-medium text-slate-400">Nenhuma observação ainda</p></div>}
                                    {observacoes.map(obs=>{
                                        const cfg=obsTypeConfig[obs.tipo]||obsTypeConfig['observacao'];
                                        const isOwn=obs.usuario_nome===user?.username;
                                        return <div key={obs.id} className={`flex gap-3 ${isOwn?'flex-row-reverse':''}`}>
                                            <Avatar nome={obs.usuario_nome} size="sm"/>
                                            <div className={`flex-1 max-w-[85%] flex flex-col gap-1 ${isOwn?'items-end':'items-start'}`}>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-slate-500">{obs.usuario_nome}</span>
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                                                    <span className="text-[9px] text-slate-300">{fmtDate(obs.created_at)}</span>
                                                </div>
                                                <div className={`p-3 rounded-2xl border text-sm text-slate-700 leading-relaxed whitespace-pre-wrap w-full ${cfg.bg} ${cfg.border} ${isOwn?'rounded-tr-none':'rounded-tl-none'}`}>{obs.texto}</div>
                                                {!isSelfService && (isOwn || user?.role==='admin') && (
                                                    <button onClick={()=>handleDeleteObs(obs.id)} className="text-[9px] text-slate-300 hover:text-red-400">excluir</button>
                                                )}
                                            </div>
                                        </div>;
                                    })}
                                    <div ref={obsEndRef}/>
                                </div>

                                <div className="border-t border-slate-200 p-4 bg-white shrink-0">
                                    <div className="flex gap-2 mb-2">
                                        {[['observacao','💬 Observação'],['solucao','✅ Solução']].map(([val,label])=>(
                                            <button key={val} onClick={()=>setTipoObs(val)}
                                                className={`text-[10px] font-bold px-3 py-1 rounded-full border transition-all ${tipoObs===val?(val==='solucao'?'bg-green-100 text-green-700 border-green-300':'bg-slate-100 text-slate-700 border-slate-300'):'text-slate-400 border-slate-200 hover:border-slate-300'}`}>
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <Avatar nome={user?.username} size="sm"/>
                                        <div className="flex-1">
                                            <textarea rows={3} placeholder="Digite sua observação... (Ctrl+Enter para enviar)"
                                                className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                                                value={novaObs} onChange={e=>setNovaObs(e.target.value)}
                                                onKeyDown={e=>{if(e.key==='Enter'&&e.ctrlKey) handleSaveObs();}}/>
                                        </div>
                                        <button onClick={handleSaveObs} disabled={!novaObs.trim()||savingObs}
                                            className="p-3 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
                                            {savingObs?<FaClock size={16}/>:<FaReply size={16}/>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab==='financeiro' && (
                            <div className="p-5 space-y-4">

                                {/* Header */}
                                <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                                    <FaDollarSign className="text-emerald-600 shrink-0" size={22}/>
                                    <div>
                                        <p className="text-sm font-bold text-emerald-800">Painel Financeiro</p>
                                        <p className="text-xs text-emerald-600">Envie NF e Boleto para o setor financeiro</p>
                                    </div>
                                </div>

                                {/* Clínica read-only */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clínica</label>
                                    <div className="px-3 py-2.5 bg-slate-100 rounded-xl text-sm text-slate-700 font-semibold border border-slate-200">
                                        {selectedChamado.empresa_nome || '—'}
                                    </div>
                                </div>

                                {/* Checkbox anexar */}
                                <label className="flex items-center gap-3 p-3.5 bg-white border-2 border-slate-200 rounded-xl cursor-pointer hover:border-emerald-300 transition-all select-none">
                                    <input type="checkbox" checked={finForm.anexar}
                                        onChange={e=>setFinForm({...finForm,anexar:e.target.checked,nf:null,boleto:null})}
                                        className="w-4 h-4 accent-emerald-600 cursor-pointer shrink-0"/>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-700">Anexar NF e Boleto</p>
                                        <p className="text-xs text-slate-400">Opcional — inclui PDFs no email</p>
                                    </div>
                                </label>

                                {finForm.anexar && (
                                    <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">

                                        {/* Upload NF */}
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nota Fiscal (PDF)</label>
                                            <label className="flex items-center gap-3 p-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-all">
                                                <FaPaperclip className={finForm.nf?'text-emerald-500':'text-slate-300'} size={14}/>
                                                <span className={`text-xs truncate flex-1 ${finForm.nf?'text-emerald-700 font-semibold':'text-slate-400'}`}>
                                                    {finForm.nf ? finForm.nf.name : 'Clique para selecionar NF (PDF)'}
                                                </span>
                                                {finForm.nf && <FaCheck className="text-emerald-500 shrink-0" size={11}/>}
                                                <input type="file" accept=".pdf,application/pdf" className="hidden"
                                                    onChange={e=>{if(e.target.files[0])setFinForm({...finForm,nf:e.target.files[0]})}}/>
                                            </label>
                                            {finExtracted?.nf && Object.keys(finExtracted.nf).some(k=>k!=='text_preview') && (
                                                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 space-y-1">
                                                    <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mb-2">✨ Dados extraídos da NF</p>
                                                    {Object.entries(finExtracted.nf).filter(([k])=>k!=='text_preview').map(([k,v])=>(
                                                        <div key={k} className="flex gap-2 text-xs">
                                                            <span className="text-slate-500 font-semibold w-24 shrink-0">{k}:</span>
                                                            <span className="text-slate-700">{v}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* PDF NF salvo */}
                                        {selectedChamado?.fin_anexos?.find(a=>a.tipo==='nf') && (
                                            <a href="#" onClick={(e)=>{e.preventDefault();openSecureFile(selectedChamado.fin_anexos.find(a=>a.tipo==='nf').path);}}
                                               rel="noopener noreferrer"
                                               className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 hover:bg-emerald-100 transition-all">
                                                <FaPaperclip size={11}/> 📄 NF salva: {selectedChamado.fin_anexos.find(a=>a.tipo==='nf').nome}
                                            </a>
                                        )}

                                        {/* Upload Boleto */}
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Boleto (PDF)</label>
                                            <label className="flex items-center gap-3 p-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-all">
                                                <FaPaperclip className={finForm.boleto?'text-emerald-500':'text-slate-300'} size={14}/>
                                                <span className={`text-xs truncate flex-1 ${finForm.boleto?'text-emerald-700 font-semibold':'text-slate-400'}`}>
                                                    {finForm.boleto ? finForm.boleto.name : 'Clique para selecionar Boleto (PDF)'}
                                                </span>
                                                {finForm.boleto && <FaCheck className="text-emerald-500 shrink-0" size={11}/>}
                                                <input type="file" accept=".pdf,application/pdf" className="hidden"
                                                    onChange={e=>{if(e.target.files[0])setFinForm({...finForm,boleto:e.target.files[0]})}}/>
                                            </label>
                                            {finExtracted?.boleto && Object.keys(finExtracted.boleto).some(k=>k!=='text_preview') && (
                                                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 space-y-1">
                                                    <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mb-2">✨ Dados extraídos do Boleto</p>
                                                    {Object.entries(finExtracted.boleto).filter(([k])=>k!=='text_preview').map(([k,v])=>(
                                                        <div key={k} className="flex gap-2 text-xs">
                                                            <span className="text-slate-500 font-semibold w-24 shrink-0">{k}:</span>
                                                            <span className="text-slate-700">{v}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        {/* PDF Boleto salvo */}
                                        {selectedChamado?.fin_anexos?.find(a=>a.tipo==='boleto') && (
                                            <a href="#" onClick={(e)=>{e.preventDefault();openSecureFile(selectedChamado.fin_anexos.find(a=>a.tipo==='boleto').path);}}
                                               rel="noopener noreferrer"
                                               className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 hover:bg-emerald-100 transition-all">
                                                <FaPaperclip size={11}/> 📄 Boleto salvo: {selectedChamado.fin_anexos.find(a=>a.tipo==='boleto').nome}
                                            </a>
                                        )}
                                    </div>
                                )}

                                {/* Conta de envio automática */}
                                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                                    <FaCheck className="text-emerald-500 shrink-0" size={11}/>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-600">Conta de envio: manutencoes@digimaxdiagnostico.com.br</p>
                                        <p className="text-[10px] text-slate-400">Configurada automaticamente pelo sistema</p>
                                    </div>
                                </div>

                                {/* Fornecedor */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fornecedor do Boleto / NF *</label>
                                    {(() => {
                                        const fnsVinculados = fornecedores.filter(f =>
                                            (selectedChamado?.fornecedores_ids||[]).map(Number).includes(Number(f.id))
                                        );
                                        return fnsVinculados.length > 0 ? (
                                            <select
                                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 transition"
                                                value={finForm.fornecedor}
                                                onChange={e=>setFinForm({...finForm,fornecedor:e.target.value})}>
                                                <option value="">Selecione o fornecedor...</option>
                                                {fnsVinculados.map(f=>(
                                                    <option key={f.id} value={f.nome}>{f.nome}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 transition"
                                                placeholder="Nome do fornecedor..."
                                                value={finForm.fornecedor}
                                                onChange={e=>setFinForm({...finForm,fornecedor:e.target.value})}/>
                                        );
                                    })()}
                                </div>

                                {/* Forma de Pagamento */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Forma de Pagamento</label>
                                    <select
                                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 transition"
                                        value={finForm.forma_pagamento}
                                        onChange={e=>setFinForm({...finForm,forma_pagamento:e.target.value})}>
                                        <option value="PIX">PIX</option>
                                        <option value="Boleto Bancário">Boleto Bancário</option>
                                        <option value="Transferência (TED/DOC)">Transferência (TED/DOC)</option>
                                        <option value="Cartão de Crédito">Cartão de Crédito</option>
                                        <option value="Cartão de Débito">Cartão de Débito</option>
                                        <option value="Dinheiro">Dinheiro</option>
                                        <option value="Cheque">Cheque</option>
                                    </select>
                                </div>

                                {/* Observação */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Observação (opcional)</label>
                                    <textarea rows={3}
                                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-300 resize-none transition"
                                        placeholder="Informações adicionais para o financeiro..."
                                        value={finForm.observacao}
                                        onChange={e=>setFinForm({...finForm,observacao:e.target.value})}/>
                                </div>

                                {/* Feedback */}
                                {finMsg && (
                                    <div className={`p-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${finMsg.type==='success'?'bg-emerald-50 text-emerald-700 border border-emerald-200':'bg-red-50 text-red-700 border border-red-200'}`}>
                                        {finMsg.type==='success'?<FaCheck size={13}/>:<FaTimes size={13}/>}
                                        {finMsg.text}
                                    </div>
                                )}

                                {/* Botões salvar / enviar */}
                                <div className="flex gap-2">
                                    <button onClick={handleSalvarFinanceiro}
                                        disabled={finSending||!finForm.fornecedor.trim()}
                                        className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-bold text-sm hover:bg-slate-800 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all">
                                        {finSending
                                            ? <><FaClock size={13} className="animate-spin"/> Salvando...</>
                                            : <><FaCheck size={13}/> Salvar</>
                                        }
                                    </button>
                                    <button onClick={handleEnviarFinanceiro}
                                        disabled={finSending||!finForm.fornecedor.trim()}
                                        className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-sm shadow-emerald-200">
                                        {finSending
                                            ? <><FaClock size={13} className="animate-spin"/> Enviando...</>
                                            : <><FaDollarSign size={13}/> Enviar Email</>
                                        }
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 text-center">
                                    financeiro@ - controlefinanceiro@ - manutencao@ - manutencao02@ - expansao@
                                </p>

                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════
                MODAL DE RECORRÊNCIAS
            ══════════════════════════════════════════════ */}
                        {isRecModalOpen && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">

                        <div className="bg-indigo-700 text-white px-6 py-4 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
                                    <FaSync size={18}/>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold">Chamados Recorrentes</h2>
                                    <p className="text-indigo-200 text-xs">Automatize a criação periódica de chamados de manutenção</p>
                                </div>
                            </div>
                            <button onClick={()=>setIsRecModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl"><FaTimes size={18}/></button>
                        </div>

                        <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
                            <button onClick={()=>{setRecTab('lista');setEditingRec(null);resetRecForm();}}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold border-b-2 transition-all ${recTab==='lista'?'border-indigo-600 text-indigo-700 bg-white':'border-transparent text-slate-500 hover:text-slate-700'}`}>
                                <FaListAlt size={13}/> Lista de Recorrências
                                {recorrencias.length>0 && <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{recorrencias.length}</span>}
                            </button>
                            <button onClick={()=>setRecTab('novo')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold border-b-2 transition-all ${recTab==='novo'?'border-indigo-600 text-indigo-700 bg-white':'border-transparent text-slate-500 hover:text-slate-700'}`}>
                                <FaPlus size={13}/> {editingRec?'Editar Recorrência':'Nova Recorrência'}
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {recTab==='lista' && (
                                <div className="p-6">
                                    {recorrencias.length===0 ? (
                                        <div className="text-center py-16">
                                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                <FaSync className="text-indigo-300" size={28}/>
                                            </div>
                                            <p className="font-bold text-slate-500">Nenhuma recorrência cadastrada</p>
                                            <p className="text-sm text-slate-400 mt-1">Clique em "Nova Recorrência" para começar</p>
                                            <button onClick={()=>setRecTab('novo')}
                                                className="mt-4 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all">
                                                <FaPlus className="inline mr-2"/>Criar primeira recorrência
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {recorrencias.map(rec=>{
                                                const freqLabel = FREQ_OPTIONS.find(f=>f.value===rec.frequencia)?.label || rec.frequencia;
                                                return (
                                                    <div key={rec.id}
                                                        className={`border-2 rounded-2xl overflow-hidden transition-all ${rec.ativo?'border-slate-200 hover:border-indigo-200':'border-slate-100 opacity-60'}`}>
                                                        <div className={`px-5 py-4 flex items-start justify-between gap-4 ${rec.ativo?'bg-white':'bg-slate-50'}`}>
                                                            <div className="flex items-start gap-4 flex-1 min-w-0">
                                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${rec.ativo?'bg-indigo-100':'bg-slate-100'}`}>
                                                                    <FaSync className={rec.ativo?'text-indigo-600':'text-slate-400'} size={18}/>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                                        <h3 className="font-bold text-slate-800 text-sm truncate">{rec.titulo}</h3>
                                                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${rec.ativo?'bg-green-50 text-green-700 border-green-200':'bg-slate-100 text-slate-400 border-slate-200'}`}>
                                                                            {rec.ativo?'Ativa':'Pausada'}
                                                                        </span>
                                                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                                            {freqLabel}
                                                                        </span>
                                                                        <TipoBadge tipo={rec.tipo}/>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-500">
                                                                        {rec.empresa_nome && <span>🏢 {rec.empresa_nome}</span>}
                                                                        {rec.ativo_nome && <span>🔧 {rec.ativo_nome}</span>}
                                                                        {rec.infraestrutura_nome && <span>🏗️ {rec.infraestrutura_nome}</span>}
                                                                        {rec.fornecedor_nome && <span>🚚 {rec.fornecedor_nome}</span>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                <button onClick={()=>handleExecutarRec(rec)} title="Gerar chamado agora"
                                                                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all">
                                                                    <FaPlay size={13}/>
                                                                </button>
                                                                <button onClick={()=>handleToggleRec(rec)} title={rec.ativo?'Pausar':'Ativar'}
                                                                    className={`p-2 rounded-xl transition-all ${rec.ativo?'text-amber-500 hover:bg-amber-50':'text-green-600 hover:bg-green-50'}`}>
                                                                    {rec.ativo?<FaPause size={13}/>:<FaPlay size={13}/>}
                                                                </button>
                                                                <button onClick={()=>handleEditRec(rec)}
                                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                                                                    <FaEdit size={13}/>
                                                                </button>
                                                                <button onClick={()=>handleDeleteRec(rec.id)}
                                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                                                    <FaTrashAlt size={13}/>
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="px-5 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                                                            <div className="flex items-center gap-4 text-[11px] text-slate-400">
                                                                <span className="flex items-center gap-1">
                                                                    <FaCalendarAlt size={10}/> Próxima: <strong className="text-slate-600">{rec.proxima_execucao ? fmtDate(rec.proxima_execucao) : '—'}</strong>
                                                                </span>
                                                                {rec.ultima_execucao && <span>Última: <strong className="text-slate-600">{fmtDate(rec.ultima_execucao)}</strong></span>}
                                                            </div>
                                                            <span className="text-[11px] text-indigo-500 font-bold">{rec.total_gerado} chamado(s) gerado(s)</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {recTab==='novo' && (
                                <div className="p-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <div className="space-y-5">
                                            <div>
                                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Identificação do Chamado</h3>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Título do Chamado *</label>
                                                        <input type="text" placeholder="Ex: Manutenção Preventiva Mensal"
                                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400"
                                                            value={recForm.titulo} onChange={e=>setRecForm({...recForm,titulo:e.target.value})}/>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Descrição</label>
                                                        <textarea rows={3} placeholder="Detalhes do chamado a ser gerado..."
                                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 resize-none text-sm"
                                                            value={recForm.descricao} onChange={e=>setRecForm({...recForm,descricao:e.target.value})}/>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tipo</label>
                                                            <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                                                                value={recForm.tipo} onChange={e=>setRecForm({...recForm,tipo:e.target.value,ativo_id:'',infraestrutura_id:''})}>
                                                                <option value="maquinario">🔧 Maquinário</option>
                                                                <option value="infraestrutura">🏗️ Infraestrutura</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Prioridade</label>
                                                            <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                                                                value={recForm.criticidade_real} onChange={e=>setRecForm({...recForm,criticidade_real:e.target.value})}>
                                                                {CRITICIDADES.map(c=><option key={c}>{c}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Empresa *</label>
                                                        <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                                                            value={recForm.empresa_id} onChange={e=>setRecForm({...recForm,empresa_id:e.target.value,ativo_id:'',infraestrutura_id:''})}>
                                                            <option value="">Selecione...</option>
                                                            {empresas.map(e=><option key={e.id} value={e.id.toString()}>{e.nome}</option>)}
                                                        </select>
                                                    </div>
                                                    {recForm.tipo==='maquinario' ? (
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Ativo / Equipamento</label>
                                                            <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                                                                value={recForm.ativo_id} onChange={e=>setRecForm({...recForm,ativo_id:e.target.value})}>
                                                                <option value="">Selecione...</option>
                                                                {recAtivos.map(a=><option key={a.id} value={a.id.toString()}>{a.nome}</option>)}
                                                            </select>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Infraestrutura</label>
                                                            <select className="w-full px-4 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                                                                value={recForm.infraestrutura_id} onChange={e=>setRecForm({...recForm,infrastrutur_id:e.target.value})}>
                                                                <option value="">Selecione...</option>
                                                                {recInfra.map(i=><option key={i.id} value={i.id.toString()}>{i.nome}</option>)}
                                                            </select>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Fornecedor</label>
                                                        <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                                                            value={recForm.fornecedor_id} onChange={e=>setRecForm({...recForm,fornecedor_id:e.target.value})}>
                                                            <option value="">Selecione...</option>
                                                            {fornecedores.map(f=><option key={f.id} value={f.id.toString()}>{f.nome}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-5">
                                            <div>
                                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Configuração de Recorrência</h3>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Frequência *</label>
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {FREQ_OPTIONS.map(f=>(
                                                                <button key={f.value} type="button"
                                                                    onClick={()=>setRecForm({...recForm,frequencia:f.value})}
                                                                    className={`py-2 px-2 rounded-xl text-xs font-bold border-2 transition-all ${recForm.frequencia===f.value?'border-indigo-500 bg-indigo-50 text-indigo-700':'border-slate-200 bg-white text-slate-500 hover:border-indigo-200'}`}>
                                                                    {f.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {needsDiaSemana && (
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Dia da Semana</label>
                                                            <div className="grid grid-cols-7 gap-1">
                                                                {DIAS_SEMANA.map((d,i)=>(
                                                                    <button key={i} type="button"
                                                                        onClick={()=>setRecForm({...recForm,dia_semana:i})}
                                                                        className={`py-2 rounded-xl text-[10px] font-bold border-2 transition-all ${recForm.dia_semana===i?'border-indigo-500 bg-indigo-50 text-indigo-700':'border-slate-200 bg-white text-slate-500 hover:border-indigo-200'}`}>
                                                                        {d.slice(0,3)}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {needsDiaMes && (
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Dia do Mês</label>
                                                            <div className="flex items-center gap-3">
                                                                <input type="range" min={1} max={28} value={recForm.dia_mes}
                                                                    onChange={e=>setRecForm({...recForm,dia_mes:parseInt(e.target.value)})}
                                                                    className="flex-1 accent-indigo-600"/>
                                                                <span className="w-10 h-10 bg-indigo-100 text-indigo-700 font-black rounded-xl flex items-center justify-center text-sm shrink-0">{recForm.dia_mes}</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Hora de Geração</label>
                                                            <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                                                                value={recForm.hora} onChange={e=>setRecForm({...recForm,hora:parseInt(e.target.value)})}>
                                                                {Array.from({length:24},(_,i)=><option key={i} value={i}>{String(i).padStart(2,'0')}:00</option>)}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Minuto</label>
                                                            <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                                                                value={recForm.minuto} onChange={e=>setRecForm({...recForm,minuto:parseInt(e.target.value)})}>
                                                                {[0,15,30,45].map(m=><option key={m} value={m}>{String(m).padStart(2,'0')}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Data Início *</label>
                                                            <input type="date" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                                                                value={recForm.data_inicio} onChange={e=>setRecForm({...recForm,data_inicio:e.target.value})}/>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Data Fim <span className="text-slate-300 font-normal">(opcional)</span></label>
                                                            <input type="date" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                                                                value={recForm.data_fim} onChange={e=>setRecForm({...recForm,data_fim:e.target.value})}/>
                                                        </div>
                                                    </div>

                                                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                                                        <p className="text-[10px] font-bold text-indigo-400 uppercase mb-2">📋 Resumo da Recorrência</p>
                                                        <p className="text-sm text-indigo-800 font-medium">
                                                            Chamado <strong>"{recForm.titulo||'sem título'}"</strong> será gerado{' '}
                                                            <strong>{FREQ_OPTIONS.find(f=>f.value===recForm.frequencia)?.label?.toLowerCase()}</strong>
                                                            {needsDiaSemana && <> toda <strong>{DIAS_SEMANA[recForm.dia_semana]}</strong></>}
                                                            {needsDiaMes && <> no dia <strong>{recForm.dia_mes}</strong> de cada {recForm.frequencia==='mensal'?'mês':recForm.frequencia==='bimestral'?'2 meses':recForm.frequencia==='trimestral'?'trimestre':recForm.frequencia==='semestral'?'semestre':'ano'}</>}
                                                            {' '}às <strong>{String(recForm.hora).padStart(2,'0')}:{String(recForm.minuto).padStart(2,'0')}</strong>.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
                                        <button type="button" onClick={()=>{setRecTab('lista');setEditingRec(null);resetRecForm();}}
                                            className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">Cancelar</button>
                                        <button type="button" onClick={handleSaveRec} disabled={savingRec||!recForm.titulo.trim()}
                                            className="px-10 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg disabled:opacity-40 flex items-center gap-2">
                                            <FaSync size={14}/> {savingRec?'Salvando...':(editingRec?'Salvar Alterações':'Criar Recorrência')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal Chamado (cadastro/edição) ── */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-800">{isEditing?`Editar Chamado #${currentChamado.id}`:'Abrir Novo Chamado'}</h2>
                            <button onClick={()=>setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><FaTimes/></button>
                        </div>
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8">
                            <div className="mb-8 border-2 border-blue-400 rounded-xl p-4 bg-blue-50">
                                <label className="block text-sm font-bold text-gray-700 mb-3">TIPO DE CHAMADO *</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.tipo==='maquinario'?'border-blue-600 bg-blue-100':'border-gray-300 bg-white hover:border-blue-300'}`}>
                                        <input type="radio" value="maquinario" checked={formData.tipo==='maquinario'} onChange={e=>setFormData({...formData,tipo:e.target.value,ativo_id:'',infraestrutura_id:''})} className="mr-2"/>
                                        <span className="font-bold"><FaIndustry className="inline mr-1 text-blue-600"/> Maquinário</span>
                                    </label>
                                    <label className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.tipo==='infraestrutura'?'border-indigo-600 bg-indigo-100':'border-gray-300 bg-white hover:border-indigo-300'}`}>
                                        <input type="radio" value="infraestrutura" checked={formData.tipo==='infraestrutura'} onChange={e=>setFormData({...formData,tipo:e.target.value,ativo_id:'',infraestrutura_id:''})} className="mr-2"/>
                                        <span className="font-bold"><FaLayerGroup className="inline mr-1 text-indigo-600"/> Infraestrutura</span>
                                    </label>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Informações do Problema</h3>
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-600 uppercase ml-1">Título *</label><input type="text" required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20" value={formData.titulo} onChange={e=>setFormData({...formData,titulo:e.target.value})}/></div>
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-600 uppercase ml-1">Descrição</label><textarea rows="4" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 resize-none" value={formData.descricao} onChange={e=>setFormData({...formData,descricao:e.target.value})}/></div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1"><label className="text-xs font-bold text-slate-600 uppercase ml-1">Status</label><select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20" value={formData.status} onChange={e=>setFormData({...formData,status:e.target.value})}><option>Aberto</option><option>Em Atendimento</option><option>Concluído</option><option>Cancelado</option></select></div>
                                            <div className="space-y-1"><label className="text-xs font-bold text-slate-600 uppercase ml-1">Criticidade Real</label><select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20" value={formData.criticidade_real} onChange={e=>setFormData({...formData,criticidade_real:e.target.value})}>{CRITICIDADES.map(c=><option key={c}>{c}</option>)}</select></div>
                                        </div>
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-600 uppercase ml-1">Criticidade Informada (QR)</label><input disabled className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed" value={formData.criticidade_informada}/></div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Vínculos e Ativos</h3>
                                        {formData.tipo==='maquinario'?(
                                            <div className="space-y-1"><label className="text-xs font-bold text-slate-600 uppercase ml-1"><FaIndustry className="inline text-blue-500 mr-1"/>Equipamento</label><select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20" value={formData.ativo_id} onChange={e=>handleAtivoChange(e.target.value)}><option value="">Selecione (Opcional)</option>{filtAtivos.map(a=><option key={a.id} value={a.id.toString()}>{a.nome} {a.numero_serie?`(S/N: ${a.numero_serie})`:''}</option>)}</select></div>
                                        ):(
                                            <div className="space-y-1"><label className="text-xs font-bold text-slate-600 uppercase ml-1"><FaLayerGroup className="inline text-indigo-500 mr-1"/>Infraestrutura</label><select className="w-full px-4 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-300" value={formData.infraestrutura_id} onChange={e=>setFormData({...formData,infraestrutura_id:e.target.value})}><option value="">Selecione (Opcional)</option>{filtInfra.map(i=><option key={i.id} value={i.id.toString()}>{i.nome}</option>)}</select></div>
                                        )}
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-600 uppercase ml-1">Empresa *</label>
                                            {isSelfService ? (
                                                <div className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-medium">
                                                    {empresas.find(e => e.id?.toString() === formData.empresa_id)?.nome || user?.empresa_nome || 'Empresa do usuário'}
                                                </div>
                                            ) : (
                                                <select required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20" value={formData.empresa_id} onChange={e=>setFormData({...formData,empresa_id:e.target.value})}>
                                                    <option value="">Selecione</option>
                                                    {empresas.map(e=><option key={e.id} value={e.id.toString()}>{e.nome}</option>)}
                                                </select>
                                            )}
                                        </div>
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-600 uppercase ml-1">Localização</label><select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20" value={formData.localizacao_id} onChange={e=>setFormData({...formData,localizacao_id:e.target.value})}><option value="">Selecione (Opcional)</option>{filtLocs.map(l=><option key={l.id} value={l.id.toString()}>{l.nome}</option>)}</select></div>
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-600 uppercase ml-1">Categoria</label><select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20" value={formData.categoria_id} onChange={e=>setFormData({...formData,categoria_id:e.target.value})}><option value="">Selecione (Opcional)</option>{categorias.map(c=><option key={c.id} value={c.id.toString()}>{c.nome}</option>)}</select></div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Custos e Fornecedores</h3>
                                        {(formData.orcamentos_ids||[]).length === 0 && (
                                        <div className="space-y-1">
                                          <label className="text-xs font-bold text-slate-600 uppercase ml-1">Valor Total (R$)</label>
                                          <input type="number" step="0.01" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                                            value={formData.valor_total} onChange={e=>setFormData({...formData,valor_total:parseFloat(e.target.value)||0})}/>
                                        </div>
                                        )}
                                        <FornecedorPicker fornecedores={fornecedores} selectedIds={formData.fornecedores_ids||[]} onChange={ids=>setFormData({...formData,fornecedores_ids:ids})}/>
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-600 uppercase ml-1">Contrato</label><select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20" value={formData.contrato_id} onChange={e=>setFormData({...formData,contrato_id:e.target.value})}><option value="">Selecione</option>{contratos.map(c=><option key={c.id} value={c.id.toString()}>{c.numero||c.nome}</option>)}</select></div>
                                        {/* Orçamentos — busca + chips */}
                                        <OrcamentoPicker
                                          orcamentos={orcamentos}
                                          selectedIds={formData.orcamentos_ids||[]}
                                          onChange={(ids, total) => setFormData(f => ({...f, orcamentos_ids: ids, valor_total: total}))}
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Anexos</h3>
                                        <div className="relative group">
                                            <input type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleFileUpload} disabled={uploading}/>
                                            <div className="h-28 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 bg-slate-50 group-hover:bg-primary/5 group-hover:border-primary/30 transition-all">
                                                <FaPaperclip className="text-slate-300 group-hover:text-primary" size={20}/>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">{uploading?'Enviando...':'Clique ou arraste arquivos'}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                            {formData.anexos.map((file,idx)=>(
                                                <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                    <div className="flex items-center gap-3 truncate"><FaPaperclip className="text-primary shrink-0" size={12}/><span className="text-xs font-bold text-slate-600 truncate">{file.name}</span></div>
                                                    <button type="button" onClick={()=>setFormData({...formData,anexos:formData.anexos.filter((_,i)=>i!==idx)})} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"><FaTimes size={12}/></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 flex justify-end gap-4">
                                <button type="button" onClick={()=>setIsModalOpen(false)} className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">Cancelar</button>
                                <button type="button" onClick={handleSubmit} disabled={isSaving} className="px-8 py-2.5 bg-primary text-white rounded-xl font-bold shadow-lg hover:bg-primary/90 disabled:opacity-50">{isSaving?'Salvando...':'Salvar Chamado'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chamados;
