import mysql.connector
import os
import sys

# Adicionar o diretório atual ao path para importar as configurações
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app.config.config import Config
    
    print(f"Conectando ao banco de dados {Config.MYSQL_DB} em {Config.MYSQL_HOST}...")
    
    conn = mysql.connector.connect(
        host=Config.MYSQL_HOST,
        user=Config.MYSQL_USER,
        password=Config.MYSQL_PASSWORD,
        database=Config.MYSQL_DB
    )
    cursor = conn.cursor()
    
    # Atualizar tamanho da coluna role para suportar 'empresa_restrita'
    print("Atualizando coluna 'role' para suportar novo perfil...")
    cursor.execute("ALTER TABLE usuarios MODIFY COLUMN role VARCHAR(30) DEFAULT 'admin'")
    conn.commit()
    print("Coluna 'role' atualizada com sucesso!")
    
    # Verificar usuários existentes
    cursor.execute("SELECT id, username, role, empresa_id FROM usuarios")
    usuarios = cursor.fetchall()
    
    print(f"\nUsuários existentes ({len(usuarios)}):")
    for user in usuarios:
        id_user, username, role, empresa_id = user
        acesso = f"Empresa ID: {empresa_id}" if empresa_id else "Acesso Global"
        print(f"  ID: {id_user}, Username: {username}, Role: {role}, {acesso}")
    
    cursor.close()
    conn.close()
    
    print("\n✅ Banco de dados atualizado com sucesso!")
    print("O novo perfil 'empresa_restrita' já pode ser usado.")

except Exception as e:
    print(f"❌ Erro ao atualizar o banco de dados: {e}")
