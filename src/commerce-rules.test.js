import { describe, expect, it } from "vitest";
import {
  TIER_THRESHOLDS,
  getVariant,
} from "./catalog.js";
import {
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
