/**
 * BiliMetrics 观众建议墙 —— Cloudflare Worker 实时代理（未登录）
 *
 * 功能：
 *   1. 拉取 UP 主（mid 374392541）空间最新视频列表
 *   2. 逐个视频取「3 条主评论 + 完整楼中楼」（未登录上限：reply/main 主评论限 3 条，
 *      但 reply/reply 子评论不限量；这是 B 站对未登录用户的硬风控，无法翻页拿全量）
 *   3. 用「建议强度」规则筛出有选题价值的评论
 *   4. KV 缓存（默认 10 分钟）+ 内存兜底，避免每次请求都打 B 站（免费额度友好）
 *   5. 输出与静态 comments/data.js 同构的 JSON，并带 CORS 头供 GitHub Pages 前端跨域读取
 *
 * 未登录 = 零账号风险；若日后要全量评论，再接入 SESSDATA（放环境变量，不放代码）。
 */

const UP_MID = 374392541;

// 空间接口拿不到时的兜底列表（与 videos/data.js 同步，2026-09）
const FALLBACK_BVIDS = [
  "BV1Su4y137Uk","BV1Qz421f7jg","BV1XH4y1Z7Xv","BV1XM411f7vx","BV1UE421F7AQ",
  "BV1Sc411c7bA","BV1Um4y157Dd","BV138411U7ft","BV1zW4y1b77z","BV1th4y1h7Bt",
  "BV1fK411o7Xe","BV1p99cBCEbx","BV1Re411g7rF","BV1DH4y1y7bC","BV1Kv411W75p",
  "BV11b421Y7F3","BV1Uj411B7Jz","BV1JN411H7cp","BV1W8xZefEHy","BV1ofjq6LE6C",
  "BV1yZeF6AEqc","BV1qMcBzsEiq","BV1oE4m1X7qb","BV13Ce1znEsV","BV1eL411o7xu",
  "BV1MPFaehESH","BV1ih4y1V7Jq","BV1rG411k7K6","BV12g4y167a6","BV1cAfUBQE2u"
];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0';
const REF = 'https://www.bilibili.com';
const KV_TTL_SECONDS = 600; // 10 分钟

// ---------------- 纯 JS MD5（Worker 无 Web Crypto MD5） ----------------
function md5(s) {
  function rol(n, c) { return (n << c) | (n >>> (32 - c)); }
  function cmn(q, a, b, x, s, t) { a = rol((a + q + (x | 0) + t) | 0, s) + b | 0; return a >>> 0; }
  function ff(a,b,c,d,x,s,t){return cmn((b&c)|(~b&d),a,b,x,s,t);}
  function gg(a,b,c,d,x,s,t){return cmn((b&d)|(c&~d),a,b,x,s,t);}
  function hh(a,b,c,d,x,s,t){return cmn(b^c^d,a,b,x,s,t);}
  function ii(a,b,c,d,x,s,t){return cmn(c^(b|~d),a,b,x,s,t);}
  function cycle(x,k){
    let a=x[0],b=x[1],c=x[2],d=x[3];
    a=ff(a,b,c,d,k[0],7,-680876936);d=ff(d,a,b,c,k[1],12,-389564586);
    c=ff(c,d,a,b,k[2],17,606105819);b=ff(b,c,d,a,k[3],22,-1044525330);
    a=ff(a,b,c,d,k[4],7,-176418897);d=ff(d,a,b,c,k[5],12,1200080426);
    c=ff(c,d,a,b,k[6],17,-1473231341);b=ff(b,c,d,a,k[7],22,-45705983);
    a=ff(a,b,c,d,k[8],7,1770035416);d=ff(d,a,b,c,k[9],12,-1958414417);
    c=ff(c,d,a,b,k[10],17,-42063);b=ff(b,c,d,a,k[11],22,-1990404162);
    a=ff(a,b,c,d,k[12],7,1804603682);d=ff(d,a,b,c,k[13],12,-40341101);
    c=ff(c,d,a,b,k[14],17,-1502002290);b=ff(b,c,d,a,k[15],22,1236535329);
    a=gg(a,b,c,d,k[1],5,-165796510);d=gg(d,a,b,c,k[6],9,-1069501632);
    c=gg(c,d,a,b,k[11],14,643717713);b=gg(b,c,d,a,k[0],20,-373897302);
    a=gg(a,b,c,d,k[5],5,-701558691);d=gg(d,a,b,c,k[10],9,38016083);
    c=gg(c,d,a,b,k[15],14,-660478335);b=gg(b,c,d,a,k[4],20,-405537848);
    a=gg(a,b,c,d,k[9],5,568446438);d=gg(d,a,b,c,k[14],9,-1019803690);
    c=gg(c,d,a,b,k[3],14,-187363961);b=gg(b,c,d,a,k[8],20,1163531501);
    a=gg(a,b,c,d,k[13],5,-1444681467);d=gg(d,a,b,c,k[2],9,-51403784);
    c=gg(c,d,a,b,k[7],14,1735328473);b=gg(b,c,d,a,k[12],20,-1926607734);
    a=hh(a,b,c,d,k[5],4,-378558);d=hh(d,a,b,c,k[8],11,-2022574463);
    c=hh(c,d,a,b,k[11],16,1839030562);b=hh(b,c,d,a,k[14],23,-35309556);
    a=hh(a,b,c,d,k[1],4,-1530992060);d=hh(d,a,b,c,k[4],11,1272893353);
    c=hh(c,d,a,b,k[7],16,-155497632);b=hh(b,c,d,a,k[10],23,-1094730640);
    a=hh(a,b,c,d,k[13],4,681279174);d=hh(d,a,b,c,k[0],11,-358537222);
    c=hh(c,d,a,b,k[3],16,1735328473);b=hh(b,c,d,a,k[6],23,76029189);
    a=hh(a,b,c,d,k[9],4,-640364487);d=hh(d,a,b,c,k[12],11,-421815835);
    c=hh(c,d,a,b,k[15],16,530742520);b=hh(b,c,d,a,k[2],23,-995338651);
    a=ii(a,b,c,d,k[0],6,-198630844);d=ii(d,a,b,c,k[7],10,1126891415);
    c=ii(c,d,a,b,k[14],15,-1416354905);b=ii(b,c,d,a,k[5],21,-57434055);
    a=ii(a,b,c,d,k[12],6,1700485571);d=ii(d,a,b,c,k[3],10,-1894986606);
    c=ii(c,d,a,b,k[10],15,-1051523);b=ii(b,c,d,a,k[1],21,-2054922799);
    a=ii(a,b,c,d,k[8],6,1873313359);d=ii(d,a,b,c,k[15],10,-30611744);
    c=ii(c,d,a,b,k[6],15,-1560198380);b=ii(b,c,d,a,k[13],21,1309151649);
    a=ii(a,b,c,d,k[4],6,-145523070);d=ii(d,a,b,c,k[11],10,-1120210379);
    c=ii(c,d,a,b,k[2],15,718787259);b=ii(b,c,d,a,k[9],21,-343485551);
    x[0]=a>>>0;x[1]=b>>>0;x[2]=c>>>0;x[3]=d>>>0;
  }
  function blk(s){const b=[],n=((s.length+8)>>6)+1;for(let i=0;i<n*16;i++)b[i]=0;
    for(let i=0;i<s.length;i++)b[i>>2]|=s.charCodeAt(i)<<((i%4)*8);
    b[s.length>>2]|=0x80<<((s.length%4)*8);b[n*16-2]=s.length*8;return b;}
  const s2=unescape(encodeURIComponent(s)),x=blk(s2),n=x.length;
  for(let i=0;i<n;i+=16)cycle(x.slice(i,i+16),[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(k=>x[i+k]));
  let o='';for(let i=0;i<4;i++)o+=('0'+((x[i]>>>0).toString(16))).slice(-8);
  return o;
}

// ---------------- WBI 签名 ----------------
const MIXIN_KEY_ENC_TAB = [
  46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,
  33,9,42,19,29,28,14,39,12,38,41,13,37,48,7,16,24,55,40,61,
  26,17,0,1,60,51,30,4,22,25,54,21,56,59,6,63,57,62,11,36,
  20,34,44,52
];
function getMixinKey(imgKey, subKey) {
  const orig = imgKey + subKey;
  let key = '';
  for (const idx of MIXIN_KEY_ENC_TAB) key += orig[idx] || '';
  return key.slice(0, 32);
}
function wbiSign(params, mixinKey) {
  const wts = Math.floor(Date.now() / 1000);
  const signed = Object.assign({}, params, { wts });
  const sorted = Object.keys(signed).sort().map(k => k + '=' + signed[k]).join('&');
  return Object.assign({}, signed, { w_rid: md5(sorted + mixinKey) });
}
function enc(params) {
  return Object.entries(params).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');
}

// ---------------- 运行时缓存（buvid3 / mixinKey） ----------------
let _buvid3 = null;
let _mixin = null;
async function getBuvid() {
  if (_buvid3) return _buvid3;
  const r = await fetch('https://api.bilibili.com/x/frontend/finger/spi', { headers: { 'User-Agent': UA, Referer: REF } });
  const j = await r.json();
  _buvid3 = (j.data && (j.data.b_3 || j.data.buvid3)) || '';
  return _buvid3;
}
async function getMixin() {
  if (_mixin) return _mixin;
  const r = await fetch('https://api.bilibili.com/x/web-interface/nav', { headers: { 'User-Agent': UA, Referer: REF } });
  const j = await r.json();
  const img = j.data.wbi_img.img_url.split('/').pop().split('.')[0];
  const sub = j.data.wbi_img.sub_url.split('/').pop().split('.')[0];
  _mixin = getMixinKey(img, sub);
  return _mixin;
}
function cookieFor(buvid3) { return buvid3 ? 'buvid3=' + buvid3 : ''; }

// ---------------- 视频列表 ----------------
async function getBvids(buvid3, mixin) {
  try {
    const params = wbiSign({ mid: UP_MID, ps: 30, pn: 1, order: 'pubdate', web_location: '333.1007' }, mixin);
    const url = 'https://api.bilibili.com/x/space/wbi/arc/search?' + enc(params);
    const r = await fetch(url, { headers: { 'User-Agent': UA, Referer: REF, Cookie: cookieFor(buvid3) } });
    const j = await r.json();
    if (j.code === 0 && j.data && j.data.list && j.data.list.vlist) {
      const list = j.data.list.vlist.map(v => ({ bvid: v.bvid, title: v.title, aid: v.aid })).filter(v => v.bvid);
      if (list.length) return list;
    }
  } catch (e) { /* 落到兜底 */ }
  return FALLBACK_BVIDS.map(b => ({ bvid: b, title: '', aid: null }));
}

async function getAid(bvid, buvid3, mixin) {
  const r = await fetch('https://api.bilibili.com/x/web-interface/view?bvid=' + bvid, { headers: { 'User-Agent': UA, Referer: REF, Cookie: cookieFor(buvid3) } });
  const j = await r.json();
  return j.code === 0 ? j.data : null;
}

// ---------------- 评论抓取 ----------------
async function getMain(bvid, aid, buvid3, mixin) {
  const params = wbiSign({ type: 1, oid: aid, mode: 3, pagination_str: JSON.stringify({ offset: '' }), web_location: '333.1007' }, mixin);
  const r = await fetch('https://api.bilibili.com/x/v2/reply/main?' + enc(params), { headers: { 'User-Agent': UA, Referer: REF, Cookie: cookieFor(buvid3) } });
  const j = await r.json();
  return (j.code === 0 && j.data && j.data.replies) ? j.data.replies : [];
}
async function getReplies(bvid, aid, root, buvid3, mixin) {
  const params = wbiSign({ type: 1, oid: aid, root, pn: 1, ps: 20 }, mixin);
  const r = await fetch('https://api.bilibili.com/x/v2/reply/reply?' + enc(params), { headers: { 'User-Agent': UA, Referer: REF, Cookie: cookieFor(buvid3) } });
  const j = await r.json();
  return (j.code === 0 && j.data && j.data.replies) ? j.data.replies : [];
}

// ---------------- 建议筛选（与 fetch_bili_comments.py 同规则） ----------------
const SUG_STRONG = ['建议','希望','能不能','可不可以','最好','应该','不如','考虑一下','强烈要求','务必','优化','加个','多加','去掉','少点','多点','多来点','改一下','改进','做一期','出一期','做一个','搞一期','安排一下','有点缺陷','提个意见','提点建议','不太行','有点问题','建议做'];
const SUG_WANT = ['下期','下一期','下次','想看','求更','求个','催更','会回归','啥时候回归','什么时候回归','出第二','续作','更新吧','快更新','求更新'];
const BLOCK_WORDS = ['扣税','黄片','打飞机','约炮','做爱','裸聊'];
const BLOCK_PHRASES = ['这建议','这个建议','那建议','你的建议','建议太多','建议不错','建议很好','建议比'];
const CONTENT_WORDS = ['地图','模组','mod','MOD','游戏','视频','系列','名字','下期','更新','回归','角色','存档','服务','版本','玩法','追逐','追击','怪物','场景','配音','剪辑','bgm','BGM','视角','分p','队友'];
const QUESTION = ['？','?','吗','呢','啥时候','什么时候','有没有','会不会','怎么','为什么'];
const NOISE_RE = /^(\s|\[[^\]]{1,12}\])+$/;

function cleanMsg(s) {
  s = (s || '').replace(/\r/g, '');
  s = s.replace(/\s*\n+\s*/g, ' ');
  s = s.replace(/\.\.\. 展开|\.\.\.展开|展开|收起/g, '');
  s = s.replace(/https?:\/\/\S+/g, '');
  return s.replace(/\s{2,}/g, ' ').trim();
}
function classify(msg, uname) {
  if (!msg || msg.length < 4 || NOISE_RE.test(msg)) return { score: 0, kind: 'other' };
  if (BLOCK_WORDS.some(w => msg.includes(w))) return { score: 0, kind: 'other' };
  if (BLOCK_PHRASES.some(p => msg.includes(p))) return { score: 0, kind: 'other' };
  if (uname && /^(张爷|张TaMa)/.test(uname)) return { score: 0, kind: 'other' }; // 额外保险：作者名
  let sc = 0, hit = false;
  for (const k of SUG_STRONG) if (msg.includes(k)) { sc += 12; hit = true; }
  for (const k of SUG_WANT) if (msg.includes(k)) { sc += 12; hit = true; }
  if (hit) { if (msg.length >= 30) sc += 3; return { score: sc, kind: 'suggest' }; }
  if (msg.length >= 10 && QUESTION.some(q => msg.includes(q)) && CONTENT_WORDS.some(c => msg.includes(c))) {
    return { score: 6, kind: 'question' };
  }
  return { score: 0, kind: 'other' };
}

function toItem(c, bvid, aid, vtitle, isSub) {
  const m = c.member || {};
  const msg = cleanMsg((c.content || {}).message);
  if (!msg) return null;
  const { score, kind } = classify(msg, m.uname);
  if (kind === 'other') return null;
  let avatar = (m.avatar || '').replace(/^\/\//, 'https://');
  if (avatar && !/^https?:/.test(avatar)) avatar = 'https://' + avatar;
  return {
    id: String(c.rpid), uname: m.uname || '匿名', mid: String(m.mid || ''),
    avatar, msg, like: c.like || 0, rcount: c.rcount || 0, ctime: c.ctime || 0,
    bv: bvid, aid: aid, vtitle: vtitle || '', isSub: !!isSub, score, kind
  };
}

// ---------------- 主流程 ----------------
function uniqPush(arr, item, seen) {
  if (!item) return;
  if (seen.has(item.id)) return;
  seen.add(item.id); arr.push(item);
}

async function buildPayload(force) {
  const buvid3 = await getBuvid();
  const mixin = await getMixin();
  const vids = await getBvids(buvid3, mixin);

  const items = [];
  const seen = new Set();
  let raw = 0;
  const CONC = 6;
  for (let i = 0; i < vids.length; i += CONC) {
    const batch = vids.slice(i, i + CONC);
    const results = await Promise.all(batch.map(async (v) => {
      const out = [];
      let title = v.title || '';
      let aid = v.aid || null;
      try {
        const view = v.aid ? { aid: v.aid, title: v.title } : await getAid(v.bvid, buvid3, mixin);
        if (!view) return { out, title, bvid: v.bvid, aid: null };
        aid = view.aid;
        title = v.title || view.title || '';
        const mains = await getMain(v.bvid, aid, buvid3, mixin);
        for (const root of mains) {
          out.push({ c: root, isSub: false });
          raw++;
          const subs = await getReplies(v.bvid, aid, root.rpid, buvid3, mixin);
          for (const sub of subs) { out.push({ c: sub, isSub: true }); raw++; }
        }
      } catch (e) { /* 单视频失败不阻断整体 */ }
      return { out, title, bvid: v.bvid, aid };
    }));
    for (const r of results) {
      for (const e of r.out) {
        const it = toItem(e.c, r.bvid, r.aid, r.title, e.isSub);
        uniqPush(items, it, seen);
      }
    }
  }

  // 排序：建议优先，其次按赞数
  items.sort((a, b) => (b.score - a.score) || (b.like - a.like));
  const suggest = items.filter(i => i.kind === 'suggest').length;
  const question = items.length - suggest;
  return {
    snapshot: new Date().toISOString(),
    mode: 'realtime',
    stats: { raw, kept: items.length, suggest, question, videos: vids.length },
    items
  };
}

async function getCached(env, force) {
  const key = 'bili_comments_v1';
  if (!force && env.COMMENTS_KV) {
    try {
      const hit = await env.COMMENTS_KV.get(key, { type: 'json' });
      if (hit && hit.items && hit.items.length) return hit;
    } catch (e) {}
  }
  const payload = await buildPayload(force);
  if (env.COMMENTS_KV) {
    try { await env.COMMENTS_KV.put(key, JSON.stringify(payload), { expirationTtl: KV_TTL_SECONDS }); } catch (e) {}
  }
  return payload;
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store'
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (url.pathname === '/api/comments' || url.pathname === '/comments') {
      const force = url.searchParams.get('force') === '1';
      try {
        const payload = await getCached(env, force);
        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, corsHeaders(origin))
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e && e.message || e), items: [] }), {
          status: 502,
          headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, corsHeaders(origin))
        });
      }
    }

    if (url.pathname === '/' || url.pathname === '') {
      return new Response('BiliMetrics comments worker. GET /api/comments', {
        status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    return new Response('Not found', { status: 404 });
  }
};
