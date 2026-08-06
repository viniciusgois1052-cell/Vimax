# Documentação Técnica do Sistema CMMS (Computerized Maintenance Management System)

## 1. Visão Geral do Projeto

O Sistema CMMS foi desenvolvido para atender às necessidades de gestão de manutenção de equipamentos, abrangendo desde a abertura de chamados até o controle de custos, contratos, fornecedores e localizações.

## 2. Arquitetura do Sistema

O sistema adota uma arquitetura **Full-Stack** com separação clara entre o frontend e o backend, comunicando-se via **API RESTful**.

| Componente | Tecnologia | Função Principal |
| :--- | :--- | :--- |
| **Backend (API)** | Python (Flask) | Lógica de negócio, persistência de dados, autenticação e agendamento de tarefas. |
| **Frontend (UI)** | JavaScript (React) | Interface do usuário e interação com a API. |
| **Banco de Dados** | SQLite (SQLAlchemy ORM) | Armazenamento de dados da aplicação. |
| **Servidor Web** | Vite (para desenvolvimento), Gunicorn/Waitress (para produção) | Servir o frontend e o backend. |

## 3. Estrutura do Backend (Flask)

O backend é construído com Flask e segue uma estrutura modular:

```
cmms_project/backend/
├── app/
│   ├── config/
│   │   └── config.py          # Configurações do Flask e SQLAlchemy
│   ├── models/
│   │   ├── chamado.py         # Modelo Chamado e CustoChamado
│   │   ├── config_email.py    # Modelo ConfigEmail
│   │   ├── contrato.py        # Modelo Contrato
│   │   ├── fornecedor.py      # Modelo Fornecedor
│   │   ├── localizacao.py     # Modelo Localizacao
│   │   ├── orcamento.py       # Modelo Orcamento
│   │   ├── usuario.py         # Modelo Usuario
│   │   └── __init__.py
│   ├── routes/
│   │   ├── chamado_routes.py  # Rotas para Chamados
│   │   ├── config_email_routes.py # Rotas para Configuração de Email
│   │   ├── contrato_routes.py # Rotas para Contratos
│   │   ├── fornecedor_routes.py # Rotas para Fornecedores
│   │   ├── localizacao_routes.py # Rotas para Localizacoes
│   │   ├── orcamento_routes.py  # Rotas para Orcamentos
│   │   ├── relatorio_routes.py  # Rotas para Relatórios
│   │   ├── usuario_routes.py    # Rotas para Usuários
│   │   └── __init__.py
│   ├── jobs/
│   │   └── contract_alerts.py # Lógica para alertas de vencimento de contratos
│   └── __init__.py            # Inicialização da aplicação e registro de rotas
├── run.py                     # Script de inicialização do servidor
├── requirements.txt           # Dependências do Python
└── instance/
    └── cmms.db                # Banco de dados SQLite
```

### 3.1. Modelos de Dados (Resumo)

| Entidade | Campos Chave | Relacionamentos | Funcionalidades Específicas |
| :--- | :--- | :--- | :--- |
| **Localizacao** | `id`, `nome`, `descricao` | Um para Muitos com Chamado, Orcamento, Contrato | CRUD simples. |
| **Fornecedor** | `id`, `nome`, `contato`, `email`, `telefone` | Um para Muitos com Orcamento, Contrato | CRUD simples. |
| **Contrato** | `id`, `numero`, `data_inicio`, `data_fim`, `valor`, `anexo_path` | Muitos para Um com Fornecedor, Localizacao | Alerta de vencimento por email. |
| **Orcamento** | `id`, `numero`, `valor`, `anexo_path` | Muitos para Um com Fornecedor, Localizacao | Anexos de documentos. |
| **Chamado** | `id`, `titulo`, `descricao`, `status`, `data_abertura` | Muitos para Um com Localizacao, Orcamento | Adição de custos dinâmicos (`CustoChamado`). |
| **CustoChamado** | `id`, `chamado_id`, `descricao`, `valor`, `data` | Muitos para Um com Chamado | Registro de custos durante o andamento do chamado. |
| **Usuario** | `id`, `username`, `email`, `password_hash` | - | Autenticação e gestão de acesso. |
| **ConfigEmail** | `id`, `servidor`, `porta`, `usuario`, `senha` | - | Configuração do servidor de email para alertas. |

## 4. Estrutura do Frontend (React)

O frontend utiliza React com **Vite** e **Tailwind CSS** para uma interface moderna e responsiva.

```
cmms_project/frontend/
├── src/
│   ├── components/            # Componentes reutilizáveis (não implementado, mas recomendado)
│   ├── pages/
│   │   ├── Chamados.jsx       # Gestão de Chamados
│   │   ├── ConfigEmail.jsx    # Configuração de Email
│   │   ├── Contratos.jsx      # Gestão de Contratos
│   │   ├── Dashboard.jsx      # Visão geral
│   │   ├── Fornecedores.jsx   # Gestão de Fornecedores
│   │   ├── Localizacoes.jsx   # Gestão de Localizações
│   │   ├── Orcamentos.jsx     # Gestão de Orçamentos
│   │   ├── Relatorios.jsx     # Relatórios Personalizados
│   │   └── Usuarios.jsx       # Gestão de Usuários
│   └── App.jsx                # Roteamento principal e layout
├── vite.config.js             # Configuração do Vite com proxy para a API
└── package.json               # Dependências do Node.js
```

### 4.1. Configuração de Proxy (Vite)

Para facilitar o desenvolvimento e evitar problemas de CORS, o arquivo `vite.config.js` foi configurado para redirecionar todas as requisições para `/api` para o backend Flask:

```javascript
// vite.config.js
// ...
  server: {
    proxy: {
      '/api': {
        target: 'http://169.254.0.21:5002', // Endereço do servidor Flask
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
// ...
```

## 5. Funcionalidades Chave

### 5.1. Gestão de Chamados

- **Abertura e Acompanhamento:** CRUD completo de chamados.
- **Vínculo de Custos:** Possibilidade de adicionar múltiplos registros de custos (`CustoChamado`) a um chamado em andamento.
- **Vínculo de Recursos:** Chamados podem ser vinculados a uma `Localizacao` e a um `Orcamento`.

### 5.2. Gestão de Contratos

- **Anexos:** Suporte para anexar documentos de contrato.
- **Alertas de Vencimento:** Um job agendado (`Flask-APScheduler`) verifica diariamente os contratos próximos do vencimento e envia alertas por email, utilizando as configurações salvas em `ConfigEmail`.

### 5.3. Relatórios Personalizados

- A rota `/api/relatorios` permite a consulta e filtragem de dados de Chamados, Contratos e Orçamentos para geração de relatórios no frontend.

## 6. Instruções de Execução

### 6.1. Pré-requisitos

- Python 3.x
- Node.js e pnpm (ou npm/yarn)

### 6.2. Backend

1.  Navegue até o diretório do backend:
    `cd cmms_project/backend`
2.  Instale as dependências:
    `pip3 install -r requirements.txt`
3.  Inicialize o banco de dados (cria o arquivo `cmms.db`):
    `python3 create_db.py`
4.  Inicie o servidor Flask:
    `python3 run.py`

O servidor estará rodando em `http://127.0.0.1:5002`.

### 6.3. Frontend

1.  Navegue até o diretório do frontend:
    `cd cmms_project/frontend`
2.  Instale as dependências:
    `pnpm install`
3.  Inicie o servidor de desenvolvimento React:
    `pnpm run dev`

A aplicação estará acessível no endereço fornecido pelo Vite (ex: `http://localhost:5174`). Devido à configuração de proxy, ela se comunicará automaticamente com o backend.

## 7. Próximos Passos (Sugestões de Melhoria)

1.  **Autenticação Completa:** Implementar login/logout e proteção de rotas com JWT.
2.  **Upload de Arquivos:** Implementar o upload real de anexos para Contratos e Orçamentos (atualmente, armazena apenas o caminho).
3.  **Testes Unitários:** Adicionar testes de unidade e integração para o backend Flask.
4.  **Deploy:** Configurar um ambiente de produção (ex: Gunicorn + Nginx).
