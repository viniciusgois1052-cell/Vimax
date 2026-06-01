# -*- coding: utf-8 -*-
from flask import Blueprint, request, jsonify, Response, send_file
from datetime import datetime
import io
import re
import ssl
import urllib.request

from .. import db
from ..models.contador_impressora import ContadorImpressora

# ============================================================
# Blueprint (TEM QUE EXISTIR ANTES DE QUALQUER @route)
# ============================================================
contador_impressora_bp = Blueprint('contador_impressora_bp', __name__)

# ============================================================
# CORS / OPTIONS
# ============================================================

@contador_impressora_bp.after_request
def after_request(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-API-Token'
    return response

@contador_impressora_bp.route('/<path:any>', methods=['OPTIONS'])
@contador_impressora_bp.route('/', methods=['OPTIONS'])
def handle_options(any=None):
    r = Response()
    r.headers['Access-Control-Allow-Origin'] = '*'
    r.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
    r.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-API-Token'
    return r, 200


# ============================================================
# Helpers
# ============================================================

def _norm_lower(s):
    return (s or '').strip().lower()

def _to_int(x):
    try:
        if x is None:
            return None
        if isinstance(x, int):
            return x
        s = str(x).strip()
        s = s.replace('.', '').replace(',', '')
        return int(s) if s.lstrip('-').isdigit() else None
    except Exception:
        return None

def _extract_pct(s):
    if s is None:
        return None
    m = re.search(r'(\d{1,3})\s*%?', str(s))
    if not m:
        return None
    v = int(m.group(1))
    if 0 <= v <= 100:
        return v
    return None

def _http_get(url, verify_ssl=False, timeout=12):
    """
    HTTP GET simples com User-Agent.
    Para HTTPS, por padrão NÃO valida certificado (muitos devices usam cert self-signed).
    """
    headers = {'User-Agent': 'Mozilla/5.0'}
    req = urllib.request.Request(url, headers=headers)

    if url.lower().startswith('https'):
        if verify_ssl:
            return urllib.request.urlopen(req, timeout=timeout).read()
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return urllib.request.urlopen(req, context=ctx, timeout=timeout).read()

    return urllib.request.urlopen(req, timeout=timeout).read()


# ============================================================
# Modelo (robusto + auto-detecção)
# ============================================================

def _get_modelo_tipo(c: ContadorImpressora):
    """
    Determina o modelo_tipo de forma robusta.
    1) usa campo modelo_tipo (se existir e estiver preenchido)
    2) tenta inferir por modelo + nome (muitos cadastros vêm com "Xerox7855" no nome)
    """
    modelo_tipo = getattr(c, 'modelo_tipo', None)
    if modelo_tipo:
        return _norm_lower(modelo_tipo)

    modelo = _norm_lower(getattr(c, 'modelo', None))
    nome = _norm_lower(getattr(c, 'nome', None))
    txt = f"{modelo} {nome}"

    if 'altalink' in txt:
        return 'xerox_altalink'
    if 'primelink' in txt:
        return 'xerox_primelink'

    # WorkCentre 7855/7835 (cadastros variam MUITO)
    # exemplos: "Xerox7855", "WC7855", "WorkCentre 7855", "7835"
    if (
        'workcentre' in txt
        or 'work centre' in txt
        or 'xerox7855' in txt
        or '7855' in txt
        or '7835' in txt
    ):
        return 'xerox_workcentre_7855_7835'

    # HP X557xx
    if 'x557' in txt:
        return 'hp_x557'

    return 'desconhecido'


# ============================================================
# Parsers
# ============================================================

def parse_xerox_altalink(ip: str):
    base = f'https://{ip}'
    url_insumos = f'{base}/stat/consumables.php'
    url_contadores = f'{base}/counters/usage.php'

    result = {'contadores': {}, 'insumos': {}}

    # INSUMOS
    html = _http_get(url_insumos, verify_ssl=False).decode('utf-8', errors='ignore')
    html_limpo = re.sub(r'<script.*?>.*?</script>', '', html, flags=re.DOTALL)
    linhas = re.findall(r'<tr class="(?:odd|even)">(.*?)</tr>', html_limpo, re.DOTALL)

    insumos = {}
    for linha in linhas:
        tds = re.findall(r'<td[^>]*>(.*?)</td>', linha, re.DOTALL)
        tds_txt = [re.sub(r'<[^>]+>', '', td).replace('&nbsp;', '').strip() for td in tds]
        tds_txt = [t for t in tds_txt if t]
        if len(tds_txt) >= 2:
            nome = tds_txt[0]
            nivel = next((t for t in tds_txt if '%' in t), None)
            pct = _extract_pct(nivel)
            if pct is not None:
                insumos[nome] = pct
    result['insumos'] = insumos

    # CONTADORES
    html_cont = _http_get(url_contadores, verify_ssl=False).decode('utf-8', errors='ignore')
    filtro = set([
        'Total Impressions', 'Color Impressions', 'Black Impressions',
        'A4 Equivalent Impressions', 'Large Impressions',
        'Color Copied Impressions', 'Color Printed Impressions',
        'Black Copied Impressions', 'Black Printed Impressions',
        'Black Large Impressions', 'Color Large Impressions'
    ])

    cont = {}
    linhas = re.findall(r'<tr[^>]*>(.*?)</tr>', html_cont, re.DOTALL)
    for linha in linhas:
        tds = re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', linha, re.DOTALL)
        tds_txt = [re.sub(r'<[^>]+>', '', td).replace('&nbsp;', '').strip() for td in tds]
        tds_txt = [t for t in tds_txt if t]
        if len(tds_txt) >= 2 and tds_txt[0] in filtro:
            cont[tds_txt[0]] = _to_int(tds_txt[-1])
    result['contadores'] = cont

    return result


def parse_xerox_primelink(ip: str):
    base = f'http://{ip}:8080'
    url_prcnt = f'{base}/prcnt.htm'
    url_stsply = f'{base}/stsply.htm'

    result = {'contadores': {}, 'insumos': {}}

    html_prcnt = _http_get(url_prcnt, verify_ssl=True).decode('utf-8', errors='ignore')
    m = re.search(r'var info=\[(.*?)\]', html_prcnt)
    cont = {}
    if m:
        items = re.findall(r"'([^']+)',(\d+)", m.group(1))
        filtro = set([
            'Total Impressions','Black Impressions','Color Impressions',
            'Large Impressions','Black Large Impressions','Color Large Impressions',
            'Black Copied Impressions','Black Printed Impressions',
            'Color Copied Impressions','Color Printed Impressions'
        ])
        for nome, val in items:
            if nome in filtro:
                cont[nome] = _to_int(val)
    result['contadores'] = cont

    html_stsply = _http_get(url_stsply, verify_ssl=True).decode('utf-8', errors='ignore')
    suprimentos = re.findall(r"\['([^']*)',[^,]+,(\d+)\]", html_stsply)
    insumos = {}
    for item, level in suprimentos:
        if item:
            pct = _extract_pct(level)
            if pct is not None:
                insumos[item.strip()] = pct
    result['insumos'] = insumos

    return result


def parse_xerox_workcentre_7855_7835(ip: str):
    """
    WorkCentre 7855/7835:
      - Contadores: /counters/billing_info.php (http) (fallback /counters/usage.php)
      - Suprimentos/Drums: /stat/consumables.php (muito comum)
    """
    base_http = f'http://{ip}'
    base_https = f'https://{ip}'

    urls_contadores = [
        f'{base_http}/counters/billing_info.php',
        f'{base_https}/counters/billing_info.php',
        f'{base_http}/counters/usage.php',
        f'{base_https}/counters/usage.php',
    ]

    urls_consumiveis = [
        f'{base_http}/stat/consumables.php',
        f'{base_https}/stat/consumables.php',
        # fallbacks (alguns firmwares têm)
        f'{base_http}/status/consumables.php',
        f'{base_https}/status/consumables.php',
    ]

    result = {'contadores': {}, 'insumos': {}}

    # ---- contadores (obrigatório) ----
    html_cont = None
    last_err = None
    for url in urls_contadores:
        try:
            html_cont = _http_get(url, verify_ssl=False, timeout=8).decode('utf-8', errors='ignore')
            if html_cont and len(html_cont) > 50:
                break
        except Exception as e:
            last_err = e
            continue
    if not html_cont:
        raise RuntimeError(f'Não foi possível acessar contadores (último erro: {last_err})')

    numeros = re.findall(r'<td class="rightAlign[^>]*">([0-9]+)</td>', html_cont)
    if not numeros:
        numeros = re.findall(r'<td[^>]*>\s*([0-9]+)\s*</td>', html_cont)

    labels = [
        'Black Impressions',
        'Color Impressions',
        'Total Impressions',
        'Black Large Impressions',
        'Color Large Impressions'
    ]

    cont = {}
    for i, num in enumerate(numeros):
        if i < len(labels):
            cont[labels[i]] = _to_int(num)
    result['contadores'] = cont

    # ---- consumíveis (opcional) ----
    html_cons = None
    for url in urls_consumiveis:
        try:
            html_cons = _http_get(url, verify_ssl=False, timeout=8).decode('utf-8', errors='ignore')
            if html_cons and len(html_cons) > 50:
                break
        except Exception:
            continue

    insumos = {}
    if html_cons:
        html_cons_limpo = re.sub(r'<script.*?>.*?</script>', '', html_cons, flags=re.DOTALL)

        linhas = re.findall(r'<tr class="(?:odd|even)">(.*?)</tr>', html_cons_limpo, re.DOTALL)
        if not linhas:
            linhas = re.findall(r'<tr[^>]*>(.*?)</tr>', html_cons_limpo, re.DOTALL)

        for linha in linhas:
            tds = re.findall(r'<td[^>]*>(.*?)</td>', linha, re.DOTALL)
            tds_txt = [re.sub(r'<[^>]+>', '', td).replace('&nbsp;', '').strip() for td in tds]
            tds_txt = [t for t in tds_txt if t]
            if len(tds_txt) >= 2:
                nome = tds_txt[0]
                nivel = next((t for t in tds_txt if '%' in t), None)
                pct = _extract_pct(nivel)
                if pct is not None:
                    insumos[nome] = pct

        # fallback genérico
        if not insumos:
            pares = re.findall(r'>([^<>]{2,60})<.*?([0-9]{1,3})\s*%', html_cons_limpo, re.DOTALL)
            for nome, level in pares:
                nome = re.sub(r'\s+', ' ', nome).strip()
                pct = _extract_pct(level)
                if nome and pct is not None:
                    insumos[nome] = pct

    result['insumos'] = insumos
    return result


def parse_hp_x557(ip: str):
    base = f'http://{ip}'
    url_principal = f'{base}'
    url_contador  = f'{base}/hp/device/InternalPages/Index?id=UsagePage'

    result = {'contadores': {}, 'insumos': {}}

    html_cont = _http_get(url_contador, verify_ssl=True).decode('utf-8', errors='ignore')
    alvos = {
        'A4 Monochrome': r'Print\.A4\.Monochrome\" class=\"align-right\">([0-9,]+)',
        'A4 Color':      r'Print\.A4\.Color\" class=\"align-right\">([0-9,]+)',
        'A4 Total':      r'Print\.A4\.Total\" class=\"align-right\">([0-9,]+)'
    }

    cont = {}
    for nome, regex in alvos.items():
        m = re.search(regex, html_cont)
        if m:
            cont[nome] = _to_int(m.group(1))
    result['contadores'] = cont

    html_home = _http_get(url_principal, verify_ssl=True).decode('utf-8', errors='ignore')
    insumos = {}
    for i in range(5):
        regex_nome = rf'SupplyName{i}\" title=\"([^\"]+)'
        regex_level = rf'SupplyGauge{i}\" style=\"width:([0-9]+)'
        m_nome = re.search(regex_nome, html_home)
        m_level = re.search(regex_level, html_home)
        if m_nome and m_level:
            nome_insumo = m_nome.group(1).strip()
            pct = _extract_pct(m_level.group(1))
            if pct is not None:
                insumos[nome_insumo] = pct
    result['insumos'] = insumos

    return result


def coletar_por_modelo(modelo_tipo: str, ip: str):
    mt = _norm_lower(modelo_tipo)

    if mt == 'xerox_altalink':
        return parse_xerox_altalink(ip)
    if mt == 'xerox_primelink':
        return parse_xerox_primelink(ip)
    if mt == 'xerox_workcentre_7855_7835':
        return parse_xerox_workcentre_7855_7835(ip)
    if mt == 'hp_x557':
        return parse_hp_x557(ip)

    # AUTO-DETECT (quando cadastro vier "desconhecido")
    if mt in ('', 'desconhecido', 'unknown', 'none', 'null'):
        # 1) WorkCentre 7855/7835 -> billing_info.php
        try:
            _http_get(f'http://{ip}/counters/billing_info.php', verify_ssl=False, timeout=5)
            return parse_xerox_workcentre_7855_7835(ip)
        except Exception:
            pass

        # 2) AltaLink -> counters/usage.php em https
        try:
            _http_get(f'https://{ip}/counters/usage.php', verify_ssl=False, timeout=5)
            return parse_xerox_altalink(ip)
        except Exception:
            pass

        # 3) PrimeLink -> porta 8080 /prcnt.htm
        try:
            _http_get(f'http://{ip}:8080/prcnt.htm', verify_ssl=True, timeout=5)
            return parse_xerox_primelink(ip)
        except Exception:
            pass

    raise ValueError(f"modelo_tipo não suportado: {modelo_tipo}")


# ============================================================
# Mapeamento para o model
# ============================================================

def _map_contadores_e_insumos_para_model(c: ContadorImpressora, payload: dict):
    cont = payload.get('contadores') or {}
    ins = payload.get('insumos') or {}

    # Xerox (gerais)
    if cont.get('Total Impressions') is not None:
        c.contador_total = _to_int(cont.get('Total Impressions'))
    if cont.get('Black Impressions') is not None:
        c.contador_pb = _to_int(cont.get('Black Impressions'))
    if cont.get('Color Impressions') is not None:
        c.contador_color = _to_int(cont.get('Color Impressions'))

    # A3 Xerox
    if cont.get('Black Large Impressions') is not None:
        c.contador_a3_pb = _to_int(cont.get('Black Large Impressions'))
    if cont.get('Color Large Impressions') is not None:
        c.contador_a3_color = _to_int(cont.get('Color Large Impressions'))

    # HP A4
    if cont.get('A4 Total') is not None:
        c.contador_total = _to_int(cont.get('A4 Total'))
    if cont.get('A4 Monochrome') is not None:
        c.contador_a4_pb = _to_int(cont.get('A4 Monochrome'))
    if cont.get('A4 Color') is not None:
        c.contador_a4_color = _to_int(cont.get('A4 Color'))

    # insumos - heurística por palavra
    def set_if_match(attr, *keys):
        vals = []
        for nome, pct in ins.items():
            n = _norm_lower(nome)
            if any(k in n for k in keys):
                p = _extract_pct(pct)
                if p is not None:
                    vals.append(p)
        if vals:
            setattr(c, attr, min(vals))

    set_if_match('toner_preto_nivel', 'preto', 'black', 'bk', 'toner black', 'k')
    set_if_match('toner_ciano_nivel', 'ciano', 'cyan')
    set_if_match('toner_magenta_nivel', 'magenta')
    set_if_match('toner_amarelo_nivel', 'amarelo', 'yellow')
    set_if_match('reservatorio_nivel', 'waste', 'residu', 'reserv', 'container')

    # drums (heurística; sem mapear R1..R4 por cor)
    if hasattr(c, 'drum_preto_nivel'):
        set_if_match('drum_preto_nivel', 'drum', 'black drum', 'drum black', 'k drum')
    if hasattr(c, 'drum_ciano_nivel'):
        set_if_match('drum_ciano_nivel', 'drum', 'cyan drum', 'drum cyan')
    if hasattr(c, 'drum_magenta_nivel'):
        set_if_match('drum_magenta_nivel', 'drum', 'magenta drum', 'drum magenta')
    if hasattr(c, 'drum_amarelo_nivel'):
        set_if_match('drum_amarelo_nivel', 'drum', 'yellow drum', 'drum yellow')

    if hasattr(c, 'suprimentos_raw'):
        raw_list = []
        for nome, pct in ins.items():
            raw_list.append({
                'categoria': 'web',
                'descricao': nome,
                'percentual': _extract_pct(pct)
            })
        c.suprimentos_raw = raw_list

    c.status = 'online'
    c.ultima_leitura = datetime.utcnow()


# ============================================================
# ROTAS CRUD
# ============================================================

@contador_impressora_bp.route('/', methods=['GET'])
def listar():
    empresa_id = request.args.get('empresa_id')
    q = ContadorImpressora.query
    if empresa_id:
        q = q.filter_by(empresa_id=int(empresa_id))
    return jsonify([c.to_dict() for c in q.all()])


@contador_impressora_bp.route('/<int:id>', methods=['GET'])
def get_one(id):
    c = ContadorImpressora.query.get_or_404(id)
    return jsonify(c.to_dict())


@contador_impressora_bp.route('/', methods=['POST'])
def criar():
    data = request.get_json() or {}
    novo = ContadorImpressora(
        nome=data['nome'],
        ip=data['ip'],
        community=data.get('community', 'public'),
        modelo=data.get('modelo'),
        numero_serie=data.get('numero_serie'),
        localizacao=data.get('localizacao'),
        empresa_id=data.get('empresa_id'),
    )
    if hasattr(novo, 'modelo_tipo'):
        setattr(novo, 'modelo_tipo', data.get('modelo_tipo'))

    db.session.add(novo)
    db.session.commit()
    return jsonify(novo.to_dict()), 201


@contador_impressora_bp.route('/<int:id>', methods=['PUT'])
def atualizar(id):
    c = ContadorImpressora.query.get_or_404(id)
    data = request.get_json() or {}

    c.nome = data.get('nome', c.nome)
    c.ip = data.get('ip', c.ip)
    c.community = data.get('community', c.community)
    c.modelo = data.get('modelo', c.modelo)
    c.numero_serie = data.get('numero_serie', c.numero_serie)
    c.localizacao = data.get('localizacao', c.localizacao)
    c.empresa_id = data.get('empresa_id', c.empresa_id)

    if hasattr(c, 'modelo_tipo') and 'modelo_tipo' in data:
        setattr(c, 'modelo_tipo', data.get('modelo_tipo'))

    db.session.commit()
    return jsonify(c.to_dict())


@contador_impressora_bp.route('/<int:id>', methods=['DELETE'])
def deletar(id):
    c = ContadorImpressora.query.get_or_404(id)
    db.session.delete(c)
    db.session.commit()
    return jsonify({'success': True})


# ============================================================
# CONSULTA (mantém /consultar-snmp por compatibilidade)
# ============================================================

@contador_impressora_bp.route('/<int:id>/consultar-snmp', methods=['POST'])
def consultar(id):
    c = ContadorImpressora.query.get_or_404(id)
    try:
        modelo_tipo = _get_modelo_tipo(c)
        payload = coletar_por_modelo(modelo_tipo, c.ip)
        _map_contadores_e_insumos_para_model(c, payload)
        db.session.commit()
        return jsonify({'success': True, 'status': 'online', 'dados': c.to_dict()})
    except Exception as e:
        c.status = 'offline'
        c.ultima_leitura = datetime.utcnow()
        db.session.commit()
        return jsonify({'success': False, 'status': 'offline', 'mensagem': str(e)}), 200


@contador_impressora_bp.route('/atualizar-todas', methods=['POST'])
def atualizar_todas():
    resultados = {'sucesso': 0, 'falha': 0, 'detalhes': []}
    impressoras = ContadorImpressora.query.all()

    for c in impressoras:
        try:
            modelo_tipo = _get_modelo_tipo(c)
            payload = coletar_por_modelo(modelo_tipo, c.ip)
            _map_contadores_e_insumos_para_model(c, payload)
            resultados['sucesso'] += 1
            resultados['detalhes'].append({'id': c.id, 'nome': c.nome, 'status': 'online'})
        except Exception as e:
            c.status = 'offline'
            c.ultima_leitura = datetime.utcnow()
            resultados['falha'] += 1
            resultados['detalhes'].append({'id': c.id, 'nome': c.nome, 'status': 'offline', 'erro': str(e)})

    db.session.commit()
    return jsonify(resultados)


# ============================================================
# EXPORTAR EXCEL
# ============================================================

@contador_impressora_bp.route('/exportar-excel', methods=['GET'])
def exportar_excel():
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.utils import get_column_letter

    empresa_id = request.args.get('empresa_id')
    query = ContadorImpressora.query
    if empresa_id:
        query = query.filter_by(empresa_id=int(empresa_id))
    impressoras = query.order_by(ContadorImpressora.nome).all()

    wb = Workbook()
    ws = wb.active
    ws.title = 'Contadores'

    headers = [
        'Nome', 'IP', 'Modelo', 'Tipo',
        'Última Leitura', 'Status',
        'Total', 'PB', 'Color',
        'A4 PB', 'A4 Color', 'A3 PB', 'A3 Color',
        'Toner Preto %', 'Toner Ciano %', 'Toner Magenta %', 'Toner Amarelo %',
        'Reservatório %',
        'Drum Preto %', 'Drum Ciano %', 'Drum Magenta %', 'Drum Amarelo %',
    ]

    ws['A1'] = f'Relatório Contadores Impressora - {datetime.utcnow().strftime("%Y-%m-%d %H:%M")} UTC'
    ws['A1'].font = Font(bold=True, size=12)
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(headers))
    ws['A1'].alignment = Alignment(horizontal='center')

    header_fill = PatternFill('solid', fgColor='1F2937')
    header_font = Font(bold=True, color='FFFFFF')

    for col, h in enumerate(headers, 1):
        c = ws.cell(row=3, column=col, value=h)
        c.fill = header_fill
        c.font = header_font
        c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        ws.column_dimensions[get_column_letter(col)].width = 18
    ws.row_dimensions[3].height = 26

    r = 4
    for imp in impressoras:
        ws.cell(row=r, column=1, value=getattr(imp, 'nome', None))
        ws.cell(row=r, column=2, value=getattr(imp, 'ip', None))
        ws.cell(row=r, column=3, value=getattr(imp, 'modelo', None))
        ws.cell(row=r, column=4, value=getattr(imp, 'modelo_tipo', None))

        ul = getattr(imp, 'ultima_leitura', None)
        ws.cell(row=r, column=5, value=ul.isoformat() if ul else None)
        ws.cell(row=r, column=6, value=getattr(imp, 'status', None))

        ws.cell(row=r, column=7, value=getattr(imp, 'contador_total', None))
        ws.cell(row=r, column=8, value=getattr(imp, 'contador_pb', None))
        ws.cell(row=r, column=9, value=getattr(imp, 'contador_color', None))

        ws.cell(row=r, column=10, value=getattr(imp, 'contador_a4_pb', None))
        ws.cell(row=r, column=11, value=getattr(imp, 'contador_a4_color', None))
        ws.cell(row=r, column=12, value=getattr(imp, 'contador_a3_pb', None))
        ws.cell(row=r, column=13, value=getattr(imp, 'contador_a3_color', None))

        ws.cell(row=r, column=14, value=getattr(imp, 'toner_preto_nivel', None))
        ws.cell(row=r, column=15, value=getattr(imp, 'toner_ciano_nivel', None))
        ws.cell(row=r, column=16, value=getattr(imp, 'toner_magenta_nivel', None))
        ws.cell(row=r, column=17, value=getattr(imp, 'toner_amarelo_nivel', None))
        ws.cell(row=r, column=18, value=getattr(imp, 'reservatorio_nivel', None))

        ws.cell(row=r, column=19, value=getattr(imp, 'drum_preto_nivel', None))
        ws.cell(row=r, column=20, value=getattr(imp, 'drum_ciano_nivel', None))
        ws.cell(row=r, column=21, value=getattr(imp, 'drum_magenta_nivel', None))
        ws.cell(row=r, column=22, value=getattr(imp, 'drum_amarelo_nivel', None))

        r += 1

    out = io.BytesIO()
    wb.save(out)
    out.seek(0)

    return send_file(
        out,
        as_attachment=True,
        download_name='contadores_impressora.xlsx',
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
