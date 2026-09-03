from services.pipefy_service import PipefyService
from services.normalizer_service import NormalizerService
from flask import session

class DashboardController:
    
    @staticmethod
    def get_dashboard_data(pipe_id=None):
        access_token = session.get('pipefy_access_token')
        
        if not access_token:
            return DashboardController._dados_demo()
        
        pipefy_service = PipefyService(access_token)
        
        if pipe_id:
            cards_data = pipefy_service.get_pipe_cards(pipe_id)
        else:
            pipes = pipefy_service.get_pipes()
            if 'data' in pipes and pipes['data'].get('pipes'):
                first_pipe_id = pipes['data']['pipes'][0]['id']
                cards_data = pipefy_service.get_pipe_cards(first_pipe_id)
            else:
                return DashboardController._dados_demo()
        
        clientes = NormalizerService.normalize_pipefy_data(cards_data)
        saude_clientes = NormalizerService.normalize_saude_cliente(cards_data)
        metricas = NormalizerService.calcular_metricas(clientes, saude_clientes)
        
        clientes_dict = [c.to_dict() for c in clientes]
        saude_dict = [s.to_dict() for s in saude_clientes]
        
        return {
            'metricas': metricas,
            'clientes': clientes_dict,
            'saude_clientes': saude_dict
        }
    
    @staticmethod
    def get_roi_data(pipe_id=None):
        data = DashboardController.get_dashboard_data(pipe_id)
        
        roi_data = []
        for cliente in data['clientes']:
            saude = next(
                (s for s in data['saude_clientes'] if s['cliente_id'] == cliente['id']),
                None
            )
            if saude:
                roi_data.append({
                    'cliente': cliente['nome_fantasia'],
                    'squad': cliente.get('squad', 'N/A'),
                    'investimento_midia': saude['investimento_midia'],
                    'mc': saude['mc'],
                    'faturamento': saude['faturamento'],
                    'fee_atualizado': saude['fee_atualizado'],
                    'roi': saude['roi'],
                    'mmf': saude['mmf'],
                    'status': saude['status']
                })
        
        return {
            'metricas': data['metricas'],
            'clientes_roi': roi_data
        }
    
    @staticmethod
    def _dados_demo():
        return {
            'metricas': {
                'total_clientes_ativos': 24,
                'total_investimento': 45000.00,
                'total_faturamento': 125000.00,
                'total_fee': 18750.00,
                'ticket_medio_ativo': 781.25,
                'roi_medio': 177.78,
                'mmf_medio': 0.15,
                'pct_safe': 8.33,
                'pct_care': 20.14,
                'pct_danger': 72.22,
                'pct_cliente_roi': 40.00,
                'clientes_por_squad': {
                    'Drakkar': {'count': 5, 'clientes': []},
                    'Eagle': {'count': 4, 'clientes': []},
                    'Growth': {'count': 6, 'clientes': []},
                    'Sniper': {'count': 5, 'clientes': []},
                    'Isaas': {'count': 4, 'clientes': []}
                },
                'status_count': {'safe': 2, 'care': 5, 'danger': 17}
            },
            'clientes': [
                {'id': '1', 'nome_fantasia': 'MOTIVE SALES LLC', 'squad': 'Drakkar', 'dupla': 'Dupla A'},
                {'id': '2', 'nome_fantasia': 'RECLAMENTO DE SACADA LTDA', 'squad': 'Eagle', 'dupla': 'Dupla B'},
                {'id': '3', 'nome_fantasia': 'COSTURA', 'squad': 'Growth', 'dupla': 'Dupla C'},
                {'id': '4', 'nome_fantasia': 'AVENTURA', 'squad': 'Sniper', 'dupla': 'Dupla D'},
                {'id': '5', 'nome_fantasia': 'CENA', 'squad': 'Isaas', 'dupla': 'Dupla E'},
                {'id': '6', 'nome_fantasia': 'COMPANY', 'squad': 'Drakkar', 'dupla': 'Dupla A'},
                {'id': '7', 'nome_fantasia': 'ELÉTRICAS', 'squad': 'Eagle', 'dupla': 'Dupla B'},
                {'id': '8', 'nome_fantasia': 'MÉDICOS LTDA', 'squad': 'Growth', 'dupla': 'Dupla C'}
            ],
            'saude_clientes': [
                {'cliente_id': '1', 'investimento_midia': 3000.00, 'mc': 0, 'faturamento': 0, 'fee_atualizado': 0, 'roi': -100, 'mmf': 0, 'status': 'danger'},
                {'cliente_id': '2', 'investimento_midia': 1197.32, 'mc': 17, 'faturamento': 6400, 'fee_atualizado': 0, 'roi': 434.68, 'mmf': 0, 'status': 'safe'},
                {'cliente_id': '3', 'investimento_midia': 1538.41, 'mc': 5599, 'faturamento': 0, 'fee_atualizado': 0, 'roi': -100, 'mmf': 0, 'status': 'danger'},
                {'cliente_id': '4', 'investimento_midia': 687.89, 'mc': 0, 'faturamento': 0, 'fee_atualizado': 0, 'roi': -100, 'mmf': 0, 'status': 'danger'},
                {'cliente_id': '5', 'investimento_midia': 0, 'mc': 0, 'faturamento': 0, 'fee_atualizado': 0, 'roi': 0, 'mmf': 0, 'status': 'care'},
                {'cliente_id': '6', 'investimento_midia': 963.91, 'mc': 73, 'faturamento': 0, 'fee_atualizado': 0, 'roi': -100, 'mmf': 0, 'status': 'danger'},
                {'cliente_id': '7', 'investimento_midia': 761.32, 'mc': 285, 'faturamento': 0, 'fee_atualizado': 0, 'roi': -100, 'mmf': 0, 'status': 'danger'},
                {'cliente_id': '8', 'investimento_midia': 1673.50, 'mc': 3, 'faturamento': 3300, 'fee_atualizado': 0, 'roi': 97.2, 'mmf': 0, 'status': 'safe'}
            ]
        }
