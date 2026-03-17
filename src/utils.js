export const parseAccountName = (name) => {
    if (!name) return { type: 'Other', bank: 'Unknown Bank', shortName: 'Unknown' };
    const parts = name.split(':').map(s => s.trim());
    if (parts.length >= 3) {
        return { type: parts[0], bank: parts[1], shortName: parts.slice(2).join(':') };
    }
    if (parts.length === 2) {
        return { type: parts[0], bank: 'General', shortName: parts[1] };
    }
    return { type: 'Other', bank: 'Unknown Bank', shortName: name };
};

export const formatAccountName = (name) => parseAccountName(name).shortName;

// Date Formatting
export const pad = (n) => String(n).padStart(2, '0');
export const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const makeEmptyColumnFilters = () => ({
    date: { text: '', tags: [] },
    payeename: { text: '', tags: [] },
    accountname: { text: '', tags: [] },
    categoryname: { text: '', tags: [] },
    memo: { text: '', tags: [] },
    amount: { text: '', tags: [] }
});

// HTML escaping for safe innerHTML usage
export const escHtml = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

// Currency Formatting (Milliunits to readable amount)
export const formatAmount = (milliunits) => {
    return (Math.abs(milliunits) / 1000).toFixed(2);
};

// Shared transaction filter pipeline used by both analytics and unapproved views.
// filters shape: { searchQuery, excludeTransfers, excludeInvestments, quickCategoryFilters, columnFilters }
export function applyTransactionFilters(transactions, filters, categoryToGroupMap) {
    let result = transactions;

    if (filters.excludeTransfers) {
        result = result.filter(tx => !tx.transferaccountid);
    }

    if (filters.excludeInvestments) {
        result = result.filter(tx => tx.categoryname !== 'Money sent to investments');
    }

    const qcf = filters.quickCategoryFilters || {};
    const categoriesToExclude = new Set(Object.keys(qcf).filter(c => qcf[c] === 'exclude'));
    const categoriesToInclude = new Set(Object.keys(qcf).filter(c => qcf[c] === 'include'));

    if (categoriesToExclude.size > 0 || categoriesToInclude.size > 0) {
        result = result.filter(tx => {
            const gName = categoryToGroupMap[tx.categoryname];
            if (gName && categoriesToExclude.has(gName)) return false;
            if (categoriesToInclude.size > 0) return gName && categoriesToInclude.has(gName);
            return true;
        });
    }

    const query = (filters.searchQuery || '').toLowerCase().trim();
    if (query) {
        result = result.filter(tx => {
            const dStr = (tx.dateFormatted || '').toLowerCase();
            return (tx.payeename || '').toLowerCase().includes(query) ||
                   (tx.accountname || '').toLowerCase().includes(query) ||
                   (tx.categoryname || '').toLowerCase().includes(query) ||
                   (tx.memo || '').toLowerCase().includes(query) ||
                   dStr.includes(query);
        });
    }

    const colFilters = filters.columnFilters;
    if (colFilters) {
        Object.keys(colFilters).forEach(col => {
            const { text, tags } = colFilters[col];
            if (!text && tags.length === 0) return;
            const q = text.toLowerCase();
            result = result.filter(tx => {
                let val;
                if (col === 'date' && tx.date) {
                    val = formatDate(tx.date).toLowerCase();
                } else if (col === 'amount') {
                    val = formatAmount(tx.amount);
                } else {
                    val = String(tx[col] || '').toLowerCase();
                }
                const matchesTag = tags.length === 0 || tags.some(tag => {
                    const tagStr = String(tag).toLowerCase();
                    return tagStr.includes(val) || val.includes(tagStr) || tagStr === val;
                });
                return matchesTag && (!q || val.includes(q));
            });
        });
    }

    return result;
}
