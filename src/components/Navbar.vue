<template>
  <div>
    <nav class="bg-slate-900 border-b border-slate-700/50 px-6 py-3 flex items-center justify-between relative z-20">
      <div class="flex items-center gap-8">
        <h1 class="text-xl font-bold neon-text text-sky-400">YNAB Tracker</h1>

        <div class="flex items-center gap-4">
          <a
            href="#"
            @click.prevent="navigate('analytics')"
            :class="currentPage === 'analytics' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-slate-200'"
            class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
          >
            Analytics
          </a>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <span v-if="lastSyncTime" class="text-xs text-slate-500">
          Synced {{ syncAgo }}
        </span>

        <!-- Pull: delta sync (down arrow) -->
        <div class="relative group">
          <button
            @click="onPull"
            :disabled="syncing"
            class="p-2 text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg class="w-5 h-5" :class="syncing && syncMode === 'pull' ? 'animate-bounce' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
            </svg>
          </button>
          <div class="tooltip">Pull changes</div>
        </div>

        <!-- Force sync: nuke cache + full re-fetch (circular arrows with bolt) -->
        <div class="relative group">
          <button
            @click="onForceSync"
            :disabled="syncing"
            class="p-2 text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg class="w-5 h-5" :class="syncing && syncMode === 'force' ? 'animate-spin' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 10l-1 4h2l-1 4" />
            </svg>
          </button>
          <div class="tooltip">Force full sync</div>
        </div>

        <button
          @click="emit('open-settings')"
          class="p-2 text-slate-400 hover:text-sky-300 hover:bg-slate-800/50 rounded-lg transition-colors"
          title="Settings"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </nav>

    <!-- Sync Log Panel -->
    <transition name="slide">
      <div v-if="showLog" class="bg-slate-950 border-b border-slate-700/50 px-6 py-3 relative z-10">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold uppercase text-slate-500 tracking-wider">Sync Log</span>
          <button @click="showLog = false" class="text-slate-500 hover:text-slate-300 text-xs px-2 py-0.5 rounded hover:bg-slate-800 transition-colors">dismiss</button>
        </div>
        <div class="flex flex-col gap-1.5">
          <div
            v-for="(entry, i) in syncLog"
            :key="i"
            class="flex items-center gap-3 text-xs font-mono"
          >
            <span v-if="entry.cached" class="w-16 text-right text-slate-600">cached</span>
            <span v-else class="w-16 text-right text-sky-400">{{ entry.latencyMs }}ms</span>

            <span class="text-slate-500 truncate max-w-md" :title="entry.endpoint">{{ shortEndpoint(entry.endpoint) }}</span>

            <span class="text-slate-400">
              <span class="text-emerald-400 font-semibold">{{ entry.records }}</span>
              <span class="text-slate-600"> records</span>
              <template v-if="entry.delta">
                <span class="text-slate-600"> (delta, </span>
                <span class="text-slate-400">{{ entry.total }} total</span>
                <span class="text-slate-600">)</span>
              </template>
            </span>

            <span v-if="entry.cached" class="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-500 border border-slate-700/50">HIT</span>
            <span v-else class="px-1.5 py-0.5 rounded text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20">FETCH</span>
          </div>

          <div v-if="syncing && syncLog.length === 0" class="text-xs text-slate-500 italic">Connecting to YNAB API...</div>

          <div v-if="syncError" class="flex items-center gap-2 text-xs mt-1">
            <span class="px-1.5 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 border border-red-500/20">ERROR</span>
            <span class="text-red-400">{{ syncError }}</span>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  currentPage: { type: String, default: 'analytics' },
  lastSyncTime: { type: Number, default: null },
  syncing: { type: Boolean, default: false },
  syncLog: { type: Array, default: () => [] },
  syncError: { type: String, default: null }
});

const emit = defineEmits(['navigate', 'open-settings', 'pull', 'force-sync']);

const showLog = ref(false);
const syncMode = ref(null); // 'pull' or 'force'

const navigate = (page) => {
  emit('navigate', page);
};

const onPull = () => {
  syncMode.value = 'pull';
  showLog.value = true;
  emit('pull');
};

const onForceSync = () => {
  syncMode.value = 'force';
  showLog.value = true;
  emit('force-sync');
};

// Auto-hide log 4 seconds after sync completes
watch(() => props.syncing, (isSyncing, wasSyncing) => {
  if (!isSyncing && wasSyncing) {
    setTimeout(() => {
      showLog.value = false;
      syncMode.value = null;
    }, 4000);
  }
});

const syncAgo = computed(() => {
  if (!props.lastSyncTime) return '';
  const mins = Math.round((Date.now() - props.lastSyncTime) / 60000);
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 min ago';
  return `${mins} min ago`;
});

function shortEndpoint(ep) {
  if (!ep) return '';
  return ep.replace(/\/budgets\/[a-f0-9-]+\//, '');
}
</script>

<style scoped>
.neon-text {
  text-shadow: 0 0 10px rgba(56, 189, 248, 0.4);
}
.tooltip {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  white-space: nowrap;
  font-size: 11px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 6px;
  background: #1e293b;
  color: #cbd5e1;
  border: 1px solid #334155;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease, transform 0.15s ease;
  transform: translateX(-50%) translateY(8px);
  z-index: 50;
}
.tooltip::before {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-bottom-color: #334155;
}
.group:hover .tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(4px);
}
.slide-enter-active, .slide-leave-active {
  transition: all 0.25s ease;
}
.slide-enter-from, .slide-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.slide-enter-to, .slide-leave-from {
  opacity: 1;
  max-height: 200px;
}
</style>
