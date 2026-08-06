# -*- coding: utf-8 -*-
"""Funções compartilhadas para custos e agrupamento de contratos."""

from __future__ import annotations

import json
import re
import unicodedata
import urllib.request
from datetime import date


def normalizar_nome(valor):
    """Normaliza apenas formatação; não altera palavras do modelo."""
    texto = unicodedata.normalize("NFKC", str(valor or ""))
    texto = texto.replace("\u00a0", " ")
    texto = "".join(ch for ch in texto if unicodedata.category(ch) != "Cf")
    return re.sub(r"\s+", " ", texto).strip()


def chave_nome(valor):
    return normalizar_nome(valor).casefold()


def obter_cotacao_usd():
    try:
        with urllib.request.urlopen(
            "https://economia.awesomeapi.com.br/json/last/USD-BRL",
            timeout=5,
        ) as resposta:
            dados = json.loads(resposta.read())
            return float(dados["USDBRL"]["bid"])
    except Exception:
        return 5.0


def _valor_mensal_brl(contrato, cotacao_usd):
    valor = float(getattr(contrato, "valor", 0) or 0)
    moeda = normalizar_nome(getattr(contrato, "moeda", "BRL") or "BRL").upper()

    if bool(getattr(contrato, "is_mensal", False)):
        mensal = valor
    else:
        inicio = getattr(contrato, "data_inicio", None)
        fim = getattr(contrato, "data_fim", None)
        if inicio and fim:
            meses = (fim.year - inicio.year) * 12 + (fim.month - inicio.month)
            mensal = valor / max(1, meses)
        else:
            mensal = valor

    if moeda == "USD":
        mensal *= cotacao_usd

    return mensal, moeda, valor


def montar_custos_contratos(contratos):
    """
    Retorna as duas estruturas usadas pelo sistema:

    1) grupos:
       Modelo -> Empresa -> Ativos/Contratos

    2) por_empresa / por_maquinario:
       compatibilidade com a tela atual de Relatórios.
    """
    hoje = date.today()
    cotacao_usd = obter_cotacao_usd()
    meses_acumulados = hoje.month

    grupos = {}
    por_empresa = {}

    total_mensal = 0.0
    total_anual = 0.0

    for contrato in contratos:
        mensal_total, moeda, valor_original = _valor_mensal_brl(
            contrato, cotacao_usd
        )
        anual_total = mensal_total * meses_acumulados

        contrato_id = getattr(contrato, "id", None)
        contrato_numero = normalizar_nome(
            getattr(contrato, "numero", "")
        ) or str(contrato_id or "-")

        empresa_contrato = getattr(contrato, "empresa", None)
        empresa_contrato_id = getattr(contrato, "empresa_id", None) or 0
        empresa_contrato_nome = normalizar_nome(
            getattr(empresa_contrato, "nome", "")
        ) or "Sem Empresa"

        # Estrutura por empresa mantém um contrato apenas uma vez.
        if empresa_contrato_id not in por_empresa:
            por_empresa[empresa_contrato_id] = {
                "empresa_id": empresa_contrato_id,
                "empresa_nome": empresa_contrato_nome,
                "total_mensal": 0.0,
                "total_anual": 0.0,
                "contratos": [],
                "_contratos": set(),
            }

        pe = por_empresa[empresa_contrato_id]
        if contrato_id not in pe["_contratos"]:
            pe["_contratos"].add(contrato_id)
            pe["total_mensal"] += mensal_total
            pe["total_anual"] += anual_total
            pe["contratos"].append({
                "contrato_id": contrato_id,
                "contrato_numero": contrato_numero,
                "moeda": moeda,
                "valor_original": valor_original,
                "valor_mensal_brl": round(mensal_total, 2),
                "valor_anual_brl": round(anual_total, 2),
                "is_mensal": bool(getattr(contrato, "is_mensal", False)),
            })

        total_mensal += mensal_total
        total_anual += anual_total

        ativos_originais = list(getattr(contrato, "ativos_vinculados", None) or [])

        # Evita o mesmo ativo repetido por alguma inconsistência na relação.
        ativos = []
        ids_ativos = set()
        for ativo in ativos_originais:
            ativo_id = getattr(ativo, "id", None)
            chave_ativo = ("id", ativo_id) if ativo_id is not None else ("obj", id(ativo))
            if chave_ativo in ids_ativos:
                continue
            ids_ativos.add(chave_ativo)
            ativos.append(ativo)

        # Um contrato com vários ativos é rateado entre eles, evitando duplicação.
        quantidade_rateio = max(1, len(ativos))
        mensal_rateado = mensal_total / quantidade_rateio
        anual_rateado = anual_total / quantidade_rateio

        if not ativos:
            entradas = [(None, empresa_contrato_id, empresa_contrato_nome)]
        else:
            entradas = []
            for ativo in ativos:
                empresa_ativo = getattr(ativo, "empresa", None)
                empresa_id = getattr(ativo, "empresa_id", None) or empresa_contrato_id
                empresa_nome = normalizar_nome(
                    getattr(empresa_ativo, "nome", "")
                ) or empresa_contrato_nome
                entradas.append((ativo, empresa_id, empresa_nome))

        for ativo, empresa_id, empresa_nome in entradas:
            if ativo is None:
                modelo_exibicao = "Sem Ativo Vinculado"
                modelo_chave = "__sem_ativo_vinculado__"
                ativo_id = None
                ativo_nome = "-"
                numero_serie = ""
            else:
                ativo_nome_original = getattr(ativo, "nome", "")
                modelo_exibicao = normalizar_nome(ativo_nome_original) or "Sem Modelo"
                modelo_chave = chave_nome(ativo_nome_original) or "__sem_modelo__"
                ativo_id = getattr(ativo, "id", None)
                ativo_nome = modelo_exibicao
                numero_serie = normalizar_nome(
                    getattr(ativo, "numero_serie", "")
                )

            if modelo_chave not in grupos:
                grupos[modelo_chave] = {
                    "tipo": modelo_exibicao,
                    "empresas": {},
                    "_contratos": set(),
                }

            grupo = grupos[modelo_chave]
            empresa_chave = str(empresa_id or 0)

            if empresa_chave not in grupo["empresas"]:
                grupo["empresas"][empresa_chave] = {
                    "empresa_id": empresa_id or 0,
                    "empresa_nome": empresa_nome or "Sem Empresa",
                    "ativos": [],
                    "total_mensal": 0.0,
                    "total_anual": 0.0,
                    "_ativos": set(),
                    "_contratos": set(),
                }

            empresa = grupo["empresas"][empresa_chave]
            grupo["_contratos"].add(contrato_id)
            empresa["_contratos"].add(contrato_id)

            if ativo_id is not None:
                empresa["_ativos"].add(ativo_id)

            empresa["total_mensal"] += mensal_rateado
            empresa["total_anual"] += anual_rateado

            empresa["ativos"].append({
                "ativo_id": ativo_id,
                "ativo_nome": ativo_nome,
                "numero_serie": numero_serie,
                "contrato_id": contrato_id,
                "contrato_numero": contrato_numero,
                "moeda_original": moeda,
                "moeda": moeda,
                "valor_original": valor_original,
                "valor_mensal_brl": round(mensal_rateado, 2),
                "valor_anual_acumulado": round(anual_rateado, 2),
                "valor_anual_brl": round(anual_rateado, 2),
                "is_mensal": bool(getattr(contrato, "is_mensal", False)),
            })

    lista_grupos = []
    por_maquinario = []

    for grupo in grupos.values():
        empresas_lista = []
        contratos_maquinario = {}
        total_grupo_mensal = 0.0
        total_grupo_anual = 0.0

        for empresa in grupo["empresas"].values():
            empresa["qtd_ativos"] = len(empresa.pop("_ativos"))
            empresa["total_contratos"] = len(empresa.pop("_contratos"))
            empresa["total_mensal"] = round(empresa["total_mensal"], 2)
            empresa["total_anual"] = round(empresa["total_anual"], 2)
            empresa["ativos"].sort(
                key=lambda item: (
                    item.get("contrato_numero") or "",
                    item.get("numero_serie") or "",
                )
            )

            total_grupo_mensal += empresa["total_mensal"]
            total_grupo_anual += empresa["total_anual"]
            empresas_lista.append(empresa)

            # Compatibilidade da aba Por Maquinário dos Relatórios.
            for item in empresa["ativos"]:
                chave_contrato = item.get("contrato_id")
                chave = chave_contrato if chave_contrato is not None else (
                    item.get("contrato_numero"), empresa.get("empresa_id")
                )
                if chave not in contratos_maquinario:
                    contratos_maquinario[chave] = {
                        "contrato_id": item.get("contrato_id"),
                        "contrato_numero": item.get("contrato_numero"),
                        "empresa_nome": empresa.get("empresa_nome"),
                        "moeda": item.get("moeda"),
                        "valor_original": item.get("valor_original"),
                        "valor_mensal_brl": 0.0,
                        "valor_anual_brl": 0.0,
                        "is_mensal": item.get("is_mensal", False),
                    }
                contratos_maquinario[chave]["valor_mensal_brl"] += float(
                    item.get("valor_mensal_brl") or 0
                )
                contratos_maquinario[chave]["valor_anual_brl"] += float(
                    item.get("valor_anual_brl") or 0
                )

        empresas_lista.sort(key=lambda item: item["empresa_nome"].casefold())

        grupo_saida = {
            "tipo": grupo["tipo"],
            "maquinario": grupo["tipo"],
            "empresas": empresas_lista,
            "total_contratos": len(grupo.pop("_contratos")),
            "total_mensal": round(total_grupo_mensal, 2),
            "total_anual": round(total_grupo_anual, 2),
        }
        lista_grupos.append(grupo_saida)

        contratos_lista = list(contratos_maquinario.values())
        for item in contratos_lista:
            item["valor_mensal_brl"] = round(item["valor_mensal_brl"], 2)
            item["valor_anual_brl"] = round(item["valor_anual_brl"], 2)

        por_maquinario.append({
            "maquinario": grupo_saida["tipo"],
            "total_mensal": grupo_saida["total_mensal"],
            "total_anual": grupo_saida["total_anual"],
            "total_contratos": grupo_saida["total_contratos"],
            "empresas": empresas_lista,
            "contratos": contratos_lista,
        })

    lista_grupos.sort(key=lambda item: item["tipo"].casefold())
    por_maquinario.sort(key=lambda item: (-item["total_mensal"], item["maquinario"].casefold()))

    lista_empresas = list(por_empresa.values())
    for empresa in lista_empresas:
        empresa.pop("_contratos", None)
        empresa["total_mensal"] = round(empresa["total_mensal"], 2)
        empresa["total_anual"] = round(empresa["total_anual"], 2)
        empresa["contratos"].sort(key=lambda item: item["contrato_numero"].casefold())
    lista_empresas.sort(key=lambda item: item["empresa_nome"].casefold())

    return {
        "cotacao_usd": round(cotacao_usd, 4),
        "mes_referencia": f"{hoje.month:02d}/{hoje.year}",
        "meses_acumulados": meses_acumulados,
        "grupos": lista_grupos,
        "total_geral_mensal": round(total_mensal, 2),
        "total_geral_anual": round(total_anual, 2),
        # Compatibilidade com Relatórios.jsx
        "total_mensal": round(total_mensal, 2),
        "total_anual": round(total_anual, 2),
        "por_empresa": lista_empresas,
        "por_maquinario": por_maquinario,
    }
