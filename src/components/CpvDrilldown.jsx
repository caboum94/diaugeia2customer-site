export default function CpvDrilldown({
  cpvPath,
  cpvOptions,
  selectedCodes,
  onToggle,
  onTop,
  onUp,
  onNext,
  canTop,
  canGoUp,
  canGoNext,
}) {
  return (
    <div className="field cpv-drill">
      <span>Πλοήγηση CPV</span>
      <div className="cpv-actions">
        <button type="button" className="small-btn" disabled={!canTop} onClick={onTop}>
          Top
        </button>
        <button type="button" className="small-btn" disabled={!canGoUp} onClick={onUp}>
          Up
        </button>
        <button type="button" className="small-btn" disabled={!canGoNext} onClick={onNext}>
          Next
        </button>
      </div>
      <div className="cpv-path">{cpvPath}</div>
      <div className="cpv-checklist">
        {cpvOptions.length === 0 && <div className="cpv-empty">Δεν υπάρχουν υποκατηγορίες.</div>}
        {cpvOptions.map((n) => {
          const code = String(n.code || '');
          return (
            <label key={code} className="cpv-item">
              <input type="checkbox" checked={selectedCodes.has(code)} onChange={(e) => onToggle(code, e.target.checked)} />
              <span>
                {code} - {n.label || ''}
              </span>
            </label>
          );
        })}
      </div>
      <div className="hint">Επίλεξε πολλές κατηγορίες και πάτα Next για υποκατηγορίες.</div>
    </div>
  );
}

