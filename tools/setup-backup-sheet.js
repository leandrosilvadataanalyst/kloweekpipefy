#!/bin/bash
# Script para configurar a planilha de backup
# Execute: node api/setup-backup-sheet.js

const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');

const BACKUP_SPREADSHEET_ID = '13GcuQBrOhsGJO0T39UQS8xoGAVKoZOsesAtgt4Xqhek';

const SHEETS_TO_CREATE = [
    {
        name: 'ROI Week',
        header: ['ID', 'Cliente', 'Projeto', 'Investimento', 'MC (%)', 'Faturamento', 'Vendas', 'Data Atualização', 'Data Ref', 'Squad', 'Status', 'Card URL', 'Sincronizado Em']
    },
    {
        name: 'Cockpit Wall Street',
        header: ['ID', 'Nome', 'Squad', 'Coordenador', 'Account', 'GT', 'Fee', 'Flag', 'Health', 'Customer Care Status', 'Data Atualização', 'Sincronizado Em']
    },
    {
        name: 'Cockpit Romans',
        header: ['ID', 'Nome', 'Squad', 'Coordenador', 'Account', 'GT', 'Fee', 'Flag', 'Health', 'Customer Care Status', 'Data Atualização', 'Sincronizado Em']
    },
    {
        name: 'Cockpit Legacy',
        header: ['ID', 'Nome', 'Squad', 'Coordenador', 'Account', 'GT', 'Fee', 'Flag', 'Health', 'Customer Care Status', 'Data Atualização', 'Sincronizado Em']
    },
    {
        name: 'Cockpit Monsters',
        header: ['ID', 'Nome', 'Squad', 'Coordenador', 'Account', 'GT', 'Fee', 'Flag', 'Health', 'Customer Care Status', 'Data Atualização', 'Sincronizado Em']
    },
    {
        name: 'Database Clientes',
        header: ['ID', 'Nome', 'Fee', 'Produto', 'Data Assinatura', 'Sincronizado Em']
    },
    {
        name: 'Database Projeto',
        header: ['ID', 'Nome', 'Status', 'Fase', 'Sincronizado Em']
    },
    {
        name: 'Sync Log',
        header: ['Timestamp', 'Origem', 'Ação', 'Registros', 'Status', 'Detalhes']
    }
];

async function setup() {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}');
    if (!credentials.client_email) {
        console.error('GOOGLE_SERVICE_ACCOUNT_KEY não configurada no .env');
        process.exit(1);
    }

    const auth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    console.log('Verificando planilha existente...');
    const meta = await sheets.spreadsheets.get({
        spreadsheetId: BACKUP_SPREADSHEET_ID,
        fields: 'sheets.properties'
    });

    const existingSheets = meta.data.sheets.map(s => s.properties.title);
    console.log('Abas existentes:', existingSheets);

    const requests = [];
    for (const sheetDef of SHEETS_TO_CREATE) {
        if (existingSheets.includes(sheetDef.name)) {
            console.log(`Aba "${sheetDef.name}" já existe - pulando`);
            continue;
        }
        console.log(`Criando aba "${sheetDef.name}"...`);
        requests.push({
            addSheet: {
                properties: { title: sheetDef.name }
            }
        });
    }

    if (requests.length > 0) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: BACKUP_SPREADSHEET_ID,
            requestBody: { requests }
        });
        console.log(`${requests.length} abas criadas com sucesso`);
    }

    console.log('Escrevendo headers...');
    for (const sheetDef of SHEETS_TO_CREATE) {
        try {
            await sheets.spreadsheets.values.update({
                spreadsheetId: BACKUP_SPREADSHEET_ID,
                range: `${sheetDef.name}!A1`,
                valueInputOption: 'RAW',
                requestBody: { values: [sheetDef.header] }
            });
            console.log(`  ${sheetDef.name}: ${sheetDef.header.length} colunas`);
        } catch (e) {
            console.error(`  ${sheetDef.name}: ERRO - ${e.message}`);
        }
    }

    console.log('\nSetup completo!');
    console.log('Planilha: https://docs.google.com/spreadsheets/d/' + BACKUP_SPREADSHEET_ID + '/edit');
}

setup().catch(e => {
    console.error('Erro:', e.message);
    process.exit(1);
});
