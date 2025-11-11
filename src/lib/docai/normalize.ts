export function normalizeNumberFR(raw?: string | null): number | null {
  if (!raw) return null;
  
  const original = String(raw).trim();
  
  // ✅ Stratégie de normalisation améliorée pour format français
  let s = original
    .replace(/€/g, '')
    .replace(/[\n\r\t]/g, '') // Supprimer sauts de ligne et tabs
    .trim();
  
  // Détecter le format : virgule = décimale française, espaces/points = séparateurs milliers
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  
  if (hasComma && hasDot) {
    // Format mixte : "1.234,56" → virgule = décimale, point = milliers
    s = s.replace(/\./g, '').replace(/,/, '.');
  } else if (hasComma) {
    // Format français : "4 800,00" ou "4800,00"
    // Supprimer tous les espaces (milliers), virgule → point (décimale)
    s = s.replace(/[\s\u00A0\u202F\u2009]/g, '').replace(/,/, '.');
  } else if (hasDot) {
    // Format avec points : peut être milliers ou décimale
    const parts = s.split('.');
    if (parts.length === 2 && parts[1].length <= 2) {
      // "4800.00" → point = décimale
      s = s.replace(/[\s\u00A0\u202F\u2009]/g, '');
    } else {
      // "4.800" → point = milliers
      s = s.replace(/[\s\u00A0\u202F\u2009]/g, '').replace(/\./g, '');
    }
  } else {
    // Pas de séparateur décimal : "4 800" ou "4800"
    s = s.replace(/[\s\u00A0\u202F\u2009]/g, '');
  }
  
  // Garder chiffres, signe, point
  s = s.replace(/[^0-9\.\-]/g, '');
  if (!s || s === '-' || s === '.' || s === '-.') return null;
  
  let n = Number(s);
  if (!Number.isFinite(n)) return null;
  
  // Heuristique OCR : si nombre > 100000 sans séparateur décimal dans l'original, diviser par 100
  if (!original.includes(',') && !original.includes('.') && n > 100000) {
    const candidate = n / 100;
    console.warn(`[normalizeNumberFR] Nombre suspect sans séparateur: "${original}" → ${n}, correction: ${candidate}`);
    n = candidate;
  }
  
  // Bornes sûres
  if (Math.abs(n) > 999999999999.99) return null;
  
  return Math.round(n * 100) / 100;
}

export function normalizePercentFR(raw?: string | null): number | null {
  const n = normalizeNumberFR(raw);
  if (n == null) return null;
  
  // Si < 1, considérer que c'était un ratio → ramener en %
  const pct = n < 1 ? n * 100 : n;
  
  return Math.max(0, Math.min(100, Math.round(pct * 100) / 100));
}

export function normalizeDateFR(raw?: string | null): string | null {
  if (!raw) return null;
  
  const s = String(raw).trim();
  const m = s.match(/([0-3]?\d)[\/\-\. ]([01]?\d)[\/\-\. ](\d{2,4})/);
  
  if (m) {
    const d = m[1].padStart(2, '0');
    const mo = m[2].padStart(2, '0');
    let y = m[3];
    
    if (y.length === 2) {
      y = (Number(y) >= 80 ? '19' + y : '20' + y);
    }
    
    return `${y}-${mo}-${d}`;
  }
  
  return null;
}

export function checkTotals(
  ht?: number | null,
  tvaPct?: number | null,
  tvaAmt?: number | null,
  ttc?: number | null
): boolean {
  if (ht != null && ttc != null) {
    if (tvaPct != null) {
      const expected = ht * (1 + tvaPct / 100);
      return Math.abs((ttc - expected) / Math.max(1, expected)) <= 0.02;
    }
    if (tvaAmt != null) {
      const expected = ht + tvaAmt;
      return Math.abs((ttc - expected) / Math.max(1, expected)) <= 0.02;
    }
  }
  return false;
}

export function scoreConfidence(
  base: number,
  flags: {
    totalsOk?: boolean;
    hasSiret?: boolean;
    hasDate?: boolean;
    hasEuro?: boolean;
  }
): number {
  let s = base;
  if (flags.totalsOk) s += 0.25;
  if (flags.hasSiret) s += 0.10;
  if (flags.hasDate) s += 0.05;
  if (flags.hasEuro) s += 0.05;
  return Math.max(0, Math.min(1, s));
}
