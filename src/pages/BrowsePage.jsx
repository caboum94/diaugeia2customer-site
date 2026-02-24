import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ChartsPanel from '../components/ChartsPanel';
import FiltersPanel from '../components/FiltersPanel';
import ResultsPanel from '../components/ResultsPanel';
import { useSiteData } from '../hooks/useSiteData';
import { CPV_LEVELS, PAGE_SIZE, classifyAwardMode, levelIndex, parseAmountInput, recordMatchesCpvNode } from '../utils/filters';
import { readCpvSelectionJson, readNumber, readString, writeBrowseStateToParams } from '../utils/urlState';

function resolveSelectionNodes(rawSelections, nodesByCode) {
  if (!Array.isArray(rawSelections)) return [];
  const resolved = rawSelections.map((lvl) => {
    if (!Array.isArray(lvl)) return [];
    return lvl.map((code) => nodesByCode.get(String(code))).filter(Boolean);
  });

  while (resolved.length > 0) {
    const tail = resolved[resolved.length - 1];
    if (Array.isArray(tail) && tail.length > 0) break;
    resolved.pop();
  }

  return resolved;
}

function serializeSelections(selections) {
  return (selections || []).map((lvl) => (Array.isArray(lvl) ? lvl.map((n) => String(n.code || '')).filter(Boolean) : []));
}

function sameSelections(a, b) {
  return JSON.stringify(serializeSelections(a)) === JSON.stringify(serializeSelections(b));
}

export default function BrowsePage() {
  const { records, nodes, loading, error, refreshing } = useSiteData();
  const [params, setParams] = useSearchParams();
  const paramsString = params.toString();

  const [search, setSearch] = useState(() => readString(params, 'q'));
  const [awardMode, setAwardMode] = useState(() => readString(params, 'award', 'all'));
  const [kind, setKind] = useState(() => readString(params, 'kind', 'all'));
  const [location, setLocation] = useState(() => readString(params, 'loc'));
  const [amountMin, setAmountMin] = useState(() => readString(params, 'min'));
  const [amountMax, setAmountMax] = useState(() => readString(params, 'max'));
  const [cpvOptionLevel, setCpvOptionLevel] = useState(() => readNumber(params, 'cpvLevel', 2));
  const [cpvSelections, setCpvSelections] = useState([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [virtualized, setVirtualized] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [compactStats, setCompactStats] = useState(true);

  const cpvNodesByCode = useMemo(() => {
    const map = new Map();
    for (const n of nodes) {
      const code = String(n.code || '').trim();
      if (code) map.set(code, n);
    }
    return map;
  }, [nodes]);

  useEffect(() => {
    const raw = readCpvSelectionJson(params);
    const resolved = resolveSelectionNodes(raw, cpvNodesByCode);
    // Sync URL -> state only when params change; do not depend on cpvSelections.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCpvSelections((prev) => (sameSelections(prev, resolved) ? prev : resolved));
  }, [cpvNodesByCode, params]);

  useEffect(() => {
    const next = writeBrowseStateToParams({
      search,
      awardMode,
      kind,
      location,
      amountMin,
      amountMax,
      cpvOptionLevel,
      cpvSelections: serializeSelections(cpvSelections),
    });
    if (next.toString() !== paramsString) {
      setParams(next, { replace: true });
    }
  }, [search, awardMode, kind, location, amountMin, amountMax, cpvOptionLevel, cpvSelections, paramsString, setParams]);

  const locations = useMemo(() => {
    const labels = new Set();
    for (const r of records) {
      const label = r.location?.nuts_label ? String(r.location.nuts_label).trim() : '';
      if (label) labels.add(label);
    }
    return Array.from(labels).sort((a, b) => a.localeCompare(b, 'el'));
  }, [records]);

  const cpvChildrenByParent = useMemo(() => {
    const map = new Map();
    for (const n of nodes) {
      const parent = String(n.parent_code || '').trim();
      if (!map.has(parent)) map.set(parent, []);
      map.get(parent).push(n);
    }
    for (const [parent, children] of map.entries()) {
      children.sort((a, b) => String(a.code).localeCompare(String(b.code)));
      map.set(parent, children);
    }
    return map;
  }, [nodes]);

  const deepestSelectionIndex = useMemo(() => {
    for (let i = cpvSelections.length - 1; i >= 0; i -= 1) {
      const arr = cpvSelections[i];
      if (Array.isArray(arr) && arr.length > 0) return i;
    }
    return -1;
  }, [cpvSelections]);

  const activeCpvNodes = useMemo(() => {
    if (deepestSelectionIndex < 0) return [];
    return cpvSelections[deepestSelectionIndex] || [];
  }, [cpvSelections, deepestSelectionIndex]);

  const cpvOptions = useMemo(() => {
    const targetLevel = CPV_LEVELS.includes(cpvOptionLevel) ? cpvOptionLevel : 2;
    const targetIdx = levelIndex(targetLevel);
    let parentCodes = [''];
    if (targetIdx > 0) {
      const parentSel = cpvSelections[targetIdx - 1] || [];
      parentCodes = parentSel.map((n) => String(n.code || '').trim()).filter(Boolean);
    }

    const byCode = new Map();
    for (const parentCode of parentCodes) {
      const children = (cpvChildrenByParent.get(parentCode) || []).filter((n) => Number(n.level) === targetLevel);
      for (const n of children) byCode.set(String(n.code), n);
    }
    return Array.from(byCode.values()).sort((a, b) => String(a.code).localeCompare(String(b.code)));
  }, [cpvChildrenByParent, cpvSelections, cpvOptionLevel]);

  const filteredRecords = useMemo(() => {
    const q = search.toLowerCase().trim();
    const min = parseAmountInput(amountMin);
    const max = parseAmountInput(amountMax);

    return records
      .filter((r) => {
        const recAwardMode = classifyAwardMode(r);
        if (awardMode === 'direct' && recAwardMode !== 'direct') return false;
        if (awardMode === 'competition' && recAwardMode === 'direct') return false;
        if (kind !== 'all' && r.kind !== kind) return false;

        if (location) {
          const rLoc = r.location?.nuts_label ? String(r.location.nuts_label).trim() : '';
          if (rLoc !== location) return false;
        }

        if (q) {
          const locBlob = r.location?.text || '';
          const blob = `${r.title || ''} ${r.organization || ''} ${r.referenceNumber || ''} ${r.protocolNumber || ''} ${locBlob}`.toLowerCase();
          if (!blob.includes(q)) return false;
        }

        if (min !== null || max !== null) {
          const amount = Number(r.amount_num || 0);
          if (min !== null && amount < min) return false;
          if (max !== null && amount > max) return false;
        }

        if (activeCpvNodes.length) {
          const matches = activeCpvNodes.some((n) => recordMatchesCpvNode(r, n));
          if (!matches) return false;
        }
        return true;
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [records, search, awardMode, kind, location, amountMin, amountMax, activeCpvNodes]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleCount(PAGE_SIZE);
  }, [search, awardMode, kind, location, amountMin, amountMax, cpvSelections]);

  const shownRecords = useMemo(() => filteredRecords.slice(0, visibleCount), [filteredRecords, visibleCount]);
  const selectedCodes = useMemo(() => {
    const idx = levelIndex(cpvOptionLevel);
    const current = idx >= 0 ? cpvSelections[idx] || [] : [];
    return new Set(current.map((n) => String(n.code)));
  }, [cpvSelections, cpvOptionLevel]);

  const cpvPath = useMemo(() => {
    const parts = [`Select L${cpvOptionLevel || 2}`];
    for (let i = 0; i < CPV_LEVELS.length; i += 1) {
      const selected = cpvSelections[i] || [];
      if (!selected.length) continue;
      const codes = selected.map((n) => n.code).slice(0, 4);
      const extra = selected.length > 4 ? ` +${selected.length - 4}` : '';
      parts.push(`L${CPV_LEVELS[i]}: ${codes.join(', ')}${extra}`);
    }
    return `CPV: ${parts.join(' > ')}`;
  }, [cpvSelections, cpvOptionLevel]);

  const currentLevelIdx = levelIndex(cpvOptionLevel);
  const hasAnySelection = deepestSelectionIndex >= 0;
  const canGoUp = currentLevelIdx > 0;
  const canGoNext =
    currentLevelIdx >= 0 &&
    currentLevelIdx < CPV_LEVELS.length - 1 &&
    ((cpvSelections[currentLevelIdx] || []).length > 0);

  const setSelectionForLevel = (level, selectedNodes) => {
    const idx = levelIndex(level);
    if (idx < 0) return;
    const nextSelections = [...cpvSelections];
    nextSelections[idx] = selectedNodes;
    nextSelections.length = idx + 1;

    while (nextSelections.length > 0) {
      const tail = nextSelections[nextSelections.length - 1];
      if (Array.isArray(tail) && tail.length > 0) break;
      nextSelections.pop();
    }
    setCpvSelections(nextSelections);
  };

  const handleCpvToggle = (code, checked) => {
    const level = Number(cpvOptionLevel || 0);
    if (!level) return;
    const idx = levelIndex(level);
    const prev = (idx >= 0 ? cpvSelections[idx] : []) || [];
    const byCode = new Map(prev.map((n) => [String(n.code || ''), n]));

    if (checked) {
      const node = cpvNodesByCode.get(code);
      if (node && Number(node.level) === level) byCode.set(code, node);
    } else {
      byCode.delete(code);
    }
    setSelectionForLevel(level, Array.from(byCode.values()));
  };

  return (
    <>
      <header className="hero">
        <div className="hero-inner">
          <h1 className="site-title">PublicFlow</h1>
        </div>
      </header>

      <main className="layout">
        <FiltersPanel
          search={search}
          setSearch={setSearch}
          awardMode={awardMode}
          setAwardMode={setAwardMode}
          kind={kind}
          setKind={setKind}
          location={location}
          setLocation={setLocation}
          locations={locations}
          amountMin={amountMin}
          setAmountMin={setAmountMin}
          amountMax={amountMax}
          setAmountMax={setAmountMax}
          cpvProps={{
            cpvPath,
            cpvOptions,
            selectedCodes,
            onToggle: handleCpvToggle,
            onTop: () => {
              setCpvSelections([]);
              setCpvOptionLevel(2);
            },
            onUp: () => {
              if (currentLevelIdx > 0) setCpvOptionLevel(CPV_LEVELS[currentLevelIdx - 1]);
            },
            onNext: () => {
              if (currentLevelIdx >= 0 && currentLevelIdx < CPV_LEVELS.length - 1) {
                setCpvOptionLevel(CPV_LEVELS[currentLevelIdx + 1]);
              }
            },
            canTop: hasAnySelection || cpvOptionLevel !== 2,
            canGoUp,
            canGoNext,
          }}
        />

        <div>
          <div className="toolbar-row">
            <button type="button" className="small-btn" onClick={() => setVirtualized((v) => !v)}>
              {virtualized ? 'Disable List Mode' : 'Enable List Mode'}
            </button>
            <button type="button" className="small-btn" onClick={() => setShowStats((s) => !s)}>
              {showStats ? 'Hide Stats' : 'Show Stats'}
            </button>
            <button type="button" className="small-btn" onClick={() => setCompactStats((s) => !s)}>
              {compactStats ? 'Large Stats' : 'Small Stats'}
            </button>
            <span className="hint">{refreshing ? 'Live refresh in progress...' : 'Auto refresh every 5 minutes'}</span>
          </div>
          {showStats && <ChartsPanel records={filteredRecords} compact={compactStats} />}
          <ResultsPanel
            loading={loading}
            error={error}
            filteredCount={filteredRecords.length}
            shownRecords={shownRecords}
            visibleCount={visibleCount}
            virtualized={virtualized}
            columns={5}
            onLoadMore={() => setVisibleCount((v) => v + PAGE_SIZE)}
          />
        </div>
      </main>
    </>
  );
}
