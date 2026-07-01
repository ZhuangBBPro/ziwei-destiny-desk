# Ziwei Destiny Desk

本项目是一个本地优先的紫微斗数命盘工作台，面向命理师内部使用。第一版聚焦真实排盘、命盘展示、案例管理、结构化批注、标签与检索、时间线复盘、轻量规则提示，以及浏览器本地持久化。

## 技术栈

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Dexie.js
- React Hook Form
- Zod
- dayjs
- uuid
- fortel-ziweidoushu

## 如何安装依赖

建议使用 Node.js 18 或以上。

```bash
npm install
```

## 如何启动

```bash
npm run dev
```

构建生产包：

```bash
npm run build
```

## 数据如何存储

- 所有业务数据默认保存在浏览器本地 IndexedDB
- 数据库名为 `ziwei-destiny-desk`
- 首次启动会自动写入基础标签和规则 seed
- 数据仅保存在当前设备当前浏览器，不会自动跨设备同步

## PWA 与离线使用

- 项目已加入 `manifest.webmanifest` 与 `service worker`
- 首次联网访问并加载成功后，静态资源会被缓存
- 后续断网时，已访问过的应用资源与本地 IndexedDB 数据可继续使用
- 手机浏览器可将站点加入主屏幕，作为轻量本地工作台使用
- 如果发布了新版本，页面顶部会提示刷新以获取最新资源

说明：

- 离线能力建立在“至少成功联网访问并缓存过一次”的前提上
- 案例数据仍建议定期通过 JSON 导出备份

## 如何导出 JSON

- 设置页支持导出全部本地数据为 JSON
- 命盘详情页在选中案例后支持导出单个案例 JSON
- 导出结构包含命盘、宫位、星曜、案例、批注、事件、标签、规则与命中记录

## GitHub Pages 部署

仓库已包含 GitHub Pages workflow：

- 工作流文件：`.github/workflows/deploy-pages.yml`
- 推送到 `main` 分支后会自动构建并部署
- 工作流会自动把 `VITE_APP_BASE` 设置为仓库名路径
- 工作流会把 `VITE_ROUTER_MODE` 设为 `hash`，避免 GitHub Pages 的 SPA 刷新 404 问题

首次启用时，你需要在 GitHub 仓库设置中：

1. 打开 `Settings`
2. 进入 `Pages`
3. 将 Source 设为 `GitHub Actions`

如果你不是部署到 GitHub Pages，而是部署到普通静态托管：

- 默认使用浏览器路由
- 默认基础路径为 `/`
- 如需改基础路径，可在构建前设置 `VITE_APP_BASE`

## fortel-ziweidoushu 接入方式

- 接入封装位于 `src/features/charts/lib/ziweiEngine.ts`
- 输入映射位于 `src/features/charts/lib/timeGroundMapper.ts`
- 第三方对象转内部统一结构位于 `src/features/charts/lib/ziweiMapper.ts`
- 文墨截图兼容口径位于 `src/features/charts/lib/wenmoChartPreset.ts`
- 页面层不直接依赖 `fortel-ziweidoushu`
- 当前实现按以下策略封装：
  - 阳历使用 `DestinyConfigBuilder.withSolar(...)`
  - 农历先使用库内 `defaultCalendar.lunar2solar(...)` 转为阳历，再统一使用 `DestinyConfigBuilder.withSolar(...)`
  - 性别映射到库内 `Gender`
  - 时辰通过 `DayTimeGround.getByName(...)` 映射
  - `configType` 默认使用 `ConfigType.SKY`

### 当前排盘口径

核心十二宫与星曜仍由 `fortel-ziweidoushu` 真实排盘，项目不会自行重写紫微斗数主算法。为了和当前采用的文墨天机开关配置保持一致，adapter 会在 plain object 映射阶段执行可追溯校正：

- 天马按年支、天空常规排法、旬空截空正副双星、魁钺六辛逢虎马
- 星曜亮度采用《紫微斗数全书》通行表
- 天伤固定交友宫、天使固定疾厄宫
- 命主按命宫地支，身主仍按生年地支
- 四化采用通行表，例如壬干为天梁禄、紫微权、左辅科、武曲忌
- 长生十二神区分阴阳顺逆，并采用水土共长生
- 晚子时按次日排盘

上述预设会写入命盘快照的 `chartPreset`，旧命盘在首次打开详情时自动升级并回存。流年四化的口径已固定为按流年天干，但流年盘交互界面尚未实现。

注意：

- README 与网络资料可能存在命名差异，真正运行时应以安装后的实际导出和类型定义为准
- 当前仓库里额外提供了本地声明 `src/types/fortel-ziweidoushu.d.ts`，用于在未安装依赖前维持项目类型边界

## 已实现功能

- 项目基础骨架与响应式布局
- Dashboard 首页
- 新建命盘页表单与真实排盘 adapter 入口
- IndexedDB 数据层、repository、service 分层
- 命盘详情页基础信息与十二宫展示
- 文墨截图口径 adapter、星曜亮度与本命四化拆表
- 案例主记录创建与编辑
- 结构化批注新增、编辑、软删除
- 时间线事件新增与编辑
- 标签 CRUD 与案例标签绑定
- 案例库搜索、状态筛选、标签筛选、批注关键词筛选
- 轻量规则提示 CRUD 与案例命中保存
- 单案例 / 全量 JSON 导出
- 基础 seed 数据
- PWA manifest、离线缓存、安装提示基础能力
- GitHub Pages 自动部署工作流

## 明确未实现

- AI 问答
- 自动生成断语
- 自动解盘
- 相似案例智能推荐
- 登录 / 注册 / 权限系统
- 后端 API
- 云同步
- 多用户协作
- 聊天界面
- PDF 美化导出
- 多流派切换 UI
- 流年、大限、流月、流日、流时交互盘
- 真太阳时精确换算

## 后续扩展方向

### 真实规则引擎

- 在当前 `trigger_expression` JSON 结构上扩充更多稳定条件
- 优先复用 `fortel-ziweidoushu` 的 `BoardCriteria`
- 对不适合直接表达的规则，继续保持轻量 JSON matcher，而不是引入复杂 DSL
- 在本命四化拆表基础上扩展流年、大限等运行时四化作用域

### AI 能力

- 将来可在当前案例、批注、标签、规则命中结果之上增加 AI 辅助总结
- AI 应作为可选辅助层，而不是替代真实排盘与结构化记录
- 推荐先保证导出与可恢复结构稳定，再在本地知识和案例索引上做增强
