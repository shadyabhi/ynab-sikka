<template>
  <div class="h-screen w-screen bg-slate-900 text-slate-200 overflow-hidden flex flex-col">
    <Navbar :last-sync-time="lastSyncTime" :syncing="syncing" :sync-log="syncLog" :sync-error="syncError" @open-settings="openSettings" @force-sync="forceSyncData" />

    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Main Content -->
      <div class="flex-1 flex flex-col h-full p-3 md:p-4 gap-3 md:gap-4 overflow-y-auto">

      <!-- Timeline Filter -->
      <div v-show="!maximizedPane || maximizedPane === 'timeline'" class="flex flex-col" :class="maximizedPane === 'timeline' ? 'flex-1 min-h-0' : 'flex-none'">
        <TimelineFilter
          :transactions="accountFilteredTransactions"
          v-model="filters"
          @category-click="onTimelineCategoryClick"
          @account-click="onTimelineAccountClick"
          :isMaximized="maximizedPane === 'timeline'"
          @toggle-maximize="toggleMaximize('timeline')"
          @show-popup="openPopup"
          @reset-global="resetGlobalFilters"
        />
      </div>

      <!-- Transactions -->
      <div
        v-show="maximizedPane === null || maximizedPane === 'table'"
        class="transition-all duration-300"
        :class="maximizedPane === 'table' ? 'flex-1 h-full' : 'flex-none h-[500px] lg:h-[500px]'"
      >
         <TransactionTable
            :transactions="filteredTransactions"
            v-model:searchQuery="filters.searchQuery"
            v-model:columnFilters="filters.columnFilters"
            v-model:quickCategoryFilters="filters.quickCategoryFilters"
            :categoryGroups="categoryGroups"
            :isMaximized="maximizedPane === 'table'"
            mode="all"
            :hasUnapprovedToggle="false"
            :unapprovedCount="0"
            @toggle-maximize="toggleMaximize('table')"
         />
      </div>

      <!-- Horizontal Resizer -->
      <div
        v-show="maximizedPane === null"
        class="h-2 w-full cursor-row-resize hover:bg-sky-500/30 active:bg-sky-500/50 rounded-full transition-colors hidden md:block flex-shrink-0"
        @mousedown="startChartResize"
      ></div>

      <!-- Charts -->
      <div
        v-show="maximizedPane === null || maximizedPane === 'chart'"
        class="transition-all duration-300"
        :style="maximizedPane === 'chart' ? {} : { height: chartHeight + 'px', minHeight: '150px' }"
        :class="maximizedPane === 'chart' ? 'flex-1 h-full' : 'flex-shrink-0'"
      >
         <SpendingChart
            :transactions="filteredTransactions"
            :categoryToGroupMap="categoryToGroupMap"
            :categoryBudgetMap="categoryBudgetMap"
            :isMaximized="maximizedPane === 'chart'"
            @toggle-maximize="toggleMaximize('chart')"
            @category-click="onTimelineCategoryClick"
            @account-click="onTimelineAccountClick"
            @show-popup="openPopup"
         />
      </div>

    </div>
    </div>

    <TransactionPopup
      :visible="popupState.visible"
      :title="popupState.title"
      :subtitle="popupState.subtitle"
      :color="popupState.color"
      :transactions="popupState.transactions"
      :total="popupState.total"
      :show-category-filter="popupState.showFilter"
      :filter-btn-text="popupState.isGroupFilter ? 'Filter by this group' : 'Filter by this category'"
      @close="closePopup"
      @filter-category="onPopupFilterCategory"
      @filter-account="onPopupFilterAccount"
    />

    <!-- Settings Modal -->
    <div v-if="settingsState.visible" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" @click="closeSettings"></div>
      <div class="relative bg-slate-800 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden resize" style="min-width: 280px; min-height: 280px;">
        <div class="px-6 py-4 border-b border-slate-700/50 flex justify-between items-center flex-shrink-0">
          <h2 class="text-lg font-bold text-slate-200 flex items-center gap-2">
            <svg class="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </h2>
          <button @click="closeSettings" class="text-slate-400 hover:text-white bg-slate-700/50 hover:bg-rose-500/80 w-8 h-8 rounded-full flex items-center justify-center transition-colors">&times;</button>
        </div>
        <div class="p-6 flex flex-col gap-5 flex-1 min-h-0">
          <p class="text-xs text-slate-500 flex-shrink-0">Paste your config.toml contents below. Credentials are stored only in your browser's localStorage and sent directly to the YNAB API. No server is involved.</p>
          <div class="flex flex-col gap-1.5 flex-1 min-h-0">
            <label class="text-sm font-medium text-slate-300 flex-shrink-0">config.toml</label>
            <textarea
              v-model="settingsState.tomlText"
              rows="8"
              spellcheck="false"
              class="bg-slate-900/60 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 placeholder-slate-500 flex-1 min-h-[120px]"
            ></textarea>
            <p v-if="settingsState.error" class="text-xs text-red-400 flex-shrink-0">{{ settingsState.error }}</p>
          </div>
        </div>
        <div class="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3 flex-shrink-0">
          <button @click="closeSettings" class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors border border-slate-600">Cancel</button>
          <button @click="saveSettings" class="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-colors">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted, watch } from 'vue';
import { toDateStr, applyTransactionFilters, makeEmptyColumnFilters } from './utils';
import { fetchAccounts, fetchTransactions, fetchCategories, clearCache, getLastSyncTime } from './ynabClient';
import { getCurrentQuarter } from './quarterUtils';
import Navbar from './components/Navbar.vue';
import TransactionTable from './components/TransactionTable.vue';
import SpendingChart from './components/SpendingChart.vue';
import TimelineFilter from './components/TimelineFilter.vue';
import TransactionPopup from './components/TransactionPopup.vue';

const lastSyncTime = ref(getLastSyncTime());
const syncing = ref(false);
const syncLog = ref([]);
const syncError = ref(null);

const accounts = ref([]);
const categoryGroups = ref([]);
const categoryToGroupMap = ref({});
const categoryBudgetMap = ref({});

const now = new Date();
const defaultStartDate = toDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
const defaultEndDate = toDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0));

const defaultGlobalFilters = {
  startDate: defaultStartDate,
  endDate: defaultEndDate,
  selectedAccounts: [],
  searchQuery: '',
  timeBucket: 'day',
  activePreset: 'thisMonth',
  excludeTransfers: false,
  excludeInvestments: false,
  categoryGroupFilters: {}
};

const filters = ref({
  ...defaultGlobalFilters,
  selectedAccounts: [],
  searchQuery: '',
  quickCategoryFilters: {},
  activePreset: defaultGlobalFilters.activePreset,
  columnFilters: makeEmptyColumnFilters()
});

const resetGlobalFilters = () => {
  resetToCurrentMonth();
};

const resetToCurrentMonth = () => {
  const now = new Date();
  filters.value.startDate = toDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
  filters.value.endDate = toDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  filters.value.timeBucket = 'day';
  filters.value.activePreset = 'thisMonth';
  filters.value.excludeTransfers = defaultGlobalFilters.excludeTransfers;
  filters.value.excludeInvestments = defaultGlobalFilters.excludeInvestments;
  Object.keys(filters.value.categoryGroupFilters).forEach(key => {
    filters.value.categoryGroupFilters[key] = 'neutral';
  });
  filters.value.quickCategoryFilters = {};
};

const maximizedPane = ref(null);

const toggleMaximize = (pane) => {
  maximizedPane.value = maximizedPane.value === pane ? null : pane;
};

// -- Global Popup Logic --
const popupState = ref({
  visible: false,
  title: '',
  subtitle: '',
  color: '',
  transactions: [],
  total: '0.00',
  showFilter: false,
  filterName: ''
});

const openPopup = (data) => {
  popupState.value = { ...data, visible: true };
};

const closePopup = () => {
  popupState.value.visible = false;
};

const onPopupFilterCategory = () => {
  if (popupState.value.isGroupFilter && popupState.value.filterName) {
    const groupName = popupState.value.filterName;
    const cgf = filters.value.categoryGroupFilters;
    if (cgf[groupName] === 'include') {
      cgf[groupName] = 'neutral';
    } else {
      Object.keys(cgf).forEach(k => { cgf[k] = 'neutral'; });
      cgf[groupName] = 'include';
    }
  } else if (popupState.value.filterName) {
    onTimelineCategoryClick(popupState.value.filterName);
  }
  closePopup();
};

const onPopupFilterAccount = (acc) => {
  if (acc) {
    onTimelineAccountClick(acc);
  }
  closePopup();
};

// -- Settings Logic --
const settingsState = ref({ visible: false, tomlText: '', error: '' });

function buildToml(token, budgetId, syncSince) {
  return `[ynab]
token = "${token}"
budget_id = "${budgetId}"

[app]
# YYYY-MM-DD, defaults to start of current quarter
sync_since = "${syncSince}"`;
}

function parseTomlValue(text, key) {
  const re = new RegExp(`^${key}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|(\\S+))`, 'm');
  const m = text.match(re);
  if (!m) return '';
  return m[1] ?? m[2] ?? m[3] ?? '';
}

function parseToml(text) {
  return {
    token: parseTomlValue(text, 'token'),
    budgetId: parseTomlValue(text, 'budget_id'),
    syncSince: parseTomlValue(text, 'sync_since')
  };
}

function defaultSyncSince() {
  return getCurrentQuarter().start;
}

const openSettings = () => {
  const token = localStorage.getItem('ynabToken') || '';
  const budgetId = localStorage.getItem('ynabBudgetId') || '';
  const syncSince = localStorage.getItem('ynabSyncSince') || defaultSyncSince();
  if (token || budgetId) {
    if (!confirm('Settings contain sensitive data (API token). Are you sure you want to show settings?')) return;
  }
  settingsState.value.tomlText = buildToml(token, budgetId, syncSince);
  settingsState.value.error = '';
  settingsState.value.visible = true;
};

const closeSettings = () => { settingsState.value.visible = false; };

const saveSettings = () => {
  const { token, budgetId, syncSince } = parseToml(settingsState.value.tomlText);
  if (!token || !budgetId) {
    settingsState.value.error = 'Could not find token and budget_id in the TOML. Make sure both are set under [ynab].';
    return;
  }
  localStorage.setItem('ynabToken', token);
  localStorage.setItem('ynabBudgetId', budgetId);
  localStorage.setItem('ynabSyncSince', syncSince || defaultSyncSince());
  closeSettings();
  forceSyncData();
};

// -- Resizing logic for chart pane --
const chartHeight = ref(320);
const isResizingChart = ref(false);
let startY = 0;
let startHeight = 0;

const startChartResize = (e) => {
  isResizingChart.value = true;
  startY = e.clientY;
  startHeight = chartHeight.value;
  window.addEventListener('mousemove', onChartResize);
  window.addEventListener('mouseup', stopChartResize);
  document.body.style.cursor = 'row-resize';
  document.body.style.userSelect = 'none';
};

const onChartResize = (e) => {
  if (!isResizingChart.value) return;
  const deltaY = startY - e.clientY;
  chartHeight.value = Math.max(150, Math.min(window.innerHeight - 200, startHeight + deltaY));
};

const stopChartResize = () => {
  isResizingChart.value = false;
  window.removeEventListener('mousemove', onChartResize);
  window.removeEventListener('mouseup', stopChartResize);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
};

onUnmounted(() => {
  window.removeEventListener('mousemove', onChartResize);
  window.removeEventListener('mouseup', stopChartResize);
});

// -- Data loading (force sync only) --
const loadData = async () => {
  const token = localStorage.getItem('ynabToken');
  const budgetId = localStorage.getItem('ynabBudgetId');

  if (!token || !budgetId) {
    openSettings();
    return;
  }

  clearCache();

  syncing.value = true;
  syncLog.value = [];
  syncError.value = null;
  const logEntry = (entry) => { syncLog.value = [...syncLog.value, entry]; };

  try {
    const syncSince = localStorage.getItem('ynabSyncSince') || defaultSyncSince();

    const [rawAccounts, groups] = await Promise.all([
      fetchAccounts(token, budgetId, 'force', logEntry),
      fetchCategories(token, budgetId, 'force', logEntry)
    ]);

    const allTransactions = await fetchTransactions(token, budgetId, syncSince, rawAccounts, 'force', logEntry);

    const txByAccount = new Map();
    for (const tx of allTransactions) {
      const aid = tx.accountid;
      if (!txByAccount.has(aid)) txByAccount.set(aid, []);
      txByAccount.get(aid).push(tx);
    }

    accounts.value = rawAccounts.map(acc => ({
      ...acc,
      transactions: txByAccount.get(acc.id) || []
    }));

    // Auto-select all accounts
    filters.value.selectedAccounts = [];

    // Category groups
    categoryGroups.value = groups;
    const mapping = {};
    groups.forEach(group => {
      (group.categories || []).forEach(cat => {
        mapping[cat.name] = group.name;
      });
    });
    categoryToGroupMap.value = mapping;

    const budgetMap = {};
    groups.forEach(group => {
      (group.categories || []).forEach(cat => {
        budgetMap[cat.name] = { budgeted: cat.budgeted / 1000, balance: cat.balance / 1000 };
      });
    });
    categoryBudgetMap.value = budgetMap;

    groups.forEach(group => {
      if (!filters.value.categoryGroupFilters[group.name]) {
        filters.value.categoryGroupFilters[group.name] = 'neutral';
      }
    });

    lastSyncTime.value = getLastSyncTime();

    // Always default to current month after force sync
    resetToCurrentMonth();
  } catch (error) {
    console.error('Failed to load data:', error);
    syncError.value = error.message;
  } finally {
    syncing.value = false;
  }
};

const forceSyncData = () => loadData();

onMounted(() => {
  loadData();
});

const toggleColumnFilter = (column, value) => {
  const tags = filters.value.columnFilters[column].tags;
  filters.value.columnFilters[column].tags = tags.includes(value) ? [] : [value];
};

const onTimelineCategoryClick = (v) => toggleColumnFilter('categoryname', v);
const onTimelineAccountClick = (v) => toggleColumnFilter('accountname', v);

// Create a unified list of transactions from all selected accounts, without date filter (for the timeline)
const accountFilteredTransactions = computed(() => {
  const selectedSet = new Set(filters.value.selectedAccounts);
  let allTx = [];

  accounts.value.forEach(acc => {
    if (selectedSet.size === 0 || selectedSet.has(acc.id)) {
      allTx.push(...acc.transactions);
    }
  });

  // Category Group Filters
  const cgf = filters.value.categoryGroupFilters;
  const groupsToExclude = new Set(Object.keys(cgf).filter(g => cgf[g] === 'exclude'));
  const groupsToInclude = new Set(Object.keys(cgf).filter(g => cgf[g] === 'include'));

  if (groupsToExclude.size > 0 || groupsToInclude.size > 0) {
    allTx = allTx.filter(tx => {
      const gName = categoryToGroupMap.value[tx.categoryname];
      if (gName && groupsToExclude.has(gName)) {
        return false;
      }
      if (groupsToInclude.size > 0) {
        return gName && groupsToInclude.has(gName);
      }
      return true;
    });
  }

  return applyTransactionFilters(allTx, {
    excludeTransfers: filters.value.excludeTransfers,
    excludeInvestments: filters.value.excludeInvestments,
    quickCategoryFilters: filters.value.quickCategoryFilters,
    searchQuery: filters.value.searchQuery,
    columnFilters: filters.value.columnFilters,
  }, categoryToGroupMap.value);
});

// Final filtered transactions with date range
const filteredTransactions = computed(() => {
  let allTx = accountFilteredTransactions.value;

  const start = filters.value.startDate || '';
  const end = filters.value.endDate || '';
  if (start || end) {
    allTx = allTx.filter(tx => {
      const d = (tx.date || '').split('T')[0];
      return (!start || d >= start) && (!end || d <= end);
    });
  }

  return allTx;
});
</script>
