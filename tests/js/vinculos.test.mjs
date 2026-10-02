// Rodar: node --test tests/js/vinculos.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chaveCliente, aplicarVinculos } from '../../js/utils/vinculos.js';

test('chaveCliente: normaliza nome do cockpit (acentos, tags, caixa)', () => {
    assert.equal(chaveCliente('Prestek [IS]'), 'PRESTEK');
    assert.equal(chaveCliente('SANTÉ SOLUÇÕES'), 'SANTE SOLUCOES');
    assert.equal(chaveCliente(''), '');
});

test('aplicarVinculos: anexa títulos vinculados sem alterar os demais clientes', () => {
    const clientes = [{ nome: 'BEITY', squad: 'monsters-sa' }, { nome: 'ELARA', squad: 'wall-street' }];
    const rows = [{ cliente_chave: 'BEITY', card_titulo: 'BEITY' }, { cliente_chave: 'NAO EXISTE', card_titulo: 'X' }];
    const out = aplicarVinculos(clientes, rows);
    assert.deepEqual(out[0].vinculos, ['BEITY']);
    assert.deepEqual(out[1].vinculos, []);
    assert.equal(clientes[0].vinculos, undefined, 'não muta a lista original');
});

test('aplicarVinculos: entrada vazia', () => {
    assert.deepEqual(aplicarVinculos(null, null), []);
    assert.deepEqual(aplicarVinculos([{ nome: 'A' }], null)[0].vinculos, []);
});
