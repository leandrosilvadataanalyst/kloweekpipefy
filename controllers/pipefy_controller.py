from services.pipefy_service import PipefyService
from flask import redirect, session
from config import Config

class PipefyController:
    
    @staticmethod
    def get_auth_url():
        pipefy_service = PipefyService()
        return pipefy_service.getAuthorizationUrl()
    
    @staticmethod
    def handle_callback(code):
        pipefy_service = PipefyService()
        access_token = pipefy_service.getAccessToken(code)
        
        if access_token:
            session['pipefy_access_token'] = access_token
            return True
        return False
    
    @staticmethod
    def is_authenticated():
        return 'pipefy_access_token' in session
    
    @staticmethod
    def logout():
        session.pop('pipefy_access_token', None)
