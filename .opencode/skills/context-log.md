# Skill: Context Log

## Descrição
Mantém um log estruturado de todas as mudanças feitas no projeto, incluindo features implementadas, bugs corrigidos, e decisões técnicas. Serve como referência anti-regressão para evitar reabrir bugs já resolvidos.

## Quando Usar
- Antes de implementar qualquer nova feature
- Antes de modificar código existente
- Após corrigir qualquer bug
- Após decisões arquiteturais relevantes

## Fluxo de Trabalho

### 1. Consultar Log Antes de Mudanças
```bash
# Verificar se o bug que você está prestes a introduzir já foi corrigido
grep -i "bug" CONTEXT_LOG.md | grep -i "palavra-chave"
```

### 2. Registrar Feature Implementada
Adicionar ao `CONTEXT_LOG.md`:
```markdown
## [DATA] - Feature: Nome da Feature
- **Descrição:** O que foi feito
- **Arquivos afetados:** lista de arquivos modificados/criados
- **Status:** ✅ Concluído
- **Autor:** nome do agente/usuário
```

### 3. Registrar Bug Fix
Adicionar ao `CONTEXT_LOG.md`:
```markdown
## [DATA] - Bug Fix: Descrição do Bug
- **Problema:** O que acontecia errado
- **Causa raiz:** Por que acontecia
- **Solução:** Como foi corrigido
- **Arquivos afetados:** lista
- **Status:** ✅ Corrigido
- **Prevenção:** O que verificar para evitar recorrência
```

### 4. Verificar Anti-Regressão
Antes de modificar um arquivo, verificar se existe bug fix relacionado:
```bash
grep "nome_do_arquivo" CONTEXT_LOG.md
```

## Formato do Arquivo
O arquivo `CONTEXT_LOG.md` deve estar na raiz do projeto e seguir este formato:

```markdown
# Context Log - Projeto kloweekpipefy

## Legenda
- ✅ Concluído
- 🔄 Em andamento
- ❌ Cancelado
- 🐛 Bug Fix
- ⚠️ Atenção necessária

---

## Entradas do Log

### [DD/MM/AAAA] - Tipo: Descrição Curta
- **Descrição:** Detalhes
- **Arquivos:** arquivos.json
- **Status:** ✅/🔄/❌
- **Autor:** quem fez
- **Prevenção:** (para bugs) o que verificar
```

## Regras
1. **NUNCA** apagar entradas antigas do log
2. **SEMPRE** consultar o log antes de mudar código
3. **SEMPRE** registrar bugs com causa raiz e prevenção
4. Manter o log organizado por data (mais recente primeiro)
5. Usar tags consistentes: `✅`, `🔄`, `❌`, `🐛`, `⚠️`
