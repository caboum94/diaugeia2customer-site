const state = {
  records: [],
  nodes: [],
  filtered: [],
  visibleCount: 200,
  locations: [],
  cpvPath: [],
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

const els = {
  search: document.getElementById('search'),
  awardMode: document.getElementById('awardMode'),
  kind: document.getElementById('kind'),
  location: document.getElementById('location'),
  cpvCode: document.getElementById('cpvCode'),
  cpvTop: document.getElementById('cpvTop'),
  cpvBack: document.getElementById('cpvBack'),
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

function renderCpvPath() {
  if (!state.cpvPath.length) {
    els.cpvPath.textContent = 'CPV: Root';
    return;
  }
  const parts = state.cpvPath.map(n => `${n.code}`);
  els.cpvPath.textContent = `CPV: ${parts.join(' > ')}`;
}

function rebuildCpvOptions() {
  const current = state.cpvPath.length ? state.cpvPath[state.cpvPath.length - 1] : null;
  const parentCode = current ? String(current.code) : '';
  const targetLevel = current ? nextLevel(Number(current.level)) : 2;

  const children = (state.cpvChildrenByParent.get(parentCode) || []).filter(n => Number(n.level) === targetLevel);
  els.cpvCode.innerHTML = '<option value="">Επέλεξε υποκατηγορία</option>' +
    children.map(n => `<option value="${n.code}">${n.code} - ${n.label || ''}</option>`).join('');

  els.cpvBack.disabled = state.cpvPath.length === 0;
  els.cpvTop.disabled = state.cpvPath.length === 0;
  els.cpvCode.disabled = children.length === 0;

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
    <div class="line"><strong>Τύπος ανάθεσης:</strong> ${awardModeLabel} | <strong>Στάδιο:</strong> ${stageLabel} | <strong>Ημ/νία:</strong> ${r.date || '-'}</div>
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

function applyFilters() {
  const q = (els.search.value || '').toLowerCase().trim();
  const awardMode = els.awardMode.value;
  const kind = els.kind.value;
  const selectedLocation = (els.location.value || '').trim();
  const selectedNode = state.cpvPath.length ? state.cpvPath[state.cpvPath.length - 1] : null;

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

    if (!recordMatchesCpvNode(r, selectedNode)) return false;

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
els.cpvTop.addEventListener('click', () => {
  state.cpvPath = [];
  rebuildCpvOptions();
  render();
});
els.cpvBack.addEventListener('click', () => {
  if (state.cpvPath.length > 0) {
    state.cpvPath.pop();
    rebuildCpvOptions();
    render();
  }
});
els.cpvCode.addEventListener('change', () => {
  const code = String(els.cpvCode.value || '').trim();
  if (!code) return;
  const node = state.cpvNodesByCode.get(code);
  if (!node) return;
  state.cpvPath.push(node);
  rebuildCpvOptions();
  render();
});

boot().catch(err => {
  els.meta.textContent = 'Αποτυχία φόρτωσης δεδομένων. Τρέξε πρώτα το build_web_data.py.';
  console.error(err);
});
