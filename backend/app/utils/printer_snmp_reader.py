#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from .snmp_client import snmp_get, snmp_walk

# Printer-MIB (padrão)
OID_PRT_MARKER_LIFE_COUNT = '1.3.6.1.2.1.43.10.2.1.4.1.1'

OID_SUPPLIES_DESC  = '1.3.6.1.2.1.43.11.1.1.6'
OID_SUPPLIES_LEVEL = '1.3.6.1.2.1.43.11.1.1.9'
OID_SUPPLIES_MAX   = '1.3.6.1.2.1.43.11.1.1.8'

OID_PAPER_TRAY_1 = '1.3.6.1.2.1.43.8.2.1.10.1.1'
OID_PAPER_TRAY_2 = '1.3.6.1.2.1.43.8.2.1.10.1.2'

# Host-Resources-MIB printer status
OID_HR_DEVICE_STATUS_1 = '1.3.6.1.2.1.25.3.2.1.5.1'
HR_PRINTER_STATUS = {'1': 'other', '2': 'unknown', '3': 'idle', '4': 'printing', '5': 'warmup'}

# Xerox meters (o que você validou via labels)
# labels: ...8.1.20.<id> ; values: ...8.1.21.<id>
XEROX_METER_BASE = '1.3.6.1.4.1.253.8.53.13.2.1.8.1.21'

# IDs que aparecem no seu snmpwalk:
# 20  = Total Impressions
# 7   = Black Printed Impressions
# 29  = Color Printed Impressions
# 44  = Black Large Impressions (A3/Large)
# 43  = Color Large Impressions (A3/Large)
# 9   = Black Printed 2 Sided Sheets (duplex)
# 31  = Color Printed 2 Sided Sheets (duplex)
XEROX_IDS = {
    'contador_total': 20,
    'contador_pb': 7,
    'contador_color': 29,
    'contador_a3_pb': 44,
    'contador_a3_color': 43,
    'contador_duplex_pb': 9,
    'contador_duplex_color': 31,
}

# serial (do seu walk anterior)
OID_SERIAL = '1.3.6.1.2.1.43.5.1.1.17.1'

# modelo (sysName ou hrDeviceDescr)
OID_SYSNAME = '1.3.6.1.2.1.1.5.0'
OID_HR_DEVICE_DESCR_1 = '1.3.6.1.2.1.25.3.2.1.3.1'


def _to_int(v):
    try:
        return int(v) if v is not None else None
    except Exception:
        return None


def nivel_percentual(nivel, max_cap):
    try:
        n = int(nivel)
        m = int(max_cap)
        if n < 0 or m <= 0:
            return None
        return round((n / m) * 100)
    except Exception:
        return None


def classificar_suprimento(descricao):
    desc = (descricao or '').lower()
    if 'black' in desc or 'preto' in desc or 'negro' in desc or 'bk' in desc:
        if any(x in desc for x in ['drum', 'unidade', 'photoconductor', 'image unit', 'fotorreceptor', 'photoreceptor']):
            return 'drum_preto'
        return 'toner_preto'
    if 'cyan' in desc or 'ciano' in desc:
        if any(x in desc for x in ['drum', 'unidade', 'photoconductor', 'image unit', 'fotorreceptor', 'photoreceptor']):
            return 'drum_ciano'
        return 'toner_ciano'
    if 'magenta' in desc:
        if any(x in desc for x in ['drum', 'unidade', 'photoconductor', 'image unit', 'fotorreceptor', 'photoreceptor']):
            return 'drum_magenta'
        return 'toner_magenta'
    if 'yellow' in desc or 'amarelo' in desc:
        if any(x in desc for x in ['drum', 'unidade', 'photoconductor', 'image unit', 'fotorreceptor', 'photoreceptor']):
            return 'drum_amarelo'
        return 'toner_amarelo'

    if any(x in desc for x in ['waste', 'residuo', 'resíduo', 'reservoir', 'coletor', 'overflow', 'resíduos']):
        return 'reservatorio'

    # fallback genérico
    if any(x in desc for x in ['drum', 'photoconductor', 'image unit', 'unidade de imagem']):
        return 'drum_preto'
    if any(x in desc for x in ['toner', 'cartridge', 'cartucho']):
        return 'toner_preto'

    return 'outro'


def consultar_suprimentos_snmp(ip, community='public', timeout=3):
    descs  = snmp_walk(ip, OID_SUPPLIES_DESC,  community, timeout=timeout)
    levels = snmp_walk(ip, OID_SUPPLIES_LEVEL, community, timeout=timeout)
    maxs   = snmp_walk(ip, OID_SUPPLIES_MAX,   community, timeout=timeout)

    def indexar(lista):
        d = {}
        for oid_str, val in lista:
            # mantém padrão do seu código: pega "penúltimo.último"
            chave = '.'.join(oid_str.split('.')[-2:])
            d[chave] = val
        return d

    d_desc  = indexar(descs)
    d_level = indexar(levels)
    d_max   = indexar(maxs)

    suprimentos_raw = []
    resultado = {}

    for idx, desc in d_desc.items():
        nivel = d_level.get(idx)
        max_c = d_max.get(idx)
        pct   = nivel_percentual(nivel, max_c)
        categ = classificar_suprimento(desc)

        item  = {
            'indice': idx,
            'descricao': desc,
            'nivel_raw': nivel,
            'max_raw': max_c,
            'percentual': pct,
            'categoria': categ
        }
        suprimentos_raw.append(item)

        # primeiro valor “confiável” por categoria
        if categ != 'outro' and categ not in resultado:
            resultado[categ] = pct

    return resultado, suprimentos_raw


def consultar_contadores_snmp(ip, community='public', timeout=3):
    def get(*oids):
        for oid in oids:
            v = snmp_get(ip, oid, community, timeout=timeout)
            if v is not None:
                return v
        return None

    def get_int(*oids):
        v = get(*oids)
        return _to_int(v)

    # status HR
    hr_raw = get(OID_HR_DEVICE_STATUS_1)
    hr_status = HR_PRINTER_STATUS.get(str(hr_raw), str(hr_raw)) if hr_raw is not None else None

    # alerta (mantém como você tinha; pode vir grande/hex/string)
    alerta_msg = get('1.3.6.1.2.1.43.18.1.1.8')

    # papel bandejas
    papel_bandeja1 = get_int(OID_PAPER_TRAY_1)
    papel_bandeja2 = get_int(OID_PAPER_TRAY_2)

    # Xerox meters
    def xerox(meter_field):
        meter_id = XEROX_IDS.get(meter_field)
        if not meter_id:
            return None
        return get_int(f'{XEROX_METER_BASE}.{meter_id}')

    # montar dict final no formato que sua rota espera
    return {
        'contador_total': xerox('contador_total') or get_int(OID_PRT_MARKER_LIFE_COUNT),
        'contador_pb': xerox('contador_pb'),
        'contador_color': xerox('contador_color'),
        'contador_a3_pb': xerox('contador_a3_pb'),
        'contador_a3_color': xerox('contador_a3_color'),
        'contador_duplex_pb': xerox('contador_duplex_pb'),
        'contador_duplex_color': xerox('contador_duplex_color'),

        # Estes 4 abaixo ficam “None” por enquanto (não vamos chutar).
        # Se você quiser, depois mapeamos usando a subárvore 103/104 (copied/fax etc).
        'contador_copia_pb': None,
        'contador_copia_color': None,
        'contador_impressao_pb': None,
        'contador_impressao_color': None,

        'papel_bandeja1': papel_bandeja1,
        'papel_bandeja2': papel_bandeja2,
        'status_dispositivo': hr_status,
        'alerta_mensagem': alerta_msg,

        'modelo': get(OID_SYSNAME, OID_HR_DEVICE_DESCR_1),
        'numero_serie': get(OID_SERIAL),
    }
