/* =========================================================================
 * BiliMetrics · UP 主对比 · 交互与图表（纯 SVG 自绘，无外部依赖）
 * ========================================================================= */
(function () {
  'use strict';

  const { UPS, DEFAULT_SELECTED } = window.BILI_DATA;

  /* ---------- 指标定义 ---------- */
  const RADAR_METRICS = [
    { key: 'views', label: '播放量' }, { key: 'likes', label: '点赞数' },
    { key: 'coins', label: '投币数' }, { key: 'favs', label: '收藏数' },
    { key: 'danmaku', label: '弹幕数' }, { key: 'comments', label: '评论数' },
    { key: 'followers', label: '粉丝数' }, { key: 'engagement', label: '互动率' },
  ];
  const BAR_METRICS = [
    { key: 'views', label: '播放量' }, { key: 'likes', label: '点赞数' },
    { key: 'coins', label: '投币数' }, { key: 'favs', label: '收藏数' },
    { key: 'danmaku', label: '弹幕数' }, { key: 'comments', label: '评论数' },
    { key: 'followers', label: '粉丝数' }, { key: 'followersGrowth', label: '粉丝增长' },
    { key: 'engagement', label: '互动率' },
  ];
  const TS_METRICS = [
    { key: 'followers', label: '粉丝数(万)' },
    { key: 'views', label: '播放量(万)' },
    { key: 'likes', label: '点赞数(万)' },
  ];

  const PALETTE = ['#00AEEC', '#3FB950', '#D29922', '#A371F7', '#FF7B72', '#58A6FF'];
  const OTHERS = UPS.filter((u) => !u.self);

  /* ---------- 状态 ---------- */
  const selected = new Set(DEFAULT_SELECTED);

  /* ---------- 工具 ---------- */
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function colorFor(u) {
    if (u.self) return '#FB7299';
    const i = OTHERS.findIndex((x) => x.id === u.id);
    return PALETTE[i % PALETTE.length];
  }
  function getMetric(u, key) {
    if (key === 'engagement') {
      return Math.round(((u.likes + u.coins + u.favs + u.comments) / u.views) * 1000) / 10;
    }
    return u[key];
  }
  function fmt(v) {
    if (!isFinite(v)) return '-';
    return (Math.round(v * 10) / 10).toLocaleString('en-US');
  }
  function displayValue(u, key) {
    const v = getMetric(u, key);
    return key === 'engagement' ? v.toFixed(1) + '%' : fmt(v) + '万';
  }
  function shortName(name) {
    return name.length > 5 ? name.slice(0, 5) + '…' : name;
  }
  function getSelected() {
    return UPS.filter((u) => u.self || selected.has(u.id));
  }

  /* ---------- UP 选择器 ---------- */
  function renderSelector() {
    const box = $('upSelector');
    box.innerHTML = '';
    UPS.forEach((u) => {
      const pill = document.createElement('label');
      pill.className = 'up-pill' + (u.self ? ' self' : '') +
        (u.self || selected.has(u.id) ? ' active' : '');
      const color = colorFor(u);
      pill.style.color = (u.self || selected.has(u.id)) ? color : '';
      pill.innerHTML =
        `<span class="dot" style="background:${color}"></span>` +
        `<input type="checkbox" ${u.self || selected.has(u.id) ? 'checked' : ''} ${u.self ? 'disabled' : ''}/>` +
        `<span>${u.name}</span>`;
      if (!u.self) {
        pill.addEventListener('click', (e) => {
          e.preventDefault();
          if (selected.has(u.id)) selected.delete(u.id);
          else selected.add(u.id);
          renderAll();
        });
      }
      box.appendChild(pill);
    });
  }

  /* ---------- 摘要 ---------- */
  function renderSummary() {
    const sel = getSelected();
    const names = sel.map((u) => (u.self ? u.name + '(本人)' : u.name));
    $('summary').innerHTML = `正在对比 <b>${sel.length}</b> 位 UP 主：${names.join('、')}`;
  }

  /* ---------- 图例 ---------- */
  function renderLegend(el, sel) {
    el.innerHTML = sel
      .map((u) => `<span class="item"><span class="swatch" style="background:${colorFor(u)}"></span>${u.name}</span>`)
      .join('');
  }

  /* ---------- 雷达图 ---------- */
  function renderRadar() {
    const sel = getSelected();
    const N = RADAR_METRICS.length;
    const size = 360, cx = size / 2, cy = 168, R = 110;
    const maxByKey = {};
    RADAR_METRICS.forEach((m) => {
      maxByKey[m.key] = Math.max(...UPS.map((u) => getMetric(u, m.key)));
    });
    let s = `<svg viewBox="0 0 ${size} 340" class="chart-svg">`;
    for (let ring = 1; ring <= 4; ring++) {
      const rr = (R * ring) / 4;
      const pts = [];
      for (let i = 0; i < N; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / N;
        pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
      }
      s += `<polygon points="${pts.join(' ')}" fill="none" stroke="#2A3140" stroke-width="1"/>`;
    }
    for (let i = 0; i < N; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / N;
      const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
      s += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#2A3140" stroke-width="1"/>`;
      const lx = cx + (R + 20) * Math.cos(a), ly = cy + (R + 20) * Math.sin(a);
      s += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" fill="#98A2B3" font-size="11" text-anchor="middle" dominant-baseline="middle">${RADAR_METRICS[i].label}</text>`;
    }
    sel.forEach((u) => {
      const color = colorFor(u);
      const pts = [];
      for (let i = 0; i < N; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / N;
        const v = clamp(getMetric(u, RADAR_METRICS[i].key) / maxByKey[RADAR_METRICS[i].key], 0, 1);
        const rr = R * v;
        pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
      }
      s += `<polygon points="${pts.join(' ')}" fill="${color}" fill-opacity="0.16" stroke="${color}" stroke-width="2"/>`;
      pts.forEach((p) => {
        const [px, py] = p.split(',');
        s += `<circle cx="${px}" cy="${py}" r="2.5" fill="${color}"/>`;
      });
    });
    s += '</svg>';
    $('radar').innerHTML = s;
    renderLegend($('radarLegend'), sel);
  }

  /* ---------- 柱状图 ---------- */
  function renderBar() {
    const key = $('barMetric').value;
    const m = BAR_METRICS.find((x) => x.key === key);
    $('barTag').textContent = m.label;
    const sel = getSelected();
    const max = Math.max(...sel.map((u) => getMetric(u, key)));
    const W = 460, H = 300, padL = 44, padR = 16, padT = 16, padB = 46;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const n = sel.length, slot = plotW / n, bw = Math.min(48, slot * 0.6);
    let s = `<svg viewBox="0 0 ${W} ${H}" class="chart-svg">`;
    for (let g = 0; g <= 4; g++) {
      const yy = padT + (plotH * g) / 4;
      const val = max * (1 - g / 4);
      s += `<line x1="${padL}" y1="${yy}" x2="${W - padR}" y2="${yy}" stroke="#2A3140"/>`;
      s += `<text x="${padL - 6}" y="${yy + 3}" fill="#5B6675" font-size="9" text-anchor="end">${fmt(val)}</text>`;
    }
    sel.forEach((u, i) => {
      const v = getMetric(u, key);
      const bh = (plotH * v) / max;
      const cx = padL + slot * i + slot / 2;
      const x = cx - bw / 2, y = padT + plotH - bh;
      const color = colorFor(u);
      s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw}" height="${bh.toFixed(1)}" rx="4" fill="${color}" fill-opacity="0.88"/>`;
      s += `<text x="${cx.toFixed(1)}" y="${(y - 6).toFixed(1)}" fill="#C9D1D9" font-size="10" text-anchor="middle">${displayValue(u, key)}</text>`;
      s += `<text x="${cx.toFixed(1)}" y="${H - padB + 16}" fill="#98A2B3" font-size="10" text-anchor="middle">${shortName(u.name)}</text>`;
    });
    s += '</svg>';
    $('bar').innerHTML = s;
    renderLegend($('barLegend'), sel);
  }

  /* ---------- 折线图 ---------- */
  function renderLine() {
    const key = $('lineMetric').value;
    const m = TS_METRICS.find((x) => x.key === key);
    $('lineTag').textContent = m.label;
    const sel = getSelected();
    const days = sel[0].trends[key].length;
    const W = 460, H = 300, padL = 44, padR = 16, padT = 16, padB = 34;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const allVals = sel.flatMap((u) => u.trends[key]);
    let max = Math.max(...allVals), min = Math.min(...allVals, 0);
    if (max === min) max = min + 1;
    const x = (i) => padL + (plotW * i) / (days - 1);
    const y = (v) => padT + plotH * (1 - (v - min) / (max - min));
    let s = `<svg viewBox="0 0 ${W} ${H}" class="chart-svg">`;
    for (let g = 0; g <= 4; g++) {
      const yy = padT + (plotH * g) / 4;
      const val = max - ((max - min) * g) / 4;
      s += `<line x1="${padL}" y1="${yy}" x2="${W - padR}" y2="${yy}" stroke="#2A3140"/>`;
      s += `<text x="${padL - 6}" y="${yy + 3}" fill="#5B6675" font-size="9" text-anchor="end">${fmt(val)}</text>`;
    }
    [0, Math.floor(days / 2), days - 1].forEach((i) => {
      s += `<text x="${x(i)}" y="${H - 12}" fill="#5B6675" font-size="9" text-anchor="middle">D${i + 1}</text>`;
    });
    sel.forEach((u) => {
      const color = colorFor(u);
      const pts = u.trends[key].map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
      s += `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      const last = u.trends[key][days - 1];
      s += `<circle cx="${x(days - 1).toFixed(1)}" cy="${y(last).toFixed(1)}" r="3" fill="${color}"/>`;
    });
    s += '</svg>';
    $('line').innerHTML = s;
    renderLegend($('lineLegend'), sel);
  }

  /* ---------- 数据表 ---------- */
  function renderTable() {
    const sel = getSelected();
    const cols = [
      { key: 'views', label: '播放量' }, { key: 'likes', label: '点赞数' },
      { key: 'coins', label: '投币数' }, { key: 'favs', label: '收藏数' },
      { key: 'danmaku', label: '弹幕数' }, { key: 'comments', label: '评论数' },
      { key: 'followers', label: '粉丝数' }, { key: 'followersGrowth', label: '粉丝增长' },
      { key: 'engagement', label: '互动率' },
    ];
    let html = '<thead><tr><th>UP 主</th>' +
      cols.map((c) => `<th>${c.label}</th>`).join('') + '</tr></thead><tbody>';
    sel.forEach((u) => {
      html += `<tr class="${u.self ? 'self-row' : ''}">` +
        `<td class="name">${u.name}${u.self ? '<span class="badge">本人</span>' : ''}</td>` +
        cols.map((c) => `<td>${displayValue(u, c.key)}</td>`).join('') + '</tr>';
    });
    html += '</tbody>';
    $('dataTable').innerHTML = html;
  }

  /* ---------- 总渲染 ---------- */
  function renderAll() {
    renderSelector();
    renderSummary();
    renderRadar();
    renderBar();
    renderLine();
    renderTable();
  }

  /* ---------- 初始化 ---------- */
  function init() {
    const barSel = $('barMetric'), lineSel = $('lineMetric');
    BAR_METRICS.forEach((m) => {
      const o = document.createElement('option');
      o.value = m.key; o.textContent = '柱状图指标：' + m.label;
      if (m.key === 'views') o.selected = true;
      barSel.appendChild(o);
    });
    TS_METRICS.forEach((m) => {
      const o = document.createElement('option');
      o.value = m.key; o.textContent = '折线图指标：' + m.label;
      if (m.key === 'followers') o.selected = true;
      lineSel.appendChild(o);
    });
    barSel.addEventListener('change', renderBar);
    lineSel.addEventListener('change', renderLine);
    renderAll();
  }

  init();
})();
