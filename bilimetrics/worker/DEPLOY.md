# 部署「观众建议墙」实时 Worker

本目录是一个 **Cloudflare Worker**，负责实时（未登录）抓取你 B 站空间的观众评论、筛出有选题价值的建议，供 `wall.html` 跨域读取。

> 为什么需要它：浏览器端直连 `api.bilibili.com` 被 CORS 物理封死（`Allow-Origin` 只放行 bilibili 自己），且未登录每视频主评论被限 3 条。Worker 在服务端完成抓取 + WBI 签名 + 建议筛选，再带 CORS 头返回给前端。

## 前置
- 一个 Cloudflare 账号（免费即可）
- 本地装好 Node + Wrangler：`npm i -g wrangler`（或用 `npx wrangler`）

## 步骤
1. 登录 Cloudflare：
   ```bash
   npx wrangler login
   ```
2. 建 KV 命名空间（用于缓存，避免每次请求都打 B 站）：
   ```bash
   npx wrangler kv namespace create bilimetrics_comments
   ```
   复制输出的 `id`（形如 `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`），填进 `wrangler.toml` 里 `id = "REPLACE_WITH_YOUR_KV_NAMESPACE_ID"`。
3. 部署：
   ```bash
   cd 本目录
   npx wrangler deploy
   ```
   部署成功会给你一个地址，形如 `https://bilimetrics-comments.<你的子域>.workers.dev`。
4. 把 Worker 地址填进 `../wall.html` 顶部的常量 `COMMENTS_API`：
   ```js
   const COMMENTS_API = 'https://bilimetrics-comments.<你的子域>.workers.dev/api/comments';
   ```
   （留空 `''` 则前端继续用静态 `comments/data.js` 快照，不报错。）

## 接口
- `GET /api/comments` → JSON：`{ snapshot, mode:"realtime", stats, items:[...] }`
- `GET /api/comments?force=1` → 绕过 KV 缓存，强制重新抓取（手动「刷新」按钮用这个）
- 跨域：响应带 `Access-Control-Allow-Origin: *`，GitHub Pages 前端可直读。

## 实测边界（已用 Node 打真实 B 站验证）
- 未登录下 `x/v2/reply/main` 主评论**每视频限 3 条**且不可翻页（B 站硬风控）；`x/v2/reply/reply` 子评论不限量。
  因此每视频拿到「3 条主评论 + 它们的完整楼中楼」，这就是未登录实时的最大覆盖量——**数量与你现在的静态快照相近，区别是「打开即最新」而非 2 小时前**。
- 想要全量评论（突破 3 条/视频），必须接登录态 `SESSDATA`（风控更高、cookie 会过期），目前未做；若要做，把 SESSDATA 放 Worker 环境变量（**不要写进代码**）。

## 调优旋钮（在 `worker.js` 顶部）
- `KV_TTL_SECONDS`（默认 600）：缓存时长。调小→更实时但 B 站请求更频繁；调大→更省额度。
- `CONC`（默认 6）：并发抓取数。B 站若限流可调到 3。
- `UP_MID`：你的 B 站 UID（默认 374392541）。
- `FALLBACK_BVIDS`：空间接口拉不到时的兜底视频列表（与 `videos/data.js` 同步即可）。

## 免费额度提醒
- Workers 免费：10 万次请求/天；KV 免费：1GB 存储 + 10 万读/天 + 1 千写/天。
- 因有 KV 缓存，绝大多数请求只做一次 KV 读（毫秒级）；只有缓存过期那次才跑全量抓取（约 30 视频 × 5 请求）。个人站点完全够用。
