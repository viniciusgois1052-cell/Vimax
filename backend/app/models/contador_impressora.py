from .. import db
from datetime import datetime
from sqlalchemy import JSON

class ContadorImpressora(db.Model):
    __tablename__ = 'contadores_impressora'

    id = db.Column(db.Integer, primary_key=True)
    nome         = db.Column(db.String(150), nullable=False)
    ip           = db.Column(db.String(50),  nullable=False)
    community    = db.Column(db.String(100), default='public')
    modelo       = db.Column(db.String(150))
    numero_serie = db.Column(db.String(100))
    localizacao  = db.Column(db.String(150))
    empresa_id   = db.Column(db.Integer, db.ForeignKey('empresas.id'))

    # ── Contadores principais ─────────────────────────────────────────
    contador_total           = db.Column(db.BigInteger, default=0)
    contador_pb              = db.Column(db.BigInteger, default=0)
    contador_color           = db.Column(db.BigInteger, default=0)

    # ── A4 Equivalent (Xerox) ─────────────────────────────────────────
    contador_a4_pb           = db.Column(db.BigInteger, default=0)
    contador_a4_color        = db.Column(db.BigInteger, default=0)

    # ── A3 / Large format ─────────────────────────────────────────────
    contador_a3_pb           = db.Column(db.BigInteger, default=0)
    contador_a3_color        = db.Column(db.BigInteger, default=0)

    # ── Duplex (frente e verso) ───────────────────────────────────────
    contador_duplex_pb       = db.Column(db.BigInteger, default=0)
    contador_duplex_color    = db.Column(db.BigInteger, default=0)

    # ── Sub-contadores cópia / impressão ──────────────────────────────
    contador_copia_pb        = db.Column(db.BigInteger, default=0)
    contador_copia_color     = db.Column(db.BigInteger, default=0)
    contador_impressao_pb    = db.Column(db.BigInteger, default=0)
    contador_impressao_color = db.Column(db.BigInteger, default=0)

    # ── Papel nas bandejas ────────────────────────────────────────────
    papel_bandeja1           = db.Column(db.Integer)
    papel_bandeja2           = db.Column(db.Integer)

    # ── Status e alertas ─────────────────────────────────────────────
    status_dispositivo       = db.Column(db.String(50))
    alerta_mensagem          = db.Column(db.String(255))

    # ── Níveis de toner (%) ───────────────────────────────────────────
    toner_preto_nivel        = db.Column(db.Integer)
    toner_ciano_nivel        = db.Column(db.Integer)
    toner_magenta_nivel      = db.Column(db.Integer)
    toner_amarelo_nivel      = db.Column(db.Integer)

    # ── Reservatório de resíduos ──────────────────────────────────────
    reservatorio_nivel       = db.Column(db.Integer)

    # ── Unidades de imagem (drum) ─────────────────────────────────────
    drum_preto_nivel         = db.Column(db.Integer)
    drum_ciano_nivel         = db.Column(db.Integer)
    drum_magenta_nivel       = db.Column(db.Integer)
    drum_amarelo_nivel       = db.Column(db.Integer)

    # ── Suprimentos brutos retornados pelo SNMP ───────────────────────
    suprimentos_raw          = db.Column(JSON, default=list)

    status         = db.Column(db.String(50), default='desconhecido')
    ultima_leitura = db.Column(db.DateTime)
    criado_em      = db.Column(db.DateTime, default=datetime.utcnow)

    empresa = db.relationship('Empresa', backref=db.backref('contadores_impressora', lazy=True))

    def to_dict(self):
        return {
            'id':            self.id,
            'nome':          self.nome,
            'ip':            self.ip,
            'community':     self.community or 'public',
            'modelo':        self.modelo,
            'numero_serie':  self.numero_serie,
            'localizacao':   self.localizacao,
            'empresa_id':    self.empresa_id,
            'empresa_nome':  self.empresa.nome if self.empresa else None,

            # Contadores principais
            'contador_total':           self.contador_total           or 0,
            'contador_pb':              self.contador_pb              or 0,
            'contador_color':           self.contador_color           or 0,

            # A4 Equivalent (Xerox)
            'contador_a4_pb':           self.contador_a4_pb           or 0,
            'contador_a4_color':        self.contador_a4_color        or 0,

            # A3
            'contador_a3_pb':           self.contador_a3_pb           or 0,
            'contador_a3_color':        self.contador_a3_color        or 0,

            # Duplex
            'contador_duplex_pb':       self.contador_duplex_pb       or 0,
            'contador_duplex_color':    self.contador_duplex_color    or 0,

            # Sub-contadores
            'contador_copia_pb':        self.contador_copia_pb        or 0,
            'contador_copia_color':     self.contador_copia_color     or 0,
            'contador_impressao_pb':    self.contador_impressao_pb    or 0,
            'contador_impressao_color': self.contador_impressao_color or 0,

            # Papel
            'papel_bandeja1':           self.papel_bandeja1,
            'papel_bandeja2':           self.papel_bandeja2,

            # Status e alertas
            'status_dispositivo':       self.status_dispositivo,
            'alerta_mensagem':          self.alerta_mensagem,

            # Suprimentos
            'toner_preto_nivel':        self.toner_preto_nivel,
            'toner_ciano_nivel':        self.toner_ciano_nivel,
            'toner_magenta_nivel':      self.toner_magenta_nivel,
            'toner_amarelo_nivel':      self.toner_amarelo_nivel,
            'reservatorio_nivel':       self.reservatorio_nivel,
            'drum_preto_nivel':         self.drum_preto_nivel,
            'drum_ciano_nivel':         self.drum_ciano_nivel,
            'drum_magenta_nivel':       self.drum_magenta_nivel,
            'drum_amarelo_nivel':       self.drum_amarelo_nivel,
            'suprimentos_raw':          self.suprimentos_raw or [],

            'status':                   self.status,
            'ultima_leitura':           self.ultima_leitura.isoformat() if self.ultima_leitura else None,
            'criado_em':                self.criado_em.isoformat()      if self.criado_em      else None,
        }
