#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from pysnmp.hlapi import (
    getCmd, nextCmd,
    SnmpEngine, CommunityData,
    UdpTransportTarget, ContextData,
    ObjectType, ObjectIdentity
)

DEFAULT_TIMEOUT = 3
DEFAULT_RETRIES = 1


def snmp_get(ip, oid, community='public', timeout=DEFAULT_TIMEOUT, retries=DEFAULT_RETRIES):
    """
    Retorna:
      - int, se parecer número
      - string caso contrário
      - None em erro
    """
    try:
        error_indication, error_status, _, var_binds = next(
            getCmd(
                SnmpEngine(),
                CommunityData(community, mpModel=1),  # SNMPv2c
                UdpTransportTarget((ip, 161), timeout=timeout, retries=retries),
                ContextData(),
                ObjectType(ObjectIdentity(oid))
            )
        )
        if error_indication or error_status:
            return None

        val = str(var_binds[0][1])
        # inteiro (inclui negativos)
        if val.lstrip('-').isdigit():
            try:
                return int(val)
            except Exception:
                return val
        return val
    except Exception:
        return None


def snmp_walk(ip, oid_base, community='public', timeout=DEFAULT_TIMEOUT, retries=DEFAULT_RETRIES, max_rows=5000):
    """
    Retorna lista de tuplas: [(oid_str, val_str), ...]
    """
    try:
        resultado = []
        for (error_indication, error_status, _, var_binds) in nextCmd(
            SnmpEngine(),
            CommunityData(community, mpModel=1),
            UdpTransportTarget((ip, 161), timeout=timeout, retries=retries),
            ContextData(),
            ObjectType(ObjectIdentity(oid_base)),
            lexicographicMode=False
        ):
            if error_indication or error_status:
                break
            for var_bind in var_binds:
                resultado.append((str(var_bind[0]), str(var_bind[1])))
                if len(resultado) >= max_rows:
                    return resultado
        return resultado
    except Exception:
        return []
