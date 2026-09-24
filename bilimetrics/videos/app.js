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

// ---------- 渲染：候选池 / 画廊卡片 ----------
function cardHTML(v, owner, inPool) {
  return `<div class="vcard ${inPool ? 'sel' : ''}" data-bvid="${v.bvid}">
    <span class="pick" data-bvid="${v.bvid}">${inPool ? '✓ 已选' : '+ 对比'}</span>
    <img class="cov" src="${v.cover}" alt="${esc(v.title)}" loading="lazy"/>
    <div class="vbody">
      <div class="vtitle">${esc(v.title)}</div>
      <div class="vowner"><img src="${owner.face}"/>${esc(owner.name)}</div>
      <div class="vstat">
        <span>▶ <b>${fmtWan(v.play)}</b></span>
        <span>💬 <b>${fmtInt(v.comment)}</b></span>
        <span>📡 <b>${fmtInt(v.danmaku)}</b></span>
      </div>
    </div>
  </div>`;
}

function renderPool() {
  const pool = document.getElementById('pool');
  const vids = [];
  ALL_UPS.filter(u => selectedUps.has(u.mid)).forEach(u =>
    u.videos.forEach(v => vids.push({ v, owner: u })));
  vids.sort((a, b) => (b.v[poolSort] || 0) - (a.v[poolSort] || 0));
  pool.innerHTML = vids.map(({ v, owner }) => cardHTML(v, owner, comparePool.includes(v.bvid))).join('');
  bindPicks(pool);
  updatePoolInfo();
}

function renderGallery() {
  const g = document.getElementById('gallery');
  const vids = SELF.videos.map(v => ({ v, owner: SELF }))
    .sort((a, b) => (b.v[libSort] || 0) - (a.v[libSort] || 0));
  g.innerHTML = vids.map(({ v, owner }) => cardHTML(v, owner, comparePool.includes(v.bvid))).join('');
  document.getElementById('libCount').textContent = SELF.videos.length;
  bindPicks(g);
}

function bindPicks(scope) {
  scope.querySelectorAll('.pick').forEach(p => {
    p.addEventListener('click', e => {
      e.stopPropagation();
      togglePool(p.dataset.bvid);
    });
  });
  scope.querySelectorAll('.vcard').forEach(c => {
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

// ---------- 渲染：对比结果 ----------
function renderComparison() {
  const block = document.getElementById('resultBlock');
  const items = comparePool.map(b => INDEX[b]);
  if (items.length < 2) { block.hidden = true; return; }
  block.hidden = false;
  renderCmpCards(items);
  renderBars(items);
  renderRadar(items);
  renderTable(items);
}

function renderCmpCards(items) {
  document.getElementById('cmpCards').innerHTML = items.map(({ video: v, owner: u }) => `
    <div class="cmp-card">
      <img class="cov" src="${v.cover}" alt="${esc(v.title)}"/>
      <div class="cb">
        <div class="ct">${esc(v.title)}</div>
        <div class="co"><img src="${u.face}"/>${esc(u.name)}</div>
        <div class="cm"><span>▶ ${fmtWan(v.play)}</span><span>💬 ${fmtInt(v.comment)}</span></div>
        <div class="cm"><span>📡 ${fmtInt(v.danmaku)}</span><span>⏱ ${fmtDur(v.length)}</span></div>
      </div>
    </div>`).join('');
}

function renderBars(items) {
  const metrics = [
    { key: 'play', label: '播放量', wan: true },
    { key: 'comment', label: '评论数', wan: false },
    { key: 'danmaku', label: '弹幕数', wan: false },
  ];
  document.getElementById('bars').innerHTML = metrics.map(m => {
    const max = Math.max(...items.map(it => it.video[m.key] || 0)) || 1;
    const rows = items.map(({ video: v, owner: u }) => {
      const val = v[m.key] || 0;
      const w = (val / max * 100).toFixed(1);
      const disp = m.wan ? fmtWan(val) : fmtInt(val);
      return `<div class="bar-row">
        <span class="ml">${m.label}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${w}%;background:${colorOf(u.mid)}"></div></div>
        <span class="mv">${disp}</span>
      </div>`;
    }).join('');
    return `<div class="bar-group">
      <div class="bg-label">${metrics.indexOf(m) === 0 ? '📊' : ''} ${m.label}</div>${rows}
    </div>`;
  }).join('');
}

function renderRadar(items) {
  const axes = [
    { key: 'play', label: '播放' },
    { key: 'comment', label: '评论' },
    { key: 'danmaku', label: '弹幕' },
    { key: 'length', label: '时长' },
  ];
  const max = {};
  axes.forEach(a => max[a.key] = Math.max(...items.map(it => it.video[a.key] || 0)) || 1);
  const cx = 210, cy = 180, R = 130;
  const ang = i => (-90 + i * 90) * Math.PI / 180;
  const pt = (i, r) => [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))];

  let svg = '';
  // 网格
  [0.25, 0.5, 0.75, 1].forEach(t => {
    const p = axes.map((_, i) => pt(i, R * t).map(n => n.toFixed(1)).join(',')).join(' ');
    svg += `<polygon points="${p}" fill="none" stroke="#1F2733" stroke-width="1"/>`;
  });
  // 轴线 + 标签
  axes.forEach((a, i) => {
    const [x, y] = pt(i, R);
    svg += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#1F2733" stroke-width="1"/>`;
    const [lx, ly] = pt(i, R + 22);
    const anchor = i === 1 ? 'start' : i === 3 ? 'end' : 'middle';
    svg += `<text x="${lx}" y="${ly + 4}" fill="#98A2B3" font-size="12" text-anchor="${anchor}">${a.label}</text>`;
  });
  // 各视频多边形
  items.forEach(({ video: v, owner: u }) => {
    const pts = axes.map((a, i) => {
      const val = (v[a.key] || 0) / max[a.key] * R;
      return pt(i, val).map(n => n.toFixed(1)).join(',');
    }).join(' ');
    const c = colorOf(u.mid);
    svg += `<polygon points="${pts}" fill="${c}22" stroke="${c}" stroke-width="2"/>`;
    axes.forEach((a, i) => {
      const val = (v[a.key] || 0) / max[a.key] * R;
      const [x, y] = pt(i, val);
      svg += `<circle cx="${x}" cy="${y}" r="3" fill="${c}"/>`;
    });
  });
  document.getElementById('radar').innerHTML = svg;

  document.getElementById('radarLegend').innerHTML = items.map(({ owner: u }) =>
    `<div class="legend-item"><span class="legend-dot" style="background:${colorOf(u.mid)}"></span>${esc(u.name)}</div>`).join('');
}

function renderTable(items) {
  const rows = [
    { key: 'play', label: '播放量', fmt: fmtWan, real: true },
    { key: 'comment', label: '评论数', fmt: fmtInt, real: true },
    { key: 'danmaku', label: '弹幕数', fmt: fmtInt, real: true },
    { key: 'length', label: '时长', fmt: fmtDur, real: true },
    { key: 'created', label: '发布日期', fmt: fmtDate, real: true },
  ];
  const head = `<thead><tr><th>指标</th>${items.map(({ owner: u }) =>
    `<th><div class="owner-th"><img src="${u.face}"/>${esc(u.name)}</div></th>`).join('')}</tr></thead>`;
  const body = rows.map(r => `<tr><td>${r.label}${r.real ? '<span class="tag-real">实时</span>' : ''}</td>${
    items.map(({ video: v }) => `<td>${r.fmt(v[r.key])}</td>`).join('')}</tr>`).join('');
  document.getElementById('detailTable').innerHTML = head + '<tbody>' + body + '</tbody>';
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
