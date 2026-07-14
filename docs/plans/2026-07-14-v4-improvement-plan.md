# V4 改版计划（2026-07-14）

> 做完一项划掉一项。拍板人：马克。执行：Claude（Fable 5 编排 + Sonnet 执行）。

## 背景事实（2026-07-14 盘点结论）

- 线上 asi-mark.cn（Cloudflare Pages）跑的是 **2026-04-16 的旧构建**：足迹板块是黑底地球仪，从 unpkg 拉 GeoJSON 被 CORS 拒，永远卡在「加载全球数据…」。
- GitHub（Ronaldomder7/mark-portfolio）与本地同步，4-23 已回滚到 SVG 地图，但 **CF Pages 不是接 GitHub 自动构建的**——当时是手动上传 `out/`（`out/` 在 .gitignore 里），本机 wrangler 未登录。
- 「最近在想」停在 2026-04-10，内容是 1-2 月的 flomo；scan→publish 管线完好，只是没人触发。
- 导航「作品」指向 `#works`，页面里没有这个 id（实际是 `#experience`），死链；useAvatarState 的 works 区动画同因永不触发。
- 数字口径冲突：static.json 写抖音 2 万粉（**实际 4.7 万**）、13 个 Skill；worker 分身说 14 个 Skill、全平台 7 万粉。
- 死代码 1326 行（ChinaGlobeMap/ChinaParticleMap）+ 孤儿组件（ScrollArrow/AnimatedNumber）+ public/ 约 4.9MB 无引用资源。
- 城市照片 83 张，无字节级重复，但有视觉重复场景 + 质量参差（马克确认丑）。

## 马克拍板记录（2026-07-14）

1. 摄像头手势模式 → **砍掉**。
2. 地球仪太丑 → 先上线 SVG 版止血；**3D 高级化方向等外部调研回来再拍**。
3. 城市照片 → 全部重审，删重复场景，重挑。
4. 抖音粉丝 → **4.7 万**，全站统一口径。
5. 太空人 → 保留（马克亲手做的），修行为：不许横躺在正文上。
6. 项目在知识库无沉淀 → `马克的Idea/` 建档。
7. 向外调研 X 上 vibe coding 网站的交互 → 要更高级，不盲目跟风。

---

## Phase 0 · 止血（今天）

- [x] 0.1 移除摄像头手势：ChinaMap.tsx 的 camera 模式分支、MapGesturePrompt.tsx、useHandTracking.ts、`@mediapipe/tasks-vision` 依赖，全部删除；鼠标模式保持原样
- [x] 0.2 删死代码：ChinaGlobeMap.tsx、ChinaParticleMap.tsx、ScrollArrow.tsx、AnimatedNumber.tsx、`react-globe.gl` 依赖、public/globe/
- [x] 0.3 清 public/ 孤儿资源（**删前逐个 grep 确认零引用**）：avatar.png、photo.jpg、wechat-qr.jpg、avatar-nobg-small.png、next.svg / vercel.svg / globe.svg / window.svg / file.svg —— 全部 9 个文件 grep 全代码确认零引用（含 docs/plans/ 也只是文字提及，非代码引用），全部删除，无需保留任何一个
- [x] 0.4 修导航死链：作品区 DOM id 统一为 `works`（page.tsx / Experience.tsx / Nav.tsx / useAvatarState.ts 四处口径一致）—— Nav.tsx 和 useAvatarState.ts 本来就已经用 `works`，实际只需把 Experience.tsx 的 `id="experience"` 改成 `id="works"`；顺带发现 FloatingArrow.tsx 的 SECTIONS 数组和初始 nextSection 也硬编码了 `"experience"`（未在原计划列出但同源死链，一并修复）
- [x] 0.5 太空人行为修正：睡眠/躺平只允许发生在 720px 版心之外或屏幕角落（进入睡眠先移动到停靠位）；滚动或鼠标移动立即唤醒；遮挡正文时降透明度 —— useAvatarState.ts 新增 `DOCK` action + `dockThenSleep()`（所有睡眠入口统一走这里，先走到右下角停靠位再睡，走位失败 6s 超时兜底）+ `dimmed` 返回值（水平遮挡 720px 版心时降到 0.35）+ scroll 唤醒监听；Avatar3D.tsx 新增 `isMobile`（<768px 或触屏）整体隐藏 3D 头像 + 应用 dimmed 透明度；AvatarCompanion.tsx（无 WebGL 兜底路径）做了同等的停靠/唤醒/降透明度小实现，保持两条路径行为一致。单测新增 2 条覆盖 DOCK action，60 个测试全过
- [x] 0.6 数字口径统一：static.json 抖音 2万→**4.7万**（experience[0].summary + highlights）；worker/chat-worker.js 分身人设同步抖音 4.7 万（timeline 里「2024.8 一个月 0→2万」是当月史实，保留不动）；「14个自定义 AI Skill」改成「13 个」，与 static.json/worker 自身另一处口径一致 —— 判断记录：worker 里原文是「全平台 7 万+ 粉丝」而非明确写「抖音」，但计划背景事实明确把它列为与「抖音 4.7 万」冲突的口径且拍板记录写明「抖音粉丝→4.7万，全站统一口径」，故按此判断改成「抖音 4.7 万+ 粉丝」（不是笼统的全平台数字），如判断有误请马克指正
- [x] 0.7 移动端修复：nav 两字词禁止竖排拆行；「右键复位」文案触屏隐藏 —— Nav.tsx 给 `<a>` 加 `whitespace-nowrap shrink-0`（防止 CJK 逐字换行）+ 外层容器 `overflow-x-auto`（超窄屏可横滑兜底，不裁切）；Hero.tsx 新增 `isTouch` 检测（`ontouchstart`/`maxTouchPoints`），触屏隐藏「· 右键复位」文案和对应 aria-label 片段，保留「拖动我」
- [x] 0.8 Footer「最后更新」是构建时间固化值 → 改成「构建于 {日期}」或删掉 —— 选了改文案（保留日期展示，只改措辞，不产生误导性的"实时更新"暗示）
- [x] 0.9 城市照片清理（审查报告已出）：按保留名单删 42 张、每城重新编号、cities.json 的 photoCount 同步、ChinaMap 对 photoCount=0 的城市（秦皇岛/杭州）不崩且有兜底文案 —— 用一次性脚本（两阶段 rename，先挪临时名再落编号，避免同城内编号冲突）执行删除+重编号，83→41 张，逐城校验（脚本核对 keep 索引确实存在）+ 事后用脚本比对 cities.json 的 photoCount 与实际文件数逐城全部一致；ChinaMap.tsx 相册弹窗对 photoCount===0 时不再渲染 `<Image>`（避免 404 裂图），改显示「照片待补」占位块，预加载 effect 同步跳过 photoCount===0 的城市
- [ ] 0.10 `npm run test` 全过 + `next build` 出新 out/
- [ ] 0.11 部署上线 ⚠️**需要马克**：选一个——
  - a) 马克跑一次 `wrangler login`，之后我用 `wrangler pages deploy out/` 上线（以后我可以自动部署）
  - b) 马克在 CF Pages dashboard 手动上传新 out/
  - c) （推荐顺手做）CF Pages 接 GitHub 自动构建，以后 push 即上线，彻底消灭「代码修了线上没修」这类事故

## Phase 1 · 内容升级（本周）

- [ ] 1.1 新增「造物」板块，形态定为**手记流而非卡片墙**（X 调研结论：缩略图卡片墙是 Lovable/v0 模板站的默认脸，最容易撞脸；swyx.io/ideas 式的按日期倒序"一行一物"最有品且贴读书笔记气质）。每行=日期 + 状态点（🟢在跑 🟡搁置 ⚫退役）+ 名字 + 一句人话「它替我干什么」+ 一个真实数字，可展开看两三句细节和截图。候选：coach-v2、选题工作台、coachboard、money-coach、boss-tracker、灵犀、口播白板、记忆系统（qdrant+graphiti）、OpenClaw（⚫退役，写清为什么退役——止损也是能力）
- [ ] 1.2 新增「找到我」账号区：抖音（4.7万）/小红书/公众号/GitHub/微信；粉丝数只允许存在一个 JSON 数据源
- [ ] 1.3 城市照片补图（需要马克）：审查后 7 城需补真照片——秦皇岛（0张可用，全是车内误拍）、杭州（0张，全是日程截图）、漳州（仅1张）、鹤壁（仅1张且糊）、河源（仅1张）、深圳（仅2张）、北京（当下主场城市却无一张好照片，优先补）
- [ ] 1.4 统计数字 build 时实测生成（Obsidian 篇数、skill 个数）写入 JSON；分身 worker prompt 从同一 JSON 生成，消灭 13/14 这类打架
- [ ] 1.5 「最近在想」刷新一次：手动跑 scan→publish，勾 5-8 条 2026 上半年的真想法

## Phase 2 · 体验升级（等调研报告拍板）

- [ ] 2.1 足迹地图高级化（调研已回，推荐序）：①水墨点染地图（宣纸底+墨点浓淡=停留深浅+飞白游线，纯 SVG/CSS + vanilla-tilt 微倾斜，工作量小-中）②印章地图（每城一方朱砂印，直接对应站点暗红，可与①合并：水墨底+印章标记）③纸雕地形 three.js 浮雕（matcap 材质、滚动驱动镜头、禁自由旋转，工作量大，可后置）。**待马克挑方向**
- [ ] 2.2 城市照片呈现形态重做（拍立得散落/胶片条/纵向长卷…等调研）
- [ ] 2.3 全站微交互按「高级感清单」过一遍（缓动、视差幅度、滚动编排）
- [ ] 2.4 scan→publish 触发器接 coach-v2 周日复盘（bot 问一句「这周哪条放网站？」回编号即发布）。跨系统改动，动手前过 coach-v2-change-control 红线
- [ ] 2.5 「系统在线」心跳展示，分两步走：
  - 2.5a 极简角标版（可先行，X 调研：中文 vibe coding 圈无先例，差异化空白）——页脚一行小字+暗红小圆点：「这个网站背后有 N 个后台服务在跑，最近自检 X 小时前」，时间戳直接取自 coach-v2/选题系统现有心跳日志，不新建监控基建
  - 2.5b 完整面板版（后置）：launchd 推各系统心跳 JSON → 页面渲染逐系统状态；参考 Upptime 思路但必须重新蒙皮成纸墨风（默认赛博朋克配色不能直接用）
- [ ] 2.6 标题区「光标邻近字重响应」（X 调研最值得偷的单点交互）：鼠标到字的距离映射可变字体字重，"读书笔记被指尖抚过"；只做标题、不变色、不全站铺。技术=一段 JS + font-variation-settings + 可变字重衬线字体

## Phase 3 · 沉淀

- [x] 3.1 `马克的Idea/` 建项目档案（2026-07-14 已建）
- [ ] 3.2 三份调研报告归档知识库
- [ ] 3.3 改版完成后写复盘，反哺档案

## 调研任务状态（2026-07-14 派出）

| 任务 | 状态 |
|---|---|
| X / 社区 vibe coding 个人网站案例 | ✅ 已回（结论落入 1.1 手记流 / 2.5a 心跳角标 / 2.6 字重响应 / 反面清单） |

**调研反面清单（全站铁律）**：不改鼠标指针、不做粒子/雪花/拖尾、不用 GitHub 贡献图变体（绿方块是程序员社交货币，不是读书笔记符号）、不做 terminal 终端风（几十个雷同模板已审美疲劳）、不做缩略图卡片墙、动效只在服务真实内容时用。克制本身就是在"人人炫技"背景下的差异化。

**自媒体选题副产品**：中文圈（小红书/公众号）关于「个人网站审美」的深度讨论几乎为零——这个改版过程本身可以做成 vibe coding 赛道选题（喂给选题雷达）。
| 高级感 3D + 交互设计模式（含足迹地图 3 方向） | ✅ 已回（结论落入 2.1/2.2/太空人规则） |
| 83 张城市照片逐张审查 | ✅ 已回（结论落入 0.9/1.3；83→41 张，8 张截图类立删） |
