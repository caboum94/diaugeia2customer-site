import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const STAGE_KEYS = ['request', 'notice', 'auction', 'contract', 'payment'];

function toAmount(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function dateAmountSeries(records) {
  const byDate = new Map();
  for (const r of records) {
    const d = String(r.date || '').trim();
    if (!d) continue;
    byDate.set(d, (byDate.get(d) || 0) + toAmount(r.amount_num));
  }
  return Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, amount]) => ({ date, amount: Math.round(amount) }));
}

function dateStageSeries(records) {
  const byDate = new Map();
  for (const r of records) {
    const d = String(r.date || '').trim();
    if (!d) continue;
    if (!byDate.has(d)) {
      byDate.set(d, { date: d, request: 0, notice: 0, auction: 0, contract: 0, payment: 0 });
    }
    const row = byDate.get(d);
    if (STAGE_KEYS.includes(r.kind)) row[r.kind] += 1;
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function topCpvSeries(records, limit = 10) {
  const byCpv = new Map();
  for (const r of records) {
    const cpvItem = Array.isArray(r.cpvs) && r.cpvs.length > 0 ? String(r.cpvs[0].cpv_item || '').trim() : '';
    if (!cpvItem) continue;
    byCpv.set(cpvItem, (byCpv.get(cpvItem) || 0) + toAmount(r.amount_num));
  }
  return Array.from(byCpv.entries())
    .map(([cpv, amount]) => ({ cpv, amount: Math.round(amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

function topOrgSeries(records, limit = 10) {
  const byOrg = new Map();
  for (const r of records) {
    const org = String(r.organization || '').trim();
    if (!org) continue;
    byOrg.set(org, (byOrg.get(org) || 0) + toAmount(r.amount_num));
  }
  return Array.from(byOrg.entries())
    .map(([organization, amount]) => ({ organization, amount: Math.round(amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

function amountTick(v) {
  const n = Number(v || 0);
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return `${n}`;
}

export default function ChartsPanel({ records, compact = false }) {
  const dateAmount = dateAmountSeries(records);
  const dateStages = dateStageSeries(records);
  const topCpvs = topCpvSeries(records);
  const topOrgs = topOrgSeries(records);
  const shortH = compact ? 170 : 260;
  const tallH = compact ? 190 : 280;

  return (
    <section className="charts-panel">
      <h2>Trends Dashboard</h2>
      <div className={`charts-grid${compact ? ' charts-grid-compact' : ''}`}>
        <article className="chart-card">
          <h3>Amount by Date</h3>
          <ResponsiveContainer width="100%" height={shortH}>
            <LineChart data={dateAmount}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" minTickGap={24} />
              <YAxis tickFormatter={amountTick} />
              <Tooltip formatter={(value) => Number(value).toLocaleString('el-GR')} />
              <Line type="monotone" dataKey="amount" stroke="#0d7a6f" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </article>

        <article className="chart-card">
          <h3>Daily Count by Stage</h3>
          <ResponsiveContainer width="100%" height={shortH}>
            <AreaChart data={dateStages}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" minTickGap={24} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="request" stackId="1" stroke="#0d7a6f" fill="#93d5cc" />
              <Area type="monotone" dataKey="notice" stackId="1" stroke="#115e66" fill="#9dcfc6" />
              <Area type="monotone" dataKey="auction" stackId="1" stroke="#1f7a8c" fill="#a9d8cf" />
              <Area type="monotone" dataKey="contract" stackId="1" stroke="#2f8f83" fill="#bfe5df" />
              <Area type="monotone" dataKey="payment" stackId="1" stroke="#3ea699" fill="#d0eee9" />
            </AreaChart>
          </ResponsiveContainer>
        </article>

        <article className="chart-card">
          <h3>Top CPV by Amount</h3>
          <ResponsiveContainer width="100%" height={tallH}>
            <BarChart data={topCpvs} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={amountTick} />
              <YAxis type="category" dataKey="cpv" width={88} />
              <Tooltip formatter={(value) => Number(value).toLocaleString('el-GR')} />
              <Bar dataKey="amount" fill="#0d7a6f" />
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article className="chart-card">
          <h3>Top Organizations by Amount</h3>
          <ResponsiveContainer width="100%" height={tallH}>
            <BarChart data={topOrgs}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="organization" interval={0} angle={-20} textAnchor="end" height={72} />
              <YAxis tickFormatter={amountTick} />
              <Tooltip formatter={(value) => Number(value).toLocaleString('el-GR')} />
              <Bar dataKey="amount" fill="#115e66" />
            </BarChart>
          </ResponsiveContainer>
        </article>
      </div>
    </section>
  );
}
