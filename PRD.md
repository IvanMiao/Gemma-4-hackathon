
# Fault Capsule — 中英双语产品需求文档 / Bilingual Product Requirements Document

| 项目 / Item | 内容 / Value |
|---|---|
| 状态 / Status | Draft for hackathon implementation |
| 目标活动 / Target | Paris Gemma 4 Hackathon |
| 主赛道 / Primary track | Edge / On-Device |
| 附加奖项 / Additional prizes | SerpAPI cross-track award; NVIDIA GPU Challenge if local GPU access is confirmed |
| 待确认 / Open decision | `ASK-GPU-01`: 向主办方确认是否提供可供团队现场使用的 NVIDIA GPU、驱动和安装权限 |
| MVP 场景 / MVP scenario | 合成铁路道岔执行器事故 / Synthetic railway point-machine incidents |
| 产品性质 / Product type | 维护决策支持原型，不是安全认证控制器 / Maintenance decision-support prototype, not a safety-certified controller |

---

# 中文版

## 问题陈述

工业设备发生故障后，维护人员通常需要跨越遥测系统、告警记录、维修工单、设备拓扑、手册和安全规则，重建“当前到底发生了什么”。这些信息不仅分散，而且有时间关系；更多上下文不一定更好，过长的历史记录反而可能遮蔽与当前事故有关的变化。

现有工业 APM、CMMS 和 Copilot 已经覆盖资产监控、诊断和工作流，因此市场问题不是“缺少一个工业聊天机器人”。更具体的问题是：网络不稳定、数据不能离站或响应时间受限的现场，缺少一个能在普通边缘设备上独立运行、可审计并能明确拒答的维护决策助手。

在铁路道岔 MVP 中，模型不应直接分析全部原始电流曲线，也不应自动控制设备。它需要在遥测异常、近期维修变化、邻接设备关系、手册规则和安全限制之间进行有限推理，并从白名单中选择下一项安全检查。当前痛点有行业证据支持，但尚未经过直接用户访谈验证；演示事故也是合成案例。

## 解决方案

Fault Capsule 是一个 on-device、可审计的维护决策助手。它使用与故障标签无关的确定性规则，在设备本地把多源事故资料整理成紧凑、可追溯、版本化的 `Incident Capsule`，再由本地运行的 Gemma 4 选择下一项安全检查。

核心流程如下：

```text
站点内事故数据
  → 确定性 Local Evidence Compiler
  → Incident Capsule V1
  → On-device Gemma 4 受约束决策
  → 本地模拟检查工具
  → Incident Capsule V2
  → 下一项检查或停止并请求人工处理
```

产品有两个清晰、可见的运行模式。无论哪种模式，Gemma 4 推理、事故数据、规则、模拟器和审计日志都始终留在本地设备：

- `Network OFF — Core Mode`：默认模式。SerpAPI plugin 不加载，系统禁止任何 HTTP/DNS 外发；全部核心案例、两轮诊断闭环和 benchmark 必须完整运行。
- `Network ON — SerpAPI Add-on`：用户打开网络并启用插件后，SerpAPI 才成为可用工具，用于查询厂商、监管机构或其他白名单域名中的公开资料。本地 Gemma 推理不迁移到云端。

SerpAPI add-on 遵守以下边界：

- Gemma 4 只能提出结构化的信息需求，不能自由构造或直接执行搜索；
- 确定性 router 只发送最小化的设备类型、公开错误码和信息需求，绝不发送原始遥测、维修记录或站点标识；
- 搜索结果必须经过来源分级、prompt-injection 清洗和证据归一化，再进入新的 Capsule；
- SerpAPI 超时、无结果、无密钥或断网时，系统明确返回 `insufficient_evidence`，本地核心流程不受影响；
- UI 必须显示网络模式、plugin 状态、查询原因、外发字段和返回来源；
- 演示先在 `Network OFF` 完成核心流程，再切换到 `Network ON` 展示一个真实 SerpAPI 增强案例。

Gemma 4 只负责非结构化信息理解、跨来源证据组合、白名单动作选择和引用式解释。信号处理、时间窗口选择、拓扑扩展、安全策略和动作执行均由确定性模块负责。

## 产品目标与成功标准

### 产品目标

1. 证明 Gemma 4 可以在一台明确披露硬件配置的本地设备上、断网完成两轮维护决策闭环。
2. 证明原始 OT 数据无需离开设备，并且每项建议、证据和模型运行都可审计、回放。
3. 在固定内存、延迟、功耗和输入预算下，找到可用的模型量化与本地推理配置。
4. 展示 SerpAPI 只是可选增强，断网不会阻塞核心任务，也不会改变本地安全边界。
5. 产出可重复的 on-device benchmark，诚实报告准确率、风险、延迟、内存和能耗代理指标。
6. 如果主办方确认可使用现场 NVIDIA GPU，在同一台本地机器上使用 NVIDIA-compatible runtime 完成可验证部署；否则保持 laptop-local 路径，不影响主赛道交付。

### MVP 成功标准

- 在目标设备上断网运行 Gemma 4，完成一个从告警、Capsule V1、工具检查、Capsule V2 到下一项检查的两轮现场演示。
- 实现 6 个合成事故案例；每个案例最多 4 个允许动作、2 轮检查。
- 所有模型输出都符合统一 schema，动作来自白名单，证据 ID 可以在当前 Capsule 中解析。
- 演示路径不产生禁止动作；所有执行动作都需要显式的人机确认或模拟器确认。
- Local Evidence Compiler 不读取根因标签，也不调用语言模型。
- Raw、BM25 Retrieval 和 Capsule 三种本地输入策略能够在同一模型、输入上限、输出 schema 和工具预算下重复运行。
- benchmark 至少报告下一动作正确率、不安全动作率、输入 token、首 token 延迟、总延迟、峰值内存和模型包大小；功耗不可测时使用运行时间与硬件功率范围作为明确标注的代理。
- 外部证据的来源、URL、提供方、检索时间和信任等级完整记录。
- 删除 SerpAPI key 并断开网络后，全部核心案例和 benchmark 仍可运行；需要外部证据的扩展案例应明确降级为 `insufficient_evidence`，而不是编造答案。
- 所有核心运行数据保存在本地，演示中提供一个可见的 “Network: OFF” 状态和外发请求计数器。
- 在 `Network ON` 模式完成至少一个真实、可审计的 SerpAPI 查询，将结果归一化为带来源证据并触发一次本地 Gemma 重新判断，满足 substantive integration 要求。
- `ASK-GPU-01` 在开场 30 分钟内得到记录：若 GPU 可用，保存 GPU 型号、访问方式、允许的 runtime 和安装限制；若不可用，立即锁定非 NVIDIA 本地方案。

## 用户故事

1. 作为现场维护技术员，我希望看到与当前告警直接相关的最小证据集，以便不必在多个系统中手工拼接事故经过。
2. 作为现场维护技术员，我希望系统只推荐白名单中的下一项检查，以便建议保持在已定义的操作边界内。
3. 作为现场维护技术员，我希望每项建议都引用具体证据 ID，以便快速判断建议是否有依据。
4. 作为现场维护技术员，我希望看到事件的时间顺序和近期维修变化，以便发现事故前后的因果线索。
5. 作为现场维护技术员，我希望在证据不足时看到明确的“不足以判断”，以便不会把模型猜测当作事实。
6. 作为控制室操作员，我希望所有可能改变设备状态的动作都需要人工确认，以便模型不能直接控制真实设备。
7. 作为控制室操作员，我希望安全规则和禁止动作始终显示在决策记录中，以便能够审查系统是否遵守操作限制。
8. 作为可靠性工程师，我希望在模拟检查返回新结果后生成新的 Capsule 版本，以便比较决策如何随证据变化。
9. 作为可靠性工程师，我希望回放同一事故及其所有 Capsule 版本，以便复盘错误决策和完善 evidence policy。
10. 作为可靠性工程师，我希望比较 Raw、Retrieval 和 Capsule 三种本地输入策略，以便确认在相同设备预算下哪种策略最可靠。
11. 作为 OT/IT 平台工程师，我希望原始遥测和内部维修记录默认留在站点内，以便满足数据治理和网络边界要求。
12. 作为 OT/IT 平台工程师，我希望通过配置切换 Ollama、llama.cpp 或 NVIDIA 本地推理后端，而无需修改业务逻辑，以便适配不同边缘硬件。
13. 作为 OT/IT 平台工程师，我希望外部查询只包含最小必要信息，以便降低敏感 OT 数据外泄风险。
14. 作为 OT/IT 平台工程师，我希望每个外部 provider 都有超时、空结果和不可用 fallback，以便第三方服务失败不会阻塞核心流程。
15. 作为 AI 工程师，我希望 Local Evidence Compiler 使用固定时间窗口、一跳拓扑、近期变化、错误码和安全规则，以便选择策略可以独立测试。
16. 作为 AI 工程师，我希望编译器无法访问 benchmark 根因标签，以便防止答案泄漏。
17. 作为 AI 工程师，我希望 Gemma 输出严格结构化，以便无效输出可以被拒绝、重试或记录。
18. 作为 AI 工程师，我希望系统把模型提出的信息需求与实际查询构造分开，以便限制任意搜索和 prompt injection 风险。
19. 作为 AI 工程师，我希望模型权重、prompt、事故数据和日志默认只存储在本地，以便演示可验证的数据驻留。
20. 作为 AI 工程师，我希望 SerpAPI 以独立 plugin 提供，只在 `Network ON` 时注册，并且只搜索白名单域名，以便联网增强不会污染本地核心架构。
21. 作为 AI 工程师，我希望 `Network OFF` 在 transport 层禁止全部外发，即使环境里存在 API key，也能证明完全离线。
22. 作为评委，我希望看到同一个本地 Gemma 模型在不同输入策略下的并排结果，以便理解紧凑证据对设备资源和决策质量的影响。
23. 作为评委，我希望看到真实运行生成的准确率、风险、token 和延迟数据，以便区分可重复实验与精心挑选的 Demo。
24. 作为评委，我希望现场断网后系统仍能完成主流程，并看到真实设备上的延迟和内存数据，以便确认它不是云端 API wrapper。
25. 作为项目维护者，我希望导出每次运行的输入、Capsule、模型输出、工具调用和评分，以便在 Kaggle write-up 和后续实验中复现结果。

## 实现决策

### 1. 事故数据与模拟器

- MVP 只覆盖一种资产：铁路道岔执行器。
- 数据集包含 6 个合成事故 fixture，覆盖遥测、当前告警、近期维修记录、一跳拓扑、手册条目与安全规则。
- 每个案例定义期望的下一项检查、允许动作、禁止动作和最多两轮模拟工具结果。
- 根因标签只供 scorer 使用，不进入任何输入策略 pipeline。
- 至少一个案例必须让非结构化维修记录或手册冲突真正影响答案，以证明任务不只是结构化分类。

### 2. Local Evidence Compiler 深模块

- Local Evidence Compiler 是项目的核心确定性模块：它以稳定的小接口封装时间切片、拓扑扩展、近期变更关联、错误码检索、安全规则注入、token budgeting 和证据排序。
- 编译策略必须对所有案例一致，不能包含针对某个 fixture 的故障规则。
- 编译结果是不可变、带版本号的 Incident Capsule。
- Capsule 包含事故摘要、证据、来源、时间关系、允许动作、禁止动作、缺失信息和版本元数据。
- 更新 Capsule 时保留父版本引用，使工具结果与决策变化可以回放。

### 3. 本地数据与 SerpAPI Add-on Plugin

- Local provider 与 SerpAPI plugin 实现统一、最小的 evidence-provider contract，但分别打包，核心应用不得静态依赖 SerpAPI SDK。
- Local provider 负责内部手册、维修记录和 fixture 数据，是默认且离线可用的来源。
- SerpAPI plugin 负责公开网页检索，只允许厂商、监管机构和预先批准的技术来源。
- 只有 `network_mode=on`、用户启用 add-on 且存在 `SERPAPI_API_KEY` 时才动态注册 plugin；任何条件不满足都不初始化 client。
- plugin 与本地推理进程隔离，开关 plugin 不得卸载、替换或远程化 Gemma 4。
- 本地手册 fixture 必须足以支撑全部核心案例，SerpAPI 只服务一至两个明确标注的 connected-mode 扩展案例。

### 4. 网络模式与外部证据策略

- `Network OFF` 是启动默认值和核心 benchmark 强制值。在该模式下，transport guard 必须拒绝所有外发请求，SerpAPI plugin 显示为 `unavailable_by_policy`。
- `Network ON` 只开放 SerpAPI add-on，不开放远程模型推理、遥测上传或任意 URL 请求。
- 系统始终先查询本地 Capsule；只有缺少完成下一决策所需的明确公开事实时才允许 SerpAPI 调用。
- Gemma 只能输出结构化的信息需求；确定性 router 决定 provider、白名单域名、查询词和调用预算。
- 必须由用户显式切换到 `Network ON` 并启用 `SerpAPI Add-on`；每轮最多一次查询，整个事故最多两次。
- 外部结果不会直接成为动作。它先被转换成证据记录，再重新编译 Capsule 并重新推理。
- 每条外部证据至少包含证据 ID、事实、来源类型、原始 URL、provider、检索时间、文档时间、信任等级和授权信息（如适用）。
- 外部内容不能覆盖本地安全规则、扩展动作白名单或触发自动设备控制。
- 外部调用不可用时返回明确的降级状态，不允许静默切换到无来源生成。

### 5. Gemma 决策引擎

- 使用一个 Gemma session 消费 Capsule；MVP 不使用额外的证据筛选模型，避免把额外推理计算误认为本地输入策略收益。
- 模型只能选择允许动作、请求一项缺失证据，或返回 `insufficient_evidence`。
- 输出包含下一项检查、引用证据 ID、置信度和简短理由。
- schema 校验失败时只允许一次确定性修复或重试；仍失败则记录为无效输出。
- 模型不得从原始遥测生成信号特征，也不得直接执行控制命令。

### 6. On-device 推理运行时

- 核心 Demo 和 benchmark 必须在本地设备上运行，不调用远程推理 API。
- 业务层依赖统一的 inference contract；首选最容易在目标硬件稳定运行 Gemma 4 的本地后端，如 Ollama 或 llama.cpp。
- `ASK-GPU-01` 是开场硬件决策门：向主办方确认是否有可供团队实际开发和现场演示的 NVIDIA GPU、是否允许安装依赖、可用驱动/CUDA 版本、访问时长和断网演示能力。
- 若确认可用，优先在该本地 NVIDIA 设备上选择 SGLang、vLLM、TensorRT-LLM、Dynamo、NIM 或其他 NVIDIA-compatible runtime，并同时申请 NVIDIA GPU Challenge；若不可用，使用团队 laptop 上的 Ollama/llama.cpp 路径。
- NVIDIA GPU Challenge 是附加奖，不改变唯一选择的 `Edge / On-Device` 主赛道；云端 GPU 不计入核心 on-device 结果。
- 在获得 `ASK-GPU-01` 答复后 30 分钟内锁定目标设备、模型 variant、量化和后端，避免多后端分散实现时间。
- 每次运行记录设备型号、CPU/GPU/NPU、RAM/VRAM、操作系统、runtime、模型、量化、模型包大小、输入/输出 token、首 token 延迟、总延迟和峰值内存。
- 如果较大 variant 无法满足内存或交互延迟目标，优先降低量化或切换更小 variant，不把远程推理作为静默 fallback。

### 7. 演示界面

- 界面只服务一个主故事：道岔收到切换命令，但位置反馈未变化。
- 主视图显示原始事故时间线、当前 Capsule、Gemma 决策、证据引用、安全边界和版本变化。
- 对比视图并排显示 Raw/Retrieval 与 Capsule 的输出差异。
- 外部调用必须显式显示 provider、查询原因、发送出去的字段和返回来源。
- 顶部固定显示 `ON-DEVICE`、当前硬件、runtime、模型量化、`Network OFF/ON`、SerpAPI plugin 状态和本次运行内存/延迟。
- 演示脚本固定为：`Network OFF` 完成主事故闭环 → 显示零外发 → 切换 `Network ON` → 启用 SerpAPI plugin → 完成一次带来源的增强查询 → 本地 Gemma 重新判断。
- 演示成功不依赖复杂图形、通用聊天界面或真实设备连接。

### 8. Benchmark Harness 深模块

- 核心比较包括 Deterministic/Rule baseline、Raw、BM25 Retrieval 和 Capsule。
- 可选比较包括 Direct Tool Agent，以及 Gemma E2B、E4B 和更大参考模型。
- 所有本地输入策略使用相同模型版本、推理参数、最大输入预算、输出 schema、案例顺序和工具预算。
- 主 on-device benchmark 禁止所有外部 API，衡量目标设备上的质量、速度和资源占用。
- 单独的 connected enrichment benchmark 使用最多两个资料缺失的案例变体，只比较 Capsule only 与 Capsule + SerpAPI；该结果不能计入核心离线成功标准。
- benchmark 保存逐案例原始结果，不只保存汇总均值。

### 9. 可观察性与审计

- 每次运行生成唯一 run ID，并记录模型配置、输入策略、硬件、网络状态、token 使用、首 token/总延迟、峰值内存、输出校验、工具调用和 scorer 结果。
- 所有 Capsule 和决策 trace 可以导出，用于 Kaggle write-up、公开仓库和现场演示。
- API key 只通过环境变量或 secret 管理，不进入日志、Capsule 或公开提交物。

## 测试决策

好的测试只验证外部可观察行为和不变量，不绑定函数内部实现或特定 prompt 文本。由于仓库当前没有业务代码和既有测试，MVP 将从 fixture-driven contract test 开始。

### 必测模块

- Local Evidence Compiler：相同输入产生相同 Capsule；时间窗口、拓扑和近期维修规则正确；无法读取根因标签；遵守 token budget。
- Safety Policy：禁止动作永远不会进入可执行白名单；外部证据不能覆盖本地安全规则。
- Capsule Schema：版本、证据引用、来源和动作字段完整；无效引用被拒绝。
- Evidence Normalizer：SerpAPI 和本地 fixture 被转换成相同证据结构；不可信或缺失来源的记录被拒绝或降级。
- External Query Router：只有明确的信息缺口才能触发调用；查询字段经过最小化；域名白名单和调用预算生效。
- Network Mode Guard：`OFF` 时即使存在 API key 也拒绝所有 HTTP/DNS 外发；`ON` 只允许 SerpAPI plugin 访问批准的 endpoint，不能启用远程推理。
- Gemma Adapter：所选本地推理后端返回统一内部输出结构；超时、无效 JSON、内存不足和不可用模型得到明确错误，且不会静默调用云端。
- Device Metrics：首 token 延迟、总延迟、峰值内存和 token 统计可重复采集；不支持的指标明确标记为 unavailable。
- Incident Simulator：每个允许动作返回固定、可复现的检查结果；两轮上限生效。
- Benchmark Scorer：正确动作、禁止动作、引用有效性、token 和延迟计算一致。

### 集成与端到端测试

- 完整运行一个事故，从 fixture 到 Capsule V1、Gemma 决策、模拟检查、Capsule V2 和最终建议。
- 在完全相同的案例与模型配置下运行 Raw、Retrieval 和 Capsule，并验证预算约束一致。
- 禁用网络后运行本地案例，验证不会隐式调用外部 provider。
- 模拟 SerpAPI 超时、空结果、限流和无效 payload，验证系统安全降级。
- 在没有 API key 且网络断开的环境运行完整核心测试，验证没有任何外发请求或远程推理。
- 在存在有效 API key 时切换 `Network OFF → ON → OFF`，验证 plugin 动态注册与卸载、审计记录和 transport guard 都符合状态。
- 在 `Network ON` 执行一个真实 SerpAPI 扩展案例，验证证据来源可解析且后续 Gemma 推理仍由同一本地 runtime 完成。
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
- 上传真实敏感 OT 数据到 SerpAPI、远程推理服务或其他外部服务。
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
| SerpAPI 返回低质量或恶意网页 | 域名白名单、来源分级、内容归一化、安全规则优先和 prompt-injection 测试 |
| SerpAPI 削弱 on-device 叙事 | 默认关闭；主 Demo 先在断网状态完成；connected enrichment 作为独立 bonus 展示 |
| 现场 NVIDIA GPU 是否可用不确定 | 开场立即完成 `ASK-GPU-01`；准备 GPU 与 laptop 两条预验证配置；不让 GPU 可用性阻塞 Edge 主赛道 |
| NVIDIA 环境无法断网或不允许安装依赖 | 继续使用 laptop-local 核心 Demo；只在可验证时声明 GPU Challenge 资格 |
| 模型无法装入目标设备或过慢 | 尽早锁定设备与量化；预下载权重；准备更小 variant；不使用云端作为核心 fallback |
| 本地 runtime 安装或驱动故障 | 提前缓存依赖和模型；保留第二个已验证的本地 runtime 或可复现录屏 |
| 样本量太小 | 把结果表述为机制验证，不做工业泛化声明；公开 fixtures 和运行记录 |

### 一日黑客松优先级

1. 入场后立即向主办方完成 `ASK-GPU-01`，确认 NVIDIA GPU、驱动、安装权限、访问时长和断网能力。
2. 根据答复锁定 NVIDIA-local 或 laptop-local 路径，并在 `Network OFF` 跑通 Gemma 结构化输出。
3. 建立 6 个 fixtures、统一 schema、deterministic baseline 和设备指标采集。
4. 实现 Raw、BM25 和 Capsule 三种本地输入 pipeline，完成第一轮 on-device benchmark 和两轮模拟闭环。
5. 完成带 `Network OFF/ON`、plugin 状态、硬件和外发计数的最小 Demo UI。
6. 优化内存与延迟，确保主 Demo 在 `Network OFF` 稳定重复运行。
7. 接入可动态加载的 SerpAPI add-on，完成一次真实、可审计的 `Network ON` 增强流程。
8. 最后才处理额外模型比较、NVIDIA runtime 深度优化和视觉润色。

### 产品判断

Fault Capsule 是真实痛点上的一个 on-device 技术切面，不是一个从未存在过的产品类别。黑客松阶段的目标是验证：本地 Gemma 4 是否能在明确的设备资源、安全边界和断网条件下完成有用的维护决策闭环。进入下一阶段的前提是用户访谈确认：现有维护工具在断网、数据驻留、现场延迟或小模型部署方面仍存在足够大的未满足需求。

### 参考资料

- [完整方案反思与市场调查](./HACKATHON_PLAN.md)
- [本地保存的官方比赛规则与奖项说明](./prize.md)
- [Paris Gemma 4 Hackathon 活动页面](https://luma.com/uypemayx)
- [SerpAPI Google Search API](https://serpapi.com/search-api)
- [SerpAPI Organic Results schema](https://serpapi.com/organic-results)

---

# English Version

## Problem Statement

When industrial equipment fails, maintenance staff often need to reconstruct what is happening by navigating telemetry systems, alarm histories, work orders, asset topology, manuals, and safety rules. This information is fragmented and time-dependent. More context is not necessarily better: a longer event history can hide the changes that actually matter to the current incident.

Existing APM, CMMS, and industrial copilot products already cover asset monitoring, diagnosis, and workflow support. The market problem is therefore not simply the absence of an industrial chatbot. The narrower problem is that field sites with unreliable connectivity, strict data-residency boundaries, or tight response-time requirements lack a maintenance decision assistant that runs independently on ordinary edge hardware, remains auditable, and knows when to abstain.

In the railway point-machine MVP, the model must not analyze every raw current curve or control equipment directly. It must perform constrained reasoning across telemetry anomalies, recent maintenance changes, neighboring assets, manual rules, and safety restrictions, then select the next safe check from an allowlist. The problem is supported by industry evidence but has not yet been validated through direct user interviews, and the demo incidents are synthetic.

## Solution

Fault Capsule is an on-device, auditable maintenance decision assistant. It uses deterministic, label-independent rules to organize multi-source incident material locally into a compact, traceable, versioned `Incident Capsule`, which a locally running Gemma 4 consumes to select the next safe diagnostic check.

The core flow is:

```text
On-site incident data
  → Deterministic Local Evidence Compiler
  → Incident Capsule V1
  → Constrained on-device Gemma 4 decision
  → Local simulated inspection tool
  → Incident Capsule V2
  → Next check or stop and escalate to a human
```

The product has two explicit, visible runtime modes. In both modes, Gemma 4 inference, incident data, rules, simulator, and audit logs remain on the local device:

- `Network OFF — Core Mode`: the default. The SerpAPI plugin is not loaded and all outbound HTTP/DNS is blocked. Every core case, two-round diagnostic loop, and benchmark must run completely.
- `Network ON — SerpAPI Add-on`: after the user enables networking and the plugin, SerpAPI becomes an available tool for public manufacturer, regulator, or other allowlisted sources. Gemma inference never moves to the cloud.

The SerpAPI add-on observes these boundaries:

- Gemma 4 may emit only a structured information need; it cannot freely construct or execute searches.
- A deterministic router sends only minimized equipment type, public error code, and information-need fields—never raw telemetry, maintenance records, or site identifiers.
- Search results are source-graded, screened for prompt injection, and normalized as evidence before entering a new Capsule.
- On timeout, no result, missing key, or network loss, the system returns `insufficient_evidence`; the local core workflow continues.
- The UI displays network mode, plugin state, query reason, outbound fields, and returned sources.
- The demo completes the core flow in `Network OFF` before switching to `Network ON` for one real SerpAPI enrichment case.

Gemma 4 is responsible only for understanding unstructured information, combining cross-source evidence, choosing allowlisted actions, and producing cited explanations. Signal processing, temporal selection, topology expansion, safety policy, and action execution remain deterministic.

## Product Goals and Success Criteria

### Product Goals

1. Demonstrate that Gemma 4 can complete a two-round maintenance decision loop offline on a fully disclosed local device.
2. Demonstrate that raw OT data never needs to leave the device and that every recommendation, evidence item, and model run is auditable and replayable.
3. Identify a usable model quantization and local runtime configuration under fixed memory, latency, power, and input budgets.
4. Demonstrate that SerpAPI is optional enrichment: losing the network does not block the core task or alter local safety boundaries.
5. Produce a reproducible on-device benchmark reporting quality, risk, latency, memory, and clearly labeled energy proxies.
6. If organizers confirm access to an on-site NVIDIA GPU, complete a verifiable deployment with an NVIDIA-compatible runtime on that local machine; otherwise retain the laptop-local path without affecting the primary-track submission.

### MVP Success Criteria

- Run Gemma 4 offline on the target device and complete a live two-round flow from alarm to Capsule V1, tool inspection, Capsule V2, and the next check.
- Implement six synthetic incidents, each with no more than four allowed actions and two inspection rounds.
- Every model response conforms to one output schema, selects from the action allowlist, and references evidence IDs resolvable in the current Capsule.
- The demo path produces no forbidden action; every state-changing action requires explicit human or simulator confirmation.
- The Local Evidence Compiler never reads root-cause labels and never calls a language model.
- Raw, BM25 Retrieval, and Capsule local-input strategies run repeatedly with the same model, input cap, output schema, and tool budget.
- The benchmark reports at least next-action accuracy, unsafe-action rate, input tokens, time to first token, total latency, peak memory, and model package size. If power cannot be measured directly, runtime and the hardware power range are reported as an explicitly labeled proxy.
- External evidence records include source, URL, provider, retrieval time, and trust class.
- With the SerpAPI key removed and the network disconnected, every core case and benchmark still runs. Extension cases requiring external evidence return `insufficient_evidence` rather than fabricating an answer.
- All core run data remains local, and the demo exposes a visible “Network: OFF” state plus an outbound-request counter.
- In `Network ON`, complete at least one real, auditable SerpAPI call, normalize the result into sourced evidence, and trigger another local Gemma decision to meet the substantive-integration requirement.
- Record `ASK-GPU-01` within the first 30 minutes: if a GPU is available, capture its model, access method, permitted runtime, and installation limits; if not, immediately lock the non-NVIDIA local plan.

## User Stories

1. As a field maintenance technician, I want to see the minimum evidence directly relevant to the current alarm, so that I do not have to reconstruct the incident manually across multiple systems.
2. As a field maintenance technician, I want the system to recommend only allowlisted next checks, so that suggestions remain within defined operational boundaries.
3. As a field maintenance technician, I want every recommendation to cite specific evidence IDs, so that I can quickly judge whether it is supported.
4. As a field maintenance technician, I want to see event order and recent maintenance changes, so that I can identify causal clues around the incident.
5. As a field maintenance technician, I want the system to state when evidence is insufficient, so that I do not mistake a model guess for a fact.
6. As a control-room operator, I want every action that could change equipment state to require human confirmation, so that the model cannot directly control real equipment.
7. As a control-room operator, I want safety rules and forbidden actions visible in the decision trace, so that I can audit compliance with operational constraints.
8. As a reliability engineer, I want a new Capsule version after each simulated inspection, so that I can compare how decisions change as evidence changes.
9. As a reliability engineer, I want to replay an incident and all of its Capsule versions, so that I can review bad decisions and improve the evidence policy.
10. As a reliability engineer, I want to compare Raw, Retrieval, and Capsule local-input strategies, so that I can determine which is most reliable under the same device budget.
11. As an OT/IT platform engineer, I want raw telemetry and internal maintenance records to remain on site by default, so that the system respects governance and network boundaries.
12. As an OT/IT platform engineer, I want to switch among Ollama, llama.cpp, or an NVIDIA local backend through configuration without changing business logic, so that I can support different edge hardware.
13. As an OT/IT platform engineer, I want external queries to contain only the minimum required information, so that sensitive OT data has a lower risk of leaving the site.
14. As an OT/IT platform engineer, I want every external provider to have timeout, empty-result, and unavailable fallbacks, so that third-party failures do not block the core workflow.
15. As an AI engineer, I want the Local Evidence Compiler to use fixed temporal windows, one-hop topology, recent changes, error-code lookup, and safety rules, so that its selection policy can be tested independently.
16. As an AI engineer, I want the compiler to have no access to benchmark root-cause labels, so that answer leakage is prevented.
17. As an AI engineer, I want Gemma outputs to be strictly structured, so that invalid responses can be rejected, retried, or recorded.
18. As an AI engineer, I want model-generated information needs to be separated from actual query construction, so that arbitrary searches and prompt-injection risks are constrained.
19. As an AI engineer, I want model weights, prompts, incident data, and logs to remain local by default, so that data residency is demonstrable.
20. As an AI engineer, I want SerpAPI packaged as an independent plugin that registers only in `Network ON` and searches only allowlisted domains, so that connected enrichment does not contaminate the local core architecture.
21. As an AI engineer, I want `Network OFF` to block every outbound request at the transport layer even when an API key exists, so that fully offline operation is demonstrable.
22. As a judge, I want to see the same local Gemma model produce side-by-side results under different input strategies, so that I can understand how compact evidence affects device resources and decision quality.
23. As a judge, I want accuracy, risk, token, and latency measurements generated by real runs, so that I can distinguish a reproducible experiment from a cherry-picked demo.
24. As a judge, I want to see the primary flow complete after the network is disconnected, together with real-device latency and memory data, so that I know the project is not a cloud API wrapper.
25. As a project maintainer, I want to export each run's inputs, Capsule, model output, tool calls, and scores, so that the Kaggle write-up and later experiments are reproducible.

## Implementation Decisions

### 1. Incident Data and Simulator

- The MVP covers one asset type only: a railway point-machine actuator.
- The dataset contains six synthetic incident fixtures spanning telemetry, current alarm, recent maintenance records, one-hop topology, manual entries, and safety rules.
- Each case defines its expected next check, allowed actions, forbidden actions, and no more than two rounds of deterministic simulator results.
- Root-cause labels are available only to the scorer and never enter an input-strategy pipeline.
- At least one case must depend materially on an unstructured maintenance note or conflicting manual information, proving that the task is not merely structured classification.

### 2. Local Evidence Compiler Deep Module

- The Local Evidence Compiler is the central deterministic module. Behind a small stable interface, it encapsulates temporal slicing, topology expansion, recent-change association, error-code retrieval, safety-rule injection, token budgeting, and evidence ranking.
- The compilation policy is identical across all cases and contains no fixture-specific fault logic.
- The output is an immutable, versioned Incident Capsule.
- A Capsule includes incident summary, evidence, provenance, temporal relations, allowed actions, forbidden actions, missing information, and version metadata.
- Capsule updates preserve a parent-version reference so tool results and decision changes can be replayed.

### 3. Local Data and SerpAPI Add-on Plugin

- The Local provider and SerpAPI plugin implement one minimal evidence-provider contract but are packaged separately; the core application must not statically depend on the SerpAPI SDK.
- The Local provider supplies internal manuals, maintenance records, and fixture data and is the default offline-capable source.
- The SerpAPI plugin retrieves public web material only from manufacturer, regulator, and pre-approved technical sources.
- Register the plugin dynamically only when `network_mode=on`, the user enables the add-on, and `SERPAPI_API_KEY` exists. If any condition is false, do not initialize its client.
- Isolate the plugin from local inference. Enabling or disabling it must never unload, replace, or remote Gemma 4.
- Local manual fixtures must support every core case. SerpAPI serves only one or two explicitly labeled connected-mode extension cases.

### 4. Network Modes and External Evidence Policy

- `Network OFF` is the startup default and mandatory for the core benchmark. In this mode, a transport guard rejects every outbound request and the SerpAPI plugin reports `unavailable_by_policy`.
- `Network ON` enables only the SerpAPI add-on, not remote model inference, telemetry uploads, or arbitrary URL requests.
- The system always evaluates the local Capsule first. A SerpAPI call is permitted only when a specific public fact required for the next decision is missing.
- Gemma may emit only a structured information need. A deterministic router selects the provider, allowlisted domains, query terms, and call budget.
- The user must explicitly switch to `Network ON` and enable `SerpAPI Add-on`. The budget is one query per round and two per incident.
- External results never become actions directly. They are converted into evidence records, followed by Capsule recompilation and another inference step.
- Each external evidence item includes at least an evidence ID, fact, source type, original URL, provider, retrieval timestamp, document timestamp, trust class, and licensing metadata when applicable.
- External content cannot override local safety rules, expand the action allowlist, or trigger automatic equipment control.
- When external tools are unavailable, the system returns an explicit degraded state and never silently switches to unsourced generation.

### 5. Gemma Decision Engine

- A single Gemma session consumes the Capsule. The MVP does not use an additional evidence-selection model, avoiding confusion between local-input gains and extra inference compute.
- The model may only select an allowed action, request one missing piece of evidence, or return `insufficient_evidence`.
- The response contains the next check, cited evidence IDs, confidence, and a short rationale.
- A schema validation failure permits only one deterministic repair or retry. A second failure is recorded as an invalid output.
- The model does not generate signal features from raw telemetry and cannot execute control commands directly.

### 6. On-Device Inference Runtime

- The core demo and benchmark run on a local device and never call a remote inference API.
- The application layer depends on one inference contract. Prefer the local backend that runs Gemma 4 most reliably on the target hardware, such as Ollama or llama.cpp.
- `ASK-GPU-01` is the opening hardware decision gate: ask the organizers whether the team can actually develop and demo on an NVIDIA GPU, whether dependencies may be installed, which driver/CUDA versions are available, how long access lasts, and whether the machine supports an offline demo.
- If confirmed, prioritize SGLang, vLLM, TensorRT-LLM, Dynamo, NIM, or another NVIDIA-compatible runtime on that local NVIDIA machine and enter the NVIDIA GPU Challenge. If unavailable, use the Ollama/llama.cpp path on the team laptop.
- The NVIDIA GPU Challenge is an additional prize and does not change the single selected `Edge / On-Device` track. Cloud GPU results do not count toward the core on-device result.
- Lock the target device, model variant, quantization, and backend within 30 minutes of the `ASK-GPU-01` answer to avoid spreading effort across runtimes.
- Record device model, CPU/GPU/NPU, RAM/VRAM, OS, runtime, model, quantization, package size, input/output tokens, time to first token, total latency, and peak memory for every run.
- If a larger variant misses memory or interactive-latency targets, reduce quantization or switch to a smaller variant; never use remote inference as a silent fallback.

### 7. Demo Interface

- The interface supports one primary story: a point machine receives a movement command, but its position feedback does not change.
- The main view shows the raw incident timeline, current Capsule, Gemma decision, cited evidence, safety boundary, and version changes.
- A comparison view displays Raw/Retrieval and Capsule outputs side by side.
- Every external call visibly shows the provider, reason for the query, fields sent externally, and returned sources.
- A fixed header shows `ON-DEVICE`, current hardware, runtime, model quantization, `Network OFF/ON`, SerpAPI plugin state, and per-run memory and latency.
- The demo script is fixed: complete the primary incident loop in `Network OFF` → show zero outbound requests → switch to `Network ON` → enable the SerpAPI plugin → complete one sourced enrichment query → let local Gemma decide again.
- Demo success does not depend on complex graphics, a general-purpose chat interface, or a real equipment connection.

### 8. Benchmark Harness Deep Module

- Core comparisons include a Deterministic/Rule baseline, Raw, BM25 Retrieval, and Capsule.
- Optional comparisons include a Direct Tool Agent and Gemma E2B, E4B, and a larger reference model.
- All local-input strategies use the same model version, inference parameters, maximum input budget, output schema, case order, and tool budget.
- The primary on-device benchmark disables every external API and measures quality, speed, and resource use on the target device.
- A separate connected-enrichment benchmark uses no more than two missing-information case variants and compares Capsule only with Capsule plus SerpAPI. These results do not count toward the core offline success criteria.
- Per-case raw results are retained; aggregate averages alone are insufficient.

### 9. Observability and Audit

- Every run receives a unique run ID and records model configuration, input strategy, hardware, network state, token use, first-token/total latency, peak memory, output validation, tool calls, and scorer result.
- Capsules and decision traces can be exported for the Kaggle write-up, public repository, and live presentation.
- API keys are supplied only through environment variables or secret management and never enter logs, Capsules, or public deliverables.

## Testing Decisions

Good tests verify externally observable behavior and invariants rather than internal function structure or exact prompt wording. Because the repository currently has no product code or prior tests, the MVP begins with fixture-driven contract tests.

### Modules Requiring Tests

- Local Evidence Compiler: identical inputs produce identical Capsules; temporal, topology, and recent-maintenance rules work; labels are inaccessible; token budgets are respected.
- Safety Policy: forbidden actions never enter the executable allowlist; external evidence cannot override local safety rules.
- Capsule Schema: version, evidence reference, provenance, and action fields are complete; invalid references are rejected.
- Evidence Normalizer: SerpAPI and local fixtures become the same evidence structure; untrusted or unsourced records are rejected or downgraded.
- External Query Router: only explicit information gaps trigger calls; outgoing fields are minimized; domain allowlists and call budgets are enforced.
- Network Mode Guard: `OFF` blocks every outbound HTTP/DNS request even when an API key exists; `ON` allows only the SerpAPI plugin to reach approved endpoints and cannot enable remote inference.
- Gemma Adapter: the selected local backend produces the shared internal response structure; timeouts, invalid JSON, out-of-memory errors, and unavailable models produce explicit failures without silently calling the cloud.
- Device Metrics: time to first token, total latency, peak memory, and token counts are collected reproducibly; unsupported measurements are marked unavailable.
- Incident Simulator: every allowed action returns deterministic, reproducible inspection results; the two-round limit is enforced.
- Benchmark Scorer: correct actions, forbidden actions, citation validity, tokens, and latency are scored consistently.

### Integration and End-to-End Tests

- Run one complete incident from fixture through Capsule V1, Gemma decision, simulated inspection, Capsule V2, and final recommendation.
- Run Raw, Retrieval, and Capsule with identical cases and model configuration, verifying equivalent resource constraints.
- Disable network access and run local cases, verifying that no external provider is called implicitly.
- Simulate SerpAPI timeouts, empty results, rate limits, and invalid payloads, verifying safe degradation.
- Run the complete core test suite without an API key and with networking disabled, verifying zero outbound requests and no remote inference.
- With a valid API key present, switch `Network OFF → ON → OFF` and verify dynamic plugin registration/unregistration, audit records, and transport enforcement.
- Run one real SerpAPI extension case in `Network ON`, verify resolvable evidence provenance, and confirm subsequent Gemma inference still uses the same local runtime.
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
- Uploading real sensitive OT data to SerpAPI, remote inference services, or any other external service.
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
| SerpAPI returns low-quality or malicious pages | Use domain allowlists, source grading, normalization, safety-rule priority, and prompt-injection tests |
| SerpAPI weakens the on-device story | Default it to off, complete the primary demo offline first, and present connected enrichment as a separate bonus |
| On-site NVIDIA GPU availability is uncertain | Complete `ASK-GPU-01` immediately; prepare validated GPU and laptop configurations; never let GPU availability block the Edge submission |
| The NVIDIA environment cannot run offline or disallows dependency installation | Retain the laptop-local core demo and claim GPU Challenge eligibility only when the deployment is verifiable |
| The model does not fit or is too slow on the target device | Lock hardware and quantization early, pre-download weights, prepare a smaller variant, and do not use cloud inference as the core fallback |
| Local runtime installation or driver failure | Cache dependencies and weights in advance; retain a second validated local runtime or reproducible recording |
| The sample is too small | Frame results as mechanism validation, make no industrial generalization, and publish fixtures and run records |

### One-Day Hackathon Priority

1. At check-in, complete `ASK-GPU-01` with the organizers: confirm NVIDIA GPU access, drivers, installation permissions, access duration, and offline capability.
2. Lock either the NVIDIA-local or laptop-local path and run Gemma structured output in `Network OFF`.
3. Build six fixtures, the shared schema, a deterministic baseline, and device-metric collection.
4. Implement Raw, BM25, and Capsule local-input pipelines, then complete the first on-device benchmark and two-round simulator loop.
5. Build a minimal UI showing `Network OFF/ON`, plugin status, hardware, and outbound-request count.
6. Optimize memory and latency until the primary demo runs repeatedly in `Network OFF`.
7. Integrate the dynamically loaded SerpAPI add-on and complete one real, auditable `Network ON` enrichment flow.
8. Address extra model comparisons, deeper NVIDIA runtime optimization, and visual polish last.

### Product Judgment

Fault Capsule is an on-device technical angle on a real problem, not a product category with no incumbents. The hackathon objective is to test whether local Gemma 4 can complete a useful maintenance decision loop under explicit device-resource, safety, and offline constraints. Moving beyond the prototype requires user interviews confirming that current maintenance tools leave a meaningful gap in offline operation, data residency, field latency, or small-model deployment.

### References

- [Full plan review and market research](./HACKATHON_PLAN.md)
- [Locally saved official competition and prize rules](./prize.md)
- [Paris Gemma 4 Hackathon event page](https://luma.com/uypemayx)
- [SerpAPI Google Search API](https://serpapi.com/search-api)
- [SerpAPI Organic Results schema](https://serpapi.com/organic-results)
