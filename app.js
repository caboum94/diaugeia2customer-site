const state = { records: [], nodes: [], filtered: [], visibleCount: 200, locations: [] };

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
  cpvLevel: document.getElementById('cpvLevel'),
  cpvCode: document.getElementById('cpvCode'),
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

function cpvPrefix(cpv, level) {
  if (level === 'division') return cpv.cpv_division || '';
  if (level === 'group') return cpv.cpv_group || '';
  if (level === 'class') return cpv.cpv_class || '';
  if (level === 'category') return cpv.cpv_category || '';
  return cpv.cpv_item || '';
}

function rebuildCpvOptions() {
  const level = els.cpvLevel.value;
  const len = level === 'division' ? 2 : level === 'group' ? 3 : level === 'class' ? 4 : level === 'category' ? 5 : 8;
  const nodes = state.nodes.filter(n => n.level === len).sort((a, b) => a.code.localeCompare(b.code));
  els.cpvCode.innerHTML = '<option value="">Όλες οι κατηγορίες</option>' + nodes.map(n => `<option value="${n.code}">${n.code} - ${n.label || ''}</option>`).join('');
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

function applyFilters() {
  const q = (els.search.value || '').toLowerCase().trim();
  const awardMode = els.awardMode.value;
  const kind = els.kind.value;
  const selectedLocation = (els.location.value || '').trim();
  const cpvCode = els.cpvCode.value;
  const level = els.cpvLevel.value;

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

    if (cpvCode) {
      if (!Array.isArray(r.cpvs) || r.cpvs.length === 0) return false;
      const ok = r.cpvs.some(c => cpvPrefix(c, level) === cpvCode);
      if (!ok) return false;
    }

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
  rebuildCpvOptions();
  rebuildLocationOptions();
  render();
}

els.search.addEventListener('input', render);
els.awardMode.addEventListener('change', render);
els.kind.addEventListener('change', render);
els.location.addEventListener('change', render);
els.cpvLevel.addEventListener('change', () => { rebuildCpvOptions(); render(); });
els.cpvCode.addEventListener('change', render);

boot().catch(err => {
  els.meta.textContent = 'Αποτυχία φόρτωσης δεδομένων. Τρέξε πρώτα το build_web_data.py.';
  console.error(err);
});

