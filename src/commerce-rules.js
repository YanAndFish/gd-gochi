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
 * 购买资格计算上下文。
 * @typedef {Object} PurchaseEligibilityContext
 * @property {Date} [now] - 用于判断会籍有效期的当前时间。
 * @property {number} [requestedQuantity] - 当前变体在本单中的数量。
 * @property {number} [scopeOrderQuantity] - 终身限购作用域内本单的总数量。
 * @property {number} [purchasedVariantQuantity] - 当前身份历史购买该变体的数量。
 * @property {number} [purchasedProductQuantity] - 当前身份历史购买该商品的数量。
 * @property {boolean} [purchaseHistoryAvailable] - 历史订单是否已可靠读取。
 */

/**
 * 内部与公开层共用的购买资格结果。
 * @typedef {Object} PurchaseEligibility
 * @property {boolean} eligible - 是否允许继续购买。
 * @property {string | null} reason - 不可购买的内部稳定原因。
 * @property {"MEMBERSHIP_REQUIRED" | "UNAVAILABLE" | "INVALID_CART_ITEM" | null} errorCode - 交易层错误码。
 * @property {"available" | "membership_required" | "sold_out"} state - UI 公开状态。
 * @property {string} label - UI 与无障碍文本共用的公开文案。
 */

/** 购买资格允许使用的会员等级。 */
const PURCHASING_TIERS = new Set(["edition", "collector", "patron"]);

/** 资格不足时允许使用的公开呈现方式。 */
const INELIGIBLE_PRESENTATIONS = new Set([
  "membership_required",
  "unavailable",
]);

/** 商品目录允许使用的静态销售状态。 */
const SALE_STATUSES = new Set(["active", "unavailable", "retired"]);

/**
 * 判断数值是否为非负整数。
 * @param {number} value - 待检查的数值。
 * @returns {boolean} 是否为非负整数。
 */
function isNonNegativeInteger(value) {
  return Number.isInteger(value) && Number.isFinite(value) && value >= 0;
}

/**
 * 判断数值是否为正整数。
 * @param {number} value - 待检查的数值。
 * @returns {boolean} 是否为正整数。
 */
export function isPositiveInteger(value) {
  return isNonNegativeInteger(value) && value > 0;
}

/**
 * 创建统一的公开不可购买结果。
 * @param {string} reason - 内部稳定原因。
 * @param {"MEMBERSHIP_REQUIRED" | "UNAVAILABLE" | "INVALID_CART_ITEM"} [errorCode] - 交易错误码。
 * @param {"membership_required" | "unavailable"} [presentation] - 公开呈现方式。
 * @returns {PurchaseEligibility} 不可购买结果。
 */
function createIneligibleResult(
  reason,
  errorCode = "UNAVAILABLE",
  presentation = "unavailable",
) {
  if (
    errorCode === "MEMBERSHIP_REQUIRED" &&
    presentation === "membership_required"
  ) {
    return {
      eligible: false,
      reason,
      errorCode,
      state: "membership_required",
      label: "入会后选购",
    };
  }

  return {
    eligible: false,
    reason,
    errorCode,
    state: "sold_out",
    label: "暂时缺货",
  };
}

/**
 * 检查商品购买政策是否完整且安全。
 * @param {Object | null | undefined} policy - 商品购买政策。
 * @returns {boolean} 是否为可执行的购买政策。
 */
function isValidPurchasePolicy(policy) {
  if (
    !policy ||
    !PURCHASING_TIERS.has(policy.requiredTier) ||
    !INELIGIBLE_PRESENTATIONS.has(policy.ineligiblePresentation) ||
    !isPositiveInteger(policy.maxPerOrder)
  ) {
    return false;
  }

  if (
    policy.requiredTier !== "edition" &&
    policy.ineligiblePresentation !== "unavailable"
  ) {
    return false;
  }

  if (policy.lifetimeLimit === null) {
    return true;
  }

  return Boolean(
    policy.lifetimeLimit &&
      isPositiveInteger(policy.lifetimeLimit.quantity) &&
      (policy.lifetimeLimit.scope === "variant" ||
        policy.lifetimeLimit.scope === "product"),
  );
}

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
  if (
    !PURCHASING_TIERS.has(currentTier) ||
    !PURCHASING_TIERS.has(requiredTier)
  ) {
    return false;
  }
  return TIER_RANK[currentTier] >= TIER_RANK[requiredTier];
}

/**
 * 统一计算商品的真实资格、交易错误码和公开状态。
 * 商品类别只参与陈列，不能直接改变购买资格。
 * @param {import("./catalog.js").ProductVariant} variant - 商品变体。
 * @param {MembershipSnapshot | null | undefined} membership - 会员快照。
 * @param {PurchaseEligibilityContext} [context] - 本次判断所需的数量和时间上下文。
 * @returns {PurchaseEligibility} 内部与公开层共用的购买资格。
 */
export function evaluatePurchaseEligibility(
  variant,
  membership,
  {
    now = new Date(),
    requestedQuantity = 1,
    scopeOrderQuantity = requestedQuantity,
    purchasedVariantQuantity = 0,
    purchasedProductQuantity = 0,
    purchaseHistoryAvailable = true,
  } = {},
) {
  if (
    !variant ||
    !SALE_STATUSES.has(variant.saleStatus) ||
    !isValidPurchasePolicy(variant.purchasePolicy)
  ) {
    return createIneligibleResult("catalog_invalid");
  }

  if (variant.saleStatus !== "active") {
    return createIneligibleResult(`sale_status_${variant.saleStatus}`);
  }

  if (
    !isPositiveInteger(requestedQuantity) ||
    !isPositiveInteger(scopeOrderQuantity) ||
    scopeOrderQuantity < requestedQuantity ||
    !isNonNegativeInteger(purchasedVariantQuantity) ||
    !isNonNegativeInteger(purchasedProductQuantity)
  ) {
    return createIneligibleResult(
      "invalid_quantity_context",
      "INVALID_CART_ITEM",
    );
  }

  const policy = variant.purchasePolicy;
  if (!isMembershipActive(membership, now)) {
    return createIneligibleResult(
      "membership_inactive",
      policy.ineligiblePresentation === "membership_required"
        ? "MEMBERSHIP_REQUIRED"
        : "UNAVAILABLE",
      policy.ineligiblePresentation,
    );
  }

  if (!PURCHASING_TIERS.has(membership.tier)) {
    return createIneligibleResult("membership_tier_invalid");
  }

  if (!hasRequiredTier(membership.tier, policy.requiredTier)) {
    return createIneligibleResult(
      "tier_insufficient",
      policy.ineligiblePresentation === "membership_required"
        ? "MEMBERSHIP_REQUIRED"
        : "UNAVAILABLE",
      policy.ineligiblePresentation,
    );
  }

  if (requestedQuantity > policy.maxPerOrder) {
    return createIneligibleResult("max_per_order");
  }

  if (policy.lifetimeLimit && !purchaseHistoryAvailable) {
    return createIneligibleResult("purchase_history_unavailable");
  }

  if (policy.lifetimeLimit) {
    const purchasedQuantity =
      policy.lifetimeLimit.scope === "product"
        ? purchasedProductQuantity
        : purchasedVariantQuantity;
    if (
      purchasedQuantity + scopeOrderQuantity >
      policy.lifetimeLimit.quantity
    ) {
      return createIneligibleResult("lifetime_limit");
    }
  }

  return {
    eligible: true,
    reason: null,
    errorCode: null,
    state: "available",
    label: "加入购物袋",
  };
}

/**
 * 把统一资格结果投影为旧版 UI 可见状态。
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
  const result = evaluatePurchaseEligibility(variant, membership, {
    now,
    purchasedVariantQuantity: purchasedQuantity,
    purchasedProductQuantity: purchasedQuantity,
  });
  return { state: result.state, label: result.label };
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
