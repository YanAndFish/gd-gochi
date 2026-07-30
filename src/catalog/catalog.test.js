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
  it("自动装载并深度冻结现有系列、商品和四个稳定变体", () => {
    expect(PRODUCT_SERIES).toHaveLength(1);
    expect(PRODUCTS.map((product) => product.id).sort()).toEqual([
      "guangdong-stool-01",
      "guangdong-stool-archive-01",
    ]);
    expect(PRODUCT_VARIANTS.map((variant) => variant.id).sort()).toEqual([
      "archive-set",
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
    expect(getProductsForSeries(series.id)).toHaveLength(2);
    expect(getProductsForSeries(series.slug)).toEqual(
      getProductsForSeries(series.id),
    );
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
