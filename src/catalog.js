/**
 * 商品访问等级。
 * @typedef {"none" | "edition" | "collector" | "patron"} MembershipTier
 */

/**
 * 商品分类。
 * @typedef {"standard" | "limited" | "archive"} ProductClass
 */

/**
 * 商品变体。
 * @typedef {Object} ProductVariant
 * @property {string} id - 变体唯一标识。
 * @property {string} productId - 所属商品标识。
 * @property {string} slug - 商品详情页使用的路径片段。
 * @property {string} nameZh - 中文变体名称。
 * @property {string} nameEn - 英文变体名称。
 * @property {string} shortName - 列表使用的简短中文名称。
 * @property {ProductClass} productClass - 商品分类。
 * @property {MembershipTier} requiredTier - 实际购买所需等级；不得直接暴露在受限商品界面中。
 * @property {number} priceCents - 人民币价格，单位为分。
 * @property {number | null} purchaseLimit - 当前浏览器身份的终身购买上限；null 表示不限制。
 * @property {string} colorHex - UI 色样颜色。
 * @property {string} heroImage - 商品主图路径。
 * @property {string[]} gallery - 商品详情画廊路径。
 * @property {string} editionNote - 系列或限量说明。
 * @property {string} description - 商品叙事文案。
 */

/** 年度虚拟会费，单位为分。 */
export const MEMBERSHIP_FEE_CENTS = 68_800;

/** 一年会籍采用固定 365 天周期。 */
export const MEMBERSHIP_TERM_DAYS = 365;

/** 等级排序用于统一比较购买资格。 */
export const TIER_RANK = Object.freeze({
  none: 0,
  edition: 1,
  collector: 2,
  patron: 3,
});

/** 会员等级面向用户的名称。 */
export const TIER_LABELS = Object.freeze({
  none: { zh: "访客", en: "CLIENT" },
  edition: { zh: "辑选会员", en: "EDITION" },
  collector: { zh: "藏家会员", en: "COLLECTOR" },
  patron: { zh: "典藏会员", en: "PATRON" },
});

/** 商品消费升级门槛，单位为分。 */
export const TIER_THRESHOLDS = Object.freeze({
  collector: 5_000_000,
  patron: 12_000_000,
});

/** @type {ProductVariant[]} */
export const PRODUCT_VARIANTS = Object.freeze([
  {
    id: "stool-ivory",
    productId: "guangdong-stool-01",
    slug: "guangdong-stool-01",
    nameZh: "粤凳 01 · 瓷象牙",
    nameEn: "GUANGDONG STOOL N°01 · PORCELAIN IVORY",
    shortName: "瓷象牙",
    productClass: "standard",
    requiredTier: "edition",
    priceCents: 1_880_000,
    purchaseLimit: null,
    colorHex: "#d9d2bf",
    heroImage: "/assets/products/stool-ivory-three-quarter.png",
    gallery: [
      "/assets/products/stool-ivory-three-quarter.png",
      "/assets/products/stool-ivory-side.png",
    ],
    editionNote: "2026 常设系列",
    description:
      "暖象牙色收敛了熟悉轮廓的喧闹，让粤凳 01 以更安静的姿态进入当代空间。",
  },
  {
    id: "stool-grey",
    productId: "guangdong-stool-01",
    slug: "guangdong-stool-01",
    nameZh: "粤凳 01 · 骑楼灰",
    nameEn: "GUANGDONG STOOL N°01 · ARCADE GREY",
    shortName: "骑楼灰",
    productClass: "standard",
    requiredTier: "edition",
    priceCents: 1_880_000,
    purchaseLimit: null,
    colorHex: "#8f918f",
    heroImage: "/assets/products/stool-grey-three-quarter.png",
    gallery: [
      "/assets/products/stool-grey-three-quarter.png",
      "/assets/products/stool-grey-front.png",
    ],
    editionNote: "2026 常设系列",
    description:
      "冷灰色取自雨后骑楼的石面，与高光曲面形成克制而清晰的反差。",
  },
  {
    id: "stool-red",
    productId: "guangdong-stool-01",
    slug: "guangdong-stool-01",
    nameZh: "粤凳 01 · 岭南朱",
    nameEn: "GUANGDONG STOOL N°01 · LINGNAN ROUGE",
    shortName: "岭南朱",
    productClass: "limited",
    requiredTier: "collector",
    priceCents: 3_880_000,
    purchaseLimit: 1,
    colorHex: "#df151b",
    heroImage: "/assets/products/stool-red-three-quarter.png",
    gallery: [
      "/assets/products/stool-red-three-quarter.png",
      "/assets/products/stool-red-front.png",
      "/assets/products/stool-red-side.png",
      "/assets/products/stool-red-top-detail.png",
    ],
    editionNote: "2026 限定编号 · 每位会员限购一件",
    description:
      "岭南朱保留最直接的高光红色，将街巷、排档与家宴中的共同记忆凝练为一件醒目的当代器物。",
  },
  {
    id: "archive-set",
    productId: "guangdong-stool-archive-01",
    slug: "guangdong-stool-01",
    nameZh: "档案套装 01 · 三色典藏",
    nameEn: "ARCHIVE SET 01 · THREE-COLOUR EDITION",
    shortName: "三色典藏",
    productClass: "archive",
    requiredTier: "patron",
    priceCents: 12_800_000,
    purchaseLimit: 1,
    colorHex: "#b9a992",
    heroImage: "/assets/products/archive-set.png",
    gallery: [
      "/assets/products/archive-set.png",
      "/assets/brand/stool-tricolor-installation.png",
      "/assets/products/stool-red-front.png",
      "/assets/editorial/milano-standing-red.png",
    ],
    editionNote: "档案编号 · 每位会员限购一套",
    description:
      "瓷象牙、骑楼灰与岭南朱以档案方式共同呈现，形成一段可堆叠、可使用的岭南色彩记录。",
  },
]);

/**
 * 按标识返回商品变体。
 * @param {string} variantId - 商品变体标识。
 * @returns {ProductVariant | undefined} 商品变体。
 */
export function getVariant(variantId) {
  return PRODUCT_VARIANTS.find((variant) => variant.id === variantId);
}

/**
 * 将人民币分格式化为中文金额。
 * @param {number} amountCents - 金额，单位为分。
 * @returns {string} 格式化后的金额。
 */
export function formatCny(amountCents) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}
