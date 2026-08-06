import React, { useState, useEffect } from 'react'
import { Image as ImageIcon, Upload, Trash2, Check, AlertCircle, X, FileText } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function ConfigLogo() {
  const { user } = useAuth()
  const [logoUrl, setLogoUrl] = useState(null)
  const [existe, setExiste] = useState(false)
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const API_BASE = ''

  const authHeaders = () => (user?.api_token ? { 'X-API-Token': user.api_token } : {})

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/config/logo`, { headers: authHeaders() })
      if (res.ok) {
        const d = await res.json()
        setExiste(!!d.existe)
        if (d.existe) {
          const token = user?.api_token
            ? `?token=${encodeURIComponent(user.api_token)}&t=${Date.now()}`
            : `?t=${Date.now()}`
          setLogoUrl(`${API_BASE}/api/config/logo/imagem${token}`)
        } else {
          setLogoUrl(null)
        }
      }
    } catch {
      /* silencioso */
    }
  }

  useEffect(() => { fetchStatus() }, [])

  const handleSelectFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const ok = ['image/png', 'image/jpeg', 'image/jpg'].includes(f.type)
    if (!ok) { setError('Formato inválido. Use PNG, JPG ou JPEG.'); return }
    setError('')
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleUpload = async () => {
    if (!file) { setError('Selecione uma imagem primeiro'); return }
    setEnviando(true)
    setError('')
    setSuccess('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`${API_BASE}/api/config/logo`, {
        method: 'POST',
        headers: authHeaders(),
        body: fd
      })
      if (res.ok) {
        setSuccess('Logo salva com sucesso! Ela já aparecerá nos próximos PDFs de Compras.')
        setFile(null)
        setPreview(null)
        fetchStatus()
      } else {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Erro ao enviar a logo')
      }
    } catch {
      setError('Erro ao enviar a logo')
    } finally {
      setEnviando(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Remover a logo atual? Os PDFs voltarão a sair sem logo.')) return
    try {
      const res = await fetch(`${API_BASE}/api/config/logo`, { method: 'DELETE', headers: authHeaders() })
      if (res.ok) {
        setSuccess('Logo removida.')
        setExiste(false)
        setLogoUrl(null)
        setPreview(null)
        setFile(null)
      } else {
        setError('Erro ao remover a logo')
      }
    } catch {
      setError('Erro ao remover a logo')
    }
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto">

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <span className="text-red-700 font-bold flex items-center gap-2"><AlertCircle size={18} /> {error}</span>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700"><X size={18} /></button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
            <span className="text-green-700 font-bold flex items-center gap-2"><Check size={18} /> {success}</span>
            <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-700"><X size={18} /></button>
          </div>
        )}

        <div className="flex items-center gap-3 mb-6">
          <ImageIcon className="text-indigo-600" size={32} />
          <h1 className="text-3xl font-bold text-gray-800">Logo dos PDFs de Compras</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
          <p className="text-sm text-gray-500 flex items-start gap-2">
            <FileText size={18} className="text-indigo-400 mt-0.5 flex-shrink-0" />
            <span>
              Envie a logo da sua empresa. Ela será exibida no <strong>canto superior esquerdo</strong> dos PDFs de
              <strong> Requisição, Pedido e Ordem de Compra</strong>. Formatos aceitos: <strong>PNG, JPG</strong>.
              Recomendado fundo transparente (PNG) e proporção horizontal.
            </span>
          </p>

          <div>
            <p className="text-xs font-bold text-gray-600 uppercase mb-2">Logo atual</p>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex items-center justify-center bg-gray-50 min-h-[140px]">
              {existe && logoUrl ? (
                <img src={logoUrl} alt="Logo atual" className="max-h-28 object-contain" />
              ) : (
                <span className="text-gray-400 text-sm">Nenhuma logo cadastrada</span>
              )}
            </div>
            {existe && (
              <button onClick={handleDelete}
                className="mt-3 inline-flex items-center gap-2 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg font-bold text-sm transition-colors">
                <Trash2 size={16} /> Remover logo
              </button>
            )}
          </div>

          <div className="border-t pt-6">
            <p className="text-xs font-bold text-gray-600 uppercase mb-2">Enviar nova logo</p>

            <div className="border-2 border-dashed border-indigo-200 rounded-xl p-6 text-center hover:bg-indigo-50/40 transition-all relative">
              <input type="file" accept="image/png,image/jpeg,image/jpg"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleSelectFile} />
              <Upload className="mx-auto text-indigo-300 mb-2" size={28} />
              <p className="text-sm text-gray-500">
                {file ? file.name : 'Clique ou arraste a imagem aqui (PNG/JPG)'}
              </p>
            </div>

            {preview && (
              <div className="mt-4">
                <p className="text-xs font-bold text-gray-600 uppercase mb-2">Pré-visualização</p>
                <div className="border border-gray-200 rounded-xl p-4 bg-white inline-block">
                  <img src={preview} alt="Pré-visualização" className="max-h-28 object-contain" />
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button onClick={handleUpload} disabled={enviando || !file}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 flex items-center gap-2">
                <Upload size={18} /> {enviando ? 'Enviando...' : 'Salvar logo'}
              </button>
              {file && (
                <button onClick={() => { setFile(null); setPreview(null) }}
                  className="px-6 py-2.5 text-gray-700 font-bold hover:bg-gray-100 rounded-lg transition-all">
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}