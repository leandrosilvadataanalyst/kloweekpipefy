// Configuração do Pipefy
// Token do Pipefy fica SOMENTE no servidor (env vars / .env local — nunca no repositório).
export const CONFIG = {
    PIPES: {
        ROI_WEEK: '303444567',
        ADITIVO: '303700294',
        DATABASE_CLIENTES: '301753761',
        DATABASE_PROJETO: '305733459'
    },
    API_URL: 'https://api.pipefy.com/graphql',
    SHEETS: {
        WALL_STREET: { id: '1zMpTklO0jLCZcMFan_KKTctbgMySRqd_pVxsrHdsz5U', title: '[Cockpit - Teste]', gid: 330387776, squad: 'wall-street' },
        ROMANS: { id: '1U7ciY_zNsbb6esFMMgwSOC-R16kFO5Z4ddACdBNhDtA', title: '[Cockpit - Teste]', gid: 330387776, squad: 'romans' },
        LEGACY: { id: '17y3rdmRMO3moQP9haBJOg5Z8bv-4T4BVtfvMowm3jv8', title: '[ Cockpit ]', gid: 330387776, squad: 'legacy' },
        MONSTERS_SA: { id: '1Oj971TOsgJQ_3A5sBRGHcEgx53y2r-PuZeOd_E002Ao', title: '[COCKPIT]', gid: 330387776, squad: 'monsters-sa' }
    },
    BACKUP_SHEET: { id: '13GcuQBrOhsGJO0T39UQS8xoGAVKoZOsesAtgt4Xqhek' }
};
