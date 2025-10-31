import {
  normalizeNumberFR,
  normalizePercentFR,
  normalizeDateFR,
  checkTotals,
  scoreConfidence,
} from './normalize';
import { R } from './regexFR';
import { readPdfWithCoords, TextItem } from './pdf.textcoords';
import { renderPdfToCanvasArray } from './pdf.render';
import { ocrCanvasesToText } from './ocr.local';
import { parseCSV, parseXLSX, inferTotals } from './table.detect';
import { Cand, choose } from './vote';

type Fields = {
  ht?: number | null;
  tvaPct?: number | null;
  tvaAmt?: number | null;
  ttc?: number | null;
  net?: number | null;
  siret?: string | null;
  numFacture?: string | null;
  dateDoc?: string | null;
  aoDeadline?: string | null;
  aoBudget?: number | null;
  aoRef?: string | null;
  aoOrga?: string | null;
  aoCP?: string | null;
  aoVille?: string | null;
};

export type ExtractResult = {
  text: string;
  fields: Fields;
  confidence: number;
  textPages: string[];
  debug: any;
};

export async function extractAuto(file: File, entrepriseId?: string): Promise<ExtractResult> {
  const name = file.name.toLowerCase();
  const candidates: Record<string, Cand<any>[]> = {};
  let text = '';
  let textPages: string[] = [];

  function pushCandidate(
    key: string,
    value: any,
    score = 0.6,
    source: 'regex' | 'layout' | 'template' = 'regex'
  ) {
    if (value == null) return;
    (candidates[key] ||= []).push({ value, score, source });
  }

  // 1) CSV/XLSX → total agrégé
  if (name.endsWith('.csv')) {
    const rows = await parseCSV(file);
    const { ttc } = inferTotals(rows);
    pushCandidate('ttc', ttc, 0.8, 'layout');
    text = JSON.stringify(rows);
    textPages = [text];
  } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const rows = await parseXLSX(file);
    const { ttc } = inferTotals(rows);
    pushCandidate('ttc', ttc, 0.8, 'layout');
    text = JSON.stringify(rows);
    textPages = [text];
  } else if (name.endsWith('.pdf')) {
    // 2) PDF texte + coords (layout-aware)
    try {
      const { pages } = await readPdfWithCoords(file);
      textPages = pages.map((items) => items.map((i) => i.str).join(' '));
      text = textPages.join('\n');

      // Mapping layout: labels → valeurs
      for (const items of pages) {
        const lines = groupByLine(items);
        for (const line of lines) {
          const lineText = line.map((i) => i.str).join(' ').toLowerCase();
          detectLayoutPairs(lineText, line, lines, pushCandidate);
        }
      }
    } catch (err) {
      console.warn('[DocAI] PDF text extraction failed, fallback to OCR:', err);
      // 3) Fallback OCR si pas de couche texte
      const canvases = await renderPdfToCanvasArray(file, 300);
      textPages = await ocrCanvasesToText(canvases);
      text = textPages.join('\n');
    }
  } else {
    // 4) Image → OCR
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const canvas = document.createElement('canvas');
    const scale = Math.max(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight));
    canvas.width = img.naturalWidth * scale;
    canvas.height = img.naturalHeight * scale;
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);

    textPages = await ocrCanvasesToText([canvas]);
    text = textPages.join('\n');
  }

  // 5) Regex globales
  const hasEuro = R.EUR.test(text);

  const matchHT = R.HT.exec(text)?.[1];
  if (matchHT) pushCandidate('ht', normalizeNumberFR(matchHT));

  const matchTTC = R.TTC.exec(text)?.[1];
  if (matchTTC) pushCandidate('ttc', normalizeNumberFR(matchTTC));

  const matchNET = R.NET.exec(text)?.[2];
  if (matchNET) pushCandidate('net', normalizeNumberFR(matchNET));

  const matchTVAPct = R.TVA_PCT.exec(text)?.[1];
  if (matchTVAPct) pushCandidate('tvaPct', normalizePercentFR(matchTVAPct));

  const matchTVAAmt = R.TVA_AMT.exec(text)?.[1];
  if (matchTVAAmt) pushCandidate('tvaAmt', normalizeNumberFR(matchTVAAmt));

  const matchNumFact = R.NUM_FACT.exec(text)?.[2];
  if (matchNumFact) pushCandidate('numFacture', matchNumFact, 0.7);

  const siretMatch = (text.match(R.SIRET) || [])[0];
  if (siretMatch) pushCandidate('siret', siretMatch, 0.8);

  // AO
  const matchDeadline = R.AO_DEADLINE.exec(text)?.[2];
  if (matchDeadline) pushCandidate('aoDeadline', normalizeDateFR(matchDeadline), 0.8, 'regex');

  const matchBudget = R.AO_BUDGET.exec(text)?.[2];
  if (matchBudget) pushCandidate('aoBudget', normalizeNumberFR(matchBudget), 0.7, 'regex');

  const matchRef = R.AO_REF.exec(text)?.[2];
  if (matchRef) pushCandidate('aoRef', matchRef, 0.6);

  const matchOrga = R.AO_ORGA.exec(text)?.[2];
  if (matchOrga) pushCandidate('aoOrga', matchOrga?.trim(), 0.6);

  const matchCPs = [...text.matchAll(R.AO_CP)].map((m) => m[0]);
  if (matchCPs[0]) pushCandidate('aoCP', matchCPs[0], 0.7);

  // 6) Choix final (vote)
  const fields: Fields = {
    ht: pickBest('ht'),
    tvaPct: pickBest('tvaPct'),
    tvaAmt: pickBest('tvaAmt'),
    ttc: pickBest('ttc'),
    net: pickBest('net'),
    siret: pickBest('siret'),
    numFacture: pickBest('numFacture'),
    dateDoc: extractFirstDate(text),
    aoDeadline: pickBest('aoDeadline'),
    aoBudget: pickBest('aoBudget'),
    aoRef: pickBest('aoRef'),
    aoOrga: pickBest('aoOrga'),
    aoCP: pickBest('aoCP'),
    aoVille: inferVille(text, pickBest('aoCP')),
  };

  // Sanity: borner TVA %
  if (fields.tvaPct != null) {
    fields.tvaPct = Math.max(0, Math.min(100, fields.tvaPct));
  }

  const totalsOk = checkTotals(
    fields.ht ?? null,
    fields.tvaPct ?? null,
    fields.tvaAmt ?? null,
    fields.net ?? fields.ttc ?? null
  );

  const confidence = scoreConfidence(0.5, {
    totalsOk,
    hasSiret: !!fields.siret,
    hasDate: !!(fields.dateDoc || fields.aoDeadline),
    hasEuro,
  });

  return {
    text,
    textPages,
    fields,
    confidence,
    debug: { candidates, totalsOk, hasEuro },
  };

  function pickBest(key: string) {
    const cands = candidates[key];
    const chosen = choose(cands);
    return chosen?.value ?? null;
  }

  function extractFirstDate(txt: string): string | null {
    const dateMatch = [...txt.matchAll(R.DATE)].map((m) => m[1])[0] ?? null;
    return normalizeDateFR(dateMatch);
  }

  function inferVille(txt: string, cp?: string | null): string | null {
    if (!cp) return null;
    const idx = txt.indexOf(cp);
    const slice = txt.slice(Math.max(0, idx - 40), idx);
    return (
      slice
        .trim()
        .split(/\s+/)
        .slice(-2)
        .join(' ')
        .replace(/[^\p{L}\-]/gu, '')
        .toUpperCase() || null
    );
  }
}

function groupByLine(items: TextItem[]): TextItem[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: any[] = [];
  const tolerance = 2;

  for (const item of sorted) {
    const existingLine = lines.find((line) => Math.abs(line._y - item.y) < tolerance);
    if (existingLine) {
      existingLine.push(item);
      existingLine._y = (existingLine._y + item.y) / 2;
    } else {
      const newLine: any = [item];
      newLine._y = item.y;
      lines.push(newLine);
    }
  }

  return lines;
}

function detectLayoutPairs(
  lineText: string,
  line: TextItem[],
  lines: TextItem[][],
  pushFn: (key: string, value: any, score?: number, source?: any) => void
) {
  const rightX = line[line.length - 1].x + line[line.length - 1].w;
  const sameLine = line.filter((i) => i.x > rightX - 5).map((i) => i.str).join(' ');
  
  const nextIdx = lines.indexOf(line) + 1;
  const nextLine = nextIdx >= 0 && nextIdx < lines.length 
    ? lines[nextIdx].map((i) => i.str).join(' ') 
    : '';

  const getNum = (s: string) => normalizeNumberFR(s?.replace('€', ''));
  const getPct = (s: string) => normalizePercentFR(s);

  // HT
  if (/\b(total|montant|sous[\s\-]?total)\s*(h\.?t\.?|hors\s*taxes)\b/i.test(lineText)) {
    const value = getNum(sameLine) ?? getNum(nextLine);
    if (value != null) pushFn('ht', value, 0.85, 'layout');
  }

  // TVA
  if (/^tva\b/i.test(lineText) || /\btva\b/i.test(lineText)) {
    const pctMatch = sameLine.match(/\d{1,2}[\.,]?\d{0,2}\s*%/i)?.[0] 
      ?? nextLine.match(/\d{1,2}[\.,]?\d{0,2}\s*%/i)?.[0];
    const amtMatch = sameLine.match(/([0-9\s\.,]+)\s*€/)?.[1] 
      ?? nextLine.match(/([0-9\s\.,]+)\s*€/)?.[1];
    
    if (pctMatch) {
      const pct = getPct(pctMatch);
      if (pct != null) pushFn('tvaPct', pct, 0.85, 'layout');
    }
    if (amtMatch) {
      const amt = getNum(amtMatch);
      if (amt != null) pushFn('tvaAmt', amt, 0.8, 'layout');
    }
  }

  // TTC
  if (/(total\s*t\.?t\.?c\.?|toutes?\s*taxes\s*comprises?)/i.test(lineText)) {
    const value = getNum(sameLine) ?? getNum(nextLine);
    if (value != null) pushFn('ttc', value, 0.85, 'layout');
  }

  // Net à payer
  if (/net\s*(?:à|a)\s*payer/i.test(lineText)) {
    const value = getNum(sameLine) ?? getNum(nextLine);
    if (value != null) pushFn('net', value, 0.9, 'layout');
  }

  // N° facture
  if (/(n[°o]|numéro)\s*facture/i.test(lineText)) {
    const num = (sameLine.match(/[A-Z0-9\-\/]{4,}/i)?.[0] 
      ?? nextLine.match(/[A-Z0-9\-\/]{4,}/i)?.[0])?.trim();
    if (num) pushFn('numFacture', num, 0.8, 'layout');
  }

  // SIRET
  if (/\bsiret\b/i.test(lineText)) {
    const num = sameLine.match(/\b\d{3}\s?\d{3}\s?\d{3}\s?\d{5}\b/)?.[0] 
      ?? nextLine.match(/\b\d{3}\s?\d{3}\s?\d{3}\s?\d{5}\b/)?.[0];
    if (num) pushFn('siret', num, 0.9, 'layout');
  }

  // AO: Date limite
  if (/date\s*limite|date\s*de\s*remise|dépôt\s*des\s*offres/i.test(lineText)) {
    const dateMatch = sameLine.match(/[0-3]?\d[\/\-\.][01]?\d[\/\-\.]\d{2,4}/)?.[0] 
      ?? nextLine.match(/[0-3]?\d[\/\-\.][01]?\d[\/\-\.]\d{2,4}/)?.[0];
    const iso = normalizeDateFR(dateMatch);
    if (iso) pushFn('aoDeadline', iso, 0.85, 'layout');
  }

  // AO: Organisme
  if (/organisme|acheteur|maître\s*d['']ouvrage|pouvoir\s*adjudicateur/i.test(lineText)) {
    const value = sameLine.trim() || nextLine.trim();
    if (value) pushFn('aoOrga', value, 0.7, 'layout');
  }

  // AO: Référence
  if (/réf\.|référence/i.test(lineText)) {
    const num = sameLine.match(/[A-Z0-9\-\/]{4,}/i)?.[0] 
      ?? nextLine.match(/[A-Z0-9\-\/]{4,}/i)?.[0];
    if (num) pushFn('aoRef', num, 0.7, 'layout');
  }

  // AO: Budget
  if (/montant|budget/i.test(lineText) && /estim[ée]/i.test(lineText)) {
    const valueMatch = sameLine.match(/([0-9\s\.,]+)\s*€/)?.[1] 
      ?? nextLine.match(/([0-9\s\.,]+)\s*€/)?.[1];
    const num = getNum(valueMatch || '');
    if (num != null) pushFn('aoBudget', num, 0.8, 'layout');
  }
}
