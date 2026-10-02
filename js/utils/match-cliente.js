// Fonte única do cruzamento cliente (cockpit) × card do ROI Week (Pipefy).
// Espelhado em api/match-cliente.php — qualquer mudança aqui deve ir para lá
// e para tests/fixtures/match-cliente.json (testes de paridade JS/PHP).
//
// Níveis (menor = mais confiável):
//   0 vinculo_manual → vínculo feito na tela Ajustes (cliente.vinculos = títulos de card; ver utils/vinculos.js)
//   1 razao_social → coluna "Razão Social/Nome card Pipefy" do cockpit == título/projeto do card
//   2 nome         → nome (ou razão) igual após normalizar, ignorando espaços ou plural
//   3 prefixo      → um nome é o início do outro, palavra por palavra (ex.: MOTO CHEFE → MOTO CHEFE CARAGUA)
//   4 contido      → nome de 2+ palavras contido no outro (ex.: APOENA EVENTOS → AUDITÓRIO APOENA EVENTOS)

const STOPWORDS = new Set(['LTDA', 'EIRELI', 'ME', 'EPP', 'SA', 'MEI', 'CIA', 'COMERCIO', 'DE', 'DA', 'DO', 'DOS', 'DAS', 'E']);

export const NIVEIS = Object.freeze({ vinculo_manual: 0, razao_social: 1, nome: 2, prefixo: 3, contido: 4 });

function semAcento(s) {
    return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function normalizarNome(valor) {
    if (valor == null) return '';
    const s = semAcento(String(valor))
        .replace(/\[[^\]]*\]/g, ' ')        // tags do cockpit: [IS], [PDV], [EC]...
        .replace(/\(\d[^)]*\)/g, ' ')       // datas entre parênteses: (04/03/2026)
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, ' ')
        .replace(/\b(S A|S S)\b/g, ' ');    // S/A, S.A, S/S
    return s.split(' ').filter(w => w && !STOPWORDS.has(w)).join(' ');
}

function singular(nome) {
    return nome.split(' ').map(w => (w.length > 3 ? w.replace(/AIS$/, 'AL').replace(/S$/, '') : w)).join(' ');
}

function listaProjeto(projeto) {
    if (!projeto) return [];
    if (Array.isArray(projeto)) return projeto;
    const s = String(projeto).trim();
    if (s.startsWith('[')) {
        try {
            const arr = JSON.parse(s);
            if (Array.isArray(arr)) return arr;
        } catch (e) { /* texto simples */ }
    }
    return [s];
}

export function nomesDoCard(card) {
    if (!card) return [];
    const nomes = [card.cliente_nome, ...listaProjeto(card.projeto)].map(normalizarNome).filter(Boolean);
    return [...new Set(nomes)];
}

function iguais(a, b) {
    return a === b || a.replace(/ /g, '') === b.replace(/ /g, '');
}

function ehPrefixo(a, b) {
    const ta = singular(a).split(' ');
    const tb = singular(b).split(' ');
    const [curto, longo] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
    return curto.join('').length >= 4 && curto.every((w, i) => longo[i] === w);
}

function ehContido(a, b) {
    const [curto, longo] = a.split(' ').length <= b.split(' ').length ? [a, b] : [b, a];
    return curto.split(' ').length >= 2 && ` ${longo} `.includes(` ${curto} `);
}

// A coluna "Razão Social/Nome card Pipefy" pode ter vários nomes: "RAZÃO LTDA / NOME DO CARD"
// (ex.: TARSUS → "IDEAL INDUSTRIA ... LTDA / IDEAL TELAS"). Separadores: " / " (com espaços,
// para não quebrar S/A e S/S), ";" e "|".
export function razoesDoCliente(cliente) {
    const bruto = String(cliente?.razaoSocial ?? cliente?.razao_social ?? '');
    return [...new Set(bruto.split(/\s+\/\s+|[;|]/).map(normalizarNome).filter(Boolean))];
}

export function matchCliente(cliente, card) {
    const nomesCard = nomesDoCard(card);
    if (!cliente || !nomesCard.length) return null;
    // Nível 0: vínculo manual feito na tela Ajustes (cliente → título do card)
    const vinculos = (cliente.vinculos || []).map(normalizarNome).filter(Boolean);
    if (vinculos.some(v => nomesCard.some(n => iguais(v, n)))) return { via: 'vinculo_manual', nivel: 0 };

    const razoes = razoesDoCliente(cliente);
    const nome = normalizarNome(cliente.nome);
    const variantes = [nome, ...razoes].filter(Boolean);

    if (razoes.some(r => nomesCard.some(n => iguais(r, n)))) return { via: 'razao_social', nivel: 1 };
    if (variantes.some(v => nomesCard.some(n => iguais(v, n) || singular(v) === singular(n)))) return { via: 'nome', nivel: 2 };
    if (variantes.some(v => nomesCard.some(n => ehPrefixo(v, n)))) return { via: 'prefixo', nivel: 3 };
    if (variantes.some(v => nomesCard.some(n => ehContido(v, n)))) return { via: 'contido', nivel: 4 };
    return null;
}

// Cards do cliente no nível mais confiável encontrado (evita SLEEP HOUSE casar com SLEEP HOUSE IPIRANGA
// quando existe o card exato). Mantém a ordem original da lista.
export function encontrarCards(cliente, cards) {
    const comMatch = (cards || []).map(card => ({ card, m: matchCliente(cliente, card) })).filter(x => x.m);
    if (!comMatch.length) return [];
    const melhor = Math.min(...comMatch.map(x => x.m.nivel));
    return comMatch.filter(x => x.m.nivel === melhor).map(x => x.card);
}

// Card enviado no período = cliente preenchido/identificado, mesmo com tudo zerado:
// projeto em Implementação, por exemplo, ainda não tem mídia (caso CIA COLLOR, Out/2026).
export function cardPreenchido(card) {
    return !!card;
}

// Só para médias (ROI/ROAS/CAC/Top GT): card com algum valor > 0, para não puxar as médias para zero.
export function cardComValores(card) {
    if (!card) return false;
    return ['investimento', 'faturamento', 'mc', 'vendas'].some(k => Number(card[k]) > 0);
}

function headerNorm(h) {
    return semAcento(String(h || '')).toUpperCase().trim();
}

// "Razão Social/Nome card Pipefy" (Wall Street/Romans/Legacy) e "Projeto no Pipefy/Razão Social" (Monsters S/A)
export function indiceColunaRazao(headers) {
    return (headers || []).findIndex(h => {
        const n = headerNorm(h);
        return n.includes('RAZAO SOCIAL') || (n.includes('PIPEFY') && (n.includes('CARD') || n.includes('PROJETO')));
    });
}

export function indiceColunaCnpj(headers) {
    return (headers || []).findIndex(h => headerNorm(h).startsWith('CNPJ'));
}
