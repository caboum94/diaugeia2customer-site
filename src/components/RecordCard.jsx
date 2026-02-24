import { KIND_LABELS, classifyAwardMode, formatAmount } from '../utils/filters';

function Badge({ badge }) {
  if (badge === 'today') return <span className="badge badge-today">today</span>;
  if (badge === 'new') return <span className="badge badge-new">new</span>;
  return null;
}

export default function RecordCard({ record }) {
  const stageLabel = KIND_LABELS[record.kind] || record.kind || '-';
  const mode = classifyAwardMode(record);
  const awardModeLabel = mode === 'direct' ? 'Απευθείας ανάθεση' : mode === 'competition' ? 'Διαγωνισμός' : 'Χωρίς κατηγορία';
  const cpvItems = Array.isArray(record.cpvs) ? record.cpvs.map((c) => c.cpv_item).filter(Boolean) : [];
  const cpvText = cpvItems.length ? cpvItems.slice(0, 4).join(', ') : '-';
  const loc = record.location || {};
  const locParts = [loc.nuts_label || '', loc.city || '', loc.postal_code || ''].filter(Boolean);
  const locText = locParts.length ? locParts.join(' | ') : '-';

  return (
    <article className="card" key={`${record.kind || 'x'}-${record.referenceNumber || ''}-${record.protocolNumber || ''}-${record.date || ''}`}>
      <div className="title">{record.title || '(χωρίς τίτλο)'}</div>
      <div className="line">
        <strong>Τύπος ανάθεσης:</strong> {awardModeLabel} | <strong>Στάδιο:</strong> {stageLabel} | <strong>Ημ/νία:</strong> {record.date || '-'}{' '}
        <Badge badge={record.badge} />
      </div>
      <div className="line">
        <strong>ΑΔΑΜ/Ref:</strong> {record.referenceNumber || '-'} | <strong>Πρωτόκολλο:</strong> {record.protocolNumber || '-'}
      </div>
      <div className="line">
        <strong>Φορέας:</strong> {record.organization || '-'}
      </div>
      <div className="line">
        <strong>Τοποθεσία:</strong> {locText}
      </div>
      <div className="line">
        <strong>Τύπος διαδικασίας:</strong> {record.procedureType || '-'}
      </div>
      <div className="line">
        <strong>Τύπος σύμβασης:</strong> {record.contractType || '-'}
      </div>
      <div className="line">
        <strong>Ποσό:</strong> {formatAmount(record.amount_num)} ευρώ
      </div>
      <div className="line">
        <strong>CPV:</strong> {cpvText}
      </div>
      <div className="line">
        {record.pdf_url ? (
          <a className="btnlink" href={record.pdf_url} target="_blank" rel="noopener noreferrer">
            Άνοιγμα PDF
          </a>
        ) : (
          '-'
        )}
      </div>
    </article>
  );
}

