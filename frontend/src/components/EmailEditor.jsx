import React, { useEffect, useRef, useState } from 'react'

function exec(cmd, value = null) {
  document.execCommand(cmd, false, value)
}

function insertHtml(html) {
  exec('insertHTML', html)
}

export default function EmailEditor({ value, onChange, onUploadImage }) {
  const ref = useRef(null)
  const lastHtmlRef = useRef('')
  const [ready, setReady] = useState(false)

  // carrega HTML quando monta e quando o value mudar "por fora"
  useEffect(() => {
    if (!ref.current) return
    const incoming = value || ''
    const current = ref.current.innerHTML || ''

    // evita sobrescrever enquanto usuário está digitando no visual
    if (!ready) {
      ref.current.innerHTML = incoming
      lastHtmlRef.current = incoming
      setReady(true)
      return
    }

    // se veio atualização externa (ex: usuário editou no HTML tab), sincroniza
    if (incoming !== lastHtmlRef.current && incoming !== current) {
      ref.current.innerHTML = incoming
      lastHtmlRef.current = incoming
    }
  }, [value, ready])

  const emitChange = () => {
    const html = ref.current?.innerHTML ?? ''
    lastHtmlRef.current = html
    onChange?.(html)
  }

  const handleAddLink = () => {
    const url = prompt('URL do link:')
    if (!url) return
    exec('createLink', url)
    emitChange()
  }

  const handleImage = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!onUploadImage) return

    const url = await onUploadImage(file)
    if (!url) return

    insertHtml(`<img src="${url}" alt="" style="max-width:100%; height:auto; display:block;" />`)
    emitChange()
  }

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      <div className="flex flex-wrap gap-2 p-2 border-b border-slate-200 bg-slate-50">
        <button type="button" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black hover:bg-slate-100" onClick={() => { exec('undo'); emitChange() }}>
          Desfazer
        </button>
        <button type="button" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black hover:bg-slate-100" onClick={() => { exec('redo'); emitChange() }}>
          Refazer
        </button>

        <div className="w-px bg-slate-200 mx-1" />

        <button type="button" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black hover:bg-slate-100" onClick={() => { exec('bold'); emitChange() }}>
          Negrito
        </button>
        <button type="button" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black hover:bg-slate-100" onClick={() => { exec('italic'); emitChange() }}>
          Itálico
        </button>
        <button type="button" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black hover:bg-slate-100" onClick={() => { exec('underline'); emitChange() }}>
          Subl.
        </button>

        <div className="w-px bg-slate-200 mx-1" />

        <button type="button" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black hover:bg-slate-100" onClick={() => { exec('insertUnorderedList'); emitChange() }}>
          Lista
        </button>
        <button type="button" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black hover:bg-slate-100" onClick={() => { exec('justifyLeft'); emitChange() }}>
          Esquerda
        </button>
        <button type="button" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black hover:bg-slate-100" onClick={() => { exec('justifyCenter'); emitChange() }}>
          Centro
        </button>
        <button type="button" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black hover:bg-slate-100" onClick={() => { exec('justifyRight'); emitChange() }}>
          Direita
        </button>

        <div className="w-px bg-slate-200 mx-1" />

        <button type="button" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black hover:bg-slate-100" onClick={() => { exec('formatBlock', 'h2'); emitChange() }}>
          H2
        </button>
        <button type="button" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black hover:bg-slate-100" onClick={() => { exec('formatBlock', 'p'); emitChange() }}>
          P
        </button>
        <button type="button" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black hover:bg-slate-100" onClick={handleAddLink}>
          Link
        </button>

        <label className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-black hover:bg-emerald-700 cursor-pointer">
          Imagem
          <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
        </label>

        <button type="button" className="ml-auto px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black hover:bg-slate-100" onClick={() => { exec('removeFormat'); emitChange() }}>
          Limpar
        </button>
      </div>

      <div className="bg-white p-4">
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={emitChange}
          className="min-h-[320px] outline-none text-sm leading-relaxed"
          style={{ fontFamily: 'Arial, sans-serif' }}
        />
      </div>
    </div>
  )
}
