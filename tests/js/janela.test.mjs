// Rodar: node --test tests/js/janela.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    JANELA_PADRAO, normalizarConfig, resolverJanela, validarJanela, estaNaJanela, rotuloJanela
} from '../../js/utils/janela.js';

const rows = [
    { chave: 'padrao', dia_inicio: 1, dia_fim: 5, motivo: '' },
    { chave: '2026-10', dia_inicio: 1, dia_fim: 7, motivo: 'Feriado 12/10' },
    { chave: '2026-02', dia_inicio: 1, dia_fim: 31, motivo: 'fim além do mês' },
    { chave: 'lixo', dia_inicio: 1, dia_fim: 3 },
    { chave: '2026-11', dia_inicio: 9, dia_fim: 2 }
];

test('normalizarConfig: separa padrão e exceções e ignora linhas inválidas', () => {
    const c = normalizarConfig(rows);
    assert.deepEqual(c.padrao, { inicio: 1, fim: 5, motivo: '' });
    assert.deepEqual(Object.keys(c.excecoes).sort(), ['2026-02', '2026-10']);
    assert.deepEqual(normalizarConfig(null), { padrao: { ...JANELA_PADRAO, motivo: '' }, excecoes: {} });
});

test('resolverJanela: exceção do mês > padrão configurado > 01–03', () => {
    const c = normalizarConfig(rows);
    assert.deepEqual(resolverJanela(c, '2026-10'), { inicio: 1, fim: 7, origem: 'excecao', motivo: 'Feriado 12/10' });
    assert.deepEqual(resolverJanela(c, '2026-12'), { inicio: 1, fim: 5, origem: 'padrao', motivo: '' });
    assert.deepEqual(resolverJanela(null, '2026-12'), { inicio: 1, fim: 3, origem: 'padrao', motivo: '' });
});

test('resolverJanela: fim limitado ao último dia do mês', () => {
    assert.equal(resolverJanela(normalizarConfig(rows), '2026-02').fim, 28);
});

test('validarJanela', () => {
    assert.equal(validarJanela({ inicio: 1, fim: 3 }), '');
    assert.equal(validarJanela({ inicio: 1, fim: 31 }), '');
    assert.match(validarJanela({ inicio: 5, fim: 2 }), /fim/);
    assert.match(validarJanela({ inicio: 0, fim: 3 }), /início/);
    assert.match(validarJanela({ inicio: 1, fim: 32 }), /fim/);
    assert.match(validarJanela({ inicio: 'a', fim: 3 }), /início/);
});

test('estaNaJanela: inclui o dia final inteiro e só no mês do período', () => {
    const j = { inicio: 1, fim: 7 };
    assert.equal(estaNaJanela(new Date(2026, 9, 1, 0, 0), j, 2026, 9), true);
    assert.equal(estaNaJanela(new Date(2026, 9, 7, 23, 59), j, 2026, 9), true);
    assert.equal(estaNaJanela(new Date(2026, 9, 8, 0, 0), j, 2026, 9), false);
    assert.equal(estaNaJanela(new Date(2026, 8, 3), j, 2026, 9), false);
    assert.equal(estaNaJanela(null, j, 2026, 9), false);
});

test('rotuloJanela', () => {
    assert.equal(rotuloJanela({ inicio: 1, fim: 3 }), '01 a 03');
    assert.equal(rotuloJanela({ inicio: 2, fim: 12 }), '02 a 12');
});
