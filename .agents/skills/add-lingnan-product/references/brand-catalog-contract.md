# 品牌与目录合同

## 不可破坏的身份

- `productId` 与 `variantId` 发布后永不改名、删除后复用或换绑到其他商品。
- 商品 slug 可以演进，但必须把旧 slug 记录在 `legacySlugs` 并保持 canonical 跳转。
- 每个商品只属于一个主系列；系列成员由 `seriesId` 反向生成，不维护第二份成员列表。
- 旧订单是成交快照，不按新目录回填名称、价格、图片或系列。

## 系列定义

`src/catalog/series/*.json` 至少包含：

- `id`：稳定唯一 ID。
- `slug`：系列 URL。
- `nameZh`、`nameEn`：双语名称。
- `eyebrow`：系列短标签。
- `description`：顾客可见系列说明。
- `heroMedia`：相对资源键、alt、说明和真实像素。
- `sortOrder`：稳定排序。

## 商品定义

`src/catalog/products/*.json` 至少包含：

- `id`、`slug`、`legacySlugs`、`seriesId`。
- `nameZh`、`nameEn`、`summary`、`publishedAt`。
- `defaultVariantId`、`searchTerms`。
- `specifications`：只包含已证实的标签和值。
- `detailSections`：标题与顾客文案。
- `variants`：一个或多个变体。

每个变体至少包含：

- `id`、`nameZh`、`nameEn`、`shortName`、`option`。
- `productClass`：`standard`、`limited` 或 `archive`，只用于陈列。
- `saleStatus`：`active`、`unavailable` 或 `retired`。
- `priceCents`：正整数人民币分。
- `editionNote`、`description`。
- `purchasePolicy` 和 `media`。

## 购买政策

```json
{
  "requiredTier": "edition",
  "ineligiblePresentation": "membership_required",
  "maxPerOrder": 4,
  "lifetimeLimit": null
}
```

终身限购结构：

```json
{
  "scope": "variant",
  "quantity": 1
}
```

- `requiredTier` 仅允许 `edition`、`collector`、`patron`。
- `ineligiblePresentation` 仅允许 `membership_required` 或 `unavailable`。
- `productClass` 只负责陈列，不得从分类单独推断资格或限购。
- 常设商品默认允许非会员看到“入会后选购”。
- limited、archive 或高于 edition 的商品必须使用 `unavailable`；资格不足、会籍失效、限购或不可售时，顾客只看到“暂时缺货”。
- `maxPerOrder` 是有限正整数；`lifetimeLimit: null` 只表示无终身限购。
- 商品级限购会合计同一 `productId` 的全部变体。
- 当前订单产生的等级提升只影响下一笔订单。
- 等级、枚举或政策无效时必须 fail closed，不得自行降级为可购买。

## 媒体合同

媒体项保存：

- `assetKey`：从 `public/` 起算且不含开头斜线和 Vite `BASE_URL`。
- `alt`：描述主体和视角，不暴露资格。
- `caption`：必要的顾客可见说明；AI 场景必须包含“品牌 AI 概念影像”。
- `role`：`studio`、`detail`、`editorial-ai` 或 `installation`。
- `aiConcept`：布尔值。
- `width`、`height`：文件真实像素。

不要移动或覆盖已发布旧资产。新增资产使用：

```text
public/assets/catalog/<product-id>/<variant-id>/
```

商品共用的编辑场景和新系列横幅放在该商品默认变体目录中，使用清晰文件名，并通过相对 `assetKey` 引用。

## 自动归类

1. 比较用途：坐具、灯具、桌器等功能必须相近。
2. 比较形态：主体结构与比例语言应有明确连续性。
3. 比较叙事：文化线索应能共享一个具体而非泛化的系列说明。
4. 三项均清晰匹配时复用系列；否则创建一个范围适中的新系列。
5. 不用价格或会员等级决定系列。
6. 只设置商品的 `seriesId`；总览、系列页、搜索和新品由目录索引自动生成，不另建成员清单。
