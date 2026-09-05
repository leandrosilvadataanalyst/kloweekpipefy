# AGENTS.md - Workflow de Desenvolvimento

## Objetivo
Este arquivo define o fluxo obrigatório de trabalho para qualquer agente (humano ou IA) que atuar neste projeto. O foco é produtividade, prevenção de bugs, e manutenção da qualidade.

---

## Fluxo Obrigatório (OBRIGATÓRIO EM TODA MUDANÇA)

```
┌─────────────────────────────────────────────────────────┐
│  1. CONSULTAR CONTEXT-LOG                               │
│     → Verificar bugs anteriores relacionados            │
│     → Verificar se a feature já foi implementada        │
│     → Verificar decisões arquiteturais anteriores       │
├─────────────────────────────────────────────────────────┤
│  2. CONSULTAR SKILLS DE DOCUMENTAÇÃO                    │
│     → doc-pipefy (se mexer com Pipefy)                 │
│     → doc-python (se mexer com Flask/backend)          │
│     → doc-php (se mexer com proxy)                     │
│     → doc-javascript (se mexer com frontend)           │
├─────────────────────────────────────────────────────────┤
│  3. RODAR TESTES UNITÁRIOS                              │
│     → pytest -v (garantir que testes passam)           │
│     → Se falhar, corrigir ANTES de continuar           │
├─────────────────────────────────────────────────────────┤
│  4. CRIAR TESTES PARA A NOVA FEATURE                    │
│     → TDD: escrever teste antes do código              │
│     → Testar edge cases e cenários de erro             │
├─────────────────────────────────────────────────────────┤
│  5. IMPLEMENTAR FEATURE                                 │
│     → Seguir padrões existentes do projeto             │
│     → Manter arquitetura MVC                           │
│     → Não expor chaves ou dados sensíveis              │
├─────────────────────────────────────────────────────────┤
│  6. RODAR TESTES NOVAMENTE                              │
│     → Todos os testes devem passar                    │
│     → Verificar cobertura mínima: 80%                  │
├─────────────────────────────────────────────────────────┤
│  7. ATUALIZAR CONTEXT-LOG                               │
│     → Registrar feature implementada                   │
│     → Registrar bugs corrigidos (se houver)            │
│     → Documentar prevenção de regressão               │
└─────────────────────────────────────────────────────────┘
```

---

## Regras Fundamentais

### 1. NUNCA pular etapas
- O fluxo 1-7 é OBRIGATÓRIO
- Não existe exceção

### 2. NUNCA commitar sem testar
- Rodar `pytest` antes de qualquer mudança
- Se pytest não existir, criar primeiro

### 3. NUNCA expor chaves
- Usar proxy.php para chamadas API
- Chaves apenas em .env
- .env nunca no git

### 4. SEGUIR padrões existentes
- Manter arquitetura MVC
- Não criar atalhos
- Reutilizar código existente

### 5. DOCUMENTAR tudo
- Atualizar CONTEXT_LOG.md sempre
- Registrar bugs com causa raiz
- Documentar decisões técnicas

---

## Skills Disponíveis

### Infraestrutura
| Skill | Arquivo | Quando Usar |
|-------|---------|-------------|
| context-log | `.opencode/skills/context-log.md` | Toda mudança |
| proxy-php | `.opencode/skills/proxy-php.md` | Chamadas API |
| test-unit | `.opencode/skills/test-unit.md` | Antes de implementar |

### Documentação
| Skill | Arquivo | Quando Usar |
|-------|---------|-------------|
| doc-pipefy | `.opencode/skills/doc-pipefy.md` | Pipefy API |
| doc-php | `.opencode/skills/doc-php.md` | PHP/Proxy |
| doc-javascript | `.opencode/skills/doc-javascript.md` | Frontend JS |
| doc-python | `.opencode/skills/doc-python.md` | Flask/Python |

---

## Estrutura do Projeto

```
kloweekpipefy/
├── .env                    # Chaves (NÃO committar)
├── .gitignore              # Ignorar .env
├── AGENTS.md               # Este arquivo
├── CONTEXT_LOG.md          # Log de contexto
├── app.py                  # Rotas Flask
├── config.py               # Configurações
├── proxy.php               # Proxy PHP (XAMPP)
├── requirements.txt        # Dependências Python
├── vercel.json             # Config Vercel
├── controllers/            # Controllers
├── models/                 # Models
├── services/               # Services
├── templates/              # Templates HTML
├── static/                 # CSS/JS
├── tests/                  # Testes unitários
├── api/                    # Endpoint Vercel
└── .opencode/skills/       # Skills
```

---

## Comandos Úteis

### Rodar o projeto localmente
```bash
python app.py
# ou
flask run --debug
```

### Rodar testes
```bash
pytest
pytest -v
pytest --cov=models --cov=services
```

### Verificar context-log
```bash
grep -i "bug" CONTEXT_LOG.md
grep "nome_do_arquivo" CONTEXT_LOG.md
```

---

## Anti-Padrões (NÃO FAZER)

- ❌ Modificar código sem consultar context-log
- ❌ Rodar testes depois de implementar (fazer ANTES)
- ❌ Copiar chaves para o código
- ❌ Criar funções duplicadas
- ❌ Pular documentação
- ❌ Commitar sem testar

---

## Checklist de Entrega

Antes de considerar uma feature pronta:

- [ ] Context-log consultado
- [ ] Skills de documentação consultadas
- [ ] Testes existentes rodando
- [ ] Novos testes criados e passando
- [ ] Código implementado seguindo padrões
- [ ] Chaves não expostas
- [ ] Context-log atualizado
- [ ] Funcionalidade testada manualmente
