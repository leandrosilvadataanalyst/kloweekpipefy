export class ExportService {
    static exportToJSON(data, filename = 'relatorio_roi.json') {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        this._downloadBlob(blob, filename);
    }

    static exportToCSV(data, filename = 'relatorio_roi.csv') {
        if (!data || data.length === 0) return;
        
        const headers = ['Squad', 'Coordenador', 'Account', 'GT', 'Cliente', 'Faturamento (R$)', 'Margem de Contribuição (%)', 'Investimento Mídia (R$)', 'ROI', 'ROAS', 'CAC (R$)', 'Prazo', 'Status', 'Link Pipefy'];
        const rows = data.map(item => [
            `"${item.squad || ''}"`,
            `"${item.coordenador || ''}"`,
            `"${item.account || ''}"`,
            `"${item.gt || ''}"`,
            `"${item.nome || ''}"`,
            item.faturamento ? item.faturamento.toFixed(2) : '0.00',
            item.preenchido && item.mc ? (item.mc > 1 ? item.mc : item.mc * 100).toFixed(2) : '0.00',
            item.investimento ? item.investimento.toFixed(2) : '0.00',
            item.roi ? item.roi.toFixed(2) : '0.00',
            item.roas ? item.roas.toFixed(2) : '0.00',
            item.cac ? item.cac.toFixed(2) : '0.00',
            `"${item.prazo || ''}"`,
            `"${item.preenchido ? 'Preenchido' : 'Pendente'}"`,
            `"${item.card_url || ''}"`
        ]);

        const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        this._downloadBlob(blob, filename);
    }

    static exportToExcel(data, filename = 'relatorio_roi.xls') {
        if (!data || data.length === 0) return;

        let tableHtml = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="utf-8" />
                <style>
                    th { background-color: #000000; color: #FFFFFF; font-weight: bold; }
                    td, th { border: 1px solid #CCCCCC; padding: 5px; text-align: left; }
                    .number { text-align: right; }
                </style>
            </head>
            <body>
                <table>
                    <thead>
                        <tr>
                            <th>Squad</th>
                            <th>Coordenador</th>
                            <th>Account</th>
                            <th>GT</th>
                            <th>Cliente</th>
                            <th>Faturamento (R$)</th>
                            <th>Margem de Contribuição (%)</th>
                            <th>Investimento em Mídia (R$)</th>
                            <th>ROI</th>
                            <th>ROAS</th>
                            <th>CAC (R$)</th>
                            <th>Prazo (01-03)</th>
                            <th>Status</th>
                            <th>Link Pipefy</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        data.forEach(item => {
            tableHtml += `
                <tr>
                    <td>${item.squad || ''}</td>
                    <td>${item.coordenador || ''}</td>
                    <td>${item.account || ''}</td>
                    <td>${item.gt || ''}</td>
                    <td>${item.nome || ''}</td>
                    <td class="number">${item.faturamento ? item.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}</td>
                    <td class="number">${item.preenchido && item.mc ? (item.mc > 1 ? item.mc : item.mc * 100).toFixed(2) + '%' : '0,00%'}</td>
                    <td class="number">${item.investimento ? item.investimento.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}</td>
                    <td class="number">${item.roi ? item.roi.toFixed(2) + 'x' : '0,00x'}</td>
                    <td class="number">${item.roas ? item.roas.toFixed(2) + 'x' : '0,00x'}</td>
                    <td class="number">${item.cac ? item.cac.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}</td>
                    <td>${item.prazo || '-'}</td>
                    <td>${item.preenchido ? 'Preenchido' : 'Pendente'}</td>
                    <td>${item.card_url || ''}</td>
                </tr>
            `;
        });

        tableHtml += `
                    </tbody>
                </table>
            </body>
            </html>
        `;

        const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
        this._downloadBlob(blob, filename);
    }

    static _downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
