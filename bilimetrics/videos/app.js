'use strict';
// ============================================================
// BiliMetrics · 我的视频 / UP 综合对比（实时预览模式）
// 交互模型：点击 UP 按钮 → 即时纳入/移出综合对比 → 结果区实时重渲染
// 无视频素材行，全部以聚合统计 + 图表呈现
// ============================================================

// ---------- 数据装配 ----------
const SELF = VIDEOS_DATA.self;
const PEERS = VIDEOS_DATA.peers;
const ALL_UPS = [SELF, ...PEERS];

const PALETTE = ['#00AEEC', '#FB7299', '#3FB950', '#F0A23B', '#A78BFA', '#56D4DD'];
const colorOf = (mid) => {
  const i = ALL_UPS.findIndex(u => u.mid === mid);
  return PALETTE[(i < 0 ? 0 : i) % PALETTE.length];
};

// ---------- 状态 ----------
const selectedUps = new Set([SELF.mid]);   // 参与综合对比的 UP（本人默认参与、锁定）
const MAX_UPS = ALL_UPS.length;

// ---------- 格式化 ----------
const fmtInt = n => (n || 0).toLocaleString('en-US');
const fmtWan = n => (n >= 10000 ? (n / 10000).toFixed(n >= 1e6 ? 0 : 1) + '万' : String(n || 0));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// 总互动量 = 弹幕+点赞+收藏+评论+投币+分享
const totalInter = v => (v.danmaku || 0) + (v.like || 0) + (v.favorite || 0) + (v.comment || 0) + (v.coin || 0) + (v.share || 0);

// UP 级聚合：对一位 UP 的全部视频按指标求 合计 / 均值 / 最高单视频
function aggregate(up) {
  const vids = up.videos;
  const n = vids.length || 1;
  const agg = { up, count: vids.length, metrics: {} };
  const keys = ['play', 'comment', 'danmaku', 'like', 'favorite', 'coin', 'share'];
  keys.forEach(k => {
    const vals = vids.map(v => v[k] || 0);
    const sum = vals.reduce((a, b) => a + b, 0);
    agg.metrics[k] = { sum, avg: Math.round(sum / n), max: Math.max(...vals) };
  });
  const totals = vids.map(totalInter);
  agg.metrics._total = {
    sum: totals.reduce((a, b) => a + b, 0),
    avg: Math.round(totals.reduce((a, b) => a + b, 0) / n),
    max: Math.max(...totals),
  };
  return agg;
}

// ---------- 实时预览时钟 ----------
let clockTimer;
function startClock() {
  const el = document.getElementById('liveClock');
  const tick = () => { el.textContent = '更新于 ' + new Date().toLocaleTimeString('zh-CN', { hour12: false }); };
  tick();
  clearInterval(clockTimer);
  clockTimer = setInterval(tick, 1000);
}

// ---------- 渲染：UP 按钮阵容 ----------
function buildRoster() {
  const el = document.getElementById('roster');
  el.innerHTML = ALL_UPS.map(u => {
    const on = selectedUps.has(u.mid);
    const isSelf = u.mid === SELF.mid;
    return `<button type="button" class="up-card ${on ? 'on' : ''} ${isSelf ? 'self' : ''}"
      data-mid="${u.mid}" aria-pressed="${on}" ${isSelf ? 'data-locked="1"' : ''}>
      ${isSelf ? '<span class="self-tag">本人</span>' : ''}
      <span class="tick">✓</span>
      <img class="av" src="${u.face}" alt="${esc(u.name)}" loading="lazy"/>
      <div class="nm" title="${esc(u.name)}">${esc(u.name)}</div>
      <div class="lv">Lv${u.level || '—'}</div>
      <div class="fc">${fmtWan(u.followers)} 粉丝</div>
      <div class="vc">${u.videos.length} 个视频 · ${on ? '参与对比' : '未参与'}</div>
    </button>`;
  }).join('');
  el.querySelectorAll('.up-card').forEach(c => {
    c.addEventListener('click', () => {
      const mid = +c.dataset.mid;
      if (c.dataset.locked) { flash('你的账号默认参与对比，不可移除'); return; }
      if (selectedUps.has(mid)) {
        selectedUps.delete(mid);
      } else {
        if (selectedUps.size >= MAX_UPS) { flash(`最多同时对比 ${MAX_UPS} 位 UP 主`); return; }
        selectedUps.add(mid);
      }
      renderAll();   // 点击即刻重渲染 → 实时预览
    });
  });
}

// ---------- 渲染：综合对比结果（UP 级聚合，实时预览） ----------
function renderComparison() {
  const items = ALL_UPS.filter(u => selectedUps.has(u.mid)).map(aggregate);
  document.getElementById('upCount').textContent = items.length;
  renderInteractionCharts(items);
  renderSummaryCharts(items);
}

/* ===== 第一部分：互动分类对比（弹幕 / 点赞 / 收藏） ===== */
const INTER_METRICS = [
  { key: 'danmaku', label: '弹幕' },
  { key: 'like', label: '点赞' },
  { key: 'favorite', label: '收藏' },
];

function renderInteractionCharts(items) {
  const charts = INTER_METRICS.map(m => {
    const vals = items.map(it => it.metrics[m.key].avg);   // 柱状＝单视频均值（公平对比）
    const max = Math.max(...vals) || 1;
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / vals.length);
    const topIdx = vals.indexOf(Math.max(...vals));
    const top = items[topIdx];
    const rows = items.map(it => {
      const val = it.metrics[m.key].avg;
      const w = Math.max(2, (val / max * 100)).toFixed(1);
      return `<div class="bar-row">
        <span class="ml"><img src="${it.up.face}" alt=""/>${esc(it.up.name)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${w}%;background:${colorOf(it.up.mid)}"></div></div>
        <span class="mv">${fmtInt(val)}</span>
      </div>`;
    }).join('');
    return `<div class="bar-group">
      <div class="bg-label">${m.label}分类 · 单视频均值</div>
      ${rows}
      <div class="stat-line">
        <span>合计 <b>${fmtInt(items.reduce((a, it) => a + it.metrics[m.key].sum, 0))}</b></span>
        <span>UP 均值 <b>${fmtInt(avg)}</b></span>
        <span>最高 <b>${esc(shortName(top.up.name))}</b>（${fmtInt(top.metrics[m.key].max)}）</span>
      </div>
    </div>`;
  }).join('');
  document.getElementById('interBars').innerHTML = charts;

  // 分类统计对比表：行＝统计项，列＝UP
  const statRows = [
    { label: '合计', pick: it => it.metrics[m_].sum },
    { label: '单视频均值', pick: it => it.metrics[m_].avg },
    { label: '最高单视频', pick: it => it.metrics[m_].max },
  ];
  const head = `<thead><tr><th>统计项</th>${INTER_METRICS.map(m =>
    `<th>${m.label}</th>`).join('')}<th>总互动</th></tr></thead>`;
  const body = statRows.map(r => `<tr><td>${r.label}</td>${INTER_METRICS.map(m => {
    const m_ = m.key;
    return `<td>${fmtInt(r.pick(items[0]))}</td>`;
  }).join('')}<td><b>${fmtInt(r.pickT ? 0 : items.reduce((a, it) => a + it.metrics._total.sum, 0))}</b></td></tr>`).join('');
  document.getElementById('interTable').innerHTML = head + '<tbody>' + body + '</tbody>';

  // 图例
  document.getElementById('interLegend').innerHTML =
    items.map(it =>
      `<div class="legend-item"><span class="legend-dot" style="background:${colorOf(it.up.mid)}"></span><img class="legend-av" src="${it.up.face}" alt=""/>${esc(it.up.name)} · ${it.count} 条视频</div>`).join('');
}

/* ===== 第二部分：汇总分类对比（综合统计） ===== */
const SUM_METRICS = [
  { key: 'play', label: '播放量', wan: true },
  { key: 'comment', label: '评论数' },
  { key: 'coin', label: '投币数' },
  { key: 'share', label: '分享数' },
  { key: 'danmaku', label: '弹幕数' },
  { key: 'like', label: '点赞数' },
  { key: 'favorite', label: '收藏数' },
];

function renderSummaryCharts(items) {
  // 总互动量（合计）柱状对比
  const max = Math.max(...items.map(it => it.metrics._total.sum)) || 1;
  const rows = items.map(it => {
    const val = it.metrics._total.sum;
    const w = Math.max(2, (val / max * 100)).toFixed(1);
    return `<div class="bar-row">
      <span class="ml"><img src="${it.up.face}" alt=""/>${esc(it.up.name)}</span>
      <div class="bar-track"><div class="bar-fill total" style="width:${w}%;background:${colorOf(it.up.mid)}"></div></div>
      <span class="mv">${fmtInt(val)}</span>
    </div>`;
  }).join('');
  document.getElementById('sumBars').innerHTML =
    `<div class="bar-group"><div class="bg-label">总互动量合计（弹幕+点赞+收藏+评论+投币+分享）</div>${rows}</div>`;

  // 汇总统计明细表：行＝指标，列＝UP，单元格＝合计（均值）
  const head = `<thead><tr><th>指标</th>${items.map(it =>
    `<th><span class="owner-th"><img src="${it.up.face}" alt=""/>${esc(it.up.name)}</span></th>`).join('')}</tr></thead>`;
  const cell = (it, key) => {
    const m = it.metrics[key];
    const main = key === 'play' ? fmtWan(m.sum) : fmtInt(m.sum);
    const sub = key === 'play' ? '均 ' + fmtWan(m.avg) : '均 ' + fmtInt(m.avg);
    return `<td><b>${main}</b><span class="avg">${sub}</span></td>`;
  };
  const bodyRows = SUM_METRICS.concat([{ key: '_total', label: '总互动量' }]).map(r =>
    `<tr><td>${r.label}<span class="tag-real">实时</span></td>${items.map(it => cell(it, r.key)).join('')}</tr>`).join('');
  document.getElementById('detailTable').innerHTML = head + '<tbody>' + bodyRows + '</tbody>';
}

const shortName = (s, n = 8) => { s = String(s); return s.length > n ? s.slice(0, n) + '…' : s; };

// ---------- 提示 ----------
let flashTimer;
function flash(msg) {
  let t = document.getElementById('flashToast');
  if (!t) { t = document.createElement('div'); t.id = 'flashToast';
    t.style.cssText = 'position:fixed;left:50%;bottom:40px;transform:translateX(-50%);background:#FB7299;color:#fff;padding:10px 18px;border-radius:10px;font-size:13px;font-weight:700;z-index:99;box-shadow:0 8px 30px rgba(0,0,0,.4);transition:opacity .3s';
    document.body.appendChild(t); }
  t.textContent = msg; t.style.opacity = 1;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => t.style.opacity = 0, 1800);
}

// ---------- 初始化 ----------
function renderAll() {
  buildRoster();
  renderComparison();
}

document.getElementById('snapshotChip').textContent = '快照时间 ' + SNAPSHOT_AT;
document.getElementById('selectAllUps').addEventListener('click', () => {
  ALL_UPS.forEach(u => selectedUps.add(u.mid));
  renderAll();
});
document.getElementById('resetUps').addEventListener('click', () => {
  selectedUps.clear(); selectedUps.add(SELF.mid);
  renderAll();
});
renderAll();
startClock();
