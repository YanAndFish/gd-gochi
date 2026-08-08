# LINGNAN EDITIONS「岭南辑造」多商品设计与流程验收

验收日期：2026-08-08

本地来源：`http://127.0.0.1:4321/`

生产预览基路径：`/gd-gochi/`

视觉方向：方案 1「白色美术馆」

## 视觉与品牌真相源

- 页面布局、密度、留白、字体与信息层级继续以 `design-reference.png` 为真相源。
- 已吸收同仓 Logo 任务产出的品牌标志、favicon、Apple Touch Icon 和 Web App Manifest；页首与页尾共用同一品牌资产。
- 首页 Hero 与专题大片继续由 `src/catalog/home.json` 显式配置。新增目录商品不会自动替换品牌主视觉。
- 首页、商品总览、系列页、详情、会员、购物袋、结账和订单继续使用黑、白、岭南朱与编辑型衬线排版。
- AI 编辑场景、装置图和模特图在媒体目录中携带真实尺寸、说明与 `aiConcept` 标记，页面可见位置统一显示“品牌 AI 概念影像”。

最终视觉截图：

- `output/playwright/home-multicatalog-final.png`
- `output/playwright/catalog-products-1440-final.png`
- `output/playwright/product-yue-stool-02-1440x1024.png`
- `output/playwright/product-yue-stool-02-1024x768.png`
- `output/playwright/product-yue-stool-02-390x844.png`
- `output/playwright/product-yue-stool-02-milano-1440x1024.png`
- `output/playwright/product-yue-stool-02-milano-390x844.png`
- `output/playwright/clay-pot-final/clay-pot-series-1440x1024.png`
- `output/playwright/clay-pot-final/clay-pot-detail-1440x1024.png`
- `output/playwright/clay-pot-final/clay-pot-detail-1024x768.png`
- `output/playwright/clay-pot-final/clay-pot-detail-390x844.png`
- `output/playwright/clay-pot-final/clay-pot-milano-figure.png`
- `output/playwright/clay-pot-final/clay-pot-milano-390x844.png`

## 多商品目录与路由

- `src/catalog/series/*.json` 与 `src/catalog/products/*.json` 由 Vite `import.meta.glob` 自动装载并建立只读索引。
- 正式目录包含 2 个系列、4 个独立商品、11 个稳定变体、46 个唯一资源；测试 fixture 继续覆盖额外系列与独立商品，但不会进入正式目录。
- 「粤凳 02 / GUANGDONG STOOL N°02」使用独立商品身份 `guangdong-stool-02`，默认浅蓝，六款颜色均保持独立稳定变体 ID，并归入既有粤凳系列。
- 「煲点什么 / WHAT'S SIMMERING」使用稳定系列身份 `clay-pot-series`；「慢慢滚 / SIMMER DOWN」使用稳定商品身份 `clay-pot-01`，单一砂褐变体使用稳定身份 `clay-pot-01-sand-brown`。本轮只更新顾客可见名称，不修改已发布 ID、slug、canonical 路由或历史订单快照。
- `/products` 自动按系列陈列商品；`/series/:slug` 只显示目标系列。
- `/products/:slug` 按商品解析默认变体；选择器只显示当前商品的变体，单变体商品不显示选择器。
- 档案套装 canonical 路由为 `/products/guangdong-stool-archive-01`；旧的 `guangdong-stool-01?variant=archive-set` 使用 replace 跳转。
- 搜索索引覆盖系列、商品、变体与搜索词；媒体运行时地址统一通过 Vite `BASE_URL` 解析。
- 目录校验覆盖重复 ID/slug、孤立系列、默认变体、枚举、价格、政策、首页引用、媒体文件、实际尺寸、alt 与 AI 标记。

## 粤凳 02 影像验收

- 四张用户原图已无损归档至 `design-references/products/guangdong-stool-02/`，分别保存色彩总览、坐面细节、靠背细节与堆叠场景；归档文件 SHA256 与输入原图逐一一致。
- 六个变体共新增 24 张商品视角图，默认浅蓝另含 1 张六色堆叠室内编辑场景与 1 张米兰模特场景，合计 26 个运行时资源；所有图片均为 1120 × 1400 PNG。
- 每个变体均含四分之三侧视、正面、侧面与结构细节；默认浅蓝画廊额外包含两张编辑场景。五道纵向靠背开口、三处坐面开孔、一体扶手、四足与可堆叠关系在各颜色、角度和模特场景中保持一致。
- 六个 `colorHex` 均从最终验收主图的非高光区域采样；目录中的「红 / RED」忠实保留样图偏玫红的色相。
- 所有新增媒体均写入真实尺寸、角色、alt、caption 与 `aiConcept`；顾客界面可见位置统一标注“品牌 AI 概念影像”。六色堆叠场景不含人物；米兰造型使用不可识别为真人的虚构成年模特，以站姿轻触椅背并完整展示商品结构。

## 慢慢滚影像验收

- 六张输入样图已从 Codex session 恢复并归档至 `design-references/products/clay-pot-01/`，其中包含 3 张原尺寸输入与 3 张应用输入缩放版；另保存经结构收敛的 `clean-master.png`，形成可追溯的输入与母版链路。
- 本次商品范围固定为单柄平底浅煲：砂色浅煲体、单一短柄、深褐色盖面与盖钮。样图中的双耳煲与圆底煲只作为结构排除参考，不并入当前商品或变体。
- 运行时目录现有 6 张 1120 × 1400 PNG 商品与编辑影像，以及 1 张 2048 × 1152 PNG 系列横幅；所有生成资产均携带 `aiConcept` 标记，顾客界面统一显示“品牌 AI 概念影像”。
- 商品画廊覆盖四分之三侧视、正面、侧面、盖面细节、无人物白色展馆场景，以及虚构成年米兰模特轻触短柄的造型场景。模特图保留单柄、柄口、平底、双色盖面、圆钮与气孔完整可见，caption 固定为“品牌 AI 概念影像 · 米兰造型”。系列横幅继续使用白色展馆视觉，并保持单柄平底浅煲结构一致。
- 商品说明与规格只陈述样图可验证的造型、盖面和砂褐色，不编造精确材质、尺寸、工艺、产地或灶具兼容性。

## 交易与兼容验收

- 列表、详情、购物袋、加入购物袋与结账统一调用 `evaluatePurchaseEligibility`。
- 非法等级、非法政策与缺失目录项 fail closed；高于 EDITION 的政策必须隐藏资格原因。
- 常设商品对非会员显示“入会后选购”；限定、典藏、高级资格、限购或失效状态只公开“暂时缺货”与 `UNAVAILABLE`。
- 数量只接受有限正整数；设置为 0 只执行删除。每单上限和变体级、商品级终身限购分别计算。
- 当前订单产生的等级提升只影响下一笔订单。
- 未知或已下架购物袋行保留通用占位、可删除、不计入小计并阻止结账。
- 粤凳 02 六款均为 ¥18,800、`standard`、`active`，使用 EDITION 会籍政策；每单最多 4 件且无终身限购。
- 慢慢滚仅提供砂褐变体，价格为 ¥18,800，使用 EDITION 会籍政策；每单最多 4 件且无终身限购。
- 同一订单可混合包含粤凳 01 与粤凳 02；验收订单包含 2 件粤凳 01 与 4 件粤凳 02，总额 ¥112,800。成交时保存名称、价格、数量、`productId`、`variantId`、`seriesId`、`productSlug` 与相对图片键快照。
- 慢慢滚新增流程验证 EDITION 会员购买 4 件并结账，购物袋、结账与订单总额均为 ¥75,200。
- 旧订单缺少新增快照字段时仍可显示并参与历史限购统计。
- 保留原 Dexie v1 schema 与既有变体 ID，没有迁移或改写历史记录。

## 响应式、键盘与控制台

Playwright 使用生产构建及 `/gd-gochi/` 子路径检查：

| 视口 | 结果 |
| --- | --- |
| 1440 × 1024 | 商品总览、系列页、粤凳 02 与慢慢滚详情无横向溢出；桌面标题、会籍按钮、六图画廊与系列横幅正常 |
| 1024 × 768 | 中型布局无横向溢出；慢慢滚标题、会籍按钮与首图均可达且无遮挡 |
| 390 × 844 | 移动导航、单列目录与横向画廊正常；慢慢滚标题、首图和米兰模特图无遮挡、越界或横向滚动 |

浏览器流程覆盖首页新品、商品总览、系列页、搜索、三个独立商品深链、旧链接归一、粤凳 02 默认浅蓝、六色键盘切换、26 张新增图片请求、米兰模特图的 alt 与 AI 标记、变体隔离、单变体详情、EDITION 入会购买、每单 4 件上限、混合结账、订单快照、键盘进入结账及步骤焦点。9 项用例均启用严格 `console.error`、`console.warn` 与 `pageerror` 收集，结果为 0。

慢慢滚 5 项 E2E 覆盖商品总览与搜索命中、煲点什么和粤凳系列隔离、单变体详情与 6 张画廊图完整加载、米兰模特图 caption/alt/AI 标记、4 件商品以 ¥75,200 完成结账并生成订单，以及 1440 × 1024、1024 × 768、390 × 844 三个视口无横向溢出。

4321 有界面浏览器复核确认三个视口的 `documentElement` 横向溢出均为 0；默认浅蓝的 6 张画廊图均以 1120 × 1400 完整加载，静态资源请求无 404，console 为 0 error、0 warning。

慢慢滚的 4321 有界面复核确认三个视口的 `documentElement` 横向溢出均为 0；六张画廊图均以 1120 × 1400 完整加载，系列横幅以 2048 × 1152 完整加载。商品总览显示「煲点什么」与「慢慢滚」，系列页不混入粤凳；搜索“慢慢滚”或旧器物词“沙煲”均只返回 `/products/clay-pot-01`。米兰模特图在桌面和移动画廊中结构清晰，caption、alt 和 AI 标记正确；详情页没有多余变体选择器，“入会后选购”按钮正确，全部 37 个页面与静态资源请求为 200/304，console 为 0 error、0 warning。

程序化路由焦点会进入主要内容，但不会显示覆盖整页的默认描边；按钮、链接、输入框和摘要仍保留可见的 `:focus-visible` 焦点环。`prefers-reduced-motion`、`aria-live`、语义进度与有序物流时间轴继续有效。

## 自动化验证

正式项目自动化结果：

- `npm run catalog:validate`：2 个系列、4 个商品、11 个变体、46 个资源通过。
- Vitest：5 个测试文件，60 项测试全部通过。
- Vite 生产构建：通过。
- Pages 产物检查：6 个入口资源、`/gd-gochi/` 前缀、favicon、404 路由回退和 bundle 根路径检查通过。
- Playwright：既有 9 项与慢慢滚新增 5 项合计 14/14 通过，最终完整验收用时 35.5 秒。
- `skill-creator/scripts/quick_validate.py`：`Skill is valid!`。
- `$add-lingnan-product` 独立只读前向测试：面对适合成年人坐用的扶手椅，能同时列出无人物编辑场景与虚构成年米兰模特场景，并要求固定 AI 标记、alt 与三视口验收。
- `git diff --check`：通过。

测试覆盖身份初始化、年度续会、等级边界、资格隐藏、目录和路由、有限整数数量、每单与终身限购、同商品跨变体限购、未知购物袋行、混合商品结账、事务回滚、并发幂等、历史订单兼容、订单快照、物流单调推进，以及煲点什么系列隔离、搜索、单变体六图画廊、米兰模特媒体契约、4 件结账和三视口无溢出。

## Skill 隔离前向测试

两个全新子代理只获得一句商品说明、样图和项目 Skill，并且只修改 `/private/tmp` 下的项目副本：

1. 新系列商品：正确判定骑楼窗格桌灯为独立商品，创建「拱廊灯系列 / ARCADE LIGHT SERIES」、常设「拱廊灯 01」、洁净母版、四个商品角度、编辑场景和系列横幅。隔离目录为 2 个系列、3 个商品、5 个变体、19 个资源；完整检查与 9 项 Playwright 用例通过，控制台 0 error、0 warning。
2. 现有商品新变体：正确判定深海蓝样图与粤凳 01 结构、用途一致，仅追加一个颜色变体，没有创建重复商品或系列。隔离目录为 1 个系列、2 个商品、5 个变体、18 个资源；完整检查与 8 项 Playwright 用例通过，并在独立 4322 端口完成详情、搜索、购物袋、结账、订单与三视口抽查，控制台 0 error。

两次前向测试均未修改正式商品目录、首页 Hero、Git 历史或线上站点。

## 最终问题分级

- P0：0
- P1：0
- P2：0
- P3：0

审查阶段发现 1 项 P2：本文仍保留新增商品前的目录、资源和测试计数。现已按最终自动化与浏览器结果更新，复核后关闭。

本项目仍是本地前端零售演示。资格隐藏不是服务端安全控制；开发者工具可以查看或篡改本地数据，支付、订单与物流均不构成真实交易或履约。

final result: passed
