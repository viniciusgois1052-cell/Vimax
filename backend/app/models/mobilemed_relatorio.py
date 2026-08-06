from .. import db
from datetime import datetime

class MobilemedException(db.Model):
    __tablename__ = 'mobilemed_relatorios'

    id             = db.Column(db.Integer, primary_key=True)
    request_id     = db.Column(db.String(200), nullable=True, index=True)
    nome           = db.Column(db.String(200), nullable=False)
    ambiente       = db.Column(db.String(20), default='homolog')  # homolog | prod
    status         = db.Column(db.String(50), default='aguardando')  # aguardando, processando, concluido, erro
    campos         = db.Column(db.Text, default='[]')
    filtros        = db.Column(db.Text, default='[]')
    unidades       = db.Column(db.Text, default='[]')
    data_inicio    = db.Column(db.String(20), nullable=True)
    data_fim       = db.Column(db.String(20), nullable=True)
    webhook_payload = db.Column(db.Text, nullable=True)   # JSON completo recebido
    csv_url        = db.Column(db.Text, nullable=True)    # URL do CSV se vier
    csv_dados      = db.Column(db.Text, nullable=True)    # CSV bruto se vier inline
    total_registros = db.Column(db.Integer, default=0)
    erro_msg       = db.Column(db.Text, nullable=True)
    solicitado_em  = db.Column(db.DateTime, default=datetime.utcnow)
    concluido_em   = db.Column(db.DateTime, nullable=True)
    solicitado_por = db.Column(db.String(200), nullable=True)

    def to_dict(self):
        import json
        return {
            'id':              self.id,
            'request_id':      self.request_id,
            'nome':            self.nome,
            'ambiente':        self.ambiente,
            'status':          self.status,
            'campos':          json.loads(self.campos or '[]'),
            'filtros':         json.loads(self.filtros or '[]'),
            'unidades':        json.loads(self.unidades or '[]'),
            'data_inicio':     self.data_inicio,
            'data_fim':        self.data_fim,
            'csv_url':         self.csv_url,
            'total_registros': self.total_registros,
            'erro_msg':        self.erro_msg,
            'solicitado_em':   self.solicitado_em.isoformat() if self.solicitado_em else None,
            'concluido_em':    self.concluido_em.isoformat() if self.concluido_em else None,
            'solicitado_por':  self.solicitado_por,
        }