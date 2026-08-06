USE cmms_db;

-- Views exclusivamente analíticas. Não alteram dados da aplicação.

CREATE OR REPLACE SQL SECURITY DEFINER VIEW vw_grafana_empresas AS
SELECT
    e.id,
    e.nome,
    e.parent_id
FROM empresas e;

CREATE OR REPLACE SQL SECURITY DEFINER VIEW vw_grafana_chamados AS
SELECT
    c.id,
    c.empresa_id,
    COALESCE(e.nome, 'Sem empresa') AS empresa_nome,
    c.titulo,
    c.status AS status_original,
    CASE
        WHEN UPPER(TRIM(COALESCE(c.status, ''))) IN ('CONCLUÍDO', 'CONCLUIDO', 'FECHADO', 'RESOLVIDO')
            THEN 'CONCLUÍDO'
        WHEN UPPER(TRIM(COALESCE(c.status, ''))) = 'CANCELADO'
            THEN 'CANCELADO'
        WHEN UPPER(TRIM(COALESCE(c.status, ''))) IN ('EM ATENDIMENTO', 'EM_ANDAMENTO', 'EM ANDAMENTO')
            THEN 'EM ATENDIMENTO'
        ELSE 'ABERTO'
    END AS status_grupo,
    UPPER(TRIM(COALESCE(c.prioridade, 'SEM PRIORIDADE'))) AS prioridade,
    COALESCE(NULLIF(TRIM(c.tipo), ''), NULLIF(TRIM(c.tipo_chamado), ''), 'Não informado') AS tipo,
    c.data_abertura,
    c.data_solucao,
    c.created_at,
    COALESCE(c.valor_total, c.valor, 0) AS valor_total,
    CASE
        WHEN c.data_solucao IS NOT NULL
            THEN TIMESTAMPDIFF(HOUR, c.data_abertura, c.data_solucao)
        ELSE NULL
    END AS horas_solucao,
    CASE
        WHEN c.ativo = 1
         AND UPPER(TRIM(COALESCE(c.status, ''))) NOT IN (
             'CONCLUÍDO', 'CONCLUIDO', 'FECHADO', 'RESOLVIDO', 'CANCELADO'
         )
            THEN 1
        ELSE 0
    END AS em_aberto,
    c.ativo
FROM chamados c
LEFT JOIN empresas e ON e.id = c.empresa_id
WHERE c.ativo = 1;

CREATE OR REPLACE SQL SECURITY DEFINER VIEW vw_grafana_projetos AS
SELECT
    p.id,
    p.codigo,
    p.nome,
    p.empresa_principal_id AS empresa_id,
    COALESCE(e.nome, 'Sem empresa principal') AS empresa_nome,
    p.status AS status_original,
    CASE
        WHEN UPPER(TRIM(COALESCE(p.status, ''))) IN ('CONCLUÍDO', 'CONCLUIDO', 'FINALIZADO')
            THEN 'CONCLUÍDO'
        WHEN UPPER(TRIM(COALESCE(p.status, ''))) = 'ARQUIVADO'
            THEN 'ARQUIVADO'
        WHEN UPPER(TRIM(COALESCE(p.status, ''))) IN ('EM ANDAMENTO', 'EM_ANDAMENTO', 'EXECUÇÃO', 'EXECUCAO')
            THEN 'EM ANDAMENTO'
        ELSE 'PLANEJAMENTO'
    END AS status_grupo,
    p.prioridade,
    p.data_inicio,
    p.data_fim_prevista,
    p.data_fim_real,
    p.data_limite,
    COALESCE(p.percentual_concluido, 0) AS percentual_concluido,
    COALESCE(p.orcamento, 0) AS orcamento,
    COALESCE(p.custo_planejado, 0) AS custo_planejado,
    COALESCE(p.custo_real, 0) AS custo_real,
    COALESCE(p.custo_real, 0) - COALESCE(p.custo_planejado, 0) AS variacao_custo,
    CASE
        WHEN p.ativo = 1
         AND UPPER(TRIM(COALESCE(p.status, ''))) NOT IN (
             'CONCLUÍDO', 'CONCLUIDO', 'FINALIZADO', 'ARQUIVADO'
         )
         AND COALESCE(p.data_limite, p.data_fim_prevista) < NOW()
            THEN 1
        ELSE 0
    END AS atrasado,
    p.ativo,
    p.criado_em,
    p.atualizado_em
FROM projetos p
LEFT JOIN empresas e ON e.id = p.empresa_principal_id
WHERE p.ativo = 1;

CREATE OR REPLACE SQL SECURITY DEFINER VIEW vw_grafana_compras AS
SELECT
    CONCAT('RQ-', r.id) AS registro_uid,
    'REQUISIÇÃO' AS etapa,
    r.id AS registro_id,
    r.numero_rq AS numero,
    r.empresa_id,
    COALESCE(e.nome, 'Sem empresa') AS empresa_nome,
    r.projeto_id,
    p.codigo AS projeto_codigo,
    p.nome AS projeto_nome,
    r.status AS status_original,
    CASE
        WHEN UPPER(TRIM(COALESCE(r.status, ''))) IN ('APROVADA', 'APROVADO')
            THEN 'APROVADO'
        WHEN UPPER(TRIM(COALESCE(r.status, ''))) IN ('NEGADA', 'NEGADO', 'REJEITADA', 'REJEITADO')
            THEN 'NEGADO'
        WHEN UPPER(TRIM(COALESCE(r.status, ''))) IN ('CANCELADA', 'CANCELADO')
            THEN 'CANCELADO'
        WHEN UPPER(TRIM(COALESCE(r.status, ''))) = 'RASCUNHO'
            THEN 'RASCUNHO'
        ELSE 'PENDENTE'
    END AS status_grupo,
    r.data_solicitacao AS data_evento,
    r.data_necessaria AS data_prevista,
    r.data_recebimento AS data_real,
    COALESCE(ri.valor_total, 0) AS valor_total,
    'FORNECEDOR' AS tipo_compra,
    CASE
        WHEN r.ativo = 1
         AND r.data_necessaria IS NOT NULL
         AND r.data_necessaria < NOW()
         AND r.data_recebimento IS NULL
         AND UPPER(TRIM(COALESCE(r.status, ''))) NOT IN (
             'NEGADA', 'NEGADO', 'REJEITADA', 'REJEITADO', 'CANCELADA', 'CANCELADO'
         )
            THEN 1
        ELSE 0
    END AS atrasado,
    r.ativo
FROM requisicoes_compra r
LEFT JOIN empresas e ON e.id = r.empresa_id
LEFT JOIN projetos p ON p.id = r.projeto_id
LEFT JOIN (
    SELECT requisicao_id, SUM(COALESCE(valor_total, quantidade * valor_unitario, 0)) AS valor_total
    FROM itens_requisicao
    GROUP BY requisicao_id
) ri ON ri.requisicao_id = r.id
WHERE r.ativo = 1

UNION ALL

SELECT
    CONCAT('PC-', pc.id) AS registro_uid,
    'PEDIDO' AS etapa,
    pc.id AS registro_id,
    pc.numero_pc AS numero,
    pc.empresa_id,
    COALESCE(e.nome, 'Sem empresa') AS empresa_nome,
    r.projeto_id,
    p.codigo AS projeto_codigo,
    p.nome AS projeto_nome,
    pc.status AS status_original,
    CASE
        WHEN UPPER(TRIM(COALESCE(pc.status, ''))) IN ('APROVADA', 'APROVADO', 'EMITIDA', 'EMITIDO')
            THEN 'APROVADO'
        WHEN UPPER(TRIM(COALESCE(pc.status, ''))) IN ('NEGADA', 'NEGADO', 'REJEITADA', 'REJEITADO')
            THEN 'NEGADO'
        WHEN UPPER(TRIM(COALESCE(pc.status, ''))) IN ('CANCELADA', 'CANCELADO')
            THEN 'CANCELADO'
        WHEN UPPER(TRIM(COALESCE(pc.status, ''))) = 'RASCUNHO'
            THEN 'RASCUNHO'
        ELSE 'PENDENTE'
    END AS status_grupo,
    pc.data_emissao AS data_evento,
    pc.data_entrega_prevista AS data_prevista,
    COALESCE(pc.data_entrega_real, pc.data_recebimento) AS data_real,
    COALESCE(NULLIF(pc.valor_final, 0), pc.valor_total, 0) AS valor_total,
    CASE
        WHEN UPPER(TRIM(COALESCE(pc.tipo_compra, ''))) IN ('SITE', 'ONLINE')
            THEN 'SITE'
        ELSE 'FORNECEDOR'
    END AS tipo_compra,
    CASE
        WHEN pc.ativo = 1
         AND pc.data_entrega_prevista IS NOT NULL
         AND pc.data_entrega_prevista < NOW()
         AND COALESCE(pc.data_entrega_real, pc.data_recebimento) IS NULL
         AND UPPER(TRIM(COALESCE(pc.status, ''))) NOT IN (
             'NEGADA', 'NEGADO', 'REJEITADA', 'REJEITADO', 'CANCELADA', 'CANCELADO'
         )
            THEN 1
        ELSE 0
    END AS atrasado,
    pc.ativo
FROM pedidos_compra pc
LEFT JOIN empresas e ON e.id = pc.empresa_id
LEFT JOIN requisicoes_compra r ON r.id = pc.requisicao_id
LEFT JOIN projetos p ON p.id = r.projeto_id
WHERE pc.ativo = 1

UNION ALL

SELECT
    CONCAT('OC-', oc.id) AS registro_uid,
    'ORDEM' AS etapa,
    oc.id AS registro_id,
    oc.numero_oc AS numero,
    oc.empresa_id,
    COALESCE(e.nome, 'Sem empresa') AS empresa_nome,
    r.projeto_id,
    p.codigo AS projeto_codigo,
    p.nome AS projeto_nome,
    oc.status AS status_original,
    CASE
        WHEN UPPER(TRIM(COALESCE(oc.status, ''))) IN ('RECEBIDA', 'RECEBIDO', 'CONCLUÍDA', 'CONCLUIDA')
            THEN 'RECEBIDO'
        WHEN UPPER(TRIM(COALESCE(oc.status, ''))) IN ('EMITIDA', 'EMITIDO', 'APROVADA', 'APROVADO')
            THEN 'EMITIDO'
        WHEN UPPER(TRIM(COALESCE(oc.status, ''))) IN ('CANCELADA', 'CANCELADO')
            THEN 'CANCELADO'
        WHEN UPPER(TRIM(COALESCE(oc.status, ''))) = 'RASCUNHO'
            THEN 'RASCUNHO'
        ELSE 'PENDENTE'
    END AS status_grupo,
    oc.data_emissao AS data_evento,
    oc.data_entrega_prevista AS data_prevista,
    COALESCE(oc.data_entrega_real, oc.data_recebimento) AS data_real,
    COALESCE(oc.valor_total, 0) AS valor_total,
    CASE
        WHEN UPPER(TRIM(COALESCE(oc.tipo_compra, ''))) IN ('SITE', 'ONLINE')
            THEN 'SITE'
        ELSE 'FORNECEDOR'
    END AS tipo_compra,
    CASE
        WHEN oc.ativo = 1
         AND oc.data_entrega_prevista IS NOT NULL
         AND oc.data_entrega_prevista < NOW()
         AND COALESCE(oc.data_entrega_real, oc.data_recebimento) IS NULL
         AND UPPER(TRIM(COALESCE(oc.status, ''))) NOT IN (
             'RECEBIDA', 'RECEBIDO', 'CONCLUÍDA', 'CONCLUIDA', 'CANCELADA', 'CANCELADO'
         )
            THEN 1
        ELSE 0
    END AS atrasado,
    oc.ativo
FROM ordens_compra oc
LEFT JOIN empresas e ON e.id = oc.empresa_id
LEFT JOIN pedidos_compra pc ON pc.id = oc.pedido_id
LEFT JOIN requisicoes_compra r ON r.id = pc.requisicao_id
LEFT JOIN projetos p ON p.id = r.projeto_id
WHERE oc.ativo = 1;

CREATE OR REPLACE SQL SECURITY DEFINER VIEW vw_grafana_fornecedores AS
SELECT
    f.id AS fornecedor_id,
    f.nome AS fornecedor_nome,
    fa.empresa_id,
    COALESCE(e.nome, 'Sem empresa') AS empresa_nome,
    COUNT(fa.id) AS total_avaliacoes,
    ROUND(AVG(fa.qualidade), 2) AS qualidade,
    ROUND(AVG(fa.prazo), 2) AS prazo,
    ROUND(AVG(fa.preco), 2) AS preco,
    ROUND(AVG(fa.atendimento), 2) AS atendimento,
    ROUND(AVG(fa.conformidade), 2) AS conformidade,
    ROUND(AVG(
        (
            COALESCE(fa.qualidade, 0)
            + COALESCE(fa.prazo, 0)
            + COALESCE(fa.preco, 0)
            + COALESCE(fa.atendimento, 0)
            + COALESCE(fa.conformidade, 0)
        ) / 5.0
    ), 2) AS nota_media,
    ROUND(100 * AVG(CASE WHEN fa.recomendaria = 1 THEN 1 ELSE 0 END), 1) AS recomendacao_percentual,
    MAX(fa.created_at) AS ultima_avaliacao
FROM fornecedores f
JOIN fornecedor_avaliacoes fa ON fa.fornecedor_id = f.id
LEFT JOIN empresas e ON e.id = fa.empresa_id
GROUP BY f.id, f.nome, fa.empresa_id, e.nome;

CREATE OR REPLACE SQL SECURITY DEFINER VIEW vw_grafana_ativos AS
SELECT
    a.id,
    a.nome,
    a.empresa_id,
    COALESCE(e.nome, 'Sem empresa') AS empresa_nome,
    a.fabricante,
    a.modelo,
    a.valor_aquisicao,
    a.data_aquisicao,
    a.data_inativacao,
    GREATEST(
        CASE WHEN a.contrato_id IS NOT NULL THEN 1 ELSE 0 END,
        COALESCE(ac.total_contratos, 0)
    ) AS total_contratos,
    CASE
        WHEN a.data_inativacao IS NULL THEN 1
        ELSE 0
    END AS ativo
FROM ativos a
LEFT JOIN empresas e ON e.id = a.empresa_id
LEFT JOIN (
    SELECT ativo_id, COUNT(DISTINCT contrato_id) AS total_contratos
    FROM ativo_contratos
    GROUP BY ativo_id
) ac ON ac.ativo_id = a.id;

CREATE OR REPLACE SQL SECURITY DEFINER VIEW vw_grafana_contratos AS
SELECT
    c.id,
    c.numero,
    c.empresa_id,
    COALESCE(e.nome, 'Sem empresa') AS empresa_nome,
    c.fornecedor_id,
    f.nome AS fornecedor_nome,
    c.data_inicio,
    c.data_fim,
    COALESCE(c.valor, 0) AS valor,
    c.moeda,
    c.is_mensal,
    c.is_prestacao_servico,
    DATEDIFF(c.data_fim, CURDATE()) AS dias_para_vencer,
    CASE
        WHEN c.data_fim < CURDATE() THEN 'VENCIDO'
        WHEN c.data_fim <= DATE_ADD(CURDATE(), INTERVAL 60 DAY) THEN 'VENCE EM 60 DIAS'
        ELSE 'VIGENTE'
    END AS status_vencimento
FROM contratos c
LEFT JOIN empresas e ON e.id = c.empresa_id
LEFT JOIN fornecedores f ON f.id = c.fornecedor_id;

