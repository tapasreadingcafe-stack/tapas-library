// CSV export utility

export function exportToCSV(data, filename) {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        let val = row[h];
        if (val === null || val === undefined) val = '';
        val = String(val).replace(/"/g, '""');
        if (val.includes(',') || val.includes('"') || val.includes('\n')) val = `"${val}"`;
        return val;
      }).join(',')
    )
  ];

  // Leading BOM so Excel reads the file as UTF-8 (₹, names in other scripts).
  const csvString = '\uFEFF' + csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Rows-as-arrays export, for report-style files with a heading block, a total
// row and notes — things a single object-per-row table can't hold.
export function exportRowsToCSV(rows, filename) {
  const cell = (v) => {
    let val = v === null || v === undefined ? '' : String(v);
    val = val.replace(/"/g, '""');
    return /[",\n]/.test(val) ? `"${val}"` : val;
  };
  const csvString = '\uFEFF' + rows.map(r => r.map(cell).join(',')).join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
