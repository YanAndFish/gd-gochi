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

describe("踢踢拖拖目录契约", () => {
  it("归入独立粤拖系列，并提供正确尺寸的四色系列横幅", () => {
    const series = getSeriesBySlug("guangdong-flip-flop");

    expect(series).toMatchObject({
      id: "guangdong-flip-flop-series",
      slug: "guangdong-flip-flop",
      nameZh: "粤拖系列",
      nameEn: "GUANGDONG FLIP-FLOP SERIES",
      heroMedia: {
        assetKey:
          "assets/catalog/guangdong-flip-flop-01/flip-flop-blue-white/series-banner.png",
        role: "installation",
        aiConcept: true,
        width: 2048,
        height: 1152,
      },
    });
    expect(getProductsForSeries(series.id).map((product) => product.id)).toEqual([
      "guangdong-flip-flop-01",
    ]);
  });

  it("保留调侃商品名、四个颜色变体与 ¥6,800 常设购买政策", () => {
    const product = getProduct("guangdong-flip-flop-01");
    const variants = getVariantsForProduct(product.slug);

    expect(getProductBySlug("guangdong-flip-flop-01")).toBe(product);
    expect(product).toMatchObject({
      id: "guangdong-flip-flop-01",
      slug: "guangdong-flip-flop-01",
      seriesId: "guangdong-flip-flop-series",
      defaultVariantId: "flip-flop-blue-white",
      nameZh: "踢踢拖拖",
      nameEn: "KICKING ABOUT",
      minPriceCents: 680_000,
      maxPriceCents: 680_000,
    });
    expect(variants.map((variant) => variant.id)).toEqual([
      "flip-flop-blue-white",
      "flip-flop-green-white",
      "flip-flop-red-white",
      "flip-flop-black",
    ]);
    variants.forEach((variant) => {
      expect(variant).toMatchObject({
        productId: "guangdong-flip-flop-01",
        productClass: "standard",
        saleStatus: "active",
        priceCents: 680_000,
        purchasePolicy: {
          requiredTier: "edition",
          ineligiblePresentation: "membership_required",
          maxPerOrder: 4,
          lifetimeLimit: null,
        },
      });
      expect(variant.media.hero.assetKey).toBe(
        `assets/catalog/guangdong-flip-flop-01/${variant.id}/three-quarter.png`,
      );
    });
    expect(formatCurrency(variants[0].priceCents)).toBe("¥6,800");
    expect(TIER_LABELS[variants[0].purchasePolicy.requiredTier].en).toBe(
      "EDITION",
    );
  });

  it("默认蓝白提供六图画廊、米兰造型与无查询参数的 canonical 路由", () => {
    const blueWhite = getVariant("flip-flop-blue-white");

    expect(blueWhite.media.gallery).toHaveLength(6);
    expect(blueWhite.media.gallery).toContainEqual(
      expect.objectContaining({
        assetKey:
          "assets/catalog/guangdong-flip-flop-01/flip-flop-blue-white/editorial-ai.png",
        caption: "品牌 AI 概念影像 · 四色错落陈列",
        role: "editorial-ai",
        aiConcept: true,
        width: 1120,
        height: 1400,
      }),
    );
    expect(blueWhite.media.gallery).toContainEqual(
      expect.objectContaining({
        assetKey:
          "assets/catalog/guangdong-flip-flop-01/flip-flop-blue-white/milano-walking-blue-white.png",
        caption: "品牌 AI 概念影像 · 米兰造型",
        alt: expect.stringContaining("虚构成年米兰模特"),
        role: "editorial-ai",
        aiConcept: true,
        width: 1120,
        height: 1400,
      }),
    );
    for (const variantId of [
      "flip-flop-green-white",
      "flip-flop-red-white",
      "flip-flop-black",
    ]) {
      expect(getVariant(variantId).media.gallery).toHaveLength(4);
    }
    expect(resolveProductRoute("guangdong-flip-flop-01")).toMatchObject({
      status: "resolved",
      product: { id: "guangdong-flip-flop-01" },
      variant: { id: "flip-flop-blue-white" },
      canonicalPath: "/products/guangdong-flip-flop-01",
      canonicalSearch: "",
    });
  });
});
