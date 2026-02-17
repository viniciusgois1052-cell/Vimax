from app import create_app, db
from app.models.chamado import Chamado
from sqlalchemy import text

def limpar_chamados():
    app = create_app()
    with app.app_context():
        print("Iniciando limpeza de chamados excluídos...")
        
        # Contar quantos chamados estão marcados como excluídos (ativo=False)
        excluidos_count = Chamado.query.filter_by(ativo=False).count()
        print(f"Encontrados {excluidos_count} chamados marcados como excluídos (soft-delete).")
        
        if excluidos_count > 0:
            # Remover permanentemente os chamados marcados como excluídos
            Chamado.query.filter_by(ativo=False).delete()
            db.session.commit()
            print(f"Sucesso: {excluidos_count} chamados foram removidos permanentemente do banco de dados.")
        else:
            print("Nenhum chamado excluído encontrado para remoção permanente.")
            
        # Verificar se existem chamados órfãos ou inconsistentes que possam afetar o relatório
        # (Opcional: você pode adicionar mais lógicas de limpeza aqui se necessário)
        
        print("Limpeza concluída. Os relatórios agora devem refletir apenas os dados ativos.")

if __name__ == "__main__":
    limpar_chamados()
