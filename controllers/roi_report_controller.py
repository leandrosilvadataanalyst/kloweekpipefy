from services.pipefy_service import PipefyService
from services.normalizer_service import NormalizerService
from flask import session
from config import Config


class RoiReportController:
    
    @staticmethod
    def get_roi_report_data():
        access_token = session.get('pipefy_access_token')
        
        if not access_token:
            return RoiReportController._dados_demo()
        
        pipefy_service = PipefyService(access_token)
        
        pipe_ids = {
            'database_clientes': Config.PIPE_ID_DATABASE_CLIENTES,
            'roi_week': Config.PIPE_ID_ROI_WEEK
        }
        
        pipes_data = pipefy_service.get_multiple_pipes_data(pipe_ids)
        
        clientes = NormalizerService.normalize_pipefy_data(
            pipes_data.get('database_clientes', {})
        )
        
        saude_clientes = NormalizerService.normalize_saude_cliente(
            pipes_data.get('roi_week', {})
        )
        
        preenchidos, faltantes = RoiReportController._cruzar_dados(
            clientes, saude_clientes
        )
        
        metricas = RoiReportController._calcular_metricas(
            clientes, preenchidos, faltantes
        )
        
        return {
            'metricas': metricas,
            'preenchidos': preenchidos,
            'faltantes': faltantes
        }
    
    @staticmethod
    def _cruzar_dados(clientes, saude_clientes):
        preenchidos = []
        faltantes = []
        
        saude_dict = {}
        for s in saude_clientes:
            saude_dict[s.cliente_id] = s.to_dict()
        
        for cliente in clientes:
            cliente_dict = cliente.to_dict()
            saude = saude_dict.get(cliente.id)
            
            if saude and RoiReportController._tem_dados_roi(saude):
                cliente_dict['saude'] = saude
                preenchidos.append(cliente_dict)
            else:
                faltantes.append(cliente_dict)
        
        return preenchidos, faltantes
    
    @staticmethod
    def _tem_dados_roi(saude):
        return (
            saude.get('investimento_midia', 0) > 0 or
            saude.get('mc', 0) > 0 or
            saude.get('faturamento', 0) > 0 or
            saude.get('fee_atualizado', 0) > 0
        )
    
    @staticmethod
    def _calcular_metricas(clientes, preenchidos, faltantes):
        total = len(clientes)
        total_preenchidos = len(preenchidos)
        total_faltantes = len(faltantes)
        
        pct_preenchidos = (total_preenchidos / total * 100) if total > 0 else 0
        pct_faltantes = (total_faltantes / total * 100) if total > 0 else 0
        
        squads_faltantes = {}
        for cliente in faltantes:
            squad = cliente.get('squad') or 'Sem Squad'
            if squad not in squads_faltantes:
                squads_faltantes[squad] = []
            squads_faltantes[squad].append(cliente['nome_fantasia'])
        
        squads_preenchidos = {}
        for cliente in preenchidos:
            squad = cliente.get('squad') or 'Sem Squad'
            if squad not in squads_preenchidos:
                squads_preenchidos[squad] = []
            squads_preenchidos[squad].append(cliente['nome_fantasia'])
        
        return {
            'total_clientes': total,
            'total_preenchidos': total_preenchidos,
            'total_faltantes': total_faltantes,
            'pct_preenchidos': round(pct_preenchidos, 1),
            'pct_faltantes': round(pct_faltantes, 1),
            'squads_faltantes': squads_faltantes,
            'squads_preenchidos': squads_preenchidos
        }
    
    @staticmethod
    def gerar_mensagem_padrao(filtros=None):
        data = RoiReportController.get_roi_report_data()
        faltantes = data['faltantes']
        
        if filtros and filtros.get('squad'):
            squad_filtro = filtros['squad']
            faltantes = [f for f in faltantes if f.get('squad') == squad_filtro]
        
        if not faltantes:
            return "Todos os clientes já preencheram o ROI Week!"
        
        squads = {}
        for cliente in faltantes:
            squad = cliente.get('squad') or 'Sem Squad'
            if squad not in squads:
                squads[squad] = []
            squads[squad].append(cliente['nome_fantasia'])
        
        linhas = []
        linhas.append("📋 Clientes com ROI Week Pendente:")
        linhas.append("")
        
        for squad, clientes in sorted(squads.items()):
            linhas.append(f"[Squad {squad}]")
            for nome in sorted(clientes):
                linhas.append(f"- {nome}")
            linhas.append("")
        
        linhas.append(f"Total: {len(faltantes)} cliente(s) pendente(s)")
        
        return "\n".join(linhas)
    
    @staticmethod
    def _dados_demo():
        return {
            'metricas': {
                'total_clientes': 8,
                'total_preenchidos': 3,
                'total_faltantes': 5,
                'pct_preenchidos': 37.5,
                'pct_faltantes': 62.5,
                'squads_faltantes': {
                    'Drakkar': ['MOTIVE SALES LLC', 'COMPANY'],
                    'Eagle': ['ELÉTRICAS'],
                    'Growth': ['COSTURA'],
                    'Sniper': ['AVENTURA']
                },
                'squads_preenchidos': {
                    'Eagle': ['RECLAMENTO DE SACADA LTDA'],
                    'Growth': ['MÉDICOS LTDA'],
                    'Isaas': ['CENA']
                }
            },
            'preenchidos': [
                {'id': '2', 'nome_fantasia': 'RECLAMENTO DE SACADA LTDA', 'squad': 'Eagle', 'saude': {'investimento_midia': 1197.32, 'mc': 17, 'faturamento': 6400, 'roi': 434.68, 'status': 'safe'}},
                {'id': '5', 'nome_fantasia': 'CENA', 'squad': 'Isaas', 'saude': {'investimento_midia': 1000, 'mc': 10, 'faturamento': 3000, 'roi': 200, 'status': 'safe'}},
                {'id': '8', 'nome_fantasia': 'MÉDICOS LTDA', 'squad': 'Growth', 'saude': {'investimento_midia': 1673.50, 'mc': 3, 'faturamento': 3300, 'roi': 97.2, 'status': 'safe'}}
            ],
            'faltantes': [
                {'id': '1', 'nome_fantasia': 'MOTIVE SALES LLC', 'squad': 'Drakkar'},
                {'id': '3', 'nome_fantasia': 'COSTURA', 'squad': 'Growth'},
                {'id': '4', 'nome_fantasia': 'AVENTURA', 'squad': 'Sniper'},
                {'id': '6', 'nome_fantasia': 'COMPANY', 'squad': 'Drakkar'},
                {'id': '7', 'nome_fantasia': 'ELÉTRICAS', 'squad': 'Eagle'}
            ]
        }
