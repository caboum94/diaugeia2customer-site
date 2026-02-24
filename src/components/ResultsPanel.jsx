import { PAGE_SIZE } from '../utils/filters';
import RecordCard from './RecordCard';
import { Virtuoso } from 'react-virtuoso';

export default function ResultsPanel({
  loading,
  error,
  filteredCount,
  shownRecords,
  visibleCount,
  onLoadMore,
  virtualized,
  columns = 5,
}) {
  return (
    <section className="results-panel">
      <div className="meta">
        {loading
          ? 'Loading data...'
          : error || `Results: ${filteredCount.toLocaleString('el-GR')} (showing ${shownRecords.length.toLocaleString('el-GR')})`}
      </div>

      {virtualized ? (
        <div className="virtual-list-wrap">
          <Virtuoso
            data={shownRecords}
            overscan={400}
            itemContent={(index, record) => (
              <div className="virtual-row" key={`${record.kind || 'x'}-${record.referenceNumber || ''}-${index}`}>
                <RecordCard record={record} />
              </div>
            )}
          />
        </div>
      ) : (
        <div className={`cards cards-cols-${columns}`}>
          {shownRecords.map((record) => (
            <RecordCard
              key={`${record.kind || 'x'}-${record.referenceNumber || ''}-${record.protocolNumber || ''}-${record.date || ''}`}
              record={record}
            />
          ))}
        </div>
      )}

      <div className="more-wrap">
        {visibleCount < filteredCount && (
          <button className="more-btn" type="button" onClick={onLoadMore}>
            Load more {Math.min(PAGE_SIZE, filteredCount - visibleCount)}
          </button>
        )}
      </div>
    </section>
  );
}
