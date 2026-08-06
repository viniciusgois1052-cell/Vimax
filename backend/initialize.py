#!/usr/bin/env python3
"""
Script de Inicialização Completa do CMMS
Executa setup do banco de dados e testa a API
"""

import sys
import os
import subprocess

def run_setup():
    """Executa o setup do banco de dados"""
    print("\n" + "=" * 70)
    print("  ETAPA 1: SETUP DO BANCO DE DADOS")
    print("=" * 70 + "\n")
    
    try:
        # Tentar executar o full_setup.py
        result = subprocess.run([sys.executable, 'full_setup.py'], 
                              capture_output=False, 
                              text=True)
        return result.returncode == 0
    except Exception as e:
        print(f"Erro ao executar setup: {e}")
        return False

def run_test():
    """Executa o teste da API"""
    print("\n" + "=" * 70)
    print("  ETAPA 2: TESTE DA API")
    print("=" * 70 + "\n")
    
    try:
        # Tentar executar o test_api.py
        result = subprocess.run([sys.executable, 'test_api.py'], 
                              capture_output=False, 
                              text=True)
        return result.returncode == 0
    except Exception as e:
        print(f"Erro ao executar teste: {e}")
        return False

def main():
    """Função principal"""
    print("\n" + "=" * 70)
    print("  INICIALIZAÇÃO COMPLETA DO CMMS")
    print("=" * 70)
    
    # Mudar para o diretório do script
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Executar setup
    print("\n📦 Executando setup do banco de dados...")
    setup_success = run_setup()
    
    if not setup_success:
        print("\n⚠️  Setup do banco de dados não completou com sucesso")
        print("Continuando com o teste da API...\n")
    
    # Executar teste
    print("\n🧪 Executando teste da API...")
    test_success = run_test()
    
    # Resumo final
    print("\n" + "=" * 70)
    print("  RESUMO FINAL")
    print("=" * 70)
    print(f"Setup do Banco de Dados: {'✅ OK' if setup_success else '⚠️  COM AVISOS'}")
    print(f"Teste da API: {'✅ OK' if test_success else '❌ FALHOU'}")
    print("=" * 70 + "\n")
    
    if test_success:
        print("✅ INICIALIZAÇÃO CONCLUÍDA COM SUCESSO!")
        print("\nPróximos passos:")
        print("  1. Reinicie o backend: sudo systemctl restart seu_servico")
        print("  2. Acesse: http://seu_ip:5173/config-email")
        print("  3. Configure seu servidor SMTP")
        print()
        return 0
    else:
        print("❌ INICIALIZAÇÃO COM PROBLEMAS!")
        print("\nVerifique os logs acima para mais detalhes.")
        print()
        return 1

if __name__ == '__main__':
    sys.exit(main())
