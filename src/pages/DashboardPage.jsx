import ChartsPanel from '../components/ChartsPanel';
import { useSiteData } from '../hooks/useSiteData';

export default function DashboardPage() {
  const { records, loading, error, refreshing } = useSiteData();

  return (
    <main className="layout single-col">
      <section className="results-panel">
        <div className="meta">
          {loading ? 'Φόρτωση δεδομένων...' : error || `Dashboard records: ${records.length.toLocaleString('el-GR')}`}
          {refreshing ? ' (refreshing...)' : ''}
        </div>
        {!error && <ChartsPanel records={records} />}
      </section>
    </main>
  );
}

