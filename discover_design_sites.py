#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""每周设计站发现（固定种子清单模式，方案 A）。

读取用户维护的固定种子清单 seed-sites.json：
  [ "https://example.com", {"url":"https://x.com","name":"X 设计"} ]
对每条做：去重(站内/已收录/黑名单域名) → 存活校验(仅域名 DNS 消失判死) →
输出候选 pending-discoveries.json。候选不自动加入资源站，先确认再上线。

用法：
  python3 discover_design_sites.py            # 生成候选到 pending-discoveries.json
  python3 discover_design_sites.py --dry-run  # 只检测打印，不写文件
  python3 discover_design_sites.py --apply    # （用户确认后）把候选并入资源站并重新生成
"""
import json
import os
import sys
import argparse
import socket
import concurrent.futures
import urllib.request
import urllib.error
from urllib.parse import urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
ARCHIVE = os.path.join(HERE, 'bookmarks-archive.json')
DEAD = os.path.join(HERE, 'dead-links.json')
SEED = os.path.join(HERE, 'seed-sites.json')
PENDING = os.path.join(HERE, 'pending-discoveries.json')
EXTRA_PATH = os.path.join(HERE, 'extra-sites.json')
ADD_GROUP = '外部推荐'
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120 Safari/537.36")


# ---------------- HTTP 存活校验（与死链任务同一套防误杀逻辑）----------------
def _req(u, method):
    return urllib.request.Request(u, method=method, headers={'User-Agent': UA})


def _is_dns_fail(reason):
    s = str(reason).lower()
    return any(k in s for k in (
        'getaddrinfo', 'name or service not known', 'nodename nor servname',
        'unknown host', 'host is unknown', 'dns', 'no address associated',
        'nxdomain', "can't resolve", 'temporary failure in name resolution'))


def check_url(url):
    """仅域名 DNS 消失判 dead；其余(超时/5xx/登录墙/反爬/404 单路径)保守保留，防误杀。
    三步复核：HEAD 404 -> GET 复核 -> GET 仍 404 再探域名根路径，根活即保留。"""
    u = url.rstrip('/')
    try:
        with urllib.request.urlopen(_req(u, 'HEAD'), timeout=8) as r:
            if r.getcode() == 404:
                return _check_get(u)
            return 'alive'
    except urllib.error.HTTPError as e:
        if e.code == 404 or e.code in (403, 401, 405, 400, 429, 406):
            return _check_get(u)
        return 'alive'
    except urllib.error.URLError as e:
        return 'dead' if _is_dns_fail(getattr(e, 'reason', e)) else 'alive'
    except socket.timeout:
        return 'alive'
    except Exception:
        return 'alive'


def _check_get(u):
    try:
        with urllib.request.urlopen(_req(u, 'GET'), timeout=10) as r:
            return _check_root(u) if r.getcode() == 404 else 'alive'
    except urllib.error.HTTPError as e:
        return _check_root(u) if e.code == 404 else 'alive'
    except Exception:
        return 'alive'


def _check_root(u):
    try:
        root = u.split('/')[0] + '//' + urlparse(u).netloc + '/'
        with urllib.request.urlopen(_req(root, 'GET'), timeout=10) as r:
            return 'dead' if r.getcode() == 404 else 'alive'
    except Exception:
        return 'alive'


# ---------------- 去重基准 ----------------
def collect_archive_domains():
    if not os.path.exists(ARCHIVE):
        return set()
    try:
        d = json.load(open(ARCHIVE, encoding='utf-8'))
    except Exception:
        return set()
    domains = set()

    def walk(n):
        if isinstance(n, dict):
            if n.get('url'):
                du = urlparse(n['url']).netloc.lower().replace('www.', '')
                if du:
                    domains.add(du)
            for v in n.values():
                walk(v)
        elif isinstance(n, list):
            for v in n:
                walk(v)
    walk(d)
    return domains


def collect_dead_domains():
    if not os.path.exists(DEAD):
        return set()
    try:
        d = json.load(open(DEAD, encoding='utf-8'))
    except Exception:
        return set()
    if isinstance(d, dict):
        return set(d.get('domains', []))
    if isinstance(d, list):
        return {x.get('domain', '') for x in d if isinstance(x, dict) and x.get('domain')}
    return set()


def normalize(u):
    u = u.strip()
    if not u.startswith('http'):
        return None
    p = urlparse(u)
    dom = p.netloc.lower().replace('www.', '')
    if not dom:
        return None
    clean = u.split('?')[0].split('#')[0].rstrip('/')
    return dom, clean


def load_seed():
    if not os.path.exists(SEED):
        return []
    try:
        d = json.load(open(SEED, encoding='utf-8'))
        if isinstance(d, list):
            return d
    except Exception:
        pass
    return []


def build_candidates():
    """从固定种子清单生成候选。去重按【完整 URL】（非仅域名），
    否则同域名的子页面（如 ignoredone.space/arknights_design）会被已有首页误判重复跳过。"""
    seeds = load_seed()
    if not seeds:
        return []
    items = []
    for s in seeds:
        if isinstance(s, dict):
            items.append((s.get('url', ''), s.get('name', '')))
        elif isinstance(s, str):
            items.append((s, ''))
    items = [(u.strip(), n) for u, n in items if u.strip()]

    # 已收录的完整 URL（去尾斜杠归一）
    archive_urls = set()
    if os.path.exists(ARCHIVE):
        try:
            d = json.load(open(ARCHIVE, encoding='utf-8'))

            def walk(n):
                if isinstance(n, dict):
                    if n.get('url'):
                        archive_urls.add(n['url'].rstrip('/'))
                    for v in n.values():
                        walk(v)
                elif isinstance(n, list):
                    for v in n:
                        walk(v)
            walk(d)
        except Exception:
            pass
    dead_urls = set()
    if os.path.exists(DEAD):
        try:
            dead_urls = set(json.load(open(DEAD, encoding='utf-8')).get('urls', []))
        except Exception:
            pass

    # 已通过 --apply 并入 extra-sites.json 的 URL 也排除，避免每周重复汇报已加入的站
    extra_urls = set()
    if os.path.exists(EXTRA_PATH):
        try:
            for e in json.load(open(EXTRA_PATH, encoding='utf-8')):
                if isinstance(e, dict) and e.get('url'):
                    extra_urls.add(e['url'].rstrip('/'))
        except Exception:
            pass

    seen = set()
    out = []
    for u, n in items:
        r = normalize(u)
        if not r:
            continue
        dom, clean = r
        if clean in archive_urls or clean in dead_urls or clean in extra_urls:
            continue
        if clean in seen:
            continue
        seen.add(clean)
        out.append((clean, n))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true', help='（用户确认后）把候选并入资源站')
    ap.add_argument('--dry-run', action='store_true', help='只检测打印，不写文件')
    args = ap.parse_args()

    if args.apply:
        return apply_pending()

    candidates = build_candidates()
    print(f"种子去重后 {len(candidates)} 条候选，开始存活校验…")
    pending = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
        futs = {ex.submit(check_url, u): (u, n) for u, n in candidates}
        for f in concurrent.futures.as_completed(futs):
            u, n = futs[f]
            try:
                if f.result() == 'alive':
                    pending.append({
                        'url': u,
                        'domain': urlparse(u).netloc.lower().replace('www.', ''),
                        'name': n,
                        'category': ADD_GROUP,
                        'source': '固定种子清单',
                    })
            except Exception:
                pass
    pending.sort(key=lambda p: p['domain'])

    if args.dry_run:
        print(f"[dry-run] 存活候选 {len(pending)} 条：")
        for p in pending:
            print(f"  + {p['domain']}  {p['url']}")
        return

    json.dump(pending, open(PENDING, 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    print(f"存活候选 {len(pending)} 条 → {PENDING}")
    for p in pending:
        print(f"  + {p['domain']}  {p['url']}")


def apply_pending():
    """用户确认候选后：把 pending 候选写入 extra-sites.json，并重新生成资源站页面。
    extra-sites.json 由 sync_bookmarks.py 在合并阶段注入，与 Edge 收藏夹并集存档分离管理。"""
    import subprocess
    if not os.path.exists(PENDING):
        print("（无 pending-discoveries.json，先跑一次不带参数的 discover 生成候选）")
        return
    try:
        pending = json.load(open(PENDING, encoding='utf-8'))
    except Exception:
        pending = []
    if not pending:
        print("（候选为空，无可加入的站点）")
        return

    extra = []
    if os.path.exists(EXTRA_PATH):
        try:
            extra = json.load(open(EXTRA_PATH, encoding='utf-8'))
        except Exception:
            extra = []
    have = {e.get('url', '').rstrip('/') for e in extra if isinstance(e, dict)}
    added = 0
    for p in pending:
        u = p['url'].rstrip('/')
        if u in have:
            continue
        have.add(u)
        extra.append({
            'folder': '外部发现',
            'title': p.get('name') or p.get('domain') or u,
            'url': p['url'],
            'category': p.get('category', ADD_GROUP),
        })
        added += 1
    json.dump(extra, open(EXTRA_PATH, 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    print("已将 %d 条候选写入 %s" % (added, EXTRA_PATH))

    print("重新生成资源站页面…")
    r = subprocess.run([sys.executable, 'sync_bookmarks.py'], cwd=HERE)
    if r.returncode != 0:
        print("（sync_bookmarks.py 执行异常，returncode=%d）" % r.returncode)
    else:
        print("资源站已重新生成。")


if __name__ == '__main__':
    main()
