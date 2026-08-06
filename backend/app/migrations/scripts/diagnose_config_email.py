#!/usr/bin/env python3
"""
Script de Diagnóstico - Config Email
Identifica conflitos entre o modelo Python e a tabela MySQL
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import pymysql
from pymysql.cursors import DictCursor

def diagnose():
    """Diagnostica a tabela config_email"""
    print("\n" + "=" * 70)
    print("  DIAGNÓSTICO - CONFIG EMAIL")
    print("=" * 70 + "\n")
    
    # Conectar ao banco
    try:
        print("1. Conectando ao MySQL...")
        conn = pymysql.connect(
            host='localhost',
            user='cmms_user',
            password='cmms_pass',
            database='cmms_db',
            charset='utf8mb4',
            cursorclass=DictCursor
        )
        cursor = conn.cursor()
        print("   ✓ Conectado\n")
    except Exception as e:
        print(f"   ❌ Erro: {e}\n")
        return False
    
    try:
        # Verificar estrutura da tabela
        print("2. Estrutura da tabela config_email:")
        cursor.execute("DESCRIBE config_email")
        columns = cursor.fetchall()
        
        if not columns:
            print("   ❌ Tabela não encontrada!\n")
            return False
        
        print("   Colunas encontradas:")
        for col in columns:
            print(f"     - {col['Field']}: {col['Type']} (NULL: {col['Null']}, Default: {col['Default']})")
        print()
        
        # Verificar dados
        print("3. Dados na tabela:")
        cursor.execute("SELECT * FROM config_email LIMIT 1")
        row = cursor.fetchone()
        
        if row:
            print("   Primeiro registro:")
            for key, value in row.items():
                if key != 'mail_password':
                    print(f"     - {key}: {value} (tipo: {type(value).__name__})")
                else:
                    print(f"     - {key}: [OCULTO]")
            print()
        else:
            print("   ⚠ Nenhum registro encontrado\n")
        
        # Tentar carregar com SQLAlchemy
        print("4. Testando carregamento com SQLAlchemy...")
        try:
            from app import create_app, db
            from app.models.config_email import ConfigEmail
            
            app = create_app()
            with app.app_context():
                config = ConfigEmail.query.first()
                if config:
                    print("   ✓ Carregamento bem-sucedido!")
                    print(f"   Dados do modelo:")
                    print(f"     - ID: {config.id}")
                    print(f"     - Servidor: {getattr(config, 'mail_server', 'NÃO EXISTE')}")
                    print(f"     - Porta: {getattr(config, 'mail_port', 'NÃO EXISTE')}")
                    print(f"     - TLS: {getattr(config, 'mail_use_tls', 'NÃO EXISTE')}")
                    print(f"     - Usuário: {getattr(config, 'mail_username', 'NÃO EXISTE')}")
                    print(f"     - Remetente: {getattr(config, 'mail_default_sender', 'NÃO EXISTE')}")
                    print(f"     - Dias de alerta: {getattr(config, 'alert_days_before', 'NÃO EXISTE')}")
                    print(f"     - Destinatários: {getattr(config, 'alert_recipients', 'NÃO EXISTE')}")
                else:
                    print("   ⚠ Nenhum registro encontrado no modelo")
                print()
        except Exception as e:
            print(f"   ❌ Erro ao carregar com SQLAlchemy: {e}")
            import traceback
            traceback.print_exc()
            print()
        
        # Comparar colunas esperadas vs encontradas
        print("5. Validação de Colunas:")
        expected_columns = [
            'id',
            'mail_server',
            'mail_port',
            'mail_use_tls',
            'mail_username',
            'mail_password',
            'mail_default_sender',
            'alert_days_before',
            'alert_recipients'
        ]
        
        found_columns = [col['Field'] for col in columns]
        
        missing = set(expected_columns) - set(found_columns)
        extra = set(found_columns) - set(expected_columns)
        
        if missing:
            print(f"   ❌ Colunas faltando: {', '.join(missing)}")
        else:
            print("   ✓ Todas as colunas esperadas encontradas")
        
        if extra:
            print(f"   ⚠ Colunas extras: {', '.join(extra)}")
        else:
            print("   ✓ Nenhuma coluna extra")
        print()
        
        print("=" * 70)
        if not missing:
            print("✅ DIAGNÓSTICO OK - Nenhum problema encontrado!")
        else:
            print("❌ DIAGNÓSTICO FALHOU - Colunas faltando!")
            print("\nSolução:")
            print("Execute o script de setup para adicionar as colunas faltantes:")
            print("  python3 full_setup.py")
        print("=" * 70 + "\n")
        
        return not missing
        
    except Exception as e:
        print(f"❌ Erro durante diagnóstico: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        conn.close()

if __name__ == '__main__':
    success = diagnose()
    sys.exit(0 if success else 1)
