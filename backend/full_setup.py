#!/usr/bin/env python3
"""
Script Completo de Setup do CMMS
- Migração automática do banco de dados
- Validação de configurações
- Teste de conexão SMTP
- Inicialização de dados padrão
"""

import os
import sys
import pymysql
from pymysql.cursors import DictCursor
from datetime import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import json

class CMSSSetup:
    def __init__(self):
        self.log = []
        self.config = self.load_config()
        self.connection = None
        self.cursor = None
        self.errors = []
        self.warnings = []
        
    def load_config(self):
        """Carrega configurações do ambiente"""
        config = {
            'mysql_host': os.environ.get('MYSQL_HOST', 'localhost'),
            'mysql_user': os.environ.get('MYSQL_USER', 'cmms_user'),
            'mysql_password': os.environ.get('MYSQL_PASSWORD', 'cmms_pass'),
            'mysql_db': os.environ.get('MYSQL_DB', 'cmms_db'),
        }
        return config
    
    def log_message(self, message, level='INFO', show=True):
        """Registra mensagens de log"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_entry = f"[{timestamp}] [{level}] {message}"
        self.log.append(log_entry)
        if show:
            print(log_entry)
    
    def print_header(self, title):
        """Imprime um cabeçalho formatado"""
        print("\n" + "=" * 70)
        print(f"  {title}")
        print("=" * 70 + "\n")
    
    def print_section(self, title):
        """Imprime um título de seção"""
        print(f"\n{'─' * 70}")
        print(f"  {title}")
        print(f"{'─' * 70}\n")
    
    def connect_database(self):
        """Conecta ao banco de dados MySQL"""
        self.print_section("1. Conectando ao Banco de Dados")
        
        try:
            self.log_message(f"Conectando a {self.config['mysql_db']}@{self.config['mysql_host']}...")
            self.connection = pymysql.connect(
                host=self.config['mysql_host'],
                user=self.config['mysql_user'],
                password=self.config['mysql_password'],
                database=self.config['mysql_db'],
                charset='utf8mb4',
                cursorclass=DictCursor
            )
            self.cursor = self.connection.cursor()
            self.log_message("✓ Conexão estabelecida com sucesso!", 'SUCCESS')
            return True
        except pymysql.Error as e:
            self.log_message(f"✗ Erro de conexão: {e}", 'ERROR')
            self.errors.append(f"Conexão ao banco de dados falhou: {e}")
            return False
    
    def disconnect_database(self):
        """Desconecta do banco de dados"""
        if self.connection:
            self.connection.close()
            self.log_message("Desconectado do banco de dados", 'INFO', show=False)
    
    def execute_query(self, query, params=None):
        """Executa uma query com tratamento de erros"""
        try:
            if params:
                self.cursor.execute(query, params)
            else:
                self.cursor.execute(query)
            self.connection.commit()
            return True
        except pymysql.Error as e:
            self.connection.rollback()
            self.log_message(f"Erro SQL: {e}", 'ERROR')
            return False
    
    def migrate_config_email_table(self):
        """Migra a tabela config_email"""
        self.print_section("2. Migrando Tabela config_email")
        
        try:
            # Verificar se tabela existe
            self.cursor.execute("""
                SELECT 1 FROM information_schema.TABLES 
                WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'config_email'
            """, (self.config['mysql_db'],))
            
            table_exists = self.cursor.fetchone() is not None
            
            if not table_exists:
                self.log_message("Tabela não existe. Criando...")
                create_query = """
                CREATE TABLE config_email (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    mail_server VARCHAR(255) NOT NULL DEFAULT '',
                    mail_port INT NOT NULL DEFAULT 587,
                    mail_use_tls BOOLEAN NOT NULL DEFAULT TRUE,
                    mail_username VARCHAR(255) NOT NULL DEFAULT '',
                    mail_password VARCHAR(255) NOT NULL DEFAULT '',
                    mail_default_sender VARCHAR(255) NOT NULL DEFAULT '',
                    alert_days_before INT NOT NULL DEFAULT 30,
                    alert_recipients TEXT NOT NULL DEFAULT '',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """
                if self.execute_query(create_query):
                    self.log_message("✓ Tabela criada com sucesso", 'SUCCESS')
                else:
                    self.log_message("✗ Erro ao criar tabela", 'ERROR')
                    self.errors.append("Falha ao criar tabela config_email")
                    return False
            else:
                self.log_message("✓ Tabela já existe", 'SUCCESS')
                
                # Verificar e adicionar colunas faltantes
                columns_to_add = {
                    'mail_server': "VARCHAR(255) NOT NULL DEFAULT ''",
                    'mail_port': "INT NOT NULL DEFAULT 587",
                    'mail_use_tls': "BOOLEAN NOT NULL DEFAULT TRUE",
                    'mail_username': "VARCHAR(255) NOT NULL DEFAULT ''",
                    'mail_password': "VARCHAR(255) NOT NULL DEFAULT ''",
                    'mail_default_sender': "VARCHAR(255) NOT NULL DEFAULT ''",
                    'alert_days_before': "INT NOT NULL DEFAULT 30",
                    'alert_recipients': "TEXT NOT NULL DEFAULT ''",
                }
                
                for col_name, col_def in columns_to_add.items():
                    self.cursor.execute("""
                        SELECT 1 FROM information_schema.COLUMNS 
                        WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'config_email' AND COLUMN_NAME = %s
                    """, (self.config['mysql_db'], col_name))
                    
                    if not self.cursor.fetchone():
                        self.log_message(f"Adicionando coluna {col_name}...")
                        alter_query = f"ALTER TABLE config_email ADD COLUMN {col_name} {col_def}"
                        if self.execute_query(alter_query):
                            self.log_message(f"✓ Coluna {col_name} adicionada", 'SUCCESS')
                        else:
                            self.log_message(f"✗ Erro ao adicionar coluna {col_name}", 'ERROR')
                            self.errors.append(f"Falha ao adicionar coluna {col_name}")
                            return False
                    else:
                        self.log_message(f"✓ Coluna {col_name} já existe", 'SUCCESS')
            
            # Verificar registros padrão
            self.cursor.execute("SELECT COUNT(*) as count FROM config_email")
            result = self.cursor.fetchone()
            count = result['count'] if result else 0
            
            if count == 0:
                self.log_message("Criando registro padrão...")
                insert_query = """
                INSERT INTO config_email 
                (mail_server, mail_port, mail_use_tls, mail_username, mail_password, mail_default_sender, alert_days_before, alert_recipients)
                VALUES ('', 587, TRUE, '', '', '', 30, '')
                """
                if self.execute_query(insert_query):
                    self.log_message("✓ Registro padrão criado", 'SUCCESS')
                else:
                    self.log_message("✗ Erro ao criar registro padrão", 'ERROR')
                    self.errors.append("Falha ao criar registro padrão em config_email")
                    return False
            else:
                self.log_message(f"✓ Tabela contém {count} registro(s)", 'SUCCESS')
            
            return True
            
        except pymysql.Error as e:
            self.log_message(f"✗ Erro ao migrar tabela: {e}", 'ERROR')
            self.errors.append(f"Erro de migração: {e}")
            return False
    
    def validate_database_structure(self):
        """Valida a estrutura do banco de dados"""
        self.print_section("3. Validando Estrutura do Banco de Dados")
        
        try:
            # Verificar tabelas essenciais
            essential_tables = ['config_email', 'usuario', 'empresa', 'ativo', 'chamado', 'contrato']
            
            for table_name in essential_tables:
                self.cursor.execute("""
                    SELECT 1 FROM information_schema.TABLES 
                    WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s
                """, (self.config['mysql_db'], table_name))
                
                if self.cursor.fetchone():
                    self.log_message(f"✓ Tabela {table_name} existe", 'SUCCESS')
                else:
                    self.log_message(f"⚠ Tabela {table_name} não encontrada", 'WARNING')
                    self.warnings.append(f"Tabela {table_name} não existe")
            
            return True
            
        except pymysql.Error as e:
            self.log_message(f"✗ Erro ao validar estrutura: {e}", 'ERROR')
            return False
    
    def test_email_config(self):
        """Testa a configuração de email se disponível"""
        self.print_section("4. Testando Configuração de Email")
        
        try:
            self.cursor.execute("SELECT * FROM config_email LIMIT 1")
            config = self.cursor.fetchone()
            
            if not config or not config.get('mail_server'):
                self.log_message("⚠ Nenhuma configuração de email encontrada", 'WARNING')
                self.log_message("  Configure o email em: Configurações > Email", 'INFO')
                self.warnings.append("Email não configurado")
                return True
            
            self.log_message(f"Servidor SMTP: {config['mail_server']}:{config['mail_port']}")
            self.log_message(f"Usuário: {config['mail_username']}")
            self.log_message(f"TLS/SSL: {'Habilitado' if config['mail_use_tls'] else 'Desabilitado'}")
            
            # Tentar conectar ao servidor SMTP
            try:
                if config['mail_use_tls']:
                    server = smtplib.SMTP(config['mail_server'], config['mail_port'])
                    server.starttls()
                else:
                    server = smtplib.SMTP_SSL(config['mail_server'], config['mail_port'])
                
                # Tentar fazer login
                server.login(config['mail_username'], config['mail_password'])
                server.quit()
                
                self.log_message("✓ Conexão SMTP bem-sucedida!", 'SUCCESS')
                return True
                
            except smtplib.SMTPAuthenticationError:
                self.log_message("⚠ Erro de autenticação SMTP (usuário/senha incorretos)", 'WARNING')
                self.warnings.append("Credenciais SMTP inválidas")
                return True
            except Exception as e:
                self.log_message(f"⚠ Erro ao conectar SMTP: {e}", 'WARNING')
                self.warnings.append(f"Erro SMTP: {e}")
                return True
                
        except pymysql.Error as e:
            self.log_message(f"✗ Erro ao testar email: {e}", 'ERROR')
            return False
    
    def generate_report(self):
        """Gera um relatório final"""
        self.print_section("5. Relatório Final")
        
        print(f"Total de mensagens de log: {len(self.log)}")
        print(f"Erros encontrados: {len(self.errors)}")
        print(f"Avisos: {len(self.warnings)}")
        
        if self.errors:
            print("\n❌ ERROS:")
            for error in self.errors:
                print(f"  • {error}")
        
        if self.warnings:
            print("\n⚠️  AVISOS:")
            for warning in self.warnings:
                print(f"  • {warning}")
        
        if not self.errors:
            print("\n✅ SETUP CONCLUÍDO COM SUCESSO!")
            print("\nPróximos passos:")
            print("  1. Reinicie o backend: sudo systemctl restart seu_servico")
            print("  2. Acesse a página de configuração: http://seu_ip:5173/config-email")
            print("  3. Configure seu servidor SMTP")
            print("  4. Teste o envio de email")
        else:
            print("\n❌ SETUP FALHOU!")
            print("Verifique os erros acima e tente novamente.")
    
    def save_log_file(self, filename='setup.log'):
        """Salva o log em arquivo"""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                f.write('\n'.join(self.log))
            self.log_message(f"Log salvo em {filename}", 'INFO', show=False)
        except Exception as e:
            self.log_message(f"Erro ao salvar log: {e}", 'ERROR')
    
    def run(self):
        """Executa o setup completo"""
        self.print_header("CMMS - Setup Completo do Sistema")
        
        print(f"Configurações:")
        print(f"  Host MySQL: {self.config['mysql_host']}")
        print(f"  Usuário: {self.config['mysql_user']}")
        print(f"  Banco de Dados: {self.config['mysql_db']}")
        
        # Executar etapas
        if not self.connect_database():
            self.generate_report()
            self.save_log_file()
            return False
        
        try:
            if not self.migrate_config_email_table():
                self.generate_report()
                self.save_log_file()
                return False
            
            if not self.validate_database_structure():
                self.generate_report()
                self.save_log_file()
                return False
            
            if not self.test_email_config():
                self.generate_report()
                self.save_log_file()
                return False
            
            self.generate_report()
            self.save_log_file()
            
            return len(self.errors) == 0
            
        finally:
            self.disconnect_database()

def main():
    """Função principal"""
    setup = CMSSSetup()
    success = setup.run()
    return 0 if success else 1

if __name__ == '__main__':
    sys.exit(main())
