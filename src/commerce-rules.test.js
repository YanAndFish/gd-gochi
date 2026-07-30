import { describe, expect, it } from "vitest";
import {
  TIER_THRESHOLDS,
  getVariant,
} from "./catalog.js";
import {
  evaluatePurchaseEligibility,
  hasRequiredTier,
  resolvePublicAvailability,
  resolveTier,
} from "./commerce-rules.js";

/** 资格判断使用的固定当前时间。 */
const AVAILABILITY_NOW = new Date("2026-07-30T08:00:00.000Z");

/**
 * 生成处于有效期内的会员快照。
 * @param {"edition" | "collector" | "patron"} tier - 需要模拟的会员等级。
 * @returns {{
 *   status: "active",
 *   tier: "edition" | "collector" | "patron",
 *   termEndAt: string,
 *   qualifyingSpendCents: number
 * }} 有效会员快照。
 */
function createActiveMembership(tier) {
  return {
    status: "active",
    tier,
    termEndAt: "2027-07-30T08:00:00.000Z",
    qualifyingSpendCents: 0,
  };
}

/**
 * 创建不依赖正式目录的测试商品变体。
 * @param {Object} [overrides] - 需要覆盖的变体字段。
 * @returns {Object} 可用于资格判断的变体。
 */
function createTestVariant(overrides = {}) {
  return {
    id: "test-variant",
    productId: "test-product",
    productClass: "standard",
    saleStatus: "active",
    purchasePolicy: {
      requiredTier: "edition",
      ineligiblePresentation: "membership_required",
      maxPerOrder: 4,
      lifetimeLimit: null,
    },
    ...overrides,
  };
}

describe("会员等级边界", () => {
  it.each([
    {
      amountCents: TIER_THRESHOLDS.collector - 1,
      expectedTier: "edition",
      title: "未满 ¥50,000",
    },
    {
      amountCents: TIER_THRESHOLDS.collector,
      expectedTier: "collector",
      title: "恰好 ¥50,000",
    },
    {
      amountCents: TIER_THRESHOLDS.patron - 1,
      expectedTier: "collector",
      title: "未满 ¥120,000",
    },
    {
      amountCents: TIER_THRESHOLDS.patron,
      expectedTier: "patron",
      title: "恰好 ¥120,000",
    },
  ])("$title 时解析为 $expectedTier", ({ amountCents, expectedTier }) => {
    expect(resolveTier(amountCents)).toBe(expectedTier);
  });
});

describe("统一购买资格", () => {
  it("非法当前等级和非法所需等级均 fail closed", () => {
    expect(hasRequiredTier("mystery", "mystery")).toBe(false);
    expect(hasRequiredTier("patron", "mystery")).toBe(false);
    expect(hasRequiredTier("mystery", "edition")).toBe(false);

    const invalidPolicy = createTestVariant({
      purchasePolicy: {
        requiredTier: "mystery",
        ineligiblePresentation: "membership_required",
        maxPerOrder: 4,
        lifetimeLimit: null,
      },
    });
    expect(
      evaluatePurchaseEligibility(
        invalidPolicy,
        createActiveMembership("patron"),
        { now: AVAILABILITY_NOW },
      ),
    ).toMatchObject({
      eligible: false,
      reason: "catalog_invalid",
      errorCode: "UNAVAILABLE",
      state: "sold_out",
    });

    expect(
      evaluatePurchaseEligibility(
        createTestVariant(),
        createActiveMembership("mystery"),
        { now: AVAILABILITY_NOW },
      ),
    ).toMatchObject({
      eligible: false,
      reason: "membership_tier_invalid",
      errorCode: "UNAVAILABLE",
      state: "sold_out",
    });
  });

  it("会泄露高级资格的购买政策一律 fail closed", () => {
    const highTierWithPublicPrompt = createTestVariant({
      purchasePolicy: {
        requiredTier: "collector",
        ineligiblePresentation: "membership_required",
        maxPerOrder: 4,
        lifetimeLimit: null,
      },
    });

    expect(
      evaluatePurchaseEligibility(
        highTierWithPublicPrompt,
        createActiveMembership("edition"),
        { now: AVAILABILITY_NOW },
      ),
    ).toMatchObject({
      eligible: false,
      reason: "catalog_invalid",
      errorCode: "UNAVAILABLE",
      label: "暂时缺货",
    });
  });

  it("资格完全由 purchasePolicy 决定而不读取商品类别", () => {
    const visuallyStandardButRestricted = createTestVariant({
      productClass: "standard",
      purchasePolicy: {
        requiredTier: "collector",
        ineligiblePresentation: "unavailable",
        maxPerOrder: 4,
        lifetimeLimit: null,
      },
    });

    expect(
      evaluatePurchaseEligibility(
        visuallyStandardButRestricted,
        createActiveMembership("edition"),
        { now: AVAILABILITY_NOW },
      ),
    ).toMatchObject({
      eligible: false,
      reason: "tier_insufficient",
      errorCode: "UNAVAILABLE",
      label: "暂时缺货",
    });
  });

  it("分别执行每单上限、变体终身限购和商品终身限购", () => {
    const variantLimited = createTestVariant({
      purchasePolicy: {
        requiredTier: "edition",
        ineligiblePresentation: "unavailable",
        maxPerOrder: 2,
        lifetimeLimit: { quantity: 3, scope: "variant" },
      },
    });
    const productLimited = createTestVariant({
      purchasePolicy: {
        requiredTier: "edition",
        ineligiblePresentation: "unavailable",
        maxPerOrder: 4,
        lifetimeLimit: { quantity: 3, scope: "product" },
      },
    });
    const membership = createActiveMembership("edition");

    expect(
      evaluatePurchaseEligibility(variantLimited, membership, {
        now: AVAILABILITY_NOW,
        requestedQuantity: 3,
        scopeOrderQuantity: 3,
      }),
    ).toMatchObject({ eligible: false, reason: "max_per_order" });
    expect(
      evaluatePurchaseEligibility(variantLimited, membership, {
        now: AVAILABILITY_NOW,
        requestedQuantity: 2,
        scopeOrderQuantity: 2,
        purchasedVariantQuantity: 2,
      }),
    ).toMatchObject({ eligible: false, reason: "lifetime_limit" });
    expect(
      evaluatePurchaseEligibility(productLimited, membership, {
        now: AVAILABILITY_NOW,
        requestedQuantity: 1,
        scopeOrderQuantity: 2,
        purchasedProductQuantity: 2,
      }),
    ).toMatchObject({ eligible: false, reason: "lifetime_limit" });
  });

  it("购买历史尚未就绪时只保守阻止含终身限购的商品", () => {
    const unlimited = createTestVariant();
    const limited = createTestVariant({
      purchasePolicy: {
        requiredTier: "edition",
        ineligiblePresentation: "unavailable",
        maxPerOrder: 4,
        lifetimeLimit: { quantity: 1, scope: "variant" },
      },
    });
    const membership = createActiveMembership("edition");

    expect(
      evaluatePurchaseEligibility(unlimited, membership, {
        now: AVAILABILITY_NOW,
        purchaseHistoryAvailable: false,
      }).eligible,
    ).toBe(true);
    expect(
      evaluatePurchaseEligibility(limited, membership, {
        now: AVAILABILITY_NOW,
        purchaseHistoryAvailable: false,
      }),
    ).toMatchObject({
      eligible: false,
      reason: "purchase_history_unavailable",
    });
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 0, 1.5])(
    "拒绝非法本单数量 %s",
    (requestedQuantity) => {
      expect(
        evaluatePurchaseEligibility(
          createTestVariant(),
          createActiveMembership("edition"),
          { now: AVAILABILITY_NOW, requestedQuantity },
        ),
      ).toMatchObject({
        eligible: false,
        reason: "invalid_quantity_context",
        errorCode: "INVALID_CART_ITEM",
      });
    },
  );
});

describe("受限商品公开状态", () => {
  it.each([
    {
      title: "访客查看限定款",
      variantId: "stool-red",
      membership: null,
      purchasedQuantity: 0,
    },
    {
      title: "失效典藏会员查看限定款",
      variantId: "stool-red",
      membership: {
        status: "lapsed",
        tier: "patron",
        termEndAt: "2026-07-29T08:00:00.000Z",
        qualifyingSpendCents: TIER_THRESHOLDS.patron,
      },
      purchasedQuantity: 0,
    },
    {
      title: "辑选会员查看限定款",
      variantId: "stool-red",
      membership: createActiveMembership("edition"),
      purchasedQuantity: 0,
    },
    {
      title: "藏家会员查看典藏套装",
      variantId: "archive-set",
      membership: createActiveMembership("collector"),
      purchasedQuantity: 0,
    },
    {
      title: "已达到限定款限购数量",
      variantId: "stool-red",
      membership: createActiveMembership("collector"),
      purchasedQuantity: 1,
    },
    {
      title: "已达到典藏套装限购数量",
      variantId: "archive-set",
      membership: createActiveMembership("patron"),
      purchasedQuantity: 1,
    },
  ])("$title 时只公开为暂时缺货", ({
    variantId,
    membership,
    purchasedQuantity,
  }) => {
    const variant = getVariant(variantId);

    expect(
      resolvePublicAvailability(
        variant,
        membership,
        purchasedQuantity,
        AVAILABILITY_NOW,
      ),
    ).toEqual({
      state: "sold_out",
      label: "暂时缺货",
    });
  });

  it("常规商品对非会员保留入会入口", () => {
    expect(
      resolvePublicAvailability(
        getVariant("stool-grey"),
        null,
        0,
        AVAILABILITY_NOW,
      ),
    ).toEqual({
      state: "membership_required",
      label: "入会后选购",
    });
  });
});
