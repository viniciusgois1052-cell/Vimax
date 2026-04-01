# Este arquivo torna o diretório um pacote Python# Este arquivo torna o diretório um pacote Python
#
# IMPORTANTE:
# O projeto usa relationship('NomeDaClasse') em alguns models (string).
# Para o SQLAlchemy conseguir resolver essas strings sem erro (ex.: 'TipoInfraestrutura'),
# precisamos garantir que os models sejam importados/carregados durante o startup.

from .empresa import Empresa
from .usuario import Usuario
from .localizacao import Localizacao
from .ativo import Ativo
from .fornecedor import Fornecedor
from .contrato import Contrato
from .orcamento import Orcamento

from .categoria_chamado import CategoriaChamado
from .tipo_servico import TipoServico

from .tipo_infraestrutura import TipoInfraestrutura
from .infraestrutura import Infraestrutura

from .chamado import Chamado
from .config_email import ConfigEmail

# Coletor de e-mail (novos)
from .chamado_interacao import ChamadoInteracao
from .email_message_link import EmailMessageLink

# Formulário (se existir)
try:
    from .formulario_chamado import FormularioChamado
except Exception:
    pass

# Caso exista duplicado por nome diferente
try:
    from .FormularioChamado import FormularioChamado as FormularioChamadoLegacy
except Exception:
    pass
