export const KIND_LABELS = {
  request: 'Αίτημα',
  notice: 'Προκήρυξη',
  auction: 'Διαγωνισμός',
  contract: 'Σύμβαση',
  payment: 'Πληρωμή',
};

export const PAGE_SIZE = 200;
export const CPV_LEVELS = [2, 3, 4, 5, 8];

function normalizeText(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function classifyAwardMode(record) {
  const p = normalizeText(record.procedureType || '');
  if (!p) return 'unknown';

  const directWord = '\u03b1\u03c0\u03b5\u03c5\u03b8\u03b5\u03b9\u03b1\u03c2';
  const assignWord = '\u03b1\u03bd\u03b1\u03b8\u03b5\u03c3';
  const isDirect = (p.includes(directWord) && p.includes(assignWord)) || p.includes('direct award');
  if (isDirect) return 'direct';

  return 'competition';
}

export function parseAmountInput(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const normalized = raw.replace(/\./g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function formatAmount(v) {
  return Number(v || 0).toLocaleString('el-GR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function levelIndex(level) {
  return CPV_LEVELS.indexOf(Number(level || 0));
}

export function recordMatchesCpvNode(record, node) {
  if (!node) return true;
  if (!Array.isArray(record.cpvs) || record.cpvs.length === 0) return false;

  const code = String(node.code || '');
  const level = Number(node.level || 0);

  if (level === 2) return record.cpvs.some((c) => (c.cpv_division || '') === code);
  if (level === 3) return record.cpvs.some((c) => (c.cpv_group || '') === code);
  if (level === 4) return record.cpvs.some((c) => (c.cpv_class || '') === code);
  if (level === 5) return record.cpvs.some((c) => (c.cpv_category || '') === code);
  if (level === 8) return record.cpvs.some((c) => String(c.cpv_item || '').startsWith(code));
  return false;
}

