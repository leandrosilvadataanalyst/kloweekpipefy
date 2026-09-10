/**
 * Google Apps Script para a Planilha de Backup
 * Cole este código em: Extensões > Apps Script
 * Depois execute a função setup() uma única vez
 */

const SHEETS_CONFIG = {
  'ROI Week': [
    'ID', 'Cliente', 'Projeto', 'Investimento', 'MC (%)',
    'Faturamento', 'Vendas', 'Data Atualização', 'Data Ref',
    'Squad', 'Status', 'Card URL', 'Sincronizado Em'
  ],
  'Cockpit Wall Street': [
    'ID', 'Nome', 'Squad', 'Coordenador', 'Account', 'GT',
    'Fee', 'Flag', 'Health', 'Customer Care Status', 'Data Atualização', 'Sincronizado Em'
  ],
  'Cockpit Romans': [
    'ID', 'Nome', 'Squad', 'Coordenador', 'Account', 'GT',
    'Fee', 'Flag', 'Health', 'Customer Care Status', 'Data Atualização', 'Sincronizado Em'
  ],
  'Cockpit Legacy': [
    'ID', 'Nome', 'Squad', 'Coordenador', 'Account', 'GT',
    'Fee', 'Flag', 'Health', 'Customer Care Status', 'Data Atualização', 'Sincronizado Em'
  ],
  'Cockpit Monsters': [
    'ID', 'Nome', 'Squad', 'Coordenador', 'Account', 'GT',
    'Fee', 'Flag', 'Health', 'Customer Care Status', 'Data Atualização', 'Sincronizado Em'
  ],
  'Database Clientes': [
    'ID', 'Nome', 'Fee', 'Produto', 'Data Assinatura', 'Sincronizado Em'
  ],
  'Database Projeto': [
    'ID', 'Nome', 'Status', 'Fase', 'Sincronizado Em'
  ],
  'Sync Log': [
    'Timestamp', 'Origem', 'Ação', 'Registros', 'Status', 'Detalhes'
  ]
};

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  for (const [name, header] of Object.entries(SHEETS_CONFIG)) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      Logger.log('Aba criada: ' + name);
    }
    // Escrever header na primeira linha
    sheet.getRange(1, 1, 1, header.length).setValues([header]);
    Logger.log('Header escrito: ' + name);
  }
  
  // Remover aba "Página1" se existir
  const defaultSheet = ss.getSheetByName('Página1');
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }
  
  Logger.log('Setup completo!');
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const sheetName = data.sheet;
    const rows = data.rows;
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    
    // Criar aba se não existir
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      const config = SHEETS_CONFIG[sheetName];
      if (config) {
        sheet.getRange(1, 1, 1, config.length).setValues([config]);
      }
    }
    
    if (action === 'replace') {
      // Limpar e escrever tudo
      const lastRow = sheet.getLastRow();
      if (lastRow > 0) {
        sheet.getRange(1, 1, lastRow, sheet.getLastColumn()).clearContent();
      }
      if (rows && rows.length > 0) {
        sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
      }
    } else if (action === 'append') {
      // Adicionar linhas no final
      if (rows && rows.length > 0) {
        sheet.appendRows(rows);
      }
    } else if (action === 'log') {
      // Adicionar log
      if (rows && rows.length > 0) {
        sheet.appendRows(rows);
      }
    }
    
    return ContentService.createTextOutput(
      JSON.stringify({ ok: true, sheet: sheetName, rows: rows ? rows.length : 0 })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  const sheetName = e.parameter.sheet;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (sheetName) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      return ContentService.createTextOutput(
        JSON.stringify({ error: 'Aba não encontrada' })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    const data = sheet.getDataRange().getValues();
    return ContentService.createTextOutput(
      JSON.stringify({ sheet: sheetName, rows: data })
    ).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Listar abas
  const sheets = ss.getSheets().map(s => ({
    name: s.getName(),
    rows: s.getLastRow(),
    cols: s.getLastColumn()
  }));
  return ContentService.createTextOutput(
    JSON.stringify({ sheets })
  ).setMimeType(ContentService.MimeType.JSON);
}
