import Dexie from "dexie";
import {
  MEMBERSHIP_FEE_CENTS,
  PRODUCT_VARIANTS,
  getVariant,
} from "./catalog.js";
import {
  createMembershipTermEnd,
  evaluatePurchaseEligibility,
  isMembershipActive,
  isPositiveInteger,
  resolveShipmentStage,
  resolveTier,
} from "./commerce-rules.js";

/** 本地数据库固定名称。 */
export const DATABASE_NAME = "lingnan-editions-commerce";

/** 当前来源下唯一身份使用的固定作用域键。 */
export const IDENTITY_SCOPE = "default-browser";

/** 订单配送使用的虚构演示地址，不采集或存储真实个人资料。 */
export const DEMO_DELIVERY = Object.freeze({
  recipient: "岭南礼宾访客",
  phone: "仅供本地演示",
  address: "广东省广州市荔湾区恩宁路 01 号 · 岭南辑造礼宾厅",
});

/**
 * 物流事件定义。
 * @typedef {Object} ShipmentMilestone
 * @property {string} key - 稳定事件键。
 * @property {string} label - 面向用户的物流描述。
 * @property {number} offsetSeconds - 相对于支付成功时间的秒数。
 */

/** @type {ShipmentMilestone[]} */
export const SHIPMENT_MILESTONES = Object.freeze([
  { key: "confirmed", label: "订单已确认", offsetSeconds: 0 },
  { key: "atelier", label: "岭南工坊备货", offsetSeconds: 12 },
  { key: "inspection", label: "礼宾质检", offsetSeconds: 28 },
  { key: "departed", label: "已离开广州", offsetSeconds: 45 },
  { key: "concierge", label: "目的地礼宾派送", offsetSeconds: 66 },
  { key: "delivered", label: "已签收", offsetSeconds: 90 },
]);

/**
 * 浏览器身份记录。
 * @typedef {Object} BrowserIdentityRecord
 * @property {string} scope - 当前来源下的固定唯一键。
 * @property {string} browserId - 浏览器身份唯一标识。
 * @property {string} createdAt - 创建时间，UTC ISO 字符串。
 */

/**
 * 会籍记录。
 * @typedef {Object} MembershipRecord
 * @property {string} browserId - 浏览器身份唯一标识。
 * @property {"guest" | "active" | "lapsed"} status - 会籍状态。
 * @property {"none" | "edition" | "collector" | "patron"} tier - 会员等级。
 * @property {number} cycle - 已开通的会籍周期序号。
 * @property {string | null} termStartAt - 当前周期开始时间。
 * @property {string | null} termEndAt - 当前周期结束时间。
 * @property {boolean} renewalQualified - 当前周期结束时是否具备一次免费续会资格。
 * @property {number} qualifyingSpendCents - 终身有效商品消费，单位为分。
 * @property {string} createdAt - 创建时间，UTC ISO 字符串。
 * @property {string} updatedAt - 更新时间，UTC ISO 字符串。
 */

/**
 * 会员流水记录。
 * @typedef {Object} MemberLedgerRecord
 * @property {string} id - 流水唯一标识。
 * @property {string} sourceKey - 幂等来源键。
 * @property {string} browserId - 浏览器身份唯一标识。
 * @property {"membership_fee" | "membership_free_renewal" | "merchandise"} type - 流水类型。
 * @property {number} amountCents - 流水金额，单位为分。
 * @property {number} qualifyingCents - 计入等级的金额，单位为分。
 * @property {string | null} orderId - 关联商品订单标识。
 * @property {string} createdAt - 创建时间，UTC ISO 字符串。
 */

/**
 * 购物袋记录。
 * @typedef {Object} CartRecord
 * @property {string} browserId - 浏览器身份唯一标识。
 * @property {number} revision - 每次变更递增的购物袋版本。
 * @property {string} updatedAt - 更新时间，UTC ISO 字符串。
 */

/**
 * 购物袋商品行。
 * @typedef {Object} CartItemRecord
 * @property {string} browserId - 浏览器身份唯一标识。
 * @property {string} variantId - 商品变体标识。
 * @property {number} quantity - 数量。
 * @property {string} addedAt - 首次加入时间，UTC ISO 字符串。
 * @property {string} updatedAt - 更新时间，UTC ISO 字符串。
 */

/**
 * 不可变订单商品快照。
 * @typedef {Object} OrderItemSnapshot
 * @property {string} variantId - 成交变体标识。
 * @property {string} productId - 成交商品标识。
 * @property {string} [seriesId] - 成交系列标识；旧订单可能不存在。
 * @property {string} [productSlug] - 成交商品路径；旧订单可能不存在。
 * @property {string} nameZh - 成交时中文名称。
 * @property {string} nameEn - 成交时英文名称。
 * @property {string} shortName - 成交时短名称。
 * @property {string} productClass - 成交时商品分类。
 * @property {number} priceCents - 成交单价，单位为分。
 * @property {number} quantity - 成交数量。
 * @property {string} image - 成交时可直接显示的图片地址。
 * @property {string} [imageAsset] - public 下无部署前缀的图片资源键。
 * @property {string} editionNote - 成交时版本说明。
 */

/**
 * 虚拟支付记录。
 * @typedef {Object} PaymentRecord
 * @property {string} id - 支付唯一标识。
 * @property {string} idempotencyKey - 幂等键。
 * @property {string} browserId - 浏览器身份唯一标识。
 * @property {"membership" | "merchandise"} purpose - 支付用途。
 * @property {"concierge" | "unionpay"} method - 虚拟支付方式。
 * @property {"succeeded"} status - 虚拟支付状态。
 * @property {number} amountCents - 支付金额，单位为分。
 * @property {string} createdAt - 创建时间，UTC ISO 字符串。
 */

/**
 * 不可变订单快照。
 * @typedef {Object} OrderRecord
 * @property {string} id - 订单唯一标识。
 * @property {string} checkoutKey - 购物袋版本对应的幂等结账键。
 * @property {string} orderNo - 面向用户的订单编号。
 * @property {string} browserId - 浏览器身份唯一标识。
 * @property {"confirmed"} status - 订单状态。
 * @property {OrderItemSnapshot[]} items - 成交时的商品名称、价格、数量与图片快照。
 * @property {number} subtotalCents - 商品小计，单位为分。
 * @property {number} shippingCents - 配送费，单位为分。
 * @property {number} totalCents - 订单总额，单位为分。
 * @property {"edition" | "collector" | "patron"} tierBefore - 本单成交前等级。
 * @property {"edition" | "collector" | "patron"} tierAfter - 本单成交后等级。
 * @property {typeof DEMO_DELIVERY} delivery - 虚构演示配送信息快照。
 * @property {string} createdAt - 支付成功时间，UTC ISO 字符串。
 */

/**
 * 物流记录。
 * @typedef {Object} ShipmentRecord
 * @property {string} id - 物流唯一标识。
 * @property {string} orderId - 关联订单标识。
 * @property {string} trackingNo - 面向用户的虚拟物流编号。
 * @property {string} browserId - 浏览器身份唯一标识。
 * @property {number} currentStage - 已到达的最后节点索引。
 * @property {string} status - 当前节点稳定键。
 * @property {Array<{key: string, label: string, scheduledAt: string}>} events - 固定绝对时间表。
 * @property {string | null} nextTransitionAt - 下一节点时间。
 * @property {string} createdAt - 创建时间，UTC ISO 字符串。
 * @property {string} updatedAt - 更新时间，UTC ISO 字符串。
 */

/**
 * 业务错误。错误码供页面统一映射为不泄露资格的公开文案。
 */
export class CommerceError extends Error {
  /**
   * 创建业务错误。
   * @param {string} code - 稳定错误码。
   * @param {string} [message] - 内部错误说明。
   */
  constructor(code, message = code) {
    super(message);
    this.name = "CommerceError";
    this.code = code;
  }
}

/**
 * 创建岭南辑造本地数据库。
 * @param {string} [name] - 数据库名称；测试可传入隔离名称。
 * @returns {Dexie} Dexie 数据库实例。
 */
export function createCommerceDatabase(name = DATABASE_NAME) {
  const database = new Dexie(name);
  database.version(1).stores({
    identities: "&scope,&browserId,createdAt",
    memberships: "&browserId,status,tier,termEndAt,updatedAt",
    memberLedger: "id,&sourceKey,browserId,type,createdAt",
    carts: "&browserId,revision,updatedAt",
    cartItems: "[browserId+variantId],browserId,variantId,updatedAt",
    payments: "id,&idempotencyKey,browserId,purpose,status,createdAt",
    orders:
      "id,&checkoutKey,&orderNo,browserId,[browserId+createdAt],createdAt,status",
    shipments: "id,&orderId,&trackingNo,browserId,status,nextTransitionAt",
  });
  return database;
}

/** 应用共享的 Dexie 数据库实例。 */
export const commerceDb = createCommerceDatabase();

/**
 * 生成浏览器与测试环境均可用的唯一标识。
 * @returns {string} 唯一标识。
 */
function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

/** 未知购物袋行使用的中性占位图。 */
const UNAVAILABLE_ITEM_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='800' viewBox='0 0 640 800'%3E%3Crect width='640' height='800' fill='%23eeeae3'/%3E%3Cpath d='M224 400h192M320 304v192' stroke='%23918c84' stroke-width='2'/%3E%3C/svg%3E";

/**
 * 创建未知购物袋行的安全展示占位变体。
 * @param {string} variantId - IndexedDB 中保留的原始变体标识。
 * @returns {import("./catalog.js").ProductVariant} 不参与计价的占位变体。
 */
function createUnavailableCartVariant(variantId) {
  return {
    id: variantId,
    productId: "",
    seriesId: "",
    slug: "",
    nameZh: "商品已下架",
    nameEn: "ITEM UNAVAILABLE",
    shortName: "暂时缺货",
    option: {
      type: "status",
      value: "retired",
      label: "暂时缺货",
      colorHex: "#d8d4cd",
    },
    productClass: "standard",
    saleStatus: "retired",
    requiredTier: "edition",
    purchaseLimit: null,
    maxPerOrder: 1,
    priceCents: 0,
    colorHex: "#d8d4cd",
    heroImage: UNAVAILABLE_ITEM_IMAGE,
    gallery: [],
    editionNote: "作品状态",
    description: "这件作品目前无法继续选购。",
    media: {
      hero: {
        assetKey: "",
        src: UNAVAILABLE_ITEM_IMAGE,
        alt: "已下架商品占位图",
        caption: "暂时缺货",
        role: "studio",
        aiConcept: false,
        width: 640,
        height: 800,
      },
      gallery: [],
    },
    purchasePolicy: {
      requiredTier: "edition",
      ineligiblePresentation: "unavailable",
      maxPerOrder: 1,
      lifetimeLimit: null,
    },
  };
}

/**
 * 将购物袋原始行与当前代码目录合并，同时保留未知和已下架行。
 * @param {CartItemRecord} row - IndexedDB 原始购物袋行。
 * @returns {CartItemRecord & {variant: Object, catalogStatus: string, unavailable: boolean}}
 * 可供界面安全展示的购物袋行。
 */
export function mergeCartItemWithCatalog(row) {
  const catalogVariant = getVariant(row.variantId);
  const catalogStatus = catalogVariant?.saleStatus ?? "missing";
  return {
    ...row,
    variant: catalogVariant ?? createUnavailableCartVariant(row.variantId),
    catalogStatus,
    unavailable: catalogStatus !== "active",
  };
}

/**
 * 从历史订单快照解析商品标识，兼容未保存 productId 的更早记录。
 * @param {Object} item - 历史订单商品快照。
 * @returns {string | null} 商品标识。
 */
function resolveOrderItemProductId(item) {
  return item.productId ?? getVariant(item.variantId)?.productId ?? null;
}

/**
 * 汇总历史订单在变体和商品两个作用域内的成交数量。
 * @param {OrderRecord[]} orders - 当前身份历史订单。
 * @returns {{variants: Map<string, number>, products: Map<string, number>}} 数量索引。
 */
function summarizePurchasedQuantities(orders) {
  const variants = new Map();
  const products = new Map();

  orders.forEach((order) => {
    (order.items ?? []).forEach((item) => {
      variants.set(
        item.variantId,
        (variants.get(item.variantId) ?? 0) + item.quantity,
      );
      const productId = resolveOrderItemProductId(item);
      if (productId) {
        products.set(
          productId,
          (products.get(productId) ?? 0) + item.quantity,
        );
      }
    });
  });

  return { variants, products };
}

/**
 * 计算当前购物袋中同一商品的总数量。
 * @param {CartItemRecord[]} rows - 购物袋原始行。
 * @param {string} productId - 商品标识。
 * @returns {number} 同一商品在购物袋中的总数量。
 */
function countCartProductQuantity(rows, productId) {
  return rows.reduce((total, row) => {
    const rowVariant = getVariant(row.variantId);
    return rowVariant?.productId === productId ? total + row.quantity : total;
  }, 0);
}

/**
 * 将统一资格结果转换为交易错误。
 * @param {import("./commerce-rules.js").PurchaseEligibility} eligibility - 资格结果。
 * @returns {never}
 */
function throwEligibilityError(eligibility) {
  throw new CommerceError(eligibility.errorCode ?? "UNAVAILABLE");
}

/**
 * 创建初始会籍记录。
 * @param {string} browserId - 浏览器身份标识。
 * @param {string} nowIso - 当前 UTC ISO 时间。
 * @returns {MembershipRecord} 初始会籍。
 */
function createGuestMembership(browserId, nowIso) {
  return {
    browserId,
    status: "guest",
    tier: "none",
    cycle: 0,
    termStartAt: null,
    termEndAt: null,
    renewalQualified: false,
    qualifyingSpendCents: 0,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

/**
 * 原子初始化当前来源下唯一浏览器身份及其购物袋和会籍。
 * 多标签页同时首次访问时，唯一主键保证只会保留一个身份。
 * @param {Dexie} database - Dexie 数据库实例。
 * @param {Date} [now] - 当前时间。
 * @returns {Promise<BrowserIdentityRecord>} 浏览器身份记录。
 */
export async function initializeBrowserIdentity(database = commerceDb, now = new Date()) {
  const nowIso = now.toISOString();

  try {
    return await database.transaction(
      "rw",
      database.identities,
      database.memberships,
      database.carts,
      async () => {
        let identity = await database.identities.get(IDENTITY_SCOPE);
        if (!identity) {
          identity = {
            scope: IDENTITY_SCOPE,
            browserId: createId(),
            createdAt: nowIso,
          };
          await database.identities.add(identity);
        }

        if (!(await database.memberships.get(identity.browserId))) {
          await database.memberships.add(
            createGuestMembership(identity.browserId, nowIso),
          );
        }
        if (!(await database.carts.get(identity.browserId))) {
          await database.carts.add({
            browserId: identity.browserId,
            revision: 0,
            updatedAt: nowIso,
          });
        }
        return identity;
      },
    );
  } catch (error) {
    if (error?.name === "ConstraintError") {
      const identity = await database.identities.get(IDENTITY_SCOPE);
      if (identity) {
        return initializeBrowserIdentity(database, now);
      }
    }
    throw error;
  }
}

/**
 * 在当前事务中根据到期时间刷新会籍，只允许向前推进一个年度周期。
 * @param {Dexie} database - Dexie 数据库实例。
 * @param {string} browserId - 浏览器身份标识。
 * @param {Date} now - 当前时间。
 * @returns {Promise<MembershipRecord>} 刷新后的会籍。
 */
async function refreshMembershipInTransaction(database, browserId, now) {
  /** @type {MembershipRecord | undefined} */
  const membership = await database.memberships.get(browserId);
  if (!membership) {
    throw new CommerceError("IDENTITY_MISSING");
  }

  if (
    membership.status !== "active" ||
    !membership.termEndAt ||
    new Date(membership.termEndAt).getTime() > now.getTime()
  ) {
    return membership;
  }

  const nowIso = now.toISOString();
  if (!membership.renewalQualified) {
    const lapsed = {
      ...membership,
      status: "lapsed",
      updatedAt: nowIso,
    };
    await database.memberships.put(lapsed);
    return lapsed;
  }

  const previousCycle = membership.cycle;
  const nextEndAt = createMembershipTermEnd(membership.termEndAt);
  const renewed = {
    ...membership,
    status:
      new Date(nextEndAt).getTime() > now.getTime() ? "active" : "lapsed",
    cycle: previousCycle + 1,
    termStartAt: membership.termEndAt,
    termEndAt: nextEndAt,
    renewalQualified: false,
    updatedAt: nowIso,
  };
  const sourceKey = `renewal:${browserId}:cycle:${previousCycle}`;
  await database.memberLedger.add({
    id: createId(),
    sourceKey,
    browserId,
    type: "membership_free_renewal",
    amountCents: 0,
    qualifyingCents: 0,
    orderId: null,
    createdAt: nowIso,
  });
  await database.memberships.put(renewed);
  return renewed;
}

/**
 * 刷新并读取会籍状态。
 * @param {Dexie} database - Dexie 数据库实例。
 * @param {string} browserId - 浏览器身份标识。
 * @param {Date} [now] - 当前时间。
 * @returns {Promise<MembershipRecord>} 刷新后的会籍。
 */
export async function refreshMembership(database, browserId, now = new Date()) {
  return database.transaction(
    "rw",
    database.memberships,
    database.memberLedger,
    () => refreshMembershipInTransaction(database, browserId, now),
  );
}

/**
 * 通过本地虚拟支付开通或重新开通年度会籍。
 * @param {Dexie} database - Dexie 数据库实例。
 * @param {string} browserId - 浏览器身份标识。
 * @param {{idempotencyKey: string, method: "concierge" | "unionpay", now?: Date}} options - 支付选项。
 * @returns {Promise<{membership: MembershipRecord, payment: PaymentRecord | null, created: boolean}>}
 * 会籍与支付结果。
 */
export async function activateMembership(
  database,
  browserId,
  { idempotencyKey, method, now = new Date() },
) {
  if (!idempotencyKey) {
    throw new CommerceError("PAYMENT_KEY_REQUIRED");
  }

  return database.transaction(
    "rw",
    database.memberships,
    database.memberLedger,
    database.payments,
    async () => {
      const existingPayment = await database.payments
        .where("idempotencyKey")
        .equals(idempotencyKey)
        .first();
      if (existingPayment) {
        const membership = await database.memberships.get(browserId);
        return { membership, payment: existingPayment, created: false };
      }

      const current = await refreshMembershipInTransaction(
        database,
        browserId,
        now,
      );
      if (isMembershipActive(current, now)) {
        return { membership: current, payment: null, created: false };
      }

      const nowIso = now.toISOString();
      /** @type {PaymentRecord} */
      const payment = {
        id: createId(),
        idempotencyKey,
        browserId,
        purpose: "membership",
        method,
        status: "succeeded",
        amountCents: MEMBERSHIP_FEE_CENTS,
        createdAt: nowIso,
      };
      const nextCycle = current.cycle + 1;
      /** @type {MembershipRecord} */
      const membership = {
        ...current,
        status: "active",
        tier: resolveTier(current.qualifyingSpendCents),
        cycle: nextCycle,
        termStartAt: nowIso,
        termEndAt: createMembershipTermEnd(now),
        renewalQualified: false,
        updatedAt: nowIso,
      };
      await database.payments.add(payment);
      await database.memberLedger.add({
        id: createId(),
        sourceKey: `membership:${browserId}:cycle:${nextCycle}`,
        browserId,
        type: "membership_fee",
        amountCents: MEMBERSHIP_FEE_CENTS,
        qualifyingCents: 0,
        orderId: null,
        createdAt: nowIso,
      });
      await database.memberships.put(membership);
      return { membership, payment, created: true };
    },
  );
}

/**
 * 加入购物袋并递增购物袋版本。
 * @param {Dexie} database - Dexie 数据库实例。
 * @param {string} browserId - 浏览器身份标识。
 * @param {string} variantId - 商品变体标识。
 * @param {number} [quantity] - 增加数量。
 * @param {Date} [now] - 当前时间。
 * @returns {Promise<CartRecord>} 更新后的购物袋。
 */
export async function addCartItem(
  database,
  browserId,
  variantId,
  quantity = 1,
  now = new Date(),
) {
  const variant = getVariant(variantId);
  if (!variant || !isPositiveInteger(quantity)) {
    throw new CommerceError("INVALID_CART_ITEM");
  }

  return database.transaction(
    "rw",
    database.memberships,
    database.memberLedger,
    database.carts,
    database.cartItems,
    database.orders,
    async () => {
      const nowIso = now.toISOString();
      const cart = await database.carts.get(browserId);
      if (!cart) {
        throw new CommerceError("IDENTITY_MISSING");
      }
      const existing = await database.cartItems.get([browserId, variantId]);
      const cartItems = await database.cartItems
        .where("browserId")
        .equals(browserId)
        .toArray();
      const priorOrders = await database.orders
        .where("browserId")
        .equals(browserId)
        .toArray();
      const membership = await refreshMembershipInTransaction(
        database,
        browserId,
        now,
      );
      const purchased = summarizePurchasedQuantities(priorOrders);
      const nextQuantity = (existing?.quantity ?? 0) + quantity;
      const currentProductQuantity = countCartProductQuantity(
        cartItems,
        variant.productId,
      );
      const scopeOrderQuantity =
        variant.purchasePolicy?.lifetimeLimit?.scope === "product"
          ? currentProductQuantity + quantity
          : nextQuantity;
      const eligibility = evaluatePurchaseEligibility(variant, membership, {
        now,
        requestedQuantity: nextQuantity,
        scopeOrderQuantity,
        purchasedVariantQuantity: purchased.variants.get(variant.id) ?? 0,
        purchasedProductQuantity:
          purchased.products.get(variant.productId) ?? 0,
      });
      if (!eligibility.eligible) {
        throwEligibilityError(eligibility);
      }

      await database.cartItems.put({
        browserId,
        variantId,
        quantity: nextQuantity,
        addedAt: existing?.addedAt ?? nowIso,
        updatedAt: nowIso,
      });
      const updated = {
        ...cart,
        revision: cart.revision + 1,
        updatedAt: nowIso,
      };
      await database.carts.put(updated);
      return updated;
    },
  );
}

/**
 * 设置购物袋商品数量；零会移除该商品行。
 * @param {Dexie} database - Dexie 数据库实例。
 * @param {string} browserId - 浏览器身份标识。
 * @param {string} variantId - 商品变体标识。
 * @param {number} quantity - 新数量。
 * @param {Date} [now] - 当前时间。
 * @returns {Promise<CartRecord>} 更新后的购物袋。
 */
export async function setCartItemQuantity(
  database,
  browserId,
  variantId,
  quantity,
  now = new Date(),
) {
  if (
    !Number.isInteger(quantity) ||
    !Number.isFinite(quantity) ||
    quantity < 0
  ) {
    throw new CommerceError("INVALID_CART_ITEM");
  }

  return database.transaction(
    "rw",
    database.memberships,
    database.memberLedger,
    database.carts,
    database.cartItems,
    database.orders,
    async () => {
      const cart = await database.carts.get(browserId);
      const existing = await database.cartItems.get([browserId, variantId]);
      if (!cart || !existing) {
        throw new CommerceError("INVALID_CART_ITEM");
      }
      if (quantity === 0) {
        await database.cartItems.delete([browserId, variantId]);
      } else {
        const variant = getVariant(variantId);
        if (!variant) {
          throw new CommerceError("UNAVAILABLE");
        }
        const [cartItems, priorOrders, membership] = await Promise.all([
          database.cartItems
            .where("browserId")
            .equals(browserId)
            .toArray(),
          database.orders.where("browserId").equals(browserId).toArray(),
          refreshMembershipInTransaction(database, browserId, now),
        ]);
        const purchased = summarizePurchasedQuantities(priorOrders);
        const currentProductQuantity = countCartProductQuantity(
          cartItems,
          variant.productId,
        );
        const scopeOrderQuantity =
          variant.purchasePolicy?.lifetimeLimit?.scope === "product"
            ? currentProductQuantity - existing.quantity + quantity
            : quantity;
        const eligibility = evaluatePurchaseEligibility(variant, membership, {
          now,
          requestedQuantity: quantity,
          scopeOrderQuantity,
          purchasedVariantQuantity: purchased.variants.get(variant.id) ?? 0,
          purchasedProductQuantity:
            purchased.products.get(variant.productId) ?? 0,
        });
        if (!eligibility.eligible) {
          throwEligibilityError(eligibility);
        }
        await database.cartItems.put({
          ...existing,
          quantity,
          updatedAt: now.toISOString(),
        });
      }
      const updated = {
        ...cart,
        revision: cart.revision + 1,
        updatedAt: now.toISOString(),
      };
      await database.carts.put(updated);
      return updated;
    },
  );
}

/**
 * 创建订单号。
 * @param {Date} now - 支付时间。
 * @param {string} id - 订单标识。
 * @returns {string} 可见订单号。
 */
function createOrderNumber(now, id) {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  return `LE${date}-${id.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

/**
 * 根据订单支付时间创建固定绝对物流计划。
 * @param {Date} paidAt - 商品支付成功时间。
 * @returns {Array<{key: string, label: string, scheduledAt: string}>} 物流事件。
 */
export function createShipmentEvents(paidAt) {
  return SHIPMENT_MILESTONES.map((milestone) => ({
    key: milestone.key,
    label: milestone.label,
    scheduledAt: new Date(
      paidAt.getTime() + milestone.offsetSeconds * 1_000,
    ).toISOString(),
  }));
}

/**
 * 统计指定身份历史订单中的某变体数量。
 * @param {Dexie} database - Dexie 数据库实例。
 * @param {string} browserId - 浏览器身份标识。
 * @param {string} variantId - 商品变体标识。
 * @returns {Promise<number>} 已成交数量。
 */
export async function countPurchasedVariant(database, browserId, variantId) {
  const orders = await database.orders.where("browserId").equals(browserId).toArray();
  return summarizePurchasedQuantities(orders).variants.get(variantId) ?? 0;
}

/**
 * 统计指定身份历史订单中的某商品数量。
 * @param {Dexie} database - Dexie 数据库实例。
 * @param {string} browserId - 浏览器身份标识。
 * @param {string} productId - 商品标识。
 * @returns {Promise<number>} 已成交数量。
 */
export async function countPurchasedProduct(database, browserId, productId) {
  const orders = await database.orders.where("browserId").equals(browserId).toArray();
  return summarizePurchasedQuantities(orders).products.get(productId) ?? 0;
}

/**
 * 以单一 IndexedDB 事务完成商品支付、订单、流水、升级、购物袋与物流。
 * @param {Dexie} database - Dexie 数据库实例。
 * @param {string} browserId - 浏览器身份标识。
 * @param {{expectedRevision: number, idempotencyKey: string, method: "concierge" | "unionpay", now?: Date}} options - 结账参数。
 * @returns {Promise<{order: OrderRecord, shipment: ShipmentRecord, created: boolean}>}
 * 订单和物流结果。
 */
export async function checkoutCart(
  database,
  browserId,
  { expectedRevision, idempotencyKey, method, now = new Date() },
) {
  if (!idempotencyKey) {
    throw new CommerceError("PAYMENT_KEY_REQUIRED");
  }
  const checkoutKey = `${browserId}:cart:${expectedRevision}`;

  return database.transaction(
    "rw",
    database.memberships,
    database.memberLedger,
    database.carts,
    database.cartItems,
    database.payments,
    database.orders,
    database.shipments,
    async () => {
      const existingOrder = await database.orders
        .where("checkoutKey")
        .equals(checkoutKey)
        .first();
      if (existingOrder) {
        const shipment = await database.shipments
          .where("orderId")
          .equals(existingOrder.id)
          .first();
        return { order: existingOrder, shipment, created: false };
      }

      const cart = await database.carts.get(browserId);
      if (!cart || cart.revision !== expectedRevision) {
        throw new CommerceError("CART_CHANGED");
      }
      const cartItems = await database.cartItems
        .where("browserId")
        .equals(browserId)
        .toArray();
      if (cartItems.length === 0) {
        throw new CommerceError("EMPTY_CART");
      }

      const membership = await refreshMembershipInTransaction(
        database,
        browserId,
        now,
      );
      const priorOrders = await database.orders
        .where("browserId")
        .equals(browserId)
        .toArray();
      const purchased = summarizePurchasedQuantities(priorOrders);
      const cartProductQuantities = new Map();
      cartItems.forEach((cartItem) => {
        const variant = getVariant(cartItem.variantId);
        if (variant) {
          cartProductQuantities.set(
            variant.productId,
            (cartProductQuantities.get(variant.productId) ?? 0) +
              cartItem.quantity,
          );
        }
      });
      const snapshots = [];

      for (const cartItem of cartItems) {
        const variant = getVariant(cartItem.variantId);
        if (!variant) {
          throw new CommerceError("UNAVAILABLE");
        }
        const scopeOrderQuantity =
          variant.purchasePolicy?.lifetimeLimit?.scope === "product"
            ? cartProductQuantities.get(variant.productId) ?? cartItem.quantity
            : cartItem.quantity;
        const eligibility = evaluatePurchaseEligibility(variant, membership, {
          now,
          requestedQuantity: cartItem.quantity,
          scopeOrderQuantity,
          purchasedVariantQuantity: purchased.variants.get(variant.id) ?? 0,
          purchasedProductQuantity:
            purchased.products.get(variant.productId) ?? 0,
        });
        if (!eligibility.eligible) {
          throwEligibilityError(eligibility);
        }
        const imageAsset = variant.media?.hero?.assetKey;
        snapshots.push({
          variantId: variant.id,
          productId: variant.productId,
          ...(variant.seriesId ? { seriesId: variant.seriesId } : {}),
          ...(variant.slug ? { productSlug: variant.slug } : {}),
          nameZh: variant.nameZh,
          nameEn: variant.nameEn,
          shortName: variant.shortName,
          productClass: variant.productClass,
          priceCents: variant.priceCents,
          quantity: cartItem.quantity,
          image: variant.heroImage,
          ...(imageAsset ? { imageAsset } : {}),
          editionNote: variant.editionNote,
        });
      }

      const subtotalCents = snapshots.reduce(
        (sum, item) => sum + item.priceCents * item.quantity,
        0,
      );
      const shippingCents = 0;
      const totalCents = subtotalCents + shippingCents;
      const nowIso = now.toISOString();
      const orderId = createId();
      const tierBefore = membership.tier;
      const nextSpend = membership.qualifyingSpendCents + subtotalCents;
      const tierAfter = resolveTier(nextSpend);
      /** @type {OrderRecord} */
      const order = {
        id: orderId,
        checkoutKey,
        orderNo: createOrderNumber(now, orderId),
        browserId,
        status: "confirmed",
        items: snapshots,
        subtotalCents,
        shippingCents,
        totalCents,
        tierBefore,
        tierAfter,
        delivery: { ...DEMO_DELIVERY },
        createdAt: nowIso,
      };
      const payment = {
        id: createId(),
        idempotencyKey,
        browserId,
        purpose: "merchandise",
        method,
        status: "succeeded",
        amountCents: totalCents,
        createdAt: nowIso,
      };
      const events = createShipmentEvents(now);
      const shipmentId = createId();
      /** @type {ShipmentRecord} */
      const shipment = {
        id: shipmentId,
        orderId,
        trackingNo: `LN-${order.orderNo.slice(2).replace("-", "")}`,
        browserId,
        currentStage: 0,
        status: events[0].key,
        events,
        nextTransitionAt: events[1].scheduledAt,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      await database.payments.add(payment);
      await database.orders.add(order);
      await database.memberLedger.add({
        id: createId(),
        sourceKey: `order:${orderId}`,
        browserId,
        type: "merchandise",
        amountCents: totalCents,
        qualifyingCents: subtotalCents,
        orderId,
        createdAt: nowIso,
      });
      await database.memberships.put({
        ...membership,
        tier: tierAfter,
        qualifyingSpendCents: nextSpend,
        renewalQualified: true,
        updatedAt: nowIso,
      });
      await database.shipments.add(shipment);
      await database.cartItems
        .where("browserId")
        .equals(browserId)
        .delete();
      await database.carts.put({
        ...cart,
        revision: cart.revision + 1,
        updatedAt: nowIso,
      });
      return { order, shipment, created: true };
    },
  );
}

/**
 * 将物流当前节点单调推进到给定时间对应的阶段。
 * @param {Dexie} database - Dexie 数据库实例。
 * @param {string} orderId - 订单标识。
 * @param {Date} [now] - 当前时间。
 * @returns {Promise<ShipmentRecord | undefined>} 刷新后的物流记录。
 */
export async function reconcileShipment(database, orderId, now = new Date()) {
  return database.transaction("rw", database.shipments, async () => {
    /** @type {ShipmentRecord | undefined} */
    const shipment = await database.shipments
      .where("orderId")
      .equals(orderId)
      .first();
    if (!shipment) {
      return undefined;
    }
    const computedStage = resolveShipmentStage(shipment.events, now);
    const nextStage = Math.max(shipment.currentStage, computedStage);
    if (nextStage === shipment.currentStage) {
      return shipment;
    }
    const updated = {
      ...shipment,
      currentStage: nextStage,
      status: shipment.events[nextStage].key,
      nextTransitionAt: shipment.events[nextStage + 1]?.scheduledAt ?? null,
      updatedAt: now.toISOString(),
    };
    await database.shipments.put(updated);
    return updated;
  });
}

/**
 * 读取当前购物袋的可靠目录快照，价格始终从代码目录重新计算。
 * @param {Dexie} database - Dexie 数据库实例。
 * @param {string} browserId - 浏览器身份标识。
 * @returns {Promise<{cart: CartRecord | undefined, items: Array<Object>, subtotalCents: number}>}
 * 购物袋视图。
 */
export async function readCartSnapshot(database, browserId) {
  const [cart, rows] = await Promise.all([
    database.carts.get(browserId),
    database.cartItems.where("browserId").equals(browserId).toArray(),
  ]);
  const items = rows.map(mergeCartItemWithCatalog);
  return {
    cart,
    items,
    subtotalCents: items.reduce(
      (sum, item) =>
        item.unavailable || !isPositiveInteger(item.quantity)
          ? sum
          : sum + item.variant.priceCents * item.quantity,
      0,
    ),
  };
}

/**
 * 返回受支持商品目录，供测试确认目录价格不依赖 IndexedDB。
 * @returns {typeof PRODUCT_VARIANTS} 商品变体目录。
 */
export function getCatalogSnapshot() {
  return PRODUCT_VARIANTS;
}
