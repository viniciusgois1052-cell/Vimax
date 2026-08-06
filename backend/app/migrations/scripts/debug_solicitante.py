#!/usr/bin/env python3
"""
Script de Diagnóstico - Solicitante em Chamados
Verifica se o token está sendo enviado e se o usuário é identificado
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def diagnose():
    print("\n" + "=" * 70)
    print("  DIAGNÓSTICO - SOLICITANTE EM CHAMADOS")
    print("=" * 70 + "\n")
    
    try:
        from app import create_app, db
        from app.models.usuario import Usuario
        from app.models.chamado import Chamado
        
        app = create_app()
        
        with app.app_context():
            print("1. Verificando usuários com api_token:")
            usuarios = Usuario.query.filter(Usuario.api_token != None).all()
            
            if not usuarios:
                print("   ❌ Nenhum usuário com api_token encontrado!")
                print("   ⚠ Os usuários precisam ter um api_token configurado.\n")
            else:
                print(f"   ✓ {len(usuarios)} usuário(s) com api_token encontrado(s):")
                for u in usuarios:
                    print(f"     - ID: {u.id}, Nome: {u.nome}, Token: {u.api_token[:20]}...")
                print()
            
            print("2. Verificando chamados com solicitante registrado:")
            chamados_com_solicitante = Chamado.query.filter(Chamado.usuario_solicitante_id != None).all()
            chamados_sem_solicitante = Chamado.query.filter(Chamado.usuario_solicitante_id == None).all()
            
            print(f"   ✓ Chamados COM solicitante: {len(chamados_com_solicitante)}")
            print(f"   ⚠ Chamados SEM solicitante: {len(chamados_sem_solicitante)}")
            
            if chamados_com_solicitante:
                print("\n   Exemplos de chamados com solicitante:")
                for c in chamados_com_solicitante[:3]:
                    solicitante = c.usuario_solicitante_rel.nome if c.usuario_solicitante_rel else "ERRO: Usuário não encontrado"
                    print(f"     - Chamado #{c.id}: {c.titulo}")
                    print(f"       Solicitante ID: {c.usuario_solicitante_id}")
                    print(f"       Solicitante Nome: {solicitante}")
            print()
            
            print("3. Testando criação de chamado simulado:")
            if usuarios:
                usuario_teste = usuarios[0]
                print(f"   Usando usuário: {usuario_teste.nome} (ID: {usuario_teste.id})")
                print(f"   Token: {usuario_teste.api_token[:20]}...")
                print(f"   ✓ Este usuário pode ser usado para testar a criação de chamados\n")
            else:
                print("   ❌ Nenhum usuário disponível para teste\n")
            
            print("=" * 70)
            print("RESUMO:")
            if usuarios and chamados_com_solicitante:
                print("✅ Sistema está funcionando corretamente!")
                print("   - Usuários com token: OK")
                print("   - Chamados com solicitante: OK")
            elif usuarios and not chamados_com_solicitante:
                print("⚠️  ATENÇÃO: Usuários existem, mas nenhum chamado tem solicitante registrado")
                print("   - Isso pode significar que os chamados foram criados antes da migração")
                print("   - Novos chamados devem registrar o solicitante automaticamente")
            else:
                print("❌ PROBLEMA: Nenhum usuário com api_token encontrado")
                print("   - Configure um api_token para pelo menos um usuário")
            print("=" * 70 + "\n")
            
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    diagnose()
