#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Execute como root: sudo $0"
  exit 1
fi

PACOTE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VIEWS_SQL="${PACOTE_DIR}/01_grafana_views.sql"
CREDENCIAL="/root/cmms-grafana-credenciais.txt"

read -r -p "IP privado do servidor Grafana: " GRAFANA_IP
read -r -p "IP privado deste servidor CMMS/MySQL: " CMMS_IP

python3 - "$GRAFANA_IP" "$CMMS_IP" <<'PY'
import ipaddress
import sys

for value, label in zip(sys.argv[1:], ("Grafana", "CMMS")):
    try:
        ip = ipaddress.ip_address(value)
    except ValueError:
        raise SystemExit(f"IP inválido para {label}: {value}")
    if not ip.is_private:
        raise SystemExit(
            f"O IP de {label} não é privado: {value}. "
            "Não exponha o MySQL diretamente à internet."
        )
PY

if ! ip -o addr show | grep -Fq " ${CMMS_IP}/"; then
  echo "O IP ${CMMS_IP} não está configurado neste servidor."
  echo "Nada foi alterado."
  exit 1
fi

if [[ ! -f "$VIEWS_SQL" ]]; then
  echo "Arquivo não encontrado: $VIEWS_SQL"
  exit 1
fi

DB_PASSWORD="$(openssl rand -hex 24)"
TMP_SQL="$(mktemp)"
chmod 600 "$TMP_SQL"
trap 'shred -u "$TMP_SQL" 2>/dev/null || true' EXIT

cat "$VIEWS_SQL" > "$TMP_SQL"

cat >> "$TMP_SQL" <<SQL

CREATE USER IF NOT EXISTS 'grafana_cmms'@'${GRAFANA_IP}'
IDENTIFIED BY '${DB_PASSWORD}';

ALTER USER 'grafana_cmms'@'${GRAFANA_IP}'
IDENTIFIED BY '${DB_PASSWORD}';

GRANT SELECT ON cmms_db.vw_grafana_empresas TO 'grafana_cmms'@'${GRAFANA_IP}';
GRANT SELECT ON cmms_db.vw_grafana_chamados TO 'grafana_cmms'@'${GRAFANA_IP}';
GRANT SELECT ON cmms_db.vw_grafana_projetos TO 'grafana_cmms'@'${GRAFANA_IP}';
GRANT SELECT ON cmms_db.vw_grafana_compras TO 'grafana_cmms'@'${GRAFANA_IP}';
GRANT SELECT ON cmms_db.vw_grafana_fornecedores TO 'grafana_cmms'@'${GRAFANA_IP}';
GRANT SELECT ON cmms_db.vw_grafana_ativos TO 'grafana_cmms'@'${GRAFANA_IP}';
GRANT SELECT ON cmms_db.vw_grafana_contratos TO 'grafana_cmms'@'${GRAFANA_IP}';

FLUSH PRIVILEGES;
SQL

echo
echo "O MySQL solicitará a senha administrativa."
mysql -u root -p < "$TMP_SQL"

cat > "$CREDENCIAL" <<EOF
CMMS_GRAFANA_DB_HOST=${CMMS_IP}
CMMS_GRAFANA_DB_PORT=3306
CMMS_GRAFANA_DB_USER=grafana_cmms
CMMS_GRAFANA_DB_PASSWORD=${DB_PASSWORD}
GRAFANA_IP_AUTORIZADO=${GRAFANA_IP}
EOF
chmod 600 "$CREDENCIAL"

if command -v ufw >/dev/null 2>&1 \
   && ufw status 2>/dev/null | grep -q '^Status: active'; then
  ufw allow from "$GRAFANA_IP" to "$CMMS_IP" port 3306 proto tcp
  echo "Firewall UFW: porta 3306 liberada somente para ${GRAFANA_IP}."
else
  echo
  echo "ATENÇÃO: UFW não está ativo."
  echo "Garanta no firewall da rede que somente ${GRAFANA_IP} alcance ${CMMS_IP}:3306."
fi

LISTEN="$(ss -lnt 2>/dev/null | awk '$4 ~ /:3306$/ {print $4}' | paste -sd, -)"

if [[ "$LISTEN" == *"127.0.0.1:3306"* ]] \
   || [[ "$LISTEN" == *"[::1]:3306"* ]] \
   || [[ -z "$LISTEN" ]]; then
  echo
  echo "O MySQL ainda não está ouvindo no IP privado."
  echo "Será criado um arquivo isolado de configuração."
  read -r -p "Configurar bind-address=${CMMS_IP} e reiniciar o MySQL? [s/N]: " RESPOSTA

  if [[ "${RESPOSTA,,}" == "s" ]]; then
    install -d -m 0755 /etc/mysql/mysql.conf.d
    if [[ -f /etc/mysql/mysql.conf.d/99-cmms-grafana.cnf ]]; then
      cp -a \
        /etc/mysql/mysql.conf.d/99-cmms-grafana.cnf \
        "/etc/mysql/mysql.conf.d/99-cmms-grafana.cnf.bak-$(date +%Y%m%d-%H%M%S)"
    fi
    cat > /etc/mysql/mysql.conf.d/99-cmms-grafana.cnf <<EOF
[mysqld]
bind-address = ${CMMS_IP}
EOF
    chmod 0644 /etc/mysql/mysql.conf.d/99-cmms-grafana.cnf

    if systemctl list-unit-files | grep -q '^mysql\.service'; then
      systemctl restart mysql
      systemctl status mysql --no-pager
    elif systemctl list-unit-files | grep -q '^mariadb\.service'; then
      systemctl restart mariadb
      systemctl status mariadb --no-pager
    else
      echo "Serviço MySQL/MariaDB não localizado. Reinicie-o manualmente."
    fi
  else
    echo "Bind não alterado. A conexão remota ainda não funcionará."
  fi
fi

echo
echo "============================================================"
echo "LADO CMMS CONFIGURADO"
echo "============================================================"
echo "Views criadas e usuário restrito ao IP ${GRAFANA_IP}."
echo "Credenciais protegidas em: ${CREDENCIAL}"
echo "Envie esse arquivo ao administrador do servidor Grafana por canal seguro."
echo
ss -lnt | grep ':3306' || true
