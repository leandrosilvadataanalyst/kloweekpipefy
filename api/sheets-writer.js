const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');

let authClient = null;
let sheets = null;

async function getAuth() {
    if (authClient) return authClient;

    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}');
    if (!credentials.client_email) {
        throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY não configurada no .env');
    }

    authClient = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    sheets = google.sheets({ version: 'v4', auth: authClient });
    return authClient;
}

async function getSheetId(spreadsheetId, sheetName) {
    await getAuth();
    const res = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties'
    });
    const sheet = res.data.sheets.find(s => s.properties.title === sheetName);
    return sheet ? sheet.properties.sheetId : null;
}

async function createSheet(spreadsheetId, sheetName) {
    await getAuth();
    const res = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
            requests: [{
                addSheet: {
                    properties: { title: sheetName }
                }
            }]
        }
    });
    return res.data.replies[0].addSheet.properties.sheetId;
}

async function clearSheet(spreadsheetId, sheetName) {
    await getAuth();
    await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${sheetName}!A:Z`
    });
}

async function writeRows(spreadsheetId, sheetName, rows) {
    await getAuth();
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows }
    });
}

async function appendRow(spreadsheetId, sheetName, row) {
    await getAuth();
    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:Z`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [row] }
    });
}

async function ensureSheetExists(spreadsheetId, sheetName) {
    let sheetId = await getSheetId(spreadsheetId, sheetName);
    if (!sheetId) {
        sheetId = await createSheet(spreadsheetId, sheetName);
    }
    return sheetId;
}

async function replaceAll(spreadsheetId, sheetName, headerRow, dataRows) {
    await ensureSheetExists(spreadsheetId, sheetName);
    await clearSheet(spreadsheetId, sheetName);
    const allRows = [headerRow, ...dataRows];
    await writeRows(spreadsheetId, sheetName, allRows);
    return { sheetName, rowsWritten: allRows.length };
}

module.exports = {
    getSheetId,
    createSheet,
    clearSheet,
    writeRows,
    appendRow,
    ensureSheetExists,
    replaceAll
};
