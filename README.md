# Fault Capsule

**An auditable maintenance decision assistant for railway point machines, powered by Gemma 4.**

A deterministic, label-blind *Local Evidence Compiler* turns scattered incident data (telemetry, alarms, maintenance history, topology, manuals, safety rules) into a compact, versioned, token-budgeted **Incident Capsule**. Gemma 4 then performs constrained reasoning over the capsule: it picks the single next *safe* inspection action from a whitelist, cites its evidence, or explicitly abstains.

Everything runs on the technician's own machine: a 4.1 GB Q4_K_M build of `gemma-4-E2B-it` under Ollama, network off by default, zero outbound requests.

Built in one day at the **Paris Gemma 4 Hackathon** (July 25, 2026, 42 Paris) — track: **Edge / On-Device**.

```text
On-site incident data
  → deterministic Local Evidence Compiler
  → Incident Capsule V1
  → Gemma 4 constrained decision (action from whitelist + evidence citations)
  → deterministic inspection simulator
  → Incident Capsule V2
  → next decision, or stop and hand over to a human
```

## Why

After an industrial failure, maintenance staff reconstruct "what is going on" across telemetry, alarm logs, work orders, asset topology, manuals and safety rules. More context is not better: a long raw history buries the one recent change that matters. Fault Capsule shows that a **small language model + engineered context beats raw context dumps** — with every recommendation auditable: each decision cites evidence IDs that resolve in the exact capsule version the model saw.

## Quickstart

Requires [uv](https://docs.astral.sh/uv/) and Python ≥ 3.12.

```bash
uv sync

# Demo UI (starts in Network OFF with a deterministic mock adapter)
uv run uvicorn faultcapsule.app:app --port 8080
# open http://localhost:8080

# Benchmark: 6 incidents × 4 strategies × 2 rounds, offline
uv run python -m faultcapsule.benchmark --mock
```

### Using Gemma 4 (API)

```bash
cp .env.example .env   # add OPENROUTER_API_KEY or GOOGLE_API_KEY
uv run python -m faultcapsule.benchmark --network-on
```

Provider selection: `OPENROUTER_API_KEY` → OpenRouter, else `GOOGLE_API_KEY` → Google AI Studio (OpenAI-compat endpoint), else deterministic mock. Model set by `GEMMA_MODEL` (default `google/gemma-4-E2B-it`). The adapter interface is backend-agnostic so a local runtime (Ollama / llama.cpp) drops in without touching the rest of the system.

## Architecture

| Module | Role |
|---|---|
| `faultcapsule/schemas.py` | Frozen Pydantic contracts shared by all modules |
| `faultcapsule/fixtures/` | 6 synthetic railway point-machine incidents with scorer-only labels |
| `faultcapsule/compiler.py` | Deterministic, label-blind, LLM-free evidence compiler → versioned Capsules |
| `faultcapsule/simulator.py` | Deterministic two-round inspection simulator |
| `faultcapsule/inference.py` | `InferenceAdapter` (OpenRouter / AI Studio / mock), strict JSON + 1 repair retry |
| `faultcapsule/strategies.py` | Benchmark inputs: rule baseline, raw dump, BM25 retrieval, Capsule |
| `faultcapsule/benchmark.py` | Scoring: action accuracy, unsafe rate, citation validity, schema failures, abstention, latency/tokens |
| `faultcapsule/network.py` | Network guard: startup default OFF, blocks + counts every outbound request |
| `faultcapsule/serpapi_plugin.py` | Optional SerpAPI evidence add-on (network ON + opt-in + key), minimized queries, trust-classed results |
| `faultcapsule/app.py` + `web/` | FastAPI demo UI: capsule view, decision, citations, metrics, network state |

## Safety model

- Actions come only from a per-incident whitelist; forbidden actions are never executable and choosing one is scored *unsafe*.
- The compiler never reads root-cause labels and never calls a model.
- Safety rules are always injected into the capsule, above the token budget.
- The model must cite evidence IDs that resolve in its capsule, and may abstain (`insufficient_evidence`) instead of guessing.
- Startup default is **Network OFF**: a configured API key does not bypass the transport-level guard, and the UI shows a live outbound-request counter.
- Web evidence (SerpAPI add-on) is trust-classed `public`, injection-filtered, and clearly marked `UNTRUSTED PUBLIC SOURCE` inside the capsule.

This is a maintenance decision-support prototype, **not** a safety-certified controller.

## Rail Dashboard — React console (`src/`)
面向合成铁路道岔执行器事故的 on-device 诊断演示界面。项目使用 React、TypeScript、Three.js 和 Motion，实现了：

- 默认 `Network OFF`、SerpAPI 插件未加载、出站计数为零；
- `Capsule V1 → 本地 Gemma 决策 → 模拟现场检查 → Capsule V2 → 再决策` 两轮交互；
- 可旋转、缩放、部件选择和自动聚焦的道岔转辙机 3D 数字孪生；
- 尖轨、转辙机和 X3 接头支持悬停高亮、点击检查与证据联动，并提供键盘/触屏控制栏；
- 事故时间线、证据引用、禁止动作、Token 预算与设备性能指标；
- 可选联网证据面板，显示最小化查询字段和归一化来源；
- Mock 与 HTTP 两套网关实现，为后续 Person 1/2 的后端留出稳定边界。

> 当前事故、模型回复、指标和外部证据均为演示数据。本项目不是安全认证控制器，也不连接或控制真实铁路设备。

### 本地运行

```bash
npm install
npm run dev
```

质量检查：

```bash
npm run lint
npm test
npm run build
```

### 演示路径

1. 在 3D 场景中点击 point machine、switch blade 或 X3 connector，查看部件状态和关联证据。
2. 保持顶部 `NETWORK OFF`，点击 `Start local diagnosis`。
3. 查看 Gemma 选择的白名单检查、引用证据和性能指标。
4. 选择 X3 connector，点击 `Run isolated X3 inspection`，观察检查结果写入 Capsule V2。
5. 确认离线流程中的 `OUTBOUND 0`。
6. 切换 `NETWORK ON`，启用 SerpAPI add-on，再获取一条公开维护证据。

### 后端接入边界

默认使用 `DemoDiagnosticGateway`。设置 `.env` 中的 `VITE_API_BASE_URL` 后切换为 `HttpDiagnosticGateway`：

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
```

前端只依赖 [领域接口](./src/types/domain.ts)，HTTP 适配器位于 [gateway.ts](./src/services/gateway.ts)。预留端点：

| Method | Endpoint | Contract |
|---|---|---|
| `GET` | `/api/incidents/active` | `IncidentFixture` |
| `POST` | `/api/inference` | `{ capsule } → InferenceResult` |
| `POST` | `/api/incidents/:id/inspections` | `{ actionId } → InspectionRunResult` |
| `POST` | `/api/evidence/serpapi` | `InformationNeed → EvidenceSearchResult` |

`Network OFF` 时 HTTP 网关只允许 loopback 地址，并拒绝非本地目标。真正的 DNS/HTTP 系统级封锁、SerpAPI 密钥管理和允许域名策略仍应由后端 transport guard 强制执行；前端状态不是安全边界。

### 代码结构

```text
src/
├── components/        UI、3D 场景和交互面板
├── data/              合成 PM-18 事故与演示输出
├── hooks/             异步流程编排
├── services/          Mock / HTTP 后端适配器
├── state/             可测试的诊断与网络状态机
└── types/             Person 1/2/3 共享领域契约
```

Three.js 场景通过动态 import 独立拆包；界面不加载远程字体、图片或分析脚本，并支持 `prefers-reduced-motion`。

## License

[MIT](LICENSE)
