# Skill: Documentação Pipefy API

## Descrição
Referência da API do Pipefy para integração via GraphQL. Inclui autenticação OAuth, queries, mutations, e estrutura de dados dos pipes.

## Quando Usar
- Quando precisar criar/modificar queries GraphQL
- Quando precisar buscar dados de cards, campos ou fases
- Quando houver erros de autenticação ou permissão
- Para entender a estrutura de dados do Pipefy

## Autenticação OAuth

### Fluxo de Autorização
```
1. Redirecionar para: https://app.pipefy.com/oauth/authorize
   ?client_id={CLIENT_ID}
   &redirect_uri={REDIRECT_URI}
   &response_type=code

2. Usuário autoriza → retorna ?code={AUTH_CODE}

3. Trocar code por token:
   POST https://app.pipefy.com/oauth/token
   {
     "grant_type": "authorization_code",
     "client_id": "{CLIENT_ID}",
     "client_secret": "{CLIENT_SECRET}",
     "code": "{AUTH_CODE}",
     "redirect_uri": "{REDIRECT_URI}"
   }

4. Resposta: { "access_token": "...", "token_type": "bearer" }
```

### Uso do Token
```
Header: Authorization: Bearer {ACCESS_TOKEN}
```

## GraphQL Endpoint
```
POST https://api.pipefy.com/graphql
```

## Queries Commonly Used

### Listar Pipes
```graphql
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
```

### Listar Cards de um Pipe
```graphql
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
          definition {
            id
            label
          }
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### Buscar Card por ID
```graphql
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
```

### Buscar Card com Filtros
```graphql
query SearchCards($pipeId: ID!, $search: String!) {
  cards(pipeId: $pipeId, search: $search, first: 10) {
    edges {
      node {
        id
        title
        fields {
          name
          value
        }
      }
    }
  }
}
```

## Mutations

### Criar Card
```graphql
mutation CreateCard($input: CreateCardInput!) {
  createCard(input: $input) {
    card {
      id
      title
    }
  }
}
```

Variáveis:
```json
{
  "input": {
    "pipe_id": "PIPE_ID",
    "title": "Novo Card",
    "fields_attributes": [
      {"field_id": "FIELD_ID", "field_value": "Valor"}
    ]
  }
}
```

### Atualizar Card
```graphql
mutation UpdateCard($input: UpdateCardInput!) {
  updateCard(input: $input) {
    card {
      id
      title
    }
  }
}
```

### Mover Card de Fase
```graphql
mutation MoveCard($input: MoveCardInput!) {
  moveCard(input: $input) {
    card {
      id
      phase {
        name
      }
    }
  }
}
```

## Estrutura de Dados

### Pipe
```json
{
  "id": "string",
  "name": "string",
  "phases": [{"id": "string", "name": "string"}]
}
```

### Card
```json
{
  "id": "string",
  "title": "string",
  "created_at": "datetime",
  "updated_at": "datetime",
  "done": "boolean",
  "expired": "boolean",
  "late": "boolean",
  "phases": [{"name": "string"}],
  "fields": [{"name": "string", "value": "any"}]
}
```

## Pipes do Projeto kloweekpipefy

### Pipe: ROI Week Interno
- Formulário de saúde do cliente
- Campos: investimento_midia, mc, faturamento, fee_atualizado, roi, mmf

### Pipe: Aditivo
- Aditivos contratuais dos clientes

### Pipe: Database Clientes e Projeto
- Cadastro de clientes ativos
- Campos: nome_fantasia, squad, dupla, status

## Erros Comuns

### 401 Unauthorized
- Token expirado ou inválido
- Solução: refazer fluxo OAuth

### 403 Forbidden
- Token não tem permissão para o pipe
- Solução: verificar escopos do OAuth

### 429 Too Many Requests
- Rate limit atingido
- Solução: aguardar 60 segundos e retry

### GraphQL Errors
- Verificar se os campos existem no pipe
- Verificar se as variáveis estão corretas
- Verificar se o ID do pipe/card é válido

## Referências
- Docs: https://developers.pipefy.com
- GraphQL Explorer: https://app.pipefy.com/developers
