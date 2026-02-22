const state = {
  records: [],
  nodes: [],
  filtered: [],
  visibleCount: 200,
  locations: [],
  cpvSelections: [],
  cpvNodesByCode: new Map(),
  cpvChildrenByParent: new Map(),
};

const KIND_LABELS = {
  request: 'Αίτημα',
  notice: 'Προκήρυξη',
  auction: 'Διαγωνισμός',
  contract: 'Σύμβαση',
  payment: 'Πληρωμή',
};

const PAGE_SIZE = 200;
const CPV_LEVELS = [2, 3, 4, 5, 8];

const els = {
  search: document.getElementById('search'),
  awardMode: document.getElementById('awardMode'),
  kind: document.getElementById('kind'),
  location: document.getElementById('location'),
  amountMin: document.getElementById('amountMin'),
  amountMax: document.getElementById('amountMax'),
  cpvCode: document.getElementById('cpvCode'),
  cpvTop: document.getElementById('cpvTop'),
  cpvUp: document.getElementById('cpvUp'),
  cpvPath: document.getElementById('cpvPath'),
  list: document.getElementById('list'),
  meta: document.getElementById('meta'),
  moreWrap: document.getElementById('moreWrap'),
};

function normalizeText(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function classifyAwardMode(r) {
  const p = normalizeText(r.procedureType || '');
  if (!p) return 'unknown';

  const directWord = '\u03b1\u03c0\u03b5\u03c5\u03b8\u03b5\u03b9\u03b1\u03c2';
  const assignWord = '\u03b1\u03bd\u03b1\u03b8\u03b5\u03c3';
  const isDirect = (p.includes(directWord) && p.includes(assignWord)) || p.includes('direct award');
  if (isDirect) return 'direct';

  return 'competition';
}

function buildCpvTree() {
  state.cpvNodesByCode.clear();
  state.cpvChildrenByParent.clear();

  for (const n of state.nodes) {
    const code = String(n.code || '').trim();
    if (!code) continue;
    state.cpvNodesByCode.set(code, n);

    const parent = String(n.parent_code || '').trim();
    if (!state.cpvChildrenByParent.has(parent)) {
      state.cpvChildrenByParent.set(parent, []);
    }
    state.cpvChildrenByParent.get(parent).push(n);
  }

  for (const [parent, children] of state.cpvChildrenByParent.entries()) {
    children.sort((a, b) => String(a.code).localeCompare(String(b.code)));
    state.cpvChildrenByParent.set(parent, children);
  }
}

function nextLevel(currentLevel) {
  if (currentLevel === 2) return 3;
  if (currentLevel === 3) return 4;
  if (currentLevel === 4) return 5;
  if (currentLevel === 5) return 8;
  return null;
}

function levelIndex(level) {
  return CPV_LEVELS.indexOf(Number(level || 0));
}

function trimCpvSelections() {
  while (state.cpvSelections.length > 0) {
    const tail = state.cpvSelections[state.cpvSelections.length - 1];
    if (Array.isArray(tail) && tail.length > 0) break;
    state.cpvSelections.pop();
  }
}

function deepestSelectionIndex() {
  for (let i = state.cpvSelections.length - 1; i >= 0; i -= 1) {
    const arr = state.cpvSelections[i];
    if (Array.isArray(arr) && arr.length > 0) return i;
  }
  return -1;
}

function setSelectionForLevel(level, nodes) {
  const idx = levelIndex(level);
  if (idx < 0) return;
  state.cpvSelections[idx] = Array.isArray(nodes) ? nodes : [];
  state.cpvSelections.length = idx + 1;
  trimCpvSelections();
}

function activeCpvNodes() {
  const idx = deepestSelectionIndex();
  if (idx < 0) return [];
  return state.cpvSelections[idx] || [];
}

function renderCpvPath() {
  const parts = [];
  for (let i = 0; i < CPV_LEVELS.length; i += 1) {
    const selected = state.cpvSelections[i] || [];
    if (!selected.length) continue;
    const codes = selected.map(n => n.code).slice(0, 4);
    const extra = selected.length > 4 ? ` +${selected.length - 4}` : '';
    parts.push(`L${CPV_LEVELS[i]}: ${codes.join(', ')}${extra}`);
  }

  if (!parts.length) {
    els.cpvPath.textContent = 'CPV: Root';
    return;
  }
  els.cpvPath.textContent = `CPV: ${parts.join(' > ')}`;
}

function rebuildCpvOptions() {
  const deepestIdx = deepestSelectionIndex();
  const parentCodes = deepestIdx < 0
    ? ['']
    : (state.cpvSelections[deepestIdx] || []).map(n => String(n.code || '').trim()).filter(Boolean);
  const targetLevel = deepestIdx < 0 ? 2 : nextLevel(CPV_LEVELS[deepestIdx]);
  const targetIdx = levelIndex(targetLevel);

  const byCode = new Map();
  for (const parentCode of parentCodes) {
    const children = (state.cpvChildrenByParent.get(parentCode) || []).filter(n => Number(n.level) === targetLevel);
    for (const n of children) {
      byCode.set(String(n.code), n);
    }
  }
  const options = Array.from(byCode.values()).sort((a, b) => String(a.code).localeCompare(String(b.code)));
  const selectedCodes = new Set(((targetIdx >= 0 ? state.cpvSelections[targetIdx] : []) || []).map(n => String(n.code)));

  els.cpvCode.dataset.level = String(targetLevel || '');
  els.cpvCode.innerHTML = options.map(n => {
    const code = String(n.code || '');
    const sel = selectedCodes.has(code) ? ' selected' : '';
    return `<option value="${code}"${sel}>${code} - ${n.label || ''}</option>`;
  }).join('');
  els.cpvCode.size = Math.min(12, Math.max(6, options.length || 6));

  els.cpvUp.disabled = deepestIdx < 0;
  els.cpvTop.disabled = deepestIdx < 0;
  els.cpvCode.disabled = !targetLevel || options.length === 0;

  renderCpvPath();
}

function rebuildLocationOptions() {
  const labels = new Set();
  for (const r of state.records) {
    const label = (r.location && r.location.nuts_label ? String(r.location.nuts_label).trim() : '');
    if (label) labels.add(label);
  }
  state.locations = Array.from(labels).sort((a, b) => a.localeCompare(b, 'el'));
  els.location.innerHTML = '<option value="">Όλες οι τοποθεσίες (NUTS)</option>' + state.locations.map(x => `<option value="${x}">${x}</option>`).join('');
}

function formatAmount(v) {
  return Number(v || 0).toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseAmountInput(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const normalized = raw.replace(/\./g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function badgeHtml(r) {
  const b = String(r.badge || '').trim().toLowerCase();
  if (b === 'today') return '<span class="badge badge-today">today</span>';
  if (b === 'new') return '<span class="badge badge-new">new</span>';
  return '';
}

function cardHtml(r) {
  const stageLabel = KIND_LABELS[r.kind] || r.kind || '-';
  const mode = classifyAwardMode(r);
  const awardModeLabel = mode === 'direct' ? 'Απευθείας ανάθεση' : mode === 'competition' ? 'Διαγωνισμός' : 'Χωρίς κατηγορία';
  const cpvItems = Array.isArray(r.cpvs) ? r.cpvs.map(c => c.cpv_item).filter(Boolean) : [];
  const cpvText = cpvItems.length ? cpvItems.slice(0, 4).join(', ') : '-';

  const loc = r.location || {};
  const locParts = [loc.nuts_label || '', loc.city || '', loc.postal_code || ''].filter(Boolean);
  const locText = locParts.length ? locParts.join(' | ') : '-';

  const pdf = r.pdf_url
    ? `<a class="btnlink" href="${r.pdf_url}" target="_blank" rel="noopener noreferrer">Άνοιγμα PDF</a>`
    : '-';

  return `<article class="card">
    <div class="title">${r.title || '(χωρίς τίτλο)'}</div>
    <div class="line"><strong>Τύπος ανάθεσης:</strong> ${awardModeLabel} | <strong>Στάδιο:</strong> ${stageLabel} | <strong>Ημ/νία:</strong> ${r.date || '-'} ${badgeHtml(r)}</div>
    <div class="line"><strong>ΑΔΑΜ/Ref:</strong> ${r.referenceNumber || '-'} | <strong>Πρωτόκολλο:</strong> ${r.protocolNumber || '-'}</div>
    <div class="line"><strong>Φορέας:</strong> ${r.organization || '-'}</div>
    <div class="line"><strong>Τοποθεσία:</strong> ${locText}</div>
    <div class="line"><strong>Τύπος διαδικασίας:</strong> ${r.procedureType || '-'}</div>
    <div class="line"><strong>Τύπος σύμβασης:</strong> ${r.contractType || '-'}</div>
    <div class="line"><strong>Ποσό:</strong> ${formatAmount(r.amount_num)} ευρώ</div>
    <div class="line"><strong>CPV:</strong> ${cpvText}</div>
    <div class="line">${pdf}</div>
  </article>`;
}

function recordMatchesCpvNode(record, node) {
  if (!node) return true;
  if (!Array.isArray(record.cpvs) || record.cpvs.length === 0) return false;

  const code = String(node.code || '');
  const level = Number(node.level || 0);

  if (level === 2) return record.cpvs.some(c => (c.cpv_division || '') === code);
  if (level === 3) return record.cpvs.some(c => (c.cpv_group || '') === code);
  if (level === 4) return record.cpvs.some(c => (c.cpv_class || '') === code);
  if (level === 5) return record.cpvs.some(c => (c.cpv_category || '') === code);
  if (level === 8) return record.cpvs.some(c => String(c.cpv_item || '').startsWith(code));
  return false;
}

function recordMatchesAnyCpvNode(record, nodes) {
  if (!Array.isArray(nodes) || nodes.length === 0) return true;
  return nodes.some(n => recordMatchesCpvNode(record, n));
}

function applyFilters() {
  const q = (els.search.value || '').toLowerCase().trim();
  const awardMode = els.awardMode.value;
  const kind = els.kind.value;
  const selectedLocation = (els.location.value || '').trim();
  const selectedNodes = activeCpvNodes();
  const amountMin = parseAmountInput(els.amountMin.value);
  const amountMax = parseAmountInput(els.amountMax.value);

  state.filtered = state.records.filter(r => {
    const recAwardMode = classifyAwardMode(r);

    if (awardMode === 'direct' && recAwardMode !== 'direct') return false;
    if (awardMode === 'competition' && recAwardMode === 'direct') return false;

    if (kind !== 'all' && r.kind !== kind) return false;

    if (selectedLocation) {
      const rLoc = (r.location && r.location.nuts_label ? String(r.location.nuts_label).trim() : '');
      if (rLoc !== selectedLocation) return false;
    }

    if (q) {
      const locBlob = r.location && r.location.text ? r.location.text : '';
      const blob = `${r.title || ''} ${r.organization || ''} ${r.referenceNumber || ''} ${r.protocolNumber || ''} ${locBlob}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }

    if (amountMin !== null || amountMax !== null) {
      const amount = Number(r.amount_num || 0);
      if (amountMin !== null && amount < amountMin) return false;
      if (amountMax !== null && amount > amountMax) return false;
    }

    if (!recordMatchesAnyCpvNode(r, selectedNodes)) return false;

    return true;
  }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  state.visibleCount = PAGE_SIZE;
}

function renderMoreButton() {
  const remaining = state.filtered.length - state.visibleCount;
  if (remaining <= 0) {
    els.moreWrap.innerHTML = '';
    return;
  }
  const next = Math.min(PAGE_SIZE, remaining);
  els.moreWrap.innerHTML = `<button class="more-btn" id="moreBtn">Φόρτωση ακόμη ${next}</button>`;
  document.getElementById('moreBtn').addEventListener('click', () => {
    state.visibleCount += PAGE_SIZE;
    renderList();
  });
}

function renderList() {
  const toShow = state.filtered.slice(0, state.visibleCount);
  els.meta.textContent = `Αποτελέσματα: ${state.filtered.length.toLocaleString('el-GR')} (εμφανίζονται ${toShow.length.toLocaleString('el-GR')})`;
  els.list.innerHTML = toShow.map(cardHtml).join('');
  renderMoreButton();
}

function render() {
  applyFilters();
  renderList();
}

async function boot() {
  const [manifest, nodes] = await Promise.all([
    fetch('./data/records_manifest.json').then(r => r.json()),
    fetch('./data/cpv_nodes.json').then(r => r.json()),
  ]);
  const chunkFiles = Array.isArray(manifest.chunks) ? manifest.chunks.map(c => c.file) : [];
  const chunkPayloads = await Promise.all(chunkFiles.map(f => fetch(f).then(r => r.json())));
  const records = chunkPayloads.flat();
  state.records = records;
  state.nodes = nodes;

  buildCpvTree();
  rebuildCpvOptions();
  rebuildLocationOptions();
  render();
}

els.search.addEventListener('input', render);
els.awardMode.addEventListener('change', render);
els.kind.addEventListener('change', render);
els.location.addEventListener('change', render);
els.amountMin.addEventListener('input', render);
els.amountMax.addEventListener('input', render);
els.cpvTop.addEventListener('click', () => {
  state.cpvSelections = [];
  rebuildCpvOptions();
  render();
});
els.cpvUp.addEventListener('click', () => {
  const idx = deepestSelectionIndex();
  if (idx >= 0) {
    state.cpvSelections.length = idx;
    trimCpvSelections();
    rebuildCpvOptions();
    render();
  }
});
els.cpvCode.addEventListener('mousedown', (e) => {
  // Toggle option selection on simple click so multi-select works without Ctrl/Cmd.
  const target = e.target;
  if (!(target instanceof HTMLOptionElement)) return;
  e.preventDefault();
  target.selected = !target.selected;
  const level = Number(els.cpvCode.dataset.level || 0);
  const codes = Array.from(els.cpvCode.selectedOptions || [])
    .map(o => String(o.value || '').trim())
    .filter(Boolean);
  const nodes = codes
    .map(code => state.cpvNodesByCode.get(code))
    .filter(n => n && Number(n.level) === level);
  setSelectionForLevel(level, nodes);
  rebuildCpvOptions();
  render();
});
els.cpvCode.addEventListener('change', () => {
  const level = Number(els.cpvCode.dataset.level || 0);
  const codes = Array.from(els.cpvCode.selectedOptions || [])
    .map(o => String(o.value || '').trim())
    .filter(Boolean);
  const nodes = codes
    .map(code => state.cpvNodesByCode.get(code))
    .filter(n => n && Number(n.level) === level);
  setSelectionForLevel(level, nodes);
  rebuildCpvOptions();
  render();
});

boot().catch(err => {
  els.meta.textContent = 'Αποτυχία φόρτωσης δεδομένων. Τρέξε πρώτα το build_web_data.py.';
  console.error(err);
});




