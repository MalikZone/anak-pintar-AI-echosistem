/**
 * CSV Export & Download Utility for Hadirin
 */

/**
 * Escape a single cell value for CSV formatting
 * @param {any} val
 * @returns {string}
 */
function escapeCsvValue(val) {
  if (val == null) return '""';
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Export data array to a downloadable CSV file with Excel-friendly UTF-8 BOM.
 *
 * @param {string} filename Name of the file, e.g. "rekap-kehadiran-oktober-2026.csv"
 * @param {Array<{ key: string, label: string }>} columns Array of column definitions
 * @param {Array<Object>} rows Array of data objects
 */
export function exportToCsv(filename, columns, rows) {
  if (!Array.isArray(columns) || !Array.isArray(rows)) return;

  const headerLine = columns.map((col) => escapeCsvValue(col.label)).join(',');
  const rowLines = rows.map((row) =>
    columns.map((col) => escapeCsvValue(row[col.key] != null ? row[col.key] : '')).join(',')
  );

  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download a CSV template file with sample row for bulk import.
 *
 * @param {string} filename e.g. "template-impor-karyawan-hadirin.csv"
 * @param {Array<string>} headers Column header names
 * @param {Array<string>} sampleRow Optional example row
 */
export function downloadCsvTemplate(filename, headers, sampleRow = []) {
  const headerLine = headers.map(escapeCsvValue).join(',');
  const sampleLine = sampleRow.length > 0 ? sampleRow.map(escapeCsvValue).join(',') : '';

  const lines = [headerLine];
  if (sampleLine) lines.push(sampleLine);

  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
