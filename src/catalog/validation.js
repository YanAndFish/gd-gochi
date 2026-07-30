/**
 * 目录校验错误。
 * @typedef {Object} CatalogValidationError
 * @property {string} path - 错误字段在目录中的定位路径。
 * @property {string} code - 稳定的机器可读错误码。
 * @property {string} message - 面向维护者的中文错误说明。
 */

/**
 * PNG 等静态媒体的实际信息。
 * @typedef {Object} AssetMetadata
 * @property {number} width - 文件实际像素宽度。
 * @property {number} height - 文件实际像素高度。
 */

/**
 * 目录校验输入。
 * @typedef {Object} CatalogValidationInput
 * @property {unknown[]} series - 未归一化的系列定义。
 * @property {unknown[]} products - 未归一化的商品定义。
 * @property {unknown} home - 未归一化的首页陈列定义。
 */

/**
 * 目录校验选项。
 * @typedef {Object} CatalogValidationOptions
 * @property {Record<string, AssetMetadata> | undefined} assetMetadata - 按资源键索引的实际媒体信息；省略时只做语义校验。
 */

/**
 * 目录校验结果。
 * @typedef {Object} CatalogValidationResult
 * @property {boolean} valid - 目录是否通过全部校验。
 * @property {CatalogValidationError[]} errors - 全部校验错误。
 */

/** 商品分类允许值。 */
const PRODUCT_CLASSES = new Set(["standard", "limited", "archive"]);

/** 商品静态销售状态允许值。 */
const SALE_STATUSES = new Set(["active", "unavailable", "retired"]);

/** 购买资格等级允许值。 */
const REQUIRED_TIERS = new Set(["edition", "collector", "patron"]);

/** 资格不足公开表现允许值。 */
const INELIGIBLE_PRESENTATIONS = new Set([
  "membership_required",
  "unavailable",
]);

/** 终身限购统计范围允许值。 */
const LIFETIME_LIMIT_SCOPES = new Set(["variant", "product"]);

/** 媒体角色允许值。 */
const MEDIA_ROLES = new Set([
  "studio",
  "detail",
  "editorial-ai",
  "installation",
]);

/**
 * 判断值是否为不含数组的普通对象。
 * @param {unknown} value - 待判断的值。
 * @returns {value is Record<string, unknown>} 是否为普通对象。
 */
function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * 判断值是否为非空字符串。
 * @param {unknown} value - 待判断的值。
 * @returns {value is string} 是否为非空字符串。
 */
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * 判断值是否为正整数。
 * @param {unknown} value - 待判断的值。
 * @returns {value is number} 是否为正整数。
 */
function isPositiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

/**
 * 把校验错误追加到结果列表。
 * @param {CatalogValidationError[]} errors - 错误列表。
 * @param {string} path - 错误路径。
 * @param {string} code - 错误码。
 * @param {string} message - 中文错误说明。
 * @returns {void}
 */
function addError(errors, path, code, message) {
  errors.push({ path, code, message });
}

/**
 * 校验必填非空字符串。
 * @param {unknown} value - 待校验的值。
 * @param {string} path - 字段路径。
 * @param {CatalogValidationError[]} errors - 错误列表。
 * @returns {void}
 */
function validateRequiredString(value, path, errors) {
  if (!isNonEmptyString(value)) {
    addError(errors, path, "REQUIRED_STRING", "必须是非空字符串");
  }
}

/**
 * 校验用于 ID 或 URL 的短横线命名值。
 * @param {unknown} value - 待校验的值。
 * @param {string} path - 字段路径。
 * @param {CatalogValidationError[]} errors - 错误列表。
 * @returns {void}
 */
function validateMachineName(value, path, errors) {
  validateRequiredString(value, path, errors);
  if (
    isNonEmptyString(value) &&
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  ) {
    addError(
      errors,
      path,
      "INVALID_MACHINE_NAME",
      "只能使用小写字母、数字和单个短横线",
    );
  }
}

/**
 * 校验目录中的媒体记录，并按需核对真实文件信息。
 * @param {unknown} media - 媒体记录。
 * @param {string} path - 字段路径。
 * @param {CatalogValidationError[]} errors - 错误列表。
 * @param {Record<string, AssetMetadata> | undefined} assetMetadata - 实际媒体信息。
 * @returns {void}
 */
function validateMedia(media, path, errors, assetMetadata) {
  if (!isRecord(media)) {
    addError(errors, path, "INVALID_MEDIA", "必须是媒体对象");
    return;
  }

  validateRequiredString(media.assetKey, `${path}.assetKey`, errors);
  validateRequiredString(media.alt, `${path}.alt`, errors);
  validateRequiredString(media.caption, `${path}.caption`, errors);

  if (!MEDIA_ROLES.has(media.role)) {
    addError(
      errors,
      `${path}.role`,
      "INVALID_MEDIA_ROLE",
      "媒体角色必须是 studio、detail、editorial-ai 或 installation",
    );
  }
  if (typeof media.aiConcept !== "boolean") {
    addError(
      errors,
      `${path}.aiConcept`,
      "INVALID_AI_FLAG",
      "必须明确标记是否为 AI 概念影像",
    );
  }
  if (!isPositiveInteger(media.width) || !isPositiveInteger(media.height)) {
    addError(
      errors,
      `${path}.dimensions`,
      "INVALID_MEDIA_DIMENSIONS",
      "媒体宽高必须是正整数",
    );
  }

  if (isNonEmptyString(media.assetKey)) {
    if (
      media.assetKey.startsWith("/") ||
      media.assetKey.includes("..") ||
      !media.assetKey.startsWith("assets/")
    ) {
      addError(
        errors,
        `${path}.assetKey`,
        "INVALID_ASSET_KEY",
        "资源键必须是 public/assets 下无前导斜杠的相对路径",
      );
    }

    if (assetMetadata) {
      const actual = assetMetadata[media.assetKey];
      if (!actual) {
        addError(
          errors,
          `${path}.assetKey`,
          "MISSING_ASSET",
          `找不到资源文件 ${media.assetKey}`,
        );
      } else if (
        actual.width !== media.width ||
        actual.height !== media.height
      ) {
        addError(
          errors,
          `${path}.dimensions`,
          "ASSET_DIMENSION_MISMATCH",
          `声明为 ${media.width}×${media.height}，实际为 ${actual.width}×${actual.height}`,
        );
      }
    }
  }

  if (media.role === "editorial-ai" && media.aiConcept !== true) {
    addError(
      errors,
      `${path}.aiConcept`,
      "EDITORIAL_AI_MUST_BE_LABELLED",
      "editorial-ai 媒体必须标记为 AI 概念影像",
    );
  }
}

/**
 * 校验商品购买政策。
 * @param {unknown} policy - 购买政策。
 * @param {string} path - 字段路径。
 * @param {string | undefined} productClass - 商品分类。
 * @param {CatalogValidationError[]} errors - 错误列表。
 * @returns {void}
 */
function validatePurchasePolicy(policy, path, productClass, errors) {
  if (!isRecord(policy)) {
    addError(errors, path, "INVALID_PURCHASE_POLICY", "必须是购买政策对象");
    return;
  }

  if (!REQUIRED_TIERS.has(policy.requiredTier)) {
    addError(
      errors,
      `${path}.requiredTier`,
      "INVALID_REQUIRED_TIER",
      "购买等级必须是 edition、collector 或 patron",
    );
  }
  if (!INELIGIBLE_PRESENTATIONS.has(policy.ineligiblePresentation)) {
    addError(
      errors,
      `${path}.ineligiblePresentation`,
      "INVALID_INELIGIBLE_PRESENTATION",
      "公开表现必须是 membership_required 或 unavailable",
    );
  }
  if (
    (productClass === "limited" ||
      productClass === "archive" ||
      (REQUIRED_TIERS.has(policy.requiredTier) &&
        policy.requiredTier !== "edition")) &&
    policy.ineligiblePresentation !== "unavailable"
  ) {
    addError(
      errors,
      `${path}.ineligiblePresentation`,
      "ADVANCED_PRODUCT_MUST_HIDE_REQUIREMENT",
      "限定、典藏或高于 edition 的商品必须把资格不足统一表现为 unavailable",
    );
  }
  if (!isPositiveInteger(policy.maxPerOrder)) {
    addError(
      errors,
      `${path}.maxPerOrder`,
      "INVALID_MAX_PER_ORDER",
      "每单上限必须是正整数",
    );
  }

  if (policy.lifetimeLimit !== null) {
    if (!isRecord(policy.lifetimeLimit)) {
      addError(
        errors,
        `${path}.lifetimeLimit`,
        "INVALID_LIFETIME_LIMIT",
        "终身限购必须是 null 或限购对象",
      );
    } else {
      if (!isPositiveInteger(policy.lifetimeLimit.quantity)) {
        addError(
          errors,
          `${path}.lifetimeLimit.quantity`,
          "INVALID_LIFETIME_LIMIT_QUANTITY",
          "终身限购数量必须是正整数",
        );
      }
      if (!LIFETIME_LIMIT_SCOPES.has(policy.lifetimeLimit.scope)) {
        addError(
          errors,
          `${path}.lifetimeLimit.scope`,
          "INVALID_LIFETIME_LIMIT_SCOPE",
          "终身限购范围必须是 variant 或 product",
        );
      }
    }
  }
}

/**
 * 校验一个商品变体。
 * @param {unknown} variant - 变体定义。
 * @param {string} path - 字段路径。
 * @param {CatalogValidationError[]} errors - 错误列表。
 * @param {Record<string, AssetMetadata> | undefined} assetMetadata - 实际媒体信息。
 * @returns {void}
 */
function validateVariant(variant, path, errors, assetMetadata) {
  if (!isRecord(variant)) {
    addError(errors, path, "INVALID_VARIANT", "必须是商品变体对象");
    return;
  }

  validateMachineName(variant.id, `${path}.id`, errors);
  ["nameZh", "nameEn", "shortName", "editionNote", "description"].forEach(
    (field) => validateRequiredString(variant[field], `${path}.${field}`, errors),
  );

  if (!isRecord(variant.option)) {
    addError(
      errors,
      `${path}.option`,
      "INVALID_VARIANT_OPTION",
      "变体选项必须是对象",
    );
  } else {
    ["type", "value"].forEach((field) =>
      validateMachineName(
        variant.option[field],
        `${path}.option.${field}`,
        errors,
      ),
    );
    validateRequiredString(variant.option.label, `${path}.option.label`, errors);
    if (
      variant.option.colorHex !== undefined &&
      (typeof variant.option.colorHex !== "string" ||
        !/^#[0-9a-f]{6}$/i.test(variant.option.colorHex))
    ) {
      addError(
        errors,
        `${path}.option.colorHex`,
        "INVALID_COLOUR_HEX",
        "颜色值必须是六位十六进制色值",
      );
    }
  }

  if (!PRODUCT_CLASSES.has(variant.productClass)) {
    addError(
      errors,
      `${path}.productClass`,
      "INVALID_PRODUCT_CLASS",
      "商品分类必须是 standard、limited 或 archive",
    );
  }
  if (!SALE_STATUSES.has(variant.saleStatus)) {
    addError(
      errors,
      `${path}.saleStatus`,
      "INVALID_SALE_STATUS",
      "销售状态必须是 active、unavailable 或 retired",
    );
  }
  if (!isPositiveInteger(variant.priceCents)) {
    addError(
      errors,
      `${path}.priceCents`,
      "INVALID_PRICE",
      "价格必须是人民币分的正整数",
    );
  }

  validatePurchasePolicy(
    variant.purchasePolicy,
    `${path}.purchasePolicy`,
    typeof variant.productClass === "string"
      ? variant.productClass
      : undefined,
    errors,
  );

  if (!isRecord(variant.media)) {
    addError(errors, `${path}.media`, "INVALID_MEDIA_SET", "必须是媒体集合");
    return;
  }
  validateMedia(variant.media.hero, `${path}.media.hero`, errors, assetMetadata);
  if (
    !Array.isArray(variant.media.gallery) ||
    variant.media.gallery.length === 0
  ) {
    addError(
      errors,
      `${path}.media.gallery`,
      "EMPTY_GALLERY",
      "商品画廊至少需要一张图片",
    );
  } else {
    variant.media.gallery.forEach((media, index) =>
      validateMedia(
        media,
        `${path}.media.gallery[${index}]`,
        errors,
        assetMetadata,
      ),
    );
  }
}

/**
 * 校验商品的规格或详情文本条目。
 * @param {unknown} entries - 条目列表。
 * @param {string} path - 字段路径。
 * @param {readonly string[]} fields - 每个条目的必填字段。
 * @param {CatalogValidationError[]} errors - 错误列表。
 * @returns {void}
 */
function validateTextEntries(entries, path, fields, errors) {
  if (!Array.isArray(entries) || entries.length === 0) {
    addError(errors, path, "EMPTY_TEXT_ENTRIES", "至少需要一个文本条目");
    return;
  }
  entries.forEach((entry, index) => {
    if (!isRecord(entry)) {
      addError(
        errors,
        `${path}[${index}]`,
        "INVALID_TEXT_ENTRY",
        "必须是文本条目对象",
      );
      return;
    }
    fields.forEach((field) =>
      validateRequiredString(
        entry[field],
        `${path}[${index}].${field}`,
        errors,
      ),
    );
  });
}

/**
 * 校验完整商品与系列目录。
 * 此函数不读取文件、不修改入参，便于构建脚本与单元测试复用。
 * @param {CatalogValidationInput} input - 原始目录数据。
 * @param {CatalogValidationOptions} options - 可选的真实媒体信息。
 * @returns {CatalogValidationResult} 全量校验结果。
 */
export function validateCatalogData(input, options = {}) {
  /** @type {CatalogValidationError[]} */
  const errors = [];
  const series = Array.isArray(input?.series) ? input.series : [];
  const products = Array.isArray(input?.products) ? input.products : [];
  const home = input?.home;
  const assetMetadata = options.assetMetadata;

  if (!Array.isArray(input?.series) || series.length === 0) {
    addError(errors, "series", "EMPTY_SERIES", "目录至少需要一个商品系列");
  }
  if (!Array.isArray(input?.products) || products.length === 0) {
    addError(errors, "products", "EMPTY_PRODUCTS", "目录至少需要一个商品");
  }

  /** @type {Map<string, number>} */
  const seriesIds = new Map();
  /** @type {Map<string, number>} */
  const seriesSlugs = new Map();
  series.forEach((entry, index) => {
    const path = `series[${index}]`;
    if (!isRecord(entry)) {
      addError(errors, path, "INVALID_SERIES", "必须是系列对象");
      return;
    }
    validateMachineName(entry.id, `${path}.id`, errors);
    validateMachineName(entry.slug, `${path}.slug`, errors);
    ["nameZh", "nameEn", "eyebrow", "description"].forEach((field) =>
      validateRequiredString(entry[field], `${path}.${field}`, errors),
    );
    if (!Number.isSafeInteger(entry.sortOrder)) {
      addError(
        errors,
        `${path}.sortOrder`,
        "INVALID_SORT_ORDER",
        "系列排序必须是整数",
      );
    }
    validateMedia(
      entry.heroMedia,
      `${path}.heroMedia`,
      errors,
      assetMetadata,
    );
    if (isNonEmptyString(entry.id)) {
      if (seriesIds.has(entry.id)) {
        addError(
          errors,
          `${path}.id`,
          "DUPLICATE_SERIES_ID",
          `系列 ID 与 series[${seriesIds.get(entry.id)}] 重复`,
        );
      } else {
        seriesIds.set(entry.id, index);
      }
    }
    if (isNonEmptyString(entry.slug)) {
      if (seriesSlugs.has(entry.slug)) {
        addError(
          errors,
          `${path}.slug`,
          "DUPLICATE_SERIES_SLUG",
          `系列 slug 与 series[${seriesSlugs.get(entry.slug)}] 重复`,
        );
      } else {
        seriesSlugs.set(entry.slug, index);
      }
    }
  });

  /** @type {Map<string, number>} */
  const productIds = new Map();
  /** @type {Map<string, string>} */
  const productSlugOwners = new Map();
  /** @type {Map<string, {productId: string, index: number}>} */
  const variantIds = new Map();

  products.forEach((entry, productIndex) => {
    const path = `products[${productIndex}]`;
    if (!isRecord(entry)) {
      addError(errors, path, "INVALID_PRODUCT", "必须是商品对象");
      return;
    }
    ["id", "slug", "seriesId", "defaultVariantId"].forEach((field) =>
      validateMachineName(entry[field], `${path}.${field}`, errors),
    );
    ["nameZh", "nameEn", "summary", "publishedAt"].forEach((field) =>
      validateRequiredString(entry[field], `${path}.${field}`, errors),
    );

    if (isNonEmptyString(entry.id)) {
      if (productIds.has(entry.id)) {
        addError(
          errors,
          `${path}.id`,
          "DUPLICATE_PRODUCT_ID",
          `商品 ID 与 products[${productIds.get(entry.id)}] 重复`,
        );
      } else {
        productIds.set(entry.id, productIndex);
      }
    }

    const ownedSlugs = [
      entry.slug,
      ...(Array.isArray(entry.legacySlugs) ? entry.legacySlugs : []),
    ];
    if (!Array.isArray(entry.legacySlugs)) {
      addError(
        errors,
        `${path}.legacySlugs`,
        "INVALID_LEGACY_SLUGS",
        "历史 slug 必须是字符串数组",
      );
    }
    ownedSlugs.forEach((slug, slugIndex) => {
      const slugPath =
        slugIndex === 0
          ? `${path}.slug`
          : `${path}.legacySlugs[${slugIndex - 1}]`;
      validateMachineName(slug, slugPath, errors);
      if (!isNonEmptyString(slug)) {
        return;
      }
      const owner = productSlugOwners.get(slug);
      if (owner) {
        addError(
          errors,
          slugPath,
          "DUPLICATE_PRODUCT_SLUG",
          `slug 已在 ${owner} 使用`,
        );
      } else {
        productSlugOwners.set(slug, slugPath);
      }
    });

    if (!seriesIds.has(entry.seriesId)) {
      addError(
        errors,
        `${path}.seriesId`,
        "UNKNOWN_SERIES",
        `找不到系列 ${entry.seriesId}`,
      );
    }
    if (
      !isNonEmptyString(entry.publishedAt) ||
      Number.isNaN(Date.parse(entry.publishedAt)) ||
      new Date(entry.publishedAt).toISOString() !== entry.publishedAt
    ) {
      addError(
        errors,
        `${path}.publishedAt`,
        "INVALID_PUBLISHED_AT",
        "发布时间必须是有效的 UTC ISO 字符串",
      );
    }
    if (
      !Array.isArray(entry.searchTerms) ||
      entry.searchTerms.length === 0 ||
      entry.searchTerms.some((term) => !isNonEmptyString(term))
    ) {
      addError(
        errors,
        `${path}.searchTerms`,
        "INVALID_SEARCH_TERMS",
        "搜索词必须是至少含一个非空字符串的数组",
      );
    }
    validateTextEntries(
      entry.specifications,
      `${path}.specifications`,
      ["label", "value"],
      errors,
    );
    validateTextEntries(
      entry.detailSections,
      `${path}.detailSections`,
      ["title", "body"],
      errors,
    );

    if (!Array.isArray(entry.variants) || entry.variants.length === 0) {
      addError(
        errors,
        `${path}.variants`,
        "EMPTY_VARIANTS",
        "商品至少需要一个变体",
      );
      return;
    }

    entry.variants.forEach((variant, variantIndex) => {
      const variantPath = `${path}.variants[${variantIndex}]`;
      validateVariant(variant, variantPath, errors, assetMetadata);
      if (isRecord(variant) && isNonEmptyString(variant.id)) {
        const owner = variantIds.get(variant.id);
        if (owner) {
          addError(
            errors,
            `${variantPath}.id`,
            "DUPLICATE_VARIANT_ID",
            `变体 ID 与商品 ${owner.productId} 的第 ${owner.index + 1} 个变体重复`,
          );
        } else {
          variantIds.set(variant.id, {
            productId: String(entry.id),
            index: variantIndex,
          });
        }
      }
    });

    if (
      !entry.variants.some(
        (variant) =>
          isRecord(variant) && variant.id === entry.defaultVariantId,
      )
    ) {
      addError(
        errors,
        `${path}.defaultVariantId`,
        "UNKNOWN_DEFAULT_VARIANT",
        "默认变体必须属于当前商品",
      );
    }
  });

  if (!isRecord(home)) {
    addError(errors, "home", "INVALID_HOME", "首页陈列必须是对象");
  } else {
    if (!isRecord(home.hero)) {
      addError(errors, "home.hero", "INVALID_HOME_HERO", "首页主视觉必须是对象");
    } else {
      validateRequiredString(
        home.hero.productId,
        "home.hero.productId",
        errors,
      );
      validateRequiredString(
        home.hero.variantId,
        "home.hero.variantId",
        errors,
      );
      validateMedia(
        home.hero.media,
        "home.hero.media",
        errors,
        assetMetadata,
      );
      const heroVariant = variantIds.get(String(home.hero.variantId));
      if (!productIds.has(home.hero.productId)) {
        addError(
          errors,
          "home.hero.productId",
          "UNKNOWN_HOME_PRODUCT",
          "首页主视觉引用了不存在的商品",
        );
      }
      if (
        !heroVariant ||
        heroVariant.productId !== String(home.hero.productId)
      ) {
        addError(
          errors,
          "home.hero.variantId",
          "UNKNOWN_HOME_VARIANT",
          "首页主视觉变体必须属于所引用商品",
        );
      }
    }

    if (!Array.isArray(home.editorials)) {
      addError(
        errors,
        "home.editorials",
        "INVALID_HOME_EDITORIALS",
        "首页编辑影像必须是数组",
      );
    } else {
      const editorialIds = new Set();
      home.editorials.forEach((editorial, index) => {
        const path = `home.editorials[${index}]`;
        if (!isRecord(editorial)) {
          addError(
            errors,
            path,
            "INVALID_HOME_EDITORIAL",
            "必须是编辑影像对象",
          );
          return;
        }
        ["id", "productId", "variantId"].forEach((field) =>
          validateRequiredString(
            editorial[field],
            `${path}.${field}`,
            errors,
          ),
        );
        if (editorialIds.has(editorial.id)) {
          addError(
            errors,
            `${path}.id`,
            "DUPLICATE_EDITORIAL_ID",
            "首页编辑影像 ID 不能重复",
          );
        }
        editorialIds.add(editorial.id);
        const editorialVariant = variantIds.get(String(editorial.variantId));
        if (
          !editorialVariant ||
          editorialVariant.productId !== String(editorial.productId)
        ) {
          addError(
            errors,
            `${path}.variantId`,
            "UNKNOWN_EDITORIAL_VARIANT",
            "编辑影像变体必须属于所引用商品",
          );
        }
        validateMedia(
          editorial.media,
          `${path}.media`,
          errors,
          assetMetadata,
        );
      });
    }

    if (
      !Array.isArray(home.featuredProductIds) ||
      home.featuredProductIds.some((id) => !productIds.has(id))
    ) {
      addError(
        errors,
        "home.featuredProductIds",
        "UNKNOWN_FEATURED_PRODUCT",
        "首页精选商品必须全部存在",
      );
    }
    if (!productIds.has(home.archiveProductId)) {
      addError(
        errors,
        "home.archiveProductId",
        "UNKNOWN_ARCHIVE_PRODUCT",
        "首页档案商品必须存在",
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 从目录数据中收集全部去重后的媒体资源键。
 * 此函数只读取输入，不校验也不修改目录。
 * @param {CatalogValidationInput} input - 原始目录数据。
 * @returns {string[]} 按字典序排列的资源键。
 */
export function collectCatalogAssetKeys(input) {
  const keys = new Set();

  /**
   * 收集一个媒体对象中的资源键。
   * @param {unknown} media - 媒体记录。
   * @returns {void}
   */
  function collectMedia(media) {
    if (isRecord(media) && isNonEmptyString(media.assetKey)) {
      keys.add(media.assetKey);
    }
  }

  if (Array.isArray(input?.series)) {
    input.series.forEach((series) => {
      if (isRecord(series)) {
        collectMedia(series.heroMedia);
      }
    });
  }
  if (Array.isArray(input?.products)) {
    input.products.forEach((product) => {
      if (!isRecord(product) || !Array.isArray(product.variants)) {
        return;
      }
      product.variants.forEach((variant) => {
        if (!isRecord(variant) || !isRecord(variant.media)) {
          return;
        }
        collectMedia(variant.media.hero);
        if (Array.isArray(variant.media.gallery)) {
          variant.media.gallery.forEach(collectMedia);
        }
      });
    });
  }
  if (isRecord(input?.home)) {
    if (isRecord(input.home.hero)) {
      collectMedia(input.home.hero.media);
    }
    if (Array.isArray(input.home.editorials)) {
      input.home.editorials.forEach((editorial) => {
        if (isRecord(editorial)) {
          collectMedia(editorial.media);
        }
      });
    }
  }

  return [...keys].sort((left, right) => left.localeCompare(right));
}

/**
 * 递归冻结数组和普通对象。
 * 函数返回原引用，不克隆数据，适合在目录初始化完成后封存。
 * @template T
 * @param {T} value - 待冻结的目录值。
 * @param {WeakSet<object>} seen - 已访问对象集合，用于防止循环引用。
 * @returns {T} 已深度冻结的原值。
 */
export function deepFreeze(value, seen = new WeakSet()) {
  if (
    !value ||
    (typeof value !== "object" && typeof value !== "function") ||
    seen.has(value)
  ) {
    return value;
  }

  seen.add(value);
  Reflect.ownKeys(value).forEach((key) => {
    deepFreeze(value[key], seen);
  });
  return Object.freeze(value);
}
