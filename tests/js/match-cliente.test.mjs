// Rodar: node --test tests/js/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    normalizarNome, nomesDoCard, matchCliente, encontrarCards, cardPreenchido, indiceColunaRazao, indiceColunaCnpj
} from '../../js/utils/match-cliente.js';

const F = JSON.parse(readFileSync(new URL('../fixtures/match-cliente.json', import.meta.url), 'utf8'));

test('normalizarNome', () => {
    for (const c of F.normalizar) assert.equal(normalizarNome(c.in), c.out, JSON.stringify(c.in));
});

test('nomesDoCard', () => {
    for (const c of F.nomesDoCard) assert.deepEqual(nomesDoCard(c.card), c.out);
});

test('matchCliente', () => {
    for (const c of F.match) {
        const r = matchCliente(c.cliente, c.card);
        assert.equal(r ? r.via : null, c.via, c.desc);
    }
});

test('encontrarCards', () => {
    for (const c of F.encontrar) {
        assert.deepEqual(encontrarCards(c.cliente, c.cards).map(x => x.id), c.ids, c.desc);
    }
});

test('cardPreenchido', () => {
    for (const c of F.preenchido) assert.equal(cardPreenchido(c.card), c.out, JSON.stringify(c.card));
});

test('colunas razão social / CNPJ', () => {
    for (const c of F.colunaRazao) {
        assert.equal(indiceColunaRazao(c.headers), c.razao, c.headers.join('|'));
        assert.equal(indiceColunaCnpj(c.headers), c.cnpj, c.headers.join('|'));
    }
});
