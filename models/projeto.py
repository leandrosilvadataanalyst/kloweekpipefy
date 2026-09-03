class Projeto:
    def __init__(self, id, nome, squad, status=None):
        self.id = id
        self.nome = nome
        self.squad = squad
        self.status = status
    
    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'squad': self.squad,
            'status': self.status
        }
