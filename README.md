# LINGNAN EDITIONS「岭南辑造」

[![GitHub Pages](https://github.com/YanAndFish/gd-gochi/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/YanAndFish/gd-gochi/actions/workflows/deploy-pages.yml)

以岭南文化为源，辑造面向当代生活的设计器物。

**在线访问：[https://yanandfish.github.io/gd-gochi/](https://yanandfish.github.io/gd-gochi/)**

[![LINGNAN EDITIONS 首页](public/assets/brand/home-hero-gallery.png)](https://yanandfish.github.io/gd-gochi/)

## 项目简介

这是一个使用 React、Vite 与 IndexedDB 构建的本地优先奢侈零售概念网站。当前「粤凳系列」包含无靠背方凳「粤凳 01 / GUANGDONG STOOL N°01」、带弧形靠背与一体扶手的「粤凳 02 / GUANGDONG STOOL N°02」，以及三色档案套装。

「粤凳 02」以浅蓝为默认版本，另提供白、深蓝、黄、红、橙五种常设色彩。六款共用 ¥18,800 定价与 EDITION 会籍购买政策，每单最多四件；默认画廊同时展示六色堆叠场景与虚构成年米兰模特造型。新增商品由目录自动进入商品总览、粤凳系列、搜索和新品区域，不替换首页主视觉。

网站提供完整的演示体验：

- 编辑型奢侈品牌首页、影棚商品图和多角度详情页。
- 品牌 AI 概念影像与虚构成年米兰模特造型。
- 数据驱动的商品总览、系列页、搜索、新品与独立商品详情。
- 365 天年度会籍及 EDITION、COLLECTOR、PATRON 等级。
- 会员资格、累计消费、限定作品可售状态与本机限购规则。
- 购物袋、礼宾结账、虚拟支付和幂等订单创建。
- 90 秒加速礼宾物流时间轴，刷新后继续按绝对时间推进。
- 身份、会籍、购物袋、订单与物流保留在当前浏览器中。

> 本项目仅用于本地零售概念演示。支付、订单及物流不会产生真实交易或履约。

## 商品目录与路由

商品身份、文案、媒体和购买政策统一保存在 `src/catalog/`：

```text
src/catalog/
├── home.json                 # 显式配置首页 Hero 与专题影像
├── series/*.json             # 系列名称、说明、横幅与排序
└── products/*.json           # 商品、变体、媒体与购买政策
```

Vite 在构建时自动装载目录 JSON。新增独立商品只需写入商品数据并指定一个 `seriesId`，即可进入商品总览、所属系列、搜索和新品；它不会自动替换首页 Hero 或专题大片。已发布的 `productId` 与 `variantId` 用于兼容购物袋和订单，不能改名或复用。

主要顾客路由：

- `/products`：全部商品。
- `/series/:slug`：单个系列。
- `/products/:slug`：商品详情；变体通过商品内选项切换。
- `/bag`、`/checkout`：购物袋与商品结账。
- `/membership`、`/orders`：会员中心与订单档案。

目录媒体只保存从 `public/` 起算、不含部署前缀的相对资源键，运行时会自动适配本地根路径和 GitHub Pages 子路径。

## 使用商品生成 Skill

项目级 `$add-lingnan-product` Skill 可以把“一句商品说明 + 至少一张可辨认主体结构的样图”扩展为完整商品或现有商品的新变体。

示例：

```text
使用 $add-lingnan-product：这是一个取形于骑楼窗格的小型桌灯，样图见附件。
```

Skill 会判断新商品或新变体、匹配或创建双语系列、制作洁净母版与商品影像、生成双语名称和价格建议、写入目录与购买政策，并完成目录、交易、响应式和浏览器验收。原始样图归档到 `design-references/products/<product-slug>/`，新运行时资产写入 `public/assets/catalog/<product-id>/<variant-id>/`。

未提供分类时默认创建常设商品；不会凭单张图片增加未出现的颜色或款式，也不会编造精确尺寸、材料和工艺事实。除非明确要求，Skill 不提交、不推送、不部署，也不更换首页 Hero。

## 本地运行

环境要求：Node.js 22 或兼容版本。

```bash
npm ci
npm run dev
```

本地地址：

```text
http://127.0.0.1:4321/
```

## 验证

快速检查商品目录：

```bash
npm run catalog:validate
```

单独运行单元测试或构建：

```bash
npm test
npm run build
```

完整验收入口：

```bash
npm run check
```

`npm run check` 依次执行目录校验、Vitest、生产构建、GitHub Pages 产物检查和 Playwright 浏览器冒烟测试。实际验收结果、视口和缺陷分级记录在 [design-qa.md](design-qa.md)，不能用构建成功替代浏览器流程结论。

Vitest 与 `fake-indexeddb` 用于覆盖身份、会籍、资格、限购、幂等结账、历史订单快照和物流等数据规则；浏览器测试覆盖商品总览、系列、深层链接、购物袋、结账与响应式交互。

## GitHub Pages

正式访问地址：

```text
https://yanandfish.github.io/gd-gochi/
```

每次推送到 `main` 后，[Deploy GitHub Pages](.github/workflows/deploy-pages.yml) 工作流会执行测试、生成 `dist/client`，并将静态产物发布到 GitHub Pages。

项目使用 `/gd-gochi/` 作为生产资源基路径，并提供 `404.html` 回退，因此商品详情、会员中心和订单等前端路由可以直接访问或刷新。

## 数据与安全边界

- 商业状态只存储在当前浏览器的 IndexedDB，不会同步到服务器。
- 清除站点数据或结束无痕会话后，本地身份与历史记录无法恢复。
- 高级商品资格隐藏属于前端演示规则，不是服务端安全控制。
- 项目不收集真实账户、银行卡、收件人或支付资料。
