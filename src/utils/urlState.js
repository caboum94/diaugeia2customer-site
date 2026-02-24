export function readString(params, key, fallback = '') {
  return params.get(key) || fallback;
}

export function readNumber(params, key, fallback = 0) {
  const raw = params.get(key);
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function readCpvSelectionJson(params) {
  const raw = params.get('cpv');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    try {
      const parsed = JSON.parse(decodeURIComponent(raw));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}

export function writeBrowseStateToParams(state) {
  const next = new URLSearchParams();

  if (state.search) next.set('q', state.search);
  if (state.awardMode !== 'all') next.set('award', state.awardMode);
  if (state.kind !== 'all') next.set('kind', state.kind);
  if (state.location) next.set('loc', state.location);
  if (state.amountMin) next.set('min', state.amountMin);
  if (state.amountMax) next.set('max', state.amountMax);
  if (state.cpvOptionLevel) next.set('cpvLevel', String(state.cpvOptionLevel));

  const hasAnyCpv = (state.cpvSelections || []).some((lvl) => Array.isArray(lvl) && lvl.length > 0);
  if (hasAnyCpv) {
    next.set('cpv', JSON.stringify(state.cpvSelections));
  }

  return next;
}
