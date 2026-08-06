# Requisitos Detalhados e Arquitetura do Sistema CMMS

## 1. Visão Geral do Projeto
O objetivo é desenvolver um Sistema de Gestão de Manutenção Computadorizada (CMMS) web, utilizando **Flask** para o backend (API REST) e **React** para o frontend. O sistema deve ser modular e escalável, atendendo às necessidades de gestão de manutenção, incluindo chamados, custos, orçamentos, fornecedores, contratos, localizações e relatórios.

## 2. Requisitos Funcionais

| Módulo | Funcionalidade | Detalhes |
| :--- | :--- | :--- |
| **Localizações** | CRUD de Localizações | Permitir o cadastro, visualização, edição e exclusão de locais onde os equipamentos estão instalados. |
| **Fornecedores** | CRUD de Fornecedores | Permitir o cadastro, visualização, edição e exclusão de fornecedores de serviços e materiais. |
| **Contratos** | CRUD de Contratos | Permitir o cadastro de contratos de manutenção/serviço. Incluir campos para data de início, data de vencimento, valor, fornecedor e localização. |
| | Anexos de Contratos | Permitir o upload e download de arquivos de contrato. |
| | Alerta de Vencimento | Enviar alertas por email para o usuário administrador sobre contratos próximos ao vencimento (ex: 30, 15, 7 dias antes). |
| **Orçamentos** | CRUD de Orçamentos | Permitir o cadastro de orçamentos. Incluir campos para descrição, valor total, fornecedor e localização. |
| | Anexos de Orçamentos | Permitir o upload e download de arquivos de orçamento. |
| **Chamados** | Abertura de Chamados | Permitir a criação de novos chamados de manutenção. Incluir campos para descrição, prioridade, localização e status. |
| | Gestão de Custos | Permitir adicionar múltiplos itens de custo (mão de obra, material, etc.) a um chamado em andamento. |
| | Vínculo de Orçamento | Permitir vincular um orçamento cadastrado ao chamado. |
| | Status do Chamado | Gerenciar o status do chamado (Aberto, Em Andamento, Concluído, Cancelado). |
| **Usuários** | Gestão de Usuários | Permitir o cadastro e gerenciamento de usuários com diferentes níveis de acesso (ex: Administrador, Técnico, Usuário Comum). |
| **Configurações** | Configuração de Email | Interface para configurar o servidor SMTP (host, porta, usuário, senha, segurança) para envio de alertas. |
| **Relatórios** | Relatórios Personalizados | Interface para gerar relatórios com filtros por localização, fornecedor, período, status do chamado, etc. (Ex: Custo total por localização, Chamados abertos/fechados no mês). |

## 3. Arquitetura do Banco de Dados (Modelo Entidade-Relacionamento Simplificado)

O banco de dados será implementado com **SQLite** inicialmente (para simplicidade e portabilidade) e **SQLAlchemy** como ORM no Flask.

### Entidades Principais e Campos (Esquema Provisório)

| Entidade | Campos Principais | Relacionamentos |
| :--- | :--- | :--- |
| **Localizacao** | `id`, `nome`, `descricao` | 1:N com Chamado, Contrato, Orcamento |
| **Fornecedor** | `id`, `nome`, `contato`, `email`, `telefone` | 1:N com Contrato, Orcamento |
| **Usuario** | `id`, `nome`, `email`, `senha_hash`, `papel` (Admin/Tecnico/Comum) | |
| **ConfigEmail** | `id`, `host_smtp`, `porta`, `usuario_smtp`, `senha_smtp`, `seguranca` | 1:1 com Sistema |
| **Contrato** | `id`, `titulo`, `data_inicio`, `data_vencimento`, `valor`, `fornecedor_id`, `localizacao_id` | N:1 com Fornecedor, Localizacao |
| **AnexoContrato** | `id`, `nome_arquivo`, `caminho_arquivo`, `contrato_id` | N:1 com Contrato |
| **Orcamento** | `id`, `titulo`, `valor_total`, `fornecedor_id`, `localizacao_id` | N:1 com Fornecedor, Localizacao |
| **AnexoOrcamento** | `id`, `nome_arquivo`, `caminho_arquivo`, `orcamento_id` | N:1 com Orcamento |
| **Chamado** | `id`, `titulo`, `descricao`, `status`, `prioridade`, `data_abertura`, `localizacao_id`, `orcamento_id` | N:1 com Localizacao, Orcamento |
| **CustoChamado** | `id`, `descricao`, `valor`, `tipo_custo`, `chamado_id` | N:1 com Chamado |

## 4. Tecnologias Selecionadas

| Camada | Tecnologia | Justificativa |
| :--- | :--- | :--- |
| **Backend** | **Python/Flask** | Leve, rápido para prototipagem e ideal para API REST. |
| **Banco de Dados** | **SQLite** (com SQLAlchemy) | Simplicidade, zero-configuração e portabilidade para o ambiente sandbox. |
| **Frontend** | **React** | Framework moderno e robusto para criar interfaces de usuário interativas. |
| **Comunicação** | **API REST** (JSON) | Padrão para comunicação entre frontend e backend. |
| **Alertas** | **SMTPLib** (Python) | Para envio de emails de alerta de vencimento de contrato e outros. |

## 5. Próximos Passos
O próximo passo é estruturar o projeto Flask e configurar o ambiente de desenvolvimento.
- Criar a estrutura de pastas do projeto.
- Instalar dependências.
- Configurar o SQLAlchemy e o banco de dados inicial.
- Configurar o CORS para permitir a comunicação com o frontend React.
- Criar o modelo base para as entidades.
