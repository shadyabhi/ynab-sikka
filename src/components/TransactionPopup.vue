<template>
  <Teleport to="body">
    <div v-if="visible" class="detail-overlay" @click.self="closePopup">
      <div class="detail-panel">
        <div class="detail-header">
          <div class="detail-title">
            <span v-if="color" class="detail-color-dot" :style="{ background: color }"></span>
            <span>{{ title }}</span>
            <span v-if="subtitle" class="detail-bucket-label">{{ subtitle }}</span>
          </div>
          <div class="detail-header-right">
            <button v-if="showCategoryFilter" class="detail-filter-btn" @click="filterCategory">
              {{ filterBtnText || 'Filter by this category' }}
            </button>
            <button class="detail-close-btn" @click="closePopup">&times;</button>
          </div>
        </div>
        <div class="detail-summary">
          {{ transactions.length }} transaction{{ transactions.length !== 1 ? 's' : '' }}
          · Total: <strong>${{ total }}</strong>
        </div>
        <div class="detail-table-wrap">
          <table class="detail-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Payee</th>
                <th>Account Name</th>
                <th>Memo</th>
                <th class="amt">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(tx, i) in transactions" :key="i">
                <td class="nowrap">{{ formatDate(tx.date) || '—' }}</td>
                <td>{{ tx.payeename || '—' }}</td>
                <td>
                  <span class="account-link" @click="filterAccount(tx.accountname)" title="Filter by this account">
                    {{ formatAccountName(tx.accountname) }}
                  </span>
                </td>
                <td class="memo-cell">{{ tx.memo || '—' }}</td>
                <td class="amt">${{ formatAmount(tx.amount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { formatAccountName, formatDate, formatAmount } from '../utils';

const props = defineProps({
  visible: Boolean,
  title: String,
  subtitle: String,
  color: String,
  transactions: {
    type: Array,
    default: () => []
  },
  total: [String, Number],
  showCategoryFilter: {
    type: Boolean,
    default: true
  },
  filterBtnText: String,
});

const emit = defineEmits(['close', 'filter-category', 'filter-account']);

const closePopup = () => emit('close');
const filterCategory = () => emit('filter-category');
const filterAccount = (acc) => emit('filter-account', acc);

const onKeyDown = (e) => {
  if (e.key === 'Escape' && props.visible) {
    closePopup();
  }
};

onMounted(() => window.addEventListener('keydown', onKeyDown));
onUnmounted(() => window.removeEventListener('keydown', onKeyDown));
</script>

<style scoped>
.detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  animation: fadeIn 0.15s ease;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.detail-panel {
  background: rgba(15, 23, 42, 0.97);
  border: 1px solid rgba(56, 189, 248, 0.35);
  border-radius: 10px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(56, 189, 248, 0.08);
  width: 90vw;
  max-width: 640px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: Inter, system-ui, sans-serif;
  animation: slideUp 0.2s ease;
}
@keyframes slideUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px 10px;
  border-bottom: 1px solid rgba(56, 189, 248, 0.15);
  gap: 12px;
}
.detail-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: #e2e8f0;
}
.detail-color-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex-shrink: 0;
}
.detail-bucket-label {
  font-weight: 500;
  font-size: 12px;
  color: #64748b;
  margin-left: 4px;
}
.detail-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.detail-filter-btn {
  background: rgba(56, 189, 248, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #7dd3fc;
  border-radius: 4px;
  padding: 3px 10px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.detail-filter-btn:hover {
  background: rgba(56, 189, 248, 0.2);
  border-color: rgba(56, 189, 248, 0.6);
  color: #bae6fd;
}
.detail-close-btn {
  background: none;
  border: none;
  color: #64748b;
  font-size: 22px;
  cursor: pointer;
  line-height: 1;
  padding: 0 2px;
  transition: color 0.15s;
}
.detail-close-btn:hover {
  color: #f87171;
}

.detail-summary {
  padding: 8px 18px;
  font-size: 11px;
  color: #94a3b8;
}
.detail-summary strong {
  color: #e2e8f0;
}

.detail-table-wrap {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  padding: 0 18px 14px;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.detail-table thead th {
  position: sticky;
  top: 0;
  background: rgba(15, 23, 42, 0.98);
  text-align: left;
  padding: 6px 8px;
  color: #64748b;
  font-weight: 700;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid rgba(51, 65, 85, 0.5);
}
.detail-table tbody tr {
  transition: background 0.1s;
}
.detail-table tbody tr:hover {
  background: rgba(56, 189, 248, 0.06);
}
.detail-table td {
  padding: 6px 8px;
  color: #cbd5e1;
  border-bottom: 1px solid rgba(51, 65, 85, 0.25);
}
.detail-table .amt {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  white-space: nowrap;
}
.detail-table .nowrap {
  white-space: nowrap;
}
.detail-table .memo-cell {
  color: #94a3b8;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.detail-table .account-link {
  color: #7dd3fc;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: rgba(125, 211, 252, 0.3);
  text-underline-offset: 2px;
  transition: color 0.15s, text-decoration-color 0.15s;
}
.detail-table .account-link:hover {
  color: #bae6fd;
  text-decoration-color: #bae6fd;
}
</style>
