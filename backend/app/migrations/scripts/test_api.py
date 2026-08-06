#!/usr/bin/env python3
"""
Script de Teste da API
Verifica se o backend está funcionando corretamente
Versão 2.0 - Com melhor diagnóstico
"""

import sys
import os

# Adicionar o diretório atual ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_app():
    """Testa a aplicação Flask"""
    print("\n" + "=" * 70)
    print("  TESTE DA API - CMMS")
    print("=" * 70 + "\n")
    
    try:
        print("1. Criando aplicação Flask...")
        from app import create_app, db
        app = create_app()
        print("   ✓ Aplicação criada com sucesso\n")
        
        print("2. Testando contexto da aplicação...")
        with app.app_context():
            print("   ✓ Contexto ativo\n")
            
            print("3. Verificando banco de dados...")
            try:
                from app.models.config_email import ConfigEmail
                
                # Tentar contar registros na tabela config_email
                count = db.session.query(ConfigEmail).count()
                print(f"   ✓ Banco de dados acessível")
                print(f"   ✓ Registros em config_email: {count}\n")
                
                # Mostrar dados da configuração
                if count > 0:
                    config = db.session.query(ConfigEmail).first()
                    print("   Configuração atual:")
                    print(f"     - Servidor: {config.mail_server or '(vazio)'}")
                    print(f"     - Porta: {config.mail_port}")
                    print(f"     - TLS: {config.mail_use_tls}")
                    print(f"     - Usuário: {config.mail_username or '(vazio)'}")
                    print(f"     - Remetente: {config.mail_default_sender or '(vazio)'}")
                    print(f"     - Dias de alerta: {config.alert_days_before}")
                    print(f"     - Destinatários: {config.alert_recipients or '(vazio)'}\n")
                
            except Exception as e:
                print(f"   ⚠ Erro ao acessar banco: {e}\n")
                import traceback
                traceback.print_exc()
            
            print("4. Testando rotas registradas...")
            routes = []
            for rule in app.url_map.iter_rules():
                if 'api' in rule.rule:
                    routes.append(rule.rule)
            
            if routes:
                print(f"   ✓ {len(routes)} rotas da API encontradas:")
                # Mostrar apenas rotas de config/email
                email_routes = [r for r in routes if 'config/email' in r]
                for route in email_routes:
                    print(f"     - {route}")
                if len(routes) > len(email_routes):
                    print(f"     ... e mais {len(routes) - len(email_routes)} rotas")
            else:
                print("   ⚠ Nenhuma rota da API encontrada")
            print()
        
        print("5. Testando cliente HTTP...")
        with app.test_client() as client:
            print("   Testando GET /api/config/email...")
            response = client.get('/api/config/email')
            print(f"   Status: {response.status_code}")
            print(f"   Headers CORS: {response.headers.get('Access-Control-Allow-Origin', 'NÃO ENCONTRADO')}")
            
            if response.status_code == 200:
                print(f"   ✓ Resposta recebida com sucesso")
                data = response.get_json()
                if data:
                    print(f"   Dados retornados:")
                    for key, value in data.items():
                        if key != 'mail_password':
                            print(f"     - {key}: {value}")
            else:
                print(f"   ⚠ Status: {response.status_code}")
                try:
                    print(f"   Resposta: {response.get_json()}")
                except:
                    print(f"   Resposta: {response.data}")
            print()
        
        print("=" * 70)
        print("✅ TESTE CONCLUÍDO COM SUCESSO!")
        print("=" * 70 + "\n")
        return True
        
    except ImportError as e:
        print(f"\n❌ ERRO DE IMPORTAÇÃO: {e}")
        print("\nVerifique se todos os módulos necessários estão instalados:")
        print("  pip3 install flask flask-sqlalchemy flask-cors flask-bcrypt flask-mail pymysql")
        import traceback
        traceback.print_exc()
        print("\n" + "=" * 70)
        print("❌ TESTE FALHOU!")
        print("=" * 70 + "\n")
        return False
        
    except Exception as e:
        print(f"\n❌ ERRO DURANTE O TESTE: {e}")
        import traceback
        traceback.print_exc()
        print("\n" + "=" * 70)
        print("❌ TESTE FALHOU!")
        print("=" * 70 + "\n")
        return False

if __name__ == '__main__':
    success = test_app()
    sys.exit(0 if success else 1)
