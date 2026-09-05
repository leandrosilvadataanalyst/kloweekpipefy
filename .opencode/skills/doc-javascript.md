# Skill: Documentação JavaScript

## Descrição
Referência de JavaScript para o frontend do projeto kloweekpipefy. Foco em DOM manipulation, fetch API, clipboard API, e event handling com Tailwind CSS.

## Quando Usar
- Quando criar/modificar interatividade nas páginas
- Quando fazer chamadas API via fetch
- Quando implementar filtros dinâmicos
- Quando usar a Clipboard API

## Fetch API

### GET
```javascript
const response = await fetch('/api/endpoint');
const data = await response.json();
```

### POST
```javascript
const response = await fetch('/api/endpoint', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(dados)
});
const data = await response.json();
```

### Tratamento de Erros
```javascript
try {
    const response = await fetch('/api/endpoint');
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
} catch (error) {
    console.error('Erro:', error);
}
```

## DOM Manipulation

### Selecionar Elementos
```javascript
// Por ID
const elemento = document.getElementById('meu-id');

// Por classe
const elementos = document.getElementsByClassName('minha-classe');

// Por seletor CSS
const el = document.querySelector('.minha-classe');
const els = document.querySelectorAll('.minha-classe');
```

### Modificar Conteúdo
```javascript
// Texto
elemento.textContent = 'Novo texto';

// HTML
elemento.innerHTML = '<p>Novo conteúdo</p>';

// Valor de input
input.value = 'novo valor';
```

### Modificar Estilos
```javascript
elemento.style.display = 'none';
elemento.classList.add('ativo');
elemento.classList.remove('inativo');
elemento.classList.toggle('visivel');
```

### Criar Elementos
```javascript
const novoElemento = document.createElement('div');
novoElemento.className = 'bg-white p-4 rounded';
novoElemento.textContent = 'Novo elemento';
document.body.appendChild(novoElemento);
```

## Event Listeners

### Click
```javascript
document.getElementById('botao').addEventListener('click', function() {
    console.log('Clicado!');
});
```

### Change (Selects)
```javascript
document.getElementById('filtro').addEventListener('change', function() {
    const valor = this.value;
    filtrarDados(valor);
});
```

### Input (Text Fields)
```javascript
document.getElementById('busca').addEventListener('input', function() {
    const termo = this.value.toLowerCase();
    filtrarTabela(termo);
});
```

## Clipboard API

### Copiar Texto
```javascript
async function copiarTexto(texto) {
    try {
        await navigator.clipboard.writeText(texto);
        alert('Texto copiado!');
    } catch (err) {
        console.error('Erro ao copiar:', err);
    }
}
```

### Copiar com Botão
```javascript
document.getElementById('btn-copiar').addEventListener('click', async function() {
    const mensagem = document.getElementById('mensagem').textContent;
    try {
        await navigator.clipboard.writeText(mensagem);
        this.textContent = 'Copiado!';
        setTimeout(() => {
            this.textContent = 'Copiar Mensagem';
        }, 2000);
    } catch (err) {
        alert('Erro ao copiar');
    }
});
```

## Filtrar e Renderizar

### Exemplo: Filtrar por Squad
```javascript
function filtrarPorSquad(squad) {
    const clientes = document.querySelectorAll('.cliente-row');
    
    clientes.forEach(row => {
        if (squad === '' || row.dataset.squad === squad) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

document.getElementById('squad-filter').addEventListener('change', function() {
    filtrarPorSquad(this.value);
});
```

### Exemplo: Renderizar Lista Dinâmica
```javascript
function renderizar Lista(containerId, dados) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    dados.forEach(item => {
        const div = document.createElement('div');
        div.className = 'p-4 border-b';
        div.innerHTML = `
            <h3 class="font-bold">${item.nome}</h3>
            <p class="text-gray-600">${item.squad}</p>
        `;
        container.appendChild(div);
    });
}
```

## Formatação de Números/Moeda

### Moeda Brasileira
```javascript
function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

// Exemplo: R$ 1.500,50
```

### Porcentagem
```javascript
function formatarPorcentagem(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    }).format(valor / 100);
}

// Exemplo: 15,5%
```

### Número
```javascript
function formatarNumero(valor) {
    return new Intl.NumberFormat('pt-BR').format(valor);
}

// Exemplo: 1.500
```

## Debounce (Para Filtros)
```javascript
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Uso
document.getElementById('busca').addEventListener('input', 
    debounce(function(e) {
        filtrarTabela(e.target.value);
    }, 300)
);
```

## Template Literals

### String com Variáveis
```javascript
const nome = 'Cliente';
const html = `<div class="p-4">
    <h2>${nome}</h2>
    <p>Status: ${status === 'safe' ? '✅' : '⚠️'}</p>
</div>`;
```

### Multilinha
```javascript
const mensagem = `
📋 Clientes Pendentes:

${clientes.map(c => `- ${c.nome}`).join('\n')}

Total: ${clientes.length}
`;
```

## Referências
- MDN: https://developer.mozilla.org/pt-BR/docs/Web/JavaScript
- Fetch: https://developer.mozilla.org/pt-BR/docs/Web/API/Fetch_API
- Clipboard: https://developer.mozilla.org/pt-BR/docs/Web/API/Clipboard_API
