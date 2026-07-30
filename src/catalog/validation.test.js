import { describe, expect, it } from "vitest";
import homeDefinition from "./home.json";
import archiveProduct from "./products/guangdong-stool-archive-01.json";
import stoolProduct from "./products/guangdong-stool-01.json";
import stoolSeries from "./series/guangdong-stool-series.json";
import {
  collectCatalogAssetKeys,
  deepFreeze,
  validateCatalogData,
} from "./validation.js";

/**
 * 返回可安全修改的有效目录 fixture。
 * @returns {{series: object[], products: object[], home: object}} 目录 fixture。
 */
function createCatalogFixture() {
  return structuredClone({
    series: [stoolSeries],
    products: [stoolProduct, archiveProduct],
    home: homeDefinition,
  });
}

describe("商品目录纯函数校验", () => {
  it("现有 JSON 目录通过语义校验且校验过程不修改入参", () => {
    const catalog = createCatalogFixture();
    const before = JSON.stringify(catalog);

    expect(validateCatalogData(catalog)).toEqual({
      valid: true,
      errors: [],
    });
    expect(JSON.stringify(catalog)).toBe(before);
  });

  it("允许测试 fixture 增加第二系列和独立商品", () => {
    const catalog = createCatalogFixture();
    const secondSeries = structuredClone(stoolSeries);
    Object.assign(secondSeries, {
      id: "arcade-light-series",
      slug: "arcade-light",
      nameZh: "拱廊灯系列",
      nameEn: "ARCADE LIGHT SERIES",
      sortOrder: 20,
    });
    const secondProduct = structuredClone(stoolProduct);
    const independentVariant = structuredClone(
      secondProduct.variants[0],
    );
    Object.assign(independentVariant, {
      id: "arcade-lamp-brass",
      nameZh: "拱廊灯 01 · 暖铜",
      nameEn: "ARCADE LAMP N°01 · WARM BRASS",
      shortName: "暖铜",
    });
    Object.assign(secondProduct, {
      id: "arcade-lamp-01",
      slug: "arcade-lamp-01",
      legacySlugs: [],
      seriesId: secondSeries.id,
      nameZh: "拱廊灯 01",
      nameEn: "ARCADE LAMP N°01",
      defaultVariantId: independentVariant.id,
      variants: [independentVariant],
    });
    catalog.series.push(secondSeries);
    catalog.products.push(secondProduct);

    expect(validateCatalogData(catalog)).toEqual({
      valid: true,
      errors: [],
    });
  });

  it("同时报告重复标识、孤立系列、无效等级和缺失默认变体", () => {
    const catalog = createCatalogFixture();
    catalog.products[1].id = catalog.products[0].id;
    catalog.products[1].seriesId = "missing-series";
    catalog.products[0].variants[0].purchasePolicy.requiredTier = "unknown";
    catalog.products[0].defaultVariantId = "missing-variant";

    const codes = validateCatalogData(catalog).errors.map(
      (error) => error.code,
    );
    expect(codes).toEqual(
      expect.arrayContaining([
        "DUPLICATE_PRODUCT_ID",
        "UNKNOWN_SERIES",
        "INVALID_REQUIRED_TIER",
        "UNKNOWN_DEFAULT_VARIANT",
      ]),
    );
  });

  it("拒绝限定或高等级商品泄露资格要求和非法购买数量", () => {
    const catalog = createCatalogFixture();
    const limited = catalog.products[0].variants.find(
      (variant) => variant.id === "stool-red",
    );
    const standard = catalog.products[0].variants.find(
      (variant) => variant.id === "stool-grey",
    );
    limited.purchasePolicy.ineligiblePresentation = "membership_required";
    limited.purchasePolicy.maxPerOrder = 1.5;
    limited.purchasePolicy.lifetimeLimit.scope = "browser";
    standard.purchasePolicy.requiredTier = "collector";

    const codes = validateCatalogData(catalog).errors.map(
      (error) => error.code,
    );
    expect(codes).toEqual(
      expect.arrayContaining([
        "ADVANCED_PRODUCT_MUST_HIDE_REQUIREMENT",
        "INVALID_MAX_PER_ORDER",
        "INVALID_LIFETIME_LIMIT_SCOPE",
      ]),
    );
    expect(
      codes.filter((code) => code === "ADVANCED_PRODUCT_MUST_HIDE_REQUIREMENT"),
    ).toHaveLength(2);
  });

  it("核对媒体资源存在性和声明尺寸", () => {
    const catalog = createCatalogFixture();
    const assetKeys = collectCatalogAssetKeys(catalog);
    const assetMetadata = Object.fromEntries(
      assetKeys.map((assetKey) => [assetKey, { width: 1, height: 1 }]),
    );
    delete assetMetadata["assets/products/archive-set.png"];

    const result = validateCatalogData(catalog, { assetMetadata });
    expect(result.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining([
        "MISSING_ASSET",
        "ASSET_DIMENSION_MISMATCH",
      ]),
    );
  });

  it("收集去重资源键并递归冻结目录", () => {
    const catalog = createCatalogFixture();
    const keys = collectCatalogAssetKeys(catalog);
    expect(keys).toContain("assets/brand/home-hero-gallery.png");
    expect(new Set(keys).size).toBe(keys.length);

    const frozen = deepFreeze(catalog);
    expect(frozen).toBe(catalog);
    expect(Object.isFrozen(frozen.products[0].variants[0].media.hero)).toBe(
      true,
    );
  });
});
