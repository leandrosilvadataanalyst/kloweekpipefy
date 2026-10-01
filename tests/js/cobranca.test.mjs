// Rodar: node --test tests/js/cobranca.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { naoIdentificados, agruparPorDupla, gerarMensagemCobranca } from '../../js/utils/cobranca.js';

const lista = [
    { nome: 'ELARA', squad: 'romans', coordenador: 'Giullio', gt: 'Luca', razaoSocial: 'ELARA INDUSTRIA', preenchido: true },
    { nome: 'TEKSEA', squad: 'romans', coordenador: 'Giullio', gt: 'Luca', razaoSocial: 'TEKSEA', preenchido: false },
    { nome: 'Prestek [IS]', squad: 'romans', coordenador: 'Giullio', gt: 'Luca', razaoSocial: '', preenchido: false },
    { nome: 'CF MOTOS', squad: 'monsters-sa', coordenador: ' Ana ', gt: 'Bia  Souza', razao_social: '', preenchido: false },
    { nome: 'IGHER', squad: 'legacy', coordenador: '', gt: '', razaoSocial: 'IGHER CONSULTORIA', preenchido: false }
];

test('naoIdentificados: só quem não tem card preenchido (sem campo preenchido = pendente)', () => {
    assert.deepEqual(naoIdentificados(lista).map(c => c.nome), ['TEKSEA', 'Prestek [IS]', 'CF MOTOS', 'IGHER']);
    assert.deepEqual(naoIdentificados([{ nome: 'X' }]).map(c => c.nome), ['X']);
    assert.deepEqual(naoIdentificados(null), []);
});

test('agruparPorDupla: ordena squad → coord → gt e normaliza espaços', () => {
    const g = agruparPorDupla(naoIdentificados(lista));
    assert.deepEqual(g.map(x => `${x.squad}|${x.coord}|${x.gt}`), [
        'legacy|Sem Coord|Sem GT', 'monsters-sa|Ana|Bia Souza', 'romans|Giullio|Luca'
    ]);
    assert.deepEqual(g[2].clientes.map(c => c.nome), ['TEKSEA', 'Prestek [IS]']);
});

test('gerarMensagemCobranca: lista só os não identificados e marca razão social vazia', () => {
    const msg = gerarMensagemCobranca(lista);
    assert.ok(!msg.includes('ELARA'), 'cliente identificado não entra na cobrança');
    assert.ok(msg.includes('romans: Coord Giullio | GT: Luca\nClientes com ROI Week pendente de preenchimento:\n- TEKSEA\n- Prestek [IS] (sem razão social no cockpit)\n'));
    assert.ok(msg.includes('- CF MOTOS (sem razão social no cockpit)'));
    assert.ok(msg.includes('- IGHER\n'));
});

test('gerarMensagemCobranca: sem coluna de razão social lida, não marca ninguém', () => {
    const semColuna = lista.map(({ razaoSocial, razao_social, ...c }) => ({ ...c, razao_social: '' }));
    assert.ok(!gerarMensagemCobranca(semColuna).includes('sem razão social'));
});

test('gerarMensagemCobranca: aceita nome_fantasia (relatório ROI)', () => {
    const msg = gerarMensagemCobranca([{ nome_fantasia: 'BIOZHEN', squad: 'romans', coordenador: 'G', gt: 'L' }]);
    assert.ok(msg.includes('- BIOZHEN'));
});

test('gerarMensagemCobranca: todos identificados', () => {
    assert.equal(gerarMensagemCobranca([{ nome: 'A', preenchido: true }]), 'Todos os clientes já preencheram o ROI Week!');
    assert.equal(gerarMensagemCobranca([]), 'Todos os clientes já preencheram o ROI Week!');
});
