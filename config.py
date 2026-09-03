import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key')
    DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    PIPEFY_CLIENT_ID = os.getenv('PIPEFY_CLIENT_ID')
    PIPEFY_CLIENT_SECRET = os.getenv('PIPEFY_CLIENT_SECRET')
    PIPEFY_REDIRECT_URI = os.getenv('PIPEFY_REDIRECT_URI', 'http://localhost:5000/callback')
    PIPEFY_API_URL = 'https://api.pipefy.com/graphql'
    PIPEFY_AUTH_URL = 'https://app.pipefy.com/oauth/authorize'
    PIPEFY_TOKEN_URL = 'https://app.pipefy.com/oauth/token'
