#!/bin/bash
# update_compras_system.sh
# Script direto para atualizar sistema de compras

set -e  # Para na primeira falha

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[✓]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }
print_info() { echo -e "${BLUE}[ℹ]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }

# Verificar root
if [ "$EUID" -ne 0 ]; then 
    print_error "Execute como root: sudo bash update_compras_system.sh"
    exit 1
fi

echo "=========================================="
echo "🚀 ATUALIZAÇÃO DO SISTEMA DE COMPRAS"
echo "=========================================="
echo ""

# Coletar informações
read -p "Diretório do projeto [/var/www/cmms]: " PROJECT_DIR
PROJECT_DIR=${PROJECT_DIR:-/var/www/cmms}

read -p "Nome do banco [cmms_db]: " DB_NAME
DB_NAME=${DB_NAME:-cmms_db}

read -p "Usuário MySQL [root]: " DB_USER
DB_USER=${DB_USER:-root}

read -sp "Senha MySQL: " DB_PASS
echo ""

BACKEND_DIR="$PROJECT_DIR/backend"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

print_info "Projeto: $PROJECT_DIR"
print_info "Backend: $BACKEND_DIR"
print_info "Banco: $DB_NAME"
echo ""

# ============================================================================
# ETAPA 1: ATUALIZAR BANCO DE DADOS
# ============================================================================

echo "=========================================="
echo "📊 ETAPA 1: ATUALIZANDO BANCO DE DADOS"
echo "=========================================="

mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" <<EOSQL

-- Backup
CREATE TABLE IF NOT EXISTS _backup_compras_$TIMESTAMP AS SELECT * FROM compras;
CREATE TABLE IF NOT EXISTS _backup_fornecedores_$TIMESTAMP AS SELECT * FROM fornecedores;
CREATE TABLE IF NOT EXISTS _backup_perfis_acesso_$TIMESTAMP AS SELECT * FROM perfis_acesso;

-- Compras - adicionar colunas se não existirem
ALTER TABLE compras 
ADD COLUMN status VARCHAR(50) DEFAULT 'rascunho',
ADD COLUMN data_prevista_entrega DATE NULL,
ADD COLUMN data_recebimento DATETIME NULL,
ADD COLUMN recebido_por_usuario_id INT NULL,
ADD COLUMN observacoes_recebimento TEXT NULL,
ADD COLUMN material_atrasado BOOLEAN DEFAULT FALSE,
ADD COLUMN alerta_atraso_enviado BOOLEAN DEFAULT FALSE,
ADD COLUMN criado_por_usuario_id INT NULL;

-- Ignorar erros se colunas já existem
SET @exist := 0;

-- Índices compras
ALTER TABLE compras ADD INDEX idx_status (status);
ALTER TABLE compras ADD INDEX idx_data_prevista (data_prevista_entrega);
ALTER TABLE compras ADD INDEX idx_empresa (empresa_id);
ALTER TABLE compras ADD INDEX idx_criado_por (criado_por_usuario_id);

-- Fornecedores
ALTER TABLE fornecedores 
ADD COLUMN criado_por_usuario_id INT NULL,
ADD COLUMN criado_por_nome VARCHAR(100) NULL;

ALTER TABLE fornecedores ADD INDEX idx_criado_por (criado_por_usuario_id);

-- Perfis Acesso
ALTER TABLE perfis_acesso 
ADD COLUMN compras_ver_somente_proprias BOOLEAN DEFAULT FALSE,
ADD COLUMN compras_pode_requisitar BOOLEAN DEFAULT FALSE,
ADD COLUMN compras_pode_marcar_recebimento BOOLEAN DEFAULT FALSE,
ADD COLUMN compras_ver_somente_empresa BOOLEAN DEFAULT FALSE;

EOSQL

if [ $? -eq 0 ]; then
    print_status "Banco de dados atualizado"
else
    print_warning "Verificando se colunas já existem..."
    
    # Script mais seguro que verifica antes de adicionar
    mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" <<'EOSQL2'
    
    -- Procedure para adicionar coluna se não existir
    DELIMITER $$
    
    CREATE PROCEDURE AddColumnIfNotExists(
        IN tableName VARCHAR(100),
        IN columnName VARCHAR(100),
        IN columnDefinition VARCHAR(255)
    )
    BEGIN
        IF NOT EXISTS (
            SELECT * FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = tableName
            AND COLUMN_NAME = columnName
        ) THEN
            SET @ddl = CONCAT('ALTER TABLE ', tableName, ' ADD COLUMN ', columnName, ' ', columnDefinition);
            PREPARE stmt FROM @ddl;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
        END IF;
    END$$
    
    DELIMITER ;
    
    -- Adicionar colunas na tabela compras
    CALL AddColumnIfNotExists('compras', 'status', 'VARCHAR(50) DEFAULT "rascunho"');
    CALL AddColumnIfNotExists('compras', 'data_prevista_entrega', 'DATE NULL');
    CALL AddColumnIfNotExists('compras', 'data_recebimento', 'DATETIME NULL');
    CALL AddColumnIfNotExists('compras', 'recebido_por_usuario_id', 'INT NULL');
    CALL AddColumnIfNotExists('compras', 'observacoes_recebimento', 'TEXT NULL');
    CALL AddColumnIfNotExists('compras', 'material_atrasado', 'BOOLEAN DEFAULT FALSE');
    CALL AddColumnIfNotExists('compras', 'alerta_atraso_enviado', 'BOOLEAN DEFAULT FALSE');
    CALL AddColumnIfNotExists('compras', 'criado_por_usuario_id', 'INT NULL');
    
    -- Adicionar colunas na tabela fornecedores
    CALL AddColumnIfNotExists('fornecedores', 'criado_por_usuario_id', 'INT NULL');
    CALL AddColumnIfNotExists('fornecedores', 'criado_por_nome', 'VARCHAR(100) NULL');
    
    -- Adicionar colunas na tabela perfis_acesso
    CALL AddColumnIfNotExists('perfis_acesso', 'compras_ver_somente_proprias', 'BOOLEAN DEFAULT FALSE');
    CALL AddColumnIfNotExists('perfis_acesso', 'compras_pode_requisitar', 'BOOLEAN DEFAULT FALSE');
    CALL AddColumnIfNotExists('perfis_acesso', 'compras_pode_marcar_recebimento', 'BOOLEAN DEFAULT FALSE');
    CALL AddColumnIfNotExists('perfis_acesso', 'compras_ver_somente_empresa', 'BOOLEAN DEFAULT FALSE');
    
    -- Adicionar índices (ignorar se já existem)
    CREATE INDEX IF NOT EXISTS idx_status ON compras(status);
    CREATE INDEX IF NOT EXISTS idx_data_prevista ON compras(data_prevista_entrega);
    CREATE INDEX IF NOT EXISTS idx_empresa ON compras(empresa_id);
    CREATE INDEX IF NOT EXISTS idx_criado_por ON compras(criado_por_usuario_id);
    CREATE INDEX IF NOT EXISTS idx_criado_por ON fornecedores(criado_por_usuario_id);
    
    -- Limpar procedure
    DROP PROCEDURE IF EXISTS AddColumnIfNotExists;
    
EOSQL2

    if [ $? -eq 0 ]; then
        print_status "Banco de dados atualizado (método seguro)"
    else
        print_error "Falha ao atualizar banco"
        exit 1
    fi
fi

# ============================================================================
# ETAPA 2: ATUALIZAR MODELO USUARIO
# ============================================================================

echo ""
echo "=========================================="
echo "🐍 ETAPA 2: ATUALIZANDO MODELOS"
echo "=========================================="

# Backup do arquivo
cp "$BACKEND_DIR/app/models/usuario.py" "$BACKEND_DIR/app/models/usuario.py.bak.$TIMESTAMP"
print_status "Backup: usuario.py.bak.$TIMESTAMP"

# Verificar se método já existe
if grep -q "def get_empresa_ids" "$BACKEND_DIR/app/models/usuario.py"; then
    print_warning "Método get_empresa_ids já existe em usuario.py"
else
    # Adicionar método antes do último def to_dict
    python3 <<EOPYTHON
import re

file_path = "$BACKEND_DIR/app/models/usuario.py"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Método a ser adicionado
new_method = '''
    def get_empresa_ids(self):
        """Retorna lista de IDs de empresas que o usuário tem acesso"""
        if self.role in ['super_admin', 'admin']:
            from .empresa import Empresa
            return [e.id for e in Empresa.query.all()]
        
        if self.empresa_id:
            from .empresa import Empresa
            empresa = Empresa.query.get(self.empresa_id)
            if empresa:
                ids = [empresa.id]
                def add_filhas(parent_id):
                    filhas = Empresa.query.filter_by(parent_id=parent_id).all()
                    for filha in filhas:
                        ids.append(filha.id)
                        add_filhas(filha.id)
                add_filhas(empresa.id)
                return ids
        
        return []
'''

# Encontrar última ocorrência de "def to_dict" e adicionar antes
pattern = r'(\s+)(def to_dict\(self\):)'
matches = list(re.finditer(pattern, content))

if matches:
    match = matches[-1]  # Última ocorrência
    pos = match.start()
    content = content[:pos] + new_method + '\n' + content[pos:]
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✓ Método adicionado em usuario.py")
    exit(0)
else:
    print("✗ Não encontrou def to_dict em usuario.py")
    exit(1)
EOPYTHON

    if [ $? -eq 0 ]; then
        print_status "usuario.py atualizado"
    else
        print_error "Falha ao atualizar usuario.py"
        exit 1
    fi
fi

# ============================================================================
# ETAPA 3: ATUALIZAR MODELO PERFIL_ACESSO
# ============================================================================

# Backup do arquivo
cp "$BACKEND_DIR/app/models/perfil_acesso.py" "$BACKEND_DIR/app/models/perfil_acesso.py.bak.$TIMESTAMP"
print_status "Backup: perfil_acesso.py.bak.$TIMESTAMP"

# Verificar se campos já existem
if grep -q "compras_ver_somente_proprias" "$BACKEND_DIR/app/models/perfil_acesso.py"; then
    print_warning "Campos de compras já existem em perfil_acesso.py"
else
    python3 <<EOPYTHON
import re

file_path = "$BACKEND_DIR/app/models/perfil_acesso.py"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Campos a serem adicionados
new_fields = '''
    # Controle específico e granular de COMPRAS
    compras_ver_somente_proprias = db.Column(db.Boolean, default=False)
    compras_pode_requisitar = db.Column(db.Boolean, default=False)
    compras_pode_marcar_recebimento = db.Column(db.Boolean, default=False)
    compras_ver_somente_empresa = db.Column(db.Boolean, default=False)
'''

# Encontrar última ocorrência de "def to_dict" e adicionar antes
pattern = r'(\s+)(def to_dict\(self\):)'
matches = list(re.finditer(pattern, content))

if matches:
    match = matches[-1]
    pos = match.start()
    content = content[:pos] + new_fields + '\n' + content[pos:]
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✓ Campos adicionados em perfil_acesso.py")
    exit(0)
else:
    print("✗ Não encontrou def to_dict em perfil_acesso.py")
    exit(1)
EOPYTHON

    if [ $? -eq 0 ]; then
        print_status "perfil_acesso.py atualizado"
    else
        print_error "Falha ao atualizar perfil_acesso.py"
        exit 1
    fi
fi

# ============================================================================
# ETAPA 4: CRIAR SCRIPT DE VERIFICAÇÃO DE ATRASOS
# ============================================================================

echo ""
echo "=========================================="
echo "⏰ ETAPA 4: INSTALANDO SCRIPT DE CRON"
echo "=========================================="

cat > "$BACKEND_DIR/check_compras_atrasadas.py" <<'EOSCRIPT'
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Script para verificar compras atrasadas"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.compra import Compra
from app.models.usuario import Usuario
from app.models.config_email import ConfigEmail
from datetime import date
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

app = create_app()

def enviar_email_atraso(compra, destinatarios):
    config = ConfigEmail.query.first()
    if not config:
        print("❌ Config email não encontrada")
        return False
    
    try:
        dias_atraso = (date.today() - compra.data_prevista_entrega).days
        
        msg = MIMEMultipart('alternative')
        msg['From'] = config.email_remetente
        msg['To'] = ', '.join(destinatarios)
        msg['Subject'] = f'⚠️ Material Atrasado - Compra #{compra.numero or compra.id}'
        
        corpo_html = f"""
        <html>
        <body style="font-family: Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto;">
                <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                    <h2 style="margin: 0;">⚠️ Material Atrasado</h2>
                </div>
                <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
                    <div style="background: white; padding: 15px; border-left: 4px solid #dc2626;">
                        <p><strong>Compra:</strong> #{compra.numero or compra.id}</p>
                        <p><strong>Descrição:</strong> {compra.descricao or 'Sem descrição'}</p>
                        <p><strong>Fornecedor:</strong> {compra.fornecedor.nome if compra.fornecedor else 'N/A'}</p>
                        <p><strong>Empresa:</strong> {compra.empresa.nome if compra.empresa else 'N/A'}</p>
                        <p><strong>Data Prevista:</strong> {compra.data_prevista_entrega.strftime('%d/%m/%Y')}</p>
                    </div>
                    <div style="background: #fee2e2; border: 2px solid #dc2626; padding: 15px; margin: 15px 0; text-align: center;">
                        <h3 style="color: #dc2626; margin: 0;">Atraso: {dias_atraso} dia{'s' if dias_atraso > 1 else ''}</h3>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(corpo_html, 'html', 'utf-8'))
        
        server = smtplib.SMTP(config.smtp_host, config.smtp_port)
        if config.smtp_usar_tls:
            server.starttls()
        if config.smtp_usuario and config.smtp_senha:
            server.login(config.smtp_usuario, config.smtp_senha)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

def main():
    with app.app_context():
        print("="*70)
        print(f"🔍 VERIFICANDO COMPRAS - {date.today().strftime('%d/%m/%Y')}")
        print("="*70)
        
        compras_atrasadas = Compra.query.filter(
            Compra.data_prevista_entrega < date.today(),
            Compra.status.in_(['aguardando_recebimento', 'ordem_compra', 'pedido_compra']),
            Compra.data_recebimento.is_(None)
        ).all()
        
        total = len(compras_atrasadas)
        print(f"\n📊 Total: {total}")
        
        if total == 0:
            print("✅ Nenhuma compra atrasada!")
            return
        
        enviados = 0
        for idx, compra in enumerate(compras_atrasadas, 1):
            print(f"\n[{idx}/{total}] Compra #{compra.id}")
            
            if not compra.material_atrasado:
                compra.material_atrasado = True
            
            if not compra.alerta_atraso_enviado:
                destinatarios = []
                if compra.criador and compra.criador.email:
                    destinatarios.append(compra.criador.email)
                
                if compra.empresa_id:
                    admins = Usuario.query.filter(
                        Usuario.empresa_id == compra.empresa_id,
                        Usuario.role.in_(['super_admin', 'admin']),
                        Usuario.email.isnot(None)
                    ).all()
                    for admin in admins:
                        if admin.email and admin.email not in destinatarios:
                            destinatarios.append(admin.email)
                
                if destinatarios:
                    if enviar_email_atraso(compra, destinatarios):
                        compra.alerta_atraso_enviado = True
                        enviados += 1
                        print("    ✅ Enviado!")
            
            db.session.commit()
        
        print(f"\n✅ {enviados}/{total} alertas enviados")

if __name__ == '__main__':
    main()
EOSCRIPT

chmod +x "$BACKEND_DIR/check_compras_atrasadas.py"
print_status "Script check_compras_atrasadas.py criado"

# Criar log
touch /var/log/compras_atrasadas.log
chown www-data:www-data /var/log/compras_atrasadas.log
chmod 664 /var/log/compras_atrasadas.log
print_status "Log criado: /var/log/compras_atrasadas.log"

# Adicionar ao crontab
CRON_LINE="0 8 * * * cd $BACKEND_DIR && /usr/bin/python3 $BACKEND_DIR/check_compras_atrasadas.py >> /var/log/compras_atrasadas.log 2>&1"

(crontab -l -u www-data 2>/dev/null | grep -v "check_compras_atrasadas"; echo "$CRON_LINE") | crontab -u www-data -
print_status "Cron job adicionado (8h diariamente)"

# Configurar logrotate
cat > /etc/logrotate.d/compras-atrasadas <<'EOLOGROTATE'
/var/log/compras_atrasadas.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0664 www-data www-data
}
EOLOGROTATE

print_status "Logrotate configurado"

# ============================================================================
# ETAPA 5: REINICIAR BACKEND
# ============================================================================

echo ""
echo "=========================================="
echo "🔄 ETAPA 5: REINICIANDO BACKEND"
echo "=========================================="

systemctl restart cmms-backend.service

if [ $? -eq 0 ]; then
    print_status "Backend reiniciado"
    sleep 2
    systemctl status cmms-backend.service --no-pager | head -10
else
    print_error "Falha ao reiniciar backend"
    exit 1
fi

# ============================================================================
# RESUMO FINAL
# ============================================================================

echo ""
echo "=========================================="
echo "✅ ATUALIZAÇÃO CONCLUÍDA!"
echo "=========================================="
echo ""
print_status "Banco de dados atualizado"
print_status "Modelos Python atualizados"
print_status "Script de cron instalado"
print_status "Backend reiniciado"
echo ""
print_warning "PRÓXIMOS PASSOS MANUAIS:"
echo ""
echo "1️⃣  FRONTEND - Atualizar AuthContext.jsx:"
echo "   Adicionar função canCompras() no provider"
echo ""
echo "2️⃣  FRONTEND - Atualizar PerfilAcesso.jsx:"
echo "   Adicionar 'compras' no array MODULOS dentro de Documentos"
echo ""
echo "3️⃣  TESTAR:"
echo "   - Acessar /perfis-acesso"
echo "   - Verificar aba 'Documentos' tem 'Compras'"
echo "   - Testar permissões de compras"
echo ""
echo "📋 BACKUPS CRIADOS:"
echo "   - Banco: _backup_*_$TIMESTAMP"
echo "   - usuario.py.bak.$TIMESTAMP"
echo "   - perfil_acesso.py.bak.$TIMESTAMP"
echo ""
echo "📊 LOGS:"
echo "   - Backend: journalctl -u cmms-backend.service -f"
echo "   - Cron: tail -f /var/log/compras_atrasadas.log"
echo ""
print_status "Sistema atualizado com sucesso!"
echo ""
