/**
 * Dapatkan bahasa aktif ('id' | 'en') dari localStorage
 */
export function getActiveLanguage() {
  try {
    return localStorage.getItem('hadirin_lang') || 'id';
  } catch {
    return 'id';
  }
}

/**
 * Helper menerjemahkan nama hari atau tanggal ke nama hari sesuai bahasa aktif ('id' | 'en')
 * @param {string|number|Date} input - indeks (0-6), string tanggal ("2026-09-28"), atau nama hari ("Senin" / "Monday")
 * @param {string} lang - 'id' | 'en' (default: getActiveLanguage())
 * @returns {string} Contoh: "Senin" atau "Monday"
 */
export function getDayName(input, lang = null) {
  const currentLang = lang || getActiveLanguage();
  const dayMapEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayMapId = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  if (typeof input === 'number') {
    const idx = Math.max(0, Math.min(6, input));
    return currentLang === 'en' ? dayMapEn[idx] : dayMapId[idx];
  }

  if (!input) return '';

  const nameMap = {
    minggu: 0, sunday: 0,
    senin: 1, monday: 1,
    selasa: 2, tuesday: 2,
    rabu: 3, wednesday: 3,
    kamis: 4, thursday: 4,
    jumat: 5, friday: 5,
    sabtu: 6, saturday: 6,
  };
  const lower = String(input).trim().toLowerCase();
  if (nameMap[lower] !== undefined) {
    const idx = nameMap[lower];
    return currentLang === 'en' ? dayMapEn[idx] : dayMapId[idx];
  }

  const d = new Date(input);
  if (!isNaN(d.getTime())) {
    const idx = d.getDay();
    return currentLang === 'en' ? dayMapEn[idx] : dayMapId[idx];
  }

  return String(input);
}

/**
 * Helper menerjemahkan singkatan hari (Min/Sun, Sen/Mon, dll.)
 */
export function getShortDayName(input, lang = null) {
  const currentLang = lang || getActiveLanguage();
  const shortMapEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const shortMapId = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  if (typeof input === 'number') {
    const idx = Math.max(0, Math.min(6, input));
    return currentLang === 'en' ? shortMapEn[idx] : shortMapId[idx];
  }

  if (!input) return '';

  const nameMap = {
    minggu: 0, sunday: 0, min: 0, sun: 0,
    senin: 1, monday: 1, sen: 1, mon: 1,
    selasa: 2, tuesday: 2, sel: 2, tue: 2,
    rabu: 3, wednesday: 3, rab: 3, wed: 3,
    kamis: 4, thursday: 4, kam: 4, thu: 4,
    jumat: 5, friday: 5, jum: 5, fri: 5,
    sabtu: 6, saturday: 6, sab: 6, sat: 6,
  };
  const lower = String(input).trim().toLowerCase();
  if (nameMap[lower] !== undefined) {
    const idx = nameMap[lower];
    return currentLang === 'en' ? shortMapEn[idx] : shortMapId[idx];
  }

  const d = new Date(input);
  if (!isNaN(d.getTime())) {
    const idx = d.getDay();
    return currentLang === 'en' ? shortMapEn[idx] : shortMapId[idx];
  }

  return String(input);
}

/**
 * Format detik ke format Jam:Menit:Detik (HH:MM:SS)
 * @param {number} totalSeconds 
 * @returns {string} Contoh: "04:15:30"
 */
export function formatHMS(totalSeconds) {
  if (!totalSeconds || isNaN(totalSeconds)) return '00:00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Format objek Date ke string waktu Indonesia (HH:MM:SS)
 * @param {Date} date 
 * @returns {string} Contoh: "08:30:15"
 */
export function formatTimeID(date = new Date()) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Format objek Date ke tanggal panjang (responsif terhadap bahasa aktif)
 * @param {Date|string} date 
 * @param {boolean} withDayName 
 * @param {string} locale
 * @returns {string} Contoh: "Kamis, 17 September 2026" atau "Thursday, September 17, 2026"
 */
export function formatDateID(date = new Date(), withDayName = true, locale = null) {
  const currentLocale = locale || (getActiveLanguage() === 'en' ? 'en-US' : 'id-ID');
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString(currentLocale, {
    weekday: withDayName ? 'long' : undefined,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format tanggal pendek untuk badge atau tabel (responsif terhadap bahasa aktif)
 * @param {Date|string} date 
 * @param {string} locale
 * @returns {string} Contoh: "Kam, 17 Sep 2026" atau "Thu, Sep 17, 2026"
 */
export function formatShortDateID(date = new Date(), locale = null) {
  const currentLocale = locale || (getActiveLanguage() === 'en' ? 'en-US' : 'id-ID');
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString(currentLocale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format tanggal eksplisit dengan pilihan bahasa ('id' | 'en')
 */
export function formatDateLocale(date = new Date(), lang = 'id', withDayName = true) {
  const locale = lang === 'en' ? 'en-US' : 'id-ID';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString(locale, {
    weekday: withDayName ? 'long' : undefined,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Hitung selisih hari antara dua tanggal inklusif
 * @param {string} startDateStr - YYYY-MM-DD
 * @param {string} endDateStr - YYYY-MM-DD
 * @returns {number}
 */
export function calculateDayDifference(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return 1;
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const diffTime = end - start;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > 0 ? diffDays : 1;
}

/**
 * Format tanggal singkat eksplisit dengan pilihan bahasa ('id' | 'en')
 * Contoh: "25 Sep 2026" (id) / "Sep 25, 2026" (en)
 */
export function formatShortDateLocale(date = new Date(), lang = 'id') {
  const locale = lang === 'en' ? 'en-US' : 'id-ID';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}



