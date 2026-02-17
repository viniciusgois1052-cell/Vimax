import React, { useState, useEffect } from 'react';
import { 
    FaEnvelope, FaServer, FaUser, FaLock, FaCalendarAlt, FaUsers, FaPaperPlane,
    FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaClock, FaBell
} from 'react-icons/fa';
import { AlertCircle, Send, TestTube } from 'lucide-react';

const ConfigEmail = () => {
    const [formData, setFormData] = useState({
        mail_server: '',
        mail_port: 587,
        mail_use_tls: true,
        mail_username: '',
        mail_password: '',
        mail_default_sender: '',
        alert_days_before: 30,
        alert_recipients: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testEmail, setTestEmail] = useState('');
    const [testing, setTesting] = useState(false);
    const [triggeringAlerts, setTriggeringAlerts] = useState(false);
    const [message, setMessage] = useState(null);

    const API_BASE = window.location.origin.includes('5173') 
        ? `${window.location.protocol}//${window.location.hostname}:5002`
        : window.location.origin;
    const API_URL = `${API_BASE}/api/config/email`;

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error('Erro ao buscar configurações');
            }
            const data = await response.json();
            setFormData(prev => ({
                ...prev,
                ...data,
                mail_password: '', // A senha nunca é preenchida do backend
            }));
            setLoading(false);
        } catch (error) {
            console.error('Erro de rede ao buscar configurações:', error);
            setMessage({ type: 'error', text: 'Erro ao carregar configurações de email.' });
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const response = await fetch(API_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao salvar configurações');
            }

            setMessage({ type: 'success', text: 'Configurações de email salvas com sucesso!' });
            setSaving(false);
            fetchConfig(); 

        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            setMessage({ type: 'error', text: error.message || 'Erro de rede ao salvar configurações.' });
            setSaving(false);
        }
    };

    const handleTestEmail = async () => {
        if (!testEmail) {
            setMessage({ type: 'warning', text: 'Por favor, insira um email de destino para o teste.' });
            return;
        }
        setTesting(true);
        setMessage(null);

        try {
            const response = await fetch(`${API_URL}/test-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ recipient: testEmail }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Falha no envio de teste.');
            }

            setMessage({ type: 'success', text: data.message });
            setTestEmail('');

        } catch (error) {
            console.error('Erro ao testar envio:', error);
            setMessage({ type: 'error', text: error.message || 'Erro de rede ao testar envio.' });
        } finally {
            setTesting(false);
        }
    };

    const handleTriggerAlerts = async () => {
        setTriggeringAlerts(true);
        setMessage(null);

        try {
            const response = await fetch(`${API_URL}/trigger-contract-alerts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao disparar alertas.');
            }

            setMessage({ type: 'success', text: data.message });

        } catch (error) {
            console.error('Erro ao disparar alertas:', error);
            setMessage({ type: 'error', text: error.message || 'Erro de rede ao disparar alertas.' });
        } finally {
            setTriggeringAlerts(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500 font-medium">Carregando configurações...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                    <FaEnvelope size={24} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Configuração de Email</h1>
                    <p className="text-slate-500 mt-1">Configure o servidor SMTP e alertas automáticos de vencimento de contratos</p>
                </div>
            </div>

            {/* Message Alert */}
            {message && (
                <div className={`p-4 rounded-xl border-l-4 flex items-start gap-3 ${
                    message.type === 'success' ? 'bg-green-50 border-green-500 text-green-700' :
                    message.type === 'error' ? 'bg-red-50 border-red-500 text-red-700' :
                    'bg-yellow-50 border-yellow-500 text-yellow-700'
                }`}>
                    {message.type === 'success' && <FaCheckCircle size={20} className="mt-0.5 flex-shrink-0" />}
                    {message.type === 'error' && <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />}
                    {message.type === 'warning' && <FaExclamationTriangle size={20} className="mt-0.5 flex-shrink-0" />}
                    <div>
                        <p className="font-semibold">{message.text}</p>
                    </div>
                </div>
            )}

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Configurações SMTP */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
                        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                            <FaServer className="text-primary" size={20} />
                            <h3 className="text-xl font-bold text-slate-800">Servidor SMTP</h3>
                        </div>
                        
                        <div className="space-y-2">
                            <label htmlFor="mail_server" className="block text-sm font-semibold text-slate-700">
                                Host do Servidor *
                            </label>
                            <input
                                type="text"
                                name="mail_server"
                                id="mail_server"
                                value={formData.mail_server}
                                onChange={handleChange}
                                required
                                placeholder="Ex: smtp.gmail.com"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                            <p className="text-xs text-slate-500">Endereço do servidor SMTP (ex: smtp.gmail.com, smtp.office365.com)</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="mail_port" className="block text-sm font-semibold text-slate-700">
                                    Porta *
                                </label>
                                <input
                                    type="number"
                                    name="mail_port"
                                    id="mail_port"
                                    value={formData.mail_port}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                                <p className="text-xs text-slate-500">Geralmente 587 (TLS) ou 465 (SSL)</p>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700">
                                    Segurança
                                </label>
                                <div className="flex items-center gap-2 pt-2">
                                    <input
                                        type="checkbox"
                                        name="mail_use_tls"
                                        id="mail_use_tls"
                                        checked={formData.mail_use_tls}
                                        onChange={handleChange}
                                        className="w-5 h-5 text-primary rounded border-slate-300"
                                    />
                                    <label htmlFor="mail_use_tls" className="text-sm text-slate-600">
                                        Usar TLS/SSL
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="mail_username" className="block text-sm font-semibold text-slate-700">
                                <FaUser className="inline mr-2" />Usuário (Email) *
                            </label>
                            <input
                                type="email"
                                name="mail_username"
                                id="mail_username"
                                value={formData.mail_username}
                                onChange={handleChange}
                                required
                                placeholder="seu.email@empresa.com"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="mail_password" className="block text-sm font-semibold text-slate-700">
                                <FaLock className="inline mr-2" />Senha *
                            </label>
                            <input
                                type="password"
                                name="mail_password"
                                id="mail_password"
                                value={formData.mail_password}
                                onChange={handleChange}
                                placeholder="Preencha apenas para alterar"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                            <p className="text-xs text-slate-500">Deixe em branco para manter a senha atual</p>
                        </div>
                    </div>

                    {/* Alertas e Remetente */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
                        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                            <FaBell className="text-primary" size={20} />
                            <h3 className="text-xl font-bold text-slate-800">Alertas e Remetente</h3>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="mail_default_sender" className="block text-sm font-semibold text-slate-700">
                                Email Remetente Padrão *
                            </label>
                            <input
                                type="email"
                                name="mail_default_sender"
                                id="mail_default_sender"
                                value={formData.mail_default_sender}
                                onChange={handleChange}
                                required
                                placeholder="noreply@empresa.com"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                            <p className="text-xs text-slate-500">Email que aparecerá como remetente nos alertas</p>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="alert_days_before" className="block text-sm font-semibold text-slate-700">
                                <FaCalendarAlt className="inline mr-2" />Dias antes do vencimento para alertar *
                            </label>
                            <input
                                type="number"
                                name="alert_days_before"
                                id="alert_days_before"
                                value={formData.alert_days_before}
                                onChange={handleChange}
                                required
                                min="1"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                            <p className="text-xs text-slate-500">Alertas serão enviados X dias antes do vencimento</p>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="alert_recipients" className="block text-sm font-semibold text-slate-700">
                                <FaUsers className="inline mr-2" />Destinatários do Alerta *
                            </label>
                            <textarea
                                name="alert_recipients"
                                id="alert_recipients"
                                rows="3"
                                value={formData.alert_recipients}
                                onChange={handleChange}
                                required
                                placeholder="email1@empresa.com, email2@empresa.com"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                            />
                            <p className="text-xs text-slate-500">Separe múltiplos emails com vírgula</p>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex gap-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-primary text-white rounded-xl font-bold shadow-lg hover:bg-primary/90 transition-all disabled:opacity-50 active:scale-95"
                    >
                        <FaPaperPlane size={18} />
                        {saving ? 'Salvando...' : 'Salvar Configurações'}
                    </button>
                </div>
            </form>

            {/* Test Email Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
                <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                    <TestTube size={20} className="text-blue-600" />
                    <h3 className="text-xl font-bold text-slate-800">Testar Configurações de Email</h3>
                </div>
                
                <p className="text-sm text-slate-600">
                    <FaInfoCircle className="inline mr-2 text-blue-600" />
                    Envie um email de teste para validar se as configurações de SMTP estão funcionando corretamente.
                </p>

                <div className="flex gap-3">
                    <input
                        type="email"
                        placeholder="Email de destino para o teste"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                    <button
                        onClick={handleTestEmail}
                        disabled={testing || !formData.mail_server}
                        className="flex items-center justify-center gap-2 py-3 px-6 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50 active:scale-95"
                    >
                        <Send size={18} />
                        {testing ? 'Enviando...' : 'Enviar Teste'}
                    </button>
                </div>
            </div>

            {/* Trigger Alerts Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
                <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                    <FaBell size={20} className="text-orange-600" />
                    <h3 className="text-xl font-bold text-slate-800">Disparar Alertas de Vencimento</h3>
                </div>
                
                <p className="text-sm text-slate-600">
                    <FaInfoCircle className="inline mr-2 text-orange-600" />
                    Clique para disparar manualmente a verificação de contratos próximos do vencimento. Normalmente, esta verificação é feita automaticamente.
                </p>

                <button
                    onClick={handleTriggerAlerts}
                    disabled={triggeringAlerts || !formData.mail_server}
                    className="flex items-center justify-center gap-2 py-3 px-6 bg-orange-600 text-white rounded-xl font-bold shadow-lg hover:bg-orange-700 transition-all disabled:opacity-50 active:scale-95"
                >
                    <FaClock size={18} />
                    {triggeringAlerts ? 'Disparando...' : 'Disparar Verificação Agora'}
                </button>
            </div>
        </div>
    );
};

export default ConfigEmail;
