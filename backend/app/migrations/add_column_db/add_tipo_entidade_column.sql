-- Adiciona a coluna tipo_entidade à tabela fornecedores
ALTER TABLE fornecedores 
ADD COLUMN tipo_entidade VARCHAR(20) NOT NULL DEFAULT 'fornecedor';

-- Atualiza registros existentes para garantir que tenham um valor
UPDATE fornecedores 
SET tipo_entidade = 'fornecedor' 
WHERE tipo_entidade IS NULL OR tipo_entidade = '';
