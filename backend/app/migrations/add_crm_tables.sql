-- Cria tabela crm_contacts
CREATE TABLE IF NOT EXISTS crm_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  empresa VARCHAR(200),
  telefone VARCHAR(50),
  empresa_id INTEGER,
  cargo VARCHAR(200),
  fonte VARCHAR(100),
  responsavel_id INTEGER,
  estagio VARCHAR(100),
  valor_potencial FLOAT,
  notas TEXT,
  criado_em DATETIME DEFAULT (CURRENT_TIMESTAMP),
  atualizado_em DATETIME
);

-- Cria tabela crm_deals
CREATE TABLE IF NOT EXISTS crm_deals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo VARCHAR(300) NOT NULL,
  contato_id INTEGER,
  empresa_id INTEGER,
  valor FLOAT,
  estagio VARCHAR(100),
  responsavel_id INTEGER,
  data_prevista DATE,
  notas TEXT,
  criado_em DATETIME DEFAULT (CURRENT_TIMESTAMP),
  atualizado_em DATETIME
);

-- Indexes simples (opcional)
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON crm_contacts(email);
CREATE INDEX IF NOT EXISTS idx_crm_deals_contato_id ON crm_deals(contato_id);
