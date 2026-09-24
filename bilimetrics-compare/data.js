/* =========================================================================
 * BiliMetrics · UP 主对比 · 数据层
 * -------------------------------------------------------------------------
 * 当前为「示例数据」，用于让图表与交互立刻可跑。
 *
 * ★ 接入真实 B 站数据（API-ready）只需做一件事：
 *   把下方 `UPS` 数组替换为接口返回、并按相同字段结构归一化后的对象即可。
 *   字段含义与单位（全部以「万」为单位，便于图表统一刻度）：
 *     id              唯一标识（字符串）
 *     name            展示名
 *     self            true=本人（张爷丨张TaMa），其余为 false
 *     followers       粉丝总数（万）
 *     followersGrowth 统计周期内粉丝净增（万）
 *     views           周期内总播放量（万）
 *     likes           点赞数（万）
 *     coins           投币数（万）
 *     favs            收藏数（万）
 *     danmaku         弹幕数（万）
 *     comments        评论数（万）
 *     trends          30 天趋势对象：{ followers:[], views:[], likes:[] }
 *                     —— 每个数组长度 30，末位应与上面的快照值一致
 *
 * 参考的接入方式（取消注释并填上你的实现）：
 *
 * async function loadFromAPI() {
 *   const res = await fetch('https://your-backend.example.com/api/bili/ups');
 *   const raw = await res.json();            // 后端负责调 B 站开放接口 + 鉴权 + 限流
 *   return raw.map(normalize);               // 归一化成上面的字段结构
 * }
 * // 然后在 app.js 初始化时： const UPS = await loadFromAPI();
 * ========================================================================= */

/* 确定性伪随机：保证每次刷新趋势曲线形状稳定（预览不跳变） */
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

const UPS = [
  {
    id: 'self', name: '张爷丨张TaMa', self: true,
    followers: 58.2, followersGrowth: 4.3, views: 1284, likes: 86,
    coins: 42, favs: 38, danmaku: 12, comments: 9,
    trends: {
      followers: genTrend(11, 58.2, 0.05),
      views: genTrend(12, 1284, 0.06),
      likes: genTrend(13, 86, 0.07),
    },
  },
  {
    id: 'up_yingshi', name: '影视飓风', self: false,
    followers: 920, followersGrowth: 22, views: 3200, likes: 210,
    coins: 95, favs: 88, danmaku: 30, comments: 18,
    trends: {
      followers: genTrend(21, 920, 0.04),
      views: genTrend(22, 3200, 0.05),
      likes: genTrend(23, 210, 0.06),
    },
  },
  {
    id: 'up_laofan', name: '老番茄', self: false,
    followers: 1850, followersGrowth: 15, views: 2600, likes: 180,
    coins: 110, favs: 95, danmaku: 42, comments: 25,
    trends: {
      followers: genTrend(31, 1850, 0.03),
      views: genTrend(32, 2600, 0.05),
      likes: genTrend(33, 180, 0.06),
    },
  },
  {
    id: 'up_hex', name: '何同学', self: false,
    followers: 1100, followersGrowth: 18, views: 1900, likes: 150,
    coins: 80, favs: 70, danmaku: 22, comments: 14,
    trends: {
      followers: genTrend(41, 1100, 0.04),
      views: genTrend(42, 1900, 0.05),
      likes: genTrend(43, 150, 0.06),
    },
  },
  {
    id: 'up_luoxiang', name: '罗翔说刑法', self: false,
    followers: 2400, followersGrowth: 30, views: 1500, likes: 120,
    coins: 60, favs: 110, danmaku: 18, comments: 30,
    trends: {
      followers: genTrend(51, 2400, 0.03),
      views: genTrend(52, 1500, 0.05),
      likes: genTrend(53, 120, 0.06),
    },
  },
  {
    id: 'up_banfo', name: '半佛仙人', self: false,
    followers: 480, followersGrowth: 12, views: 980, likes: 70,
    coins: 35, favs: 40, danmaku: 15, comments: 20,
    trends: {
      followers: genTrend(61, 480, 0.05),
      views: genTrend(62, 980, 0.06),
      likes: genTrend(63, 70, 0.07),
    },
  },
];

/* 默认对比对象：本人 + 3 位代表 UP 主，载入即有内容 */
const DEFAULT_SELECTED = ['self', 'up_yingshi', 'up_laofan', 'up_luoxiang'];

/* 暴露给 app.js（多文件结构：data.js 先加载） */
window.BILI_DATA = { UPS, DEFAULT_SELECTED };
