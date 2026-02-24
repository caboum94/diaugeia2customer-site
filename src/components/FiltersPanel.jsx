import CpvDrilldown from './CpvDrilldown';

export default function FiltersPanel({
  search,
  setSearch,
  awardMode,
  setAwardMode,
  kind,
  setKind,
  location,
  setLocation,
  locations,
  amountMin,
  setAmountMin,
  amountMax,
  setAmountMax,
  cpvProps,
}) {
  return (
    <aside className="filters-panel">
      <h2>Φίλτρα</h2>

      <label className="field">
        <span>Αναζήτηση</span>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Τίτλος, φορέας, κωδικός" />
      </label>

      <label className="field">
        <span>Τύπος Ανάθεσης</span>
        <select value={awardMode} onChange={(e) => setAwardMode(e.target.value)}>
          <option value="all">Όλοι οι τύποι ανάθεσης</option>
          <option value="direct">Απευθείας ανάθεση</option>
          <option value="competition">Διαγωνισμός</option>
        </select>
      </label>

      <label className="field">
        <span>Στάδιο</span>
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="all">Όλα τα στάδια</option>
          <option value="request">Αίτημα</option>
          <option value="notice">Προκήρυξη</option>
          <option value="auction">Διαγωνισμός</option>
          <option value="contract">Σύμβαση</option>
          <option value="payment">Πληρωμή</option>
        </select>
      </label>

      <label className="field">
        <span>Τοποθεσία (NUTS)</span>
        <select value={location} onChange={(e) => setLocation(e.target.value)}>
          <option value="">Όλες οι τοποθεσίες (NUTS)</option>
          {locations.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      </label>

      <div className="field-row">
        <label className="field half">
          <span>Ποσό από (€)</span>
          <input value={amountMin} onChange={(e) => setAmountMin(e.target.value)} inputMode="decimal" placeholder="π.χ. 1000" />
        </label>
        <label className="field half">
          <span>Ποσό έως (€)</span>
          <input value={amountMax} onChange={(e) => setAmountMax(e.target.value)} inputMode="decimal" placeholder="π.χ. 50000" />
        </label>
      </div>

      <CpvDrilldown {...cpvProps} />
    </aside>
  );
}

