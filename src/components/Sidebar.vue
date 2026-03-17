<template>
  <div class="p-4 md:p-6 glass-panel flex flex-col h-full overflow-y-auto bg-slate-800 md:bg-slate-800/60">
    <!-- Global Quick Select -->
    <div class="mb-4 flex justify-between items-center bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/50">
      <span class="text-xs uppercase font-bold text-slate-400">Global Selection</span>
      <div class="flex gap-2">
        <button @click="selectAllGlobal" class="text-xs px-2.5 py-1 bg-sky-500/20 text-sky-400 hover:bg-sky-500/40 rounded transition-colors font-semibold border border-sky-500/30">Select All</button>
        <button @click="selectNoneGlobal" class="text-xs px-2.5 py-1 bg-rose-500/20 text-rose-400 hover:bg-rose-500/40 rounded transition-colors font-semibold border border-rose-500/30">Clear All</button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar">

      <!-- STEP 1: By Type -->
      <div v-if="allTypes.length > 0" class="mb-5 bg-slate-900/40 p-3 rounded-lg border border-slate-700/30">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-xs uppercase text-slate-500 font-bold flex items-center gap-2">
            <span class="bg-sky-500/20 text-sky-400 px-1.5 py-0.5 rounded text-[10px]">1</span>
            Filter by Type
          </h4>
          <div class="flex gap-1">
            <button @click="selectAllTypes" class="text-[10px] px-2 py-0.5 bg-slate-800 hover:bg-sky-500/20 text-slate-400 hover:text-sky-300 border border-slate-700 hover:border-sky-500/30 rounded transition-colors uppercase font-semibold">All</button>
            <button @click="selectedTypes = []" class="text-[10px] px-2 py-0.5 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 rounded transition-colors uppercase font-semibold">None</button>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <label
            v-for="type in allTypes"
            :key="'type-'+type"
            class="flex items-center space-x-2 text-sm cursor-pointer group hover:bg-slate-800/50 p-1.5 rounded transition-colors"
            :class="selectedTypes.includes(type) ? 'text-sky-300 font-semibold' : 'text-slate-300'"
          >
            <input
              type="checkbox"
              v-model="selectedTypes"
              :value="type"
              class="form-checkbox h-3.5 w-3.5 rounded bg-slate-900/50 border-slate-600 text-sky-500 focus:ring-sky-500 focus:ring-offset-slate-900 transition-all"
            />
            <span>{{ type }}</span>
          </label>
        </div>
      </div>

      <!-- STEP 2: By Bank -->
      <div v-if="availableBanks.length > 0" class="mb-5 bg-slate-900/40 p-3 rounded-lg border border-slate-700/30">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-xs uppercase text-slate-500 font-bold flex items-center gap-2">
            <span class="bg-sky-500/20 text-sky-400 px-1.5 py-0.5 rounded text-[10px]">2</span>
            Filter by Bank
          </h4>
          <div class="flex gap-1">
            <button @click="selectAllBanks" class="text-[10px] px-2 py-0.5 bg-slate-800 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/30 rounded transition-colors uppercase font-semibold">All</button>
            <button @click="selectedBanks = []" class="text-[10px] px-2 py-0.5 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 rounded transition-colors uppercase font-semibold">None</button>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <label
            v-for="bank in availableBanks"
            :key="'bank-'+bank"
            class="flex items-center space-x-2 text-sm cursor-pointer group hover:bg-slate-800/50 p-1.5 rounded transition-colors"
            :class="selectedBanks.includes(bank) ? 'text-emerald-300 font-semibold' : 'text-slate-300'"
          >
            <input
              type="checkbox"
              v-model="selectedBanks"
              :value="bank"
              class="form-checkbox h-3.5 w-3.5 rounded bg-slate-900/50 border-slate-600 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 transition-all"
            />
            <span>{{ bank }}</span>
          </label>
        </div>
      </div>

      <!-- STEP 3: Specific Accounts -->
      <div v-if="Object.keys(accountsGrouped).length > 0" class="mb-5 bg-slate-900/40 p-3 rounded-lg border border-slate-700/30">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-xs uppercase text-slate-500 font-bold flex items-center gap-2">
            <span class="bg-sky-500/20 text-sky-400 px-1.5 py-0.5 rounded text-[10px]">3</span>
            Specific Accounts
          </h4>
          <div class="flex gap-1">
            <button @click="selectAllAccs" class="text-[10px] px-2 py-0.5 bg-slate-800 hover:bg-violet-500/20 text-slate-400 hover:text-violet-300 border border-slate-700 hover:border-violet-500/30 rounded transition-colors uppercase font-semibold">All</button>
            <button @click="selectedAccs = []" class="text-[10px] px-2 py-0.5 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 rounded transition-colors uppercase font-semibold">None</button>
          </div>
        </div>

        <div v-for="(banks, type) in accountsGrouped" :key="'group-'+type" class="mb-4">
          <h5 class="text-[10px] font-bold text-slate-500 uppercase mb-2 border-b border-slate-700 pb-1">{{ type }}</h5>

          <div v-for="(accounts, bank) in banks" :key="'group-'+bank" class="mb-3 pl-2 border-l border-slate-700/50">
            <h6 class="text-xs font-semibold text-slate-400 mb-1.5 pl-1">{{ bank }}</h6>

            <div class="flex flex-col gap-1 pl-1">
              <label
                v-for="account in accounts"
                :key="account.id"
                class="flex items-center space-x-2 text-sm cursor-pointer group hover:bg-slate-800/50 p-1 rounded transition-colors"
              >
                <input
                  type="checkbox"
                  v-model="selectedAccs"
                  :value="account.id"
                  class="form-checkbox h-3.5 w-3.5 rounded bg-slate-900/50 border-slate-600 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900 transition-all"
                />
                <span class="text-slate-300 group-hover:text-white truncate flex-1 text-xs" :title="account.rawName">{{ account.shortName }}</span>
                <span v-if="getQuarterWarning(account)" class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold" :title="getQuarterWarning(account)">!</span>
                <span class="text-[10px] font-mono" :class="account.balance < 0 ? 'text-red-400/80' : 'text-emerald-400/80'">
                  ${{ Math.abs(account.balance).toFixed(0) }}
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div v-if="Object.keys(accountsGrouped).length === 0" class="text-sm text-slate-500 italic p-3 text-center opacity-70">
        Select a filter above to see accounts.
      </div>

    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { parseAccountName } from '../utils';

const props = defineProps({
  accounts: { type: Array, required: true },
  modelValue: { type: Object, required: true },
  quarterSpending: { type: Object, default: () => ({}) }
});
const emit = defineEmits(['update:modelValue']);

// Local quick filter states
const selectedTypes = ref([]);
const selectedBanks = ref([]);
const selectedAccs = ref([]); // Local array of specific account IDs selected

// Extract parsed accounts
const parsedAccounts = computed(() => {
  return props.accounts.map(acc => {
    const { type, bank, shortName } = parseAccountName(acc.name);
    return { ...acc, id: acc.id, type, bank, shortName, rawName: acc.name };
  });
});

// Step 1: All available Types
const allTypes = computed(() => {
  const types = new Set(parsedAccounts.value.map(a => a.type));
  return Array.from(types).sort();
});

// Step 2: Available Banks (Filtered by selectedTypes)
const availableBanks = computed(() => {
  const filtered = parsedAccounts.value.filter(a =>
    selectedTypes.value.length === 0 ? true : selectedTypes.value.includes(a.type)
  );
  const banks = new Set(filtered.map(a => a.bank));
  return Array.from(banks).sort();
});

// Step 3: Available Accounts (Filtered by selectedTypes AND selectedBanks)
const availableAccounts = computed(() => {
  return parsedAccounts.value.filter(a => {
    const typeMatch = selectedTypes.value.length === 0 ? true : selectedTypes.value.includes(a.type);
    const bankMatch = selectedBanks.value.length === 0 ? true : selectedBanks.value.includes(a.bank);
    return typeMatch && bankMatch;
  });
});

// Group available accounts by Type -> Bank for cleaner UI rendering
const accountsGrouped = computed(() => {
  const groups = {};
  availableAccounts.value.forEach(a => {
    if (!groups[a.type]) groups[a.type] = {};
    if (!groups[a.type][a.bank]) groups[a.type][a.bank] = [];
    groups[a.type][a.bank].push(a);
  });
  return groups;
});

// Select All Actions
const selectAllTypes = () => {
  selectedTypes.value = [...allTypes.value];
};

const selectAllBanks = () => {
  selectedBanks.value = [...availableBanks.value];
};

const selectAllAccs = () => {
  selectedAccs.value = availableAccounts.value.map(a => a.id);
};

const selectAllGlobal = () => {
  selectedTypes.value = [...new Set(parsedAccounts.value.map(a => a.type))];
  selectedBanks.value = [...new Set(parsedAccounts.value.map(a => a.bank))];
  selectedAccs.value = parsedAccounts.value.map(a => a.id);
};

const selectNoneGlobal = () => {
  selectedTypes.value = [];
  selectedBanks.value = [];
  selectedAccs.value = [];
};

// Calculate final filtered IDs to emit to App.vue
watch([selectedTypes, selectedBanks, selectedAccs], () => {
  // If ALL local filter selections are completely empty, "we select nothing"
  if (selectedTypes.value.length === 0 && selectedBanks.value.length === 0 && selectedAccs.value.length === 0) {
    emit('update:modelValue', { ...props.modelValue, selectedAccounts: [] });
    return;
  }

  // Otherwise, calculate the actual selected accounts using strict AND logic.
  // Note: if a user selects a Bank, ALL accounts under that Bank match.
  // BUT the user only sees availableAccounts. The specific `selectedAccs` is considered:
  // "If `selectedAccs` is active, you ONLY see those specific accounts".
  // Let's implement strict AND:
  const finalIds = parsedAccounts.value.filter(a => {
    const tMatch = selectedTypes.value.length === 0 ? true : selectedTypes.value.includes(a.type);
    const bMatch = selectedBanks.value.length === 0 ? true : selectedBanks.value.includes(a.bank);
    const aMatch = selectedAccs.value.length === 0 ? true : selectedAccs.value.includes(a.id);
    return tMatch && bMatch && aMatch;
  }).map(a => a.id);

  emit('update:modelValue', { ...props.modelValue, selectedAccounts: finalIds });
}, { deep: true });

// Quarter limit warning check
const getQuarterWarning = (account) => {
  const qs = props.quarterSpending;
  if (!qs) return null;
  const info = qs[account.id];
  if (!info || !info.limit) return null;
  if (info.spent > info.limit) {
    return `Quarter spending $${info.spent.toFixed(0)} exceeds limit $${info.limit.toFixed(0)}`;
  }
  return null;
};

// Select all by default on initial load
const initializedGlobal = ref(false);
watch(parsedAccounts, (val) => {
  if (!initializedGlobal.value && val.length > 0) {
    initializedGlobal.value = true;
    selectAllGlobal();
  }
}, { immediate: true });

// Sync external resets
watch(() => props.modelValue.selectedAccounts, (newVal) => {
  if (newVal.length === 0 && initializedGlobal.value) {
    // Just visual sync if it's cleared from outside
    if (selectedTypes.value.length || selectedBanks.value.length || selectedAccs.value.length) {
      selectedTypes.value = [];
      selectedBanks.value = [];
      selectedAccs.value = [];
    }
  }
}, { immediate: true });
</script>

