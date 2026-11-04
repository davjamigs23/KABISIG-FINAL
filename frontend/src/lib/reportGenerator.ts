export function openPrintableReport(title: string, subtitle: string, columns: string[], data: string[][], meta: any = {}) {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  // Build the table rows
  const trs = data.map(row => `<tr>${row.map(cell => `<td>${cell || '—'}</td>`).join('')}</tr>`).join('');
  const ths = columns.map(c => `<th>${c}</th>`).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; margin: 0; padding: 40px; color: #1e293b; background: #fff; }
        .header { text-align: center; border-bottom: 3px solid #091d64; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { margin: 0; color: #091d64; font-size: 20px; text-transform: uppercase; letter-spacing: 2px; }
        .header p { margin: 5px 0 0; color: #64748b; font-size: 14px; }
        .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; color: #475569; background: #f8fafc; padding: 12px; border-radius: 8px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 12px; }
        th { background: #091d64; color: #fff; text-align: left; padding: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
        tr:nth-child(even) { background-color: #f8fafc; }
        .footer { margin-top: 50px; display: flex; justify-content: space-between; font-size: 12px; }
        .signature { text-align: center; width: 250px; }
        .signature p { margin: 0 0 50px; font-weight: 600; }
        .signature .line { border-top: 1px solid #000; padding-top: 5px; font-weight: 700; }
        @media print {
          body { padding: 0; }
          th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Republic of the Philippines</h1>
        <h1>KABISIG System</h1>
        <p>${subtitle}</p>
      </div>
      
      <div class="meta">
        <span><strong>Report:</strong> ${title}</span>
        <span><strong>Generated:</strong> ${today}</span>
        <span><strong>Barangay:</strong> ${meta.barangay || 'N/A'}</span>
      </div>

      <table>
        <thead><tr>${ths}</tr></thead>
        <tbody>${trs}</tbody>
      </table>

      <div class="footer">
        <div class="signature">
          <p>Prepared by:</p>
          <div class="line">${meta.preparedBy || 'System Generated'}</div>
          <div>Position / Title</div>
        </div>
        <div class="signature">
          <p>Approved by:</p>
          <div class="line">${meta.approvedBy || 'SK Chairperson'}</div>
          <div>SK Chairperson</div>
        </div>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}