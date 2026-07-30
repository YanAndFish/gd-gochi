import {
  MEMBERSHIP_TERM_DAYS,
  TIER_LABELS,
  TIER_RANK,
  TIER_THRESHOLDS,
} from "./catalog.js";

/**
 * 会籍状态。
 * @typedef {"guest" | "active" | "lapsed"} MembershipStatus
 */

/**
 * 可供资格判断的会员快照。
 * @typedef {Object} MembershipSnapshot
 * @property {MembershipStatus} status - 当前会籍状态。
 * @property {"none" | "edition" | "collector" | "patron"} tier - 当前等级。
 * @property {string | null} termEndAt - 当前会籍结束时间。
 * @property {number} qualifyingSpendCents - 终身有效商品消费金额。
 */

/**
 * 公开商品可售结果。
 * @typedef {Object} PublicAvailability
 * @property {"available" | "membership_required" | "sold_out"} state - 可供 UI 展示的状态。
 * @property {string} label - 可见且可用于无障碍名称的统一文案。
 */

/**
 * 按终身有效商品消费计算等级。
 * @param {number} qualifyingSpendCents - 有效商品消费金额，单位为分。
 * @returns {"edition" | "collector" | "patron"} 计算后的等级。
 */
export function resolveTier(qualifyingSpendCents) {
  if (qualifyingSpendCents >= TIER_THRESHOLDS.patron) {
    return "patron";
  }
  if (qualifyingSpendCents >= TIER_THRESHOLDS.collector) {
    return "collector";
  }
  return "edition";
}

/**
 * 返回下一会员等级及进度信息。
 * @param {number} qualifyingSpendCents - 有效商品消费金额，单位为分。
 * @returns {{nextTier: "collector" | "patron" | null, thresholdCents: number | null, progress: number}}
 * 下一等级、门槛和 0–1 的进度值。
 */
export function getTierProgress(qualifyingSpendCents) {
  if (qualifyingSpendCents < TIER_THRESHOLDS.collector) {
    return {
      nextTier: "collector",
      thresholdCents: TIER_THRESHOLDS.collector,
      progress: qualifyingSpendCents / TIER_THRESHOLDS.collector,
    };
  }
  if (qualifyingSpendCents < TIER_THRESHOLDS.patron) {
    const range = TIER_THRESHOLDS.patron - TIER_THRESHOLDS.collector;
    return {
      nextTier: "patron",
      thresholdCents: TIER_THRESHOLDS.patron,
      progress: (qualifyingSpendCents - TIER_THRESHOLDS.collector) / range,
    };
  }
  return { nextTier: null, thresholdCents: null, progress: 1 };
}

/**
 * 检查会籍在给定时间是否处于有效期。
 * @param {MembershipSnapshot | null | undefined} membership - 会员快照。
 * @param {Date} now - 用于判断的当前时间。
 * @returns {boolean} 是否为有效会籍。
 */
export function isMembershipActive(membership, now = new Date()) {
  return Boolean(
    membership &&
      membership.status === "active" &&
      membership.termEndAt &&
      new Date(membership.termEndAt).getTime() > now.getTime(),
  );
}

/**
 * 将日期增加固定天数。
 * @param {Date | string} value - 起始日期。
 * @param {number} days - 增加的天数。
 * @returns {string} UTC ISO 时间。
 */
export function addDays(value, days) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

/**
 * 计算下一次付费或免费续会的会籍结束时间。
 * @param {Date | string} startAt - 周期开始时间。
 * @returns {string} 365 天后的会籍结束时间。
 */
export function createMembershipTermEnd(startAt) {
  return addDays(startAt, MEMBERSHIP_TERM_DAYS);
}

/**
 * 判断当前等级是否达到商品所需等级。
 * @param {string} currentTier - 当前等级。
 * @param {string} requiredTier - 商品所需等级。
 * @returns {boolean} 是否达到等级。
 */
export function hasRequiredTier(currentTier, requiredTier) {
  return (TIER_RANK[currentTier] ?? 0) >= (TIER_RANK[requiredTier] ?? 0);
}

/**
 * 把真实资格投影为公开商品状态。
 * 限定与典藏商品在资格不足时必须统一显示缺货，不得泄露等级原因。
 * @param {import("./catalog.js").ProductVariant} variant - 商品变体。
 * @param {MembershipSnapshot | null | undefined} membership - 会员快照。
 * @param {number} purchasedQuantity - 当前身份历史购买数量。
 * @param {Date} now - 当前时间。
 * @returns {PublicAvailability} UI 可见状态。
 */
export function resolvePublicAvailability(
  variant,
  membership,
  purchasedQuantity = 0,
  now = new Date(),
) {
  const isAdvanced =
    variant.productClass === "limited" || variant.productClass === "archive";
  const active = isMembershipActive(membership, now);
  const reachedLimit =
    variant.purchaseLimit !== null &&
    purchasedQuantity >= variant.purchaseLimit;

  if (reachedLimit) {
    return { state: "sold_out", label: "暂时缺货" };
  }

  if (isAdvanced) {
    if (!active || !hasRequiredTier(membership?.tier ?? "none", variant.requiredTier)) {
      return { state: "sold_out", label: "暂时缺货" };
    }
    return { state: "available", label: "加入购物袋" };
  }

  if (!active) {
    return { state: "membership_required", label: "入会后选购" };
  }

  return { state: "available", label: "加入购物袋" };
}

/**
 * 返回会员等级的双语名称。
 * @param {string} tier - 会员等级。
 * @returns {{zh: string, en: string}} 双语等级名称。
 */
export function getTierLabel(tier) {
  return TIER_LABELS[tier] ?? TIER_LABELS.none;
}

/**
 * 根据物流计划和当前时间计算应到达的节点。
 * @param {{scheduledAt: string}[]} events - 按时间排序的物流事件。
 * @param {Date} now - 当前时间。
 * @returns {number} 已到达的最后节点索引。
 */
export function resolveShipmentStage(events, now = new Date()) {
  let stage = 0;
  events.forEach((event, index) => {
    if (new Date(event.scheduledAt).getTime() <= now.getTime()) {
      stage = index;
    }
  });
  return stage;
}
