#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from pysnmp.hlapi import (
    SnmpEngine, CommunityData, UdpTransportTarget, ContextData,
    ObjectType, ObjectIdentity, getCmd, nextCmd
)

DEFAULT_TIMEOUT = 2
DEFAULT_RETRIES = 1


def snmp_get(ip, community, oid, port=161, timeout=DEFAULT_TIMEOUT, retries=DEFAULT_RETRIES):
    it = getCmd(
        SnmpEngine(),
        CommunityData(community, mpModel=1),  # SNMPv2c
        UdpTransportTarget((ip, port), timeout=timeout, retries=retries),
        ContextData(),
        ObjectType(ObjectIdentity(oid)),
    )
    err_ind, err_stat, err_idx, var_binds = next(it)
    if err_ind:
        raise RuntimeError(str(err_ind))
    if err_stat:
        raise RuntimeError(f"{err_stat.prettyPrint()} at {err_idx}")
    return var_binds[0][1]


def snmp_walk(ip, community, oid_prefix, port=161, timeout=DEFAULT_TIMEOUT, retries=DEFAULT_RETRIES, max_rows=5000):
    results = []
    for (err_ind, err_stat, err_idx, var_binds) in nextCmd(
        SnmpEngine(),
        CommunityData(community, mpModel=1),
        UdpTransportTarget((ip, port), timeout=timeout, retries=retries),
        ContextData(),
        ObjectType(ObjectIdentity(oid_prefix)),
        lexicographicMode=False
    ):
        if err_ind:
            raise RuntimeError(str(err_ind))
        if err_stat:
            raise RuntimeError(f"{err_stat.prettyPrint()} at {err_idx}")

        for oid, val in var_binds:
            results.append((str(oid), val))
            if len(results) >= max_rows:
                return results
    return results


def _to_int(v):
    try:
        return int(v)
    except Exception:
        return None


def _to_str(v):
    try:
        return str(v.prettyPrint())
    except Exception:
        return str(v)


def _pct(level, maxcap):
    if level is None or maxcap is None:
        return None
    if level < 0 or maxcap <= 0:
        return None
    return round((level * 100.0) / maxcap, 1)


# -------------------------
# Printer-MIB OIDs (padrão)
# -------------------------

OID_TOTAL_IMPRESSOES = "1.3.6.1.2.1.43.10.2.1.4.1.1"  # prtMarkerLifeCount

OID_SUPPLIES_DESC_PREFIX = "1.3.6.1.2.1.43.11.1.1.6.1"
OID_SUPPLIES_MAX_PREFIX  = "1.3.6.1.2.1.43.11.1.1.8.1"
OID_SUPPLIES_LVL_PREFIX  = "1.3.6.1.2.1.43.11.1.1.9.1"

OID_TRAY_MEDIA_PREFIX = "1.3.6.1.2.1.43.8.2.1.12.1"
OID_TRAY_NAME_PREFIX  = "1.3.6.1.2.1.43.8.2.1.13.1"


# -------------------------
# Xerox meters (Enterprise)
# -------------------------
# Seus labels mostraram:
#  - Black A4 Equivalent Impressions => id 201
#  - Color A4 Equivalent Impressions => id 202
#  - Black Large Impressions         => id 44
#  - Color Large Impressions         => id 43
#
# Em Xerox, normalmente:
#  - ...20.<id> = label
#  - ...21.<id> = value
XEROX_METER_BASE_VALUE = "1.3.6.1.4.1.253.8.53.13.2.1.8.1.21"


def read_trays(ip, community):
    trays = {}

    for oid, val in snmp_walk(ip, community, OID_TRAY_NAME_PREFIX):
        idx = oid.split(".")[-1]
        trays.setdefault(idx, {})["idx"] = int(idx)
        trays[idx]["name"] = _to_str(val)

    for oid, val in snmp_walk(ip, community, OID_TRAY_MEDIA_PREFIX):
        idx = oid.split(".")[-1]
        trays.setdefault(idx, {})["idx"] = int(idx)
        trays[idx]["media_name"] = _to_str(val)

    return [trays[k] for k in sorted(trays, key=lambda x: int(x))]


def read_toners(ip, community):
    """
    Retorna toners em formato:
    {
      "yellow": {level, max, percent},
      "magenta": ...,
      "cyan": ...,
      "black1": ...,
      "black2": ...
    }
    """
    idx_map = {
        "yellow": 2,
        "magenta": 3,
        "cyan": 4,
        "black1": 30,
        "black2": 31,
    }

    out = {}
    for name, idx in idx_map.items():
        oid_lvl = f"{OID_SUPPLIES_LVL_PREFIX}.{idx}"
        oid_max = f"{OID_SUPPLIES_MAX_PREFIX}.{idx}"
        oid_desc = f"{OID_SUPPLIES_DESC_PREFIX}.{idx}"

        level = None
        maxcap = None
        desc = None

        try:
            desc = _to_str(snmp_get(ip, community, oid_desc))
        except Exception:
            desc = None

        try:
            level = _to_int(snmp_get(ip, community, oid_lvl))
        except Exception as e:
            out[name] = {"error": str(e)}
            continue

        try:
            maxcap = _to_int(snmp_get(ip, community, oid_max))
        except Exception:
            maxcap = None

        out[name] = {
            "desc": desc,
            "level": level,
            "max": maxcap,
            "percent": _pct(level, maxcap)
        }

    return out


def read_meters(ip, community):
    meters = {}

    # total (padrão)
    try:
        meters["total_impressions"] = _to_int(snmp_get(ip, community, OID_TOTAL_IMPRESSOES))
    except Exception as e:
        meters["total_impressions_error"] = str(e)

    # Xerox A4 equiv / Large
    xerox_ids = {
        "a4_black": 201,   # Black A4 Equivalent Impressions
        "a4_color": 202,   # Color A4 Equivalent Impressions
        "a3_black": 44,    # Black Large Impressions
        "a3_color": 43,    # Color Large Impressions
    }

    for key, meter_id in xerox_ids.items():
        oid = f"{XEROX_METER_BASE_VALUE}.{meter_id}"
        try:
            meters[key] = _to_int(snmp_get(ip, community, oid))
        except Exception as e:
            meters[f"{key}_error"] = str(e)

    return meters


def read_all(ip, community):
    return {
        "meters": read_meters(ip, community),
        "toners": read_toners(ip, community),
        "trays": read_trays(ip, community),
    }
