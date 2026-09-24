'use strict';
// ---------- 数据装配 ----------
const SELF = VIDEOS_DATA.self;
const PEERS = VIDEOS_DATA.peers;
const ALL_UPS = [SELF, ...PEERS];

const PALETTE = ['#00AEEC', '#FB7299', '#3FB950', '#F0A23B', '#A78BFA', '#56D4DD'];
const colorOf = (mid) => {
  const i = ALL_UPS.findIndex(u => u.mid === mid);
  return PALETTE[(i < 0 ? 0 : i) % PALETTE.length];
};
const upOf = (mid) => ALL_UPS.find(u => u.mid === mid);

// bvid -> {video, owner}
const INDEX = {};
ALL_UPS.forEach(u => u.videos.forEach(v => INDEX[v.bvid] = { video: v, owner: u }));

// ---------- 状态 ----------
const selectedUps = new Set([SELF.mid]);   // 阵容（默认仅本人）
let comparePool = [];                       // 对比池（bvid 列表，上限 6）
let poolSort = 'play';
let libSort = 'play';
const MAX_POOL = 6;

// ---------- 格式化 ----------
const fmtInt = n => (n || 0).toLocaleString('en-US');
const fmtWan = n => (n >= 10000 ? (n / 10000).toFixed(n >= 1e6 ? 0 : 1) + '万' : String(n || 0));
const fmtDur = s => {
  if (!s) return '—';
  const m = Math.floor(s / 60), ss = s % 60;
  return `${m}:${String(ss).padStart(2, '0')}`;
};
const fmtDate = t => t ? new Date(t * 1000).toISOString().slice(0, 10) : '—';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shortTitle = (s, n = 14) => { s = String(s); return s.length > n ? s.slice(0, n) + '…' : s; };
// 总互动量 = 弹幕+点赞+收藏+评论+投币+分享
const totalInter = v => (v.danmaku || 0) + (v.like || 0) + (v.favorite || 0) + (v.comment || 0) + (v.coin || 0) + (v.share || 0);

// ---------- 渲染：阵容 ----------
function buildRoster() {
  const el = document.getElementById('roster');
  el.innerHTML = ALL_UPS.map(u => {
    const on = selectedUps.has(u.mid);
    const isSelf = u.mid === SELF.mid;
    return `<div class="up-card ${on ? 'on' : ''} ${isSelf ? 'self' : ''}" data-mid="${u.mid}">
      ${isSelf ? '<span class="self-tag">本人</span>' : ''}
      <span class="tick">✓</span>
      <img class="av" src="${u.face}" alt="${esc(u.name)}" loading="lazy"/>
      <div class="nm" title="${esc(u.name)}">${esc(u.name)}</div>
      <div class="lv">Lv${u.level || '—'}</div>
      <div class="fc">${fmtWan(u.followers)} 粉丝</div>
      <div class="vc">${u.videos.length} 个视频</div>
    </div>`;
  }).join('');
  el.querySelectorAll('.up-card').forEach(c => {
    c.addEventListener('click', () => {
      const mid = +c.dataset.mid;
      if (mid === SELF.mid) return;            // 本人锁定
      if (selectedUps.has(mid)) selectedUps.delete(mid);
      else selectedUps.add(mid);
      buildRoster(); renderPool();
    });
  });
}

// ---------- 渲染：候选池 / 视频库（紧凑数据行，弱化视频素材） ----------
function rowHTML(v, owner, inPool) {
  return `<div class="vrow ${inPool ? 'sel' : ''}" data-bvid="${v.bvid}">
    <span class="pick">${inPool ? '✓ 已选' : '+ 对比'}</span>
    <div class="rtitle" title="${esc(v.title)}">${esc(v.title)}</div>
    <div class="rowner"><img src="${owner.face}" alt=""/>${esc(owner.name)}</div>
    <div class="rnums">
      <span>播放 <b>${fmtWan(v.play)}</b></span>
      <span>弹幕 <b>${fmtInt(v.danmaku)}</b></span>
      <span>点赞 <b>${fmtInt(v.like)}</b></span>
      <span>收藏 <b>${fmtInt(v.favorite)}</b></span>
    </div>
  </div>`;
}

function renderPool() {
  const pool = document.getElementById('pool');
  const vids = [];
  ALL_UPS.filter(u => selectedUps.has(u.mid)).forEach(u =>
    u.videos.forEach(v => vids.push({ v, owner: u })));
  vids.sort((a, b) => (b.v[poolSort] || 0) - (a.v[poolSort] || 0));
  pool.innerHTML = vids.map(({ v, owner }) => rowHTML(v, owner, comparePool.includes(v.bvid))).join('');
  bindPicks(pool);
  updatePoolInfo();
}

function renderGallery() {
  const g = document.getElementById('gallery');
  const vids = SELF.videos.map(v => ({ v, owner: SELF }))
    .sort((a, b) => (b.v[libSort] || 0) - (a.v[libSort] || 0));
  g.innerHTML = vids.map(({ v, owner }) => rowHTML(v, owner, comparePool.includes(v.bvid))).join('');
  document.getElementById('libCount').textContent = SELF.videos.length;
  bindPicks(g);
}

function bindPicks(scope) {
  scope.querySelectorAll('.vrow').forEach(c => {
    c.addEventListener('click', () => togglePool(c.dataset.bvid));
  });
}

function togglePool(bvid) {
  const i = comparePool.indexOf(bvid);
  if (i >= 0) comparePool.splice(i, 1);
  else {
    if (comparePool.length >= MAX_POOL) { flash(`最多对比 ${MAX_POOL} 条视频`); return; }
    comparePool.push(bvid);
  }
  renderPool(); renderGallery(); renderComparison();
}

function updatePoolInfo() {
  document.getElementById('poolCount').textContent = comparePool.length;
  const ups = new Set(comparePool.map(b => INDEX[b].owner.mid));
  document.getElementById('poolUpCount').textContent = ups.size;
}

// ---------- 渲染：对比结果（两部分：互动分类 + 汇总分类） ----------
function renderComparison() {
  const block = document.getElementById('resultBlock');
  const items = comparePool.map(b => INDEX[b]);
  if (items.length < 2) { block.hidden = true; return; }
  block.hidden = false;
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
    const vals = items.map(it => it.video[m.key] || 0);
    const max = Math.max(...vals) || 1;
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / vals.length);
    const topIdx = vals.indexOf(Math.max(...vals));
    const top = items[topIdx];
    const rows = items.map(({ video: v, owner: u }) => {
      const val = v[m.key] || 0;
      const w = (val / max * 100).toFixed(1);
      return `<div class="bar-row">
        <span class="ml" title="${esc(v.title)}">${shortTitle(v.title, 12)} · ${esc(u.name)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${w}%;background:${colorOf(u.mid)}"></div></div>
        <span class="mv">${fmtInt(val)}</span>
      </div>`;
    }).join('');
    return `<div class="bar-group">
      <div class="bg-label">${m.label}分类</div>
      ${rows}
      <div class="stat-line">
        <span>合计 <b>${fmtInt(sum)}</b></span>
        <span>均值 <b>${fmtInt(avg)}</b></span>
        <span>最高 <b>${shortTitle(top.video.title, 8)}</b>（${fmtInt(Math.max(...vals))}）</span>
      </div>
    </div>`;
  }).join('');
  document.getElementById('interBars').innerHTML = charts;

  // 分类统计对比表
  const statRows = [
    { label: '合计', calc: vs => vs.reduce((a, b) => a + b, 0) },
    { label: '均值', calc: vs => Math.round(vs.reduce((a, b) => a + b, 0) / vs.length) },
    { label: '最高值', calc: vs => Math.max(...vs) },
  ];
  const head = `<thead><tr><th>统计项</th>${INTER_METRICS.map(m =>
    `<th>${m.label}</th>`).join('')}<th>总互动</th></tr></thead>`;
  const body = statRows.map(r => {
    const cells = INTER_METRICS.map(m => {
      const vs = items.map(it => it.video[m.key] || 0);
      return `<td>${fmtInt(r.calc(vs))}</td>`;
    }).join('');
    const total = fmtInt(r.calc(items.map(it => totalInter(it.video))));
    return `<tr><td>${r.label}</td>${cells}<td><b>${total}</b></td></tr>`;
  }).join('');
  document.getElementById('interTable').innerHTML = head + '<tbody>' + body + '</tbody>';

  // 图例
  document.getElementById('interLegend').innerHTML =
    items.map(({ video: v, owner: u }) =>
      `<div class="legend-item"><span class="legend-dot" style="background:${colorOf(u.mid)}"></span>${shortTitle(v.title, 10)} · ${esc(u.name)}</div>`).join('');
}

/* ===== 第二部分：汇总分类对比（综合统计） ===== */
const SUM_METRICS = [
  { key: 'play', label: '播放量', wan: true },
  { key: 'comment', label: '评论数' },
  { key: 'coin', label: '投币数' },
  { key: 'share', label: '分享数' },
];

function renderSummaryCharts(items) {
  // 总互动量柱状对比
  const max = Math.max(...items.map(it => totalInter(it.video))) || 1;
  const rows = items.map(({ video: v, owner: u }) => {
    const val = totalInter(v);
    const w = (val / max * 100).toFixed(1);
    return `<div class="bar-row">
      <span class="ml" title="${esc(v.title)}">${shortTitle(v.title, 12)} · ${esc(u.name)}</span>
      <div class="bar-track"><div class="bar-fill total" style="width:${w}%;background:${colorOf(u.mid)}"></div></div>
      <span class="mv">${fmtInt(val)}</span>
    </div>`;
  }).join('');
  document.getElementById('sumBars').innerHTML =
    `<div class="bar-group"><div class="bg-label">总互动量（弹幕+点赞+收藏+评论+投币+分享）</div>${rows}</div>`;

  // 汇总统计明细表
  const head = `<thead><tr><th>指标</th>${items.map(({ video: v }) =>
    `<th title="${esc(v.title)}">${shortTitle(v.title, 10)}</th>`).join('')}</tr></thead>`;
  const bodyRows = SUM_METRICS.concat([
    { key: 'danmaku', label: '弹幕数' },
    { key: 'like', label: '点赞数' },
    { key: 'favorite', label: '收藏数' },
    { key: '_total', label: '总互动量' },
  ]).map(r => {
    const cells = items.map(({ video: v }) => {
      if (r.key === '_total') return `<td><b>${fmtInt(totalInter(v))}</b></td>`;
      const val = v[r.key] || 0;
      return `<td>${r.key === 'play' ? fmtWan(val) : fmtInt(val)}</td>`;
    }).join('');
    return `<tr><td>${r.label}<span class="tag-real">实时</span></td>${cells}</tr>`;
  }).join('');
  document.getElementById('detailTable').innerHTML = head + '<tbody>' + bodyRows + '</tbody>';
}

// ---------- 提示 ----------
let flashTimer;
function flash(msg) {
  let t = document.getElementById('flashToast');
  if (!t) { t = document.createElement('div'); t.id = 'flashToast';
    t.style.cssText = 'position:fixed;left:50%;bottom:40px;transform:translateX(-50%);background:#FB7299;color:#fff;padding:10px 18px;border-radius:10px;font-size:13px;font-weight:700;z-index:99;box-shadow:0 8px 30px rgba(0,0,0,.4)';
    document.body.appendChild(t); }
  t.textContent = msg; t.style.opacity = 1;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => t.style.opacity = 0, 1800);
}

// ---------- 事件绑定 ----------
function bindSorters(id, cb) {
  document.getElementById(id).querySelectorAll('button').forEach(b =>
    b.addEventListener('click', () => {
      document.getElementById(id).querySelectorAll('button').forEach(x => x.classList.remove('active'));
      b.classList.add('active'); cb(b.dataset.sort);
    }));
}

// ---------- 初始化 ----------
document.getElementById('snapshotChip').textContent = '快照时间 ' + SNAPSHOT_AT;
buildRoster();
renderPool();
renderGallery();
bindSorters('poolFilter', s => { poolSort = s; renderPool(); });
bindSorters('libFilter', s => { libSort = s; renderGallery(); });
document.getElementById('clearPool').addEventListener('click', () => {
  comparePool = []; renderPool(); renderGallery(); renderComparison();
});
renderComparison();
