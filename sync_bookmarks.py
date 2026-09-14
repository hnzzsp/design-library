# -*- coding: utf-8 -*-
"""
书架同步脚本：读取 Edge 书签 → 智能归类 → 重新生成同目录下的 index.html

用法：
    python sync_bookmarks.py

供定时任务调用，实现收藏夹变更后站点内容的自动更新。
"""
import json
import os
import shutil
import sqlite3
import sys
import tempfile
import socket
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
BOOKMARKS_PATH = r'C:\Users\hnzzs\AppData\Local\Microsoft\Edge\User Data\Default\Bookmarks'
INDEX_PATH = os.path.join(HERE, 'index.html')
HISTORY_PATH = r'C:\Users\hnzzs\AppData\Local\Microsoft\Edge\User Data\Default\History'
HOT_LABEL = '🔥 高频实测'
HOT_SIZE = 15
# 存档：站点的「累积数据源」。浏览器里删掉的书签不会从站点消失，
# 新增的会自动并入，实现「只增不减」的并集同步。
ARCHIVE_PATH = os.path.join(HERE, 'bookmarks-archive.json')
EXTRA_PATH = os.path.join(HERE, 'extra-sites.json')
AI_MODULE_PATH = os.path.join(HERE, 'ai-module.html')
# 访问频次缓存：历史库被 Edge 占用（运行中）时读取会失败，
# 此时沿用上次的频次，避免「高频实测」分组因频次全 0 而消失。
VISITS_CACHE = os.path.join(HERE, 'visits-cache.json')
# 无效链接黑名单：被判定为「域名消失 / 404」的链接记录于此，
# 合并时自动排除，确保删掉的死链不会被收藏夹回拉回来（沿用并集模式的保护）。
DEAD_PATH = os.path.join(HERE, 'dead-links.json')
# 站内点击累计：页面把本机点击数导出后，人工合并进这里，作为持久基线叠加到访问次数上。
# 页面侧的实时增量存在 localStorage，换设备不跟随；合并进本文件后才跨会话持久生效。
CLICKS_MERGED = os.path.join(HERE, 'clicks-merged.json')
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

# ---------------- 归类规则 ----------------
CATEGORIES = [
    ('🎨 设计社区', ['www.topys.cn', '500px.com.cn', 'superopc.app', 'www.tuxuai.com',
                    'www.ignoredone.space', 'yybs100.com', 'huaban.com',
                    'www.zcool.com.cn', 'www.5iidea.com', 'www.gtn9.com']),
    ('✨ 设计灵感', ['dribbble.com', 'a1.gallery', 'navbar.gallery', 'deck.gallery',
                    'onepagelove.com', 'brandguidelines.net', 'supahero.io',
                    'posts.design', 'recent.design', 'logobook.com',
                    'bigbigwork.com', 'component.gallery']),
    ('🔤 字体资源', ['www.mianfeiziti.com', 'www.creativefabrica.com']),
    ('✍️ 字体设计', ['typographicposters.com', 'www.youworkforthem.com',
                    'typewolf.com', 'fontsarena.com', 'www.dafont.com']),
    ('⭐ 图标与矢量素材', ['freesvgicons.com', 'blog.csdn.net', 'iconmonstr.com', 'resourceboy.com',
                          'www.svgrepo.com', 'www.flaticon.com']),
    ('🖼 样机与印刷定制', ['www.free-mockup.com', 'rouzao.com']),
    ('🌈 配色工具', ['zhongguose.com', 'colorhunt.co', 'uigradients.com', 'colordrop.io']),
    ('🧩 UI 纹理', ['grainient.supply', 'transparenttextures.com', 'www.heropatterns.com',
                   'www.toptal.com/designers/subtlepatterns', 'patterninja.com',
                   'www.transparentpng.com']),
    ('🛠 在线设计工具', ['www.figma.com', 'www.photopea.com', 'ant.design']),
    ('🤖 AI 创作与生成工具', ['www.runninghub.cn', 'bytedance.larkoffice.com', 'pv.pixjam.cn',
                             'github.com/op7418', 'gezhe.com', 'www.koukoutu.com',
                             'vincentwei1021.github.io', 'github.com/Vincentwei1021',
                             'tripo3d.com', 'hyper3d.ai', 'pixian.ai']),
    ('⚡ AI 助手与生产力', ['www.workbuddy.cn', 'www.codebuddy.cn', 'www.trae.cn',
                           'chatgpt.com', 'claude.ai', 'www.doubao.com', 'kimi.moonshot.cn',
                           'chat.deepseek.com']),
    ('🎬 视频与动效资源', ['aescripts.com', 'www.lookae.com', 'bilibili.dyqvideo.com',
                          '60fps.design', 'dova-s.jp']),
    ('📷 图片与素材', ['www.aigei.com', 'cn.bing.com', 'wallpaperbat.com',
                      'www.pexels.com', 'pixabay.com', 'www.magnific.com',
                      'contributor.hellorf.com']),
    ('🎓 学习规划与个人项目', ['share.traecontent.cn', 'q1zinp5jszz.feishu.cn',
                              'acnbwxnqyofc.feishu.cn', 'www.canva.cn', 'app.workbuddy.link',
                              'i.chaoxing.com', 'www.uxbaike.com', 'hnzzsp.github.io']),
    ('🎮 游戏与二次元', ['mzh.moegirl.org.cn', 'gfwiki.org', 'prts.wiki', 'www.acgice.com',
                        'www.twitch.tv', 'www.xiaoheihe.cn', 'www.gamemodels3d.com',
                        'wtliker.com', 'steamcard.varegame.com', 'bandori.party', 'www.titaike.cn',
                        'picrew.me', 'booth.pm']),
    ('📺 社媒与日常', ['www.bilibili.com', 'www.xiaohongshu.com']),
    ('📦 软件与工具站', ['getr.top']),
]

CAT_ACCENT = {
    '🔥 高频实测': '#E11D48',
    '🎨 设计社区': '#FF7A45',
    '✨ 设计灵感': '#FB7185',
    '🔤 字体资源': '#8B5CF6',
    '✍️ 字体设计': '#A855F7',
    '⭐ 图标与矢量素材': '#14B8A6',
    '🖼 样机与印刷定制': '#F59E0B',
    '🌈 配色工具': '#EC4899',
    '🧩 UI 纹理': '#2DD4BF',
    '🛠 在线设计工具': '#3B82F6',
    '🤖 AI 创作与生成工具': '#10B981',
    '⚡ AI 助手与生产力': '#7C3AED',
    '🎬 视频与动效资源': '#EF4444',
    '📷 图片与素材': '#06B6D4',
    '🎓 学习规划与个人项目': '#6366F1',
    '🎮 游戏与二次元': '#84CC16',
    '📺 社媒与日常': '#64748B',
    '📦 软件与工具站': '#475569',
}

# ---------------- 读取书签 ----------------
def load_bookmarks():
    if not os.path.exists(BOOKMARKS_PATH):
        print('未找到 Edge 书签文件：' + BOOKMARKS_PATH)
        sys.exit(1)
    data = json.load(open(BOOKMARKS_PATH, encoding='utf-8'))

    def walk(node, path):
        out = []
        if node.get('type') == 'folder':
            name = node.get('name', '')
            newpath = path + [name] if name else path
            for c in node.get('children', []):
                out += walk(c, newpath)
        elif node.get('type') == 'url':
            folder = ' / '.join(path[1:]) if len(path) > 1 else '收藏夹栏'
            out.append({'folder': folder, 'title': node.get('name', '') or '(未命名)',
                        'url': node.get('url', '')})
        return out

    items = []
    for root_key in ('bookmark_bar', 'other', 'synced'):
        root = data.get('roots', {}).get(root_key)
        if root:
            items += walk(root, [root_key])
    return items


def classify(bm):
    if bm['url'].startswith('file:///'):
        return '🎓 学习规划与个人项目'
    for cat, domains in CATEGORIES:
        if any(d in bm['url'] for d in domains):
            return cat
    return '📦 软件与工具站'


def build_groups(bookmarks):
    for bm in bookmarks:
        bm['category'] = classify(bm)
        bm['is_local'] = bm['url'].startswith('file:///')
    grouped = {}
    for bm in bookmarks:
        grouped.setdefault(bm['category'], []).append(bm)
    ordered = {c: grouped[c] for c, _ in CATEGORIES if c in grouped}
    for c in grouped:  # 兜底：规则外新增的分类
        ordered.setdefault(c, grouped[c])
    return ordered


# ---------------- 访问频次（来自 Edge 浏览历史） ----------------
def _read_visit_counts(db_path):
    """以只读方式打开历史库快照，取出 (url, visit_count)。"""
    conn = sqlite3.connect('file:%s?mode=ro' % db_path.replace('\\', '/'), uri=True)
    try:
        return conn.execute('SELECT url, visit_count FROM urls').fetchall()
    finally:
        conn.close()


def load_history_stats():
    """读取 Edge 历史库，返回 (域名频次 dict, 精确URL频次 dict)。

    Edge 运行时 History 会被锁住，所以先复制一份快照再以只读方式打开；
    读不到历史时返回空字典，站点退化为「无频次」模式，不影响正常生成。
    """
    if not os.path.exists(HISTORY_PATH):
        print('  （未找到 History 库，跳过频次统计）')
        return {}, {}
    tmp = os.path.join(tempfile.gettempdir(), 'edge_hist_snapshot.db')
    tmp_wal = tmp + '-wal'
    # Edge 运行时 History 处于 WAL 模式，未 checkpoint 的记录只存在于 -wal 里。
    # 只拷主库会漏掉最近几小时到几天的浏览记录（实测漏 47 条），访问次数偏低。
    # WAL 正在被写入时拷到的可能是半帧，SQLite 靠校验和自动丢弃，不会损坏结果。
    with_wal = False
    try:
        shutil.copy(HISTORY_PATH, tmp)
        if os.path.exists(HISTORY_PATH + '-wal'):
            try:
                shutil.copy(HISTORY_PATH + '-wal', tmp_wal)
                with_wal = True
            except OSError:
                with_wal = False
        rows = _read_visit_counts(tmp)
    except (OSError, sqlite3.Error):
        # 带 WAL 打不开就退回纯主库，宁可少读也不要整个跳过频次统计
        try:
            if os.path.exists(tmp_wal):
                os.remove(tmp_wal)
            shutil.copy(HISTORY_PATH, tmp)
            rows = _read_visit_counts(tmp)
            with_wal = False
        except (OSError, sqlite3.Error) as e:
            print('  （历史库读取失败，跳过频次统计：%s）' % e)
            return {}, {}
    finally:
        for f in (tmp, tmp_wal):
            try:
                if os.path.exists(f):
                    os.remove(f)
            except OSError:
                pass
    if with_wal:
        print('  （已连同未落盘的 WAL 记录一起读取）')

    dom, exact = {}, {}
    for url, vc in rows:
        vc = vc or 0
        if not url:
            continue
        key = url.rstrip('/')
        exact[key] = max(exact.get(key, 0), vc)
        try:
            host = (urlparse(url).hostname or '').lower().replace('www.', '')
        except ValueError:
            continue
        if host:
            dom[host] = dom.get(host, 0) + vc
    return dom, exact


def attach_visits(bookmarks, dom, exact):
    """给每条书签补上 visits 字段。本地文件记为 -1，不参与频次排名。

    优先用「域名累计访问量」：书签代表的是「这个站点」，用户多在子页/搜索页活动，
    首页地址本身访问次数很少，用域名总访问量才能真实反映「你多常用这个站」。
    精确 URL 仅作兜底（域名取不到时）。
    """
    for bm in bookmarks:
        url = bm.get('url', '')
        if url.startswith('file:///'):
            bm['visits'] = -1
            continue
        try:
            host = (urlparse(url).hostname or '').lower().replace('www.', '')
        except ValueError:
            host = ''
        v = dom.get(host, 0) or exact.get(url.rstrip('/'), 0)
        bm['visits'] = v
    return bookmarks


def cache_visits(bookmarks):
    """把本次成功算出的频次写进缓存，供历史库不可读时回退。"""
    m = {bm['url'].rstrip('/'): bm.get('visits', 0)
         for bm in bookmarks if not bm['url'].startswith('file:///')}
    json.dump(m, open(VISITS_CACHE, 'w', encoding='utf-8'), ensure_ascii=False)


def load_visits_cache():
    if os.path.exists(VISITS_CACHE):
        try:
            return json.load(open(VISITS_CACHE, encoding='utf-8'))
        except (ValueError, OSError):
            return {}
    return {}


def norm_url(u):
    """URL 归一化：去掉结尾斜杠，作为点击计数与去重的统一键。"""
    return (u or '').rstrip('/')


def load_clicks_merged():
    """读取已合并的站内点击累计（页面导出 → 人工合并进 clicks-merged.json）。"""
    if not os.path.exists(CLICKS_MERGED):
        return {}
    try:
        data = json.load(open(CLICKS_MERGED, encoding='utf-8'))
    except (ValueError, OSError):
        return {}
    if not isinstance(data, dict):
        return {}
    return {norm_url(k): int(v) for k, v in data.items()
            if isinstance(v, (int, float)) and int(v) > 0}


def clicks_epoch():
    """合并数据的内容指纹。页面据此判断「本地增量是否已被合并」，避免重复计数。"""
    merged = load_clicks_merged()
    if not merged:
        return '0'
    import hashlib
    payload = json.dumps(sorted(merged.items()), ensure_ascii=False, sort_keys=True)
    return hashlib.md5(payload.encode('utf-8')).hexdigest()[:12]


def apply_clicks_merged(bookmarks):
    """把站内点击累计叠加到访问次数上（在写入 visits 缓存之后调用，保持缓存为纯 Edge 历史）。"""
    merged = load_clicks_merged()
    if not merged:
        return 0
    n = 0
    for bm in bookmarks:
        c = merged.get(norm_url(bm.get('url', '')))
        if c:
            bm['visits'] = max(bm.get('visits', 0), 0) + c
            n += 1
    return n


def sort_by_usage(items):
    """访问多的排前面；从未打开过的（-1 本地 或 0）沉到最后。"""
    return sorted(items, key=lambda b: (-max(b.get('visits', 0), 0), b.get('title', '')))


def build_hot_group(groups):
    """从所有书签里挑出访问最多的若干条，组成虚拟的「高频实测」分组。

    只收录真正在用的「设计/学习/生产力」类资源——排除纯社媒、游戏、本地文件，
    否则 B站/小红书会霸榜，反而掩盖真正高频的设计工具。
    """
    flat = [b for items in groups.values() for b in items]
    ranked = sorted(flat, key=lambda b: -max(b.get('visits', 0), 0))
    excluded = ('📺 社媒与日常', '🎮 游戏与二次元')
    hot = [b for b in ranked
           if b.get('visits', 0) > 0
           and not b.get('is_local')
           and b.get('category') not in excluded][:HOT_SIZE]
    return hot


# ---------------- 并集合并（存档 ∪ 当前书签） ----------------
def load_archive():
    """读取累积存档，返回扁平的书签列表。"""
    if not os.path.exists(ARCHIVE_PATH):
        return []
    try:
        data = json.load(open(ARCHIVE_PATH, encoding='utf-8'))
    except (ValueError, OSError):
        return []
    items = []
    for _cat, group in data.items():
        for bm in group:
            items.append({'folder': bm.get('folder', ''),
                          'title': bm.get('title', '(未命名)'),
                          'url': bm.get('url', '')})
    return items


def load_extra():
    """读取「每周发现的设计站」清单 extra-sites.json，返回书签条目列表。
    由 discover_design_sites.py --apply 写入的用户确认过的外部设计站，
    与 Edge 收藏夹并集存档分离管理，定期发现自动补充。"""
    if not os.path.exists(EXTRA_PATH):
        return []
    try:
        d = json.load(open(EXTRA_PATH, encoding='utf-8'))
    except (ValueError, OSError):
        return []
    out = []
    for e in d:
        if isinstance(e, dict) and e.get('url'):
            out.append({'folder': e.get('folder', '外部发现'),
                        'title': e.get('title', '(未命名)'),
                        'url': e['url']})
    return out


def load_ai_module():
    """读取 AI 分类模块 HTML 片段，若不存在则返回空字符串。"""
    if not os.path.exists(AI_MODULE_PATH):
        return ''
    try:
        return open(AI_MODULE_PATH, encoding='utf-8').read()
    except (ValueError, OSError):
        return ''


def merge_with_archive(current):
    """按 URL 去重合并：存档为底，当前书签覆盖同名条目的标题。"""
    merged = {}
    for bm in load_archive() + current:
        if not bm.get('url'):
            continue
        key = bm['url'].rstrip('/')
        if key in merged:
            merged[key]['title'] = bm['title'] or merged[key]['title']
        else:
            merged[key] = dict(bm)
    return list(merged.values())


def save_archive(groups):
    """把本次结果写回存档，保证新增书签能被累积下来。"""
    json.dump(groups, open(ARCHIVE_PATH, 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)


# ---------------- 无效链接检测与黑名单 ----------------
# 只在特定浏览器/本机有效的地址：发布到线上（尤其手机端）必然是死链，同步时直接排除。
UNUSABLE_PREFIXES = (
    'edge://', 'chrome://', 'chrome-extension://', 'edge-extension://',
    'about:', 'view-source:', 'data:', 'javascript:', 'blob:',
)
UNUSABLE_HOSTS = ('localhost', '127.0.0.1', '0.0.0.0', '[::1]')


def load_dead_links():
    """返回 (url集合, 域名集合)。两个维度都记，合并时任一命中即排除。"""
    if os.path.exists(DEAD_PATH):
        try:
            d = json.load(open(DEAD_PATH, encoding='utf-8'))
        except (ValueError, OSError):
            d = {}
    else:
        d = {}
    return set(d.get('urls', [])), set(d.get('domains', []))


def add_dead_links(dead_urls):
    urls, domains = load_dead_links()
    for u in dead_urls:
        urls.add(u.rstrip('/'))
        try:
            host = (urlparse(u).hostname or '').lower().replace('www.', '')
        except ValueError:
            host = ''
        if host:
            domains.add(host)
    json.dump({'urls': sorted(urls), 'domains': sorted(domains)},
              open(DEAD_PATH, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


def is_unusable(bm):
    """判断是否为「线上必然打不开」的地址：浏览器内部页 / 本机地址。

    这类书签（edge://newtab、chrome-extension://…、localhost:4321）在 PC 端看着正常，
    发布到站点后（尤其手机端）点开必是死链。必须在合并阶段就排除，
    否则并集模式每次同步都会把它从收藏夹里重新拉回来。
    """
    u = (bm.get('url') or '').strip()
    low = u.lower()
    if any(low.startswith(p) for p in UNUSABLE_PREFIXES):
        return True
    try:
        host = (urlparse(u).hostname or '').lower()
    except ValueError:
        return False
    return host in UNUSABLE_HOSTS


def filter_blacklist(bookmarks):
    """排除已知无效链接（URL / 域名命中黑名单）与浏览器内部页、本机地址。"""
    du, dd = load_dead_links()
    out = []
    for bm in bookmarks:
        u = bm.get('url', '').rstrip('/')
        if (u in du) or is_unusable(bm):
            continue
        try:
            host = (urlparse(bm.get('url', '')).hostname or '').lower().replace('www.', '')
        except ValueError:
            host = ''
        if host and host in dd:
            continue
        out.append(bm)
    return out


def _is_dns_fail(reason):
    s = str(reason).lower()
    return any(k in s for k in ('getaddrinfo', 'name or service not known',
            'no address associated', 'name resolution', '11001', 'nodename nor servname'))


def _req(url, method):
    return urllib.request.Request(url, method=method, headers={'User-Agent': UA, 'Accept': '*/*'})


def _check_get(u):
    """HEAD 被拒（403/401/405 等反爬）时回退 GET 再判。"""
    try:
        with urllib.request.urlopen(_req(u, 'GET'), timeout=8) as r:
            return 'dead' if r.getcode() == 404 else 'alive'
    except urllib.error.HTTPError as e:
        return 'dead' if e.code == 404 else 'alive'
    except Exception:
        return 'alive'


def _root_alive(host):
    """探测域名根路径（http/https）是否可访问，用于区分「整站已死」与「单路径/反爬 404」。"""
    for scheme in ('https://', 'http://'):
        try:
            with urllib.request.urlopen(_req(scheme + host + '/', 'GET'), timeout=8) as r:
                if r.getcode() < 400:
                    return True
        except urllib.error.HTTPError as e:
            if e.code < 400:
                return True
        except Exception:
            continue
    return False


def _verify_dead(u):
    """GET 复核原 URL 确为 404 时，再看域名根是否还活着。整站在则保留，根也死才算真死链。"""
    if _check_get(u) == 'alive':
        return 'alive'
    try:
        host = urlparse(u).hostname or ''
    except ValueError:
        host = ''
    if host and _root_alive(host):
        return 'alive'
    return 'dead'


def check_url(url):
    """判定单条链接：'dead'（整站已死）或 'alive'（其余一律保守保留）。

    判为无效仅两种明确信号：
      - 域名无法解析（DNS 失败 / 主机不存在）→ 硬死链
      - 资源已删除且整站都已不可达（根路径也 404 / DNS 失败）
    很多站点不支持 HEAD 方法会返回 404，且登录墙/反爬也会返回 404，因此 404 一律先用
    GET 复核、再看域名根是否存活，避免把活站误杀。超时、连接被拒、5xx 等按 alive 处理。
    """
    u = url.rstrip('/')
    try:
        with urllib.request.urlopen(_req(u, 'HEAD'), timeout=8) as r:
            code = r.getcode()
            if code == 404:
                return _verify_dead(u)
            return 'alive'
    except urllib.error.HTTPError as e:
        if e.code == 404 or e.code in (403, 401, 405, 400, 429, 406):
            return _verify_dead(u)
        return 'alive'
    except urllib.error.URLError as e:
        return 'dead' if _is_dns_fail(getattr(e, 'reason', e)) else 'alive'
    except socket.timeout:
        return 'alive'
    except Exception:
        return 'alive'


def detect_dead(urls):
    """并发检测一批链接，返回 {url: 'dead'/'alive'}。异常统一视为 alive。"""
    urls = list(dict.fromkeys(urls))
    res = {}
    if not urls:
        return res
    with ThreadPoolExecutor(max_workers=10) as ex:
        futs = {ex.submit(check_url, u): u for u in urls}
        for f in as_completed(futs):
            u = futs[f]
            try:
                res[u] = f.result()
            except Exception:
                res[u] = 'alive'
    return res


# ---------------- 生成页面 ----------------
TEMPLATE = '''<!DOCTYPE html>
<html lang="zh-CN" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>素材库 · 设计素材速查站</title>
  <meta name="description" content="聚合字体、图标、配色、样机、AI 工具、灵感等精选设计资源">
  <!-- 静态站容易拿到旧缓存，明确要求每次向源站校验 -->
  <meta http-equiv="Cache-Control" content="no-cache, must-revalidate">
  <meta http-equiv="Pragma" content="no-cache">
  <meta http-equiv="Expires" content="0">
  <meta name="build" content="__UPDATED__">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <link rel="apple-touch-icon" sizes="180x180" href="icons/favicon-180.png">
  <link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="icons/favicon-16.png">
  <link rel="manifest" href="site.webmanifest">
  <style>
    :root {
      --bg: #FAF9F7; --card: #FFFFFF; --text: #1F1D1A; --muted: #6F6C67;
      --border: #EBE8E2; --accent: #FF7A45; --accent-text: #FFFFFF;
      --shadow: 0 1px 2px rgba(31,29,26,0.04), 0 6px 18px rgba(31,29,26,0.06);
      --radius: 16px;
    }
    [data-theme="dark"] {
      --bg: #151413; --card: #1F1D1B; --text: #F2F0ED; --muted: #9B9892;
      --border: #33302C; --accent: #FF8A5C; --accent-text: #1A0F08;
      --shadow: 0 1px 2px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.35);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial,
                   "PingFang SC", "Microsoft YaHei", sans-serif;
      background: var(--bg); color: var(--text); line-height: 1.5; padding-bottom: 80px;
    }
    a { color: inherit; text-decoration: none; }
    .wrap { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
    header {
      position: sticky; top: 0; z-index: 50;
      background: rgba(250,249,247,0.82);
      backdrop-filter: saturate(180%) blur(14px);
      border-bottom: 1px solid var(--border);
    }
    [data-theme="dark"] header { background: rgba(21,20,19,0.82); }
    .header-inner { display: flex; align-items: center; gap: 16px; padding: 14px 0; }
    .logo { width: 38px; height: 38px; flex-shrink: 0; }
    .brand { flex: 1; }
    .brand h1 { font-size: 18px; font-weight: 700; letter-spacing: 0.5px; }
    .brand p { font-size: 12px; color: var(--muted); margin-top: 2px; }
    .theme-btn {
      width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--border);
      background: var(--card); cursor: pointer; display: grid; place-items: center; transition: transform .15s;
    }
    .theme-btn:hover { transform: scale(1.05); }
    .ghost-btn {
      display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px;
      border-radius: 999px; border: 1px solid var(--border); background: var(--card);
      color: var(--text); font-size: 13px; font-weight: 600; cursor: pointer;
      white-space: nowrap; transition: transform .15s, border-color .15s;
    }
    .ghost-btn:hover { transform: scale(1.03); border-color: var(--accent); }
    .ghost-btn svg { flex-shrink: 0; }
    @media (max-width: 520px) { .ghost-btn .label { display: none; } .ghost-btn { padding: 0 10px; } }
    #toTop {
      position: fixed; right: 20px; bottom: 24px; z-index: 60;
      width: 44px; height: 44px; padding: 0; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      border: 1px solid var(--border); background: var(--card); color: var(--text);
      box-shadow: var(--shadow); cursor: pointer;
      opacity: 0.45; transition: opacity .2s, border-color .15s, color .15s, transform .15s;
    }
    #toTop:hover { opacity: 1; border-color: var(--accent); color: var(--accent); transform: scale(1.06); }
    @media (max-width: 520px) { #toTop { right: 14px; bottom: 18px; width: 40px; height: 40px; opacity: 0.5; } }
    /* 悬停预览小窗：鼠标停在卡片上约 0.45 秒后弹出目标站的实时预览 */
    #peek {
      position: fixed; z-index: 70; width: 340px; height: 250px; left: 0; top: 0;
      border-radius: 14px; overflow: hidden; pointer-events: none;
      background: var(--card); border: 1px solid var(--border);
      box-shadow: 0 2px 6px rgba(31,29,26,0.08), 0 18px 44px rgba(31,29,26,0.20);
      visibility: hidden; opacity: 0; transform: translateY(6px) scale(0.98);
      transition: opacity .16s ease, transform .16s ease;
    }
    #peek.show { visibility: visible; opacity: 1; transform: translateY(0) scale(1); }
    .peek-head { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-bottom: 1px solid var(--border); }
    .peek-fav { width: 18px; height: 18px; border-radius: 4px; flex-shrink: 0; }
    .peek-txt { flex: 1; min-width: 0; }
    .peek-title { font-size: 12px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .peek-host { font-size: 11px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .peek-hint { font-size: 10px; color: var(--muted); flex-shrink: 0; padding: 2px 7px; border: 1px solid var(--border); border-radius: 999px; }
    .peek-body { position: relative; width: 100%; height: calc(100% - 37px); background: #fff; }
    .peek-frame { width: 100%; height: 100%; border: 0; display: block; background: #fff; }
    .peek-mask {
      position: absolute; inset: 0; display: grid; place-items: center; align-content: center;
      background: var(--card); text-align: center; padding: 18px;
      font-size: 12px; line-height: 1.6; color: var(--muted);
    }
    .peek-mask[hidden] { display: none; }
    .peek-mask b { display: block; font-size: 13px; color: var(--text); margin-bottom: 4px; }
    .peek-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--accent); margin: 0 auto 10px; animation: peekpulse 1s infinite ease-in-out; }
    @keyframes peekpulse { 0%,100% { opacity: .25; } 50% { opacity: 1; } }
    /* 触屏/窄屏没有真实 hover，直接不启用预览 */
    @media (hover: none), (max-width: 720px) { #peek { display: none !important; } }
    .hero { padding: 48px 0 28px; }
    .hero h2 { font-size: clamp(28px, 5vw, 44px); font-weight: 800; letter-spacing: -0.5px; line-height: 1.15; }
    .hero h2 span { color: var(--accent); }
    .hero p { margin-top: 12px; color: var(--muted); font-size: 16px; max-width: 540px; }
    .searchbar { position: sticky; top: 68px; z-index: 40; background: var(--bg); padding: 12px 0 14px; }
    .search-wrap { position: relative; }
    .searchbar input {
      width: 100%; padding: 14px 18px 14px 46px; font-size: 15px;
      border: 1px solid var(--border); border-radius: 999px;
      background: var(--card); color: var(--text); box-shadow: var(--shadow); outline: none;
    }
    .searchbar input:focus { border-color: var(--accent); }
    .searchbar svg {
      position: absolute; left: 18px; top: 50%; transform: translateY(-50%);
      width: 18px; height: 18px; color: var(--muted); pointer-events: none;
    }
    .chips { display: flex; gap: 10px; overflow-x: auto; padding: 4px 0 18px; scrollbar-width: none; }
    .chips::-webkit-scrollbar { display: none; }
    .chip {
      flex-shrink: 0; padding: 8px 14px; border-radius: 999px; font-size: 13px; font-weight: 500;
      border: 1px solid var(--border); background: var(--card); color: var(--text);
      cursor: pointer; transition: .15s; user-select: none;
    }
    .chip:hover { border-color: var(--accent); }
    .chip.active { background: var(--accent); color: var(--accent-text); border-color: var(--accent); }
    .chip .count { margin-left: 6px; opacity: .7; font-size: 11px; }
    .section { margin-bottom: 40px; }
    .section-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 16px; }
    .section-head h3 { font-size: 18px; font-weight: 700; }
    .section-head .num { font-size: 12px; color: var(--muted); font-weight: 500; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
    .card {
      display: flex; align-items: flex-start; gap: 12px;
      background: var(--card); border: 1px solid var(--border); border-radius: var(--radius);
      padding: 14px; box-shadow: var(--shadow);
      transition: transform .12s, border-color .12s; overflow: hidden; position: relative;
    }
    .card::before {
      content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
      background: var(--cat-color, var(--accent)); opacity: .85;
    }
    .card:hover { transform: translateY(-3px); border-color: var(--cat-color, var(--accent)); }
    .avatar {
      width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
      display: grid; place-items: center; font-size: 15px; font-weight: 700;
      color: #fff; background: var(--cat-color, var(--accent)); text-shadow: 0 1px 2px rgba(0,0,0,.15);
    }
    .meta { min-width: 0; flex: 1; }
    .meta .title { font-size: 14px; font-weight: 600; line-height: 1.35; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .meta .host { font-size: 11px; color: var(--muted); margin-top: 5px; word-break: break-all; line-height: 1.3; }
    .badge {
      display: inline-block; font-size: 10px; color: var(--accent); border: 1px solid var(--accent);
      border-radius: 4px; padding: 1px 5px; margin-left: 6px; vertical-align: middle; opacity: .85;
    }
    .visits {
      display: flex; align-items: center; gap: 8px; margin-top: 7px;
    }
    .bar { flex: 1; height: 4px; border-radius: 2px; background: var(--border); overflow: hidden; }
    .bar > i { display: block; height: 100%; background: var(--cat-color, var(--accent)); border-radius: 2px; }
    .visits .num { font-size: 11px; color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
    .visits .num.dead { color: var(--muted); opacity: .65; font-style: italic; }
    .card.dim { opacity: .58; }
    .card.dim:hover { opacity: 1; }
    .hot-note {
      font-size: 12px; color: var(--muted); margin: -8px 0 16px; line-height: 1.5;
    }
    .empty { color: var(--muted); padding: 40px 0; text-align: center; }
    .visits .num .mine { color: var(--cat-color, var(--muted)); font-weight: 700; margin-left: 4px; }
    .toast {
      position: fixed; left: 50%; bottom: 28px; transform: translate(-50%, 12px);
      background: var(--text); color: var(--bg); padding: 10px 18px; border-radius: 999px;
      font-size: 13px; opacity: 0; pointer-events: none; transition: all .22s ease; z-index: 99;
      box-shadow: 0 8px 24px rgba(0,0,0,.18); max-width: 90vw; text-align: center;
    }
    .toast.show { opacity: 1; transform: translate(-50%, 0); }
    .updatebar {
      position: fixed; left: 50%; top: 16px; transform: translate(-50%, -140%);
      display: none; align-items: center; gap: 12px; z-index: 100;
      background: var(--card); border: 1px solid var(--accent); color: var(--text);
      padding: 10px 14px; border-radius: 999px; font-size: 13px; font-weight: 600;
      box-shadow: 0 10px 30px rgba(0,0,0,.16); transition: transform .28s ease;
    }
    .updatebar.show { display: flex; transform: translate(-50%, 0); }
    .updatebar button {
      border: 0; background: var(--accent); color: var(--accent-text);
      padding: 5px 14px; border-radius: 999px; font-size: 12px; font-weight: 700; cursor: pointer;
    }
    footer { text-align: center; color: var(--muted); font-size: 12px; padding: 30px 0; }
    @media (max-width: 640px) {
      .header-inner { gap: 12px; }
      .brand h1 { font-size: 16px; }
      .hero { padding: 32px 0 20px; }
      .grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header>
    <div class="wrap header-inner">
      <img src="favicon.svg" alt="" class="logo">
      <div class="brand">
        <h1>素材库</h1>
        <p>设计素材速查站 · __TOTAL__ 个精选资源 · __CATS__ 个分类</p>
      </div>
      <button class="ghost-btn" id="exportBtn" title="导出本机的站内点击记录，合并后可跨设备生效">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>
        <span class="label">导出点击记录</span>
      </button>
      <a class="ghost-btn" href="study.html" title="设计学习引导：自学路线、资源清单与书单">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        <span class="label">学习引导</span>
      </a>
      <a class="ghost-btn" href="weekly/" title="浏览统计周报：顶部切换不同周，自动与上一周对比">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>
        <span class="label">浏览周报</span>
      </a>
      <button class="theme-btn" id="themeBtn" aria-label="切换主题" title="切换主题">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
      </button>
    </div>
  </header>

  <main class="wrap">
    <section class="hero">
      <h2>聚合好设计，<span>一站搜到底。</span></h2>
      <p>从灵感社区到字体、图标、配色、样机、AI 工具，按你的使用场景分类整理，支持关键词搜索与分类筛选。</p>
    </section>

    <!-- AI_MODULE -->

    <div class="searchbar">
      <div class="search-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" id="search" placeholder="搜索资源名称或链接…" autocomplete="off">
      </div>
    </div>

    <div class="chips" id="chips"></div>
    <div id="results"></div>
  </main>

  <footer>
    <div class="wrap">数据来源：Edge 浏览器书签 · 访问次数 = Edge 浏览历史 + 站内点击 · 版本 __UPDATED__</div>
  </footer>

  <div class="updatebar" id="updatebar">
    <span>站点已更新（新收藏已上线）</span>
    <button onclick="location.reload()">刷新</button>
  </div>

  <div class="toast" id="toast"></div>

  <script>
    const RAW = __RAW__;
    const catColor = __CATCOLOR__;
    const order = __ORDER__;
    const CLICKS_EPOCH = '__CLICKSEPOCH__';

    let activeCat = '全部';

    /* ---- 本机点击计数 ----
       静态站点没有后端，页面无法把点击写回服务器。这里的增量存在 localStorage：
       点击即 +1，立刻参与排序；导出后由同步脚本合并进 clicks-merged.json 才跨设备持久。
       epoch 变化时说明本地增量已被合并进基线，清空以免重复计数。 */
    const CLICKS_KEY = 'sb_clicks_v1';
    const EPOCH_KEY = 'sb_clicks_epoch';
    let clicks = {};
    try { clicks = JSON.parse(localStorage.getItem(CLICKS_KEY) || '{}') || {}; } catch (e) { clicks = {}; }
    if (localStorage.getItem(EPOCH_KEY) !== CLICKS_EPOCH) {
      clicks = {};
      try {
        localStorage.setItem(EPOCH_KEY, CLICKS_EPOCH);
        localStorage.setItem(CLICKS_KEY, '{}');
      } catch (e) {}
    }
    function normKey(u) { return (u || '').replace(/\\/+$/, ''); }
    function saveClicks() {
      try { localStorage.setItem(CLICKS_KEY, JSON.stringify(clicks)); } catch (e) {}
    }
    function myClicks(b) { return clicks[normKey(b.url)] || 0; }
    function effVisits(b) { return Math.max(b.visits || 0, 0) + myClicks(b); }

    function getHost(url) {
      try {
        if (url.startsWith('file:///')) return decodeURIComponent(url.slice(8, 50)) + '…';
        return new URL(url).hostname.replace(/^www\\./, '');
      } catch (e) { return url; }
    }
    function hashColor(str) {
      let h = 0; for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
      return 'hsl(' + (Math.abs(h) % 360) + ' 70% 45%)';
    }
    function initials(title) {
      const m = title.match(/[A-Za-z0-9\\u4e00-\\u9fa5]/);
      return m ? m[0].toUpperCase() : '·';
    }
    function escapeHtml(s) {
      return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }
    function visitsHtml(b) {
      var base = Math.max(b.visits || 0, 0);
      var mine = myClicks(b);
      var v = base + mine;
      if (b.visits === -1 && !mine) {
        return '<div class="visits"><div class="bar"><i style="width:0%"></i></div>' +
               '<span class="num">本地文件</span></div>';
      }
      if (!v) {
        return '<div class="visits"><div class="bar"><i style="width:0%"></i></div>' +
               '<span class="num dead">从未打开</span></div>';
      }
      var pct = Math.max(8, Math.min(100, Math.round(Math.log(v + 1) / Math.log(2000) * 100)));
      var tag = mine ? '<span class="mine">+' + mine + '</span>' : '';
      return '<div class="visits"><div class="bar"><i style="width:' + pct + '%"></i></div>' +
             '<span class="num">' + v + ' 次访问' + tag + '</span></div>';
    }

    function render() {
      const q = document.getElementById('search').value.trim().toLowerCase();
      const container = document.getElementById('results');
      container.innerHTML = '';
      const showHot = activeCat === '全部' && !q;

      order.forEach(cat => {
        if (cat === '__HOT__' && !showHot) return;
        if (activeCat !== '全部' && cat !== activeCat) return;
        const items = RAW[cat]
          .filter(b =>
            !q || b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q)
          )
          .slice()
          .sort((x, y) => effVisits(y) - effVisits(x));
        if (!items.length) return;

        const sec = document.createElement('section');
        sec.className = 'section';
        const color = catColor[cat] || hashColor(cat);
        const note = cat === '__HOT__'
          ? '<p class="hot-note">按真实访问次数排序（Edge 浏览历史 + 你在站内的点击）。存了不看的收藏已在各自分类里沉底并淡化显示。</p>'
          : '';
        sec.innerHTML =
          '<div class="section-head"><h3>' + escapeHtml(cat) + '</h3>' +
          '<span class="num">' + items.length + ' 条</span></div>' + note +
          '<div class="grid">' + items.map(b =>
            '<a class="card' + (effVisits(b) === 0 ? ' dim' : '') + '" href="' + escapeHtml(b.url) +
            '" data-url="' + escapeHtml(b.url) +
            '" target="_blank" rel="noopener" style="--cat-color:' + color + '">' +
            '<div class="avatar">' + initials(b.title) + '</div>' +
            '<div class="meta"><div class="title">' + escapeHtml(b.title) +
            (b.is_local ? '<span class="badge">本地</span>' : '') + '</div>' +
            '<div class="host">' + escapeHtml(getHost(b.url)) + '</div>' +
            visitsHtml(b) + '</div></a>'
          ).join('') + '</div>';
        container.appendChild(sec);
      });

      if (!container.children.length) {
        container.innerHTML = '<div class="empty">没有找到匹配的资源</div>';
      }
    }

    function renderChips() {
      const all = Object.values(RAW).flat();
      const total = new Set(all.map(b => b.url)).size;
      const chips = document.getElementById('chips');
      const list = [['全部', total]].concat(order.map(c => [c, RAW[c].length]));
      chips.innerHTML = list.map(pair =>
        '<button class="chip ' + (activeCat === pair[0] ? 'active' : '') +
        '" data-cat="' + escapeHtml(pair[0]) + '">' + escapeHtml(pair[0]) +
        '<span class="count">' + pair[1] + '</span></button>'
      ).join('');
      chips.querySelectorAll('button').forEach(btn => {
        btn.onclick = () => { activeCat = btn.dataset.cat; renderChips(); render(); };
      });
    }

    document.getElementById('search').addEventListener('input', render);

    // 点击任意卡片即计一次。延后重排，避免打断新标签页的打开。
    document.getElementById('results').addEventListener('click', function (e) {
      const a = e.target.closest && e.target.closest('a.card');
      if (!a || !a.dataset.url) return;
      const k = normKey(a.dataset.url);
      clicks[k] = (clicks[k] || 0) + 1;
      saveClicks();
      setTimeout(render, 350);
    });

    function toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      clearTimeout(t._timer);
      t._timer = setTimeout(() => t.classList.remove('show'), 2600);
    }

    function downloadClicks(txt) {
      const blob = new Blob([txt], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'clicks-merged.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      toast('已下载 clicks-merged.json，发给我即可合并');
    }

    document.getElementById('exportBtn').onclick = function () {
      const keys = Object.keys(clicks);
      if (!keys.length) { toast('本机还没有记录到点击'); return; }
      const txt = JSON.stringify(clicks, null, 2);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(
          () => toast('已复制 ' + keys.length + ' 条点击记录，发给我即可合并'),
          () => downloadClicks(txt)
        );
      } else {
        downloadClicks(txt);
      }
    };

    const themeBtn = document.getElementById('themeBtn');
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && prefersDark)) document.documentElement.dataset.theme = 'dark';
    themeBtn.onclick = () => {
      const isDark = document.documentElement.dataset.theme === 'dark';
      document.documentElement.dataset.theme = isDark ? 'light' : 'dark';
      localStorage.setItem('theme', isDark ? 'light' : 'dark');
    };

    // 静态站容易吃到旧缓存：开着页面时定期问一次源站，发现构建时间变了就提示刷新
    const MY_BUILD = '__UPDATED__';
    function checkUpdate() {
      if (typeof fetch !== 'function') return;
      fetch(location.href.split('#')[0], { cache: 'no-store' })
        .then(r => (r.ok ? r.text() : ''))
        .then(t => {
          const m = t.match(/<meta name="build" content="([^"]+)"/);
          if (m && m[1] && m[1] !== MY_BUILD) {
            // 发现新版本：自动刷新以加载最新修复（例如悬停预览），避免被旧缓存卡住
            try { sessionStorage.setItem('__reloaded_for_update__', m[1]); } catch (e) {}
            location.reload(true);
          }
        })
        .catch(() => {});
    }
    setTimeout(checkUpdate, 2500);
    setInterval(checkUpdate, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkUpdate();
    });

    const initToTop = () => {
      const toTop = document.getElementById('toTop');
      if (toTop) toTop.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initToTop);
    else initToTop();

    // 悬停预览小窗：鼠标停在卡片上约 0.45 秒后，在卡片旁弹出目标站的实时预览
    (function () {
      const peek = document.getElementById('peek');
      if (!peek) return;
      // 只在“有 hover 能力”的设备启用；触屏由 CSS 的 @media (hover: none) 直接隐藏。
      // 注意：旧版用 (hover: hover) and (pointer: fine)，部分桌面环境会把 pointer 报成 coarse 而被误杀，这里放宽。
      const canHover = !window.matchMedia('(hover: none)').matches;
      if (!canHover) return;
      const frame = peek.querySelector('.peek-frame');
      const mask = peek.querySelector('.peek-mask');
      const fav = peek.querySelector('.peek-fav');
      const titleEl = peek.querySelector('.peek-title');
      const hostEl = peek.querySelector('.peek-host');
      const W = 340, H = 250, GAP = 12, DELAY = 450;
      let timer = null, loadTimer = null, currentUrl = '';

      function setMask(html) { mask.innerHTML = html; mask.hidden = false; }
      function clearMask() { mask.hidden = true; mask.innerHTML = ''; }

      function place(card) {
        const r = card.getBoundingClientRect();
        let left = r.right + GAP;
        if (left + W > window.innerWidth - 8) left = r.left - GAP - W;
        if (left < 8) left = Math.max(8, Math.min(r.left, window.innerWidth - W - 8));
        let top = r.top - 24;
        const maxTop = window.innerHeight - H - 8;
        if (top > maxTop) top = maxTop;
        if (top < 8) top = 8;
        peek.style.left = left + 'px';
        peek.style.top = top + 'px';
      }

      function show(card) {
        const url = card.dataset.url || '';
        const t = card.querySelector('.title');
        const h = card.querySelector('.host');
        titleEl.textContent = t ? t.textContent.trim() : '';
        hostEl.textContent = h ? h.textContent.trim() : '';
        fav.style.visibility = 'hidden';
        fav.removeAttribute('src');
        currentUrl = url;
        place(card);
        peek.classList.add('show');

        if (!/^https?:/i.test(url)) {
          frame.removeAttribute('src');
          setMask('<div><b>无法预览</b>本地文件或特殊协议，点击卡片打开</div>');
          return;
        }
        if (location.protocol === 'https:' && url.indexOf('http://') === 0) {
          frame.removeAttribute('src');
          setMask('<div><b>该站不支持 HTTPS</b>浏览器会拦截不安全的嵌入内容，点击卡片在新标签打开</div>');
          return;
        }
        setMask('<div><div class="peek-dot"></div>正在加载预览…</div>');
        clearTimeout(loadTimer);
        loadTimer = setTimeout(function () {
          if (!mask.hidden) setMask('<div><b>预览加载超时</b>该站响应较慢或不允许嵌入，点击卡片在新标签打开</div>');
        }, 6000);
        frame.onload = function () {
          clearTimeout(loadTimer);
          let blocked = false;
          try {
            const href = frame.contentWindow.location.href;
            if (!href || href === 'about:blank') blocked = true;
          } catch (e) { blocked = false; }
          if (blocked) {
            setMask('<div><b>该站禁止嵌入预览</b>对方设了 X-Frame-Options / CSP 安全策略<br>点击卡片在新标签打开</div>');
          } else {
            clearMask();
          }
        };
        frame.src = url;
        try {
          const u = new URL(url);
          fav.onload = function () { fav.style.visibility = 'visible'; };
          fav.onerror = function () { fav.style.visibility = 'hidden'; };
          fav.src = u.origin + '/favicon.ico';
        } catch (e) {}
      }

      function hide() {
        clearTimeout(timer);
        clearTimeout(loadTimer);
        currentUrl = '';
        peek.classList.remove('show');
        setTimeout(function () {
          if (!peek.classList.contains('show')) { frame.onload = null; frame.removeAttribute('src'); }
        }, 220);
      }

      const results = document.getElementById('results');
      let hoverCard = null;
      results.addEventListener('mouseover', function (e) {
        const card = e.target.closest && e.target.closest('a.card');
        if (!card || !card.dataset.url) return;
        if (card === hoverCard) return;          // 同一张卡片内部移动：不重置计时器，否则延迟永远凑不满
        hoverCard = card;
        clearTimeout(timer);
        timer = setTimeout(function () { show(card); }, DELAY);
      });
      results.addEventListener('mouseout', function (e) {
        const card = e.target.closest && e.target.closest('a.card');
        if (!card) return;
        if (e.relatedTarget && card.contains(e.relatedTarget)) return;   // 仍在卡片内部
        if (card !== hoverCard) return;        // 离开的不是当前悬停卡片（切换时序），忽略以免误清
        hoverCard = null;
        clearTimeout(timer);
        hide();
      });
      window.addEventListener('scroll', hide, { passive: true });
    })();

    renderChips();
    render();
  </script>
  <button id="toTop" aria-label="返回顶部" title="返回顶部">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>
  </button>
  <div id="peek" aria-hidden="true">
    <div class="peek-head">
      <img class="peek-fav" alt="" src="">
      <div class="peek-txt">
        <div class="peek-title"></div>
        <div class="peek-host"></div>
      </div>
      <span class="peek-hint">新标签打开</span>
    </div>
    <div class="peek-body">
      <iframe class="peek-frame" title="站点预览" referrerpolicy="no-referrer"></iframe>
      <div class="peek-mask" hidden></div>
    </div>
  </div>
</body>
</html>
'''


def main(prune=False, dry_run=False):
    current = load_bookmarks()
    extra = load_extra()
    bookmarks = merge_with_archive(current + extra)
    bookmarks = filter_blacklist(bookmarks)

    if prune or dry_run:
        urls = []
        seen = set()
        for b in bookmarks:
            u = b.get('url', '')
            if u.startswith('file:///'):
                continue
            k = u.rstrip('/')
            if k not in seen:
                seen.add(k)
                urls.append(u)
        print('检测 %d 条外链有效性（域名消失 / 404 判定为无效）…' % len(urls))
        status = detect_dead(urls)
        dead = sorted(u for u, st in status.items() if st == 'dead')
        alive = sum(1 for st in status.values() if st == 'alive')
        print('  有效 %d 条，无效 %d 条' % (alive, len(dead)))
        for u in dead:
            print('  ✗', u)
        if dry_run:
            print('（dry-run：未删除、未写黑名单、未重新生成）')
            return
        if dead:
            add_dead_links(set(dead))
            bookmarks = filter_blacklist(bookmarks)
            print('已将上述无效链接记入黑名单，后续同步将自动排除。')

    print('读取浏览历史…')
    dom, exact = load_history_stats()
    if not dom and not exact:
        # 历史库被 Edge 占用，读取失败：沿用上次缓存的频次，保住「高频实测」分组
        print('  （历史库暂不可读，使用上次缓存的访问频次）')
        cache = load_visits_cache()
        for bm in bookmarks:
            if bm['url'].startswith('file:///'):
                bm['visits'] = -1
            else:
                bm['visits'] = cache.get(bm['url'].rstrip('/'), 0)
    else:
        attach_visits(bookmarks, dom, exact)
        cache_visits(bookmarks)

    # 叠加站内点击累计（页面导出 → clicks-merged.json），让手动合并的点击持久生效
    n_clicks = apply_clicks_merged(bookmarks)
    if n_clicks:
        print('  叠加站内点击累计：%d 条' % n_clicks)

    groups = build_groups(bookmarks)
    # 每个分类内部按使用热度排序：常点的在前面，从没打开的沉底
    for cat in groups:
        groups[cat] = sort_by_usage(groups[cat])

    real_groups = dict(groups)
    hot = build_hot_group(real_groups)
    if hot:
        merged = {HOT_LABEL: hot}
        merged.update(real_groups)
        groups = merged

    total = sum(len(v) for v in real_groups.values())
    save_archive(real_groups)

    ai_module = load_ai_module()
    html = (TEMPLATE
            .replace('__RAW__', json.dumps(groups, ensure_ascii=False))
            .replace('__CATCOLOR__', json.dumps(CAT_ACCENT, ensure_ascii=False))
            .replace('__ORDER__', json.dumps(list(groups.keys()), ensure_ascii=False))
            .replace('__HOT__', HOT_LABEL)
            .replace('__TOTAL__', str(total))
            .replace('__CATS__', str(len(groups)))
            .replace('__CLICKSEPOCH__', clicks_epoch())
            .replace('__UPDATED__', __import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M'))
            .replace('<!-- AI_MODULE -->', ai_module))

    open(INDEX_PATH, 'w', encoding='utf-8').write(html)
    # 内容指纹：书签数据 + 页面模板，二者任一变化都算变更。
    # 刻意排除 __UPDATED__ 时间戳——否则每次运行指纹都变，定时任务会无脑发布。
    import hashlib
    fingerprint = hashlib.sha1(
        (json.dumps(groups, ensure_ascii=False, sort_keys=True) + TEMPLATE + ai_module).encode('utf-8')
    ).hexdigest()[:12]
    print('已生成 %s' % INDEX_PATH)
    print('内容指纹: %s' % fingerprint)
    print('共 %d 条书签，%d 个分类（含高频实测）' % (total, len(groups)))
    for cat, items in groups.items():
        print('  %s × %d' % (cat, len(items)))
    dead = sum(1 for items in real_groups.values() for b in items if b.get('visits', 0) == 0)
    print('其中从未打开过的收藏：%d 条（已在各自分类内沉底）' % dead)


if __name__ == '__main__':
    import argparse
    p = argparse.ArgumentParser(description='Edge 书签 → 设计素材站同步')
    p.add_argument('--prune', action='store_true',
                   help='检测并删除无效链接（域名消失 / 404），记入黑名单后重新生成')
    p.add_argument('--dry-run', action='store_true',
                   help='仅检测无效链接并打印，不删除、不写黑名单、不重新生成')
    args = p.parse_args()
    main(prune=args.prune, dry_run=args.dry_run)
