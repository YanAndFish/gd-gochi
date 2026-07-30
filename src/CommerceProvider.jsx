import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { PRODUCT_VARIANTS, getVariant } from "./catalog.js";
import {
  evaluatePurchaseEligibility,
  isPositiveInteger,
} from "./commerce-rules.js";
import {
  CommerceError,
  activateMembership,
  addCartItem,
  checkoutCart,
  commerceDb,
  initializeBrowserIdentity,
  mergeCartItemWithCatalog,
  refreshMembership,
  setCartItemQuantity,
} from "./db.js";

/** 跨多标签页通知购物与会籍变更的频道名称。 */
const SYNC_CHANNEL_NAME = "lingnan-editions-commerce-sync";

/**
 * 应用交易上下文值。
 * @typedef {Object} CommerceContextValue
 * @property {boolean} ready - 本地身份初始化是否完成。
 * @property {boolean} storageAvailable - IndexedDB 是否可用。
 * @property {string | null} storageError - 本地存储不可用说明。
 * @property {Object | null} identity - 当前浏览器身份。
 * @property {Object | null} membership - 当前会籍。
 * @property {Object | null} cart - 当前购物袋版本。
 * @property {Array<Object>} cartItems - 已与代码目录合并的购物袋行。
 * @property {number} cartCount - 购物袋商品总数。
 * @property {number} cartSubtotalCents - 购物袋目录价小计。
 * @property {Array<Object>} orders - 历史订单。
 * @property {(variantId: string, options?: Object) => Object} getAvailability - 获取商品公开可售状态。
 * @property {(variantId: string, quantity?: number) => Promise<void>} addToCart - 加入购物袋。
 * @property {(variantId: string, quantity: number) => Promise<void>} setQuantity - 设置商品数量。
 * @property {(method: "concierge" | "unionpay", idempotencyKey: string) => Promise<Object>} payMembership - 支付会费。
 * @property {(options: Object) => Promise<Object>} placeOrder - 提交商品订单。
 * @property {() => Promise<void>} refresh - 刷新会籍状态。
 */

/** @type {import("react").Context<CommerceContextValue | null>} */
const CommerceContext = createContext(null);

/**
 * 生成一次页面操作使用的幂等键。
 * @param {string} prefix - 业务前缀。
 * @returns {string} 幂等键。
 */
export function createIdempotencyKey(prefix) {
  const suffix = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}:${suffix}`;
}

/**
 * 请求浏览器尽力持久化当前来源数据；失败不会改变交易结果。
 * @returns {Promise<void>}
 */
async function requestPersistentStorage() {
  try {
    await globalThis.navigator?.storage?.persist?.();
  } catch {
    // 持久化提示是浏览器最佳努力能力，IndexedDB 交易本身已经完成。
  }
}

/**
 * 为全站提供 IndexedDB 驱动的浏览器身份与交易状态。
 * @param {{children: import("react").ReactNode}} props - React 子节点。
 * @returns {import("react").ReactElement} 上下文提供器。
 */
export function CommerceProvider({ children }) {
  const [identity, setIdentity] = useState(null);
  const [ready, setReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [storageError, setStorageError] = useState(null);
  const syncChannelRef = useRef(null);

  /**
   * 对不可用 IndexedDB 统一阻止写操作。
   * @returns {void}
   */
  const assertStorage = useCallback(() => {
    if (!storageAvailable || !identity) {
      throw new CommerceError("STORAGE_UNAVAILABLE");
    }
  }, [identity, storageAvailable]);

  /**
   * 通知其他标签页重新检查 live query。
   * @param {string} type - 变更类型。
   * @returns {void}
   */
  const broadcastChange = useCallback((type) => {
    syncChannelRef.current?.postMessage({
      type,
      at: new Date().toISOString(),
    });
  }, []);

  useEffect(() => {
    let active = true;
    const channel =
      typeof BroadcastChannel === "function"
        ? new BroadcastChannel(SYNC_CHANNEL_NAME)
        : null;
    syncChannelRef.current = channel;

    async function initialize() {
      try {
        await commerceDb.open();
        const nextIdentity = await initializeBrowserIdentity(commerceDb);
        await refreshMembership(commerceDb, nextIdentity.browserId);
        if (active) {
          setIdentity(nextIdentity);
          setStorageAvailable(true);
          setStorageError(null);
        }
      } catch {
        if (active) {
          setStorageAvailable(false);
          setStorageError(
            "当前浏览器无法保存你的作品档案。你仍可浏览，但入会与结账暂不可用。",
          );
        }
      } finally {
        if (active) {
          setReady(true);
        }
      }
    }

    initialize();
    return () => {
      active = false;
      channel?.close();
      syncChannelRef.current = null;
    };
  }, []);

  const membership = useLiveQuery(
    () =>
      identity
        ? commerceDb.memberships.get(identity.browserId)
        : Promise.resolve(null),
    [identity?.browserId],
    null,
  );
  const cart = useLiveQuery(
    () =>
      identity
        ? commerceDb.carts.get(identity.browserId)
        : Promise.resolve(null),
    [identity?.browserId],
    null,
  );
  const rawCartItems = useLiveQuery(
    () =>
      identity
        ? commerceDb.cartItems
            .where("browserId")
            .equals(identity.browserId)
            .toArray()
        : Promise.resolve([]),
    [identity?.browserId],
    [],
  );
  const liveOrders = useLiveQuery(
    async () => {
      if (!identity) {
        return [];
      }
      const records = await commerceDb.orders
        .where("browserId")
        .equals(identity.browserId)
        .toArray();
      return records.sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      );
    },
    [identity?.browserId],
    null,
  );
  const orders = liveOrders ?? [];
  const ordersReady = Array.isArray(liveOrders);

  const cartItems = useMemo(
    () => rawCartItems.map(mergeCartItemWithCatalog),
    [rawCartItems],
  );
  const cartCount = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) =>
          isPositiveInteger(item.quantity) ? sum + item.quantity : sum,
        0,
      ),
    [cartItems],
  );
  const cartSubtotalCents = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) =>
          item.unavailable || !isPositiveInteger(item.quantity)
            ? sum
            : sum + item.variant.priceCents * item.quantity,
        0,
      ),
    [cartItems],
  );
  const purchasedQuantities = useMemo(() => {
    const variants = new Map(
      PRODUCT_VARIANTS.map((variant) => [variant.id, 0]),
    );
    const products = new Map();
    orders.forEach((order) => {
      (order.items ?? []).forEach((item) => {
        variants.set(
          item.variantId,
          (variants.get(item.variantId) ?? 0) + item.quantity,
        );
        const productId =
          item.productId ?? getVariant(item.variantId)?.productId ?? null;
        if (productId) {
          products.set(
            productId,
            (products.get(productId) ?? 0) + item.quantity,
          );
        }
      });
    });
    return { variants, products };
  }, [orders]);
  const cartQuantities = useMemo(() => {
    const variants = new Map();
    const products = new Map();
    rawCartItems.forEach((item) => {
      variants.set(
        item.variantId,
        (variants.get(item.variantId) ?? 0) + item.quantity,
      );
      const variant = getVariant(item.variantId);
      if (variant) {
        products.set(
          variant.productId,
          (products.get(variant.productId) ?? 0) + item.quantity,
        );
      }
    });
    return { variants, products };
  }, [rawCartItems]);

  /**
   * 返回商品对当前身份的公开状态。
   * @param {string} variantId - 商品变体标识。
   * @param {{requestedQuantity?: number, scopeOrderQuantity?: number}} [options] - 本单数量上下文。
   * @returns {Object} 公开状态。
   */
  const getAvailability = useCallback(
    (variantId, options = {}) => {
      const variant = getVariant(variantId);
      if (!variant) {
        return {
          eligible: false,
          reason: "catalog_missing",
          errorCode: "UNAVAILABLE",
          state: "sold_out",
          label: "暂时缺货",
        };
      }
      return evaluatePurchaseEligibility(variant, membership, {
        requestedQuantity: options.requestedQuantity ?? 1,
        scopeOrderQuantity:
          options.scopeOrderQuantity ?? options.requestedQuantity ?? 1,
        purchasedVariantQuantity:
          purchasedQuantities.variants.get(variantId) ?? 0,
        purchasedProductQuantity:
          purchasedQuantities.products.get(variant.productId) ?? 0,
        purchaseHistoryAvailable: ordersReady,
      });
    },
    [membership, ordersReady, purchasedQuantities],
  );

  /**
   * 加入购物袋并通知其他标签页。
   * @param {string} variantId - 商品变体标识。
   * @param {number} quantity - 增加数量。
   * @returns {Promise<void>}
   */
  const addToCart = useCallback(
    async (variantId, quantity = 1) => {
      assertStorage();
      if (!isPositiveInteger(quantity)) {
        throw new CommerceError("INVALID_CART_ITEM");
      }
      const variant = getVariant(variantId);
      if (!variant) {
        throw new CommerceError("UNAVAILABLE");
      }
      const requestedQuantity =
        (cartQuantities.variants.get(variantId) ?? 0) + quantity;
      const scopeOrderQuantity =
        variant.purchasePolicy?.lifetimeLimit?.scope === "product"
          ? (cartQuantities.products.get(variant.productId) ?? 0) + quantity
          : requestedQuantity;
      const availability = getAvailability(variantId, {
        requestedQuantity,
        scopeOrderQuantity,
      });
      if (!availability.eligible) {
        throw new CommerceError(availability.errorCode ?? "UNAVAILABLE");
      }
      await addCartItem(commerceDb, identity.browserId, variantId, quantity);
      broadcastChange("cart");
    },
    [
      assertStorage,
      broadcastChange,
      cartQuantities,
      getAvailability,
      identity,
    ],
  );

  /**
   * 更新购物袋数量并通知其他标签页。
   * @param {string} variantId - 商品变体标识。
   * @param {number} quantity - 新数量。
   * @returns {Promise<void>}
   */
  const setQuantity = useCallback(
    async (variantId, quantity) => {
      assertStorage();
      await setCartItemQuantity(
        commerceDb,
        identity.browserId,
        variantId,
        quantity,
      );
      broadcastChange("cart");
    },
    [assertStorage, broadcastChange, identity],
  );

  /**
   * 完成独立会籍虚拟支付。
   * @param {"concierge" | "unionpay"} method - 虚拟支付方式。
   * @param {string} idempotencyKey - 本次支付幂等键。
   * @returns {Promise<Object>} 支付结果。
   */
  const payMembership = useCallback(
    async (method, idempotencyKey) => {
      assertStorage();
      const result = await activateMembership(commerceDb, identity.browserId, {
        method,
        idempotencyKey,
      });
      await requestPersistentStorage();
      broadcastChange("membership");
      return result;
    },
    [assertStorage, broadcastChange, identity],
  );

  /**
   * 完成单一事务商品结账。
   * @param {{expectedRevision: number, idempotencyKey: string, method: "concierge" | "unionpay"}} options - 结账参数。
   * @returns {Promise<Object>} 订单与物流结果。
   */
  const placeOrder = useCallback(
    async (options) => {
      assertStorage();
      const result = await checkoutCart(
        commerceDb,
        identity.browserId,
        options,
      );
      await requestPersistentStorage();
      broadcastChange("order");
      return result;
    },
    [assertStorage, broadcastChange, identity],
  );

  /**
   * 手动刷新会籍到期状态。
   * @returns {Promise<void>}
   */
  const refresh = useCallback(async () => {
    if (!identity || !storageAvailable) {
      return;
    }
    await refreshMembership(commerceDb, identity.browserId);
    broadcastChange("membership");
  }, [broadcastChange, identity, storageAvailable]);

  const value = useMemo(
    () => ({
      ready,
      storageAvailable,
      storageError,
      identity,
      membership,
      cart,
      cartItems,
      cartCount,
      cartSubtotalCents,
      orders,
      getAvailability,
      addToCart,
      setQuantity,
      payMembership,
      placeOrder,
      refresh,
    }),
    [
      addToCart,
      cart,
      cartCount,
      cartItems,
      cartSubtotalCents,
      getAvailability,
      identity,
      membership,
      orders,
      payMembership,
      placeOrder,
      ready,
      refresh,
      setQuantity,
      storageAvailable,
      storageError,
    ],
  );

  return (
    <CommerceContext.Provider value={value}>
      {children}
    </CommerceContext.Provider>
  );
}

/**
 * 读取交易上下文。
 * @returns {CommerceContextValue} 交易上下文。
 */
export function useCommerce() {
  const value = useContext(CommerceContext);
  if (!value) {
    throw new Error("useCommerce 必须在 CommerceProvider 内使用");
  }
  return value;
}
