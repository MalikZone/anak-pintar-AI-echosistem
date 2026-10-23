/**
 * Enterprise Standard ID Generator for Hadirin SaaS Platform
 * 
 * Standards:
 * - Tenant ID: TNT-{CODE}-{6_DIGIT_UNIQUE_NUMBER} e.g. TNT-LOGISTIK-849201
 * - User ID:   USR-{TENANT_CODE}-{6_DIGIT_UNIQUE_NUMBER} e.g. USR-LOGISTIK-749102, USR-ROOT-000001
 */

export function generateTenantId(code = 'TNT') {
  const cleanCode = String(code)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8) || 'TNT';

  const uniqueNum = Math.floor(100000 + Math.random() * 900000);
  return `TNT-${cleanCode}-${uniqueNum}`;
}

export function generateUserId(tenantCode = 'STAFF', isRoot = false) {
  if (isRoot) {
    return 'USR-ROOT-000001';
  }

  const cleanCode = String(tenantCode)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8) || 'STAFF';

  const uniqueNum = Math.floor(100000 + Math.random() * 900000);
  return `USR-${cleanCode}-${uniqueNum}`;
}

export function extractTenantCode(name = '', existingCodes = []) {
  if (!name || typeof name !== 'string') return 'TNT';

  const taken = new Set(
    (Array.isArray(existingCodes) ? existingCodes : Array.from(existingCodes || []))
      .map((c) => String(c).trim().toUpperCase())
      .filter(Boolean)
  );

  // 1. Strip corporate legal entity prefixes and suffixes
  const stripped = name
    .replace(/\b(pt|cv|ud|tbk|ltd|inc|corp|corporation|persero|yayasan|koperasi|firma|nv|perum)\b\.?/gi, ' ')
    .trim();

  // 2. Clean words
  const words = stripped
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim().toUpperCase())
    .filter(Boolean);

  if (words.length === 0) {
    const rawFallback = name.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);
    return rawFallback && !taken.has(rawFallback) ? rawFallback : 'TNT';
  }

  const candidates = [];

  if (words.length === 1) {
    const w1 = words[0];
    candidates.push(w1.slice(0, 8));
    candidates.push(w1.slice(0, 6) + '01');
  } else if (words.length === 2) {
    const [w1, w2] = words;
    // Blend: 3 from w1 + up to 5 from w2 (e.g. NEG + AWAN -> NEGAWAN, NEG + SYAM -> NEGSYAM)
    const blend1 = (w1.slice(0, 3) + w2.slice(0, 5)).slice(0, 8);
    candidates.push(blend1);

    // Blend: 4 from w1 + 4 from w2 (e.g. NEGE + AWAN -> NEGEAWAN)
    const blend2 = (w1.slice(0, 4) + w2.slice(0, 4)).slice(0, 8);
    if (!candidates.includes(blend2)) candidates.push(blend2);

    // W1 + initial of W2 (e.g. NEGERI + A -> NEGERIA)
    const blend3 = (w1.slice(0, 7) + w2.slice(0, 1)).slice(0, 8);
    if (!candidates.includes(blend3)) candidates.push(blend3);

    // Full W1 (e.g. NEGERI)
    const w1Only = w1.slice(0, 8);
    if (!candidates.includes(w1Only)) candidates.push(w1Only);

    // Acronym if >= 3 chars
    const acronym = (w1[0] + w2[0]).slice(0, 8);
    if (acronym.length >= 3 && !candidates.includes(acronym)) candidates.push(acronym);
  } else {
    // 3 or more words
    // Acronym (e.g. BCA, NAS, SML)
    const acronym = words.map((w) => w[0]).join('').slice(0, 8);
    if (acronym.length >= 3) {
      candidates.push(acronym);
    }

    // Blend: 3 from w1 + 2 from w2 + 3 from w3 (e.g. NEGAWSEN)
    const w1 = words[0];
    const w2 = words[1];
    const w3 = words[2];
    const blendMulti = (w1.slice(0, 3) + w2.slice(0, 2) + w3.slice(0, 3)).slice(0, 8);
    if (!candidates.includes(blendMulti)) candidates.push(blendMulti);

    // 2-word blend fallback
    const blend2 = (w1.slice(0, 3) + w2.slice(0, 5)).slice(0, 8);
    if (!candidates.includes(blend2)) candidates.push(blend2);
  }

  // Find first candidate not in taken
  for (const c of candidates) {
    const clean = c.replace(/[^A-Z0-9]/g, '').slice(0, 8);
    if (clean.length >= 3 && !taken.has(clean)) {
      return clean;
    }
  }

  // Disambiguation if all natural candidates taken:
  const base = (candidates[0] || 'TNT').slice(0, 6);
  for (let i = 1; i <= 99; i++) {
    const numStr = String(i).padStart(2, '0');
    const suffixed = (base.slice(0, 8 - numStr.length) + numStr).slice(0, 8);
    if (!taken.has(suffixed)) {
      return suffixed;
    }
  }

  return ('TNT' + Math.floor(100 + Math.random() * 900)).slice(0, 8);
}

export function generateShiftId(tenantCode = 'GEN', shiftCode = 'S1') {
  const cleanTenant = String(tenantCode).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'GEN';
  const cleanShift = String(shiftCode).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'S1';
  return `SHIFT-${cleanTenant}-${cleanShift}`;
}

export function generateRosterId(tenantCode = 'GEN') {
  const cleanTenant = String(tenantCode).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'GEN';
  const uniqueNum = Math.floor(100000 + Math.random() * 900000);
  return `RST-${cleanTenant}-${uniqueNum}`;
}

export function generateSwitchId(tenantCode = 'GEN') {
  const cleanTenant = String(tenantCode).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'GEN';
  const uniqueNum = Math.floor(100000 + Math.random() * 900000);
  return `SWT-${cleanTenant}-${uniqueNum}`;
}

export function generateRoleId(tenantCode = 'GEN', roleCode = 'ROLE') {
  const cleanTenant = String(tenantCode).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'GEN';
  const cleanRole = String(roleCode).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16) || 'ROLE';
  return `ROL-${cleanTenant}-${cleanRole}`;
}

export function generatePermissionId(module = 'MOD', action = 'ACT') {
  const cleanMod = String(module).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16) || 'MOD';
  const cleanAct = String(action).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16) || 'ACT';
  return `PRM-${cleanMod}-${cleanAct}`;
}

export function generateDepartmentId(tenantCode = 'GEN', deptCode = 'DPT') {
  const cleanTenant = String(tenantCode).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'GEN';
  const cleanDept = String(deptCode).toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 16) || 'DPT';
  return `DPT-${cleanTenant}-${cleanDept}`;
}

export function generatePositionId(tenantCode = 'GEN', posCode = 'POS') {
  const cleanTenant = String(tenantCode).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'GEN';
  const cleanPos = String(posCode).toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 16) || 'POS';
  return `POS-${cleanTenant}-${cleanPos}`;
}

export function generateLocationId(tenantCode = 'GEN', locCode = 'LOC') {
  const cleanTenant = String(tenantCode).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'GEN';
  const cleanLoc = String(locCode).toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 16) || 'LOC';
  return `LOC-${cleanTenant}-${cleanLoc}`;
}

export function generateHolidayId(scope = 'GLOBAL', year = '2026', code = 'HLD') {
  const cleanScope = String(scope).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'GLOBAL';
  const cleanYear = String(year).replace(/[^0-9]/g, '').slice(0, 4) || '2026';
  const cleanCode = String(code).toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 16) || 'HLD';
  return `HLD-${cleanScope}-${cleanYear}-${cleanCode}`;
}

export function generateLeaveTypeId(tenantCode = 'GEN', code = 'LVT') {
  const cleanTenant = String(tenantCode).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'GEN';
  const cleanCode = String(code).toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 16) || 'LVT';
  return `LVT-${cleanTenant}-${cleanCode}`;
}

export default {
  generateTenantId,
  generateUserId,
  generateShiftId,
  generateRosterId,
  generateSwitchId,
  generateRoleId,
  generatePermissionId,
  generateDepartmentId,
  generatePositionId,
  generateLocationId,
  generateHolidayId,
  generateLeaveTypeId,
  extractTenantCode,
};

