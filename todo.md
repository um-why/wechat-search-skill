# wechat-search-skill 问题与优化后档

| 项 | 内容 |
|----|------|
| 审查日期 | 2026-11-07 |
| 最近优化 | 2026-11-07（对照 `D:\Git\douyin-search-claw` 迁移契约） |
| 技能版本 | 1.1.2 |
| 范围 | 本仓库 JS Skill（`SKILL.md` + `scripts/` + `assets/` + `references/`）及其对 `guaikei` 后端 `/api/wechat/*` 的依赖 |
| 后端对照 | `D:\Git\guaikei\server\app\wechat\{article,video}.go`、`service/router.go`、`mcp/*`；参考实现 `douyin-search-claw` |
| 用法 | 逐条处理后将 `[ ]` 改为 `[x]`，可在「备注」补 PR / 提交 / 日期 |
| 建议顺序 | P0 → P1 → P2 → P3；Agent 适配与文档可与 P0/P1 并行 |

---

## 0. 项目定位（审查结论摘要）

本 Skill 是面向「普罗大众 / AI Agent」的 **CLI 封装层**：通过 `GUAIKEI_API_TOKEN` 调用 guaikei 开放 API，走「创建异步任务 → 轮询结果」协议，输出文章/视频搜索 JSON。

同厂后端已为抖音、小红书、快手、TikTok 提供 **MCP 工具**（`server/mcp/*`），**微信搜一搜尚无 MCP 注册**。JS Skill 是当前微信能力对 Agent 的主入口。

**1.1.0 已对齐 douyin-search-claw 的核心契约**：统一 JSON 信封、stderr 日志、退出码、Header TOKEN、轮询/错误分类、fail-fast 参数校验、PLAN_LIMIT 等业务码映射、Agent 向 SKILL 文档。

---

## 1. 全部问题清单

### P0 — Critical（正确性 / 可用性 / 安全，优先修）

- [x] **P0-1 查询轮询用指数退避 + 60 次，大 limit 几乎必炸**
  - 备注：2026-11-07 对齐 claw：`QUERY_MAX_ATTEMPTS=20`；`pollTaskResult` 与创建重试分离；退避 `min(2^n*2s, 60s)`

- [x] **P0-2 不可重试错误被盲目重试**
  - 备注：`noRetry` + `backendCodes.js` errmsg 优先映射 2/14/15/18（1.1.1 修正日限 18，不再误用 17）；`classifyPollError`；AUTH 立即失败

- [x] **P0-3 stdout 被 Banner/彩色日志污染，Agent 无法稳定解析**
  - 备注：日志一律 stderr；stdout 仅信封 JSON（同 claw，无需单独 `--json`）

- [x] **P0-4 进程退出码不规范**
  - 备注：0 成功/empty；2 参数；3 鉴权；1 其它；`writeJsonAndExit` flush

- [x] **P0-5 Token 走 QueryString，易进代理/访问日志**
  - 备注：Skill 侧改 Header `TOKEN`；query 不再带 token。后端仍兼容 query（guaikei M7）待后端收口

- [x] **P0-6 文档承诺「图片搜索」但无实现**
  - 备注：SKILL / package description 已删除图片能力；WHEN NOT 写明不支持

### P1 — High（协议/文档不一致，导致 Agent 误调用）

- [x] **P1-1 `SKILL.md` 与 CLI 鉴权方式矛盾**
  - 备注：明确仅环境变量；禁止 argv 传 token

- [x] **P1-2 文章 CLI Help / 示例参数错误**
  - 备注：help 改为 `--publishTime`/`-t`；去掉错误的 `--duration`

- [x] **P1-3 `references/options.md` 多处错误**
  - 备注：缩写与脚本对齐；视频章节命令修正

- [x] **P1-4 Schema 文案与代码枚举语义不一致**
  - 备注：sort=综合；新增 `assets/output_envelope.schema.json`；条目 schema 标明属于 results[]

- [ ] **P1-5 视频结果无稳定打开链接**
  - 位置：后端 `WxVideoSearchResult` 无 `url`
  - 影响：Agent 无法给用户可点击链接
  - 方向：后端补链或文档拼装规则；Skill schema 已注明现状
  - 备注：需 guaikei 后端改动，本仓无法单独闭环

- [x] **P1-6 创建成功 ≠ 有结果：缺 TIMEOUT / 续等协议**
  - 备注：`TIMEOUT` +「同参再调」；SKILL §5/§3 写死

- [x] **P1-7 空结果与失败混淆**
  - 备注：empty 用 INFO + `emitEmpty`；exit 0

- [x] **P1-8 包月 TOKEN `limit>20`、余额预检、日频控未在 Skill 文档暴露**
  - 备注：PLAN_LIMIT≤20；INSUFFICIENT_BALANCE / RATE_LIMITED / DAILY_LIMIT；默认 limit=10

- [x] **P1-9 无 `.gitignore`，`logs/` 可能进仓库**
  - 备注：已加 `.gitignore`（logs/、.env*）

### P2 — Medium（工程质量 / 与后端耦合）

- [ ] **P2-1 与 guaikei 任务链路隐患同构（后端 TODO H1/H2）**
  - 备注：Skill 侧 TIMEOUT 文案已友好；入队/计费顺序仍属后端

- [x] **P2-2 客户端轮询窗 vs 服务端结果窗不对齐**
  - 备注：SKILL/options 写明约 9 分钟复用、约 15 分钟可查；轮询次数与 claw 对齐（仍可能长等，与 claw 同量级）

- [x] **P2-3 `optionFormat` / `Number(x)||默认` 吞掉合法边界**
  - 备注：改为 `assertArticleOptions` / `assertVideoOptions` fail-fast + `parseDecimalInteger`

- [x] **P2-4 关键词清洗过激**
  - 备注：`normalizeKeyword` 仅整理空白；信封含 `keyword_raw` / `keyword`

- [ ] **P2-5 无单测 / 无契约测试**
  - 方向：`node:test` 覆盖 parseArgs / classifyPollError（claw 亦未完成）

- [ ] **P2-6 无依赖锁定与可安装性说明**
  - 方向：补 readme 安装路径（Cursor Skill / Agent Store）

- [x] **P2-7 HTTPS 仅 host 字符串、无代理/自定义 Base URL**
  - 备注：支持 `GUAIKEI_API_HOST`（默认 www.guaikei.com）

- [ ] **P2-8 文章/视频 CLI 大量重复**
  - 方向：可再抽 `runSearchCli`（claw 五套 CLI 亦仍重复，P2-9 未做）

- [x] **P2-9 `timestamp: toLocaleString()` 非 ISO**
  - 备注：改为固定北京时间格式（与 claw 一致），消除 locale 漂移

- [x] **P2-10 Contact / 营销文案进入运行时**
  - 备注：token.js / SKILL 仅留官网；去掉手机号与营销解锁文案

### P3 — Low / 产品缺口

- [ ] **P3-1 微信能力未进 guaikei MCP**
  - 方向：后端 `mcp/wechat/*`（跨仓库）

- [x] **P3-2 缺少「给用户看的摘要策略」指令**
  - 备注：SKILL §4 要求只摘关键字段

- [ ] **P3-3 无分页/游标，大 limit 贵且慢**
  - 备注：文档已约束默认 10 / 包月 20；软上限 50 仍可选

- [x] **P3-4 无图片/公众号主页/文章正文详情**
  - 备注：未交付能力已从 description 移除并写 WHEN NOT（能力本身仍未做）

- [ ] **P3-5 多 Agent 运行时安装碎片化**
  - 方向：可选 `agents/*.md` 薄适配

- [x] **P3-6 无版本协商 / User-Agent**
  - 备注：`User-Agent: wechat-search-skill/<ver>` + query `skill_name`

---

## 2. 优化方向（宏观 → 可执行）

### 2.1 北极星目标

让任意主流 Agent（Cursor、Codex、Workbuddy 等）在 **GLM / DeepSeek / Kimi / GPT / Claude / Gemini / Grok** 驱动下都能：

1. **发现**：description 触发准（不过触发、不漏触发）
2. **调用**：一条可复制命令，参数枚举零歧义
3. **解析**：stdout = 稳定 JSON 信封
4. **恢复**：TIMEOUT/AUTH/QUOTA 行为确定、禁止有害重试
5. **呈现**：对用户摘要，不倾倒原始 JSON

### 2.2 架构演进（推荐三阶段）

| 阶段 | 做什么 | 产出 |
|------|--------|------|
| **A. Skill 硬化** | P0+P1（本仓 1.1.0 已完成主体） | Agent 立即可用 |
| **B. 协议对齐 MCP** | 微信补 MCP；双入口同源 | 跨客户端一致 |
| **C. 产品加深** | 视频 url、图片、详情 | 差异化 |

### 2.3～2.6

见历史审查结论；实现细节以当前代码与 `SKILL.md` 为准。信封字段以 `assets/output_envelope.schema.json` 为准（对齐 claw，非早期草稿中的 `timeout` 四态 status）。

---

## 3. 多模型 / 多 Agent 适配策略

### 3.3 具体可做清单（Agent UX）

- [x] **A1** 重写 `SKILL.md` description（去图片、补 WHEN NOT、双语触发词）
- [x] **A2** 增加「LLM 调用规则」：鉴权仅 env、默认 limit、TIMEOUT/AUTH 协议、摘要呈现
- [x] **A3** CLI 增加 `--json`（或等价安静模式）
  - 备注：采用 claw 方案——默认 stdout 纯 JSON / stderr 日志，无需额外 flag
- [x] **A4** 错误码与稳定字符串对齐（`AUTH_*`/`TIMEOUT`/`PLAN_LIMIT`/…）
- [ ] **A5** 提供 `examples/agent-happy-path.md`
- [ ] **A6** （可选）`agents/cursor.md` / `agents/codex.md`

---

## 4. 建议实施排期（供跟进）

| 迭代 | 范围 | 状态 |
|------|------|------|
| **I1** | P0 全量 + P1-1~4 + A1–A3 | **已完成（1.1.0）** |
| **I2** | P1-6~9、信封、A4、gitignore | **已完成（1.1.0）** |
| **I3** | 单测、readme、CLI 抽公共 | 待做 |
| **I4** | 微信 MCP + 视频 url（后端） | 待做 |

---

## 5. 已确认相对稳健（无需立刻改，供对照）

- 无第三方 npm 依赖，Node ≥16 即可跑
- 创建接口 9 分钟同参去重
- 关键词长度与后端 50 字校验基本对齐
- 1.1.0 起与 douyin-search-claw 共享同一套 Agent 契约模式

---

## 6. 进度跟踪

| 优先级 | 条目约数 | 已完成 |
|--------|----------|--------|
| P0 Critical | 6 | 6 |
| P1 High | 9 | 8 |
| P2 Medium | 10 | 6 |
| P3 Low/产品 | 6 | 3 |
| Agent UX (A*) | 6 | 4 |
| **合计** | **37** | **27** |

---

## 7. 变更记录

| 日期 | 说明 |
|------|------|
| 2026-11-07 | 初版：全量问题 + 优化方向 + 多模型/Agent 适配 |
| 2026-11-14 | P1-10 方向 A：新增 `references/faq.md`；SKILL 双壳例与「cmd 只用双引号」；版本 1.1.2 |
| 2026-11-10 | 对齐抖音 P2-4/P2-5：`finishSuccess` 先落盘再 drain stdout 后 exit；不升版本 |
| 2026-11-07 | 对照 `douyin-search-claw` 落地 1.1.0：信封/退出码/Header TOKEN/轮询分类/业务码映射/fail-fast/文档与 schema；勾选已完成项 |
