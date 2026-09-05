import requests
from config import Config

class PipefyService:
    def __init__(self, access_token=None):
        self.access_token = access_token
        self.api_url = Config.PIPEFY_API_URL
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {access_token}' if access_token else None
        }
    
    def getAuthorizationUrl(self):
        return (
            f"{Config.PIPEFY_AUTH_URL}"
            f"?client_id={Config.PIPEFY_CLIENT_ID}"
            f"&redirect_uri={Config.PIPEFY_REDIRECT_URI}"
            f"&response_type=code"
        )
    
    def getAccessToken(self, authorization_code):
        data = {
            'grant_type': 'authorization_code',
            'client_id': Config.PIPEFY_CLIENT_ID,
            'client_secret': Config.PIPEFY_CLIENT_SECRET,
            'code': authorization_code,
            'redirect_uri': Config.PIPEFY_REDIRECT_URI
        }
        response = requests.post(Config.PIPEFY_TOKEN_URL, json=data)
        if response.status_code == 200:
            return response.json().get('access_token')
        return None
    
    def execute_query(self, query, variables=None):
        payload = {'query': query}
        if variables:
            payload['variables'] = variables
        
        response = requests.post(self.api_url, json=payload, headers=self.headers)
        if response.status_code == 200:
            return response.json()
        return {'errors': [{'message': f'HTTP {response.status_code}'}]}
    
    def get_pipes(self):
        query = '''
        query {
            pipes {
                id
                name
                phases {
                    id
                    name
                }
            }
        }
        '''
        return self.execute_query(query)
    
    def get_pipe_cards(self, pipe_id, first=100):
        query = '''
        query GetCards($pipeId: ID!, $first: Int!) {
            cards(pipeId: $pipeId, first: $first) {
                edges {
                    node {
                        id
                        title
                        created_at
                        updated_at
                        done
                        expired
                        late
                        phases {
                            name
                        }
                        fields {
                            name
                            value
                        }
                    }
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
            }
        }
        '''
        variables = {'pipeId': pipe_id, 'first': first}
        return self.execute_query(query, variables)
    
    def get_card_by_id(self, card_id):
        query = '''
        query GetCard($id: ID!) {
            card(id: $id) {
                id
                title
                created_at
                updated_at
                done
                expired
                late
                phases {
                    name
                }
                fields {
                    name
                    value
                }
            }
        }
        '''
        variables = {'id': card_id}
        return self.execute_query(query, variables)
    
    def get_all_cards_from_pipe(self, pipe_id):
        all_cards = []
        has_next = True
        cursor = None
        
        while has_next:
            query = '''
            query GetCards($pipeId: ID!, $first: Int!, $after: String) {
                cards(pipeId: $pipeId, first: $first, after: $after) {
                    edges {
                        node {
                            id
                            title
                            created_at
                            updated_at
                            done
                            expired
                            late
                            phases {
                                name
                            }
                            fields {
                                name
                                value
                            }
                        }
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
            '''
            variables = {'pipeId': pipe_id, 'first': 100}
            if cursor:
                variables['after'] = cursor
            
            result = self.execute_query(query, variables)
            
            if 'errors' in result:
                break
            
            cards_data = result.get('data', {}).get('cards', {})
            edges = cards_data.get('edges', [])
            page_info = cards_data.get('pageInfo', {})
            
            all_cards.extend(edges)
            has_next = page_info.get('hasNextPage', False)
            cursor = page_info.get('endCursor')
        
        return {'data': {'cards': {'edges': all_cards}}}
    
    def get_multiple_pipes_data(self, pipe_ids):
        results = {}
        for pipe_name, pipe_id in pipe_ids.items():
            if pipe_id:
                results[pipe_name] = self.get_all_cards_from_pipe(pipe_id)
            else:
                results[pipe_name] = {'data': {'cards': {'edges': []}}}
        return results
