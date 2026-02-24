export function assignRecentBadges(records) {
  const uniqueDates = Array.from(new Set(records.map((r) => String(r.date || '').trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );
  if (!uniqueDates.length) return records;

  const latestDate = uniqueDates[uniqueDates.length - 1];

  return records.map((r) => {
    const d = String(r.date || '').trim();
    if (d === latestDate) return { ...r, badge: 'new' };
    return { ...r, badge: '' };
  });
}
