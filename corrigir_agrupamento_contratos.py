#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Corrige o agrupamento de modelos/equipamentos nas telas de Contratos e Relatórios.

Principais correções:
- Não depende de comentários ou marcadores existentes nos arquivos.
- Localiza as funções pelas rotas Flask usando AST.
- Une modelos com espaços extras, caracteres invisíveis e diferenças de maiúsculas.
- Mantém a hierarquia: Modelo -> Empresa -> Ativos/Contratos.
- Conta contratos e ativos distintos.
- Rateia contratos vinculados a vários ativos para não duplicar os totais.
- Corrige a exportação de custos de contratos.
- Faz backup antes de alterar qualquer arquivo.
- Restaura os arquivos automaticamente se a validação Python falhar.

Uso:
    python3 corrigir_agrupamento_contratos_v4.py \
        --raiz /var/www/cmms_project \
        --reiniciar
"""

from __future__ import annotations

import argparse
import ast
import datetime as dt
import os
from pathlib import Path
import py_compile
import re
import shutil
import subprocess
import sys
import textwrap
from typing import Iterable, Optional, Sequence, Tuple


HELPER_CONTENT = r'''# -*- coding: utf-8 -*-
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
'''


CONTRATO_FUNCTION = r'''@contrato_bp.route('/custos', methods=['GET'])
def get_custos_contratos():
    from ..utils.custos_modelos import montar_custos_contratos

    empresa_id = request.args.get('empresa_id')
    api_token = request.headers.get('X-API-Token')

    user = None
    if api_token:
        user = Usuario.query.filter_by(api_token=api_token).first()

    query = Contrato.query
    query = apply_entity_filter(query, Contrato, empresa_id, user)
    dados = montar_custos_contratos(query.all())
    return jsonify(dados), 200
'''


RELATORIO_FUNCTION = r'''@relatorio_bp.route("/custos_contratos", methods=["GET"])
def relatorio_custos_contratos():
    from ..models.usuario import Usuario
    from ..utils.filters import apply_entity_filter
    from ..utils.custos_modelos import montar_custos_contratos

    empresa_id = request.args.get('empresa_id')
    api_token = request.headers.get('X-API-Token')

    user = None
    if api_token:
        user = Usuario.query.filter_by(api_token=api_token).first()

    query = Contrato.query
    query = apply_entity_filter(query, Contrato, empresa_id, user)
    dados = montar_custos_contratos(query.all())
    return jsonify(dados), 200
'''


EXPORT_FUNCTION = r'''@relatorio_bp.route("/export/custos_contratos", methods=["GET"])
def export_custos_contratos():
    from ..utils.custos_modelos import montar_custos_contratos

    dados = montar_custos_contratos(Contrato.query.all())

    rows = []
    for grupo in dados.get('grupos', []):
        for empresa in grupo.get('empresas', []):
            for item in empresa.get('ativos', []):
                rows.append([
                    grupo.get('tipo'),
                    empresa.get('empresa_nome'),
                    item.get('ativo_nome'),
                    item.get('numero_serie'),
                    item.get('contrato_numero'),
                    item.get('moeda_original'),
                    item.get('valor_original'),
                    item.get('valor_mensal_brl'),
                    item.get('valor_anual_acumulado'),
                ])

    buf = _make_excel([{
        'title': 'Custos por Modelo',
        'headers': [
            'Modelo', 'Empresa', 'Ativo', 'Numero de Serie', 'Contrato',
            'Moeda', 'Valor Original', 'Mensal (BRL)', 'Acumulado (BRL)'
        ],
        'rows': rows,
    }])

    return send_file(
        buf,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=f"custos_contratos_{datetime.now().strftime('%Y%m%d')}.xlsx",
    )
'''


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Corrige o agrupamento de modelos em Contratos e Relatorios."
    )
    parser.add_argument(
        "--raiz",
        default="/var/www/cmms_project",
        help="Raiz do projeto. Padrao: /var/www/cmms_project",
    )
    parser.add_argument(
        "--reiniciar",
        action="store_true",
        help="Reinicia cmms-backend.service e cmms-frontend.service.",
    )
    return parser.parse_args()


def route_from_decorator(decorator: ast.expr) -> Optional[str]:
    if not isinstance(decorator, ast.Call):
        return None
    func = decorator.func
    if not isinstance(func, ast.Attribute) or func.attr != "route":
        return None
    if not decorator.args:
        return None
    first = decorator.args[0]
    if isinstance(first, ast.Constant) and isinstance(first.value, str):
        return first.value
    return None


def find_function_span(
    content: str,
    names: Sequence[str],
    route: Optional[str] = None,
) -> Tuple[int, int, str]:
    """Retorna linhas zero-based [inicio:fim] incluindo os decoradores."""
    tree = ast.parse(content)
    candidates = []

    for node in tree.body:
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue

        routes = [route_from_decorator(d) for d in node.decorator_list]
        route_match = route is not None and route in routes
        name_match = node.name in names

        if route_match or name_match:
            first_line = node.lineno
            if node.decorator_list:
                first_line = min(d.lineno for d in node.decorator_list)
            candidates.append((first_line - 1, node.end_lineno, node.name, route_match))

    if not candidates:
        raise RuntimeError(
            f"Funcao/rota nao encontrada. nomes={list(names)}, rota={route!r}"
        )

    # Rota exata tem prioridade sobre o nome.
    candidates.sort(key=lambda item: (not item[3], item[0]))
    start, end, name, _ = candidates[0]
    return start, end, name


def replace_function(
    path: Path,
    replacement: str,
    names: Sequence[str],
    route: Optional[str],
) -> str:
    content = path.read_text(encoding="utf-8")
    start, end, found_name = find_function_span(content, names, route)
    lines = content.splitlines(keepends=True)

    normalized = textwrap.dedent(replacement).strip() + "\n\n"
    new_lines = lines[:start] + [normalized] + lines[end:]
    path.write_text("".join(new_lines), encoding="utf-8")
    return found_name


def backup_files(paths: Iterable[Path], backup_dir: Path) -> None:
    for path in paths:
        if not path.exists():
            continue
        destination = backup_dir / path.name
        counter = 1
        while destination.exists():
            destination = backup_dir / f"{path.stem}_{counter}{path.suffix}"
            counter += 1
        shutil.copy2(path, destination)


def restore_files(mapping: Sequence[Tuple[Path, Path]]) -> None:
    for original, backup in mapping:
        if backup.exists():
            shutil.copy2(backup, original)


def patch_frontend(path: Path) -> list[str]:
    if not path.exists():
        return []

    content = path.read_text(encoding="utf-8")
    original = content
    changes = []

    replacements = [
        (
            "{grupo.empresas.reduce((s, e) => s + e.ativos.length, 0)} contrato(s)",
            "{grupo.total_contratos ?? grupo.empresas.reduce((s, e) => s + (e.total_contratos ?? e.ativos.length), 0)} contrato(s)",
            "contador de contratos do modelo",
        ),
        (
            "{emp.ativos.length} ativo(s)",
            "{emp.qtd_ativos ?? emp.ativos.length} ativo(s)",
            "contador de ativos da empresa",
        ),
    ]

    for old, new, label in replacements:
        if old in content:
            content = content.replace(old, new)
            changes.append(label)

    if content != original:
        path.write_text(content, encoding="utf-8")

    return changes


def validate_python(paths: Sequence[Path]) -> None:
    for path in paths:
        py_compile.compile(str(path), doraise=True)


def restart_service(service: str) -> None:
    result = subprocess.run(
        ["systemctl", "restart", service],
        text=True,
        capture_output=True,
    )
    if result.returncode != 0:
        error = (result.stderr or result.stdout or "erro desconhecido").strip()
        raise RuntimeError(f"Falha ao reiniciar {service}: {error}")
    print(f"OK: {service} reiniciado")


def main() -> int:
    args = parse_args()
    root = Path(args.raiz).resolve()

    contrato_routes = root / "backend/app/routes/contrato_routes.py"
    relatorio_routes = root / "backend/app/routes/relatorio_routes.py"
    helper = root / "backend/app/utils/custos_modelos.py"
    contratos_frontend = root / "frontend/src/pages/Contratos.jsx"

    required = [contrato_routes, relatorio_routes]
    missing = [str(path) for path in required if not path.exists()]
    if missing:
        print("ERRO: arquivos obrigatorios nao encontrados:", file=sys.stderr)
        for item in missing:
            print(f"  - {item}", file=sys.stderr)
        return 1

    timestamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = root / "backups" / f"agrupamento_contratos_v4_{timestamp}"
    backup_dir.mkdir(parents=True, exist_ok=True)

    files_to_backup = [contrato_routes, relatorio_routes, contratos_frontend]
    if helper.exists():
        files_to_backup.append(helper)

    backup_mapping = []
    for path in files_to_backup:
        if path.exists():
            destination = backup_dir / path.relative_to(root)
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, destination)
            backup_mapping.append((path, destination))

    print(f"Backup criado em: {backup_dir}")

    try:
        helper.parent.mkdir(parents=True, exist_ok=True)
        helper.write_text(HELPER_CONTENT.rstrip() + "\n", encoding="utf-8")
        print(f"OK: helper criado/atualizado: {helper}")

        contrato_name = replace_function(
            contrato_routes,
            CONTRATO_FUNCTION,
            names=("get_custos_contratos", "custos_contratos"),
            route="/custos",
        )
        print(f"OK: rota /contratos/custos corrigida (funcao anterior: {contrato_name})")

        relatorio_name = replace_function(
            relatorio_routes,
            RELATORIO_FUNCTION,
            names=("relatorio_custos_contratos", "get_custos_contratos"),
            route="/custos_contratos",
        )
        print(f"OK: rota /relatorios/custos_contratos corrigida (funcao anterior: {relatorio_name})")

        try:
            export_name = replace_function(
                relatorio_routes,
                EXPORT_FUNCTION,
                names=("export_custos_contratos",),
                route="/export/custos_contratos",
            )
            print(f"OK: exportacao corrigida (funcao anterior: {export_name})")
        except RuntimeError as exc:
            print(f"AVISO: exportacao nao alterada: {exc}")

        frontend_changes = patch_frontend(contratos_frontend)
        if frontend_changes:
            print("OK: Contratos.jsx ajustado: " + ", ".join(frontend_changes))
        else:
            print("INFO: Contratos.jsx ja estava compativel ou usa outra formatacao; nenhuma alteracao necessaria")

        validate_python([helper, contrato_routes, relatorio_routes])
        print("OK: validacao Python concluida")

    except Exception as exc:
        print(f"ERRO: {exc}", file=sys.stderr)
        print("Restaurando arquivos a partir do backup...", file=sys.stderr)
        restore_files(backup_mapping)
        if not any(original == helper for original, _ in backup_mapping) and helper.exists():
            helper.unlink()
        print("Arquivos restaurados.", file=sys.stderr)
        return 1

    if args.reiniciar:
        try:
            restart_service("cmms-backend.service")
            restart_service("cmms-frontend.service")
        except Exception as exc:
            print(f"AVISO: alteracoes aplicadas, mas houve erro no reinicio: {exc}", file=sys.stderr)
            print("Execute manualmente:", file=sys.stderr)
            print("  systemctl restart cmms-backend.service", file=sys.stderr)
            print("  systemctl restart cmms-frontend.service", file=sys.stderr)
            return 2

    print("\nCORRECAO CONCLUIDA")
    print("Agora os modelos iguais aparecem em um unico grupo, separados por empresa.")
    print("Os totais nao duplicam quando um contrato possui varios ativos.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
