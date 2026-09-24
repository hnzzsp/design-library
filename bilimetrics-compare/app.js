/* =========================================================================
 * BiliMetrics · UP 主对比 · 交互与图表渲染
 * 依赖 data.js 提供的 window.BILI_DATA = { UPS, DEFAULT_SELECTED, SNAPSHOT_AT, REAL_METRICS }
 * 图表：纯 SVG / DOM 自绘，无任何外部依赖
 * ========================================================================= */
(function () {
  'use strict';

  const { UPS, DEFAULT_SELECTED, SNAPSHOT_AT, REAL_METRICS } = window.BILI_DATA;
  const PALETTE = ['#FB7299', '#00AEEC', '#3FB950', '#A371F7', '#E3B341', '#F85149'];

  /* ---------- 指标定义（real=粉丝数为实时真实值） ---------- */
  const METRICS = [
    { key: 'followers',       label: '粉丝数',   unit: '万', real: true },
    { key: 'followersGrowth', label: '粉丝净增', unit: '万' },
    { key: 'views',           label: '播放量',   unit: '万' },
    { key: 'likes',           label: '点赞数',   unit: '万' },
    { key: 'coins',           label: '投币数',   unit: '万' },
    { key: 'favs',            label: '收藏数',   unit: '万' },
    { key: 'danmaku',         label: '弹幕数',   unit: '万' },
    { key: 'comments',        label: '评论数',   unit: '万' },
    { key: 'engagement',      label: '互动率',   unit: '%', computed: true },
  ];
  const isReal = (key) => REAL_METRICS.includes(key);
  const getVal = (up, key) => {
    if (key === 'engagement') {
      return ((up.likes + up.coins + up.favs + up.comments) / Math.max(up.views, 1)) * 100;
    }
    return up[key] || 0;
  };
  const fmt = (v) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1));
  const colorOf = (up) => PALETTE[UPS.findIndex(u => u.id === up.id) % PALETTE.length];

  /* ---------- 状态 ---------- */
  const selected = new Set(DEFAULT_SELECTED);
  let barKey = 'followers';
  let lineKey = 'followers';
  const $ = (id) => document.getElementById(id);

  /* ---------- UP 主头像墙（身份展示 + 选择器） ---------- */
  function renderAvatarWall() {
    $('avatarWall').innerHTML = UPS.map(up => {
      const active = selected.has(up.id);
      const classes = ['avatar-tile'];
      if (active) classes.push('active');
      if (up.self) classes.push('self', 'locked');
      return `
        <div class="${classes.join(' ')}" data-id="${up.id}" role="button" tabindex="0"
             aria-pressed="${active}" title="${up.self ? '本人（锁定参与对比）' : '点击切换对比'}">
          <div class="avatar-ring"><img src="${up.avatar}" alt="${up.name} 头像" loading="lazy"></div>
          <div class="avatar-meta">
            <div class="avatar-name">${up.name}</div>
            <div class="avatar-tags">
              <span class="lv-badge">Lv${up.level}</span>
              ${up.self ? '<span class="self-badge">本人</span>' : ''}
            </div>
            <div class="avatar-fans">
              <b>${fmt(up.followers)}</b> 万粉丝
              ${isReal('followers') ? '<span class="verified-mark">✔ 实时</span>' : ''}
            </div>
          </div>
        </div>`;
    }).join('');

    $('avatarWall').querySelectorAll('.avatar-tile').forEach(tile => {
      const toggle = () => {
        const id = tile.dataset.id;
        const up = UPS.find(u => u.id === id);
        if (up.self) return; // 本人锁定
        if (selected.has(id)) selected.delete(id); else selected.add(id);
        renderAll();
      };
      tile.addEventListener('click', toggle);
      tile.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    });
  }

  /* ---------- 摘要卡（数字滚动动画） ---------- */
  function animateNum(el, target, decimals, suffix) {
    const dur = 850, t0 = performance.now();
    function frame(t) {
      const p = Math.min((t - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(decimals) + (suffix || '');
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function renderSummary() {
    const list = UPS.filter(u => selected.has(u.id));
    if (!list.length) { $('summary').innerHTML = '<div class="sum-card"><div class="sum-label">请至少选择一位 UP 主</div></div>'; return; }
    const self = list.find(u => u.self) || UPS.find(u => u.self);
    const inList = list.includes(self);
    const others = list.filter(u => !u.self);
    const sorted = [...list].sort((a, b) => b.followers - a.followers);
    const rank = inList ? sorted.findIndex(u => u.self) + 1 : '—';
    const top = sorted[0];
    const gap = (inList && top && top !== self) ? top.followers / self.followers : 0;
    const growth = self.followers - self.followers30dAgo;
    const growthPct = (growth / self.followers30dAgo) * 100;

    $('summary').innerHTML = `
      <div class="sum-card"><div class="sum-label">本人粉丝排名（所选内）</div>
        <div class="sum-value pink" id="s1">${rank}<small> / ${sorted.length}</small></div>
        <div class="sum-note">${inList ? '按粉丝数排序 · 实时真实值' : '本人未参与所选'}</div></div>
      <div class="sum-card"><div class="sum-label">与榜首差距</div>
        <div class="sum-value blue" id="s2">${gap ? gap.toFixed(1) : '—'}<small>${gap ? ' 倍' : ''}</small></div>
        <div class="sum-note">${gap ? `榜首 ${top.name} ${fmt(top.followers)} 万` : '本人即所选榜首'}</div></div>
      <div class="sum-card"><div class="sum-label">本人 30 天粉丝净增</div>
        <div class="sum-value up" id="s3">+${fmt(growth)}<small> 万</small></div>
        <div class="sum-note">约 +${growthPct.toFixed(1)}% · 估算趋势</div></div>
      <div class="sum-card"><div class="sum-label">本人粉丝覆盖榜首</div>
        <div class="sum-value" id="s4">${top && top !== self ? ((self.followers / top.followers) * 100).toFixed(1) : '100.0'}<small> %</small></div>
        <div class="sum-note">目标：持续缩小与头部差距</div></div>`;

    if (typeof rank === 'number') animateNum($('s1'), rank, 0);
    if (gap) animateNum($('s2'), gap, 1);
    animateNum($('s3'), growth, Math.abs(growth) >= 100 ? 0 : 1, '');
    if (top && top !== self) animateNum($('s4'), (self.followers / top.followers) * 100, 1, '');
    else $('s4').textContent = '100.0';
  }

  /* ---------- 雷达图 ---------- */
  function renderRadar() {
    const list = UPS.filter(u => selected.has(u.id));
    const dims = METRICS.filter(m => m.key !== 'followersGrowth');
    const W = 380, H = 320, cx = W / 2, cy = H / 2 + 6, R = 112;
    const n = dims.length;
    const maxes = dims.map(d => Math.max(...list.map(u => getVal(u, d.key)), 0.0001));

    const angle = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
    const pt = (i, r) => [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];

    let grid = '';
    for (let lv = 1; lv <= 4; lv++) {
      const r = (R * lv) / 4;
      const pts = dims.map((_, i) => pt(i, r).map(v => v.toFixed(1)).join(',')).join(' ');
      grid += `<polygon points="${pts}" fill="${lv % 2 ? 'rgba(255,255,255,.015)' : 'rgba(255,255,255,.03)'}" stroke="rgba(255,255,255,.07)"/>`;
    }
    const axes = dims.map((d, i) => {
      const [x, y] = pt(i, R);
      const [lx, ly] = pt(i, R + 22);
      const anchor = Math.abs(lx - cx) < 12 ? 'middle' : lx > cx ? 'start' : 'end';
      return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,.07)"/>
        <text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" fill="#8B96A8" font-size="11" text-anchor="${anchor}">${d.label}${isReal(d.key) ? ' ●' : ''}</text>`;
    }).join('');

    const polys = list.map(up => {
      const c = colorOf(up);
      const pts = dims.map((d, i) => {
        const v = getVal(up, d.key) / maxes[i];
        const [x, y] = pt(i, R * Math.max(v, 0.03));
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
      return `<polygon points="${pts}" fill="${c}" fill-opacity=".14" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>`;
    }).join('');

    $('radar').innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;max-height:340px">${grid}${axes}${polys}</svg>`;
    $('radarLegend').innerHTML = list.map(up => legendItem(up)).join('');
  }

  /* ---------- 柱状图（横向，带头像） ---------- */
  function renderBar() {
    const list = [...UPS.filter(u => selected.has(u.id))].sort((a, b) => getVal(b, barKey) - getVal(a, barKey));
    const m = METRICS.find(x => x.key === barKey);
    const max = Math.max(...list.map(u => getVal(u, barKey)), 0.0001);
    $('bar').innerHTML = list.map(up => {
      const v = getVal(up, barKey);
      const pct = Math.max((v / max) * 100, 1.2);
      return `
        <div class="bar-row">
          <img class="bar-avatar" src="${up.avatar}" alt="${up.name}">
          <div class="bar-info">
            <div class="bar-top"><span class="bar-name">${up.name}</span><span class="bar-val">${fmt(v)} ${m.unit}</span></div>
            <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:linear-gradient(90deg,${colorOf(up)}88,${colorOf(up)})"></div></div>
          </div>
        </div>`;
    }).join('');
    $('barTag') && ($('barTag').textContent = m.label + (isReal(barKey) ? ' · 实时' : ' · 估算'));
    $('barLegend').innerHTML = `<span class="legend-item"><span class="legend-dot" style="background:${PALETTE[1]}"></span>颜色对应各 UP 主主题色</span>`;
  }

  /* ---------- 30 天趋势折线图 ---------- */
  function renderLine() {
    const list = UPS.filter(u => selected.has(u.id));
    const W = 520, H = 280, padL = 46, padR = 18, padT = 18, padB = 34;
    const iw = W - padL - padR, ih = H - padT - padB;
    const m = METRICS.find(x => x.key === lineKey);
    const series = list.map(up => ({ up, data: up.trends[lineKey] || [] }));
    const max = Math.max(...series.flatMap(s => s.data), 0.0001) * 1.1;
    const x = (i, len) => padL + (iw * i) / (len - 1);
    const y = (v) => padT + ih - (ih * v) / max;

    let gridY = '', labelsY = '';
    for (let g = 0; g <= 4; g++) {
      const gy = padT + (ih * g) / 4;
      const val = max - (max * g) / 4;
      gridY += `<line x1="${padL}" y1="${gy}" x2="${W - padR}" y2="${gy}" stroke="rgba(255,255,255,.06)"/>`;
      labelsY += `<text x="${padL - 8}" y="${gy + 4}" fill="#5B6675" font-size="10" text-anchor="end">${fmt(val)}</text>`;
    }
    let labelsX = '';
    [0, 9, 19, 29].forEach(i => { labelsX += `<text x="${x(i, 30)}" y="${H - 10}" fill="#5B6675" font-size="10" text-anchor="middle">D${i + 1}</text>`; });

    const lines = series.map(s => {
      const c = colorOf(s.up);
      const pts = s.data.map((v, i) => `${x(i, s.data.length).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
      const lastX = x(s.data.length - 1, s.data.length), lastY = y(s.data[s.data.length - 1]);
      const area = `${padL},${padT + ih} ${pts} ${lastX.toFixed(1)},${padT + ih}`;
      return `<polygon points="${area}" fill="${c}" fill-opacity=".06"/>
        <polyline points="${pts}" fill="none" stroke="${c}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
        <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="3.5" fill="${c}" stroke="#0B0E14" stroke-width="1.5"/>`;
    }).join('');

    $('line').innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">${gridY}${labelsY}${labelsX}${lines}</svg>`;
    $('lineTag') && ($('lineTag').textContent = m.label + (m.unit === '%' ? '(%)' : '(万)') + (isReal(lineKey) ? ' · 末位实时' : ' · 估算'));
    $('lineLegend').innerHTML = list.map(up => legendItem(up)).join('');
  }

  function legendItem(up) {
    return `<span class="legend-item"><img src="${up.avatar}" alt=""><span style="color:${colorOf(up)}">■</span>${up.name}</span>`;
  }

  /* ---------- 数据明细表 ---------- */
  function renderTable() {
    const list = UPS.filter(u => selected.has(u.id));
    const head = `<thead><tr>
      <th style="text-align:left">UP 主</th>
      ${METRICS.map(m => `<th>${m.label}${isReal(m.key) ? '<span class="metric-tag real">实时</span>' : '<span class="metric-tag est">估算</span>'}</th>`).join('')}
    </tr></thead>`;
    const rows = list.map(up => `<tr class="${up.self ? 'self-row' : ''}">
      <td><div class="self-cell"><img src="${up.avatar}" alt="">${up.name}${up.self ? ' <span class="self-badge">本人</span>' : ''}</div></td>
      ${METRICS.map(m => `<td class="num">${fmt(getVal(up, m.key))}${m.unit === '%' ? '%' : ''}</td>`).join('')}
    </tr>`).join('');
    $('dataTable').innerHTML = head + `<tbody>${rows}</tbody>`;
  }

  /* ---------- 指标选择器 ---------- */
  function renderSelectors() {
    const opts = (sel) => METRICS.map(m =>
      `<option value="${m.key}" ${m.key === sel ? 'selected' : ''}>${m.label}（${m.unit}）${isReal(m.key) ? ' ✔实时' : ''}</option>`).join('');
    $('barMetric').innerHTML = opts(barKey);
    $('lineMetric').innerHTML = opts(lineKey);
    $('barMetric').onchange = (e) => { barKey = e.target.value; renderBar(); renderTable(); };
    $('lineMetric').onchange = (e) => { lineKey = e.target.value; renderLine(); renderTable(); };
  }

  /* ---------- 快照状态 & 刷新 ---------- */
  function renderSnapshot(text) {
    $('snapshotText').textContent = text || `粉丝快照 ${SNAPSHOT_AT} · 实时真实值`;
  }

  $('refreshBtn').addEventListener('click', () => {
    renderAll();
    renderSnapshot(`已重新渲染 · ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`);
    setTimeout(() => renderSnapshot(), 2600);
  });

  /* ---------- 总渲染 ---------- */
  function renderAll() {
    renderAvatarWall();
    renderSummary();
    renderRadar();
    renderBar();
    renderLine();
    renderTable();
  }

  renderSelectors();
  renderSnapshot();
  renderAll();
})();
