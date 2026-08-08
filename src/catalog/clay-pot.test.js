import { describe, expect, it } from "vitest";
import {
  TIER_LABELS,
  formatCurrency,
  getProduct,
  getProductBySlug,
  getProductsForSeries,
  getSeriesBySlug,
  getVariant,
  getVariantsForProduct,
  resolveProductRoute,
} from "../catalog.js";

describe("慢慢滚目录契约", () => {
  it("归入煲点什么系列，并提供正确尺寸的系列横幅", () => {
    const series = getSeriesBySlug("clay-pot");

    expect(series).toMatchObject({
      id: "clay-pot-series",
      slug: "clay-pot",
      nameZh: "煲点什么",
      nameEn: "WHAT'S SIMMERING",
      heroMedia: {
        width: 2048,
        height: 1152,
      },
    });
    expect(getProductsForSeries(series.id).map((product) => product.id)).toEqual([
      "clay-pot-01",
    ]);
  });

  it("保持单一砂褐默认变体、常设价格与统一购买政策", () => {
    const product = getProduct("clay-pot-01");
    const variants = getVariantsForProduct(product.slug);
    const variant = getVariant("clay-pot-01-sand-brown");

    expect(getProductBySlug("clay-pot-01")).toBe(product);
    expect(product).toMatchObject({
      id: "clay-pot-01",
      slug: "clay-pot-01",
      seriesId: "clay-pot-series",
      defaultVariantId: "clay-pot-01-sand-brown",
      nameZh: "慢慢滚",
      nameEn: "SIMMER DOWN",
      minPriceCents: 1_280_000,
      maxPriceCents: 1_280_000,
    });
    expect(variants).toHaveLength(1);
    expect(variants[0]).toBe(variant);
    expect(variant).toMatchObject({
      productId: "clay-pot-01",
      nameZh: "慢慢滚 · 砂褐",
      nameEn: "SIMMER DOWN · SAND BROWN",
      productClass: "standard",
      saleStatus: "active",
      priceCents: 1_280_000,
      purchasePolicy: {
        requiredTier: "edition",
        ineligiblePresentation: "membership_required",
        maxPerOrder: 4,
        lifetimeLimit: null,
      },
    });
    expect(formatCurrency(variant.priceCents)).toBe("¥12,800");
    expect(TIER_LABELS[variant.purchasePolicy.requiredTier].en).toBe("EDITION");
  });

  it("提供六图画廊、双 AI 编辑场景与无查询参数的 canonical 路由", () => {
    const variant = getVariant("clay-pot-01-sand-brown");

    expect(variant.media.gallery).toHaveLength(6);
    expect(variant.media.gallery).toContainEqual(
      expect.objectContaining({
        role: "editorial-ai",
        aiConcept: true,
      }),
    );
    expect(variant.media.gallery).toContainEqual(
      expect.objectContaining({
        assetKey:
          "assets/catalog/clay-pot-01/clay-pot-01-sand-brown/milano-ai.png",
        caption: "品牌 AI 概念影像 · 米兰造型",
        alt: expect.stringContaining("虚构成年米兰模特"),
        role: "editorial-ai",
        aiConcept: true,
        width: 1120,
        height: 1400,
      }),
    );
    expect(resolveProductRoute("clay-pot-01")).toMatchObject({
      status: "resolved",
      product: { id: "clay-pot-01" },
      variant: { id: "clay-pot-01-sand-brown" },
      canonicalPath: "/products/clay-pot-01",
      canonicalSearch: "",
    });
  });
});
