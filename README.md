# Fault Capsule — Person 3 Console

面向合成铁路道岔执行器事故的 on-device 诊断演示界面。项目使用 React、TypeScript、Three.js 和 Motion，实现了：

- 默认 `Network OFF`、SerpAPI 插件未加载、出站计数为零；
- `Capsule V1 → 本地 Gemma 决策 → 模拟现场检查 → Capsule V2 → 再决策` 两轮交互；
- 可旋转、缩放、部件选择和自动聚焦的道岔转辙机 3D 数字孪生；
- 尖轨、转辙机和 X3 接头支持悬停高亮、点击检查与证据联动，并提供键盘/触屏控制栏；
- 事故时间线、证据引用、禁止动作、Token 预算与设备性能指标；
- 可选联网证据面板，显示最小化查询字段和归一化来源；
- Mock 与 HTTP 两套网关实现，为后续 Person 1/2 的后端留出稳定边界。

> 当前事故、模型回复、指标和外部证据均为演示数据。本项目不是安全认证控制器，也不连接或控制真实铁路设备。

## 本地运行

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

## 演示路径

1. 在 3D 场景中点击 point machine、switch blade 或 X3 connector，查看部件状态和关联证据。
2. 保持顶部 `NETWORK OFF`，点击 `Start local diagnosis`。
3. 查看 Gemma 选择的白名单检查、引用证据和性能指标。
4. 选择 X3 connector，点击 `Run isolated X3 inspection`，观察检查结果写入 Capsule V2。
5. 确认离线流程中的 `OUTBOUND 0`。
6. 切换 `NETWORK ON`，启用 SerpAPI add-on，再获取一条公开维护证据。

## 后端接入边界

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

## 代码结构

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
