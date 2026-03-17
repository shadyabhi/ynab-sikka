<template>
  <div class="h-screen w-screen bg-slate-900 text-slate-200 overflow-hidden flex flex-col">
    <Navbar :current-page="currentPage" :last-sync-time="lastSyncTime" :syncing="syncing" :sync-log="syncLog" :sync-error="syncError" @navigate="page => currentPage = page" @open-settings="openSettings" @pull="pullData" @force-sync="forceSyncData" @toggle-sidebar="sidebarOpen = !sidebarOpen" :sidebar-open="sidebarOpen" />

    <div v-show="currentPage === 'analytics'" class="flex-1 flex flex-col md:flex-row overflow-hidden">

      <!-- Mobile Sidebar Overlay -->
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-sm md:hidden"
        @click="sidebarOpen = false"
      ></div>

      <!-- Sidebar / Filters -->
      <div
        v-show="!maximizedPane"
        class="fixed inset-y-0 left-0 z-40 w-80 max-w-[85vw] transform transition-transform duration-300 md:relative md:inset-auto md:z-auto md:transform-none md:h-full flex-shrink-0 p-4 pb-2 md:pb-4 md:pr-2"
        :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'"
      >
        <Sidebar
          :accounts="accounts"
          :quarterSpending="quarterSpending"
          v-model="filters"
        />
      </div>

      <!-- Main Content -->
      <div class="flex-1 flex flex-col h-full p-3 md:p-4 pt-2 md:pt-4 md:pl-2 gap-3 md:gap-4 overflow-y-auto">


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

      <!-- Top section: Transactions -->
      <div
        v-show="maximizedPane === null || maximizedPane === 'table'"
        class="transition-all duration-300"
        :class="maximizedPane === 'table' ? 'flex-1 h-full' : 'flex-none h-[300px] md:h-[500px]'"
      >
         <TransactionTable
            v-show="transactionMode === 'all'"
            :transactions="filteredTransactions"
            v-model:searchQuery="filters.searchQuery"
            v-model:columnFilters="filters.columnFilters"
            v-model:quickCategoryFilters="filters.quickCategoryFilters"
            :categoryGroups="categoryGroups"
            :isMaximized="maximizedPane === 'table'"
            :mode="transactionMode"
            :hasUnapprovedToggle="true"
            :unapprovedCount="unapprovedTransactions?.length || 0"
            @update:mode="transactionMode = $event"
            @toggle-maximize="toggleMaximize('table')"
         />
         <TransactionTable
            v-show="transactionMode === 'unapproved'"
            :transactions="filteredUnapprovedTransactions"
            v-model:searchQuery="unapprovedFilters.searchQuery"
            v-model:columnFilters="unapprovedFilters.columnFilters"
            v-model:quickCategoryFilters="unapprovedFilters.quickCategoryFilters"
            :categoryGroups="categoryGroups"
            :isMaximized="maximizedPane === 'table'"
            :mode="transactionMode"
            :hasUnapprovedToggle="true"
            :unapprovedCount="unapprovedTransactions?.length || 0"
            :showMagicIcon="true"
            @update:mode="transactionMode = $event"
            @toggle-maximize="toggleMaximize('table')"
            @magic-approve="openMagicModal"
            @approve-selected="openApproveConfirm"
         />
      </div>

      <!-- Horizontal Resizer (Visible only when both panes are shown) -->
      <div
        v-show="maximizedPane === null"
        class="h-2 w-full cursor-row-resize hover:bg-sky-500/30 active:bg-sky-500/50 rounded-full transition-colors hidden md:block flex-shrink-0"
        @mousedown="startChartResize"
      ></div>

      <!-- Bottom section: Charts -->
      <div
        v-show="maximizedPane === null || maximizedPane === 'chart'"
        class="transition-all duration-300"
        :style="maximizedPane === 'chart' ? {} : { height: chartHeight + 'px', minHeight: '150px' }"
        :class="maximizedPane === 'chart' ? 'flex-1 h-full' : 'flex-shrink-0'"
      >
         <SpendingChart
            :transactions="filteredTransactions"
            :categoryToGroupMap="categoryToGroupMap"
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
      filter-btn-text="Filter by this category"
      @close="closePopup"
      @filter-category="onPopupFilterCategory"
      @filter-account="onPopupFilterAccount"
    />

    <!-- Magic Approve Modal -->
    <div v-if="magicState.visible" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" @click="closeMagicModal"></div>

      <div class="relative bg-slate-800 border border-purple-500/50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/80 sticky top-0 z-10">
          <div>
            <h2 class="text-xl font-bold flex items-center gap-2 text-purple-400">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              Auto-Approve Transfers
            </h2>
            <div class="text-xs text-slate-400 mt-1">Found {{ magicState.transfers.length }} transfers to automatically clear.</div>
          </div>
          <button @click="closeMagicModal" class="text-slate-400 hover:text-white bg-slate-700/50 hover:bg-rose-500/80 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
            &times;
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-auto p-4 custom-scrollbar">
          <table class="w-full text-left text-xs md:text-sm text-slate-300" style="min-width: 500px;">
            <thead class="text-xs text-purple-300 uppercase bg-slate-800/80 sticky top-0 backdrop-blur-md">
              <tr>
                <th class="px-2 md:px-4 py-2">Date</th>
                <th class="px-2 md:px-4 py-2">Account</th>
                <th class="px-2 md:px-4 py-2">Payee (Transfer)</th>
                <th class="px-2 md:px-4 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="tx in magicState.transfers"
                :key="tx.id"
                class="border-b border-slate-700/50 bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
                :class="getMagicRowClass(tx)"
              >
                <td class="px-2 md:px-4 py-2 whitespace-nowrap">{{ new Date(tx.date).toLocaleDateString() }}</td>
                <td class="px-2 md:px-4 py-2"><span class="text-xs bg-slate-700 px-2 py-0.5 rounded">{{ tx.accountname }}</span></td>
                <td class="px-2 md:px-4 py-2 truncate max-w-xs">{{ tx.payeename }}</td>
                <td class="px-2 md:px-4 py-2 text-right font-mono" :class="tx.amount > 0 ? 'text-emerald-400' : 'text-slate-300'">
                  ${{ formatAmount(tx.amount) }}
                </td>
              </tr>
              <tr v-if="magicState.transfers.length === 0">
                <td colspan="4" class="px-4 py-8 text-center text-slate-500 italic">No transfers found to auto-approve.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="p-3 md:p-4 border-t border-slate-700/50 bg-slate-800/90 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <label class="flex items-center gap-2 text-xs md:text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" v-model="magicState.dryRun" class="rounded bg-slate-700 border-slate-600 text-purple-500 focus:ring-purple-500" />
            <span>Test Mode (Don't save to file)</span>
          </label>
          <div class="flex gap-2 md:gap-3 w-full sm:w-auto">
            <button @click="closeMagicModal" class="px-4 md:px-6 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors border border-slate-600 flex-1 sm:flex-none">
              Cancel
            </button>
            <button
              @click="confirmMagicApprove"
              :disabled="magicState.transfers.length === 0 || magicState.saving"
              class="px-4 md:px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all flex items-center justify-center gap-2 flex-1 sm:flex-none"
            >
              <span v-if="magicState.saving" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              {{ magicState.saving ? 'Approving...' : 'Approve All' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- Approve Confirmation Modal -->
    <div v-if="approveConfirm.visible" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" @click="closeApproveConfirm"></div>

      <div class="relative bg-slate-800 border border-emerald-500/50 rounded-2xl shadow-2xl w-[95%] md:w-[80%] max-h-[90vh] flex flex-col overflow-hidden">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/80 sticky top-0 z-10">
          <div>
            <h2 class="text-xl font-bold flex items-center gap-2 text-emerald-400">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Approve Transactions
            </h2>
            <div class="text-xs text-slate-400 mt-1">{{ approveConfirm.transactions.length }} transaction{{ approveConfirm.transactions.length === 1 ? '' : 's' }} will be approved in YNAB.</div>
          </div>
          <button @click="closeApproveConfirm" class="text-slate-400 hover:text-white bg-slate-700/50 hover:bg-rose-500/80 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
            &times;
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-auto p-4 custom-scrollbar">
          <table class="w-full text-left text-xs md:text-sm text-slate-300" style="min-width: 600px;">
            <thead class="text-xs text-emerald-300 uppercase bg-slate-800/80 sticky top-0 backdrop-blur-md">
              <tr>
                <th class="px-2 md:px-4 py-2">Date</th>
                <th class="px-2 md:px-4 py-2">Payee</th>
                <th class="px-2 md:px-4 py-2">Account</th>
                <th class="px-2 md:px-4 py-2">Category</th>
                <th class="px-2 md:px-4 py-2">Memo</th>
                <th class="px-2 md:px-4 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(tx, idx) in approveConfirm.transactions"
                :key="tx.id"
                class="border-b border-slate-700/50 bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
              >
                <td class="px-2 md:px-4 py-2 whitespace-nowrap">{{ new Date(tx.date).toLocaleDateString() }}</td>
                <td class="px-2 md:px-4 py-2 truncate max-w-xs">{{ tx.payeename }}</td>
                <td class="px-2 md:px-4 py-2"><span class="text-xs bg-slate-700 px-2 py-0.5 rounded">{{ tx.accountname }}</span></td>
                <td class="px-3 py-1.5">
                  <span
                    v-if="!tx.editingCategory"
                    @click="approveConfirm.transactions[idx].editingCategory = true"
                    class="text-xs cursor-pointer hover:text-emerald-300 transition-colors"
                    title="Click to change category"
                  >{{ tx.categoryname || 'Uncategorized' }}</span>
                  <select
                    v-else
                    v-model="approveConfirm.transactions[idx].editCategoryId"
                    @change="onApproveCategoryChange(idx)"
                    @blur="approveConfirm.transactions[idx].editingCategory = false"
                    class="w-full bg-slate-900/60 border border-slate-700/80 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option :value="null" class="text-slate-500">Uncategorized</option>
                    <optgroup v-for="group in categoryGroups" :key="group.name" :label="group.name">
                      <option v-for="cat in group.categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                    </optgroup>
                  </select>
                </td>
                <td class="px-3 py-1.5">
                  <input
                    type="text"
                    v-model="approveConfirm.transactions[idx].editMemo"
                    placeholder="Add memo..."
                    class="w-full bg-slate-900/60 border border-slate-700/80 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-slate-500"
                  />
                </td>
                <td class="px-4 py-2 text-right font-mono" :class="tx.amount > 0 ? 'text-emerald-400' : 'text-slate-300'">
                  ${{ formatAmount(tx.amount) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="p-3 md:p-4 border-t border-slate-700/50 bg-slate-800/90 flex justify-end items-center gap-2 md:gap-3">
          <button @click="closeApproveConfirm" class="px-4 md:px-6 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors border border-slate-600">
            Cancel
          </button>
          <button
            @click="confirmApproveSelected"
            :disabled="approveConfirm.saving"
            class="px-4 md:px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium shadow-[0_0_15px_rgba(52,211,153,0.4)] transition-all flex items-center gap-2"
          >
            <span v-if="approveConfirm.saving" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            {{ approveConfirm.saving ? 'Approving...' : 'Confirm Approve' }}
          </button>
        </div>
      </div>
    </div>

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
import { pad, toDateStr, applyTransactionFilters, formatAmount, makeEmptyColumnFilters } from './utils';
import { fetchAccounts, fetchTransactions, fetchCategories, approveTransactions, clearCache, getLastSyncTime } from './ynabClient';
import { getCurrentQuarter } from './quarterUtils';
import Sidebar from './components/Sidebar.vue';
import Navbar from './components/Navbar.vue';
import TransactionTable from './components/TransactionTable.vue';
import SpendingChart from './components/SpendingChart.vue';
import TimelineFilter from './components/TimelineFilter.vue';
import TransactionPopup from './components/TransactionPopup.vue';

const lastSyncTime = ref(getLastSyncTime());
const syncing = ref(false);
const syncLog = ref([]);
const syncError = ref(null);

const currentPage = ref('analytics');
const accounts = ref([]);
const categoryGroups = ref([]);
const categoryToGroupMap = ref({});

const transactionMode = ref('all');

const unapprovedTransactions = ref([]);
const unapprovedFilters = ref({
  searchQuery: '',
  excludeTransfers: false,
  excludeInvestments: false,
  quickCategoryFilters: {},
  columnFilters: makeEmptyColumnFilters()
});

const now = new Date();
const defaultStartDate = toDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
const defaultEndDate = toDateStr(now);

const defaultGlobalFilters = {
  startDate: defaultStartDate,
  endDate: toDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  timeBucket: 'day',
  activePreset: 'thisMonth',
  excludeTransfers: false,
  excludeInvestments: false,
  categoryGroupFilters: {}
};

// Try to load persisted global filters from localStorage
let savedFilters = {};
try {
  const stored = localStorage.getItem('ynabsyncGlobalFilters');
  if (stored) {
    savedFilters = JSON.parse(stored);
  }
} catch(e) {
  console.error("Failed to parse config from local storage", e);
}

const filters = ref({
  ...defaultGlobalFilters,
  ...savedFilters,
  selectedAccounts: [],
  searchQuery: '',
  quickCategoryFilters: savedFilters.quickCategoryFilters ?? {},
  activePreset: savedFilters.activePreset ?? defaultGlobalFilters.activePreset,
  columnFilters: makeEmptyColumnFilters()
});

// Watch specifically these global filters and save to local storage
watch(() => [
  filters.value.startDate,
  filters.value.endDate,
  filters.value.timeBucket,
  filters.value.excludeTransfers,
  filters.value.excludeInvestments,
  filters.value.categoryGroupFilters,
  filters.value.quickCategoryFilters,
  filters.value.activePreset
], ([sd, ed, tb, et, ei, cgf, qcf, ap]) => {
  localStorage.setItem('ynabsyncGlobalFilters', JSON.stringify({
    startDate: sd,
    endDate: ed,
    timeBucket: tb,
    excludeTransfers: et,
    excludeInvestments: ei,
    categoryGroupFilters: cgf,
    quickCategoryFilters: qcf,
    activePreset: ap
  }));
}, { deep: true });

const resetGlobalFilters = () => {
  const now = new Date();
  filters.value.startDate = toDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
  filters.value.endDate = toDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  filters.value.timeBucket = 'day';
  filters.value.activePreset = 'thisMonth';
  filters.value.excludeTransfers = defaultGlobalFilters.excludeTransfers;
  filters.value.excludeInvestments = defaultGlobalFilters.excludeInvestments;
  // Reset all category group filters to neutral
  Object.keys(filters.value.categoryGroupFilters).forEach(key => {
    filters.value.categoryGroupFilters[key] = 'neutral';
  });
  filters.value.quickCategoryFilters = {};
};

const sidebarOpen = ref(false);
const maximizedPane = ref(null); // 'table', 'chart', or null

const toggleMaximize = (pane) => {
  if (maximizedPane.value === pane) {
    maximizedPane.value = null;
  } else {
    maximizedPane.value = pane;
  }
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
  if (popupState.value.filterName) {
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
  // Match key at start of line (not as substring of another key)
  // Supports: key = "value", key = 'value', key = value
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
  loadData('force');
};
const magicState = ref({
  visible: false,
  saving: false,
  dryRun: true,
  transfers: []
});

const openMagicModal = () => {
  const allUnapproved = unapprovedTransactions.value || [];
  const transfers = allUnapproved.filter(tx => tx.transferaccountid).map(tx => ({ ...tx }));

  // Grouping logic: identical (date, absolute amount) pairs should form a "related" sub-group
  // so we know these are likely two sides of the same transfer.
  const groups = new Map();
  let groupIndex = 0;

  transfers.forEach(tx => {
    // Generate a symmetric key based on date, absolute amount, and account names.
    // We derive the other account's name from payeename (ex: "Transfer : Checking: Wealthfront...")
    let otherAccountName = tx.payeename || '';
    if (otherAccountName.startsWith('Transfer : ')) {
      otherAccountName = otherAccountName.replace('Transfer : ', '');
    }
    const accountsInfo = [tx.accountname, otherAccountName].filter(Boolean).sort().join('_');
    const key = `${tx.date}_${Math.abs(tx.amount || 0)}_${accountsInfo}`;

    if (!groups.has(key)) {
      groups.set(key, groupIndex++);
    }
    tx._groupIndex = groups.get(key);
  });

  // Sort them so related rows are next to each other
  transfers.sort((a, b) => {
    if (a._groupIndex !== b._groupIndex) return a._groupIndex - b._groupIndex;
    return a.amount - b.amount;
  });

  magicState.value.transfers = transfers;
  magicState.value.visible = true;
};

// Helper to color related transfers with alternating border colors
const MAGIC_ROW_COLORS = [
  'border-l-purple-500',
  'border-l-sky-500',
  'border-l-rose-500',
  'border-l-emerald-500',
  'border-l-amber-500',
];

const getMagicRowClass = (tx) => {
  if (tx._groupIndex === undefined) return 'border-l-4 border-l-slate-500';
  return `border-l-4 ${MAGIC_ROW_COLORS[tx._groupIndex % MAGIC_ROW_COLORS.length]}`;
};

const closeMagicModal = () => {
  magicState.value.visible = false;
};

const confirmMagicApprove = async () => {
  const ids = magicState.value.transfers.map(t => t.id);
  magicState.value.saving = true;
  try {
    const token = localStorage.getItem('ynabToken');
    const budgetId = localStorage.getItem('ynabBudgetId');

    if (!magicState.value.dryRun) {
      if (!token || !budgetId) {
        syncError.value = 'Token and Budget ID required. Configure in Settings.';
        magicState.value.saving = false;
        closeMagicModal();
        return;
      }
      await approveTransactions(token, budgetId, ids.map(id => ({ id })));
      await loadData('force'); // force refresh after approve
    }
    closeMagicModal();
  } catch(e) {
    console.error('Error approving:', e);
  } finally {
    magicState.value.saving = false;
  }
};

// -- Approve Selected Confirmation --
const approveConfirm = ref({
  visible: false,
  saving: false,
  transactions: []
});

// Flat list of all categories for the dropdown
const allCategories = computed(() => {
  const cats = [];
  for (const group of categoryGroups.value) {
    for (const cat of group.categories || []) {
      cats.push({ id: cat.id, name: cat.name, group: group.name });
    }
  }
  return cats;
});

const openApproveConfirm = (selectedIds) => {
  const allUnapproved = unapprovedTransactions.value || [];
  const selectedSet = new Set(selectedIds);
  const txs = allUnapproved
    .filter(tx => selectedSet.has(tx.id))
    .map(tx => ({
      ...tx,
      editCategoryId: tx.categoryid,
      editingCategory: false,
      editMemo: tx.memo
    }));
  approveConfirm.value.transactions = txs;
  approveConfirm.value.visible = true;
};

const onApproveCategoryChange = (idx) => {
  const tx = approveConfirm.value.transactions[idx];
  const cat = allCategories.value.find(c => c.id === tx.editCategoryId);
  tx.categoryname = cat ? cat.name : 'Uncategorized';
  tx.editingCategory = false;
};

const closeApproveConfirm = () => {
  approveConfirm.value.visible = false;
};

const confirmApproveSelected = async () => {
  approveConfirm.value.saving = true;
  try {
    const token = localStorage.getItem('ynabToken');
    const budgetId = localStorage.getItem('ynabBudgetId');
    if (!token || !budgetId) {
      syncError.value = 'Token and Budget ID required. Configure in Settings.';
      closeApproveConfirm();
      return;
    }
    const updates = approveConfirm.value.transactions.map(tx => {
      const u = { id: tx.id };
      if (tx.editCategoryId !== tx.categoryid) u.category_id = tx.editCategoryId;
      if (tx.editMemo !== tx.memo) u.memo = tx.editMemo;
      return u;
    });
    await approveTransactions(token, budgetId, updates);
    closeApproveConfirm();
    await loadData('force');
  } catch(e) {
    console.error('Error approving:', e);
    syncError.value = e.message;
  } finally {
    approveConfirm.value.saving = false;
  }
};

// -- Resizing logic for right panes --
const chartHeight = ref(320); // Initial default height
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
  // Mouse moving UP -> smaller Y -> negative delta -> taller chart
  const deltaY = startY - e.clientY;
  // Constraint: between 150px and a max bound (could be window innerHeight - constraints)
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

// mode: 'auto' (use cache), 'pull' (bypass TTL, delta sync), 'force' (nuke + full re-fetch)
const loadData = async (mode = 'auto') => {
  const token = localStorage.getItem('ynabToken');
  const budgetId = localStorage.getItem('ynabBudgetId');

  if (!token || !budgetId) {
    openSettings();
    return;
  }

  if (mode === 'force') clearCache();

  syncing.value = true;
  syncLog.value = [];
  syncError.value = null;
  const logEntry = (entry) => { syncLog.value = [...syncLog.value, entry]; };

  try {
    const syncSince = localStorage.getItem('ynabSyncSince') || defaultSyncSince();

    const [rawAccounts, groups] = await Promise.all([
      fetchAccounts(token, budgetId, mode, logEntry),
      fetchCategories(token, budgetId, mode, logEntry)
    ]);

    const allTransactions = await fetchTransactions(token, budgetId, syncSince, rawAccounts, mode, logEntry);

    // Group transactions by account ID, attaching account metadata
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

    // On initial/force load, reset selection so sidebar auto-selects all.
    // On pull, keep existing selection to avoid blanking out transactions.
    if (mode !== 'pull') {
      filters.value.selectedAccounts = [];
    }

    // Category groups
    categoryGroups.value = groups;
    const mapping = {};
    groups.forEach(group => {
      (group.categories || []).forEach(cat => {
        mapping[cat.name] = group.name;
      });
    });
    categoryToGroupMap.value = mapping;

    groups.forEach(group => {
      if (!filters.value.categoryGroupFilters[group.name]) {
        filters.value.categoryGroupFilters[group.name] = 'neutral';
      }
    });

    // Unapproved = filter from all transactions
    unapprovedTransactions.value = allTransactions.filter(tx => tx.approved === false);

    lastSyncTime.value = getLastSyncTime();
  } catch (error) {
    console.error('Failed to load data:', error);
    syncError.value = error.message;
  } finally {
    syncing.value = false;
  }
};

const pullData = () => loadData('pull');
const forceSyncData = () => loadData('force');

onMounted(() => {
  loadData();
});

const toggleColumnFilter = (column, value) => {
  const tags = filters.value.columnFilters[column].tags;
  filters.value.columnFilters[column].tags = tags.includes(value) ? [] : [value];
};

const onTimelineCategoryClick = (v) => toggleColumnFilter('categoryname', v);
const onTimelineAccountClick = (v) => toggleColumnFilter('accountname', v);

// Quarter spending vs limits for sidebar warnings
const quarterSpending = computed(() => {
  const result = {};
  for (const acc of accounts.value) {
    // Parse quarter_limit from account note (YAML format: "quarter_limit: 2500")
    let limit = null;
    if (acc.note) {
      const match = acc.note.match(/quarter_limit:\s*([\d.]+)/);
      if (match) limit = parseFloat(match[1]);
    }
    if (!limit) continue;

    // Sum non-transfer transaction amounts for this account (negate for credit cards)
    const txs = acc.transactions || [];
    let total = 0;
    for (const tx of txs) {
      if (!tx.transferaccountid) total += tx.amount;
    }
    // Convert milliunits to dollars and negate (credit card spending is negative)
    const spent = Math.abs(total / 1000);
    result[acc.id] = { spent, limit };
  }
  return result;
});

// Create a unified list of transactions from all selected accounts, without date filter (for the timeline)
const accountFilteredTransactions = computed(() => {
  const selectedSet = new Set(filters.value.selectedAccounts);
  let allTx = [];

  accounts.value.forEach(acc => {
    if (selectedSet.has(acc.id)) {
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

  // Quick Category Filters + search + column filters via shared utility
  return applyTransactionFilters(allTx, {
    excludeTransfers: filters.value.excludeTransfers,
    excludeInvestments: filters.value.excludeInvestments,
    quickCategoryFilters: filters.value.quickCategoryFilters,
    searchQuery: filters.value.searchQuery,
    columnFilters: filters.value.columnFilters,
  }, categoryToGroupMap.value);
});

// Create a final list of transactions by matching exactly against the date range
const filteredTransactions = computed(() => {
  let allTx = accountFilteredTransactions.value;

  // Filter by date (string comparison avoids Date construction and timezone issues)
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

const filteredUnapprovedTransactions = computed(() => {
  return applyTransactionFilters(
    unapprovedTransactions.value || [],
    unapprovedFilters.value,
    categoryToGroupMap.value
  );
});

</script>

<style>
/* Global smooth scroll */
html {
  scroll-behavior: smooth;
}
</style>
