<template>
  <div class="glass-panel h-full flex flex-col">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
      <div class="flex items-center gap-3">
        <h2 v-if="!hasUnapprovedToggle" class="text-xl font-bold neon-text text-sky-400">Transactions</h2>
        <div v-else class="flex bg-slate-900/50 rounded-lg p-1 border border-slate-700/50 shadow-inner">
          <button
            @click="$emit('update:mode', 'all')"
            :class="mode === 'all' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/20 shadow-sm' : 'text-slate-400 hover:text-slate-300'"
            class="px-3 py-1.5 rounded-md text-sm font-semibold transition-all"
          >
            All <span class="hidden md:inline">Transactions</span>
          </button>
          <button
            @click="$emit('update:mode', 'unapproved')"
            :class="mode === 'unapproved' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20 shadow-sm' : 'text-slate-400 hover:text-slate-300'"
            class="px-3 py-1.5 rounded-md text-sm font-semibold transition-all flex items-center gap-1.5"
          >
            Unapproved
            <span v-if="unapprovedCount > 0" class="bg-rose-500/90 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">{{unapprovedCount}}</span>
          </button>
        </div>

        <button
          v-if="showMagicIcon && mode === 'unapproved'"
          @click="$emit('magic-approve')"
          class="p-1 px-1.5 text-purple-400 hover:text-white hover:bg-purple-600 rounded-lg transition-all shadow-[0_0_10px_rgba(168,85,247,0.2)] hover:shadow-[0_0_15px_rgba(168,85,247,0.6)] flex items-center gap-1.5 group"
          title="Auto-Approve Transfers"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          <span class="text-xs font-semibold uppercase tracking-wider hidden md:block">AI Approve</span>
        </button>

        <button
          v-if="mode === 'unapproved' && selectedIds.size > 0"
          @click="$emit('approve-selected', [...selectedIds])"
          class="p-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all shadow-[0_0_10px_rgba(52,211,153,0.3)] flex items-center gap-1.5"
          title="Approve Selected"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span class="text-xs font-semibold">Approve {{ selectedIds.size }}</span>
        </button>
      </div>

      <div class="flex flex-wrap md:flex-nowrap items-center gap-4 w-full md:w-auto">
        <div class="flex items-center gap-2 w-full md:w-auto">
          <div class="relative w-full md:w-72">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              v-model="localQuery"
              placeholder="Search name, category, or card..."
              class="w-full bg-slate-900/60 border border-slate-700/80 rounded-full py-2 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all placeholder-slate-500 shadow-inner"
            />
          </div>
          <button
            @click="$emit('toggle-maximize')"
            class="p-2 text-slate-400 hover:text-sky-300 hover:bg-slate-800/50 rounded-lg transition-colors flex-shrink-0"
            :title="isMaximized ? 'Restore' : 'Maximize'"
          >
            <svg v-if="!isMaximized" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
            </svg>
            <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 14h6m0 0v6m0-6l-7 7m17-11h-6m0 0V4m0 6l7-7M4 10h6m0 0V4m0 6l-7-7m17 11h-6m0 0v6m0-6l7 7"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Quick Filters -->
    <div class="mb-4 flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2 pt-1 px-1">
      <span class="text-[9px] uppercase font-bold text-slate-500 tracking-wider mr-1 flex-shrink-0">Quick Filters</span>

      <!-- Quick Category Filters -->
      <button
        v-for="cat in quickFiltersCategories"
        :key="cat"
        @click="toggleQuickFilter(cat)"
        class="px-2 py-0.5 rounded border transition-all text-[10px] font-semibold whitespace-nowrap flex-shrink-0"
        :class="getQuickFilterBtnClass(cat)"
      >{{ cat }}</button>
    </div>

    <div class="flex-1 overflow-auto rounded-xl border border-slate-700/50 custom-scrollbar relative">
      <table class="w-full text-left text-xs md:text-sm text-slate-300 table-fixed" style="min-width: 700px;">
        <thead class="text-xs text-sky-300 uppercase bg-slate-800/80 sticky top-0 backdrop-blur-md z-10 shadow-sm">
          <tr>
            <th v-if="mode === 'unapproved'" class="px-2 py-3 w-10 text-center">
              <input
                type="checkbox"
                :checked="selectedIds.size > 0 && selectedIds.size === filteredTransactions.length"
                :indeterminate="selectedIds.size > 0 && selectedIds.size < filteredTransactions.length"
                @change="toggleSelectAll"
                class="rounded bg-slate-700 border-slate-600 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
              />
            </th>
            <th
              v-for="col in columns"
              :key="col.field"
              class="px-4 py-3 align-top relative group/th"
              :style="{ width: columnWidths[col.field] + 'px' }"
            >
              <div
                class="cursor-pointer hover:text-sky-200 transition-colors mb-2 flex items-center justify-between"
                :class="{ 'justify-end gap-1': col.alignRight }"
                @click="sortBy(col.field)"
              >
                {{ col.label }} <span v-if="sortField === col.field" class="text-[10px]">{{ sortOrder === 1 ? '▲' : '▼' }}</span>
              </div>
              <div
                class="w-full bg-slate-900/60 border border-slate-700/80 rounded px-1.5 py-1 min-h-[30px] flex flex-wrap gap-1 items-center cursor-text"
                :class="{ 'justify-end': col.alignRight }"
                @click="focusInput(col.field)"
              >
                <span v-for="(tag, i) in localColumnFilters[col.field].tags" :key="i" class="flex items-center gap-1 bg-sky-500/30 text-sky-200 px-1.5 py-0.5 rounded-sm text-[10px] max-w-full" :title="tag">
                  <span class="truncate">{{ tag }}</span>
                  <button @click.stop="removeTag(col.field, i)" class="hover:text-rose-400 hover:bg-slate-900/50 rounded-full w-3 h-3 flex-shrink-0 flex items-center justify-center">&times;</button>
                </span>
                <input
                  type="text"
                  :ref="el => inputRefs[col.field] = el"
                  v-model="localColumnFilters[col.field].text"
                  @keydown.enter="addTagFromInput(col.field)"
                  @keydown.delete="handleBackspace(col.field)"
                  placeholder="Filter..."
                  class="flex-1 w-full min-w-[30px] bg-transparent border-none p-0 text-xs text-slate-200 focus:outline-none focus:ring-0 placeholder-slate-500"
                  :class="{ 'text-right': col.alignRight }"
                  @click.stop
                />
              </div>
              <!-- Resizer -->
              <div
                v-if="!col.noResize"
                class="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-sky-500/50 active:bg-sky-500 transition-colors z-20"
                @mousedown.prevent="startResize(col.field, $event)"
              ></div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filteredTransactions.length === 0">
            <td :colspan="mode === 'unapproved' ? 7 : 6" class="px-4 py-8 text-center text-slate-500 italic bg-slate-900/30">
              No transactions found matching criteria.
            </td>
          </tr>
          <tr
            v-for="tx in filteredTransactions"
            :key="tx.id"
            class="border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors group"
            :class="{ 'bg-purple-900/10 shadow-[inset_3px_0_0_rgba(168,85,247,0.5)]': tx.transferaccountid }"
          >
            <td v-if="mode === 'unapproved'" class="px-2 py-3 text-center w-10">
              <input
                type="checkbox"
                :checked="selectedIds.has(tx.id)"
                @change="toggleSelect(tx.id)"
                class="rounded bg-slate-700 border-slate-600 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
              />
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-slate-400 group-hover:text-slate-300 cursor-pointer hover:bg-slate-700/30 transition-colors truncate" @click.stop="addTag('date', formatDate(tx.date))">{{ formatDate(tx.date) }}</td>
            <td class="px-4 py-3 font-medium text-slate-200 cursor-pointer hover:bg-slate-700/30 transition-colors truncate" @click.stop="addTag('payeename', tx.payeename)">{{ tx.payeename }}</td>
            <td class="px-4 py-3 text-slate-400 text-xs flex items-center gap-2 cursor-pointer hover:bg-slate-700/30 transition-colors truncate" @click.stop="addTag('accountname', formatAccountName(tx.accountname))">
              <span class="w-2 h-2 rounded-full flex-shrink-0" :class="tx.amount > 0 ? 'bg-emerald-500' : 'bg-rose-500'"></span>
              <span class="truncate">{{ formatAccountName(tx.accountname) }}</span>
            </td>
            <td class="px-4 py-3 text-slate-400 cursor-pointer hover:bg-slate-700/30 transition-colors truncate" @click.stop="addTag('categoryname', tx.categoryname)">
               <span class="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-md text-xs pointer-events-none truncate inline-block max-w-full">{{ tx.categoryname }}</span>
            </td>
            <td class="px-4 py-3 text-slate-400 text-xs cursor-pointer hover:bg-slate-700/30 transition-colors truncate" @click.stop="addTag('memo', tx.memo)">
              <span class="truncate" :title="tx.memo">{{ tx.memo || '' }}</span>
            </td>
            <td class="px-4 py-3 text-right font-mono font-medium cursor-pointer hover:bg-slate-700/30 transition-colors truncate" :class="tx.amount > 0 ? 'text-emerald-400' : 'text-slate-200'" @click.stop="addTag('amount', formatAmount(tx.amount))">
              ${{ formatAmount(tx.amount) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-4 text-xs text-slate-500 flex justify-between items-center">
      <span>Showing {{ filteredTransactions.length }} transactions</span>
      <span class="text-slate-400">Total: <span class="font-mono text-white text-sm ml-1">${{ totalFiltered.toFixed(2) }}</span></span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onUnmounted } from 'vue';
import { formatAccountName, formatAmount, formatDate, makeEmptyColumnFilters } from '../utils';

const inputRefs = ref({});
const focusInput = (field) => {
  if (inputRefs.value[field]) {
    inputRefs.value[field].focus();
  }
};

const columns = [
  { field: 'date', label: 'Date' },
  { field: 'payeename', label: 'Payee' },
  { field: 'accountname', label: 'Account Name' },
  { field: 'categoryname', label: 'Category' },
  { field: 'memo', label: 'Memo' },
  { field: 'amount', label: 'Amount', alignRight: true, noResize: true }
];

// --- Column Resizing State ---
const columnWidths = ref({
  date: 150,
  payeename: 200,
  accountname: 180,
  categoryname: 180,
  memo: 150,
  amount: 120
});

const resizingCol = ref(null);
const startX = ref(0);
const startWidth = ref(0);

const startResize = (colId, event) => {
  resizingCol.value = colId;
  startX.value = event.clientX;
  startWidth.value = columnWidths.value[colId];

  // Attach events to window so it tracks correctly even if mouse leaves the th header
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  // Optional: add a class to body to indicate dragging state (prevents text selection)
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
};

const onMouseMove = (event) => {
  if (!resizingCol.value) return;
  const deltaX = event.clientX - startX.value;
  const newWidth = Math.max(80, startWidth.value + deltaX); // Min width 80px
  columnWidths.value[resizingCol.value] = newWidth;
};

const onMouseUp = () => {
  resizingCol.value = null;
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);

  // Revert body styles
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
};

onUnmounted(() => {
  // Defensive cleanup
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
});

const selectedIds = ref(new Set());

const toggleSelect = (id) => {
  const next = new Set(selectedIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selectedIds.value = next;
};

const toggleSelectAll = () => {
  if (selectedIds.value.size === filteredTransactions.value.length) {
    selectedIds.value = new Set();
  } else {
    selectedIds.value = new Set(filteredTransactions.value.map(tx => tx.id));
  }
};

const props = defineProps({
  transactions: {
    type: Array,
    required: true
  },
  searchQuery: {
    type: String,
    default: ''
  },
  columnFilters: {
    type: Object,
    default: () => makeEmptyColumnFilters()
  },
  quickCategoryFilters: {
    type: Object,
    default: () => ({})
  },
  categoryGroups: {
    type: Array,
    default: () => []
  },
  isMaximized: {
    type: Boolean,
    default: false
  },
  showMagicIcon: {
    type: Boolean,
    default: false
  },
  mode: {
    type: String,
    default: 'all'
  },
  hasUnapprovedToggle: {
    type: Boolean,
    default: false
  },
  unapprovedCount: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits([
  'update:searchQuery',
  'update:columnFilters',
  'update:quickCategoryFilters',
  'toggle-maximize',
  'magic-approve',
  'approve-selected',
  'update:mode'
]);

const localQuery = computed({
  get: () => props.searchQuery,
  set: (val) => emit('update:searchQuery', val)
});

const localColumnFilters = computed({
  get: () => props.columnFilters,
  set: (val) => emit('update:columnFilters', val)
});

const quickFiltersCategories = computed(() => {
   return props.categoryGroups
      .filter(group => !group.hidden && !group.deleted)
      .map(group => group.name)
      .sort((a, b) => a.localeCompare(b));
});

const toggleQuickFilter = (categoryName) => {
  const current = props.quickCategoryFilters[categoryName] || 'neutral';
  let next = 'neutral';
  if (current === 'neutral') next = 'include';
  else if (current === 'include') next = 'exclude';
  else if (current === 'exclude') next = 'neutral';

  emit('update:quickCategoryFilters', {
    ...props.quickCategoryFilters,
    [categoryName]: next
  });
};

const getQuickFilterBtnClass = (categoryName) => {
  const state = props.quickCategoryFilters[categoryName] || 'neutral';
  if (state === 'include') {
    return 'bg-emerald-500/25 border-emerald-500 text-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.2)]';
  } else if (state === 'exclude') {
    return 'bg-rose-500/25 border-rose-500 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.2)]';
  } else {
    return 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-300 hover:border-slate-500';
  }
};

const sortField = ref('date');
const sortOrder = ref(-1); // -1 for desc, 1 for asc

const sortBy = (field) => {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value * -1;
  } else {
    sortField.value = field;
    sortOrder.value = -1;
  }
};

// Multi-select Bubble Actions
const addTag = (field, value) => {
  if (value === undefined || value === null) return;
  const valStr = String(value).trim();
  if (!valStr) return;

  const currentFilters = { ...localColumnFilters.value };

  // Ensure the field exists and has the correct structure (graceful upgrade)
  if (!currentFilters[field] || typeof currentFilters[field] === 'string') {
     currentFilters[field] = { text: '', tags: [] };
  }

  const isDuplicate = currentFilters[field].tags.includes(valStr);
  const newTags = isDuplicate
    ? currentFilters[field].tags
    : [...currentFilters[field].tags, valStr];

  // We emit a completely new object to trigger Vue reactivity properly down the line
  localColumnFilters.value = {
    ...currentFilters,
    [field]: {
      ...currentFilters[field],
      text: '', // clear text input whenever a tag is added/selected
      tags: newTags
    }
  };
};


const removeTag = (field, index) => {
  const currentFilters = { ...localColumnFilters.value };
  if (currentFilters[field] && currentFilters[field].tags) {
     const newTags = [...currentFilters[field].tags];
     newTags.splice(index, 1);
     localColumnFilters.value = {
        ...currentFilters,
        [field]: {
           ...currentFilters[field],
           tags: newTags
        }
     };
  }
};

const addTagFromInput = (field) => {
  const currentFilters = { ...localColumnFilters.value };
  if (currentFilters[field] && currentFilters[field].text) {
     addTag(field, currentFilters[field].text);
  }
};

const handleBackspace = (field) => {
  const currentFilters = { ...localColumnFilters.value };
  if (currentFilters[field] && !currentFilters[field].text && currentFilters[field].tags && currentFilters[field].tags.length > 0) {
     const newTags = [...currentFilters[field].tags];
     newTags.pop();
     localColumnFilters.value = {
        ...currentFilters,
        [field]: {
           ...currentFilters[field],
           tags: newTags
        }
     };
  }
};

const filteredTransactions = computed(() => {
  let result = props.transactions;

  // Sort
  result = [...result].sort((a, b) => {
    let valA = a[sortField.value];
    let valB = b[sortField.value];

    if (sortField.value === 'payeename' || sortField.value === 'accountname' || sortField.value === 'categoryname' || sortField.value === 'memo') {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
        return valA < valB ? -1 * sortOrder.value : (valA > valB ? 1 * sortOrder.value : 0);
    }

    if (sortField.value === 'date') {
        valA = String(valA || '');
        valB = String(valB || '');
        return valA < valB ? -1 * sortOrder.value : (valA > valB ? 1 * sortOrder.value : 0);
    }

    if (sortField.value === 'amount') {
        valA = Math.abs(valA || 0);
        valB = Math.abs(valB || 0);
        return (valA - valB) * sortOrder.value;
    }

    return 0;
  });

  return result;
});

const totalFiltered = computed(() => {
  const totalMilliunits = filteredTransactions.value.reduce((sum, tx) => {
    // Exclude transfers from the total sum
    if (tx.transferaccountid) {
        return sum;
    }
    return sum + (tx.amount || 0);
  }, 0);
  return totalMilliunits / 1000;
});
</script>

