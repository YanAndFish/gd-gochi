# LINGNAN EDITIONS「岭南辑造」多商品设计与流程验收

验收日期：2026-08-08

本轮本地生产预览：`http://127.0.0.1:4322/gd-gochi/`

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
- `output/playwright/flip-flop-final/catalog-products-1440x1024.png`
- `output/playwright/flip-flop-final/flip-flop-series-1440x1024.png`
- `output/playwright/flip-flop-final/flip-flop-detail-1440x1024.png`
- `output/playwright/flip-flop-final/flip-flop-detail-1024x768.png`
- `output/playwright/flip-flop-final/flip-flop-detail-390x844.png`
- `output/playwright/flip-flop-final/flip-flop-milano-1440x1024.png`
- `output/playwright/flip-flop-final/flip-flop-milano-390x844.png`
- `output/playwright/floral-flask-final/floral-flask-series-1440x1024.png`
- `output/playwright/floral-flask-final/floral-flask-detail-1440x1024.png`
- `output/playwright/floral-flask-final/floral-flask-detail-1024x768.png`
- `output/playwright/floral-flask-final/floral-flask-detail-390x844.png`
- `output/playwright/floral-flask-final/floral-flask-milano-1440x1024.png`

## 多商品目录与路由

- `src/catalog/series/*.json` 与 `src/catalog/products/*.json` 由 Vite `import.meta.glob` 自动装载并建立只读索引。
- 正式目录包含 4 个系列、6 个独立商品、20 个稳定变体与 88 个唯一资源；全部媒体文件实存、实际尺寸与目录声明一致。测试 fixture 继续覆盖额外系列与独立商品，但不会进入正式目录。
- 「粤凳 02 / GUANGDONG STOOL N°02」使用独立商品身份 `guangdong-stool-02`，默认浅蓝，六款颜色均保持独立稳定变体 ID，并归入既有粤凳系列。
- 「煲点什么 / WHAT'S SIMMERING」使用稳定系列身份 `clay-pot-series`；「慢慢滚 / SIMMER DOWN」使用稳定商品身份 `clay-pot-01`，单一砂褐变体使用稳定身份 `clay-pot-01-sand-brown`。本轮只更新顾客可见名称，不修改已发布 ID、slug、canonical 路由或历史订单快照。
- 「粤拖系列 / GUANGDONG FLIP-FLOP SERIES」使用稳定系列身份 `guangdong-flip-flop-series`；调侃商品名「踢踢拖拖 / KICKING ABOUT」使用稳定商品身份 `guangdong-flip-flop-01`，蓝白、绿白、朱白与墨黑使用四个独立稳定变体 ID。
- 「暖水有花样 / WARM WATER IN BLOOM」使用稳定系列身份 `floral-flask-series`；调侃商品名「花里壶哨 / FLASKY BUSINESS」使用稳定商品身份 `floral-flask-01`，默认朱红，朱红、紫罗兰、水青、桃粉与暖黄分别使用五个独立稳定变体 ID。
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

## 踢踢拖拖影像验收

- 五张用户原图已从 Codex session 无损恢复并归档至 `design-references/products/guangdong-flip-flop-01/`；另保存蓝白、绿白、朱白与墨黑四张洁净母版，形成可追溯的输入与母版链路。
- 四个变体共新增 16 张 1120 × 1400 PNG 商品视角图；默认蓝白另含 1 张 1120 × 1400 无人物四色展馆场景、1 张 1120 × 1400 虚构成年米兰模特穿用场景，以及 1 张 2048 × 1152 系列横幅，合计 19 个运行时资源。
- 四色均保持平直圆头鞋床、三点连接 Y 形宽带、同色薄外底与哑光橡胶观感。蓝白、绿白与朱白使用冷白鞋床及同色鞋带、外底；墨黑为通体黑。鞋带压纹、鞋床细纹与底面纵纹在各角度中可读，无 Logo、零售文案、测试工具、后跟带、扣件、厚底或额外部件。
- 默认蓝白画廊覆盖成对四分之三侧视、成对正面俯视、单只低侧视、单只结构细节、无人四色展馆陈列与米兰模特穿用。模特为不可识别为真人的虚构成年人，使用中性色当代服装与自然迈步姿态，两只蓝白人字拖、脚趾、鞋带和落地关系完整可见。
- 无人物编辑场景、米兰图与系列横幅均在目录中携带真实尺寸、角色、alt、caption 与 `aiConcept`；顾客界面可见位置统一标注“品牌 AI 概念影像”，米兰图 caption 固定为“品牌 AI 概念影像 · 米兰造型”。
- 商品说明与规格只陈述样图可验证的形态、三点连接与四色关系，不采用“速干”“舒适”“久穿不塌”等未经验证的性能主张，也不编造尺码、精确材料成分、重量或工艺。

## 花里壶哨影像验收

- 六张用户原图已从当前 Codex session 恢复并归档至 `design-references/products/floral-flask-01/`，分别记录五色组合、提携与开盖方式、闭合杯盖、木色内塞和纵向侧把；另保存五色洁净母版，形成可追溯的输入与母版链路。
- 五个变体各含四分之三侧视、正面、侧面与杯盖结构细节，共 20 张 1120 × 1400 RGB PNG；默认朱红另含 1 张无人五色展馆场景、1 张虚构成年米兰模特提携场景，以及 1 张 2048 × 1152 RGB 系列横幅，合计 23 个新增运行时资源。
- 所有角度均保留高身圆筒、银色圆肩短颈、杯盖与木色内塞、顶部细线提梁、纵向弧形侧把、竖向折面和对应花卉蝶鸟图案。全身图的提梁与侧把同时存在且连接点独立；开盖细节只有一个瓶口、一个木色内塞与一个取下的杯盖，无随机文字、Logo、水印或多余部件。
- 桌面首图使用近方形 `cover`。有界面目检发现原首图会裁掉提梁顶端后，五色首图统一后移镜头至商品占高约 66%–70%，并通过中心近方形裁切预演；最终 1440 × 1024 页面完整显示提梁、底圈、侧把与上下支座。
- 米兰造型使用不可识别为真人的虚构成年模特，以顶部提梁携带默认朱红款，人物手指、受力与商品垂直悬挂关系自然，杯盖、侧把与筒身均无遮挡；caption 固定为“品牌 AI 概念影像 · 米兰造型”，alt 明确“虚构成年米兰模特”及顶部提梁携带关系。
- 商品说明与规格只陈述样图可验证的轮廓、开合、提携结构、表面颜色与花面，不编造容量、精确材质、重量、保温性能、工艺、年代或产地。

## 交易与兼容验收

- 列表、详情、购物袋、加入购物袋与结账统一调用 `evaluatePurchaseEligibility`。
- 非法等级、非法政策与缺失目录项 fail closed；高于 EDITION 的政策必须隐藏资格原因。
- 常设商品对非会员显示“入会后选购”；限定、典藏、高级资格、限购或失效状态只公开“暂时缺货”与 `UNAVAILABLE`。
- 数量只接受有限正整数；设置为 0 只执行删除。每单上限和变体级、商品级终身限购分别计算。
- 当前订单产生的等级提升只影响下一笔订单。
- 未知或已下架购物袋行保留通用占位、可删除、不计入小计并阻止结账。
- 粤凳 02 六款均为 ¥18,800、`standard`、`active`，使用 EDITION 会籍政策；每单最多 4 件且无终身限购。
- 慢慢滚仅提供砂褐变体，价格调整为 ¥12,800，使用 EDITION 会籍政策；每单最多 4 件且无终身限购。既有订单仍读取成交时价格快照，不按当前目录价格回算。
- 踢踢拖拖四款颜色均为 ¥6,800、`standard`、`active`，使用 EDITION 会籍政策；每单最多 4 双且无终身限购。
- 花里壶哨五款颜色均为 ¥15,800、`standard`、`active`，使用 EDITION 会籍政策；每单最多 4 件且无终身限购。
- 同一订单可混合包含粤凳 01 与粤凳 02；验收订单包含 2 件粤凳 01 与 4 件粤凳 02，总额 ¥112,800。成交时保存名称、价格、数量、`productId`、`variantId`、`seriesId`、`productSlug` 与相对图片键快照。
- 慢慢滚流程验证 EDITION 会员购买 4 件并结账，购物袋、结账与订单总额均为 ¥51,200。
- 踢踢拖拖流程验证 EDITION 会员购买 4 双蓝白款并结账，购物袋、结账与订单总额均为 ¥27,200。
- 花里壶哨流程验证 EDITION 会员购买 4 件朱红款并结账，购物袋、结账与订单总额均为 ¥63,200。
- 旧订单缺少新增快照字段时仍可显示并参与历史限购统计。
- 保留原 Dexie v1 schema 与既有变体 ID，没有迁移或改写历史记录。

## 响应式、键盘与控制台

Playwright 使用生产构建及 `/gd-gochi/` 子路径检查：

| 视口 | 结果 |
| --- | --- |
| 1440 × 1024 | 商品总览、四个系列页及各商品详情无横向溢出；花里壶哨完整显示五色选择、¥15,800、六图画廊、首图双把结构与系列横幅 |
| 1024 × 768 | 中型布局无横向溢出；花里壶哨标题、价格、五色选择、会籍按钮与完整首图均可达且无遮挡 |
| 390 × 844 | 移动导航、单列目录与横向画廊正常；花里壶哨默认首图、标题、价格与 AI 标记无遮挡、越界或页面横向滚动 |

既有粤凳浏览器流程覆盖首页新品、商品总览、系列页、搜索、三个独立商品深链、旧链接归一、粤凳 02 默认浅蓝、六色键盘切换、26 张新增图片请求、米兰模特图的 alt 与 AI 标记、变体隔离、单变体详情、EDITION 入会购买、每单 4 件上限、混合结账、订单快照、键盘进入结账及步骤焦点。9 项用例均启用严格 `console.error`、`console.warn` 与 `pageerror` 收集，结果为 0。

慢慢滚 5 项 E2E 覆盖商品总览与搜索命中、煲点什么和其他系列隔离、单变体详情与 6 张画廊图完整加载、米兰模特图 caption/alt/AI 标记、4 件商品以 ¥51,200 完成结账并生成订单，以及 1440 × 1024、1024 × 768、390 × 844 三个视口无横向溢出。

踢踢拖拖 5 项 E2E 覆盖首页新品、商品总览、粤拖系列、搜索命中、四个变体键盘切换与隔离、蓝白 6 张画廊图完整加载、米兰模特图 caption/alt/AI 标记、4 双蓝白款以 ¥27,200 完成结账并生成订单，以及三个代表性视口无横向溢出。

花里壶哨 5 项 E2E 覆盖首页新品、商品总览、暖水有花样系列、搜索命中、五个变体键盘切换与隔离、朱红 6 张画廊图完整加载、米兰模特图 caption/alt/AI 标记、4 件朱红款以 ¥63,200 完成结账并生成订单，以及三个代表性视口无横向溢出。

4321 有界面浏览器复核确认三个视口的 `documentElement` 横向溢出均为 0；默认浅蓝的 6 张画廊图均以 1120 × 1400 完整加载，静态资源请求无 404，console 为 0 error、0 warning。

慢慢滚的 4321 有界面复核确认三个视口的 `documentElement` 横向溢出均为 0；六张画廊图均以 1120 × 1400 完整加载，系列横幅以 2048 × 1152 完整加载。商品总览显示「煲点什么」与「慢慢滚」，系列页不混入粤凳；搜索“慢慢滚”或旧器物词“沙煲”均只返回 `/products/clay-pot-01`。米兰模特图在桌面和移动画廊中结构清晰，caption、alt 和 AI 标记正确；详情页没有多余变体选择器，“入会后选购”按钮正确，全部 37 个页面与静态资源请求为 200/304，console 为 0 error、0 warning。

踢踢拖拖的 4321 有界面复核确认三个视口均无横向溢出；默认蓝白 6 张画廊图均以 1120 × 1400 完整加载，系列横幅以 2048 × 1152 完整加载。商品总览同时显示慢慢滚 ¥12,800 与粤拖系列，独立系列页仅陈列踢踢拖拖；详情页显示 ¥6,800、四个颜色按钮与“入会后选购”。桌面、中型与移动端初始状态截图均无越界，米兰模特图人物和两只拖鞋清晰，caption、alt 与 AI 标记正确；有界面控制台为 0 error、0 warning。

花里壶哨的 4322 有界面复核确认三个视口均无横向溢出；五色基础画廊均以 1120 × 1400 完整加载，朱红额外两张场景图同为 1120 × 1400，系列横幅为 2048 × 1152。商品总览、独立系列、搜索、¥15,800 价格、五色键盘切换、米兰 caption/alt/AI 标记、购物袋、结账与 ¥63,200 订单均正确；详情入口与 9 个静态资源请求均为 200，console 为 0 error、0 warning。

程序化路由焦点会进入主要内容，但不会显示覆盖整页的默认描边；按钮、链接、输入框和摘要仍保留可见的 `:focus-visible` 焦点环。`prefers-reduced-motion`、`aria-live`、语义进度与有序物流时间轴继续有效。

## 自动化验证

花里壶哨接入后的最终项目自动化结果：

- `npm run catalog:validate`：4 个系列、6 个商品、20 个变体、88 个资源通过。
- Vitest：7 个测试文件，66 项测试全部通过。
- Vite 生产构建：通过。
- Pages 产物检查：6 个入口资源、`/gd-gochi/` 前缀、favicon、404 路由回退和 bundle 根路径检查通过。
- Playwright：既有 9 项、慢慢滚 5 项、踢踢拖拖 5 项与花里壶哨 5 项合计 24/24 通过，最终完整发布门禁中的浏览器验收用时 60.0 秒。沙箱内 Chromium 曾因系统权限以 `SIGABRT` 退出，完整门禁在沙箱外原样重跑后全部通过。
- `skill-creator/scripts/quick_validate.py`：`Skill is valid!`。
- `$add-lingnan-product` 独立只读前向测试：面对适合成年人坐用的扶手椅，能同时列出无人物编辑场景与虚构成年米兰模特场景，并要求固定 AI 标记、alt 与三视口验收。
- `git diff --check`：通过。

测试覆盖身份初始化、年度续会、等级边界、资格隐藏、目录和路由、有限整数数量、每单与终身限购、同商品跨变体限购、未知购物袋行、混合商品结账、事务回滚、并发幂等、历史订单兼容、订单快照、物流单调推进，以及四个系列的隔离、搜索、单变体/多色变体画廊、米兰模特媒体契约、三档价格结账和三视口无溢出。花里壶哨目录单测同时覆盖系列身份、五色隔离、默认朱红、¥15,800 价格、购买政策、四图基础画廊、双 AI 场景和 canonical 路由。

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

本轮花里壶哨目录、23 个运行时资源、¥15,800 交易、三档响应式与有界面浏览器验收均已完成。首图提梁裁切问题在最终门禁前修正并复验，当前未发现 P0–P3 问题。

本项目仍是本地前端零售演示。资格隐藏不是服务端安全控制；开发者工具可以查看或篡改本地数据，支付、订单与物流均不构成真实交易或履约。

final result: passed
