import React, { useState, useRef } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../../../context/ToastContext';
import { userApi } from '../../../services/api/userApi';
import { downloadCsvTemplate } from '../../../utils/csvExport';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Users,
} from 'lucide-react';

export default function EmployeeBulkImportModal({ isOpen, onClose, onSuccess }) {
  const { t } = useLanguage();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [csvFile, setCsvFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [parseError, setParseError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  if (!isOpen) return null;

  // Download official CSV template
  const handleDownloadTemplate = () => {
    const headers = [
      'Nama Lengkap',
      'Email',
      'Telegram ID',
      'Nomor HP',
      'Departemen',
      'Jabatan',
      'Cabang',
      'Shift Kerja',
      'Role',
    ];
    const sampleRow = [
      'Budi Santoso',
      'budi.santoso@perusahaan.com',
      '1234567890',
      '081234567890',
      'Operasional',
      'Staff Operasional',
      'Kantor Pusat',
      'Shift 1 Pagi',
      'employee',
    ];
    downloadCsvTemplate('template-impor-karyawan-hadirin', headers, sampleRow);
    toast.success('Template CSV berhasil diunduh!');
  };

  // Helper to parse CSV string into array of objects
  const parseCsvText = (text) => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      throw new Error('File CSV harus memiliki baris judul kolom dan minimal 1 baris data.');
    }

    // Parse header
    const headers = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim());

    // Parse rows
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      // Simple regex split for CSV with quotes
      const values = [];
      let inQuotes = false;
      let currentVal = '';

      for (let charIndex = 0; charIndex < lines[i].length; charIndex++) {
        const char = lines[i][charIndex];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentVal.trim().replace(/^["']|["']$/g, ''));
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      values.push(currentVal.trim().replace(/^["']|["']$/g, ''));

      if (values.length > 0 && values.some((v) => v.length > 0)) {
        const rowObj = {};
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] || '';
        });
        rows.push(rowObj);
      }
    }

    return rows;
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setParseError(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        const rows = parseCsvText(text);
        setParsedRows(rows);
      } catch (err) {
        setParseError(err.message || 'Gagal membaca format CSV.');
        setParsedRows([]);
      }
    };
    reader.onerror = () => {
      setParseError('Gagal membaca file dari disk.');
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;

    try {
      setIsSubmitting(true);
      setImportResult(null);

      // Map rows to API payload
      const mappedEmployees = parsedRows.map((r) => ({
        name: r['Nama Lengkap'] || r.Nama || r.name || '',
        email: r.Email || r.email || '',
        telegramId: r['Telegram ID'] || r['ID Telegram'] || r.telegram_id || r.telegramId || '',
        phone: r['Nomor HP'] || r.telepon || r.phone || '',
        department: r.Departemen || r.department || '',
        position: r.Jabatan || r.position || '',
        branch: r.Cabang || r.branch || '',
        shift: r['Shift Kerja'] || r.shift || '',
        role: r.Role || r.role || 'employee',
      }));

      const res = await userApi.bulkImport(mappedEmployees);
      const data = res.data || res;

      setImportResult(data);
      if (data.importedCount > 0) {
        toast.success(
          t('import_success_msg', 'Berhasil mengimpor {count} data karyawan baru!', {
            count: data.importedCount,
          })
        );
        onSuccess?.();
      }
    } catch (err) {
      toast.error(err.message || 'Gagal melakukan impor karyawan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCsvFile(null);
    setParsedRows([]);
    setParseError(null);
    setImportResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col my-auto transition-all overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                {t('modal_bulk_import_title')}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('modal_bulk_import_subtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* Step 1: Download Template */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h5 className="font-bold text-xs text-indigo-950 dark:text-indigo-200">
                1. Unduh Format Template CSV Standar
              </h5>
              <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">
                Gunakan template ini untuk memastikan nama kolom sesuai dan terpetakan dengan benar.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200 hover:bg-indigo-50 dark:hover:bg-slate-700 text-xs font-bold transition-all shadow-xs shrink-0"
            >
              <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>{t('download_template_btn')}</span>
            </button>
          </div>

          {/* Step 2: Upload File Area */}
          <div>
            <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 mb-2">
              2. Pilih File CSV yang Sudah Diisi
            </h5>
            
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/30"
            >
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {csvFile ? csvFile.name : t('dropzone_csv_prompt')}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {t('dropzone_csv_support')}
              </p>
            </div>
          </div>

          {/* Parsing Error Notice */}
          {parseError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Kesalahan Format CSV</span>
                <span className="text-[11px] text-rose-700 dark:text-rose-400 leading-tight">
                  {parseError}
                </span>
              </div>
            </div>
          )}

          {/* Step 3: Preview Data */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {t('preview_import_rows', { count: parsedRows.length })}
                </span>
                <span className="text-[11px] text-slate-400">
                  Menampilkan maks. 5 baris pertama
                </span>
              </div>

              <div className="overflow-auto max-h-60 rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-[11px] divide-y divide-slate-200 dark:divide-slate-800">
                  <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                    <tr>
                      <th className="py-2 px-3 whitespace-nowrap">#</th>
                      <th className="py-2 px-3 whitespace-nowrap">Nama</th>
                      <th className="py-2 px-3 whitespace-nowrap">Email</th>
                      <th className="py-2 px-3 whitespace-nowrap">Departemen</th>
                      <th className="py-2 px-3 whitespace-nowrap">Cabang</th>
                      <th className="py-2 px-3 whitespace-nowrap">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                    {parsedRows.slice(0, 5).map((row, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-mono text-slate-400 whitespace-nowrap">{idx + 1}</td>
                        <td className="py-2 px-3 font-semibold whitespace-nowrap">{row['Nama Lengkap'] || row.Nama || row.name}</td>
                        <td className="py-2 px-3 whitespace-nowrap">{row.Email || row.email}</td>
                        <td className="py-2 px-3 whitespace-nowrap">{row.Departemen || row.department || '-'}</td>
                        <td className="py-2 px-3 whitespace-nowrap">{row.Cabang || row.branch || 'HQ (Default)'}</td>
                        <td className="py-2 px-3 whitespace-nowrap">{row.Role || row.role || 'employee'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Results Banner */}
          {importResult && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold">
                  {importResult.importedCount} dari {importResult.total} karyawan berhasil diimpor!
                </span>
              </div>

              {importResult.errors?.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <span className="font-bold block">
                    {t('import_error_banner', { count: importResult.errors.length })}
                  </span>
                  <ul className="list-disc list-inside text-[11px] space-y-0.5 text-amber-800 dark:text-amber-300">
                    {importResult.errors.map((err, i) => (
                      <li key={i}>
                        Baris {err.row} ({err.email || err.name}): {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="py-2 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {t('modal_cancel')}
          </button>
          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={parsedRows.length === 0 || isSubmitting}
            className="py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Users className="w-4 h-4" />
            )}
            <span>
              {isSubmitting ? 'Memproses...' : `${t('btn_process_import')} (${parsedRows.length})`}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
}
