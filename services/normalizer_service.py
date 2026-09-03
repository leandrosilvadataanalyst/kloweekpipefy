from models.cliente import Cliente
from models.saude_cliente import SaudeCliente

class NormalizerService:
    
    @staticmethod
    def normalize_pipefy_data(cards_data):
        clientes = []
        if not cards_data or 'data' not in cards_data:
            return clientes
        
        cards = cards_data.get('data', {}).get('cards', {}).get('edges', [])
        
        for card in cards:
            node = card.get('node', {})
            fields = {f.get('name'): f.get('value') for f in node.get('fields', [])}
            
            cliente = Cliente(
                id=node.get('id'),
                nome_fantasia=fields.get('nome_fantasia', node.get('title', '')),
                squad=fields.get('squad', None),
                dupla=fields.get('dupla', None)
            )
            clientes.append(cliente)
        
        return clientes
    
    @staticmethod
    def normalize_saude_cliente(cards_data):
        saude_clientes = []
        if not cards_data or 'data' not in cards_data:
            return saude_clientes
        
        cards = cards_data.get('data', {}).get('cards', {}).get('edges', [])
        
        for card in cards:
            node = card.get('node', {})
            fields = {f.get('name'): f.get('value') for f in node.get('fields', [])}
            
            investimento = NormalizerService._parse_currency(fields.get('investimento_midia', '0'))
            mc = NormalizerService._parse_percentage(fields.get('mc', '0'))
            faturamento = NormalizerService._parse_currency(fields.get('faturamento', '0'))
            fee = NormalizerService._parse_currency(fields.get('fee_atualizado', '0'))
            
            saude = SaudeCliente(
                cliente_id=node.get('id'),
                investimento_midia=investimento,
                mc=mc,
                faturamento=faturamento,
                fee_atualizado=fee
            )
            saude_clientes.append(saude)
        
        return saude_clientes
    
    @staticmethod
    def calcular_metricas(clientes, saude_clientes):
        total_ativos = len(clientes)
        
        if total_ativos == 0:
            return NormalizerService._metricas_vazias()
        
        total_investimento = sum(s.investimento_midia for s in saude_clientes)
        total_faturamento = sum(s.faturamento for s in saude_clientes)
        total_fee = sum(s.fee_atualizado for s in saude_clientes)
        
        ticket_medio_ativo = total_fee / total_ativos if total_ativos > 0 else 0
        
        roi_medio = 0
        if total_investimento > 0:
            roi_medio = ((total_faturamento - total_investimento) / total_investimento) * 100
        
        mmf_medio = total_fee / total_faturamento if total_faturamento > 0 else 0
        
        status_count = {'safe': 0, 'care': 0, 'danger': 0}
        for s in saude_clientes:
            status = s.classificar_status()
            status_count[status] += 1
        
        pct_safe = (status_count['safe'] / total_ativos * 100) if total_ativos > 0 else 0
        pct_care = (status_count['care'] / total_ativos * 100) if total_ativos > 0 else 0
        pct_danger = (status_count['danger'] / total_ativos * 100) if total_ativos > 0 else 0
        
        clientes_com_roi = sum(1 for s in saude_clientes if s.calcular_roi() > 0)
        pct_cliente_roi = (clientes_com_roi / total_ativos * 100) if total_ativos > 0 else 0
        
        squads = {}
        for cliente in clientes:
            squad = cliente.squad or 'Sem Squad'
            if squad not in squads:
                squads[squad] = {'count': 0, 'clientes': []}
            squads[squad]['count'] += 1
            squads[squad]['clientes'].append(cliente.to_dict())
        
        return {
            'total_clientes_ativos': total_ativos,
            'total_investimento': total_investimento,
            'total_faturamento': total_faturamento,
            'total_fee': total_fee,
            'ticket_medio_ativo': ticket_medio_ativo,
            'roi_medio': roi_medio,
            'mmf_medio': mmf_medio,
            'pct_safe': round(pct_safe, 2),
            'pct_care': round(pct_care, 2),
            'pct_danger': round(pct_danger, 2),
            'pct_cliente_roi': round(pct_cliente_roi, 2),
            'clientes_por_squad': squads,
            'status_count': status_count
        }
    
    @staticmethod
    def _parse_currency(value):
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            value = value.replace('R$', '').replace('.', '').replace(',', '.').strip()
            try:
                return float(value)
            except ValueError:
                return 0.0
        return 0.0
    
    @staticmethod
    def _parse_percentage(value):
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            value = value.replace('%', '').replace(',', '.').strip()
            try:
                return float(value)
            except ValueError:
                return 0.0
        return 0.0
    
    @staticmethod
    def _metricas_vazias():
        return {
            'total_clientes_ativos': 0,
            'total_investimento': 0,
            'total_faturamento': 0,
            'total_fee': 0,
            'ticket_medio_ativo': 0,
            'roi_medio': 0,
            'mmf_medio': 0,
            'pct_safe': 0,
            'pct_care': 0,
            'pct_danger': 0,
            'pct_cliente_roi': 0,
            'clientes_por_squad': {},
            'status_count': {'safe': 0, 'care': 0, 'danger': 0}
        }
