import React, { useState } from 'react';
import { FaWrench, FaUser, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await login(username, password);
            if (!result.success) {
                setError(result.error || 'Erro ao fazer login');
            }
        } catch (err) {
            setError('Erro de conexão com o servidor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary to-primary/80 p-8 text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FaWrench size={32} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Vimax CMMS</h1>
                    <p className="text-primary-100 text-sm mt-2">Sistema de Gestão de Manutenção</p>
                </div>

                {/* Form */}
                <div className="p-8">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-slate-800">Bem-vindo</h2>
                        <p className="text-slate-500 text-sm mt-1">Faça login para acessar o sistema</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
                                {error}
                            </div>
                        )}

                        {/* Username Field */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-600 uppercase ml-1">
                                Usuário
                            </label>
                            <div className="relative">
                                <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                    placeholder="Seu usuário"
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-600 uppercase ml-1">
                                Senha
                            </label>
                            <div className="relative">
                                <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                    placeholder="Sua senha"
                                    required
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    disabled={loading}
                                >
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || !username || !password}
                            className={`w-full py-3 rounded-xl font-bold text-white transition-all shadow-lg ${
                                loading || !username || !password
                                    ? 'bg-slate-300 cursor-not-allowed'
                                    : 'bg-primary hover:bg-primary/90 hover:shadow-xl shadow-primary/20'
                            }`}
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Entrando...
                                </div>
                            ) : (
                                'Entrar'
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 p-6 text-center">
                    <p className="text-slate-400 text-xs">
                        Vimax CMMS &copy; {new Date().getFullYear()}
                    </p>
                    <p className="text-slate-400 text-xs mt-1">
                        Sistema de Gestão de Manutenção
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
