import React, { useState, useEffect } from 'react';
import { FaEnvelope, FaServer, FaUser, FaLock, FaCalendarAlt, FaUsers, FaPaperPlane } from 'react-icons/fa';
import { toast } from 'react-toastify';

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
    const [testEmail, setTestEmail] = useState('');
    const [testing, setTesting] = useState(false);

    const API_URL = '/api/config/email';

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
            toast.error('Erro ao carregar configurações de email.');
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
        setLoading(true);

        try {
            const response = await fetch(API_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao salvar configurações');
            }

            toast.success('Configurações de email salvas com sucesso!');
            setLoading(false);
            fetchConfig(); 

        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            toast.error(error.message || 'Erro de rede ao salvar configurações.');
            setLoading(false);
        }
    };

    const handleTestEmail = async () => {
        if (!testEmail) {
            toast.warn('Por favor, insira um email de destino para o teste.');
            return;
        }
        setTesting(true);

        try {
            const response = await fetch(`${API_URL}/testar-envio`, {
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

            toast.success(data.message);

        } catch (error) {
            console.error('Erro ao testar envio:', error);
            toast.error(error.message || 'Erro de rede ao testar envio.');
        } finally {
            setTesting(false);
        }
    };

    if (loading) {
        return <div className="text-center py-10">Carregando configurações...</div>;
    }

    return (
        <div className="p-6 bg-white shadow-lg rounded-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                <FaEnvelope className="mr-2 text-indigo-600" /> Configuração de Email
            </h2>
            <p className="text-gray-600 mb-6">Configure o servidor SMTP para envio de alertas automáticos (ex: vencimento de contratos).</p>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Coluna 1: Configurações SMTP */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-indigo-600 border-b pb-2 mb-4">Servidor SMTP</h3>
                        
                        {/* Mail Server */}
                        <div>
                            <label htmlFor="mail_server" className="block text-sm font-medium text-gray-700 flex items-center">
                                <FaServer className="mr-1" /> Host do Servidor
                            </label>
                            <input
                                type="text"
                                name="mail_server"
                                id="mail_server"
                                value={formData.mail_server}
                                onChange={handleChange}
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                            />
                        </div>

                        {/* Mail Port */}
                        <div>
                            <label htmlFor="mail_port" className="block text-sm font-medium text-gray-700">
                                Porta
                            </label>
                            <input
                                type="number"
                                name="mail_port"
                                id="mail_port"
                                value={formData.mail_port}
                                onChange={handleChange}
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                            />
                        </div>

                        {/* Mail Use TLS */}
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                name="mail_use_tls"
                                id="mail_use_tls"
                                checked={formData.mail_use_tls}
                                onChange={handleChange}
                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                            />
                            <label htmlFor="mail_use_tls" className="ml-2 block text-sm font-medium text-gray-700">
                                Usar TLS/SSL
                            </label>
                        </div>

                        {/* Mail Username */}
                        <div>
                            <label htmlFor="mail_username" className="block text-sm font-medium text-gray-700 flex items-center">
                                <FaUser className="mr-1" /> Usuário (Email)
                            </label>
                            <input
                                type="email"
                                name="mail_username"
                                id="mail_username"
                                value={formData.mail_username}
                                onChange={handleChange}
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                            />
                        </div>

                        {/* Mail Password */}
                        <div>
                            <label htmlFor="mail_password" className="block text-sm font-medium text-gray-700 flex items-center">
                                <FaLock className="mr-1" /> Senha (Preencha apenas para alterar)
                            </label>
                            <input
                                type="password"
                                name="mail_password"
                                id="mail_password"
                                value={formData.mail_password}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                                placeholder="Deixe em branco para manter a senha atual"
                            />
                        </div>
                    </div>

                    {/* Coluna 2: Configurações de Alerta */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-indigo-600 border-b pb-2 mb-4">Alertas e Remetente</h3>

                        {/* Mail Default Sender */}
                        <div>
                            <label htmlFor="mail_default_sender" className="block text-sm font-medium text-gray-700">
                                Email Remetente Padrão
                            </label>
                            <input
                                type="email"
                                name="mail_default_sender"
                                id="mail_default_sender"
                                value={formData.mail_default_sender}
                                onChange={handleChange}
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                            />
                        </div>

                        {/* Alert Days Before */}
                        <div>
                            <label htmlFor="alert_days_before" className="block text-sm font-medium text-gray-700 flex items-center">
                                <FaCalendarAlt className="mr-1" /> Dias antes do vencimento para alertar
                            </label>
                            <input
                                type="number"
                                name="alert_days_before"
                                id="alert_days_before"
                                value={formData.alert_days_before}
                                onChange={handleChange}
                                required
                                min="1"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                            />
                        </div>

                        {/* Alert Recipients */}
                        <div>
                            <label htmlFor="alert_recipients" className="block text-sm font-medium text-gray-700 flex items-center">
                                <FaUsers className="mr-1" /> Destinatários do Alerta (separados por vírgula)
                            </label>
                            <textarea
                                name="alert_recipients"
                                id="alert_recipients"
                                rows="3"
                                value={formData.alert_recipients}
                                onChange={handleChange}
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                                placeholder="ex: email1@empresa.com, email2@empresa.com"
                            />
                        </div>
                    </div>
                </div>

                {/* Botão de Submissão */}
                <div className="pt-5">
                    <button
                        type="submit"
                        disabled={loading || testing}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        {loading ? 'Salvando...' : 'Salvar Configurações'}
                    </button>
                </div>
            </form>

            {/* Seção de Teste de Email */}
            <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-xl font-semibold text-green-600 border-b pb-2 mb-4">Testar Envio de Email</h3>
                <div className="flex space-x-4">
                    <input
                        type="email"
                        placeholder="Email de destino para o teste"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        className="flex-grow rounded-md border-gray-300 shadow-sm p-2 border"
                    />
                    <button
                        onClick={handleTestEmail}
                        disabled={testing || loading}
                        className="flex-shrink-0 flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                        <FaPaperPlane className="mr-2" />
                        {testing ? 'Enviando...' : 'Testar Envio'}
                    </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">Certifique-se de salvar as configurações antes de testar.</p>
            </div>
        </div>
    );
};

export default ConfigEmail;
