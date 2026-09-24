// ============================================================
// BiliMetrics · 我的视频 / 视频横向对比 数据层
// 数据来源：B 站公开接口（服务端 WBI 签名抓取真实快照）
// 生成时间（快照）：2026-09-24 17:32
//
// ⚠ 实时性说明（务必保留）：
//   纯静态站（GitHub Pages）浏览器端无法直接调用 B 站 API
//   （CORS + WBI 签名 + 风控三道墙）。本文件为「真实数据快照」：
//   - 视频 播放/评论/弹幕 为接口返回的真实值（标 real）
//   - 投币/收藏 该列表接口不返回，页面以「—」呈现，留待接入实时代理
//   要真正自动实时，需部署 Cloudflare Worker 类代理后改此文件为 fetch。
// ============================================================

const SNAPSHOT_AT = '2026-09-24 17:32';

const VIDEOS_DATA = {
  "self": {
    "mid": 374392541,
    "name": "张爷丨张TaMa",
    "face": "assets/avatars/374392541.jpg",
    "followers": 240597,
    "level": 6,
    "videos": [
      {
        "bvid": "BV1Su4y137Uk",
        "title": "【GMOD】火箭追逐见过没！？",
        "cover": "assets/covers/BV1Su4y137Uk.jpg",
        "play": 6983590,
        "comment": 330,
        "danmaku": 6755,
        "length": "06:30",
        "created": 1702033680,
        "url": "https://www.bilibili.com/video/BV1Su4y137Uk"
      },
      {
        "bvid": "BV1Qz421f7jg",
        "title": "【GMOD】玩追逐也得扣税！！！",
        "cover": "assets/covers/BV1Qz421f7jg.jpg",
        "play": 4682359,
        "comment": 517,
        "danmaku": 3302,
        "length": "11:38",
        "created": 1710418923,
        "url": "https://www.bilibili.com/video/BV1Qz421f7jg"
      },
      {
        "bvid": "BV1XH4y1Z7Xv",
        "title": "【GMOD】你食不食月饼？！",
        "cover": "assets/covers/BV1XH4y1Z7Xv.jpg",
        "play": 4314727,
        "comment": 177,
        "danmaku": 4282,
        "length": "07:20",
        "created": 1696563860,
        "url": "https://www.bilibili.com/video/BV1XH4y1Z7Xv"
      },
      {
        "bvid": "BV1XM411f7vx",
        "title": "【GMOD】迷宫惊现奥巴噶！场面瞬间变得极度刺激！",
        "cover": "assets/covers/BV1XM411f7vx.jpg",
        "play": 3153789,
        "comment": 168,
        "danmaku": 4131,
        "length": "05:23",
        "created": 1699763579,
        "url": "https://www.bilibili.com/video/BV1XM411f7vx"
      },
      {
        "bvid": "BV1UE421F7AQ",
        "title": "【GMOD】在雪山基地内与无数魔物惊险追逐！",
        "cover": "assets/covers/BV1UE421F7AQ.jpg",
        "play": 2200334,
        "comment": 415,
        "danmaku": 4900,
        "length": "06:29",
        "created": 1724557500,
        "url": "https://www.bilibili.com/video/BV1UE421F7AQ"
      },
      {
        "bvid": "BV1Sc411c7bA",
        "title": "【GMOD】有史以来最刺激最有压迫感的车辆追逐！三人被吓直接鸟叫",
        "cover": "assets/covers/BV1Sc411c7bA.jpg",
        "play": 2112266,
        "comment": 391,
        "danmaku": 6737,
        "length": "10:35",
        "created": 1690277784,
        "url": "https://www.bilibili.com/video/BV1Sc411c7bA"
      },
      {
        "bvid": "BV1Um4y157Dd",
        "title": "BYD仨人加一块叫唤能给怪耳膜震碎咯",
        "cover": "assets/covers/BV1Um4y157Dd.jpg",
        "play": 1940314,
        "comment": 324,
        "danmaku": 5213,
        "length": "04:18",
        "created": 1695472991,
        "url": "https://www.bilibili.com/video/BV1Um4y157Dd"
      },
      {
        "bvid": "BV138411U7ft",
        "title": "【GMOD】在奥巴嘎群中夹缝生存，刺激程度不亚于逃生！",
        "cover": "assets/covers/BV138411U7ft.jpg",
        "play": 1691557,
        "comment": 561,
        "danmaku": 7748,
        "length": "04:51",
        "created": 1690447990,
        "url": "https://www.bilibili.com/video/BV138411U7ft"
      },
      {
        "bvid": "BV1zW4y1b77z",
        "title": "比哇啦哇啦共强100倍的怪物！！！",
        "cover": "assets/covers/BV1zW4y1b77z.jpg",
        "play": 1422827,
        "comment": 158,
        "danmaku": 2264,
        "length": "06:20",
        "created": 1660879810,
        "url": "https://www.bilibili.com/video/BV1zW4y1b77z"
      },
      {
        "bvid": "BV1th4y1h7Bt",
        "title": "【GMOD】5辆汽车VS最快的4个NextBot！场面十分焦灼！",
        "cover": "assets/covers/BV1th4y1h7Bt.jpg",
        "play": 1218550,
        "comment": 96,
        "danmaku": 2371,
        "length": "06:19",
        "created": 1696094024,
        "url": "https://www.bilibili.com/video/BV1th4y1h7Bt"
      },
      {
        "bvid": "BV1fK411o7Xe",
        "title": "【GMOD】人类.....真的还有希望吗？",
        "cover": "assets/covers/BV1fK411o7Xe.jpg",
        "play": 1142019,
        "comment": 321,
        "danmaku": 11834,
        "length": "16:25",
        "created": 1668268652,
        "url": "https://www.bilibili.com/video/BV1fK411o7Xe"
      },
      {
        "bvid": "BV1p99cBCEbx",
        "title": "独处即死！留神黑暗中「不明之物」无声啃噬，祂的未知凝视正将你活剥！",
        "cover": "assets/covers/BV1p99cBCEbx.jpg",
        "play": 960409,
        "comment": 922,
        "danmaku": 2321,
        "length": "06:59",
        "created": 1775296800,
        "url": "https://www.bilibili.com/video/BV1p99cBCEbx"
      },
      {
        "bvid": "BV1Re411g7rF",
        "title": "【gmod】哇啦哇啦共来了！大家快跑吧！！！！！",
        "cover": "assets/covers/BV1Re411g7rF.jpg",
        "play": 756844,
        "comment": 421,
        "danmaku": 3109,
        "length": "05:48",
        "created": 1662280238,
        "url": "https://www.bilibili.com/video/BV1Re411g7rF"
      },
      {
        "bvid": "BV1DH4y1y7bC",
        "title": "【GMOD】那一晚.......我变成了少萝❤",
        "cover": "assets/covers/BV1DH4y1y7bC.jpg",
        "play": 705473,
        "comment": 209,
        "danmaku": 3259,
        "length": "05:23",
        "created": 1700997926,
        "url": "https://www.bilibili.com/video/BV1DH4y1y7bC"
      },
      {
        "bvid": "BV1Kv411W75p",
        "title": "树林里的小妹妹♂   【pacify直播录制】",
        "cover": "assets/covers/BV1Kv411W75p.jpg",
        "play": 683593,
        "comment": 43,
        "danmaku": 398,
        "length": "12:42",
        "created": 1624034922,
        "url": "https://www.bilibili.com/video/BV1Kv411W75p"
      },
      {
        "bvid": "BV11b421Y7F3",
        "title": "吃 吃 你 的 大 香 蕉",
        "cover": "assets/covers/BV11b421Y7F3.jpg",
        "play": 670602,
        "comment": 448,
        "danmaku": 5511,
        "length": "09:30",
        "created": 1714024800,
        "url": "https://www.bilibili.com/video/BV11b421Y7F3"
      },
      {
        "bvid": "BV1Uj411B7Jz",
        "title": "【GMOD】极度刺激！就连火车都跑不过奥巴嘎！",
        "cover": "assets/covers/BV1Uj411B7Jz.jpg",
        "play": 669915,
        "comment": 238,
        "danmaku": 3405,
        "length": "07:06",
        "created": 1692092352,
        "url": "https://www.bilibili.com/video/BV1Uj411B7Jz"
      },
      {
        "bvid": "BV1JN411H7cp",
        "title": "【GMOD】一个在创意工坊满星的到底有多吓人！",
        "cover": "assets/covers/BV1JN411H7cp.jpg",
        "play": 632990,
        "comment": 37,
        "danmaku": 515,
        "length": "11:38",
        "created": 1694850470,
        "url": "https://www.bilibili.com/video/BV1JN411H7cp"
      },
      {
        "bvid": "BV1W8xZefEHy",
        "title": "《看似群英荟萃，实际萝卜开会》",
        "cover": "assets/covers/BV1W8xZefEHy.jpg",
        "play": 619102,
        "comment": 281,
        "danmaku": 1373,
        "length": "05:50",
        "created": 1728025200,
        "url": "https://www.bilibili.com/video/BV1W8xZefEHy"
      },
      {
        "bvid": "BV1ofjq6LE6C",
        "title": "屠杀至亲血祭！存档深处的「獵祟邪骸」已把SAN值清零… |【张爷评书馆】",
        "cover": "assets/covers/BV1ofjq6LE6C.jpg",
        "play": 584027,
        "comment": 355,
        "danmaku": 1475,
        "length": "07:28",
        "created": 1781938800,
        "url": "https://www.bilibili.com/video/BV1ofjq6LE6C"
      },
      {
        "bvid": "BV1yZeF6AEqc",
        "title": "依旧瞎眼烂鼻子怪追人满街跑，直接吓的拉炕上了",
        "cover": "assets/covers/BV1yZeF6AEqc.jpg",
        "play": 564756,
        "comment": 559,
        "danmaku": 2319,
        "length": "05:53",
        "created": 1789545600,
        "url": "https://www.bilibili.com/video/BV1yZeF6AEqc"
      },
      {
        "bvid": "BV1qMcBzsEiq",
        "title": "太平间诈尸！弗莱迪「血眼爆眶」追人索命！被抓就直接撕脸塞皮，眼珠挤爆！",
        "cover": "assets/covers/BV1qMcBzsEiq.jpg",
        "play": 452343,
        "comment": 796,
        "danmaku": 3168,
        "length": "06:32",
        "created": 1770975000,
        "url": "https://www.bilibili.com/video/BV1qMcBzsEiq"
      },
      {
        "bvid": "BV1oE4m1X7qb",
        "title": "向 日 葵 奥 巴 噶",
        "cover": "assets/covers/BV1oE4m1X7qb.jpg",
        "play": 388816,
        "comment": 338,
        "danmaku": 5693,
        "length": "06:24",
        "created": 1723515082,
        "url": "https://www.bilibili.com/video/BV1oE4m1X7qb"
      },
      {
        "bvid": "BV13Ce1znEsV",
        "title": "在绝对黑暗的超市里被Bon猎杀！全程高能惊悚不断！",
        "cover": "assets/covers/BV13Ce1znEsV.jpg",
        "play": 386446,
        "comment": 453,
        "danmaku": 6154,
        "length": "07:38",
        "created": 1756352700,
        "url": "https://www.bilibili.com/video/BV13Ce1znEsV"
      },
      {
        "bvid": "BV1eL411o7xu",
        "title": "【GMOD】速度与只因情！和张TaMaaa,卢山智明一起测试世界上最快的车！",
        "cover": "assets/covers/BV1eL411o7xu.jpg",
        "play": 375874,
        "comment": 77,
        "danmaku": 398,
        "length": "16:37",
        "created": 1678887300,
        "url": "https://www.bilibili.com/video/BV1eL411o7xu"
      },
      {
        "bvid": "BV1MPFaehESH",
        "title": "你以为又是一次普通追逐？但没想到阿诺居然轧穿了整张地图！！！",
        "cover": "assets/covers/BV1MPFaehESH.jpg",
        "play": 374312,
        "comment": 333,
        "danmaku": 2450,
        "length": "06:13",
        "created": 1738295100,
        "url": "https://www.bilibili.com/video/BV1MPFaehESH"
      },
      {
        "bvid": "BV1ih4y1V7Jq",
        "title": "【GMOD大逃杀】20个奥巴噶 VS 6名玩家",
        "cover": "assets/covers/BV1ih4y1V7Jq.jpg",
        "play": 370684,
        "comment": 211,
        "danmaku": 3733,
        "length": "05:53",
        "created": 1690171144,
        "url": "https://www.bilibili.com/video/BV1ih4y1V7Jq"
      },
      {
        "bvid": "BV1rG411k7K6",
        "title": "【GMOD】奥巴噶转盘秀！！！",
        "cover": "assets/covers/BV1rG411k7K6.jpg",
        "play": 362166,
        "comment": 109,
        "danmaku": 818,
        "length": "03:05",
        "created": 1703289600,
        "url": "https://www.bilibili.com/video/BV1rG411k7K6"
      },
      {
        "bvid": "BV12g4y167a6",
        "title": "BYD无眼狗耳膜最穿孔的一集",
        "cover": "assets/covers/BV12g4y167a6.jpg",
        "play": 354442,
        "comment": 98,
        "danmaku": 691,
        "length": "07:26",
        "created": 1704034298,
        "url": "https://www.bilibili.com/video/BV12g4y167a6"
      },
      {
        "bvid": "BV1cAfUBQE2u",
        "title": "工厂血夜！癫狂双煞「啃骨嚼肉」保安室沦为活人鲜肉罐头！",
        "cover": "assets/covers/BV1cAfUBQE2u.jpg",
        "play": 347333,
        "comment": 473,
        "danmaku": 2619,
        "length": "07:18",
        "created": 1772013769,
        "url": "https://www.bilibili.com/video/BV1cAfUBQE2u"
      }
    ]
  },
  "peers": [
    {
      "mid": 5970160,
      "name": "小潮院长",
      "face": "assets/avatars/5970160.jpg",
      "followers": 15593678,
      "videos": [
        {
          "bvid": "BV1H94y1k7JU",
          "title": "不要“做”挑战？（第十七期）",
          "cover": "assets/covers/BV1H94y1k7JU.jpg",
          "play": 41155498,
          "comment": 19529,
          "danmaku": 95342,
          "length": "13:48",
          "created": 1691902933,
          "url": "https://www.bilibili.com/video/BV1H94y1k7JU"
        },
        {
          "bvid": "BV1Xt4y1N73i",
          "title": "羊村（1）",
          "cover": "assets/covers/BV1Xt4y1N73i.jpg",
          "play": 35108957,
          "comment": 23664,
          "danmaku": 156390,
          "length": "33:16",
          "created": 1668924556,
          "url": "https://www.bilibili.com/video/BV1Xt4y1N73i"
        },
        {
          "bvid": "BV1ZS4y1C7iY",
          "title": "找狗游戏",
          "cover": "assets/covers/BV1ZS4y1C7iY.jpg",
          "play": 32941767,
          "comment": 8701,
          "danmaku": 71882,
          "length": "08:09",
          "created": 1643368613,
          "url": "https://www.bilibili.com/video/BV1ZS4y1C7iY"
        },
        {
          "bvid": "BV1qS4y1q7Ld",
          "title": "贱谍过家家",
          "cover": "assets/covers/BV1qS4y1q7Ld.jpg",
          "play": 32832055,
          "comment": 11384,
          "danmaku": 76663,
          "length": "08:54",
          "created": 1653753600,
          "url": "https://www.bilibili.com/video/BV1qS4y1q7Ld"
        },
        {
          "bvid": "BV1Q14y1F7B2",
          "title": "鹅鸭傻",
          "cover": "assets/covers/BV1Q14y1F7B2.jpg",
          "play": 32480316,
          "comment": 13311,
          "danmaku": 76363,
          "length": "13:17",
          "created": 1675855738,
          "url": "https://www.bilibili.com/video/BV1Q14y1F7B2"
        },
        {
          "bvid": "BV19g4y1N7A2",
          "title": "hhhhhhhhhh",
          "cover": "assets/covers/BV19g4y1N7A2.jpg",
          "play": 32097588,
          "comment": 13968,
          "danmaku": 117612,
          "length": "11:08",
          "created": 1686801600,
          "url": "https://www.bilibili.com/video/BV19g4y1N7A2"
        }
      ]
    },
    {
      "mid": 419121167,
      "name": "-勾魂公狒狒-",
      "face": "assets/avatars/419121167.jpg",
      "followers": 2565223,
      "videos": [
        {
          "bvid": "BV1ua4y1M72J",
          "title": "恐龙大量死亡，远古生物“幽灵蛸”登场！",
          "cover": "assets/covers/BV1ua4y1M72J.jpg",
          "play": 21946583,
          "comment": 579,
          "danmaku": 2797,
          "length": "04:38",
          "created": 1680399905,
          "url": "https://www.bilibili.com/video/BV1ua4y1M72J"
        },
        {
          "bvid": "BV18yGt6FE9a",
          "title": "见面次数等于1，代表什么...",
          "cover": "assets/covers/BV18yGt6FE9a.jpg",
          "play": 18137095,
          "comment": 1425,
          "danmaku": 848,
          "length": "01:41",
          "created": 1779440400,
          "url": "https://www.bilibili.com/video/BV18yGt6FE9a"
        },
        {
          "bvid": "BV1544y1v75u",
          "title": "海岛建沙漠，我的骆驼会游泳！",
          "cover": "assets/covers/BV1544y1v75u.jpg",
          "play": 14773982,
          "comment": 744,
          "danmaku": 3092,
          "length": "06:26",
          "created": 1636862982,
          "url": "https://www.bilibili.com/video/BV1544y1v75u"
        },
        {
          "bvid": "BV16KycBVEGJ",
          "title": "重量，决定生死！",
          "cover": "assets/covers/BV16KycBVEGJ.jpg",
          "play": 12853048,
          "comment": 62,
          "danmaku": 110,
          "length": "02:32",
          "created": 1763629800,
          "url": "https://www.bilibili.com/video/BV16KycBVEGJ"
        },
        {
          "bvid": "BV1vBSGBUE1R",
          "title": "如果段位，可以代表地位...",
          "cover": "assets/covers/BV1vBSGBUE1R.jpg",
          "play": 12595763,
          "comment": 35,
          "danmaku": 61,
          "length": "02:01",
          "created": 1764321000,
          "url": "https://www.bilibili.com/video/BV1vBSGBUE1R"
        },
        {
          "bvid": "BV1cY411Q7VZ",
          "title": "我 造 了 一 条 龙",
          "cover": "assets/covers/BV1cY411Q7VZ.jpg",
          "play": 12234544,
          "comment": 1309,
          "danmaku": 14824,
          "length": "05:16",
          "created": 1674897473,
          "url": "https://www.bilibili.com/video/BV1cY411Q7VZ"
        }
      ]
    },
    {
      "mid": 2006034,
      "name": "吊德斯DioDes",
      "face": "assets/avatars/2006034.jpg",
      "followers": 3591829,
      "videos": [
        {
          "bvid": "BV1Gu411o76t",
          "title": "破皮玩具厂 玩具厂吉祥物憨鸡活了，看我去逮住它",
          "cover": "assets/covers/BV1Gu411o76t.jpg",
          "play": 12913899,
          "comment": 1479,
          "danmaku": 12010,
          "length": "16:49",
          "created": 1635258458,
          "url": "https://www.bilibili.com/video/BV1Gu411o76t"
        },
        {
          "bvid": "BV1PL3AzFEmA",
          "title": "在森林里活99天！小心张着大嘴的鹿人！",
          "cover": "assets/covers/BV1PL3AzFEmA.jpg",
          "play": 12793878,
          "comment": 1704,
          "danmaku": 8270,
          "length": "39:43",
          "created": 1751204465,
          "url": "https://www.bilibili.com/video/BV1PL3AzFEmA"
        },
        {
          "bvid": "BV1nT4y1X74a",
          "title": "安妮创女士 学校招机器人当老师，结果它们短路后全都疯癫了",
          "cover": "assets/covers/BV1nT4y1X74a.jpg",
          "play": 10451504,
          "comment": 829,
          "danmaku": 14682,
          "length": "20:04",
          "created": 1644507385,
          "url": "https://www.bilibili.com/video/BV1nT4y1X74a"
        },
        {
          "bvid": "BV1HA411v7T7",
          "title": "gmod实验室 我变身蜘蛛侠用灭霸无限手套对战警笛头",
          "cover": "assets/covers/BV1HA411v7T7.jpg",
          "play": 8694044,
          "comment": 1010,
          "danmaku": 17091,
          "length": "15:45",
          "created": 1595167449,
          "url": "https://www.bilibili.com/video/BV1HA411v7T7"
        },
        {
          "bvid": "BV1Bg411j71i",
          "title": "猫里奥乐园 我变成了颗黑头，小熙霸和桃子精疯狂挤我！",
          "cover": "assets/covers/BV1Bg411j71i.jpg",
          "play": 8466188,
          "comment": 681,
          "danmaku": 7161,
          "length": "14:49",
          "created": 1628774825,
          "url": "https://www.bilibili.com/video/BV1Bg411j71i"
        },
        {
          "bvid": "BV1BJ411F7LR",
          "title": "火柴人大乱斗3D 奇葩武器层出不穷，搞笑兄妹疯狂互坑",
          "cover": "assets/covers/BV1BJ411F7LR.jpg",
          "play": 7204353,
          "comment": 488,
          "danmaku": 9825,
          "length": "09:28",
          "created": 1570371307,
          "url": "https://www.bilibili.com/video/BV1BJ411F7LR"
        }
      ]
    },
    {
      "mid": 53228897,
      "name": "游戏解说艾登",
      "face": "assets/avatars/53228897.jpg",
      "followers": 799924,
      "videos": [
        {
          "bvid": "BV1iKoXBEEVc",
          "title": "这是我挖过最难挖的监狱！",
          "cover": "assets/covers/BV1iKoXBEEVc.jpg",
          "play": 24938744,
          "comment": 89,
          "danmaku": 142,
          "length": "05:55",
          "created": 1777113433,
          "url": "https://www.bilibili.com/video/BV1iKoXBEEVc"
        },
        {
          "bvid": "BV1mrWEz6EcS",
          "title": "挑战一天逃出监狱!",
          "cover": "assets/covers/BV1mrWEz6EcS.jpg",
          "play": 24920440,
          "comment": 169,
          "danmaku": 370,
          "length": "06:02",
          "created": 1760696506,
          "url": "https://www.bilibili.com/video/BV1mrWEz6EcS"
        },
        {
          "bvid": "BV1mUrVBHER9",
          "title": "我在隔离区养僵尸！",
          "cover": "assets/covers/BV1mUrVBHER9.jpg",
          "play": 20011457,
          "comment": 111,
          "danmaku": 214,
          "length": "03:12",
          "created": 1768305539,
          "url": "https://www.bilibili.com/video/BV1mUrVBHER9"
        },
        {
          "bvid": "BV1k329BqEvW",
          "title": "大海里面，来了个怪物！",
          "cover": "assets/covers/BV1k329BqEvW.jpg",
          "play": 17773837,
          "comment": 50,
          "danmaku": 147,
          "length": "04:26",
          "created": 1765015924,
          "url": "https://www.bilibili.com/video/BV1k329BqEvW"
        },
        {
          "bvid": "BV141eEzPEDd",
          "title": "这游戏，玩得我巨物恐惧症都犯了！",
          "cover": "assets/covers/BV141eEzPEDd.jpg",
          "play": 17448596,
          "comment": 590,
          "danmaku": 647,
          "length": "05:39",
          "created": 1756030792,
          "url": "https://www.bilibili.com/video/BV141eEzPEDd"
        },
        {
          "bvid": "BV1CzvaBUEsC",
          "title": "睡觉前，记得锁门",
          "cover": "assets/covers/BV1CzvaBUEsC.jpg",
          "play": 17213594,
          "comment": 183,
          "danmaku": 557,
          "length": "04:09",
          "created": 1767090045,
          "url": "https://www.bilibili.com/video/BV1CzvaBUEsC"
        }
      ]
    },
    {
      "mid": 92177646,
      "name": "地瓜BB",
      "face": "assets/avatars/92177646.jpg",
      "followers": 84686,
      "videos": [
        {
          "bvid": "BV1jh41147kZ",
          "title": "玩具成精了：我调皮捣乱就是惹大蓝猫",
          "cover": "assets/covers/BV1jh41147kZ.jpg",
          "play": 15805475,
          "comment": 213,
          "danmaku": 892,
          "length": "02:11",
          "created": 1637408344,
          "url": "https://www.bilibili.com/video/BV1jh41147kZ"
        },
        {
          "bvid": "BV1534y1Z7sE",
          "title": "玩具成精了：这只大蓝猫追着我不放了？",
          "cover": "assets/covers/BV1534y1Z7sE.jpg",
          "play": 8291405,
          "comment": 100,
          "danmaku": 314,
          "length": "01:31",
          "created": 1636258785,
          "url": "https://www.bilibili.com/video/BV1534y1Z7sE"
        },
        {
          "bvid": "BV16L41147rU",
          "title": "GMOD躲猫猫模式：变成玻璃~这谁能找得到？",
          "cover": "assets/covers/BV16L41147rU.jpg",
          "play": 6955674,
          "comment": 77,
          "danmaku": 70,
          "length": "02:03",
          "created": 1630247482,
          "url": "https://www.bilibili.com/video/BV16L41147rU"
        },
        {
          "bvid": "BV15C4y1v7x7",
          "title": "深夜单身男子遇到鹿人袭击~最后精神崩溃！",
          "cover": "assets/covers/BV15C4y1v7x7.jpg",
          "play": 4478779,
          "comment": 38,
          "danmaku": 265,
          "length": "05:02",
          "created": 1704537783,
          "url": "https://www.bilibili.com/video/BV15C4y1v7x7"
        },
        {
          "bvid": "BV1fF411h7mW",
          "title": "玩具成精了：倒退着挑战比赛跑过大蓝猫",
          "cover": "assets/covers/BV1fF411h7mW.jpg",
          "play": 3702048,
          "comment": 38,
          "danmaku": 188,
          "length": "01:42",
          "created": 1637463945,
          "url": "https://www.bilibili.com/video/BV1fF411h7mW"
        },
        {
          "bvid": "BV1SQ4y1X7FU",
          "title": "GMOD躲猫猫模式： 意想不到的遁地术结局",
          "cover": "assets/covers/BV1SQ4y1X7FU.jpg",
          "play": 2912440,
          "comment": 12,
          "danmaku": 70,
          "length": "02:14",
          "created": 1634036337,
          "url": "https://www.bilibili.com/video/BV1SQ4y1X7FU"
        }
      ]
    }
  ]
};

// 指标元信息（real = 接口真实值；estimated = 当前快照缺失，待实时接入）
const VIDEO_METRICS = [
  { key: 'play',     label: '播放量',  real: true,  fmt: 'int' },
  { key: 'comment',  label: '评论数',  real: true,  fmt: 'int' },
  { key: 'danmaku',  label: '弹幕数',  real: true,  fmt: 'int' },
  { key: 'length',   label: '时长',    real: true,  fmt: 'dur' },
];
