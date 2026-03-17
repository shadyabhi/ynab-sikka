<template>
  <div class="timeline-wrapper p-4 glass-panel flex flex-col relative z-10" :class="[{'opacity-50 pointer-events-none': !hasData}, isMaximized ? 'flex-1 h-full min-h-0' : 'mb-6 flex-none h-auto']">
    <!-- Controls Area: Allowed to wrap tightly -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 gap-2 w-full">
      <div class="flex items-center gap-1.5 flex-wrap">
        <h2 class="text-base font-bold neon-text text-sky-400 mr-2">Timeline</h2>

        <!-- Timeline Preset Filters -->
        <div class="flex items-center gap-1 flex-shrink-0">
          <button
            v-for="preset in [
              { label: 'This Week', action: 'thisWeek' },
              { label: 'This Month', action: 'thisMonth' },
              { label: 'Last Month', action: 'lastMonth' },
              { label: 'This Year', action: 'thisYear' },
            ]"
            :key="preset.action"
            @click="applyPreset(preset.action)"
            class="px-1.5 py-0.5 rounded border transition-all text-[9.5px] uppercase font-semibold whitespace-nowrap"
            :class="activePreset === preset.action
              ? 'bg-sky-500/25 border-sky-500 text-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.2)]'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-sky-500/10 hover:text-sky-300 hover:border-sky-500/40'"
          >{{ preset.label }}</button>
        </div>

        <div class="w-px h-4 bg-slate-700 mx-1 hidden sm:block"></div>

        <!-- Date Range Inputs -->
        <div class="flex items-center gap-1 flex-shrink-0">
          <input
            type="date"
            :value="modelValue.startDate"
            @input="setStartDate($event.target.value)"
            class="date-input"
          />
          <span class="text-[9px] uppercase font-bold text-slate-500 tracking-wider">To</span>
          <input
            type="date"
            :value="modelValue.endDate"
            @input="setEndDate($event.target.value)"
            class="date-input"
          />
        </div>

        <div class="w-px h-4 bg-slate-700 mx-1 hidden sm:block"></div>

        <!-- Bucketing / Group By -->
        <div class="flex items-center gap-1 flex-shrink-0">
          <span class="text-[9px] uppercase font-bold text-slate-500 tracking-wider">By</span>
          <button
            v-for="opt in bucketOptions"
            :key="opt.value"
            @click="setTimeBucket(opt.value)"
            class="px-1.5 py-0.5 rounded border transition-all text-[9.5px] uppercase font-semibold"
            :class="activeBucket === opt.value
              ? 'bg-emerald-500/25 border-emerald-500 text-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.2)]'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-300 hover:border-emerald-500/40'"
          >{{ opt.label }}</button>
        </div>

      </div>

      <!-- Right Side Actions -->
      <div class="flex items-center gap-2 flex-shrink-0 ml-auto">
        <div v-if="hasActiveFilters" class="flex items-center gap-1">
          <span v-if="activeCategory" class="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[9.5px] uppercase font-semibold flex items-center">
            {{ activeCategory }}
          </span>
          <button
            @click="clearFilters"
            class="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 hover:text-rose-300 border border-rose-500/30 transition-colors text-[9.5px] uppercase font-semibold"
          >Clear</button>
        </div>

        <button
          @click="$emit('reset-global')"
          class="px-1.5 py-0.5 rounded border border-rose-500/50 bg-rose-500/10 text-rose-400 transition-all hover:bg-rose-500/30 hover:text-rose-300 text-[9.5px] uppercase font-bold tracking-wider"
        >Reset All</button>

        <button
          @click="$emit('toggle-maximize')"
          class="text-slate-400 hover:text-sky-400 transition-colors p-1"
          :title="isMaximized ? 'Restore Down' : 'Maximize'"
        >
          <svg v-if="!isMaximized" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 14h6m0 0v6m0-6l-7 7m17-11h-6m0 0V4m0 6l7-7m-7 17v-6m0 0h6m-6 0l7 7M10 4v6m0 0H4m6 0L3 3" />
          </svg>
        </button>
      </div>
    </div>

    <div
      class="chart-container relative w-full border-b border-slate-700/50 overflow-visible"
      :style="isMaximized ? {} : { height: chartAreaHeight + 'px' }"
      :class="isMaximized ? 'flex-1 min-h-0' : 'flex-none'"
    >
      <!-- Stacked Bar Chart via Chart.js -->
      <Bar
        v-if="chartData.labels.length > 0"
        :key="`${activeBucket}-${modelValue.startDate || ''}-${modelValue.endDate || ''}-${isMaximized}`"
        :data="chartData"
        :options="chartOptions"
        class="absolute inset-0"
      />
    </div>

    <!-- Timeline Navigation -->
    <div v-if="hasActiveFilters" class="flex justify-center items-center gap-6 mt-3 mb-1 flex-none h-6">
      <button
        @click="shiftTimeline(-1)"
        class="w-6 h-6 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:bg-sky-500/20 hover:text-sky-300 hover:border-sky-500/40 transition-colors flex items-center justify-center shadow-sm"
        title="Shift Back"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span class="text-[10px] uppercase font-bold text-slate-500 tracking-widest pointer-events-none">Shift Timeline</span>
      <button
        @click="shiftTimeline(1)"
        class="w-6 h-6 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:bg-sky-500/20 hover:text-sky-300 hover:border-sky-500/40 transition-colors flex items-center justify-center shadow-sm"
        title="Shift Forward"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onUnmounted } from 'vue';
import { toDateStr, escHtml } from '../utils';
import { Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const props = defineProps({
  transactions: {
    type: Array,
    required: true
  },
  modelValue: {
    type: Object,
    required: true
  },
  isMaximized: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'category-click', 'account-click', 'toggle-maximize', 'show-popup', 'reset-global']);

const chartAreaHeight = 140;

const activePreset = computed(() => props.modelValue.activePreset || null);

// --- Detail popup handlers ---
const openDetailPopup = (category, bucketIdx) => {
  const { bucketMap, sortedKeys, categories } = stackedBuckets.value;
  const key = sortedKeys[bucketIdx];
  const bucketList = bucketMap[key];

  if (!bucketList || !bucketList[category]) return;

  const total = bucketList[category];

  // Get raw transactions for this bucket & category
  const bucket = activeBucket.value;
  let txs = chartTransactions.value.filter(tx => {
    if (tx.amount >= 0 || tx.deleted || tx.transferaccountid) return false;
    const cat = tx.categoryname || 'Uncategorized';
    if (cat !== category) return false;
    const itemKey = getBucketKey(tx.date, bucket);
    return itemKey === key;
  });

  // Sort by amount descending (most expensive first)
  txs = txs.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

  const catIdx = categories.indexOf(category);
  const color = catIdx >= 0 ? CATEGORY_COLORS[catIdx % CATEGORY_COLORS.length] : '#94a3b8';

  emit('show-popup', {
    title: category,
    subtitle: getBucketLabel(key, bucket),
    color,
    transactions: txs,
    total: total.toFixed(2),
    showFilter: true,
    filterName: category
  });
};

// Escape key handler is now in TransactionPopup.vue

const hasData = computed(() => props.transactions.length > 0);

// Bucket options
const bucketOptions = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Quarter', value: 'quarter' }
];

const activeBucket = computed(() => props.modelValue.timeBucket || 'month');

const setTimeBucket = (val) => {
  emit('update:modelValue', { ...props.modelValue, timeBucket: val });
};

// Determine the best bucket for a given date span in days
// Ensures the bucket is always smaller than the time frame
const BUCKET_ORDER = ['day', 'week', 'month', 'quarter'];
const bestBucketForDays = (days) => {
  if (days <= 7) return 'day';       // ≤ 1 week → day
  if (days <= 31) return 'week';     // ≤ 1 month → week
  if (days <= 93) return 'month';    // ≤ 1 quarter → month
  return 'quarter';
};

const adjustBucketIfNeeded = (updates) => {
  const startDate = updates.startDate ?? props.modelValue.startDate;
  const endDate = updates.endDate ?? props.modelValue.endDate;
  const currentBucket = updates.timeBucket ?? props.modelValue.timeBucket;

  if (startDate && endDate) {
    const days = (new Date(endDate) - new Date(startDate)) / 86400000;
    const best = bestBucketForDays(days);
    // Only downgrade — if the current bucket is too coarse for the span
    if (BUCKET_ORDER.indexOf(currentBucket) > BUCKET_ORDER.indexOf(best)) {
      updates.timeBucket = best;
    }
  }
  return updates;
};

const shiftTimeline = (direction) => {
  const sStr = props.modelValue.startDate;
  const eStr = props.modelValue.endDate;
  if (!sStr || !eStr) return;

  const s = new Date(sStr + 'T00:00:00');
  const e = new Date(eStr + 'T00:00:00');
  const days = Math.round((e - s) / 86400000) + 1; // inclusive days

  let step = 'month'; // default if unknown
  if (days <= 7) step = 'week';
  else if (days >= 28 && days <= 31) step = 'month';
  else if (days >= 89 && days <= 93) step = 'quarter';
  else if (days >= 365 && days <= 366) step = 'year';

  let newStart = new Date(s);
  let newEnd = new Date(e);

  if (step === 'week') {
    newStart.setDate(s.getDate() + (direction * 7));
    newEnd.setDate(e.getDate() + (direction * 7));
  } else if (step === 'month') {
    newStart.setMonth(s.getMonth() + direction);
    newStart.setDate(1);
    newEnd = new Date(newStart.getFullYear(), newStart.getMonth() + 1, 0);
  } else if (step === 'quarter') {
    newStart.setMonth(s.getMonth() + (direction * 3));
    newStart.setDate(1);
    newEnd = new Date(newStart.getFullYear(), newStart.getMonth() + 3, 0);
  } else if (step === 'year') {
    newStart.setFullYear(s.getFullYear() + direction);
    newStart.setDate(1);
    newStart.setMonth(0);
    newEnd = new Date(newStart.getFullYear(), 11, 31);
  }

  emit('update:modelValue', adjustBucketIfNeeded({
    ...props.modelValue,
    startDate: toDateStr(newStart),
    endDate: toDateStr(newEnd)
  }));
};

const applyPreset = (preset) => {
  const now = new Date();
  let startForPreset, endForPreset, newBucket;

  if (preset === 'thisWeek') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // get Monday
    startForPreset = new Date(now.getFullYear(), now.getMonth(), diff);
    endForPreset = new Date(startForPreset);
    endForPreset.setDate(startForPreset.getDate() + 6); // end on Sunday
    newBucket = 'day';
  } else if (preset === 'thisMonth') {
    startForPreset = new Date(now.getFullYear(), now.getMonth(), 1);
    endForPreset = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    newBucket = 'week';
  } else if (preset === 'lastMonth') {
    startForPreset = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    endForPreset = new Date(now.getFullYear(), now.getMonth(), 0);
    newBucket = 'week';
  } else if (preset === 'thisYear') {
    startForPreset = new Date(now.getFullYear(), 0, 1);
    endForPreset = new Date(now.getFullYear(), 11, 31);
    newBucket = 'month';
  }

  emit('update:modelValue', {
    ...props.modelValue,
    startDate: startForPreset ? toDateStr(startForPreset) : '',
    endDate: endForPreset ? toDateStr(endForPreset) : '',
    timeBucket: newBucket,
    activePreset: preset
  });
};

const setStartDate = (val) => {
  emit('update:modelValue', adjustBucketIfNeeded({ ...props.modelValue, startDate: val, activePreset: null }));
};

const setEndDate = (val) => {
  emit('update:modelValue', adjustBucketIfNeeded({ ...props.modelValue, endDate: val, activePreset: null }));
};

const activeCategory = computed(() => {
  const tags = props.modelValue.columnFilters?.categoryname?.tags;
  return tags && tags.length > 0 ? tags[0] : null;
});

const hasActiveFilters = computed(() => {
  return props.modelValue.startDate ||
         props.modelValue.endDate ||
         activeCategory.value;
});

const clearFilters = () => {
  const newModel = { ...props.modelValue, startDate: '', endDate: '', activePreset: null };
  if (newModel.columnFilters?.categoryname) {
    newModel.columnFilters = {
      ...newModel.columnFilters,
      categoryname: {
        ...newModel.columnFilters.categoryname,
        tags: []
      }
    };
  }
  emit('update:modelValue', newModel);
};

// Category color palette – curated for dark backgrounds
const CATEGORY_COLORS = [
  'rgba(56, 189, 248, 0.8)',   // sky
  'rgba(168, 85, 247, 0.8)',   // purple
  'rgba(251, 146, 60, 0.8)',   // orange
  'rgba(52, 211, 153, 0.8)',   // emerald
  'rgba(251, 113, 133, 0.8)',  // rose
  'rgba(250, 204, 21, 0.8)',   // yellow
  'rgba(99, 102, 241, 0.8)',   // indigo
  'rgba(45, 212, 191, 0.8)',   // teal
  'rgba(244, 114, 182, 0.8)',  // pink
  'rgba(163, 230, 53, 0.8)',   // lime
  'rgba(192, 132, 252, 0.8)',  // violet
  'rgba(253, 186, 116, 0.8)',  // amber
];

const CATEGORY_COLORS_BORDER = CATEGORY_COLORS.map(c => c.replace('0.8)', '1)'));

// --- Bucketed stacked data ---

const getBucketKey = (date, bucket) => {
  const d = new Date(date);
  let key;

  if (bucket === 'day') {
    key = d.toISOString().split('T')[0];
  } else if (bucket === 'week') {
    // ISO week: find Monday of that week
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.getFullYear(), d.getMonth(), diff);
    key = monday.toISOString().split('T')[0];
  } else if (bucket === 'month') {
    key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  } else {
    const q = Math.floor(d.getMonth() / 3) + 1;
    key = `${d.getFullYear()}-Q${q}`;
  }

  // Clip keys to the currently selected startDate to prevent out-of-bounds grouping
  const limitDate = props.modelValue.startDate;
  if (!limitDate) return key;

  if (bucket === 'week') {
    if (key < limitDate) return limitDate;
  }
  // Month and Quarter buckets are usually coarse enough not to need tight clipping visually,
  // but day/week should definitely bounded. Day is intrinsically bound by the transactions shown.

  return key;
};

const getBucketLabel = (key, bucket) => {
  if (bucket === 'day') {
    const d = new Date(key + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else if (bucket === 'week') {
    // key is YYYY-MM-DD (Monday)
    const d = new Date(key + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else if (bucket === 'month') {
    const [y, m] = key.split('-');
    const d = new Date(parseInt(y), parseInt(m) - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  } else {
    return key; // e.g. "2026-Q1"
  }
};

// Transactions filtered to the current date selection (for chart display)
const chartTransactions = computed(() => {
  const startDate = props.modelValue.startDate;  // 'YYYY-MM-DD' or ''
  const endDate = props.modelValue.endDate;      // 'YYYY-MM-DD' or ''
  if (!startDate && !endDate) return props.transactions;

  return props.transactions.filter(tx => {
    // Compare date-only strings to avoid timezone issues
    const txDate = tx.date.split('T')[0]; // handle both 'YYYY-MM-DD' and 'YYYY-MM-DDTHH:MM:SS'
    if (startDate && txDate < startDate) return false;
    if (endDate && txDate > endDate) return false;
    return true;
  });
});

const stackedBuckets = computed(() => {
  const bucket = activeBucket.value;
  const bucketMap = {}; // key -> { category -> amount }
  const allCategories = new Set();

  // Only spending transactions (amount < 0, not deleted, not transfers)
  chartTransactions.value.forEach(tx => {
    if (tx.amount < 0 && !tx.deleted && !tx.transferaccountid) {
      const key = getBucketKey(tx.date, bucket);
      const cat = tx.categoryname || 'Uncategorized';
      allCategories.add(cat);
      if (!bucketMap[key]) bucketMap[key] = {};
      if (!bucketMap[key][cat]) bucketMap[key][cat] = 0;
      bucketMap[key][cat] += Math.abs(tx.amount) / 1000;
    }
  });

  const sortedKeys = Object.keys(bucketMap).sort();
  const categories = Array.from(allCategories).sort();

  return { bucketMap, sortedKeys, categories };
});

const chartData = computed(() => {
  const { bucketMap, sortedKeys, categories } = stackedBuckets.value;
  const bucket = activeBucket.value;

  const labels = sortedKeys.map(k => getBucketLabel(k, bucket));

  const datasets = categories.map((cat, idx) => ({
    label: cat,
    data: sortedKeys.map(k => (bucketMap[k][cat] || 0)),
    backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
    borderColor: CATEGORY_COLORS_BORDER[idx % CATEGORY_COLORS_BORDER.length],
    borderWidth: 1,
    borderRadius: 2,
    barPercentage: 0.85,
    categoryPercentage: 0.8,
  }));

  return { labels, datasets };
});

// Compute totals per bucket for the top label
const bucketTotals = computed(() => {
  const { bucketMap, sortedKeys } = stackedBuckets.value;
  return sortedKeys.map(k => {
    const cats = bucketMap[k];
    return Object.values(cats).reduce((s, v) => s + v, 0);
  });
});

const formatCompact = (val) => {
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
  return `$${val.toFixed(0)}`;
};

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: {
      top: 15
    }
  },
  animation: { duration: 300 },
  interaction: {
    mode: 'index',
    intersect: false
  },
  onHover: (event, chartElement, chart) => {
    const activeElements = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, false);
    event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
  },
  onClick: (event, elements, chart) => {
    // We ignore the default `elements` array because the chart is in 'index' mode
    // which returns all datasets in the current vertical stack.
    // We instead explicitly query exactly what was intersected.
    const activeElements = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, false);
    if (activeElements && activeElements.length > 0) {
      // Get the directly clicked slice segment index
      const element = activeElements[0];
      const datasetIndex = element.datasetIndex;

      // Find the dataset metadata
      const dataset = chart.data.datasets[datasetIndex];

      if (dataset && dataset.label) {
        emit('category-click', dataset.label);
      }
    }
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: false,
      mode: 'index',
      intersect: false,
      itemSort: (a, b) => b.raw - a.raw,
      external: (context) => {
        const { chart, tooltip } = context;
        let tooltipEl = chart.canvas.parentNode.querySelector('.chartjs-tooltip');

        // Create tooltip element on first hover
        if (!tooltipEl) {
          tooltipEl = document.createElement('div');
          tooltipEl.classList.add('chartjs-tooltip');
          tooltipEl.style.cssText = `
            position: absolute;
            pointer-events: auto;
            background: rgba(15, 23, 42, 0.96);
            border: 1px solid #38bdf8;
            border-radius: 6px;
            padding: 10px 12px;
            font-family: Inter, system-ui, sans-serif;
            font-size: 11px;
            color: #cbd5e1;
            transition: opacity 0.15s ease, left 0.1s ease, top 0.1s ease;
            z-index: 100;
            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            max-height: 300px;
            overflow-y: auto;
          `;
          chart.canvas.parentNode.appendChild(tooltipEl);

          // Track hover state so tooltip stays visible while mouse is over it
          tooltipEl._hovered = false;
          tooltipEl.addEventListener('mouseenter', () => {
            tooltipEl._hovered = true;
          });
          tooltipEl.addEventListener('mouseleave', () => {
            tooltipEl._hovered = false;
            tooltipEl.style.opacity = '0';
            tooltipEl.style.pointerEvents = 'none';
          });
        }

        // Hide if Chart.js says tooltip should be hidden, BUT only if mouse isn't on the tooltip
        if (tooltip.opacity === 0) {
          if (!tooltipEl._hovered) {
            tooltipEl.style.opacity = '0';
            tooltipEl.style.pointerEvents = 'none';
          }
          return;
        }

        tooltipEl.style.opacity = '1';
        tooltipEl.style.pointerEvents = 'auto';

        // Build sorted items (by amount descending)
        const items = (tooltip.dataPoints || [])
          .filter(p => p.raw > 0)
          .sort((a, b) => b.raw - a.raw);

        if (items.length === 0) {
          tooltipEl.style.opacity = '0';
          return;
        }

        // Title with total
        const idx = items[0].dataIndex;
        const total = bucketTotals.value[idx];
        let html = `<div style="font-weight:700;color:#e2e8f0;margin-bottom:6px;font-size:12px;border-bottom:1px solid rgba(56,189,248,0.2);padding-bottom:5px">${escHtml(items[0].label)}  ·  Total: $${total.toFixed(2)}</div>`;

        // Category rows
        items.forEach(item => {
          const color = item.dataset.backgroundColor || '#94a3b8';
          const name = escHtml(item.dataset.label);
          const amount = item.raw.toFixed(2);
          html += `<div class="tooltip-cat-row" data-category="${name}" style="display:flex;align-items:center;gap:6px;padding:3px 4px;margin:1px -4px;border-radius:3px;cursor:pointer;transition:background 0.12s">`;
          html += `<span style="width:8px;height:8px;border-radius:2px;background:${color};flex-shrink:0"></span>`;
          html += `<span style="flex:1;color:#93c5fd;text-decoration:underline;text-decoration-color:rgba(147,197,253,0.3);text-underline-offset:2px">${name}</span>`;
          html += `<span style="font-variant-numeric:tabular-nums;color:#cbd5e1;font-weight:600">$${amount}</span>`;
          html += `</div>`;
        });

        html += `<div style="margin-top:5px;font-size:9px;color:#475569;text-align:center">Click a category to filter</div>`;

        tooltipEl.innerHTML = html;

        // Attach click handlers
        tooltipEl.querySelectorAll('.tooltip-cat-row').forEach(row => {
          row.onmouseenter = () => { row.style.background = 'rgba(56,189,248,0.12)'; };
          row.onmouseleave = () => { row.style.background = 'transparent'; };
          row.onclick = (e) => {
            e.stopPropagation();
            const cat = row.getAttribute('data-category');
            if (cat) {
              const idx = items[0].dataIndex;
              openDetailPopup(cat, idx);
              // Hide the tooltip
              tooltipEl.style.opacity = '0';
              tooltipEl.style.pointerEvents = 'none';
            }
          };
        });

        // Position tooltip
        const canvasRect = chart.canvas.getBoundingClientRect();
        const tooltipWidth = tooltipEl.offsetWidth;
        const tooltipHeight = tooltipEl.offsetHeight;

        let left = tooltip.caretX;
        let top = tooltip.caretY - tooltipHeight - 10;

        // Keep within bounds
        if (left + tooltipWidth > canvasRect.width) {
          left = canvasRect.width - tooltipWidth - 5;
        }
        if (left < 0) left = 5;
        if (top < 0) top = tooltip.caretY + 10;

        tooltipEl.style.left = left + 'px';
        tooltipEl.style.top = top + 'px';
      }
    }
  },
  scales: {
    x: {
      stacked: true,
      grid: { color: 'rgba(51, 65, 85, 0.3)', drawBorder: false },
      ticks: {
        color: '#64748b',
        font: { size: 9 },
        maxRotation: 45,
        minRotation: 0,
      },
      border: { display: false }
    },
    y: {
      stacked: true,
      grid: { color: 'rgba(51, 65, 85, 0.2)', drawBorder: false },
      ticks: {
        color: '#64748b',
        font: { size: 9 },
        callback: (val) => formatCompact(val),
      },
      border: { display: false }
    }
  },
}));

// Register a Chart.js plugin for total labels on top of stacked bars
const totalLabelPlugin = {
  id: 'totalBarLabel',
  afterDraw(chart) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(chart.data.datasets.length - 1);
    if (!meta || !meta.data) return;

    ctx.save();
    ctx.font = 'bold 9px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#94a3b8';

    meta.data.forEach((bar, index) => {
      // Compute total for this index
      let total = 0;
      chart.data.datasets.forEach(ds => {
        total += (ds.data[index] || 0);
      });
      if (total > 0) {
        const label = formatCompact(total);
        ctx.fillText(label, bar.x, bar.y - 3);
      }
    });
    ctx.restore();
  }
};

ChartJS.register(totalLabelPlugin);

onUnmounted(() => {
  // Clean up the tooltip DOM element to avoid a memory leak
  const tooltips = document.querySelectorAll('.chartjs-tooltip');
  tooltips.forEach(t => t.remove());
});
</script>

<style scoped>
.date-input {
  background: rgb(30 41 59);
  border: 1px solid rgb(51 65 85);
  color: rgb(148 163 184);
  border-radius: 0.25rem;
  padding: 0.125rem 0.375rem;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  outline: none;
  transition: border-color 0.15s, color 0.15s, background-color 0.15s;
}
.date-input:hover {
  background: rgba(56, 189, 248, 0.1);
  border-color: rgba(56, 189, 248, 0.4);
  color: rgb(125 211 252);
}
.date-input:focus {
  border-color: rgb(56 189 248);
  color: rgb(125 211 252);
}
.date-input::-webkit-calendar-picker-indicator {
  filter: invert(0.6);
  cursor: pointer;
}


</style>
