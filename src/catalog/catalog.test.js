import { describe, expect, it } from "vitest";
import {
  HOME_MERCHANDISING,
  PRODUCTS,
  PRODUCT_SERIES,
  PRODUCT_VARIANTS,
  formatCurrency,
  getProduct,
  getProductBySlug,
  getProductsForSeries,
  getSeriesBySlug,
  getVariant,
  getVariantsForProduct,
  publicAssetUrl,
  resolveProductRoute,
} from "../catalog.js";

describe("数据化商品目录", () => {
  it("自动装载并深度冻结现有系列、商品和十一个稳定变体", () => {
    expect(PRODUCT_SERIES).toHaveLength(2);
    expect(PRODUCTS.map((product) => product.id).sort()).toEqual([
      "clay-pot-01",
      "guangdong-stool-01",
      "guangdong-stool-02",
      "guangdong-stool-archive-01",
    ]);
    expect(PRODUCT_VARIANTS.map((variant) => variant.id).sort()).toEqual([
      "archive-set",
      "clay-pot-01-sand-brown",
      "stool-02-deep-blue",
      "stool-02-light-blue",
      "stool-02-orange",
      "stool-02-red",
      "stool-02-white",
      "stool-02-yellow",
      "stool-grey",
      "stool-ivory",
      "stool-red",
    ]);
    expect(Object.isFrozen(PRODUCTS)).toBe(true);
    expect(Object.isFrozen(PRODUCTS[0].variants[0].purchasePolicy)).toBe(true);
    expect(Object.isFrozen(HOME_MERCHANDISING.hero.media)).toBe(true);
  });

  it("通过 ID、slug 和系列返回稳定目录对象", () => {
    const stool = getProduct("guangdong-stool-01");
    expect(getProductBySlug("guangdong-stool-01")).toBe(stool);
    expect(getVariantsForProduct(stool.slug)).toEqual(stool.variants);
    expect(getVariant("stool-red")).toMatchObject({
      productId: stool.id,
      slug: stool.slug,
      priceCents: 3_880_000,
      requiredTier: "collector",
      purchaseLimit: 1,
      maxPerOrder: 1,
    });

    const series = getSeriesBySlug("guangdong-stool");
    expect(getProductsForSeries(series.id)).toHaveLength(3);
    expect(getProductsForSeries(series.slug)).toEqual(
      getProductsForSeries(series.id),
    );
  });

  it("为粤凳 02 保持六色隔离、默认浅蓝和统一常设购买政策", () => {
    const stool = getProduct("guangdong-stool-02");
    const variants = getVariantsForProduct(stool.slug);

    expect(stool).toMatchObject({
      slug: "guangdong-stool-02",
      seriesId: "guangdong-stool-series",
      defaultVariantId: "stool-02-light-blue",
      minPriceCents: 1_880_000,
      maxPriceCents: 1_880_000,
    });
    expect(variants.map((variant) => variant.id)).toEqual([
      "stool-02-light-blue",
      "stool-02-white",
      "stool-02-deep-blue",
      "stool-02-yellow",
      "stool-02-red",
      "stool-02-orange",
    ]);
    variants.forEach((variant) => {
      expect(variant).toMatchObject({
        productId: "guangdong-stool-02",
        productClass: "standard",
        saleStatus: "active",
        priceCents: 1_880_000,
        purchasePolicy: {
          requiredTier: "edition",
          ineligiblePresentation: "membership_required",
          maxPerOrder: 4,
          lifetimeLimit: null,
        },
      });
    });
    const lightBlue = getVariant("stool-02-light-blue");
    expect(lightBlue.media.hero.assetKey).toBe(
      "assets/catalog/guangdong-stool-02/stool-02-light-blue/three-quarter.png",
    );
    expect(lightBlue.media.gallery).toHaveLength(6);
    expect(lightBlue.media.gallery).toContainEqual(
      expect.objectContaining({
        assetKey:
          "assets/catalog/guangdong-stool-02/stool-02-light-blue/milano-standing-light-blue.png",
        alt: "虚构成年米兰模特与浅蓝粤凳 02 的造型展示",
        caption: "品牌 AI 概念影像 · 米兰造型",
        role: "editorial-ai",
        aiConcept: true,
        width: 1120,
        height: 1400,
      }),
    );
    expect(resolveProductRoute("guangdong-stool-02")).toMatchObject({
      status: "resolved",
      product: { id: "guangdong-stool-02" },
      variant: { id: "stool-02-light-blue" },
      canonicalPath: "/products/guangdong-stool-02",
      canonicalSearch: "",
    });
  });

  it("保留相对资源键，同时为旧页面生成部署地址", () => {
    const variant = getVariant("stool-ivory");
    expect(variant.media.hero.assetKey).toBe(
      "assets/products/stool-ivory-three-quarter.png",
    );
    expect(variant.heroImage).toBe(
      publicAssetUrl(variant.media.hero.assetKey),
    );
    expect(variant.gallery).toEqual(
      variant.media.gallery.map((media) => media.src),
    );
  });

  it("把旧粤凳路径上的 archive-set 跳转到独立 canonical 商品", () => {
    const resolution = resolveProductRoute(
      "guangdong-stool-01",
      "archive-set",
    );

    expect(resolution).toMatchObject({
      status: "redirect",
      reason: "variant_product_mismatch",
      canonicalPath: "/products/guangdong-stool-archive-01",
      canonicalSearch: "?variant=archive-set",
    });
    expect(resolution.product.id).toBe("guangdong-stool-archive-01");
  });

  it("未知变体回退到当前商品默认变体，未知商品返回 not_found", () => {
    expect(
      resolveProductRoute("guangdong-stool-01", "missing-variant"),
    ).toMatchObject({
      status: "redirect",
      reason: "unknown_variant",
      variant: { id: "stool-ivory" },
      canonicalSearch: "?variant=stool-ivory",
    });
    expect(resolveProductRoute("missing-product")).toEqual({
      status: "not_found",
      product: undefined,
      variant: undefined,
      canonicalPath: null,
      canonicalSearch: "",
      reason: "unknown_product",
    });
  });

  it("格式化人民币，并保持首页主视觉显式配置", () => {
    expect(formatCurrency(1_880_000)).toBe("¥18,800");
    expect(HOME_MERCHANDISING.hero).toMatchObject({
      productId: "guangdong-stool-01",
      variantId: "stool-red",
    });
  });
});
