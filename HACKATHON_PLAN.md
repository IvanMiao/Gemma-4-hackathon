# Fault Capsule：Gemma 4 黑客松方案反思

## 真正需要证明的是什么？

这次活动是一日黑客松，公开列出的赛道是：

- `Edge / On-Device`
- `Autonomous Agents`
- `Context Engineering for SLMs`
- 跨赛道的 NVIDIA GPU Challenge

活动页面给出的核心要求不是构造一套完整工业平台，而是：

> Build something that actually works.

因此，方案不应继续追求同时覆盖所有赛道，而应该证明一个单一、可观察、可重复的命题：

> 在相同的模型、token budget 和工具预算下，将事故资料编译成结构化因果 Context，能否让小模型比原始文本或普通 retrieval 更准确地选择下一项安全诊断动作？

主攻赛道应为 **Context Engineering for SLMs**。`Edge` 和 `Agent` 是支撑这个命题的技术属性，而不是另外两组需要独立实现的功能。

活动页面：<https://luma.com/uypemayx>

已有讨论：<https://chatgpt.com/share/6a6471f1-e6b8-83eb-8dfb-2848a64ca877>

## 为什么从 Context Forge 转向 Fault Capsule？

最初的 `Context Forge` 更像一个底层技术概念：它可以处理任何数据、为任何用户构建 Context、完成任何任务。问题在于，越通用就越难回答以下问题：

- 谁会真正使用它？
- Context 为哪一个具体任务服务？
- Context Builder 做了什么，而不是偷偷调用更强模型？
- Context 改善是否能够客观测量？

`RepoPack` 曾尝试把问题收缩到本地 coding agent，但这个场景仍缺少说服力：代码本身已有 AST、LSP、`grep` 和成熟的 coding agent；失败也容易被归因于模型编码能力，而不是 Context。

`Fault Capsule` 找到了更合适的结构：

- 数据来源多，而且具有时间关系；
- 单次事故只需要全部资料中的很小一部分；
- 设备拓扑、近期维修、安全规则都影响下一步判断；
- 输出可以限制为可验证的诊断动作；
- 工业现场存在隐私、网络和本地部署需求。

这让我们联想到编译器：系统不是让模型阅读整个“源世界”，而是把当前事故编译成一个适合有限推理资源消费的中间表示。

## 当前 Fault Capsule 方案为什么仍然过大？

原计划同时包含：

- 工业故障模拟器；
- 15–20 种可注入故障；
- 遥测、维修记录、照片、手册和设备拓扑；
- 确定性数据处理；
- Gemma 4 Context Scout；
- Gemma 4 Diagnostician；
- 多轮 Agent 工具调用；
- Raw、RAG、Capsule benchmark；
- 可视化 UI；
- NVIDIA inference 优化。

这是一份完整产品蓝图，而不是一日黑客松的实现范围。当前仓库也还没有业务代码，因此继续增加功能会直接压缩真正建立基线、运行实验和排练 Demo 的时间。

### 问题一：Context 可能泄漏答案

如果 Context Builder 已经知道故障根因，并据此选择“传感器更换记录”和“更换后需要校准”的手册条目，那么 Gemma 只是复述被人工放进 Capsule 的答案。

Context Builder 必须只依赖与标签无关的通用规则，例如：

- 告警前后固定时间窗口；
- 当前设备的一跳拓扑邻居；
- 固定时间范围内的维修事件；
- 根据公开错误码进行检索；
- 对所有案例一致生效的安全规则。

### 问题二：Raw Dump 不是足够强的基线

Gemma 4 小模型支持很长的 Context。单纯证明 Capsule 使用更少 token，并不能证明它产生了更好的 Context。

真正公平的实验必须固定：

- 同一个 Gemma 4 variant；
- 相同输入 token 上限；
- 相同输出格式；
- 相同工具和工具调用次数；
- 相同推理参数或重复采样次数。

比较的不是“塞得下还是塞不下”，而是有限预算应当分配给哪些事实和关系。

### 问题三：Scout + Diagnostician 混淆了收益来源

两个 Gemma session 会使用更多推理计算。即使最终结果更好，也无法确定收益来自 Context，还是来自额外的一轮模型调用。

MVP 中应移除 `Context Scout`。Capsule 先由确定性程序构建，Gemma 只消费 Capsule 并选择动作。如果核心实验已经成立，再增加一个只负责自然语言归一化的 Scout，并把它作为独立 ablation（消融实验）。

### 问题四：安全叙事不能超过系统能力

Demo 使用的是合成事故和模拟工具，不能宣称系统能够安全地诊断或控制真实铁路设备。

更准确的定位是：

> 一个运行于故障模拟器中的 maintenance decision-support prototype。

模型不能直接控制设备，只能从白名单中选择下一项检查；所有输出都必须引用证据，并由人确认。

## 收缩后的产品定义

> Fault Capsule 将一次设备事故的遥测、维修变化、拓扑关系和安全规则编译成最小、可追溯的状态，使本地 Gemma 4 能够选择下一项诊断检查。

进一步压缩为一句 Pitch：

> Industrial systems produce more data than a small local model can reason over reliably. Fault Capsule compiles the current incident into the minimum causal state required to choose the next safe check.

这里最重要的词不是 `diagnose`，而是 **choose the next check**。系统不需要一次猜出根因，只需要在当前证据下选择信息增益最高且符合安全边界的下一步。

## MVP 的边界

只实现一个铁路道岔执行器，准备 6 个事故案例。每个案例只有 4 个允许的诊断动作，Agent 最多执行两轮动作。

暂不实现：

- 图片与音频；
- 通用知识图谱；
- 任意设备类型；
- 自由文本维修指令；
- 自动控制真实设备；
- 20 种以上故障；
- 多 Agent 协作；
- 多种 inference framework。

### 输入

```text
60 秒遥测
+ 一条当前告警
+ 近期维修记录
+ 一跳设备拓扑
+ 手册与安全规则
```

### Context Compiler

```text
固定事故时间窗口
        +
一跳拓扑扩展
        +
近期变更关联
        +
错误码检索
        +
安全约束注入
        ↓
INCIDENT_CAPSULE.json
```

`Context Compiler` 不读取案例的根因标签，也不调用更强模型。

### Capsule

```json
{
  "incident": {
    "asset": "SW-04",
    "alarm": "POSITION_MISMATCH",
    "command": "move_to_reverse",
    "observed_state": "unchanged"
  },
  "evidence": [
    {"id": "T-04", "fact": "motor current remained normal"},
    {"id": "T-07", "fact": "position feedback remained at 0%"},
    {"id": "M-02", "fact": "position sensor replaced two hours ago"},
    {"id": "R-07", "fact": "calibration is required after replacement"}
  ],
  "allowed_actions": [
    "inspect_connector",
    "measure_sensor_voltage",
    "run_sensor_calibration",
    "confirm_safety_lock"
  ],
  "forbidden_actions": [
    "repeat_actuation",
    "bypass_safety_interlock"
  ]
}
```

### Gemma 输出

```json
{
  "next_check": "run_sensor_calibration",
  "evidence_ids": ["T-04", "T-07", "M-02", "R-07"],
  "confidence": 0.84
}
```

这个结构强制模型做三件事：

- 只能从白名单中选择动作；
- 必须引用 Capsule 内的证据；
- 不得把未经验证的根因当成事实。

## Demo 应该如何形成因果闭环？

现场只演示一个案例：道岔收到切换命令，但位置反馈没有变化。

```text
位置反馈固定为 0
+ 电机电流正常
+ 两小时前更换位置传感器
        ↓
Gemma 选择 run_sensor_calibration
        ↓
模拟工具返回 calibration_offset = 18%
        ↓
Capsule V1 更新为 Capsule V2
        ↓
确认故障并完成模拟校准
        ↓
道岔由红色变为绿色
```

舞台上的核心视觉不是复杂知识图谱，而是同一模型在两种 Context 下产生不同结果：

```text
Raw / Retrieval     → incorrect or unsafe next check
Fault Capsule       → correct next check with evidence
```

## 如何避免一个为 Demo 定制的 benchmark？

至少比较三种 Context 方法：

| 方法 | 输入 |
|---|---|
| Raw | 原始资料按固定规则截断到 token budget |
| Retrieval | 使用 BM25 根据事故描述选择 top-k 文本 |
| Capsule | 时间窗口、拓扑、近期变化、错误码和安全约束 |

三种方法必须使用相同模型、相同 token budget 和相同输出 schema。

第一版只记录四个指标：

```text
Next-action accuracy
Unsafe-action rate
Input tokens
End-to-end latency
```

如果时间允许，再加入 `Direct Tool Agent`：给模型相同工具和总 token 预算，让它自行搜索资料。这个基线可以回答一个更尖锐的问题：为什么需要预先编译 Capsule，而不是让 Agent 自己找 Context？

6 个案例不能证明产品已经适用于工业环境，但足以证明 Context 机制是否值得继续研究。所有展示数字必须来自真实运行，不预先编造。

## Ollama 还是 Modal？

当前开发机已经安装 Ollama 客户端，但服务未运行；机器约有 14 GiB 内存，NVIDIA 驱动当前不可用。因此，本地运行可以作为离线备份，却不适合作为唯一的现场推理环境。

建议使用同一个 OpenAI-compatible inference client，通过 `base_url` 和 `model` 配置切换后端：

```text
Demo UI
   ↓
Inference Client
   ├── Modal + vLLM + Gemma 4 E4B   主环境
   └── Ollama + Gemma 4 E2B         离线备份
```

### 主环境：Modal + vLLM

选择 `Gemma 4 E4B`，保留 SLM 叙事。部署应在开发开始时完成，并提前缓存模型和编译产物；现场演示前主动预热 endpoint，避免冷启动。

Modal 的价值是：

- 当前机器没有可靠的本地 GPU；
- vLLM 可以形成 NVIDIA inference framework 的真实部署；
- benchmark 可以在固定 GPU 上重复运行；
- UI 只依赖一个稳定的 OpenAI-compatible endpoint。

但 NVIDIA Challenge 只能作为第二优先级。只有 Capsule 的正确性实验已经完成，才投入时间测量吞吐、TTFT 或 cache。

### 备用环境：Ollama

优先尝试较小的模型：

```text
gemma4:e2b-it-qat
gemma4:e2b
```

本地 Context 限制在实际需要的范围，例如 4K–8K，而不是因为模型宣称支持 128K 就直接扩大输入。Ollama 的意义是证明系统可以在断网时继续完成受限任务，并作为 Modal 不可用时的 Demo fallback。

不要为了同时适配两个 runtime 写两套业务逻辑。两者之间只能存在配置差异。

## 当天执行顺序

使用相对时间而不是假设尚未公布的活动日程：

| 阶段 | 交付物 |
|---|---|
| T+0:00–0:30 | 确认现场规则；跑通 Modal Gemma 4 E4B；验证结构化输出 |
| T+0:30–1:30 | 建立 6 个事故 fixture、动作标签和统一 schema |
| T+1:30–3:00 | 实现 Raw、BM25、Capsule 三种 Context pipeline |
| T+3:00–4:00 | 运行第一轮 benchmark，修正数据泄漏和输出错误 |
| T+4:00–5:30 | 实现单案例 Demo UI 与两轮工具闭环 |
| T+5:30–6:30 | 完成全量实验和可视化结果 |
| 最后 90 分钟 | Freeze 功能；README、提交材料、Pitch 和离线备份 |

Go / No-Go 节点：

- T+0:30 仍无法稳定调用 Modal：立即切换其他可用 endpoint，不继续调基础设施。
- T+3:00 Capsule 没有优于基线：检查 benchmark 泄漏与任务定义，不先做 UI。
- T+5:30 核心闭环未完成：取消 NVIDIA 优化和额外案例。

## 当前决策

保留：

- `Fault Capsule` 名称；
- 铁路道岔事故；
- 下一项诊断检查；
- 动态 Capsule；
- Context 对照实验；
- Modal 主环境、Ollama 备份。

删除或延后：

- Context Scout；
- 图片、音频和通用多模态；
- 20 个故障；
- 自动维修；
- 通用工业平台；
- 在核心实验完成前进行 NVIDIA 调优。

最终只需要证明：

> Context 不是被检索出来的几段文字，而是在固定资源预算下，为下一项决策编译出的最小因果状态。

## 补充 (1): 这个痛点是真实存在的吗？

先把问题拆开。真实存在的未必是“工业现场缺一个聊天机器人”，而可能是下面这条更具体的链路：

```text
事故发生
  ↓
工程师在多个系统中寻找相关事件
  ↓
判断哪些信号属于同一次故障
  ↓
结合设备关系、历史变化与专家知识
  ↓
选择下一项检查
```

这条链路有相当直接的行业和研究证据。

### 列车事故诊断至今仍依赖人工阅读事件序列

2024 年一项与比利时铁路运营数据相关的研究已经将事故诊断建议部署到生产环境。论文描述的原始工作流是：事故发生后，维护专家需要人工阅读事件 trace；单个事件通常不足以解释事故，真正有意义的是事件集合及其上下文。一个约 300 辆车的车队每天产生约 30 万个事件，而每月有约 50–100 个达到研究标准的事故。

更关键的是，该研究发现：**时间窗口扩大后，分类 `F1` 反而下降**。离事故越远的事件越可能增加噪声，时间位置本身也是 Context 的一部分。这几乎直接验证了 Fault Capsule 的基础命题：更多 Context 不一定更好，正确的时间窗口和事件组合更重要。

来源：[Augmenting train maintenance technicians with automated incident diagnostic suggestions](https://arxiv.org/abs/2408.10288)

### 道岔诊断确实需要跨数据源关联

Nottingham 的 Network Rail 相关研究从三个不同数据库中提取信息：

- `IIMS`：电流测量；
- `FMS`：维修与调整记录；
- `Ellipse`：设备型号、ID 以及连接前两类数据所需的资产信息。

这说明“遥测 + 维修历史 + 资产元数据”不是为了 Demo 临时拼出的输入结构，而是实际存在的数据边界。

来源：[Fault Diagnostics of Railway Point Machines](https://www.nottingham.ac.uk/research/groups/ntec/documents/projects/marius-vileiniskis-poster-nov-2012.pdf)

德国航空航天中心 `DLR` 与 Strukton Rail 的研究进一步指出，道岔领域缺少大规模、完整的标注数据；仅依靠测量曲线通常只能区分少数故障症状。研究因此使用专家知识、当前曲线特征、历史维修动作等多种证据构建 Bayesian network，为维护工程师提供根因概率排序。

来源：[Expert system based fault diagnosis for railway point machines](https://elib.dlr.de/189682/)

这让问题的本质更清楚了：

> 痛点不只是“日志太多”，而是信息分散、时间相关、标注稀缺，并且需要把统计信号与专家知识放入同一次决策。

### 故障恢复与资产数据确实影响铁路运营

Network Rail 说明，大多数 points 已被远程监测，故障会让信号自动进入 fail-safe 状态，并造成运营中断。英国 `ORR` 对 HS1 的评估还指出，首次出现的事故往往恢复较慢，原因包括恢复方案缺少演练，以及多个资产所有者之间的接口复杂。

同一份评估中，一个包含 maintainer training、日常 points swing 和更多 remote monitoring 的综合韧性计划，使相关 delay minutes 同比下降 91%。这个数字不能归因于某一个 AI 工具，但它说明**更好的监测、训练和维护决策确实能产生运营价值**。

来源：

- [Network Rail: Signals and points failure](https://www.networkrail.co.uk/rail-travel/delays-explained/signals-and-points-failure/)
- [ORR: London St. Pancras Highspeed asset management 2024–2025](https://www.orr.gov.uk/annual-report-london-st-pancras-highspeed-2024-2025/asset-management)

### 当前结论

真实痛点成立，而且比原计划的描述更精确：

> 维护人员需要从大量、分散且具有时间关系的证据中快速形成一个可解释的事故状态。

但“位置传感器更换后未校准”这个具体故事目前仍是合成案例，不能把它包装成已经从铁路现场验证的常见故障。如果希望提高可信度，Demo 可以改用公开文献反复出现的故障类型，例如：

- obstruction（阻塞）；
- friction（摩擦异常）；
- power-source issue；
- misalignment（机械偏移）；
- 维修或调整后的异常行为。

## 补充 (2): 市场上已经有什么？

答案是：**已经有很多相邻产品，而且部分产品与 Fault Capsule 高度重叠。**

| 产品 | 已覆盖的能力 | 对 Fault Capsule 的含义 |
|---|---|---|
| [Siemens Industrial Copilot for Operations](https://www.siemens.com/en-gb/company/insights/generative-ai-industrial-copilot/) | 面向维修工程师进行设备 troubleshooting，结合静态与动态机器数据给出说明和建议，并可把事故上下文带入工单 | “工业维护 Copilot”本身不是新产品类别 |
| [IBM Maximo Assistant](https://www.ibm.com/docs/en/masv-and-l/maximo-manage/cd?topic=managing-using-ai-assistant) | 查询资产、工单、condition insight 和文档，帮助用户做决策 | 已经覆盖资产 Context 与维护问答；但 Mobile 当前不支持 disconnected mode |
| [ABB Genix APM Copilot](https://www.abb.com/global/en/company/innovation/news/genix-asset-performance-management) | 将 analytical AI、physics model、sensor analytics 与 generative AI 结合；支持 contextual insight、root-cause investigation 和工作流执行 | 与 Fault Capsule 的 hybrid architecture 非常接近，而且支持 cloud、hybrid、on-premises edge |
| [Augury Machine Health](https://www.augury.com/machine-health/) | 连续传感、故障诊断、维修指导、CMMS/EAM 工单集成，并由专家复核 | 已经能回答“哪里坏、何时处理、做什么”；竞争优势来自数据和专家网络，不只是模型 |
| [Siemens Railigent X](https://www.mobility.siemens.com/uk/en/portfolio/digital-solutions-software/digital-services/railigent-x.html) | 聚合铁路资产运行和状态数据，分析资产并导出维护行动 | 铁路资产数据平台已有成熟供应商 |
| [Alstom HealthHub](https://www.alstom.com/alstom-customer-portal-esupport) | 持续监控铁路资产，提供 condition-based 与 predictive maintenance | Fault Capsule 不能把自己描述成第一个铁路预测维护系统 |
| [Hitachi Rail HMAX](https://www.hitachirail.com/products-and-solutions/digital-asset-management/hmax-for-infrastructure/) | 用传感器、机器学习以及 edge-to-cloud AI 监测轨道、接触网等基础设施 | Edge + railway AI 也不是新的组合 |

此外，`context compiler` 和 `incident capsule` 这两个产品隐喻已经开始在其他领域出现：

- [IncidentIQ](https://incidentiq.ai/) 为 SRE incident 构建按时间排列的 evidence capsule；
- [Calyra](https://www.calyra.dev/home) 将多源医疗数据编译成可审计、受 size budget 约束的 Context bundle；
- [Collibra Context Compiler](https://www.collibra.com/blog/a-single-governed-source-of-truth-for-every-ai-agent-and-platform-introducing-collibra-s) 为企业 Agent 提供受治理的结构化 Context。

这意味着 Context compilation 是一个正在形成的产品模式，但并非尚未被发现的概念。

### 产品空白究竟在哪里？

不能声称：

> 市面上没有工业诊断 Copilot。

也不能声称：

> 没有能在 on-premises edge 运行的工业 AI。

ABB 已经明确覆盖这两点。更可信的差异是：

1. **Context 是独立 artifact**：可以检查、版本控制、回放和比较，而不是隐藏在 vendor pipeline 中。
2. **对 SLM 有明确 token budget**：目标不是接入最大的模型，而是在固定资源下最大化决策质量。
3. **Context 自身可评估**：对 Raw、retrieval、Capsule 做同模型、同预算对照。
4. **只做 next-check decision**：不试图替代完整的 APM、CMMS 或 predictive maintenance 平台。
5. **开放 runtime**：同一个 artifact 可以交给 Gemma 4、其他本地模型或测试 harness。

因此，Fault Capsule 更适合被定位为：

> 面向 OT/maintenance AI 团队的 incident-context middleware 与 evaluation harness。

它不应被定位为另一套完整资产管理平台。

## 补充 (3): 这个场景真的需要本地模型吗？

答案不是简单的“是”，而是：**在部分 OT 环境中成立，但更准确的形态是 site-edge / on-premises，而不是把模型塞进每台设备。**

### 支持本地运行的证据

`NIST SP 800-82` 将交通系统包含在 OT 范围内，并强调 OT 特有的 performance、reliability 和 safety 要求。Microsoft 对 industrial edge 的说明也把以下情况列为 edge-connected architecture 的直接适用条件：

- 使用 `OPC UA` 等本地工业协议；
- 需要低延迟现场处理；
- 安全策略禁止设备直接连接公网。

ABB 已经允许 Genix APM Copilot 部署在 on-premises edge。这至少说明客户确实存在这种 IT/OT deployment requirement，而不是黑客松想象出来的需求。

来源：

- [NIST SP 800-82 Rev. 3](https://csrc.nist.gov/pubs/sp/800/82/r3/final)
- [Microsoft: Introduction to Azure IoT](https://learn.microsoft.com/en-ca/azure/iot/iot-introduction)
- [ABB Genix APM Copilot](https://www.abb.com/global/en/company/innovation/news/genix-asset-performance-management)

### 反证：铁路诊断并不天然要求本地 LLM

同样存在很强的反例：

- 上述比利时列车诊断系统部署在 cloud platform，并把结果推送到手机、平板和电脑；
- Railigent X 使用 cloud technology 汇集列车数据；
- IBM Maximo Assistant 当前不支持 disconnected mode，但依然是正式产品；
- Network Rail 的大量 points 已经通过集中式系统进行 remote monitoring。

这说明很多运营商愿意在有治理的企业网络中使用 cloud 或 hybrid system。只要任务不是毫秒级闭环控制，几百毫秒甚至数秒的网络往返通常不是决定性障碍。

因此，不应把本地部署的价值描述成：

> 工业数据绝对不能上云，所以只能本地。

更准确的说法是：

> 对于 air-gapped、网络不稳定、禁止 OT data egress 或需要离线连续运行的站点，site-local inference 是必要 deployment option；其他站点可以使用 hybrid 或 cloud。

### 最合理的部署位置

```text
错误理解：每个传感器 / 道岔执行器里运行一个 Gemma

更现实：
传感器与 PLC
    ↓ local industrial protocol
站点或控制室 edge server
    ├── deterministic analytics
    ├── Context Compiler
    └── Gemma 4 E2B / E4B
    ↓ optional sync
central cloud / fleet analytics
```

这既保留离线能力，又避免在每个受限设备上维护模型。换句话说，这里的 `local` 应定义为 **data-local**，不必定义成 device-local。

### Modal 与“本地模型”叙事是否矛盾？

作为黑客松开发和 benchmark 环境，Modal 不矛盾：它可以稳定托管同一 open-weight Gemma variant，并通过 vLLM 记录性能。但如果现场 Pitch 声称系统已经 on-device，而实际 Demo 只调用 Modal，这会削弱可信度。

更诚实的展示方式是：

- Modal/vLLM：主 Demo 与可重复 benchmark；
- Ollama/E2B：证明同一 artifact 可以在离线、资源受限 runtime 中运行；
- 不把 Modal 延迟冒充 edge latency；
- 分别报告 cloud GPU 与本机 CPU/GPU 的真实结果。

## 补充 (4): 这个任务真的需要语言模型吗？

这是比“是否本地”更危险的问题。

如果输入全是结构化传感器数据，输出只是四个故障类别之一，那么传统 classifier、Bayesian network 或 rule engine 通常更便宜、更稳定，也更容易认证。前述铁路研究已经证明：

- 简单的 feature engineering + classifier 可以在生产中给出事故类别建议；
- Bayesian network 可以结合专家知识和维修历史；
- 道岔 health indicator 可以从 58 台设备、两年、176 万条 current curve 中构建，并保持可解释性。

来源：[Robust health indicator and rankings for railway point machines using motor current curves](https://academic.oup.com/iti/article/doi/10.1093/iti/liag005/8661800)

因此，Gemma 不应该负责：

- 从原始电流曲线中检测异常；
- 替代 signal-processing model；
- 直接控制设备；
- 在没有证据时自由生成维修动作。

Gemma 的合理职责是处理传统模型不擅长的边界：

- 理解非结构化维修记录；
- 将不同文档中的设备别名归一化；
- 组合结构化异常、手册规则与自然语言说明；
- 从白名单中选择下一项工具；
- 给出引用 evidence ID 的人类可读解释；
- 在多轮检查后更新 incident state。

这与 ABB 公布的 architecture 很接近：analytical AI、physics-based model 和 sensor analytics 负责预测与诊断信号，generative AI 负责 contextualization 和交互。

最终 architecture 应是 hybrid，而不是“LLM 读取所有原始遥测”：

```text
signal processing / rules / specialist ML
                  ↓ anomaly facts
deterministic Context Compiler
                  ↓ Incident Capsule
Gemma 4 constrained decision + explanation
```

### SLM 是否足够仍然是待验证假设

Gemma 4 E2B/E4B 支持 structured tool use、multimodal input 和 128K Context，但官方 model card 同时明确提醒：开放式复杂任务、事实准确性和常识仍有限制。

来源：[Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4)

从任务结构看，小模型可能适合：候选动作少、证据结构化、领域边界固定、无需世界知识。然而“可能适合”不等于已经证明。

需要增加两个对照：

1. `Rule/Bayesian baseline`：验证语言模型是否真的增加价值；
2. `Gemma E2B vs E4B vs larger reference`：验证 Context 是否让小模型接近更大模型，而不是所有模型一起失败。

如果 deterministic baseline 已经稳定达到 100%，就不应该硬塞 Gemma。此时应调整任务，让非结构化维修记录、手册冲突或跨源别名真正成为决策的一部分。

## 补充 (5): 调查后的产品定位

### 谁是用户，谁是购买或集成者？

直接用户：

- 现场 maintenance technician；
- control-room operator；
- reliability engineer。

真正的部署与购买决策者：

- OT/IT platform team；
- asset management team；
- maintenance software vendor 或 system integrator。

因此，UI 中的推荐面向 technician，但产品价值主张应面向负责集成、治理和评估 AI 的团队。

### 它不是哪一类产品？

- 不是完整 `APM`；
- 不是新的 `CMMS`；
- 不是通用工业 Copilot；
- 不是 predictive maintenance sensor platform；
- 不是 safety-certified controller。

### 它是什么？

> Fault Capsule is an auditable incident-context compiler and evaluation layer for small, site-local maintenance models.

它的最小产品边界是：

```text
connectors / fixture data
        ↓
generic context-selection policy
        ↓
versioned Incident Capsule
        ↓
local SLM adapter
        ↓
decision trace + benchmark
```

这一定义不与 Siemens、IBM、ABB 正面竞争完整工作流，而是把重点放在一个它们公开产品页面很少暴露的工程问题上：**究竟给本地小模型什么 Context，以及如何证明这个 Context 更好。**

不能据此断言这些厂商内部没有类似机制；这里只能说这是一个适合公开演示和评估的差异点。

## 补充 (6): 最终判断与剩余验证

| 问题 | 判断 | 置信度 |
|---|---|---|
| 维护人员是否面临多源、时序化事故信息？ | 是，研究与真实系统均有直接证据 | 高 |
| 选择 Context 是否比无限增加 Context 更重要？ | 是，生产研究中更长时间窗口反而降低 `F1` | 高 |
| 铁路 points 是否是有运营价值的维护对象？ | 是，故障、远程监测和 delay impact 均有官方证据 | 高 |
| 工业诊断 Copilot 是否是市场空白？ | 否，已有大量成熟或正在商业化的产品 | 高 |
| on-premises / edge 是否是真需求？ | 是，但只对部分站点是硬要求 | 高 |
| 是否必须 device-local？ | 否，site-edge 或 hybrid 更现实 | 高 |
| Gemma 4 E2B/E4B 是否足以完成任务？ | 技术上可行，但领域正确率尚未验证 | 中低 |
| Fault Capsule 是否适合黑客松？ | 是，前提是定位为 Context mechanism + benchmark | 高 |
| 是否已经形成独立创业产品机会？ | 尚不能判断；与 incumbent 重叠明显 | 中低 |

调查后的核心结论是：

> 这是一个真实痛点上的新技术切面，而不是一个没人做过的新产品类别。

它适合黑客松，因为 Context Engineering 的机制清楚、对照实验可做、Gemma 的角色可以被严格限制。它是否适合成为产品，则取决于能否从真实用户处证明：现有 APM/Copilot 在断网、数据治理、跨系统 Context 或小模型部署上仍留下了足够大的缺口。

### 最低成本的用户验证

在继续开发前，向至少一名维护或 reliability 从业者问五个问题：

1. 一次告警发生后，你通常需要打开哪些系统或资料？
2. 找到相关维修历史、手册和信号通常需要多久？
3. 最常见的错误第一步来自信息缺失、信息过载，还是经验不足？
4. 现场是否允许把遥测、工单或手册发送到外部 cloud service？
5. 一个只推荐“下一项检查”且提供证据引用的工具，在哪些情况下有价值或完全没用？

在得到回答前，应把“真实用户痛点”标记为 **evidence-supported but not user-validated**。

### 对 MVP 的最后修正

研究没有推翻 MVP，但要求增加三条纪律：

- 加入一个 deterministic / Bayesian baseline，回答“为什么需要 LLM”；
- 至少包含一条真正影响决策的非结构化维修记录或手册冲突，回答“为什么不是普通 classifier”；
- 把 local 定义为 site-edge deployment option，回答“为什么不是虚假的 on-device 故事”。

如果只能保留一个研究亮点，应展示这条曲线：

```text
Context window grows
        ↓
irrelevant historical events grow
        ↓
decision quality falls
        ↓
Fault Capsule selects the causal window
```

它比“18K token 压缩到 2K token”更有说服力，因为它证明 Context Engineering 改变的不只是成本，还有正确性。
