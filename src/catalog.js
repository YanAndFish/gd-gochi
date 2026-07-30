import homeDefinition from "./catalog/home.json";
import {
  deepFreeze,
  validateCatalogData,
} from "./catalog/validation.js";

/**
 * 商品访问等级。
 * @typedef {"none" | "edition" | "collector" | "patron"} MembershipTier
 */

/**
 * 商品分类。
 * @typedef {"standard" | "limited" | "archive"} ProductClass
 */

/**
 * 商品静态销售状态。
 * @typedef {"active" | "unavailable" | "retired"} SaleStatus
 */

/**
 * 商品资格不足时的公开表现。
 * @typedef {"membership_required" | "unavailable"} IneligiblePresentation
 */

/**
 * 媒体角色。
 * @typedef {"studio" | "detail" | "editorial-ai" | "installation"} MediaRole
 */

/**
 * 商品或系列媒体。
 * @typedef {Object} CatalogMedia
 * @property {string} assetKey - 相对于 public 目录且不含前导斜杠的资源键。
 * @property {string} src - 已应用当前 Vite 基路径的浏览器资源地址。
 * @property {string} alt - 图片替代文本。
 * @property {string} caption - 面向顾客的图片说明。
 * @property {MediaRole} role - 图片在商品叙事中的角色。
 * @property {boolean} aiConcept - 是否为品牌 AI 概念影像。
 * @property {number} width - 源图片像素宽度。
 * @property {number} height - 源图片像素高度。
 */

/**
 * 商品媒体集合。
 * @typedef {Object} ProductMediaSet
 * @property {CatalogMedia} hero - 商品变体主图。
 * @property {CatalogMedia[]} gallery - 按展示顺序排列的商品画廊。
 */

/**
 * 商品变体选项。
 * @typedef {Object} VariantOption
 * @property {string} type - 选项维度，例如 colour 或 edition。
 * @property {string} value - 选项的稳定机器值。
 * @property {string} label - 面向顾客的选项名称。
 * @property {string | undefined} colorHex - 可选的六位十六进制 UI 色样。
 */

/**
 * 终身限购规则。
 * @typedef {Object} LifetimeLimit
 * @property {number} quantity - 当前浏览器身份允许购买的总数量。
 * @property {"variant" | "product"} scope - 按当前变体或整个商品累计数量。
 */

/**
 * 商品购买政策。
 * @typedef {Object} PurchasePolicy
 * @property {Exclude<MembershipTier, "none">} requiredTier - 实际购买所需会员等级。
 * @property {IneligiblePresentation} ineligiblePresentation - 资格不足时允许公开的统一表现。
 * @property {number} maxPerOrder - 单笔订单允许购买的最大数量。
 * @property {LifetimeLimit | null} lifetimeLimit - 当前浏览器身份的终身限购；null 表示不限制。
 */

/**
 * 商品变体。
 * @typedef {Object} ProductVariant
 * @property {string} id - 变体唯一标识，订单和购物袋通过它保持兼容。
 * @property {string} productId - 所属商品唯一标识。
 * @property {string} seriesId - 所属系列唯一标识。
 * @property {string} slug - 所属商品的 canonical 路径片段。
 * @property {string} nameZh - 中文变体名称。
 * @property {string} nameEn - 英文变体名称。
 * @property {string} shortName - 列表和选择器使用的简短名称。
 * @property {VariantOption} option - 通用变体选项。
 * @property {ProductClass} productClass - 用于商品陈列的分类。
 * @property {SaleStatus} saleStatus - 商品的静态销售状态。
 * @property {number} priceCents - 人民币价格，单位为分。
 * @property {string} editionNote - 系列或版本说明。
 * @property {string} description - 商品变体叙事文案。
 * @property {PurchasePolicy} purchasePolicy - 完整购买资格和限购规则。
 * @property {ProductMediaSet} media - 包含主图与画廊的归一化媒体集合。
 * @property {MembershipTier} requiredTier - purchasePolicy.requiredTier 的旧接口兼容字段。
 * @property {number | null} purchaseLimit - 终身限购数量的旧接口兼容字段。
 * @property {number} maxPerOrder - 单笔上限的便捷兼容字段。
 * @property {string | null} colorHex - 颜色型选项的 UI 色样。
 * @property {string} heroImage - 已解析部署基路径的主图地址。
 * @property {string[]} gallery - 已解析部署基路径的画廊地址。
 */

/**
 * 商品规格。
 * @typedef {Object} ProductSpecification
 * @property {string} label - 规格项目名称。
 * @property {string} value - 规格项目内容。
 */

/**
 * 商品详情章节。
 * @typedef {Object} ProductDetailSection
 * @property {string} title - 章节标题。
 * @property {string} body - 章节正文。
 */

/**
 * 商品定义。
 * @typedef {Object} ProductDefinition
 * @property {string} id - 商品唯一标识。
 * @property {string} slug - 商品详情页 canonical 路径片段。
 * @property {string[]} legacySlugs - 仍需兼容并重定向的历史路径片段。
 * @property {string} seriesId - 所属主系列唯一标识。
 * @property {string} nameZh - 中文商品名称。
 * @property {string} nameEn - 英文商品名称。
 * @property {string} summary - 商品列表和详情页摘要。
 * @property {string} publishedAt - UTC ISO 发布时间。
 * @property {string} defaultVariantId - 未指定变体时使用的默认变体标识。
 * @property {string[]} searchTerms - 商品搜索使用的附加关键词。
 * @property {ProductSpecification[]} specifications - 商品规格列表。
 * @property {ProductDetailSection[]} detailSections - 商品叙事章节。
 * @property {ProductVariant[]} variants - 属于当前商品的全部变体。
 * @property {number} minPriceCents - 全部变体中的最低人民币分价格。
 * @property {number} maxPriceCents - 全部变体中的最高人民币分价格。
 * @property {string} heroImage - 默认变体的主图地址。
 */

/**
 * 商品系列定义。
 * @typedef {Object} ProductSeries
 * @property {string} id - 系列唯一标识。
 * @property {string} slug - 系列页路径片段。
 * @property {string} nameZh - 中文系列名称。
 * @property {string} nameEn - 英文系列名称。
 * @property {string} eyebrow - 系列短标签。
 * @property {string} description - 系列叙事文案。
 * @property {CatalogMedia} heroMedia - 系列横幅媒体。
 * @property {string} heroImage - 已解析部署基路径的系列横幅地址。
 * @property {number} sortOrder - 系列陈列顺序。
 */

/**
 * 首页主视觉配置。
 * @typedef {Object} HomeHero
 * @property {string} productId - 主视觉链接的商品标识。
 * @property {string} variantId - 主视觉展示的变体标识。
 * @property {CatalogMedia} media - 主视觉媒体。
 */

/**
 * 首页编辑影像配置。
 * @typedef {Object} HomeEditorial
 * @property {string} id - 编辑影像唯一标识。
 * @property {string} productId - 影像链接的商品标识。
 * @property {string} variantId - 影像展示的变体标识。
 * @property {CatalogMedia} media - 编辑影像媒体。
 */

/**
 * 首页陈列配置。
 * @typedef {Object} HomeMerchandising
 * @property {HomeHero} hero - 显式配置且不会被新商品自动替换的主视觉。
 * @property {HomeEditorial[]} editorials - 显式配置的编辑影像。
 * @property {string[]} featuredProductIds - 首页精选商品标识。
 * @property {string} archiveProductId - 首页档案区域商品标识。
 */

/**
 * 商品路由解析结果。
 * @typedef {Object} ProductRouteResolution
 * @property {"resolved" | "redirect" | "not_found"} status - 路由处理方式。
 * @property {ProductDefinition | undefined} product - 解析到的 canonical 商品。
 * @property {ProductVariant | undefined} variant - 解析到的商品变体。
 * @property {string | null} canonicalPath - canonical 商品路径。
 * @property {string} canonicalSearch - canonical 变体查询字符串。
 * @property {"canonical" | "legacy_slug" | "variant_product_mismatch" | "unknown_variant" | "unknown_product"} reason - 解析原因。
 */

/** 年度虚拟会费，单位为分。 */
export const MEMBERSHIP_FEE_CENTS = 68_800;

/** 一年会籍采用固定 365 天周期。 */
export const MEMBERSHIP_TERM_DAYS = 365;

/** 等级排序用于统一比较购买资格。 */
export const TIER_RANK = deepFreeze({
  none: 0,
  edition: 1,
  collector: 2,
  patron: 3,
});

/** 会员等级面向用户的名称。 */
export const TIER_LABELS = deepFreeze({
  none: { zh: "访客", en: "CLIENT" },
  edition: { zh: "辑选会员", en: "EDITION" },
  collector: { zh: "藏家会员", en: "COLLECTOR" },
  patron: { zh: "典藏会员", en: "PATRON" },
});

/** 商品消费升级门槛，单位为分。 */
export const TIER_THRESHOLDS = deepFreeze({
  collector: 5_000_000,
  patron: 12_000_000,
});

/**
 * 把 public 目录资源键转换为兼容本地根路径和 GitHub Pages 子路径的地址。
 * @param {string} assetKey - 相对于 public 目录的资源键。
 * @returns {string} 带当前 Vite 基路径的资源地址。
 */
export function publicAssetUrl(assetKey) {
  const baseUrl = import.meta.env?.BASE_URL ?? "/";
  return `${baseUrl}${String(assetKey).replace(/^\/+/, "")}`;
}

/**
 * 把原始媒体记录归一化为浏览器可直接使用的媒体。
 * @param {Omit<CatalogMedia, "src">} media - JSON 中的媒体记录。
 * @returns {CatalogMedia} 带部署资源地址的媒体。
 */
function normalizeMedia(media) {
  return {
    ...media,
    src: publicAssetUrl(media.assetKey),
  };
}

/**
 * 按文件路径稳定读取 Vite glob 模块的默认导出。
 * @template T
 * @param {Record<string, T>} modules - Vite eager glob 模块。
 * @returns {T[]} 按文件路径排序后的定义列表。
 */
function readGlobDefinitions(modules) {
  return Object.entries(modules)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, definition]) => definition);
}

/** Vite 在构建期自动发现的系列 JSON。 */
const rawSeriesDefinitions = readGlobDefinitions(
  import.meta.glob("./catalog/series/*.json", {
    eager: true,
    import: "default",
  }),
);

/** Vite 在构建期自动发现的商品 JSON。 */
const rawProductDefinitions = readGlobDefinitions(
  import.meta.glob("./catalog/products/*.json", {
    eager: true,
    import: "default",
  }),
);

const runtimeValidation = validateCatalogData({
  series: rawSeriesDefinitions,
  products: rawProductDefinitions,
  home: homeDefinition,
});

if (!runtimeValidation.valid) {
  const details = runtimeValidation.errors
    .map((error) => `${error.path}: ${error.message}`)
    .join("\n");
  throw new Error(`商品目录校验失败：\n${details}`);
}

/**
 * 把 JSON 变体归一化为兼容现有商店接口的变体。
 * @param {Omit<ProductDefinition, "variants" | "minPriceCents" | "maxPriceCents" | "heroImage">} product - 所属原始商品。
 * @param {Record<string, unknown>} variant - 原始变体。
 * @returns {ProductVariant} 归一化变体。
 */
function normalizeVariant(product, variant) {
  const hero = normalizeMedia(variant.media.hero);
  const gallery = variant.media.gallery.map(normalizeMedia);
  const lifetimeLimit = variant.purchasePolicy.lifetimeLimit;

  return {
    ...variant,
    productId: product.id,
    seriesId: product.seriesId,
    slug: product.slug,
    media: {
      hero,
      gallery,
    },
    requiredTier: variant.purchasePolicy.requiredTier,
    purchaseLimit: lifetimeLimit?.quantity ?? null,
    maxPerOrder: variant.purchasePolicy.maxPerOrder,
    colorHex: variant.option.colorHex ?? null,
    heroImage: hero.src,
    gallery: gallery.map((media) => media.src),
  };
}

/**
 * 把 JSON 商品归一化为应用目录对象。
 * @param {Record<string, unknown>} product - 原始商品。
 * @returns {ProductDefinition} 归一化商品。
 */
function normalizeProduct(product) {
  const variants = product.variants.map((variant) =>
    normalizeVariant(product, variant),
  );
  const prices = variants.map((variant) => variant.priceCents);
  const defaultVariant =
    variants.find((variant) => variant.id === product.defaultVariantId) ??
    variants[0];

  return {
    ...product,
    variants,
    minPriceCents: Math.min(...prices),
    maxPriceCents: Math.max(...prices),
    heroImage: defaultVariant.heroImage,
  };
}

/** 自动发现并深度冻结的全部商品系列。 */
export const PRODUCT_SERIES = deepFreeze(
  rawSeriesDefinitions
    .map((series) => {
      const heroMedia = normalizeMedia(series.heroMedia);
      return {
        ...series,
        heroMedia,
        heroImage: heroMedia.src,
      };
    })
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder || left.id.localeCompare(right.id),
    ),
);

/** 自动发现并深度冻结的全部商品。 */
export const PRODUCTS = deepFreeze(
  rawProductDefinitions
    .map(normalizeProduct)
    .sort(
      (left, right) =>
        Date.parse(right.publishedAt) - Date.parse(left.publishedAt) ||
        left.id.localeCompare(right.id),
    ),
);

/** 兼容交易层与现有页面的扁平商品变体目录。 */
export const PRODUCT_VARIANTS = deepFreeze(
  PRODUCTS.flatMap((product) => product.variants),
);

/** 深度冻结的首页显式陈列配置。 */
export const HOME_MERCHANDISING = deepFreeze({
  ...homeDefinition,
  hero: {
    ...homeDefinition.hero,
    media: normalizeMedia(homeDefinition.hero.media),
  },
  editorials: homeDefinition.editorials.map((editorial) => ({
    ...editorial,
    media: normalizeMedia(editorial.media),
  })),
});

/** 按 ID 索引的私有系列映射。 */
const seriesById = new Map(PRODUCT_SERIES.map((series) => [series.id, series]));

/** 按 slug 索引的私有系列映射。 */
const seriesBySlug = new Map(
  PRODUCT_SERIES.map((series) => [series.slug, series]),
);

/** 按 ID 索引的私有商品映射。 */
const productById = new Map(PRODUCTS.map((product) => [product.id, product]));

/** 按 canonical slug 索引的私有商品映射。 */
const productByCanonicalSlug = new Map(
  PRODUCTS.map((product) => [product.slug, product]),
);

/** 按 canonical 或历史 slug 索引的私有商品映射。 */
const productByAnySlug = new Map(
  PRODUCTS.flatMap((product) => [
    [product.slug, product],
    ...product.legacySlugs.map((slug) => [slug, product]),
  ]),
);

/** 按 ID 索引的私有变体映射。 */
const variantById = new Map(
  PRODUCT_VARIANTS.map((variant) => [variant.id, variant]),
);

/**
 * 按标识返回商品系列。
 * @param {string} seriesId - 商品系列标识。
 * @returns {ProductSeries | undefined} 商品系列。
 */
export function getSeries(seriesId) {
  return seriesById.get(seriesId);
}

/**
 * 按路径片段返回商品系列。
 * @param {string} slug - 商品系列路径片段。
 * @returns {ProductSeries | undefined} 商品系列。
 */
export function getSeriesBySlug(slug) {
  return seriesBySlug.get(slug);
}

/**
 * 按标识返回商品。
 * @param {string} productId - 商品标识。
 * @returns {ProductDefinition | undefined} 商品。
 */
export function getProduct(productId) {
  return productById.get(productId);
}

/**
 * 按 canonical 或历史路径片段返回商品。
 * @param {string} slug - 商品路径片段。
 * @returns {ProductDefinition | undefined} 商品。
 */
export function getProductBySlug(slug) {
  return productByAnySlug.get(slug);
}

/**
 * 按标识返回商品变体。
 * @param {string} variantId - 商品变体标识。
 * @returns {ProductVariant | undefined} 商品变体。
 */
export function getVariant(variantId) {
  return variantById.get(variantId);
}

/**
 * 返回某个系列的全部商品。
 * 参数可以是系列 ID 或系列 slug。
 * @param {string} seriesIdOrSlug - 系列 ID 或路径片段。
 * @returns {ProductDefinition[]} 已按目录顺序排列的商品。
 */
export function getProductsForSeries(seriesIdOrSlug) {
  const series =
    seriesById.get(seriesIdOrSlug) ?? seriesBySlug.get(seriesIdOrSlug);
  if (!series) {
    return [];
  }
  return PRODUCTS.filter((product) => product.seriesId === series.id);
}

/**
 * 返回某个商品的全部变体。
 * 参数可以是商品 ID、canonical slug 或历史 slug。
 * @param {string} productIdOrSlug - 商品 ID 或路径片段。
 * @returns {ProductVariant[]} 商品变体。
 */
export function getVariantsForProduct(productIdOrSlug) {
  const product =
    productById.get(productIdOrSlug) ?? productByAnySlug.get(productIdOrSlug);
  return product ? product.variants : [];
}

/**
 * 解析商品 slug 与可选变体查询，返回 canonical 路由决策。
 * @param {string} pathSlug - 当前 URL 中的商品路径片段。
 * @param {string | null | undefined} requestedVariantId - 查询参数中的变体标识。
 * @returns {ProductRouteResolution} 路由解析结果。
 */
export function resolveProductRoute(pathSlug, requestedVariantId) {
  const requestedProduct = productByAnySlug.get(pathSlug);
  const requestedVariant = requestedVariantId
    ? variantById.get(requestedVariantId)
    : undefined;

  if (!requestedProduct && !requestedVariant) {
    return {
      status: "not_found",
      product: undefined,
      variant: undefined,
      canonicalPath: null,
      canonicalSearch: "",
      reason: "unknown_product",
    };
  }

  const canonicalProduct = requestedVariant
    ? productById.get(requestedVariant.productId)
    : requestedProduct;
  if (!canonicalProduct) {
    return {
      status: "not_found",
      product: undefined,
      variant: undefined,
      canonicalPath: null,
      canonicalSearch: "",
      reason: "unknown_product",
    };
  }

  const hasUnknownVariant = Boolean(
    requestedVariantId && !requestedVariant,
  );
  const variant =
    requestedVariant ??
    canonicalProduct.variants.find(
      (entry) => entry.id === canonicalProduct.defaultVariantId,
    );
  const canonicalPath = `/products/${canonicalProduct.slug}`;
  const canonicalSearch = requestedVariantId
    ? `?variant=${variant.id}`
    : "";
  const usedLegacySlug =
    Boolean(requestedProduct) &&
    !productByCanonicalSlug.has(pathSlug);
  const variantProductMismatch =
    Boolean(requestedProduct && requestedVariant) &&
    requestedProduct.id !== requestedVariant.productId;

  if (variantProductMismatch) {
    return {
      status: "redirect",
      product: canonicalProduct,
      variant,
      canonicalPath,
      canonicalSearch,
      reason: "variant_product_mismatch",
    };
  }
  if (hasUnknownVariant) {
    return {
      status: "redirect",
      product: canonicalProduct,
      variant,
      canonicalPath,
      canonicalSearch,
      reason: "unknown_variant",
    };
  }
  if (usedLegacySlug) {
    return {
      status: "redirect",
      product: canonicalProduct,
      variant,
      canonicalPath,
      canonicalSearch,
      reason: "legacy_slug",
    };
  }

  return {
    status: "resolved",
    product: canonicalProduct,
    variant,
    canonicalPath,
    canonicalSearch,
    reason: "canonical",
  };
}

/**
 * 将人民币分格式化为中文金额。
 * @param {number} amountCents - 金额，单位为分。
 * @returns {string} 格式化后的金额。
 */
export function formatCurrency(amountCents) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

/**
 * 保留旧调用方使用的人民币格式化函数名。
 * @param {number} amountCents - 金额，单位为分。
 * @returns {string} 格式化后的金额。
 */
export function formatCny(amountCents) {
  return formatCurrency(amountCents);
}
