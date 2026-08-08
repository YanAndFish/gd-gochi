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

describe("花里壶哨目录契约", () => {
  it("归入暖水有花样系列，并提供正确尺寸的五色系列横幅", () => {
    const series = getSeriesBySlug("floral-flask");

    expect(series).toMatchObject({
      id: "floral-flask-series",
      slug: "floral-flask",
      nameZh: "暖水有花样",
      nameEn: "WARM WATER IN BLOOM",
      sortOrder: 40,
      heroMedia: {
        assetKey:
          "assets/catalog/floral-flask-01/floral-flask-red/series-banner.png",
        role: "installation",
        aiConcept: true,
        width: 2048,
        height: 1152,
      },
    });
    expect(getProductsForSeries(series.id).map((product) => product.id)).toEqual([
      "floral-flask-01",
    ]);
  });

  it("保留调侃商品名、五个颜色变体与 ¥15,800 常设购买政策", () => {
    const product = getProduct("floral-flask-01");
    const variants = getVariantsForProduct(product.slug);

    expect(getProductBySlug("floral-flask-01")).toBe(product);
    expect(product).toMatchObject({
      id: "floral-flask-01",
      slug: "floral-flask-01",
      seriesId: "floral-flask-series",
      defaultVariantId: "floral-flask-red",
      nameZh: "花里壶哨",
      nameEn: "FLASKY BUSINESS",
      minPriceCents: 1_580_000,
      maxPriceCents: 1_580_000,
    });
    expect(variants.map((variant) => variant.id)).toEqual([
      "floral-flask-red",
      "floral-flask-violet",
      "floral-flask-aqua",
      "floral-flask-pink",
      "floral-flask-yellow",
    ]);
    variants.forEach((variant) => {
      expect(variant).toMatchObject({
        productId: "floral-flask-01",
        productClass: "standard",
        saleStatus: "active",
        priceCents: 1_580_000,
        purchasePolicy: {
          requiredTier: "edition",
          ineligiblePresentation: "membership_required",
          maxPerOrder: 4,
          lifetimeLimit: null,
        },
      });
      expect(variant.media.hero.assetKey).toBe(
        `assets/catalog/floral-flask-01/${variant.id}/three-quarter.png`,
      );
      expect(
        variant.media.gallery.slice(0, 4).map((media) => media.assetKey),
      ).toEqual(
        ["three-quarter.png", "front.png", "side.png", "closure-detail.png"].map(
          (filename) =>
            `assets/catalog/floral-flask-01/${variant.id}/${filename}`,
        ),
      );
    });
    expect(formatCurrency(variants[0].priceCents)).toBe("¥15,800");
    expect(TIER_LABELS[variants[0].purchasePolicy.requiredTier].en).toBe(
      "EDITION",
    );
  });

  it("默认朱红提供六图画廊、米兰提携造型与无参数 canonical 路由", () => {
    const red = getVariant("floral-flask-red");

    expect(red.media.gallery).toHaveLength(6);
    expect(red.media.gallery).toContainEqual(
      expect.objectContaining({
        assetKey:
          "assets/catalog/floral-flask-01/floral-flask-red/editorial-ai.png",
        caption: "品牌 AI 概念影像 · 五色暖水樽展馆陈列",
        role: "editorial-ai",
        aiConcept: true,
        width: 1120,
        height: 1400,
      }),
    );
    expect(red.media.gallery).toContainEqual(
      expect.objectContaining({
        assetKey:
          "assets/catalog/floral-flask-01/floral-flask-red/milano-carry-red.png",
        caption: "品牌 AI 概念影像 · 米兰造型",
        alt: expect.stringMatching(/虚构成年米兰模特.*顶部提梁携带/),
        role: "editorial-ai",
        aiConcept: true,
        width: 1120,
        height: 1400,
      }),
    );
    for (const variantId of [
      "floral-flask-violet",
      "floral-flask-aqua",
      "floral-flask-pink",
      "floral-flask-yellow",
    ]) {
      expect(getVariant(variantId).media.gallery).toHaveLength(4);
    }
    expect(resolveProductRoute("floral-flask-01")).toMatchObject({
      status: "resolved",
      product: { id: "floral-flask-01" },
      variant: { id: "floral-flask-red" },
      canonicalPath: "/products/floral-flask-01",
      canonicalSearch: "",
    });
  });
});
