# LINGNAN EDITIONS「岭南辑造」

[![GitHub Pages](https://github.com/YanAndFish/gd-gochi/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/YanAndFish/gd-gochi/actions/workflows/deploy-pages.yml)

以岭南文化为源，辑造面向当代生活的设计器物。

**在线访问：[https://yanandfish.github.io/gd-gochi/](https://yanandfish.github.io/gd-gochi/)**

[![LINGNAN EDITIONS 首页](public/assets/brand/home-hero-gallery.png)](https://yanandfish.github.io/gd-gochi/)

## 项目简介

这是一个使用 React、Vite 与 IndexedDB 构建的本地优先奢侈零售概念网站。首发作品为「粤凳 01 / GUANGDONG STOOL N°01」，包含瓷象牙、骑楼灰、岭南朱及三色典藏版本。

网站提供完整的演示体验：

- 编辑型奢侈品牌首页、影棚商品图和多角度详情页。
- 品牌 AI 概念影像与虚构成年米兰模特造型。
- 365 天年度会籍及 EDITION、COLLECTOR、PATRON 等级。
- 会员资格、累计消费、限定作品可售状态与本机限购规则。
- 购物袋、礼宾结账、虚拟支付和幂等订单创建。
- 90 秒加速礼宾物流时间轴，刷新后继续按绝对时间推进。
- 身份、会籍、购物袋、订单与物流保留在当前浏览器中。

> 本项目仅用于本地零售概念演示。支付、订单及物流不会产生真实交易或履约。

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

```bash
npm test
npm run build
```

- Vitest 与 `fake-indexeddb` 覆盖身份初始化、会籍续期、等级边界、受限商品隐藏、事务回滚、并发幂等、历史订单快照和物流推进。
- 详细视觉及流程验收记录见 [design-qa.md](design-qa.md)。

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
