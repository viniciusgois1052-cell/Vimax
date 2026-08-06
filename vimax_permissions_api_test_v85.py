#!/usr/bin/env python3
"""
Teste seguro das permissões personalizadas do Vimax v8.5.

O teste de API usa caminhos inexistentes sob cada módulo. Assim, o
before_request valida a permissão, mas nenhuma inclusão/edição/exclusão real
é executada.
"""

from __future__ import annotations

import argparse
import json
import os
import py_compile
import sys
import urllib.error
import urllib.request
from pathlib import Path


ACTIONS = {
    'ver': 'GET',
    'criar': 'POST',
    'editar': 'PUT',
    'excluir': 'DELETE',
}

MODULE_PATHS = {
    'chamados': '/api/chamados',
    'tipo_chamado': '/api/categorias-chamado',
    'tipo_servico': '/api/tipos-servico',
    'formularios_chamado': '/api/formularios-chamado',
    'contratos': '/api/contratos',
    'orcamentos': '/api/orcamentos',
    'compras': '/api/compras',
    'clientes': '/api/clientes',
    'lembretes': '/api/lembretes',
    'empresas': '/api/empresas',
    'localizacoes': '/api/localizacoes',
    'ativos': '/api/ativos',
    'fornecedores': '/api/fornecedores',
    'tipo_infraestrutura': '/api/tipos-infraestrutura',
    'infraestrutura': '/api/infraestruturas',
    'contadores_impressora': '/api/contadores-impressora',
    'relatorios': '/api/relatorios',
    'crm': '/api/crm',
    'marketing': '/api/marketing/contatos',
    'usuarios': '/api/usuarios',
    'perfis_acesso': '/api/perfis-acesso',
    'config_email': '/api/config/email',
    'logs': '/api/logs',
    'mobilemed': '/api/mobilemed',
}

READ_DEPENDENCIES = {
    'empresas': {
        'chamados', 'contratos', 'orcamentos', 'compras', 'clientes',
        'lembretes', 'ativos', 'fornecedores', 'localizacoes',
        'infraestrutura', 'formularios_chamado', 'relatorios', 'crm',
        'marketing',
    },
    'localizacoes': {
        'chamados', 'ativos', 'orcamentos', 'infraestrutura',
        'formularios_chamado',
    },
    'fornecedores': {
        'chamados', 'contratos', 'orcamentos', 'compras', 'ativos',
    },
    'tipo_chamado': {'chamados', 'formularios_chamado'},
    'tipo_servico': {'fornecedores', 'chamados'},
    'perfis_acesso': {'usuarios'},
}

LEGACY = {
    'admin': {module: set(ACTIONS) for module in MODULE_PATHS},
    'marketing': {
        'marketing': set(ACTIONS),
        'crm': set(ACTIONS),
    },
    'relatorios': {
        'relatorios': {'ver'},
        'lembretes': set(ACTIONS),
    },
    'gestao_documentos': {
        'contratos': set(ACTIONS),
        'clientes': set(ACTIONS),
        'lembretes': set(ACTIONS),
    },
    'self_service': {
        'chamados': {'ver', 'criar'},
    },
}

STATIC_MARKERS = {
    'backend/app/utils/permission_policy.py': (
        'def authorize_api_request',
        '_apply_request_company_scope',
    ),
    'backend/app/routes/perfil_acesso_routes.py': (
        'profile_is_within_scope',
        'require_profile_action',
    ),
    'backend/app/routes/usuario_routes.py': (
        "@usuario_bp.route('/me'",
        'Somente Super Admin pode gerar token',
    ),
    'backend/app/routes/relatorio_routes.py': (
        'def _execute_report_sql',
    ),
    'frontend/src/context/AuthContext.jsx': (
        "fetch('/api/usuarios/me'",
        'legacyPermissions',
    ),
}


def request_json(base_url, path, token, method='GET'):
    url = base_url.rstrip('/') + path
    body = b'{}' if method in {'POST', 'PUT', 'PATCH'} else None
    headers = {
        'X-API-Token': token,
        'Accept': 'application/json',
    }
    if body is not None:
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(
        url,
        data=body,
        headers=headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            raw = response.read()
            return response.status, json.loads(raw or b'{}')
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        try:
            payload = json.loads(raw or b'{}')
        except json.JSONDecodeError:
            payload = {'raw': raw.decode('utf-8', errors='replace')[:300]}
        return exc.code, payload


def direct_permission(user, module, action):
    role = str(user.get('role') or '').lower()
    if role == 'super_admin':
        return True
    profile = user.get('perfil_acesso')
    if profile is not None:
        return bool(profile.get(f'{module}_{action}', False))
    return action in LEGACY.get(role, {}).get(module, set())


def expected_permission(user, module, action):
    if action != 'ver':
        return direct_permission(user, module, action)
    if direct_permission(user, module, 'ver'):
        return True
    return any(
        direct_permission(user, dependency, 'ver')
        for dependency in READ_DEPENDENCIES.get(module, set())
    )


def run_static(root):
    failures = []
    for relative, markers in STATIC_MARKERS.items():
        path = root / relative
        if not path.is_file():
            failures.append(f'arquivo ausente: {relative}')
            continue
        content = path.read_text(encoding='utf-8')
        for marker in markers:
            if marker not in content:
                failures.append(f'marcador ausente em {relative}: {marker}')

    for path in (root / 'backend/app').rglob('*.py'):
        try:
            py_compile.compile(str(path), doraise=True)
        except py_compile.PyCompileError as exc:
            failures.append(str(exc))

    if failures:
        print('FALHA na validação estática:')
        for failure in failures:
            print(f'  - {failure}')
        return False
    print('OK: arquivos obrigatórios e sintaxe Python validados.')
    return True


def run_api(base_url, token):
    status, user = request_json(base_url, '/api/usuarios/me', token)
    if status != 200:
        print(f'FALHA: /api/usuarios/me retornou HTTP {status}: {user}')
        return False

    profile_name = (user.get('perfil_acesso') or {}).get('nome')
    print(
        'Testando usuário '
        f"{user.get('username')} | role={user.get('role')} | "
        f"perfil={profile_name or 'legado'}"
    )

    failures = []
    total = 0
    for module, prefix in MODULE_PATHS.items():
        for action, method in ACTIONS.items():
            total += 1
            expected = expected_permission(user, module, action)
            probe_path = prefix.rstrip('/') + '/__permission_probe__'
            probe_status, payload = request_json(
                base_url,
                probe_path,
                token,
                method=method,
            )
            authorized = probe_status not in (401, 403)
            if authorized != expected:
                failures.append(
                    f'{module}_{action}: esperado '
                    f'{"permitido" if expected else "negado"}, '
                    f'HTTP {probe_status}, resposta={payload}'
                )

    if failures:
        print(f'FALHA: {len(failures)} divergência(s) em {total} verificações:')
        for failure in failures:
            print(f'  - {failure}')
        return False

    print(f'OK: {total} permissões conferem com o perfil retornado pela API.')
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', help='Raiz do projeto para validação estática')
    parser.add_argument(
        '--base-url',
        help='URL do backend, por exemplo http://127.0.0.1:5000',
    )
    parser.add_argument(
        '--token',
        help='Token do usuário de teste; prefira usar --token-env',
    )
    parser.add_argument(
        '--token-env',
        default='VIMAX_TEST_TOKEN',
        help='Variável de ambiente com o token (padrão: VIMAX_TEST_TOKEN)',
    )
    args = parser.parse_args()

    if not args.root and not args.base_url:
        parser.error('informe --root e/ou --base-url')

    ok = True
    if args.root:
        ok = run_static(Path(args.root).resolve()) and ok

    if args.base_url:
        token = args.token or os.getenv(args.token_env)
        if not token:
            print(
                f'FALHA: informe --token ou defina a variável {args.token_env}.',
                file=sys.stderr,
            )
            return 2
        ok = run_api(args.base_url, token) and ok

    return 0 if ok else 1


if __name__ == '__main__':
    raise SystemExit(main())