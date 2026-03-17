<template>
  <div class="glass-panel h-full flex flex-col overflow-hidden">
    <div class="flex justify-between items-center w-full mb-4 md:mb-6 gap-2 md:gap-4">
      <div class="flex items-center gap-2 md:gap-4 min-w-0">
        <h2 class="text-base md:text-xl font-bold neon-text text-sky-400 flex-shrink-0">Chart</h2>
        <select v-model="viewMode" class="bg-slate-800 text-slate-300 border border-slate-700 rounded px-2 py-1 text-xs md:text-sm outline-none focus:border-sky-500 transition-colors min-w-0 truncate">
          <option value="account">Accounts &rarr; Categories</option>
          <option value="group">Category Groups &rarr; Categories</option>
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
  isMaximized: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['toggle-maximize', 'category-click', 'account-click', 'show-popup']);

const chartRef = shallowRef(null);
const viewMode = ref('account');
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
  const pathInfo = params.treePathInfo;
  if (!pathInfo || pathInfo.length < 2) return;

  openDetailPopup(params);
};

const chartOption = computed(() => {
  // Build hierarchy: Root -> Category -> Payee
  // Only consider spending: tx.amount < 0
  const spendData = {};
  let totalSpend = 0;

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

  // Convert to echarts treemap format
  // data: [{ name, value, children: [{ name, value, children: [] }] }]
  const formatCurrency = (val) => currencyFormatter.format(val);
  const formatPercent = (val) => totalSpend > 0 ? ((val / totalSpend) * 100).toFixed(1) + '%' : '0%';

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

      return {
        name: categoryName,
        value: categoryTotal,
        children: payeeNodes,
        label: {
          formatter: `{b}\n${formatCurrency(categoryTotal)} (${formatPercent(categoryTotal)})`
        }
      };
    });

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

  return {
    tooltip: {
      formatter: function (info) {
        const val = info.value;
        const name = info.name;
        const treePath = info.treePathInfo.map(item => item.name).filter(n => n !== 'Spending').join(' > ');
        const pct = totalSpend > 0 ? ((val / totalSpend) * 100).toFixed(1) + '%' : '0%';
        return `<div class="font-sans">
                  <div class="font-bold mb-1">${escHtml(treePath || name)}</div>
                  <div>Spend: ${formatCurrency(val)} (${pct})</div>
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
        label: {
          show: true,
          formatter: '{b}',
          overflow: 'break'
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
          show: true,
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
              gapWidth: 2
            },
            upperLabel: {
                show: true,
                color: '#fff',
                formatter: function (params) {
                    const pct = totalSpend > 0 ? ((params.value / totalSpend) * 100).toFixed(1) + '%' : '0%';
                    return params.name + ' - ' + formatCurrency(params.value) + ' (' + pct + ')';
                },
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                height: 30
            }
          },
          {
            colorSaturation: [0.3, 0.5],
            itemStyle: {
              borderColor: '#334155',
              borderWidth: 1,
              gapWidth: 1
            },
            upperLabel: {
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
