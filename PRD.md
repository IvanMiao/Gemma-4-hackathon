# Fault Capsule — 中英双语产品需求文档 / Bilingual Product Requirements Document

| 项目 / Item | 内容 / Value |
|---|---|
| 状态 / Status | Draft for hackathon implementation |
| 目标活动 / Target | Paris Gemma 4 Hackathon |
| 主赛道 / Primary track | Context Engineering for SLMs |
| 辅助属性 / Supporting attributes | Autonomous Agent; Edge / On-Device |
| MVP 场景 / MVP scenario | 合成铁路道岔执行器事故 / Synthetic railway point-machine incidents |
| 产品性质 / Product type | 维护决策支持原型，不是安全认证控制器 / Maintenance decision-support prototype, not a safety-certified controller |

---

# 中文版

## 问题陈述

工业设备发生故障后，维护人员通常需要跨越遥测系统、告警记录、维修工单、设备拓扑、手册和安全规则，重建“当前到底发生了什么”。这些信息不仅分散，而且有时间关系；更多上下文不一定更好，过长的历史记录反而可能遮蔽与当前事故有关的变化。

现有工业 APM、CMMS 和 Copilot 已经覆盖资产监控、诊断和工作流，因此市场问题不是“缺少一个工业聊天机器人”。更具体的问题是：负责部署维护 AI 的团队缺少一种可检查、可版本化、可回放和可量化比较的机制，用来决定在固定 token、延迟与计算预算下，应该向站点本地小模型提供哪些事故事实。

在铁路道岔 MVP 中，模型不应直接分析全部原始电流曲线，也不应自动控制设备。它需要在遥测异常、近期维修变化、邻接设备关系、手册规则和安全限制之间进行有限推理，并从白名单中选择下一项安全检查。当前痛点有行业证据支持，但尚未经过直接用户访谈验证；演示事故也是合成案例。

## 解决方案

Fault Capsule 是一个可审计的事故上下文编译器和评估层。它使用与故障标签无关的确定性规则，将一次事故的多源资料编译成最小、可追溯、版本化的 `Incident Capsule`，再交给 Gemma 4 选择下一项诊断检查。

核心流程如下：

```text
本地事故数据
  → 确定性 Context Compiler
  → Incident Capsule V1
  → Gemma 4 受约束决策
  → 模拟检查工具
  → Incident Capsule V2
  → 下一项检查或停止并请求人工处理
```

当本地资料不足时，系统可以进入受控的外部证据升级流程：

- Alien Intelligence 通过 MCP 提供有授权、可追踪的专业内容；
- SerpAPI 搜索厂商、监管机构或其他白名单域名中的公开资料；
- 如果现场能力允许，可由 Alien API Bridge 将 SerpAPI 暴露为 MCP 工具；否则使用独立 SerpAPI adapter；
- 外部返回内容必须先被归一化为带来源和信任等级的证据，再进入新的 Capsule；
- 原始遥测和维修记录不得发送给外部服务；只允许发送经过最小化处理的设备类型、公开错误码和信息需求；
- 无网络时核心事故流程仍然可用，因此产品定位为 `local-first / hybrid`，而不是完全离线。

Gemma 4 只负责非结构化信息理解、跨来源证据组合、白名单动作选择和引用式解释。信号处理、时间窗口选择、拓扑扩展、安全策略和动作执行均由确定性模块负责。

## 产品目标与成功标准

### 产品目标

1. 证明结构化的因果事故上下文能够在相同模型和资源预算下改善下一项检查的选择。
2. 展示 Context 是独立 artifact，可以被查看、比较、版本化和回放。
3. 展示小型开放权重模型可以在受约束的 site-edge 场景中承担有限的维护决策支持任务。
4. 展示外部 Agent 工具只在本地证据不足时被调用，并且所有外部证据都可追溯。
5. 产出一套可以诚实呈现正面或负面实验结果的 benchmark，而不是只优化单个演示案例。

### MVP 成功标准

- 使用 Gemma 4 完成一个从告警、Capsule V1、工具检查、Capsule V2 到下一项检查的两轮现场演示。
- 实现 6 个合成事故案例；每个案例最多 4 个允许动作、2 轮检查。
- 所有模型输出都符合统一 schema，动作来自白名单，证据 ID 可以在当前 Capsule 中解析。
- 演示路径不产生禁止动作；所有执行动作都需要显式的人机确认或模拟器确认。
- Context Compiler 不读取根因标签，也不调用语言模型。
- Raw、BM25 Retrieval 和 Capsule 三种方法能够在同一模型、输入上限、输出 schema 和工具预算下重复运行。
- benchmark 至少报告下一动作正确率、不安全动作率、输入 token 和端到端延迟。
- 外部证据的来源、URL、提供方、检索时间和信任等级完整记录。
- 断开 Alien 和 SerpAPI 后，核心本地案例仍可运行；需要外部证据的案例应明确降级为 `insufficient_evidence`，而不是编造答案。

## 用户故事

1. 作为现场维护技术员，我希望看到与当前告警直接相关的最小证据集，以便不必在多个系统中手工拼接事故经过。
2. 作为现场维护技术员，我希望系统只推荐白名单中的下一项检查，以便建议保持在已定义的操作边界内。
3. 作为现场维护技术员，我希望每项建议都引用具体证据 ID，以便快速判断建议是否有依据。
4. 作为现场维护技术员，我希望看到事件的时间顺序和近期维修变化，以便发现事故前后的因果线索。
5. 作为现场维护技术员，我希望在证据不足时看到明确的“不足以判断”，以便不会把模型猜测当作事实。
6. 作为控制室操作员，我希望所有可能改变设备状态的动作都需要人工确认，以便模型不能直接控制真实设备。
7. 作为控制室操作员，我希望安全规则和禁止动作始终显示在决策记录中，以便能够审查系统是否遵守操作限制。
8. 作为可靠性工程师，我希望在模拟检查返回新结果后生成新的 Capsule 版本，以便比较决策如何随证据变化。
9. 作为可靠性工程师，我希望回放同一事故及其所有 Capsule 版本，以便复盘错误决策和完善 Context policy。
10. 作为可靠性工程师，我希望比较 Raw、Retrieval 和 Capsule 方法，以便确认收益来自 Context 选择，而不是模型或额外计算。
11. 作为 OT/IT 平台工程师，我希望原始遥测和内部维修记录默认留在站点内，以便满足数据治理和网络边界要求。
12. 作为 OT/IT 平台工程师，我希望通过配置切换 Modal/vLLM 与 Ollama，而无需修改业务逻辑，以便兼顾稳定 benchmark 和本地运行。
13. 作为 OT/IT 平台工程师，我希望外部查询只包含最小必要信息，以便降低敏感 OT 数据外泄风险。
14. 作为 OT/IT 平台工程师，我希望每个外部 provider 都有超时、空结果和不可用 fallback，以便第三方服务失败不会阻塞核心流程。
15. 作为 AI 工程师，我希望 Context Compiler 使用固定时间窗口、一跳拓扑、近期变化、错误码和安全规则，以便选择策略可以独立测试。
16. 作为 AI 工程师，我希望编译器无法访问 benchmark 根因标签，以便防止答案泄漏。
17. 作为 AI 工程师，我希望 Gemma 输出严格结构化，以便无效输出可以被拒绝、重试或记录。
18. 作为 AI 工程师，我希望系统把模型提出的信息需求与实际查询构造分开，以便限制任意搜索和 prompt injection 风险。
19. 作为 AI 工程师，我希望 Alien 返回的专业内容被保留授权和来源信息，以便所有外部证据都可审计。
20. 作为 AI 工程师，我希望 SerpAPI 只搜索白名单域名，并把结果归一化后再提供给模型，以便降低低质量网页对安全决策的影响。
21. 作为 AI 工程师，我希望在没有 Alien 账号或数据集不匹配时使用本地 fixture provider，以便 beta 服务不会阻塞演示。
22. 作为评委，我希望看到同一个 Gemma 模型在不同 Context 方法下的并排结果，以便直接理解项目的核心创新。
23. 作为评委，我希望看到真实运行生成的准确率、风险、token 和延迟数据，以便区分可重复实验与精心挑选的 Demo。
24. 作为评委，我希望看到系统只在确实缺少资料时调用 Alien 或 SerpAPI，以便确认 Agent 行为受到约束且具有成本意识。
25. 作为项目维护者，我希望导出每次运行的输入、Capsule、模型输出、工具调用和评分，以便在 Kaggle write-up 和后续实验中复现结果。

## 实现决策

### 1. 事故数据与模拟器

- MVP 只覆盖一种资产：铁路道岔执行器。
- 数据集包含 6 个合成事故 fixture，覆盖遥测、当前告警、近期维修记录、一跳拓扑、手册条目与安全规则。
- 每个案例定义期望的下一项检查、允许动作、禁止动作和最多两轮模拟工具结果。
- 根因标签只供 scorer 使用，不进入任何 Context pipeline。
- 至少一个案例必须让非结构化维修记录或手册冲突真正影响答案，以证明任务不只是结构化分类。

### 2. Context Compiler 深模块

- Context Compiler 是项目的核心深模块：它以稳定的小接口封装时间切片、拓扑扩展、近期变更关联、错误码检索、安全规则注入、token budgeting 和证据排序。
- 编译策略必须对所有案例一致，不能包含针对某个 fixture 的故障规则。
- 编译结果是不可变、带版本号的 Incident Capsule。
- Capsule 包含事故摘要、证据、来源、时间关系、允许动作、禁止动作、缺失信息和版本元数据。
- 更新 Capsule 时保留父版本引用，使工具结果与决策变化可以回放。

### 3. Evidence Provider 深模块

- 所有证据来源实现统一 provider contract，使本地语料、Alien MCP 和 SerpAPI 可以独立替换、禁用和模拟。
- Local provider 负责内部手册、维修记录和 fixture 数据，是默认且离线可用的来源。
- Alien provider 负责查询现场账号允许访问的专业内容，并保留内容归属、授权或计量元数据。
- SerpAPI provider 负责公开网页检索，只允许厂商、监管机构和预先批准的技术来源。
- 如果 Alien API Bridge 在现场可用，优先把 SerpAPI 包装为 MCP 工具；否则直接调用 SerpAPI，但保持相同内部 contract。
- Alien 当前处于 limited-access beta，且其可用数据集未确认包含铁路维护内容，因此必须提供 fixture fallback，不把它放在关键演示路径上。

### 4. 外部证据策略

- 系统始终先查询本地 Capsule；只有缺少完成下一决策所需的明确事实时才允许外部调用。
- Gemma 只能输出结构化的信息需求；确定性 router 决定 provider、白名单域名、查询词和调用预算。
- 默认每轮最多一次外部查询，整个事故最多两次。
- 外部结果不会直接成为动作。它先被转换成证据记录，再重新编译 Capsule 并重新推理。
- 每条外部证据至少包含证据 ID、事实、来源类型、原始 URL、provider、检索时间、文档时间、信任等级和授权信息（如适用）。
- 外部内容不能覆盖本地安全规则、扩展动作白名单或触发自动设备控制。
- 外部调用不可用时返回明确的降级状态，不允许静默切换到无来源生成。

### 5. Gemma 决策引擎

- 使用一个 Gemma session 消费 Capsule；MVP 不使用额外 Context Scout，避免把额外推理计算误认为 Context 收益。
- 模型只能选择允许动作、请求一项缺失证据，或返回 `insufficient_evidence`。
- 输出包含下一项检查、引用证据 ID、置信度和简短理由。
- schema 校验失败时只允许一次确定性修复或重试；仍失败则记录为无效输出。
- 模型不得从原始遥测生成信号特征，也不得直接执行控制命令。

### 6. 推理运行时

- 业务层依赖统一的 OpenAI-compatible inference contract。
- Modal + vLLM + Gemma 4 E4B 是稳定 Demo 和 benchmark 的主环境。
- Ollama + 较小 Gemma 4 variant 是 site-local/offline 备份。
- 两个环境分别报告模型、量化、硬件、token 和延迟，不能把 Modal 测量结果描述成 edge 性能。

### 7. 演示界面

- 界面只服务一个主故事：道岔收到切换命令，但位置反馈未变化。
- 主视图显示原始事故时间线、当前 Capsule、Gemma 决策、证据引用、安全边界和版本变化。
- 对比视图并排显示 Raw/Retrieval 与 Capsule 的输出差异。
- 外部调用必须显式显示 provider、查询原因、发送出去的字段和返回来源。
- 演示成功不依赖复杂图形、通用聊天界面或真实设备连接。

### 8. Benchmark Harness 深模块

- 核心比较包括 Deterministic/Rule baseline、Raw、BM25 Retrieval 和 Capsule。
- 可选比较包括 Direct Tool Agent，以及 Gemma E2B、E4B 和更大参考模型。
- 所有 Context 方法使用相同模型版本、推理参数、最大输入预算、输出 schema、案例顺序和工具预算。
- 主 Context benchmark 禁止所有外部 API，以隔离 Context Compiler 的因果贡献。
- 单独的 enrichment benchmark 使用最多两个资料缺失的案例变体，比较 Capsule only、Capsule + Alien、Capsule + SerpAPI 和 Capsule + both。
- benchmark 保存逐案例原始结果，不只保存汇总均值。

### 9. 可观察性与审计

- 每次运行生成唯一 run ID，并记录模型配置、Context 方法、token 使用、延迟、输出校验、工具调用和 scorer 结果。
- 所有 Capsule 和决策 trace 可以导出，用于 Kaggle write-up、公开仓库和现场演示。
- API key 只通过环境变量或 secret 管理，不进入日志、Capsule 或公开提交物。

## 测试决策

好的测试只验证外部可观察行为和不变量，不绑定函数内部实现或特定 prompt 文本。由于仓库当前没有业务代码和既有测试，MVP 将从 fixture-driven contract test 开始。

### 必测模块

- Context Compiler：相同输入产生相同 Capsule；时间窗口、拓扑和近期维修规则正确；无法读取根因标签；遵守 token budget。
- Safety Policy：禁止动作永远不会进入可执行白名单；外部证据不能覆盖本地安全规则。
- Capsule Schema：版本、证据引用、来源和动作字段完整；无效引用被拒绝。
- Evidence Normalizer：Alien、SerpAPI 和本地 fixture 被转换成相同证据结构；不可信或缺失来源的记录被拒绝或降级。
- External Query Router：只有明确的信息缺口才能触发调用；查询字段经过最小化；域名白名单和调用预算生效。
- Gemma Adapter：两种推理后端返回相同内部输出结构；超时、无效 JSON 和不可用模型得到明确错误。
- Incident Simulator：每个允许动作返回固定、可复现的检查结果；两轮上限生效。
- Benchmark Scorer：正确动作、禁止动作、引用有效性、token 和延迟计算一致。

### 集成与端到端测试

- 完整运行一个事故，从 fixture 到 Capsule V1、Gemma 决策、模拟检查、Capsule V2 和最终建议。
- 在完全相同的案例与模型配置下运行 Raw、Retrieval 和 Capsule，并验证预算约束一致。
- 禁用网络后运行本地案例，验证不会隐式调用外部 provider。
- 模拟 Alien/SerpAPI 超时、空结果、限流和无效 payload，验证系统安全降级。
- 注入包含 prompt injection 文本的网页摘要，验证其只能作为不可信证据，不能修改系统规则或动作白名单。
- 重放已保存 run，验证 scorer 输出可复现。

### Benchmark 统计规则

- 至少报告逐案例结果和宏平均值，不用单个成功案例代替整体结果。
- 如果采样不是确定性的，每个模型与方法组合使用固定随机种子进行多次运行，并披露重复次数。
- 不删除失败运行；无效 schema、超时和拒答都进入结果表。
- Capsule 未优于基线时保留结果，并把结论表述为当前策略未被验证。

## 非目标

- 连接或控制真实铁路设备。
- 声称系统已经通过铁路、工业或功能安全认证。
- 构建完整 APM、CMMS、预测维护平台或通用工业 Copilot。
- 从原始高频电流曲线完成异常检测或剩余寿命预测。
- 支持铁路道岔之外的任意资产类型。
- 自动生成自由文本维修指令或绕过人工确认。
- 构建通用知识图谱、多 Agent 协作或自主维修系统。
- 在 MVP 中处理图片、视频或音频。
- 上传真实敏感 OT 数据到 Alien、SerpAPI、Modal 或其他外部服务。
- 微调 Gemma、训练新的故障分类模型或建立生产级数据管道。
- 证明 Fault Capsule 已经形成独立创业机会或优于现有商业 APM 产品。
- 以 6 个合成案例证明真实工业准确率、可靠性或安全性。
- 在核心 benchmark 完成前优化 NVIDIA 吞吐、缓存或复杂 UI。

## 补充说明

### 关键风险与缓解

| 风险 | 缓解措施 |
|---|---|
| 合成案例不代表真实工作流 | 明确标注原型；在继续产品化前访谈至少一名维护或 reliability 从业者 |
| Capsule 人为泄漏答案 | 编译器禁止访问标签；使用全局通用规则；公开逐案例 Capsule |
| deterministic baseline 已经达到满分 | 增加真正影响决策的非结构化维修记录、别名或手册冲突；不强行宣称需要 LLM |
| Alien 数据集不包含相关铁路内容 | 在活动开始时检查 catalog；保留本地 fixture provider；不让 Alien 成为关键路径 |
| SerpAPI 返回低质量或恶意网页 | 域名白名单、来源分级、内容归一化、安全规则优先和 prompt-injection 测试 |
| 外部工具削弱离线叙事 | 把外部查询定义为可选 enrichment；单独报告 offline 与 connected mode |
| Modal 冷启动或网络失败 | 提前缓存和预热；保留 Ollama 或录制的可复现 fallback |
| 样本量太小 | 把结果表述为机制验证，不做工业泛化声明；公开 fixtures 和运行记录 |

### 一日黑客松优先级

1. 跑通 Gemma 结构化输出和一个 inference backend。
2. 建立 6 个 fixtures、统一 schema 和 deterministic baseline。
3. 实现 Raw、BM25 和 Capsule pipeline，并完成第一轮 benchmark。
4. 完成一个两轮模拟工具闭环和最小 Demo UI。
5. 核心结果稳定后接入 SerpAPI。
6. 只有在现场提供清晰账号、MCP 文档和相关数据集时接入 Alien；否则展示 adapter 和 fixture fallback。
7. 最后才处理额外模型比较、NVIDIA 优化和视觉润色。

### 产品判断

Fault Capsule 是真实痛点上的一个新技术切面，不是一个从未存在过的产品类别。黑客松阶段的目标是验证 Context mechanism，而不是证明商业市场空白。进入下一阶段的前提是用户访谈确认：现有维护工具在断网、数据治理、跨系统 Context 或小模型部署方面仍存在足够大的未满足需求。

### 参考资料

- [完整方案反思与市场调查](./HACKATHON_PLAN.md)
- [Paris Gemma 4 Hackathon 活动页面](https://luma.com/uypemayx)
- [Alien Intelligence：面向 AI Builder 的数据与 MCP 接入](https://www.alien.club/)
- [Alien Intelligence API Bridge](https://www.alien.club/use-cases-api-bridge/)
- [Alien Intelligence 服务条款与 beta 状态](https://app.alien.club/terms-of-service)
- [SerpAPI Google Search API](https://serpapi.com/search-api)
- [SerpAPI Organic Results schema](https://serpapi.com/organic-results)

---

# English Version

## Problem Statement

When industrial equipment fails, maintenance staff often need to reconstruct what is happening by navigating telemetry systems, alarm histories, work orders, asset topology, manuals, and safety rules. This information is fragmented and time-dependent. More context is not necessarily better: a longer event history can hide the changes that actually matter to the current incident.

Existing APM, CMMS, and industrial copilot products already cover asset monitoring, diagnosis, and workflow support. The market problem is therefore not simply the absence of an industrial chatbot. The narrower problem is that teams deploying maintenance AI lack an inspectable, versioned, replayable, and measurable mechanism for deciding which incident facts a small site-local model should receive under fixed token, latency, and compute budgets.

In the railway point-machine MVP, the model must not analyze every raw current curve or control equipment directly. It must perform constrained reasoning across telemetry anomalies, recent maintenance changes, neighboring assets, manual rules, and safety restrictions, then select the next safe check from an allowlist. The problem is supported by industry evidence but has not yet been validated through direct user interviews, and the demo incidents are synthetic.

## Solution

Fault Capsule is an auditable incident-context compiler and evaluation layer. It uses deterministic, label-independent rules to compile multi-source incident material into a minimal, traceable, versioned `Incident Capsule`, which Gemma 4 consumes to select the next diagnostic check.

The core flow is:

```text
Local incident data
  → Deterministic Context Compiler
  → Incident Capsule V1
  → Constrained Gemma 4 decision
  → Simulated inspection tool
  → Incident Capsule V2
  → Next check or stop and escalate to a human
```

When local evidence is insufficient, the system may enter a controlled external-evidence escalation flow:

- Alien Intelligence supplies licensed, traceable professional content through MCP.
- SerpAPI searches public manufacturer, regulator, or other allowlisted domains.
- If supported during the event, Alien API Bridge may expose SerpAPI as an MCP tool; otherwise, a separate SerpAPI adapter is used.
- External results must be normalized into sourced, trust-classified evidence before entering a new Capsule.
- Raw telemetry and maintenance records must never be sent to external services. Only minimized equipment type, public error code, and information-need fields may leave the site boundary.
- Core incidents continue to work without network access, so the product is positioned as `local-first / hybrid`, not fully offline.

Gemma 4 is responsible only for understanding unstructured information, combining cross-source evidence, choosing allowlisted actions, and producing cited explanations. Signal processing, temporal selection, topology expansion, safety policy, and action execution remain deterministic.

## Product Goals and Success Criteria

### Product Goals

1. Demonstrate that structured causal incident context improves next-check selection under the same model and resource budget.
2. Demonstrate that Context can be an independent artifact that is inspectable, comparable, versioned, and replayable.
3. Demonstrate that a small open-weight model can perform a constrained maintenance decision-support task in a site-edge setting.
4. Demonstrate that external agent tools are invoked only when local evidence is insufficient and that every external fact is traceable.
5. Produce a benchmark that can honestly report positive or negative findings instead of optimizing only a curated demo case.

### MVP Success Criteria

- Complete a live two-round flow using Gemma 4, from alarm to Capsule V1, tool inspection, Capsule V2, and the next check.
- Implement six synthetic incidents, each with no more than four allowed actions and two inspection rounds.
- Every model response conforms to one output schema, selects from the action allowlist, and references evidence IDs resolvable in the current Capsule.
- The demo path produces no forbidden action; every state-changing action requires explicit human or simulator confirmation.
- The Context Compiler never reads root-cause labels and never calls a language model.
- Raw, BM25 Retrieval, and Capsule methods can run repeatedly with the same model, input cap, output schema, and tool budget.
- The benchmark reports at least next-action accuracy, unsafe-action rate, input tokens, and end-to-end latency.
- External evidence records include source, URL, provider, retrieval time, and trust class.
- With Alien and SerpAPI disabled, core local cases still run. Cases requiring external evidence return `insufficient_evidence` rather than fabricating an answer.

## User Stories

1. As a field maintenance technician, I want to see the minimum evidence directly relevant to the current alarm, so that I do not have to reconstruct the incident manually across multiple systems.
2. As a field maintenance technician, I want the system to recommend only allowlisted next checks, so that suggestions remain within defined operational boundaries.
3. As a field maintenance technician, I want every recommendation to cite specific evidence IDs, so that I can quickly judge whether it is supported.
4. As a field maintenance technician, I want to see event order and recent maintenance changes, so that I can identify causal clues around the incident.
5. As a field maintenance technician, I want the system to state when evidence is insufficient, so that I do not mistake a model guess for a fact.
6. As a control-room operator, I want every action that could change equipment state to require human confirmation, so that the model cannot directly control real equipment.
7. As a control-room operator, I want safety rules and forbidden actions visible in the decision trace, so that I can audit compliance with operational constraints.
8. As a reliability engineer, I want a new Capsule version after each simulated inspection, so that I can compare how decisions change as evidence changes.
9. As a reliability engineer, I want to replay an incident and all of its Capsule versions, so that I can review bad decisions and improve the Context policy.
10. As a reliability engineer, I want to compare Raw, Retrieval, and Capsule methods, so that I can verify that gains come from Context selection rather than a different model or extra compute.
11. As an OT/IT platform engineer, I want raw telemetry and internal maintenance records to remain on site by default, so that the system respects governance and network boundaries.
12. As an OT/IT platform engineer, I want to switch between Modal/vLLM and Ollama through configuration without changing business logic, so that I can support stable benchmarking and local execution.
13. As an OT/IT platform engineer, I want external queries to contain only the minimum required information, so that sensitive OT data has a lower risk of leaving the site.
14. As an OT/IT platform engineer, I want every external provider to have timeout, empty-result, and unavailable fallbacks, so that third-party failures do not block the core workflow.
15. As an AI engineer, I want the Context Compiler to use fixed temporal windows, one-hop topology, recent changes, error-code lookup, and safety rules, so that its selection policy can be tested independently.
16. As an AI engineer, I want the compiler to have no access to benchmark root-cause labels, so that answer leakage is prevented.
17. As an AI engineer, I want Gemma outputs to be strictly structured, so that invalid responses can be rejected, retried, or recorded.
18. As an AI engineer, I want model-generated information needs to be separated from actual query construction, so that arbitrary searches and prompt-injection risks are constrained.
19. As an AI engineer, I want professional content returned by Alien to retain licensing and source metadata, so that all external evidence is auditable.
20. As an AI engineer, I want SerpAPI restricted to allowlisted domains and its results normalized before model consumption, so that low-quality pages have less influence on safety-related decisions.
21. As an AI engineer, I want a local fixture provider when Alien credentials are unavailable or its datasets do not match the domain, so that a beta service cannot block the demo.
22. As a judge, I want to see the same Gemma model produce side-by-side results under different Context methods, so that I can understand the central innovation directly.
23. As a judge, I want accuracy, risk, token, and latency measurements generated by real runs, so that I can distinguish a reproducible experiment from a cherry-picked demo.
24. As a judge, I want to see Alien or SerpAPI called only when evidence is genuinely missing, so that agent behavior is constrained and cost-aware.
25. As a project maintainer, I want to export each run's inputs, Capsule, model output, tool calls, and scores, so that the Kaggle write-up and later experiments are reproducible.

## Implementation Decisions

### 1. Incident Data and Simulator

- The MVP covers one asset type only: a railway point-machine actuator.
- The dataset contains six synthetic incident fixtures spanning telemetry, current alarm, recent maintenance records, one-hop topology, manual entries, and safety rules.
- Each case defines its expected next check, allowed actions, forbidden actions, and no more than two rounds of deterministic simulator results.
- Root-cause labels are available only to the scorer and never enter a Context pipeline.
- At least one case must depend materially on an unstructured maintenance note or conflicting manual information, proving that the task is not merely structured classification.

### 2. Context Compiler Deep Module

- The Context Compiler is the central deep module. Behind a small stable interface, it encapsulates temporal slicing, topology expansion, recent-change association, error-code retrieval, safety-rule injection, token budgeting, and evidence ranking.
- The compilation policy is identical across all cases and contains no fixture-specific fault logic.
- The output is an immutable, versioned Incident Capsule.
- A Capsule includes incident summary, evidence, provenance, temporal relations, allowed actions, forbidden actions, missing information, and version metadata.
- Capsule updates preserve a parent-version reference so tool results and decision changes can be replayed.

### 3. Evidence Provider Deep Module

- All evidence sources implement one provider contract so local corpora, Alien MCP, and SerpAPI can be replaced, disabled, and simulated independently.
- The Local provider supplies internal manuals, maintenance records, and fixture data and is the default offline-capable source.
- The Alien provider queries professional content available to the event account and preserves attribution, licensing, or metering metadata.
- The SerpAPI provider retrieves public web material only from manufacturer, regulator, and pre-approved technical sources.
- If Alien API Bridge is available during the event, SerpAPI should preferably be exposed as an MCP tool. Otherwise, SerpAPI is called directly while retaining the same internal contract.
- Alien is currently in limited-access beta, and its available datasets are not confirmed to include railway maintenance content. A fixture fallback is therefore mandatory, and Alien must not be placed on the critical demo path.

### 4. External Evidence Policy

- The system always evaluates the local Capsule first. An external call is permitted only when a specific fact required for the next decision is missing.
- Gemma may emit only a structured information need. A deterministic router selects the provider, allowlisted domains, query terms, and call budget.
- The default budget is one external query per round and two per incident.
- External results never become actions directly. They are converted into evidence records, followed by Capsule recompilation and another inference step.
- Each external evidence item includes at least an evidence ID, fact, source type, original URL, provider, retrieval timestamp, document timestamp, trust class, and licensing metadata when applicable.
- External content cannot override local safety rules, expand the action allowlist, or trigger automatic equipment control.
- When external tools are unavailable, the system returns an explicit degraded state and never silently switches to unsourced generation.

### 5. Gemma Decision Engine

- A single Gemma session consumes the Capsule. The MVP does not use an additional Context Scout, avoiding confusion between Context gains and extra inference compute.
- The model may only select an allowed action, request one missing piece of evidence, or return `insufficient_evidence`.
- The response contains the next check, cited evidence IDs, confidence, and a short rationale.
- A schema validation failure permits only one deterministic repair or retry. A second failure is recorded as an invalid output.
- The model does not generate signal features from raw telemetry and cannot execute control commands directly.

### 6. Inference Runtime

- The application layer depends on a shared OpenAI-compatible inference contract.
- Modal with vLLM and Gemma 4 E4B is the primary environment for a stable demo and repeatable benchmark.
- Ollama with a smaller Gemma 4 variant is the site-local and offline fallback.
- Model, quantization, hardware, tokens, and latency are reported separately for each environment. Modal measurements must not be presented as edge performance.

### 7. Demo Interface

- The interface supports one primary story: a point machine receives a movement command, but its position feedback does not change.
- The main view shows the raw incident timeline, current Capsule, Gemma decision, cited evidence, safety boundary, and version changes.
- A comparison view displays Raw/Retrieval and Capsule outputs side by side.
- Every external call visibly shows the provider, reason for the query, fields sent externally, and returned sources.
- Demo success does not depend on complex graphics, a general-purpose chat interface, or a real equipment connection.

### 8. Benchmark Harness Deep Module

- Core comparisons include a Deterministic/Rule baseline, Raw, BM25 Retrieval, and Capsule.
- Optional comparisons include a Direct Tool Agent and Gemma E2B, E4B, and a larger reference model.
- All Context methods use the same model version, inference parameters, maximum input budget, output schema, case order, and tool budget.
- The primary Context benchmark disables every external API to isolate the causal contribution of the Context Compiler.
- A separate enrichment benchmark uses no more than two missing-information case variants to compare Capsule only, Capsule plus Alien, Capsule plus SerpAPI, and Capsule plus both.
- Per-case raw results are retained; aggregate averages alone are insufficient.

### 9. Observability and Audit

- Every run receives a unique run ID and records model configuration, Context method, token use, latency, output validation, tool calls, and scorer result.
- Capsules and decision traces can be exported for the Kaggle write-up, public repository, and live presentation.
- API keys are supplied only through environment variables or secret management and never enter logs, Capsules, or public deliverables.

## Testing Decisions

Good tests verify externally observable behavior and invariants rather than internal function structure or exact prompt wording. Because the repository currently has no product code or prior tests, the MVP begins with fixture-driven contract tests.

### Modules Requiring Tests

- Context Compiler: identical inputs produce identical Capsules; temporal, topology, and recent-maintenance rules work; labels are inaccessible; token budgets are respected.
- Safety Policy: forbidden actions never enter the executable allowlist; external evidence cannot override local safety rules.
- Capsule Schema: version, evidence reference, provenance, and action fields are complete; invalid references are rejected.
- Evidence Normalizer: Alien, SerpAPI, and local fixtures become the same evidence structure; untrusted or unsourced records are rejected or downgraded.
- External Query Router: only explicit information gaps trigger calls; outgoing fields are minimized; domain allowlists and call budgets are enforced.
- Gemma Adapter: both inference backends produce the same internal response structure; timeouts, invalid JSON, and unavailable models produce explicit failures.
- Incident Simulator: every allowed action returns deterministic, reproducible inspection results; the two-round limit is enforced.
- Benchmark Scorer: correct actions, forbidden actions, citation validity, tokens, and latency are scored consistently.

### Integration and End-to-End Tests

- Run one complete incident from fixture through Capsule V1, Gemma decision, simulated inspection, Capsule V2, and final recommendation.
- Run Raw, Retrieval, and Capsule with identical cases and model configuration, verifying equivalent resource constraints.
- Disable network access and run local cases, verifying that no external provider is called implicitly.
- Simulate Alien and SerpAPI timeouts, empty results, rate limits, and invalid payloads, verifying safe degradation.
- Inject a web snippet containing prompt-injection text and verify that it remains untrusted evidence and cannot alter system rules or the action allowlist.
- Replay a saved run and verify that scorer results are reproducible.

### Benchmark Statistical Rules

- Report per-case results and macro averages; never use one successful case as a substitute for aggregate results.
- If sampling is nondeterministic, run each model-method combination multiple times with fixed seeds and disclose the repetition count.
- Do not remove failures. Invalid schema, timeouts, and abstentions remain in the result table.
- If Capsule does not outperform the baselines, retain the result and state that the current policy has not been validated.

## Out of Scope

- Connecting to or controlling real railway equipment.
- Claiming railway, industrial, or functional-safety certification.
- Building a complete APM, CMMS, predictive-maintenance platform, or general industrial copilot.
- Performing anomaly detection or remaining-useful-life prediction from raw high-frequency current curves.
- Supporting arbitrary asset types beyond railway point machines.
- Generating free-form maintenance instructions or bypassing human confirmation.
- Building a general knowledge graph, multi-agent collaboration, or autonomous repair system.
- Processing image, video, or audio inputs in the MVP.
- Uploading real sensitive OT data to Alien, SerpAPI, Modal, or any other external service.
- Fine-tuning Gemma, training a new fault classifier, or building production-grade data pipelines.
- Proving that Fault Capsule is already a standalone startup opportunity or superior to existing commercial APM products.
- Using six synthetic cases to claim real-world industrial accuracy, reliability, or safety.
- Optimizing NVIDIA throughput, caching, or complex UI before the core benchmark is complete.

## Further Notes

### Key Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Synthetic incidents do not represent real workflows | Label the system as a prototype and interview at least one maintenance or reliability practitioner before productization |
| Capsule construction leaks the answer | Deny compiler access to labels, use global rules, and publish per-case Capsules |
| A deterministic baseline already achieves perfect accuracy | Add a materially relevant unstructured maintenance note, alias, or manual conflict; do not force an LLM requirement |
| Alien datasets do not include relevant railway content | Inspect the catalog at kickoff, retain a local fixture provider, and keep Alien off the critical path |
| SerpAPI returns low-quality or malicious pages | Use domain allowlists, source grading, normalization, safety-rule priority, and prompt-injection tests |
| External tools undermine the offline story | Define external calls as optional enrichment and report offline and connected modes separately |
| Modal cold starts or network failures | Pre-cache and warm the endpoint; retain an Ollama or recorded reproducible fallback |
| The sample is too small | Frame results as mechanism validation, make no industrial generalization, and publish fixtures and run records |

### One-Day Hackathon Priority

1. Establish Gemma structured output through one working inference backend.
2. Build six fixtures, the shared schema, and a deterministic baseline.
3. Implement Raw, BM25, and Capsule pipelines and run the first benchmark.
4. Complete one two-round simulator loop and a minimal demo UI.
5. Add SerpAPI only after the core result is stable.
6. Add Alien only if clear credentials, MCP documentation, and a relevant dataset are available at kickoff; otherwise demonstrate the adapter and fixture fallback.
7. Address extra model comparisons, NVIDIA optimization, and visual polish last.

### Product Judgment

Fault Capsule is a new technical angle on a real problem, not a product category with no incumbents. The hackathon objective is to validate the Context mechanism, not to prove an empty market. Moving beyond the prototype requires user interviews confirming that current maintenance tools leave a meaningful gap in offline operation, data governance, cross-system Context, or small-model deployment.

### References

- [Full plan review and market research](./HACKATHON_PLAN.md)
- [Paris Gemma 4 Hackathon event page](https://luma.com/uypemayx)
- [Alien Intelligence data and MCP access for AI builders](https://www.alien.club/)
- [Alien Intelligence API Bridge](https://www.alien.club/use-cases-api-bridge/)
- [Alien Intelligence terms and beta status](https://app.alien.club/terms-of-service)
- [SerpAPI Google Search API](https://serpapi.com/search-api)
- [SerpAPI Organic Results schema](https://serpapi.com/organic-results)
