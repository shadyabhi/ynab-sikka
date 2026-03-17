<template>
  <div class="glass-panel h-full flex flex-col overflow-hidden">
    <div class="flex justify-between items-center w-full mb-4 md:mb-6 gap-2 md:gap-4">
      <div class="flex items-center gap-2 md:gap-4 min-w-0">
        <h2 class="text-base md:text-xl font-bold neon-text text-sky-400 flex-shrink-0">Chart</h2>
        <select v-model="viewMode" class="bg-slate-800 text-slate-300 border border-slate-700 rounded px-2 py-1 text-xs md:text-sm outline-none focus:border-sky-500 transition-colors min-w-0 truncate">
          <option value="group">Category Groups &rarr; Categories</option>
          <option value="account">Accounts &rarr; Categories</option>
        </select>
      </div>
      <button
        @click="$emit('toggle-maximize')"
        class="p-2 text-slate-400 hover:text-sky-300 hover:bg-slate-800/50 rounded-lg transition-colors z-10"
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
    <div v-if="transactions.length === 0" class="flex-1 flex items-center justify-center text-slate-500 italic">
      No spending data available.
    </div>
    <div v-else class="w-full flex-1 relative min-h-[250px] md:min-h-[400px]">
      <v-chart ref="chartRef" class="chart" :option="chartOption" autoresize @click="onClickNode" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, shallowRef } from 'vue';
import { escHtml } from '../utils';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { TreemapChart } from 'echarts/charts';
import { TooltipComponent } from 'echarts/components';
import VChart from 'vue-echarts';

use([
  CanvasRenderer,
  TreemapChart,
  TooltipComponent
]);

const props = defineProps({
  transactions: {
    type: Array,
    required: true
  },
  categoryToGroupMap: {
    type: Object,
    default: () => ({})
  },
  categoryBudgetMap: {
    type: Object,
    default: () => ({})
  },
  isMaximized: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['toggle-maximize', 'category-click', 'account-click', 'show-popup', 'group-click']);

const chartRef = shallowRef(null);
const viewMode = ref('group');
const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const openDetailPopup = (params) => {
  const pathInfo = params.treePathInfo;
  if (!pathInfo || pathInfo.length < 2) return;

  let rootName = null;
  let categoryName = null;
  let payeeName = null;

  if (pathInfo.length >= 2) rootName = pathInfo[1].name;
  if (pathInfo.length >= 3) categoryName = pathInfo[2].name;
  if (pathInfo.length >= 4) payeeName = pathInfo[3].name;

  const title = params.name;
  const subtitle = pathInfo.slice(1, -1).map(p => p.name).join(' > ');
  const color = params.color || '#38bdf8';

  const txs = props.transactions.filter(tx => {
    if (tx.amount >= 0 || tx.deleted || tx.transferaccountid) return false;

    if (rootName) {
      if (viewMode.value === 'account') {
        if ((tx.accountname || 'Unknown Account') !== rootName) return false;
      } else {
        const group = props.categoryToGroupMap[tx.categoryname || 'Uncategorized'] || 'Uncategorized Group';
        if (group !== rootName) return false;
      }
    }

    if (categoryName && (tx.categoryname || 'Uncategorized') !== categoryName) return false;
    if (payeeName && (tx.payeename || 'Unknown Payee') !== payeeName) return false;
    return true;
  }).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

  const total = txs.reduce((s, tx) => s + Math.abs(tx.amount) / 1000, 0);

  emit('show-popup', {
    title,
    subtitle: subtitle ? `in ${subtitle}` : '',
    color,
    transactions: txs,
    total: total.toFixed(2),
    showFilter: !!categoryName && !payeeName,
    filterName: categoryName
  });
};

const onClickNode = (params) => {
  if (!chartRef.value) return;
  if (params.data?._isSpentSlice || params.data?._isRemainingSlice) return;
  const pathInfo = params.treePathInfo;
  if (!pathInfo || pathInfo.length < 2) return;

  // In group view, clicking a group header (depth 2 = root + group) should offer group filtering
  if (viewMode.value === 'group' && pathInfo.length === 2) {
    const groupName = pathInfo[1].name;
    const color = params.color || '#38bdf8';

    const txs = props.transactions.filter(tx => {
      if (tx.amount >= 0 || tx.deleted || tx.transferaccountid) return false;
      const g = props.categoryToGroupMap[tx.categoryname || 'Uncategorized'] || 'Uncategorized Group';
      return g === groupName;
    }).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

    const total = txs.reduce((s, tx) => s + Math.abs(tx.amount) / 1000, 0);

    emit('show-popup', {
      title: groupName,
      subtitle: '',
      color,
      transactions: txs,
      total: total.toFixed(2),
      showFilter: true,
      filterName: groupName,
      isGroupFilter: true
    });
    return;
  }

  openDetailPopup(params);
};

// Color palette for category boxes in group view
const CATEGORY_COLORS = [
  '#38bdf8', '#a78bfa', '#fb923c', '#34d399', '#f472b6',
  '#facc15', '#60a5fa', '#c084fc', '#f87171', '#2dd4bf',
  '#a3e635', '#e879f9'
];

function dimColor(hex, alpha = 0.18) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}


const chartOption = computed(() => {
  const spendData = {};
  let totalSpend = 0;
  const isGroupView = viewMode.value === 'group';

  props.transactions.forEach(tx => {
    if (tx.amount < 0 && !tx.deleted && !tx.transferaccountid) {
      const amount = Math.abs(tx.amount) / 1000;
      totalSpend += amount;

      const category = tx.categoryname || 'Uncategorized';
      const payee = tx.payeename || 'Unknown Payee';

      let rootKey = 'Unknown';
      if (viewMode.value === 'account') {
        rootKey = tx.accountname || 'Unknown Account';
      } else {
        rootKey = props.categoryToGroupMap[category] || 'Uncategorized Group';
      }

      if (!spendData[rootKey]) spendData[rootKey] = {};
      if (!spendData[rootKey][category]) spendData[rootKey][category] = {};
      if (!spendData[rootKey][category][payee]) spendData[rootKey][category][payee] = 0;

      spendData[rootKey][category][payee] += amount;
    }
  });

  const formatCurrency = (val) => currencyFormatter.format(val);
  const formatPercent = (val) => totalSpend > 0 ? ((val / totalSpend) * 100).toFixed(1) + '%' : '0%';

  let globalColorIdx = 0;

  const treemapData = Object.keys(spendData).map(rootName => {
    const categories = spendData[rootName];

    const categoryNodes = Object.keys(categories).map(categoryName => {
      const payees = categories[categoryName];
      let categoryTotal = 0;
      const payeeNodes = Object.keys(payees).map(payeeName => {
        const val = payees[payeeName];
        categoryTotal += val;
        return {
          name: payeeName,
          value: val,
          label: {
            formatter: `{b}\n${formatCurrency(val)} (${formatPercent(val)})`
          }
        };
      });

      if (isGroupView) {
        // Group view: two seamless children per category (spent + remaining)
        // They look like one box with a fill level — no border between them
        const budgetInfo = props.categoryBudgetMap[categoryName];
        const budgeted = budgetInfo?.budgeted || 0;
        const baseColor = CATEGORY_COLORS[globalColorIdx++ % CATEGORY_COLORS.length];
        const dim = dimColor(baseColor, 0.18);

        const budgetLabel = budgeted > 0
          ? `\n${formatCurrency(categoryTotal)} / ${formatCurrency(budgeted)}`
          : `\n${formatCurrency(categoryTotal)} (${formatPercent(categoryTotal)})`;

        if (budgeted > 0) {
          const remaining = Math.max(0, budgeted - categoryTotal);
          const spentChildren = [{
            name: `Spent`,
            value: categoryTotal,
            itemStyle: { color: baseColor, borderWidth: 0 },
            label: {
              show: true,
              color: '#fff',
              formatter: `Spent\n${formatCurrency(categoryTotal)}`,
              overflow: 'truncate',
              ellipsis: ''
            },
            _isSpentSlice: true
          }];
          if (remaining > 0) {
            spentChildren.push({
              name: `Remaining`,
              value: remaining,
              itemStyle: { color: dim, borderWidth: 0 },
              label: {
                show: true,
                color: 'rgba(148, 163, 184, 0.8)',
                formatter: `Remaining\n${formatCurrency(remaining)}`,
                overflow: 'truncate',
                ellipsis: ''
              },
              _isRemainingSlice: true
            });
          }
          return {
            name: categoryName,
            value: Math.max(categoryTotal, budgeted),
            children: spentChildren,
            itemStyle: { borderColor: '#1e293b', borderWidth: 1, gapWidth: 0 },
            label: { formatter: `{b}${budgetLabel}` },
            upperLabel: {
              show: true,
              color: '#fff',
              height: 24,
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              formatter: `${categoryName} - ${formatCurrency(categoryTotal)} / ${formatCurrency(budgeted)}`,
              overflow: 'break'
            },
            _spent: categoryTotal,
            _budgeted: budgeted
          };
        }

        // No budget set — plain colored leaf
        return {
          name: categoryName,
          value: categoryTotal,
          itemStyle: { color: baseColor, borderColor: '#1e293b', borderWidth: 1 },
          label: {
            show: true,
            color: '#fff',
            formatter: `{b}${budgetLabel}`,
            overflow: 'truncate',
            ellipsis: ''
          },
          _spent: categoryTotal,
          _budgeted: 0
        };
      }

      // Account view: keep payee children as before
      payeeNodes.sort((a, b) => b.value - a.value);
      return {
        name: categoryName,
        value: categoryTotal,
        children: payeeNodes,
        label: {
          formatter: `{b}\n${formatCurrency(categoryTotal)} (${formatPercent(categoryTotal)})`
        }
      };
    });

    // Sort categories by value descending (since series sort is disabled)
    categoryNodes.sort((a, b) => b.value - a.value);

    const rootTotal = categoryNodes.reduce((sum, n) => sum + n.value, 0);

    return {
      name: rootName,
      value: rootTotal,
      children: categoryNodes,
      label: {
        formatter: `{b}\n${formatCurrency(rootTotal)} (${formatPercent(rootTotal)})`
      }
    };
  });

  // Sort groups by value descending (since series sort is disabled)
  treemapData.sort((a, b) => b.value - a.value);

  return {
    tooltip: {
      formatter: function (info) {
        const val = info.value;
        const name = info.name;
        const pathNames = info.treePathInfo.map(item => item.name).filter(n => n !== 'Spending');

        // For spent/remaining slices, show the parent category's budget info
        if (isGroupView && (info.data?._isSpentSlice || info.data?._isRemainingSlice)) {
          const catName = pathNames.length >= 2 ? pathNames[pathNames.length - 2] : name;
          const groupName = pathNames.length >= 1 ? pathNames[0] : '';
          const budgetInfo = props.categoryBudgetMap[catName];
          if (budgetInfo && budgetInfo.budgeted > 0) {
            const spent = budgetInfo.budgeted - budgetInfo.balance;
            const remaining = Math.max(0, budgetInfo.balance);
            const pctUsed = ((spent / budgetInfo.budgeted) * 100).toFixed(1);
            return `<div class="font-sans">
                      <div class="font-bold mb-1">${escHtml(groupName ? groupName + ' > ' + catName : catName)}</div>
                      <div>Spent: ${formatCurrency(spent)} of ${formatCurrency(budgetInfo.budgeted)} (${pctUsed}%)</div>
                      <div>Remaining: ${formatCurrency(remaining)}</div>
                    </div>`;
          }
        }

        const treePath = pathNames.join(' > ');
        const pct = totalSpend > 0 ? ((val / totalSpend) * 100).toFixed(1) + '%' : '0%';

        // Budget tooltip for group-view categories
        if (isGroupView && info.data?._budgeted > 0) {
          const spent = info.data._spent;
          const budgeted = info.data._budgeted;
          const remaining = Math.max(0, budgeted - spent);
          const pctUsed = ((spent / budgeted) * 100).toFixed(1);
          return `<div class="font-sans">
                    <div class="font-bold mb-1">${escHtml(treePath || name)}</div>
                    <div>Spent: ${formatCurrency(spent)} of ${formatCurrency(budgeted)} (${pctUsed}%)</div>
                    <div>Remaining: ${formatCurrency(remaining)}</div>
                  </div>`;
        }

        // Show budget info in tooltip for group container nodes
        let budgetLine = '';
        if (isGroupView) {
          const budgetInfo = props.categoryBudgetMap[name];
          if (budgetInfo && budgetInfo.budgeted > 0) {
            const pctUsed = ((val / budgetInfo.budgeted) * 100).toFixed(1);
            budgetLine = `<div>Budget: ${formatCurrency(budgetInfo.budgeted)} (${pctUsed}% used)</div>`;
          }
        }

        return `<div class="font-sans">
                  <div class="font-bold mb-1">${escHtml(treePath || name)}</div>
                  <div>Spend: ${formatCurrency(val)} (${pct})</div>
                  ${budgetLine}
                </div>`;
      },
      backgroundColor: 'rgba(30, 41, 59, 0.9)',
      borderColor: '#38bdf8',
      textStyle: {
        color: '#f8fafc'
      }
    },
    series: [
      {
        name: 'Spending',
        type: 'treemap',
        nodeClick: false,
        drillDownIcon: '▶',
        roam: false,
        visibleMin: 300,
        sort: false,
        label: {
          show: true,
          formatter: '{b}',
          overflow: 'truncate',
          ellipsis: ''
        },
        upperLabel: {
          show: true,
          height: 30,
          color: '#fff',
          formatter: function (params) {
              const pct = totalSpend > 0 ? ((params.value / totalSpend) * 100).toFixed(1) + '%' : '0%';
              return params.name + ' - ' + formatCurrency(params.value) + ' (' + pct + ')';
          },
          textStyle: {
              fontWeight: 'bold'
          },
          overflow: 'break'
        },
        itemStyle: {
          borderColor: '#0f172a',
          borderWidth: 2,
          gapWidth: 1
        },
        breadcrumb: {
          show: !isGroupView,
          top: 'bottom',
          left: 'center',
          itemStyle: {
            color: 'rgba(30, 41, 59, 0.9)',
            borderColor: '#38bdf8',
            borderWidth: 1,
            shadowColor: 'rgba(56, 189, 248, 0.3)',
            shadowBlur: 4
          },
          emphasis: {
            itemStyle: {
              color: 'rgba(56, 189, 248, 0.3)'
            }
          },
          textStyle: {
            color: '#e2e8f0',
            fontSize: 12
          }
        },
        levels: [
          {
            itemStyle: {
              borderColor: '#0f172a',
              borderWidth: 4,
              gapWidth: 4
            }
          },
          {
            colorSaturation: [0.3, 0.6],
            itemStyle: {
              borderColor: '#1e293b',
              borderWidth: 2,
              gapWidth: isGroupView ? 0 : 2
            },
            upperLabel: {
                show: true,
                color: '#fff',
                formatter: function (params) {
                    if (isGroupView && params.data?._budgeted > 0) {
                      const spent = params.data._spent;
                      const budgeted = params.data._budgeted;
                      return params.name + ' - ' + formatCurrency(spent) + ' / ' + formatCurrency(budgeted);
                    }
                    const pct = totalSpend > 0 ? ((params.value / totalSpend) * 100).toFixed(1) + '%' : '0%';
                    return params.name + ' - ' + formatCurrency(params.value) + ' (' + pct + ')';
                },
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                height: 30
            }
          },
          {
            colorSaturation: isGroupView ? undefined : [0.3, 0.5],
            itemStyle: isGroupView
              ? { borderWidth: 0, gapWidth: 0 }
              : { borderColor: '#334155', borderWidth: 1, gapWidth: 1 },
            upperLabel: isGroupView ? { show: false } : {
                show: true,
                formatter: function (params) {
                    const pct = totalSpend > 0 ? ((params.value / totalSpend) * 100).toFixed(1) + '%' : '0%';
                    return params.name + ' - ' + formatCurrency(params.value) + ' (' + pct + ')';
                },
                backgroundColor: 'rgba(30, 41, 59, 0.7)',
                height: 24,
                color: '#cbd5e1'
            }
          },
          {
            colorSaturation: [0.3, 0.5]
          }
        ],
        data: treemapData
      }
    ]
  };
});
</script>

<style scoped>
.chart {
  width: 100%;
  height: 100%;
}
</style>
