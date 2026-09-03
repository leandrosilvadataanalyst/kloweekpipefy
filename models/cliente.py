class Cliente:
    def __init__(self, id, nome_fantasia, squad=None, dupla=None):
        self.id = id
        self.nome_fantasia = nome_fantasia
        self.squad = squad
        self.dupla = dupla
    
    def to_dict(self):
        return {
            'id': self.id,
            'nome_fantasia': self.nome_fantasia,
            'squad': self.squad,
            'dupla': self.dupla
        }
