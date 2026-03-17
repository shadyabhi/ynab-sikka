import { formatDate } from './utils';

const YNAB_API = 'https://api.ynab.com/v1';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

function cacheKey(name) { return `ynabCache_${name}`; }

function getCache(name) {
  try {
    const raw = localStorage.getItem(cacheKey(name));
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached.lastSync < CACHE_TTL) return cached;
    return { ...cached, expired: true };
  } catch { return null; }
}

function setCache(name, data, serverKnowledge = null) {
  localStorage.setItem(cacheKey(name), JSON.stringify({
    data,
    lastSync: Date.now(),
    serverKnowledge
  }));
}

async function ynabFetch(token, path) {
  const start = performance.now();
  const res = await fetch(`${YNAB_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const latencyMs = Math.round(performance.now() - start);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YNAB API ${res.status}: ${text}`);
  }
  const json = await res.json();
  return { json, latencyMs, endpoint: path };
}

function mapTransaction(t) {
  return {
    id: t.id,
    date: t.date,
    dateFormatted: formatDate(t.date),
    amount: t.amount,
    memo: t.memo || '',
    payeename: t.payee_name || '',
    categoryname: t.category_name || '',
    accountname: '',
    accountid: '',
    transferaccountid: t.transfer_account_id || null,
    flagcolor: t.flag_color || null,
    approved: t.approved,
    deleted: t.deleted || false
  };
}

// mode: 'auto' (use cache if fresh), 'pull' (bypass TTL, use delta), 'force' (nuke and re-fetch)
// onLog callback: ({ endpoint, records, latencyMs, cached, delta?, total? })

export async function fetchAccounts(token, budgetId, mode = 'auto', onLog = null) {
  if (mode === 'auto') {
    const cached = getCache('accounts');
    if (cached && !cached.expired) {
      onLog?.({ endpoint: 'accounts', records: cached.data.length, latencyMs: 0, cached: true });
      return cached.data;
    }
  }

  const { json, latencyMs, endpoint } = await ynabFetch(token, `/budgets/${budgetId}/accounts`);
  const accounts = json.data.accounts
    .filter(a => !a.closed && !a.deleted)
    .map(a => ({
      id: a.id,
      name: a.name,
      balance: a.balance / 1000,
      note: a.note || ''
    }));

  setCache('accounts', accounts);
  onLog?.({ endpoint, records: accounts.length, latencyMs, cached: false });
  return accounts;
}

export async function fetchTransactions(token, budgetId, sinceDate, accounts, mode = 'auto', onLog = null) {
  const cacheName = 'transactions';

  if (mode === 'auto') {
    const cached = getCache(cacheName);
    if (cached && !cached.expired) {
      onLog?.({ endpoint: 'transactions', records: cached.data.length, latencyMs: 0, cached: true });
      return cached.data;
    }
  }

  const accountById = new Map(accounts.map(a => [a.id, a]));

  // For 'pull' mode: use delta sync via server_knowledge if available
  // For 'force' mode: ignore previous cache, full re-fetch
  const prevCache = getCache(cacheName);
  const useDelta = mode === 'pull' && prevCache?.serverKnowledge && prevCache?.data;

  let path = `/budgets/${budgetId}/transactions?since_date=${sinceDate}`;
  if (useDelta) {
    path += `&last_knowledge_of_server=${prevCache.serverKnowledge}`;
  }

  const { json, latencyMs, endpoint } = await ynabFetch(token, path);
  const newServerKnowledge = json.data.server_knowledge;
  const fetchedCount = json.data.transactions.length;

  let allTransactions;

  if (useDelta) {
    const existingById = new Map();
    for (const tx of prevCache.data) {
      existingById.set(tx.id, tx);
    }
    for (const t of json.data.transactions) {
      const mapped = mapTransaction(t);
      const acc = accountById.get(t.account_id);
      mapped.accountname = acc?.name || '';
      mapped.accountid = t.account_id;
      if (mapped.deleted) {
        existingById.delete(mapped.id);
      } else {
        existingById.set(mapped.id, mapped);
      }
    }
    allTransactions = Array.from(existingById.values());
    onLog?.({ endpoint, records: fetchedCount, latencyMs, cached: false, delta: true, total: allTransactions.length });
  } else {
    allTransactions = json.data.transactions
      .filter(t => !t.deleted)
      .map(t => {
        const mapped = mapTransaction(t);
        const acc = accountById.get(t.account_id);
        mapped.accountname = acc?.name || '';
        mapped.accountid = t.account_id;
        return mapped;
      });
    onLog?.({ endpoint, records: allTransactions.length, latencyMs, cached: false });
  }

  setCache(cacheName, allTransactions, newServerKnowledge);
  return allTransactions;
}

export async function fetchCategories(token, budgetId, mode = 'auto', onLog = null) {
  if (mode === 'auto') {
    const cached = getCache('categories');
    if (cached && !cached.expired) {
      const catCount = cached.data.reduce((n, g) => n + g.categories.length, 0);
      onLog?.({ endpoint: 'categories', records: catCount, latencyMs: 0, cached: true });
      return cached.data;
    }
  }

  const { json, latencyMs, endpoint } = await ynabFetch(token, `/budgets/${budgetId}/categories`);
  const groups = json.data.category_groups
    .filter(g => !g.deleted && !g.hidden)
    .map(g => ({
      name: g.name,
      categories: (g.categories || [])
        .filter(c => !c.deleted && !c.hidden)
        .map(c => ({ name: c.name }))
    }));

  setCache('categories', groups);
  const catCount = groups.reduce((n, g) => n + g.categories.length, 0);
  onLog?.({ endpoint, records: catCount, latencyMs, cached: false });
  return groups;
}

export async function approveTransactions(token, budgetId, transactionIds) {
  const res = await fetch(`${YNAB_API}/budgets/${budgetId}/transactions`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      transactions: transactionIds.map(id => ({ id, approved: true }))
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YNAB API ${res.status}: ${text}`);
  }

  localStorage.removeItem(cacheKey('transactions'));
  return res.json();
}

export function clearCache() {
  ['accounts', 'transactions', 'categories'].forEach(k =>
    localStorage.removeItem(cacheKey(k))
  );
}

export function getLastSyncTime() {
  try {
    const raw = localStorage.getItem(cacheKey('transactions'));
    if (!raw) return null;
    return JSON.parse(raw).lastSync;
  } catch { return null; }
}
