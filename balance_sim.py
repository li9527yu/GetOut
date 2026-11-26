# 注意: 这是早期的数值模拟脚本，已经落后于游戏。后来加的系统（甩锅被拒、按次用 AI、课题组之外、生病、小论文、
# 学业预警、改数据、私聊、树洞等）这里都没有。数值以 game/js/engine.js 为准，难度用 game/test/smart.js 来测。
# 留着只为了对照当初的设计推演，不要再拿它的结果当依据。
"""逃出绝命课题组 · 数值平衡模拟

用几种固定策略各跑几千局，看结局分布是否符合设计目标。
所有数值集中在 P 里，调数值只改这里。

用法: python3 balance_sim.py [局数]
"""
import math
import random
import sys
from collections import Counter

P = dict(
    turns=24, turns_per_stage=8, extra_turns=4,
    course_ap=1, course_free_nao=4,              # 研一每回合 1 点行动点被上课占掉，脑子 >= 4 免除
    # 行动点: 肝 -> AP
    ap_by_gan={1: 3, 2: 3, 3: 4, 4: 4, 5: 5},
    # 派活: push -> 每回合派活量
    demand_by_push={1: 1, 2: 1.5, 3: 2, 4: 2.2, 5: 2.4},
    favor_start=40, favor_extra_demand=75,       # 好感 >= 75 时派活 +1
    spill_chance=0.5, spill_cap=2,               # 每个出事同门每回合 50% 让派活 +1
    # 每点行动点的产出
    contrib_full=4, contrib_over=2,
    thesis_base=1, thesis_per_nao=2,               # 论文 = 1 + 2*脑子
    chips_nao_mid=3, chips_per_nao=0.75,         # 去向筹码 = 匹配基数 + 0.75 * (脑子 - 3)
    chips_by_match={"高": 7, "中": 5, "低": 4},
    help_pressure=-10, help_rel=10, help_assim=-2,
    heal_base=6, heal_per_xintai=2,              # 回血 = 6 + 2*心态
    # 摆烂: 看透度 >= 25 才解锁。每点回 SAN = 回血 x1.5，同化度 -3，看透度 +3
    slack_boost=1.5, slack_assim=-3, slack_seen=3, slack_unlock=25,
    # 看透度的来源与回落
    seen_peer={"退学": 10, "发疯": 6, "附体": 4}, seen_renege=8, seen_misguide=5,
    seen_gate_fail=8, seen_caught=3,
    seen_per_turn=0.5,                           # 每回合 +0.5 * (6 - 人品): 导师越差，看得越快
    seen_dual=-5, seen_gate_pass=-3,
    # 看透度的档位: (门槛, SAN 损失倍率, 论文与去向筹码产出倍率, 每回合好感变化)
    seen_tiers=[(75, 0.5, 0.7, -1), (50, 0.75, 0.85, 0)],
    seen_passive_cap=60,                         # 被动看到的最多到 60，再往上只能靠自己摆烂
    seen_end=75,                                 # 结束时达到 75 且没上岸: 想开了
    slack_caught_base=4,                         # 活没交满还摆烂被发现: 好感 -(4 + push)
    slack_caught_control=0.5,                    # 控制狂要打卡: 摆烂必查，50% 被发现
    # 好感
    favor_full=2, favor_over=3, favor_dump=1,
    short_base=1,                                # 少交每点: 好感 -(1 + push)
    # SAN
    san_base=60, san_per_xintai=8,               # 上限 = 60 + 8*心态
    san_drain=[4, 5, 5], san_drain_extra=6,      # 研一/研二/研三/研四 每回合
    san_mad_peer=2, san_peer_mad=10, san_peer_quit=15,
    san_gate_fail=15, san_caught=8, san_low=20,
    san_short_when_assim=5,                      # 同化 >= 60 后每少交 1 点额外掉 SAN
    # 同化度
    assim_full=5, assim_over=2, assim_short=-3, assim_dump=3, assim_dump_junior=8,
    assim_peer_quit=-10, assim_gray=60, assim_end=100,
    # 甩锅
    # 告状概率 = 40% - 0.5% * 关系；师弟师妹 5%；被附体的同门 100%
    dump_pressure=15, dump_rel=-15, tell_base=0.40, tell_per_rel=0.005, tell_junior=0.05,
    tell_favor=-8,
    # 向同门求助: 成功率 = 10% + 8% * 人情 + 0.5% * 关系；成功后他替你干 1 点活
    ask_base=0.10, ask_per_renqing=0.08, ask_per_rel=0.005, ask_pressure=8, ask_rel=-5,
    # 阳奉阴违
    lie_base=0.05, lie_per_push=0.04, lie_per_possessed=0.15,
    # 讨价还价
    bargain_base=0.10, bargain_per=0.08, bargain_turns=4, bargain_fail_favor=-5,
    bargain_assim=-5,
    renege_per=0.05,                             # 每回合反悔概率 = 5% * (5 - 人品)
    # 双喂项目: 每回合出现概率 3% * 资源，拿到概率 30% + 10% * 人情，持续 4 回合
    # 期间给课题组的每点行动点，同时按一半效率涨论文（论文满了涨去向筹码）
    dual_per_res=0.03, dual_get_base=0.30, dual_get_per=0.10, dual_turns=4, dual_ratio=0.5,
    # 同门
    peer_start=(30, 50), junior_start=(10, 25), peer_rand=(0, 2),
    peer_growth={1: 0.2, 2: 0.5, 3: 0.8, 4: 1.1, 5: 1.4},
    peer_short_spill=3, peer_gate=3, peer_chain=4,
    peer_warn=60, warn_lines=(50, 75), peer_break_rate=0.01, peer_random_exit=0.005,
    mad_leave=0.15,
    tendency={
        "硬扛": {"发疯": 65, "退学": 20, "附体": 15},
        "顺从": {"附体": 65, "发疯": 20, "退学": 15},
        "清醒": {"退学": 65, "发疯": 20, "附体": 15},
    },
    # 关卡
    thesis_line=[30, 60, 100], contrib_line=[20, 40, 60],
    # 签字: 好感 >= 70 必签；贡献达标时，好感 >= 50 必签，30-49 概率 = 40% + 12% * 人品
    sign_favor_min=30, sign_favor_sure=50, sign_favor_alone=70,
    sign_base=0.40, sign_per_renpin=0.12,
    gate_fail_lost_turns=2,
    chips_goal=100,
    # 边界与单回合上限
    assim_cap=120, rel_start=30,
    san_loss_cap=25, favor_change_cap=20, incidents_per_turn=1,
    safe_turns=4,                                # 前 4 回合内不应出现发疯或肄业
    # ---- 派活类型 ----
    chore_weight=0.5, chore_favor=1,             # 杂活的贡献只算一半，但交满时每点多涨 1 好感
    sci_bonus_chance=0.25, sci_bonus_ratio=0.5,  # 每点科研活 25% 概率顺带涨半点论文
    # ---- 导师水平与论文卡点 ----
    checkpoints=[20, 50, 80],                    # 选题 / 方法 / 写作
    guide_per_level=0.20,                        # 找导师指导: 成功率 = 20% * 水平
    misguide_level=2, misguide_chance=0.30, misguide_loss=5, misguide_refuse_favor=-5,
    peer_guide_base=0.20, peer_guide_per_rel=0.006,   # 找师兄师姐: 20% + 0.6% * 关系
    explore_base=4, explore_per_nao=0.5,         # 自己摸索: ceil(4 - 脑子/2) 点行动点
    # ---- AI 工具 ----
    ai_boost=1.5,                                # 用 AI 的行动点产出 x1.5
    ai_unlock_rel=50, ai_unlock_random=0.03,     # 同级或师弟师妹关系 >= 50 解锁；其他渠道每回合 3%
    ai_unlock_pusher=0.10,                       # 青椒卷王每回合 10% 主动让你用
    ai_checkpoint_rate=8,                        # 用 AI 过卡点: AI 率 +8
    ai_rate_line=30, ai_rate_slope=0.02,         # 答辩: AI 率超过 30 后每点 +2% 不通过
    ai_rewrite=10,                               # 1 点行动点人工改写: AI 率 -10
    ai_mine_base=0.14, ai_mine_per_nao=0.02,     # 埋雷概率 = 14% - 2% * 脑子
    ai_mine_favor=-8, ai_meeting_every=4,        # 雷在组会(每 4 回合)爆炸
    ai_detect_self=0.03,                         # 只用在自己的事上: 每回合 3% 被发现
    ai_extra_demand=1, ai_ban_favor=-10,         # 加活型: 派活永久 +1；禁用型: 好感 -10
)

# 七种导师原型: 隐藏属性在范围内随机。match = (玩家选对目标时的匹配, 选错时的匹配)
ARCHETYPES = {
    "青椒卷王": dict(push=(4, 5), res=(2, 4), fangren=(1, 3), renpin=(2, 4), level=(4, 5),
                 chore=0.1, sci=0.7, ai="加活", match=("高", "低")),
    "帽子大牛": dict(push=(3, 4), res=(4, 5), fangren=(2, 4), renpin=(2, 4), level=(3, 3),
                 chore=0.1, sci=0.4, ai="加活", match=("高", "中")),
    "横向老板": dict(push=(3, 5), res=(1, 3), fangren=(2, 3), renpin=(1, 3), level=(2, 3),
                 chore=0.2, sci=0.1, ai="加活", match=("中", "低")),
    "佛系放养": dict(push=(1, 2), res=(1, 2), fangren=(4, 5), renpin=(3, 5), level=(2, 4),
                 chore=0.5, sci=0.2, ai="禁用", match=("高", "低")),
    "行政领导": dict(push=(2, 4), res=(2, 3), fangren=(3, 4), renpin=(2, 4), level=(1, 2),
                 chore=0.8, sci=0.0, ai="禁用", match=("高", "低")),
    "控制狂": dict(push=(5, 5), res=(1, 3), fangren=(1, 1), renpin=(1, 2), level=(2, 3),
                chore=0.4, sci=0.3, ai="禁用", match=("低", "低")),
    "神仙导师": dict(push=(1, 2), res=(4, 5), fangren=(5, 5), renpin=(5, 5), level=(4, 5),
                 chore=0.0, sci=0.6, ai="支持", match=("高", "高")),
}

# 每种导师和三个目标的匹配度
GOAL_MATCH = {
    "青椒卷王": {"就业": "低", "读博": "高", "考公": "低"},
    "帽子大牛": {"就业": "中", "读博": "高", "考公": "中"},
    "横向老板": {"就业": "中", "读博": "低", "考公": "中"},
    "佛系放养": {"就业": "高", "读博": "低", "考公": "高"},
    "行政领导": {"就业": "中", "读博": "低", "考公": "高"},
    "控制狂": {"就业": "低", "读博": "低", "考公": "低"},
    "神仙导师": {"就业": "高", "读博": "高", "考公": "高"},
}
RANK = {"高": 2, "中": 1, "低": 0}

# 第二优先补的规则: 目标、日历、换导师、控制狂逃法、留下读博
R = dict(
    # 就业: 攒筹码等于人不在组里
    job_caught_base=6,                           # 被发现: 好感 -(6 + push)
    job_boost=1.3, job_windows={12, 13, 16, 17, 18},   # 暑期实习、秋招；获准实习同样 x1.3
    # 读博: 自己最多攒到 60，科研活每点 +2，最后 40 看推荐信
    phd_self_cap=60, phd_per_sci=2, phd_letter_turn=22,
    phd_letter=[(60, 40), (40, 20)], phd_letter_other=10,   # 好感不够时找别的老师写，要人情 >= 4
    # 考公: 不能用 AI；第 19 回合国考线 70，第 21 回合省考线 80
    exam_turns={18: 70, 20: 80}, exam_cap=85,    # 笔试没过之前筹码最多 85
    # 日历
    meeting_turn=2,                              # 每学期第 3 回合组会
    winter_turn=3, winter_fangren=3,             # 上学期最后一回合是寒假: 放人度 >= 3 时派活 -1
    precheck_turn=19,                            # 预查重: 从这回合起可以人工改写
    # 换导师
    switch_turn=8, switch_ally_base=0.30, switch_ally_per=0.10,
    switch_base=0.30, switch_per=0.10, switch_per_evidence=0.10, switch_control=0.20,
    switch_thesis=0.6, switch_seen=-20, switch_fail_favor=-25, switch_grudge=2,
    evidence_chance=0.20, evidence_cap=3,        # 每回合有 20% 的机会留一次证据
    # 控制狂: 同门联合
    union_rel=60, union_need=2, union_base=0.20, union_per=0.20, union_max=0.80,
    union_push=3, union_fangren=3, union_floor=30, union_fail_favor=-30,
    # 控制狂: 熬到他出事
    fall_base=0.02, fall_per_incident=0.02, fall_per_evidence=0.02,
    # 留下读博
    stay_turns=(16, 21), stay_favor=75, stay_refuse_per=0.20,
    stay_ok_favor=-5, stay_fail_favor=-20, stay_sign_penalty=10, stay_assim=40,
)

# 事件层: 每回合有概率出一个由事件承载的导师动作，玩家用三种口气之一回应
E = dict(
    chance=0.6, chance_quiet=0.3,                # 每回合出随机事件的概率；佛系放养减半
    # 每种导师的事件类型权重: 施压 / 组务 / 承诺 / 给好处
    mix={
        "青椒卷王": (5, 2, 2, 1), "帽子大牛": (2, 5, 2, 1), "横向老板": (2, 1, 3, 4),
        "佛系放养": (2, 4, 2, 2), "行政领导": (1, 2, 4, 3), "控制狂": (10, 8, 1, 1),
        "神仙导师": (0, 3, 2, 5),
    },
    # 三种口气的默认效果
    meek=dict(favor=2, assim=3, san=-1),                         # 怂
    bold_ok=dict(favor=-1, assim=-4), bold_fail=dict(favor=-5, assim=-2, san=-3),   # 刚: 要判定
    bold_base=0.10, bold_per=0.08,               # 刚的成功率 = 10% + 8% * (人情 + 放人度)
    odd=dict(san=3, seen=2), odd_backfire=0.5, odd_favor=-2,     # 歪: 一半概率掉点好感
    # 事件类型的附加效果（不管选什么都生效）
    pressure=dict(san=-2, peer=2),               # 施压: 掉 SAN，同门压力上涨
    perk=dict(favor=3, assim=3),                 # 给好处: 涨好感，也涨同化度
    duty_rel=5,                                  # 组务: 和一个同门的关系 +5 或 -5
    promise_per=0.20, promise_turns=4,           # 承诺: 兑现概率 20% * 人品，兑现后 4 回合派活 -1
)

# 30 个词条，分五组，每局抽 3 个且不同组。效果写在 Game 里（搜词条名）。
TRAITS = {
    "出身": ["本校保研", "双非逆袭", "跨专业", "二战上岸", "调剂生", "工作后读研"],
    "家境": ["家里有矿", "助学贷款", "体制内父母", "高校教师子女", "家里老大"],
    "性格": ["社牛", "大心脏", "小镇做题家", "社恐", "讨好型", "反骨", "拖延症"],
    "技能": ["会写代码", "文笔好", "英语好", "早就会用AI", "会来事", "体力好"],
    "生活": ["有对象", "异地恋", "养猫", "健身习惯", "夜猫子", "游戏搭子"],
}
NOT_SIMULATED = {"高校教师子女": "只影响信息显示", "调剂生": "换导师没有进模拟，只算了初始好感 -5"}
POOL = {"青椒卷王": 0.176, "帽子大牛": 0.176, "横向老板": 0.176, "佛系放养": 0.176,
        "行政领导": 0.176, "控制狂": 0.10, "神仙导师": 0.02}


def random_traits():
    groups = random.sample(list(TRAITS), 3)
    return [random.choice(TRAITS[g]) for g in groups]


def random_attrs():
    total = 16 if random.random() < 0.10 else 12
    while True:
        a = [random.randint(1, 5) for _ in range(4)]
        if sum(a) == total:
            return tuple(a)


def random_archetype():
    return random.choices(list(POOL), list(POOL.values()))[0]


class Peer:
    def __init__(self, name, lo_hi, junior=False, senior=False):
        self.name = name
        self.pressure = random.randint(*lo_hi)
        self.rel = P["rel_start"]
        self.state = "正常"          # 正常 / 发疯 / 退学 / 附体
        self.in_lab = True
        self.junior = junior
        self.senior = senior        # 小导、师兄师姐
        self.tendency = random.choice(list(P["tendency"]))
        self.warned = 0             # 已触发的预兆数
        self.alert = 0              # 玩家还会留意他几回合
        self.pending = None         # 本回合名额已满，顺延到下回合的出事状态


class Game:
    def __init__(self, attrs, archetype, strategy, right_goal=True, traits=(), goal=None):
        self.T = set(traits)
        has = self.T.__contains__
        nao, gan, xintai, renqing = attrs
        xintai = min(5, xintai + has("双非逆袭") + has("助学贷款"))
        renqing = min(5, renqing + has("工作后读研") + has("社牛"))
        self.nao, self.gan, self.xintai, self.renqing = nao, gan, xintai, renqing
        self.set_mentor(archetype)
        if goal is None:                              # 选对: 匹配度最高的目标；选错: 最低的
            ranks = GOAL_MATCH[archetype]
            pick = max if right_goal else min
            edge = pick(RANK[m] for m in ranks.values())
            goal = random.choice([g for g, m in ranks.items() if RANK[m] == edge])
        self.goal = goal
        self.match = GOAL_MATCH[archetype][goal]
        self.strategy = strategy
        self.t = 0
        self.exam_passed = False    # 考公: 笔试过了没有
        self.evidence = 0           # 留过几次证据
        self.switched = False       # 换导师的机会用掉了没有
        self.grudge = 0             # 换导师失败后，每次少交多扣的好感
        self.united = False         # 同门联合的机会用掉了没有
        self.favor_floor = 0
        self.auto_sign = False      # 导师出事后，学院兜底签字
        self.stay_asked = False     # 「留下读博」问过没有
        self.stay_blocked = False   # 婉拒失败: 推荐信没了
        self.sign_penalty = 0
        self.stay_accepted = False
        self.ap = P["ap_by_gan"][gan]
        self.san_max = (P["san_base"] + P["san_per_xintai"] * xintai
                        + 8 * has("二战上岸") + 8 * has("健身习惯"))
        self.san = self.san_max
        self.favor = P["favor_start"] - 8 * has("双非逆袭") - 5 * has("调剂生")
        self.assim = 0
        self.seen = 0               # 看透度
        self.contrib = self.thesis = self.chips = 0
        self.peers = [Peer("小导", P["peer_start"], senior=True),
                      Peer("师兄", P["peer_start"], senior=True),
                      Peer("同级", P["peer_start"])]
        if has("本校保研"):
            self.peers[1].rel = 50
        self.ai_boost = P["ai_boost"]
        self.bargain_left = 0
        self.dual_left = 0
        self.lost_turns = 0
        self.incidents = 0
        self.delayed = False
        self.san_loss = 0           # 本回合累计的 SAN 损失，回合末统一结算
        self.cleared = 0            # 已通过的论文卡点数
        self.explore = 0            # 自己摸索已投入的行动点
        self.thesis_ai = 0          # 论文里由 AI 写出的部分
        self.ai = has("早就会用AI")
        self.ai_found = False
        self.ai_banned = False
        self.mines = []
        self.ai_used = 0
        self.slacked = 0

    def has(self, trait):
        return trait in self.T

    def set_mentor(self, archetype):
        a = ARCHETYPES[archetype]
        self.archetype = archetype
        for k in ("push", "res", "fangren", "renpin", "level"):
            setattr(self, k, random.randint(*a[k]))
        self.ai_attitude = a["ai"]
        self.control = archetype == "控制狂"          # 要打卡
        # 派活配比: [杂活, 科研, 项目]
        w = [a["chore"] + 0.2 * self.has("文笔好") + 0.1 * self.has("英语好"), a["sci"],
             1 - a["chore"] - a["sci"] + 0.2 * self.has("会写代码")]
        self.kind_weights = [max(0.0, x) for x in w]

    # ---- 查询 ----
    def thesis_rate(self):
        return P["thesis_base"] + P["thesis_per_nao"] * self.nao + self.has("小镇做题家")

    def chips_rate(self):
        rate = P["chips_by_match"][self.match] + P["chips_per_nao"] * (self.nao - P["chips_nao_mid"])
        if (self.has("体制内父母") and self.goal == "考公") or (self.has("英语好") and self.goal == "读博"):
            rate += 1
        return rate

    def heal_rate(self):
        return P["heal_base"] + P["heal_per_xintai"] * self.xintai + 3 * self.has("体力好")

    def slack_rate(self):
        base = P["heal_base"] + P["heal_per_xintai"] * self.xintai
        return base * P["slack_boost"] * (1.5 if self.has("社恐") else 1) + 3 * self.has("养猫")

    def can_slack(self):
        return self.seen >= P["slack_unlock"]

    def seen_tier(self):
        """返回 (SAN 损失倍率, 自己的产出倍率, 每回合好感变化)。"""
        for line, san_mult, out_mult, favor in P["seen_tiers"]:
            if self.seen >= line:
                return san_mult, out_mult, favor
        return 1, 1, 0

    def thesis_cap(self):
        cps = P["checkpoints"]
        return cps[self.cleared] if self.cleared < len(cps) else 100

    def blocked(self):
        return self.cleared < len(P["checkpoints"]) and self.thesis >= self.thesis_cap() - 1e-9

    def explore_cost(self):
        return math.ceil(P["explore_base"] - P["explore_per_nao"] * self.nao) + self.has("工作后读研")

    def ai_rate(self):
        return 100 * self.thesis_ai / self.thesis if self.thesis > 0 else 0

    def normal_peers(self):
        return [p for p in self.peers if p.state == "正常"]

    def lie_chance(self):
        possessed = sum(1 for p in self.peers if p.state == "附体")
        return P["lie_base"] + P["lie_per_push"] * self.push + P["lie_per_possessed"] * possessed

    def demand(self):
        base = P["demand_by_push"][self.push]
        d = int(base) + (random.random() < base - int(base))
        if self.favor >= P["favor_extra_demand"]:
            d += 1
        if self.ai_found and self.ai_attitude == "加活":
            d += P["ai_extra_demand"]
        gone = sum(1 for p in self.peers if p.state != "正常")
        d += min(P["spill_cap"], sum(random.random() < P["spill_chance"] for _ in range(gone)))
        if self.bargain_left > 0:
            d -= 1
        return max(0, d)

    def chips_cap(self):
        """现在靠自己最多能把筹码攒到多少。"""
        if self.goal == "读博":
            return R["phd_self_cap"]
        if self.goal == "考公" and not self.exam_passed:
            return R["exam_cap"]
        return P["chips_goal"]

    def add_chips(self, gain, cap=None):
        cap = self.chips_cap() if cap is None else cap
        self.chips = max(self.chips, min(cap, self.chips + gain))

    def landed(self):
        if self.goal == "考公" and not self.exam_passed:
            return False
        return self.chips >= P["chips_goal"]

    def add_thesis(self, gain, by_ai=False):
        gain = min(gain, max(0, self.thesis_cap() - self.thesis))
        self.thesis += gain
        if by_ai:
            self.thesis_ai += gain

    def see(self, x):
        """被动看透: 往上最多到 seen_passive_cap，往下不限。"""
        if x > 0:
            x = max(0, min(x, P["seen_passive_cap"] - self.seen))
        self.seen += x

    def add_assim(self, x):
        if x > 0:
            x *= (1.5 if self.has("讨好型") else 1) * (0.5 if self.has("反骨") else 1)
        self.assim += x

    def turn_ap(self, t, stage):
        """这回合能自由支配的行动点，以及词条带来的固定事件。返回 (ap, 自动摆烂的点数)。"""
        if self.lost_turns > 0:
            self.lost_turns -= 1
            return 0, 0
        ap = self.ap + (self.has("夜猫子") and stage >= 2)   # 研三熬夜赶工
        if self.has("家里老大") and t % 8 == 5:       # 每学年回家一趟
            ap -= 1
            self.san += 10
        if self.has("异地恋") and t % 8 == 5:         # 每学年见一次面
            ap -= 1
            self.san += 25
        if stage == 0:
            course = P["course_ap"] if self.nao < P["course_free_nao"] else 0
            ap -= course
        ap -= self.has("健身习惯") and t % 8 == 7     # 每学年花 1 点维持习惯
        if self.has("有对象") and t % 8 == 2:         # 每学年一次约会
            ap -= 1
            self.san += 10
        if self.san < P["san_low"]:
            ap -= 1                                   # 失控: 1 点行动点白白浪费
        ap = max(0, ap)
        forced = 1 if (ap > 0 and self.has("拖延症") and random.random() < 0.15) else 0
        return ap - forced, forced

    # ---- 日历上的事件 ----
    def calendar(self, t):
        """回合开始时结算: 留证据、换导师、同门联合、导师出事、留下读博。"""
        smart = getattr(self.strategy, "smart", False)     # 单一策略不会用这些手段
        if smart and self.evidence < R["evidence_cap"] and random.random() < R["evidence_chance"]:
            self.evidence += 1
        if self.archetype == "控制狂":
            if smart and t == R["switch_turn"] and not self.switched:
                self.try_switch(t)
            if smart and self.archetype == "控制狂" and not self.united:
                self.try_union()
            if self.archetype == "控制狂":
                chance = (R["fall_base"] + R["fall_per_incident"] * self.incidents
                          + R["fall_per_evidence"] * self.evidence)
                if random.random() < chance:
                    self.mentor_falls()
        lo, hi = R["stay_turns"]
        if lo <= t <= hi and not self.stay_asked and self.favor >= R["stay_favor"]:
            self.stay_asked = True
            if getattr(self.strategy, "accept_phd", False):
                self.add_assim(R["stay_assim"])
                self.stay_accepted = True
            elif random.random() < R["stay_refuse_per"] * self.fangren:
                self.favor += R["stay_ok_favor"]
            else:
                self.favor += R["stay_fail_favor"]
                self.sign_penalty = R["stay_sign_penalty"]
                self.stay_blocked = True

    def random_event(self):
        """事件层。返回这回合事件带来的好感变化，其余效果直接结算。"""
        chance = E["chance_quiet"] if self.archetype == "佛系放养" else E["chance"]
        if random.random() >= chance:
            return 0
        kind = random.choices(["施压", "组务", "承诺", "给好处"], E["mix"][self.archetype])[0]
        favor = 0

        def apply(fx):
            nonlocal favor
            favor += fx.get("favor", 0)
            self.add_assim(fx.get("assim", 0))
            san = fx.get("san", 0)
            if san < 0:
                self.san_loss -= san
            else:
                self.san = min(self.san_max, self.san + san)
            if fx.get("seen"):
                self.see(fx["seen"])

        if kind == "施压":
            apply(E["pressure"])
            for p in self.normal_peers():
                p.pressure += E["pressure"]["peer"]
        elif kind == "给好处":
            apply(dict(E["perk"], assim=0) if self.has("家里有矿") else E["perk"])
            if self.has("会来事"):
                favor += E["perk"]["favor"]
        elif kind == "组务" and self.normal_peers():
            random.choice(self.normal_peers()).rel += random.choice((-1, 1)) * E["duty_rel"]
        elif kind == "承诺":
            if random.random() < E["promise_per"] * self.renpin:
                self.bargain_left = max(self.bargain_left, E["promise_turns"] + 1)
            else:
                self.see(P["seen_renege"])
        # 玩家的回应
        tone = getattr(self.strategy, "tone", None)
        if tone is None:                              # 聪明的策略看状态选口气
            tone = "刚" if self.assim >= 40 else ("歪" if self.san < 50 else "怂")
        if tone == "怂":
            apply(E["meek"])
        elif tone == "刚":
            ok = random.random() < E["bold_base"] + E["bold_per"] * (self.renqing + self.fangren)
            apply(E["bold_ok"] if ok else E["bold_fail"])
        else:
            apply(E["odd"])
            if random.random() < E["odd_backfire"]:
                favor += E["odd_favor"]
        return favor

    def try_switch(self, t):
        self.switched = True
        if random.random() >= R["switch_ally_base"] + R["switch_ally_per"] * self.renqing:
            return                                    # 没拉到辅导员，提都没法提
        chance = (R["switch_base"] + R["switch_per"] * self.renqing
                  + R["switch_per_evidence"] * self.evidence
                  + R["switch_control"] * (self.archetype == "控制狂") + 0.2 * self.has("调剂生"))
        if random.random() >= chance:
            self.favor += R["switch_fail_favor"]
            self.grudge = R["switch_grudge"]
            return
        options = [a for a in POOL if a not in ("控制狂", self.archetype)]
        self.set_mentor(random.choices(options, [POOL[a] for a in options])[0])
        self.match = GOAL_MATCH[self.archetype][self.goal]
        self.favor = P["favor_start"]
        self.thesis *= R["switch_thesis"]
        self.thesis_ai *= R["switch_thesis"]
        self.cleared = sum(1 for c in P["checkpoints"] if c < self.thesis)
        self.contrib = P["contrib_line"][0] if t >= P["turns_per_stage"] else self.contrib
        self.peers = [Peer("小导", P["peer_start"], senior=True),
                      Peer("师兄", P["peer_start"], senior=True), Peer("同级", P["peer_start"])]
        if t >= P["turns_per_stage"]:
            self.peers.append(Peer("师弟", P["junior_start"], junior=True))
        self.see(R["switch_seen"])
        self.ai_found = self.ai_banned = False
        self.bargain_left = self.dual_left = 0

    def try_union(self):
        allies = sum(1 for p in self.normal_peers() if p.rel >= R["union_rel"])
        if allies < R["union_need"]:
            return
        self.united = True
        if random.random() < min(R["union_max"], R["union_base"] + R["union_per"] * allies):
            self.push, self.fangren = R["union_push"], R["union_fangren"]
            self.control = False
            self.favor_floor = R["union_floor"]
        else:
            self.favor += R["union_fail_favor"]
            victim = random.choice(self.normal_peers())
            self.peer_break(victim, "退学")

    def mentor_falls(self):
        """控制狂被调查，学院指派临时导师: 按佛系放养处理，关卡签字自动通过。"""
        push_keep = self.level
        self.set_mentor("佛系放养")
        self.level = push_keep
        self.auto_sign = True
        self.ai_found = self.ai_banned = False

    def letter(self):
        """读博的推荐信。"""
        if self.stay_blocked:
            return                                    # 婉拒留组失败，他不给写
        for line, gain in R["phd_letter"]:
            if self.favor >= line:
                self.add_chips(gain, cap=P["chips_goal"])
                return
        if self.renqing >= 4:
            self.add_chips(R["phd_letter_other"], cap=P["chips_goal"])

    # ---- 一回合 ----
    # 结算顺序: 派活 -> 玩家分配 -> 产出 -> 好感与同化度 -> SAN(先回血再扣) -> 同门 -> 检查
    def turn(self, t, stage):
        self.t = t
        self.calendar(t)
        # 1. 派活
        ap, forced = self.turn_ap(t, stage)
        self.san = min(self.san_max, self.san)
        favor = 0
        self.san_loss = 0
        if self.bargain_left > 0 and random.random() < P["renege_per"] * (5 - self.renpin):
            self.bargain_left = 0                     # 导师反悔
            self.see(P["seen_renege"])
        demand = self.demand() if ap + forced else 0
        if demand and t % 8 == R["winter_turn"] and self.fangren >= R["winter_fangren"]:
            demand -= 1                               # 寒假
        kinds = random.choices(["杂活", "科研", "项目"], self.kind_weights, k=demand)
        self.unlock_ai()
        self.see(P["seen_per_turn"] * (6 - self.renpin))
        san_mult, out_mult, seen_favor = self.seen_tier()
        favor += seen_favor
        deadline = 1.3 if (self.has("拖延症") and t % 8 == 7) else 1   # 关卡前一回合

        # 2. 玩家分配
        plan = self.strategy(self, ap, demand, stage)
        g = plan.get
        d_plain, d_ai, dump, lie = g("deliver", 0), g("deliver_ai", 0), g("dump", 0), g("lie", False)
        unblock = g("unblock")
        ai_ap = d_ai + g("thesis_ai", 0) + g("chips_ai", 0) + (1 if unblock == "ai" else 0)
        spent = (d_plain + d_ai + g("thesis", 0) + g("thesis_ai", 0) + g("chips", 0)
                 + g("chips_ai", 0) + g("heal", 0) + len(g("help", [])) + g("explore", 0)
                 + g("rewrite", 0) + g("slack", 0) + (1 if unblock else 0))
        assert spent <= ap, f"行动点超支: {spent} > {ap}"
        assert ai_ap == 0 or self.ai, "还没解锁 AI"
        assert g("slack", 0) == 0 or self.can_slack(), "还没看透，不能摆烂"
        d = d_plain + self.ai_boost * d_ai            # 实际交付的活
        if demand and d:
            chore = kinds.count("杂活") / demand
            d *= 1 + 0.5 * chore * self.has("文笔好") + 0.25 * (1 - chore) * self.has("会写代码")
        d *= deadline
        helped = 0
        ask = g("ask")
        if ask is not None and demand > d + dump:
            chance = (P["ask_base"] + P["ask_per_renqing"] * self.renqing
                      + P["ask_per_rel"] * ask.rel)
            if random.random() < chance:
                helped = 1
                ask.pressure += P["ask_pressure"]
                ask.rel += P["ask_rel"]
        short = max(0, demand - d - dump - helped)
        full = short < 1e-9

        # 3. 产出
        # 3a. 论文卡点（先于论文产出结算）
        if self.blocked():
            if unblock == "mentor":
                if self.level <= P["misguide_level"] and random.random() < P["misguide_chance"]:
                    self.thesis -= P["misguide_loss"]         # 瞎指挥，照做了
                    self.thesis_ai = min(self.thesis_ai, self.thesis)
                    self.see(P["seen_misguide"])
                elif random.random() < P["guide_per_level"] * self.level:
                    self.cleared += 1
            elif unblock == "peer":
                seniors = [p for p in self.normal_peers() if p.senior]
                if seniors:
                    rel = max(p.rel for p in seniors)
                    if random.random() < P["peer_guide_base"] + P["peer_guide_per_rel"] * rel:
                        self.cleared += 1
            elif unblock == "ai":
                self.cleared += 1
                self.thesis_ai = min(self.thesis, self.thesis_ai + P["ai_checkpoint_rate"])
                self.roll_mine("checkpoint")
            if self.blocked() and g("explore", 0):
                self.explore += g("explore", 0)
                if self.explore >= self.explore_cost():
                    self.cleared += 1
            if not self.blocked():
                self.explore = 0
        # 3b. 贡献
        if demand:
            weight = sum(P["chore_weight"] if k == "杂活" else 1 for k in kinds) / demand
            ratio = min(d, demand) / demand
            self.contrib += P["contrib_full"] * ratio * weight
            for k in kinds:
                if k == "科研" and random.random() < ratio * P["sci_bonus_chance"]:
                    self.add_thesis(self.thesis_rate() * P["sci_bonus_ratio"])
            if self.goal == "读博" and stage >= 1:
                self.add_chips(R["phd_per_sci"] * kinds.count("科研") * ratio)
        elif ap:
            self.contrib += P["contrib_full"]         # 讨价还价换来的空档不扣贡献
        over = max(0, d - demand)
        self.contrib += P["contrib_over"] * over
        # 3c. 双喂项目
        if self.dual_left > 0:
            if self.thesis < 100 and not self.blocked():
                self.add_thesis(self.thesis_rate() * P["dual_ratio"] * d)
            elif stage >= 1:
                self.add_chips(self.chips_rate() * P["dual_ratio"] * d)
            self.dual_left -= 1
        elif ap and random.random() < P["dual_per_res"] * self.res:
            if random.random() < P["dual_get_base"] + P["dual_get_per"] * self.renqing:
                self.dual_left = P["dual_turns"]
                self.see(P["seen_dual"])           # 看到一点希望
        # 3d. 论文与去向筹码（看透后动力下降）
        own = out_mult * deadline
        basics = 0.8 if (self.has("跨专业") and stage == 0) else 1   # 跨专业: 研一补基础
        self.add_thesis(self.thesis_rate() * own * basics * g("thesis", 0))
        self.add_thesis(self.thesis_rate() * own * basics * self.ai_boost * g("thesis_ai", 0), by_ai=True)
        chips_ap = g("chips", 0) + g("chips_ai", 0)
        if stage >= 1 and chips_ap:
            assert not (self.goal == "考公" and g("chips_ai", 0)), "考公备考不能用 AI"
            gain = self.chips_rate() * own * (g("chips", 0) + self.ai_boost * g("chips_ai", 0))
            if self.goal == "就业":
                allowed = self.bargain_left > 0       # 讨价还价换来的「获准实习」
                if allowed or t in R["job_windows"]:
                    gain *= R["job_boost"]
                if not allowed and random.random() < self.lie_chance():
                    favor -= R["job_caught_base"] + self.push   # 人不在组里，被发现了
                    self.see(P["seen_caught"])
            self.add_chips(gain)
        self.thesis_ai = max(0, self.thesis_ai - P["ai_rewrite"] * g("rewrite", 0))
        # 3e. AI 的副作用: 埋雷、被发现
        for kind, n in (("deliver", d_ai), ("thesis", g("thesis_ai", 0)), ("chips", g("chips_ai", 0))):
            for _ in range(n):
                self.roll_mine(kind)
        if ai_ap:
            self.ai_used += ai_ap
            chance = self.lie_chance() if d_ai else P["ai_detect_self"]
            chance += 0.03 * self.has("早就会用AI")       # 用得太顺手，藏不住
            if random.random() < chance:
                if self.ai_banned:                    # 明知故犯，按阳奉阴违算
                    favor -= 22 - 2 * self.fangren
                    self.san_loss += P["san_caught"]
                    self.see(P["seen_caught"])
                elif not self.ai_found:
                    self.ai_found = True
                    if self.ai_attitude == "禁用":
                        self.ai_banned = True
                        favor += P["ai_ban_favor"]

        # 4. 好感与同化度
        if full and demand:
            if dump or helped:
                favor += P["favor_dump"]
            else:
                favor += P["favor_full"] + P["favor_over"] * over + self.has("讨好型")
                favor += P["chore_favor"] * kinds.count("杂活")
                self.add_assim(P["assim_full"] + P["assim_over"] * over)
        elif not full:
            self.add_assim(P["assim_short"])
            if self.assim >= P["assim_gray"]:
                self.san_loss += P["san_short_when_assim"] * short
            if lie:
                if random.random() < self.lie_chance():
                    favor -= 22 - 2 * self.fangren
                    self.san_loss += P["san_caught"]
                    self.see(P["seen_caught"])
            else:
                favor -= short * (P["short_base"] + self.push + self.has("反骨") + self.grudge)
                for p in self.normal_peers():
                    p.pressure += P["peer_short_spill"] * short
        self.add_assim(self.has("小镇做题家") + self.has("会来事"))
        if dump:
            target = plan["dump_to"]
            target.pressure += P["dump_pressure"] * dump
            target.rel += P["dump_rel"]
            self.add_assim(P["assim_dump_junior"] if target.junior else P["assim_dump"])
            if target.state == "附体":
                tell = 1.0
            elif target.junior:
                tell = P["tell_junior"]
            else:
                tell = max(0.0, P["tell_base"] - P["tell_per_rel"] * target.rel)
            if random.random() < tell:
                favor += P["tell_favor"]
        if g("bargain") and full and self.bargain_left == 0:
            chance = (P["bargain_base"] + P["bargain_per"] * (self.renqing + self.fangren)
                      + 0.1 * self.has("工作后读研") + 0.1 * self.has("会来事"))
            self.add_assim(P["bargain_assim"])
            if random.random() < chance:
                self.bargain_left = P["bargain_turns"] + 1
            else:
                favor += P["bargain_fail_favor"]
        for target in g("help", []):
            half = 0.5 if self.has("社恐") else 1
            target.pressure += P["help_pressure"] * half
            target.rel += P["help_rel"] * half + 5 * self.has("社牛")
            self.add_assim(P["help_assim"])
        slack = forced + g("slack", 0)
        if slack:
            self.slacked += slack
            self.add_assim(P["slack_assim"] * slack)
            self.seen += P["slack_seen"] * slack
            if self.has("游戏搭子") and self.normal_peers():
                buddy = random.choice(self.normal_peers())
                buddy.rel += 5 * slack
                buddy.pressure -= 3 * slack
            if self.control:
                chance = P["slack_caught_control"]
            else:
                chance = 0 if full else self.lie_chance()
            chance += 0.1 * self.has("游戏搭子") if chance else 0
            if random.random() < chance:
                favor -= P["slack_caught_base"] + self.push
                self.see(P["seen_caught"])
        favor += self.random_event()
        if t % 4 == R["meeting_turn"]:                # 组会
            favor += self.explode_mines() - self.has("夜猫子")
        cap = P["favor_change_cap"]
        self.favor += max(-cap, min(cap, favor))

        # 5. SAN: 先回血，再累计本回合消耗
        self.san += self.heal_rate() * g("heal", 0) + self.slack_rate() * slack
        self.san = min(self.san_max, self.san)
        drain = P["san_drain"][stage] if stage < 3 else P["san_drain_extra"]
        drain += (self.gan == 5) + self.has("异地恋") + self.has("夜猫子")
        drain -= self.has("有对象") + self.has("健身习惯")
        drain += P["san_mad_peer"] * sum(1 for p in self.peers if p.state == "发疯" and p.in_lab)
        if self.has("养猫") and t % 8 == 4:
            drain += 6                                # 每学年一次猫生病
        if self.has("体制内父母") and self.goal != "考公" and t % 4 == 1:
            drain += 3                                # 催考公的电话
        self.san_loss += max(0, drain)
        self.bargain_left = max(0, self.bargain_left - 1)

        # 6. 同门（出事的 SAN 损失也计入本回合上限）
        self.peers_tick()

        if self.goal == "考公" and not self.exam_passed and self.chips >= R["exam_turns"].get(t, 999):
            self.exam_passed = True                   # 笔试过线
        if self.goal == "读博" and t == R["phd_letter_turn"]:
            self.letter()

        # 7. 统一扣 SAN（看透后损失打折），截断所有数值
        self.san -= min(P["san_loss_cap"], self.san_loss * san_mult)
        self.clamp()

    # ---- AI ----
    def unlock_ai(self):
        if self.ai:
            return
        if any(p.rel >= P["ai_unlock_rel"] for p in self.normal_peers() if not p.senior):
            self.ai = True
        elif random.random() < P["ai_unlock_random"]:
            self.ai = True
        elif self.archetype == "青椒卷王" and random.random() < P["ai_unlock_pusher"]:
            self.ai = True
            self.ai_found = True                      # 是他让你用的，活自然也加上了

    def roll_mine(self, kind):
        chance = P["ai_mine_base"] - P["ai_mine_per_nao"] * self.nao
        chance -= 0.04 * self.has("家里有矿")
        if self.ai_found and self.ai_attitude == "支持":
            chance /= 2                               # 神仙导师教你怎么用好
        if random.random() < chance:
            self.mines.append(kind)

    def explode_mines(self):
        favor = 0
        for kind in self.mines:
            favor += P["ai_mine_favor"]
            if kind == "thesis":
                loss = min(self.thesis, self.thesis_rate() * self.ai_boost)
                self.thesis -= loss
                self.thesis_ai = max(0, self.thesis_ai - loss)
            elif kind == "chips":
                self.chips = max(0, self.chips - self.chips_rate() * self.ai_boost)
            elif kind == "deliver":
                self.contrib = max(0, self.contrib - P["contrib_full"] / 2)
        self.mines = []
        return favor

    def clamp(self):
        self.favor = max(self.favor_floor, min(100, self.favor))
        self.assim = max(0, min(P["assim_cap"], self.assim))
        self.seen = max(0, min(100, self.seen))
        self.contrib = max(0, min(100, self.contrib))
        self.thesis = max(0, min(100, self.thesis))
        self.thesis_ai = max(0, min(self.thesis, self.thesis_ai))
        self.chips = max(0, min(100, self.chips))
        for p in self.peers:
            p.pressure = max(0, min(100, p.pressure))
            p.rel = max(0, min(100, p.rel))
        assert self.san <= self.san_max

    # ---- 同门 ----
    def peers_tick(self):
        for p in self.peers:
            if p.state == "发疯" and p.in_lab and random.random() < P["mad_leave"]:
                p.in_lab = False
        slots = P["incidents_per_turn"]
        normal = self.normal_peers()
        for p in normal:                              # 上回合顺延下来的先出事
            if p.pending and slots > 0:
                self.peer_break(p, p.pending)
                slots -= 1
        for p in normal:
            if p.state != "正常":
                continue
            p.alert = max(0, p.alert - 1)
            if p.warned < len(P["warn_lines"]) and p.pressure >= P["warn_lines"][p.warned]:
                p.warned += 1
                p.alert = 2
            p.pressure = min(100, p.pressure + P["peer_growth"][self.push]
                             + random.randint(*P["peer_rand"]))
            if p.pending:
                continue
            state = None
            if random.random() < P["peer_random_exit"]:
                state = "退学"
            elif (p.pressure > P["peer_warn"]
                  and random.random() < (p.pressure - P["peer_warn"]) * P["peer_break_rate"]):
                w = P["tendency"][p.tendency]
                state = random.choices(list(w), list(w.values()))[0]
            if state and slots > 0:
                self.peer_break(p, state)
                slots -= 1
            elif state:
                p.pending = state                     # 本回合名额已满，顺延

    def peer_break(self, p, state):
        p.state = state
        p.pending = None
        self.incidents += 1
        self.see(P["seen_peer"][state])            # 又看清了一点
        shock = 0.5 if self.has("大心脏") else 1
        if state == "发疯":
            self.san_loss += P["san_peer_mad"] * shock
        elif state == "退学":
            p.in_lab = False
            self.san_loss += P["san_peer_quit"] * shock
            self.add_assim(P["assim_peer_quit"])
        for q in self.normal_peers():
            q.pressure += P["peer_chain"]

    # ---- 关卡 ----
    def signed(self, i):
        if self.auto_sign:
            return True
        extra = self.sign_penalty if i == 2 else 0    # 婉拒留组失败: 答辩签字更难
        if self.favor >= P["sign_favor_alone"] + extra:
            return True
        if self.contrib < P["contrib_line"][i] or self.favor < P["sign_favor_min"] + extra:
            return False
        if self.favor >= P["sign_favor_sure"] + extra:
            return True
        return random.random() < P["sign_base"] + P["sign_per_renpin"] * self.renpin

    def gate(self, i):
        for p in self.normal_peers():
            p.pressure += P["peer_gate"]
        ok = self.signed(i) and self.thesis >= P["thesis_line"][i]
        if ok and i == 2:                             # 答辩前查 AI 率
            over = self.ai_rate() - P["ai_rate_line"]
            if over > 0 and random.random() < over * P["ai_rate_slope"]:
                ok = False
        self.see(P["seen_gate_pass"] if ok else P["seen_gate_fail"])
        self.seen = max(0, min(100, self.seen))
        return ok

    def run(self):
        """返回 (结局, 结束时的回合数)。"""
        tps = P["turns_per_stage"]
        for t in range(P["turns"]):
            stage = t // tps
            if t == tps:
                self.peers.append(Peer("师弟", P["junior_start"], junior=True))
            self.turn(t, stage)
            if self.san <= 0:
                return "发疯", t + 1
            if (t + 1) % tps == 0:
                ok = self.gate(stage)
                if not ok and stage < 2:
                    self.lost_turns = P["gate_fail_lost_turns"]
                    self.san -= P["san_gate_fail"]    # 关卡失败不计入单回合上限
                    if self.san <= 0:
                        return "发疯", t + 1
                elif not ok:
                    if self.has("助学贷款"):
                        return self.dropout(), t + 1  # 延毕即结局
                    self.delayed = True
                    self.san -= 10 * self.has("二战上岸")
                    for k in range(P["extra_turns"]):
                        self.turn(P["turns"] + k, 3)
                        if self.san <= 0:
                            return "发疯", t + 2 + k
                    if not self.gate(2):
                        return self.dropout(), t + 1 + P["extra_turns"]
        end = P["turns"] + (P["extra_turns"] if self.delayed else 0)
        if self.stay_accepted:
            return "留组读博", end
        if self.assim >= P["assim_end"]:
            return "留组成为小导", end
        got = self.landed()
        if not got and self.seen >= P["seen_end"]:
            return "想开了·躺平毕业", end
        if self.delayed:
            return ("延毕上岸" if got else "延毕失业"), end
        return ("上岸" if got else "毕业即失业"), end

    def dropout(self):
        return "想开了·退学" if self.seen >= P["seen_end"] else "肄业"


# ---- 策略 ----
# ai_mode: None 不用 AI；"self" 只用在自己的事上；"all" 派活也用
# slack: 想休息时，看透了就摆烂，否则回血。lazy: 保住论文线之后，剩下的行动点全部摆烂
def spend_self(g, ap, stage, plan, ai_mode=None, slack=False, lazy=False):
    """把剩余行动点花在自己身上: 休息 -> 过卡点 -> 保论文进度线 -> 攒去向筹码。"""
    use_ai = bool(ai_mode) and g.ai
    slack = slack and g.can_slack()
    rest = "slack" if slack else "heal"
    per_rest = g.slack_rate() if slack else g.heal_rate()
    while ap > 0 and g.san + per_rest * plan.get(rest, 0) < 45:
        plan[rest] = plan.get(rest, 0) + 1
        ap -= 1
    # 研四: 先把 AI 率改写到线以下
    while ap > 0 and (stage == 3 or g.t >= R["precheck_turn"]) and (g.thesis_ai - P["ai_rewrite"] * plan.get("rewrite", 0)
                                     > P["ai_rate_line"]):
        plan["rewrite"] = plan.get("rewrite", 0) + 1
        ap -= 1
    ai_budget = P["ai_rate_line"] - g.thesis_ai       # 还能让 AI 写多少论文而不超线
    cps = P["checkpoints"]
    cap = g.thesis_cap()
    blocked = g.blocked()
    if blocked and ap > 0:
        cleared_now = False
        if use_ai and ai_budget >= P["ai_checkpoint_rate"]:
            plan["unblock"] = "ai"
            ai_budget -= P["ai_checkpoint_rate"]
            cleared_now = True
            ap -= 1
        elif g.level >= 3:
            plan["unblock"] = "mentor"
            ap -= 1
        else:
            n = min(ap, g.explore_cost() - g.explore)
            plan["explore"] = n
            ap -= n
            cleared_now = g.explore + n >= g.explore_cost()
        if cleared_now:
            blocked = False
            cap = cps[g.cleared + 1] if g.cleared + 1 < len(cps) else 100
    line = P["thesis_line"][min(stage, 2)]
    rate = g.thesis_rate() * g.seen_tier()[1]
    projected = g.thesis
    while ap > 0:
        want_thesis = (not blocked and projected < cap - 1e-9
                       and (projected < line or (stage == 0 and not lazy)
                            or (g.chips >= g.chips_cap() and not lazy)))
        if want_thesis:
            gain = rate * g.ai_boost
            if use_ai and ai_budget >= gain:
                plan["thesis_ai"] = plan.get("thesis_ai", 0) + 1
                ai_budget -= gain
                projected += gain
            else:
                plan["thesis"] = plan.get("thesis", 0) + 1
                projected += rate
        elif stage >= 1 and g.chips < g.chips_cap() and not (lazy and slack):
            key = "chips_ai" if (use_ai and g.goal != "考公") else "chips"
            plan[key] = plan.get(key, 0) + 1
        else:
            plan[rest] = plan.get(rest, 0) + 1
        ap -= 1
    return plan


def deliver(g, plan, n_points, ap, ai_mode):
    """交 n_points 点活，返回花掉的行动点。派活上用 AI 的条件: 全用模式，或导师已经知道且不禁。"""
    ai_ok = g.ai and not g.ai_banned and (ai_mode == "all" or (ai_mode and g.ai_found))
    if ai_ok and n_points > 0:
        n = min(ap, math.ceil(n_points / g.ai_boost))
        plan["deliver_ai"] = n
    else:
        n = min(ap, n_points)
        plan["deliver"] = n
    return n


def obedient(g, ap, demand, stage):
    plan = {}
    return spend_self(g, ap - deliver(g, plan, demand, ap, None), stage, plan)


obedient.accept_phd = True                            # 导师让留下读博就留
obedient.tone = "怂"


def selfish(g, ap, demand, stage):
    return spend_self(g, ap, stage, {})


selfish.tone = "刚"


def dumper(g, ap, demand, stage):
    plan = {}
    peers = [p for p in g.peers if p.state == "正常"]
    points = demand
    if demand and peers:
        target = next((p for p in peers if p.junior), min(peers, key=lambda p: p.pressure))
        plan.update(dump=1, dump_to=target)
        points = demand - 1
    return spend_self(g, ap - deliver(g, plan, points, ap, None), stage, plan)


def make_balanced(ai_mode=None, slack=False, lazy=False):
    def balanced(g, ap, demand, stage):
        """交够活，同化高了就少交一点，看到预兆就帮同门，定期讨价还价。"""
        points = demand
        keep = 65 if g.goal == "读博" else 45        # 读博要留着好感换推荐信
        if g.assim >= 40 and points > 0 and g.favor >= keep:
            points -= 1
        # 读博要靠交活攒好感，好感不到 60 之前不谈条件
        plan = {"bargain": points >= demand and g.favor >= (60 if g.goal == "读博" else 40)}
        ap -= deliver(g, plan, points, ap, ai_mode)
        at_risk = sorted((p for p in g.peers if p.state == "正常" and p.alert > 0),
                         key=lambda p: -p.pressure)
        plan["help"] = []
        for p in at_risk[:1]:
            if ap > 1:
                plan["help"].append(p)
                ap -= 1
        if g.control and not g.united and ap > 2 and not plan["help"]:
            friends = sorted((p for p in g.peers if p.state == "正常" and p.rel < R["union_rel"]),
                             key=lambda p: -p.rel)
            if friends:                               # 先把关系最好的两个拉到 60
                plan["help"].append(friends[0])
                ap -= 1
        return spend_self(g, ap, stage, plan, ai_mode, slack, lazy)
    balanced.smart = True
    return balanced


STRATEGIES = {"全顺从": obedient, "只顾自己": selfish, "甩锅": dumper,
              "平衡·不用AI": make_balanced(None), "平衡·AI自用": make_balanced("self"),
              "平衡·AI全用": make_balanced("all"),
              "平衡·会摆烂": make_balanced("self", slack=True),
              "躺平流": make_balanced("self", slack=True, lazy=True)}
MAIN = "平衡·会摆烂"                                  # 评估词条和整体分布时用的策略
ENDINGS = ["上岸", "毕业即失业", "延毕上岸", "延毕失业", "肄业", "发疯", "留组成为小导",
           "留组读博", "想开了·躺平毕业", "想开了·退学"]
SHORT = ["上岸", "失业", "延毕上岸", "延毕失业", "肄业", "发疯", "小导", "留组读博", "躺平毕业", "想开退学"]
CHECKS = {"early": 0, "no_way_out": []}


def play(n, strategy, attrs=None, archetype=None, traits=None, right_goal=True, goal=None):
    """跑 n 局。attrs / archetype / traits 传 None 表示每局随机。"""
    c, extra = Counter(), Counter()
    for _ in range(n):
        g = Game(attrs or random_attrs(), archetype or random_archetype(), STRATEGIES[strategy],
                 right_goal, random_traits() if traits is None else traits, goal)
        ending, turns = g.run()
        c[ending] += 1
        extra["incidents"] += g.incidents
        extra["ai"] += g.ai_used
        extra["slack"] += g.slacked
        if ending in ("发疯", "肄业") and turns <= P["safe_turns"]:
            CHECKS["early"] += 1
    return c, extra


def row(label, c, extra, n):
    cells = " | ".join(f"{100 * c[e] / n:.0f}%" for e in ENDINGS)
    return f"| {label} | {cells} | {extra['incidents'] / n:.1f} | {extra['slack'] / n:.0f} |"


def header(first):
    print(f"| {first} | " + " | ".join(SHORT) + " | 同门出事 | 摆烂点数 |")
    print("|---|" + "---|" * (len(SHORT) + 2))


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
    random.seed(7)
    plain = (3, 3, 3, 3)

    print("## 1. 各导师（普通萝卜，无词条，选对目标）")
    header("导师 / 策略")
    for a in ARCHETYPES:
        best = 0
        for s in ("平衡·AI自用", "平衡·会摆烂", "躺平流"):
            c, extra = play(n, s, plain, a, [])
            best = max(best, c["上岸"] + c["延毕上岸"])
            print(row(f"{a} / {s}", c, extra, n))
        if best == 0:
            CHECKS["no_way_out"].append(a)

    print("\n## 2. 单一策略（帽子大牛，普通萝卜，无词条）")
    header("策略")
    for s in ("全顺从", "只顾自己", "甩锅"):
        print(row(s, *play(n, s, plain, "帽子大牛", []), n))

    print("\n## 2b. 三个目标（导师按卡池概率抽，普通萝卜，无词条，策略: " + MAIN + "）")
    header("目标")
    for goal in ("就业", "读博", "考公"):
        print(row(goal, *play(n * 2, MAIN, plain, traits=[], goal=goal), n * 2))
    print(row("选匹配度最高的", *play(n * 2, MAIN, plain, traits=[]), n * 2))
    print(row("选匹配度最低的", *play(n * 2, MAIN, plain, traits=[], right_goal=False), n * 2))

    print("\n## 3. 整体分布（导师按卡池概率抽，属性随机，策略: " + MAIN + "）")
    header("开局")
    print(row("无词条", *play(n * 3, MAIN, traits=[]), n * 3))
    print(row("随机 3 个词条", *play(n * 3, MAIN), n * 3))

    print("\n## 4. 单个词条的影响（导师按卡池概率抽，普通萝卜，策略: " + MAIN + "）")
    base, _ = play(n * 3, MAIN, plain, traits=[])
    win0 = 100 * (base["上岸"] + base["延毕上岸"]) / (n * 3)
    mad0 = 100 * base["发疯"] / (n * 3)
    print(f"基线: 上岸(含延毕上岸) {win0:.1f}%，发疯 {mad0:.1f}%\n")
    print("| 组 | 词条 | 上岸变化 | 发疯变化 | 备注 |")
    print("|---|---|---|---|---|")
    for group, names in TRAITS.items():
        for name in names:
            c, _ = play(n, MAIN, plain, traits=[name])
            win = 100 * (c["上岸"] + c["延毕上岸"]) / n - win0
            mad = 100 * c["发疯"] / n - mad0
            print(f"| {group} | {name} | {win:+.1f} | {mad:+.1f} | {NOT_SIMULATED.get(name, '')} |")

    # 数值越界由 Game.clamp 和 turn 里的 assert 保证，跑到这里说明没有越界
    print("\n## 检查")
    print("- 数值越界: 通过")
    ok_early = CHECKS["early"] == 0
    print(f"- 前 {P['safe_turns']} 回合内发疯或肄业: "
          + ("通过" if ok_early else f"失败，共 {CHECKS['early']} 局"))
    ok_way = not CHECKS["no_way_out"]
    print("- 每种导师至少有一种策略能上岸: "
          + ("通过" if ok_way else "失败: " + "; ".join(CHECKS["no_way_out"])))
    sys.exit(0 if ok_early and ok_way else 1)
