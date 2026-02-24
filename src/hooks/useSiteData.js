import { useQuery } from '@tanstack/react-query';
import { assignRecentBadges } from '../utils/siteData';

async function fetchSiteData() {
  const [manifest, cpvNodes] = await Promise.all([
    fetch('/data/records_manifest.json').then((r) => {
      if (!r.ok) throw new Error('records_manifest.json not found');
      return r.json();
    }),
    fetch('/data/cpv_nodes.json').then((r) => {
      if (!r.ok) throw new Error('cpv_nodes.json not found');
      return r.json();
    }),
  ]);

  const chunkFiles = Array.isArray(manifest.chunks) ? manifest.chunks.map((c) => c.file) : [];
  const chunkPayloads = await Promise.all(
    chunkFiles.map((file) =>
      fetch(file).then((r) => {
        if (!r.ok) throw new Error(`chunk not found: ${file}`);
        return r.json();
      }),
    ),
  );

  return { records: assignRecentBadges(chunkPayloads.flat()), nodes: cpvNodes };
}

export function useSiteData() {
  const query = useQuery({
    queryKey: ['site-data'],
    queryFn: fetchSiteData,
    staleTime: 60_000,
    refetchInterval: 300_000,
    refetchOnWindowFocus: true,
  });

  return {
    records: query.data?.records || [],
    nodes: query.data?.nodes || [],
    loading: query.isLoading,
    error: query.isError ? 'Αποτυχία φόρτωσης δεδομένων. Τρέξε πρώτα το run_site_upload.ps1.' : '',
    refreshing: query.isFetching && !query.isLoading,
  };
}
