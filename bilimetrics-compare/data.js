/* =========================================================================
 * BiliMetrics · UP 主对比 · 数据层
 * -------------------------------------------------------------------------
 * 数据来源说明（重要）：
 *   ✔ followers（粉丝数）为「实时真实值」，于 SNAPSHOT_AT 通过 B 站 card 接口抓取。
 *   � ✗ 其余指标（播放/点赞/投币/收藏/弹幕/评论/30天趋势）为「示例估算」，
 *      用于演示多维度对比形态，不代表真实数值。
 *
 * ★ 接入真实全量数据（API-ready）只需做一件事：
 *   把下方 UPS 数组替换为接口返回、并按相同字段结构归一化后的对象即可，
 *   图表与交互逻辑无需改动。建议经后端代理（Cloudflare Worker 等）调用 B 站
 *   开放接口以绕过浏览器 CORS / WBI 签名 / 反爬限制。
 *
 * 字段（全部以「万」为单位，便于图表统一刻度）：
 *   id              唯一标识
 *   mid             B 站 UID
 *   name            展示名
 *   avatar          头像（本地 assets，避免外链裂图）
 *   self            true=本人
 *   level           账号等级
 *   verified        该 UP 主已核实的真实指标列表（目前仅 followers）
 *   followers       粉丝总数（万，真实）
 *   followers30dAgo 30 天前粉丝（万，估算，用于自身历史对比）
 *   followersGrowth 统计周期内粉丝净增（万，估算）
 *   views/likes/coins/favs/danmaku/comments  周期指标（万，估算）
 *   trends          { followers:[30], views:[30], likes:[30] } 末位=快照值
 * ========================================================================= */

/* 确定性伪随机：保证趋势曲线形状稳定（预览不跳变） */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* 生成 30 天趋势：线性爬升到 endVal + 受控噪声，末位强制等于快照值 */
function genTrend(seed, endVal, volatility) {
  const days = 30;
  const rng = mulberry32(seed);
  const arr = [];
  for (let i = 0; i < days; i++) {
    const t = i / (days - 1);
    const base = endVal * (0.55 + 0.45 * t);
    const noise = (rng() - 0.5) * volatility * endVal;
    arr.push(Math.max(0, Math.round((base + noise) * 10) / 10));
  }
  arr[days - 1] = endVal;
  return arr;
}

/* ===== 真实抓取时间（粉丝数快照） ===== */
const SNAPSHOT_AT = '2026-09-24 16:55';
const REAL_METRICS = ['followers']; // 仅粉丝数为实时真实值

const UPS = [
  {
    id: 'self', mid: 374392541, name: '张爷丨张TaMa', self: true, level: 6,
    avatar: 'assets/avatars/self.jpg',
    verified: ['followers'],
    followers: 24.06, followers30dAgo: 22.24, followersGrowth: 1.82,
    views: 612, likes: 41, coins: 19, favs: 17, danmaku: 5.8, comments: 4.3,
    trends: {
      followers: genTrend(11, 24.06, 0.04),
      views: genTrend(12, 612, 0.06),
      likes: genTrend(13, 41, 0.07),
    },
  },
  {
    id: 'up_yingshi', mid: 946974, name: '影视飓风', self: false, level: 6,
    avatar: 'assets/avatars/up_yingshi.jpg',
    verified: ['followers'],
    followers: 1833.66, followers30dAgo: 1805.26, followersGrowth: 28.40,
    views: 4200, likes: 268, coins: 121, favs: 110, danmaku: 38, comments: 22,
    trends: {
      followers: genTrend(21, 1833.66, 0.03),
      views: genTrend(22, 4200, 0.05),
      likes: genTrend(23, 268, 0.06),
    },
  },
  {
    id: 'up_luoxiang', mid: 517327498, name: '罗翔说刑法', self: false, level: 6,
    avatar: 'assets/avatars/up_luoxiang.jpg',
    verified: ['followers'],
    followers: 3217.72, followers30dAgo: 3176.12, followersGrowth: 41.60,
    views: 2100, likes: 162, coins: 78, favs: 142, danmaku: 21, comments: 34,
    trends: {
      followers: genTrend(31, 3217.72, 0.025),
      views: genTrend(32, 2100, 0.05),
      likes: genTrend(33, 162, 0.06),
    },
  },
  {
    id: 'up_banfo', mid: 37663924, name: '硬核的半佛仙人', self: false, level: 6,
    avatar: 'assets/avatars/up_banfo.jpg',
    verified: ['followers'],
    followers: 771.26, followers30dAgo: 756.06, followersGrowth: 15.20,
    views: 1180, likes: 86, coins: 44, favs: 51, danmaku: 19, comments: 27,
    trends: {
      followers: genTrend(41, 771.26, 0.035),
      views: genTrend(42, 1180, 0.06),
      likes: genTrend(43, 86, 0.07),
    },
  },
];

/* 默认全部纳入对比（载入即有内容） */
const DEFAULT_SELECTED = ['self', 'up_yingshi', 'up_luoxiang', 'up_banfo'];

/* 暴露给 app.js */
window.BILI_DATA = { UPS, DEFAULT_SELECTED, SNAPSHOT_AT, REAL_METRICS };
