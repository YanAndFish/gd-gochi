import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TIER_THRESHOLDS, getVariant } from "./catalog.js";
import {
  SHIPMENT_MILESTONES,
  activateMembership,
  addCartItem,
  checkoutCart,
  countPurchasedProduct,
  createCommerceDatabase,
  initializeBrowserIdentity,
  readCartSnapshot,
  reconcileShipment,
  refreshMembership,
  setCartItemQuantity,
} from "./db.js";

/** 所有时间敏感用例共享的会籍起点。 */
const MEMBERSHIP_START = new Date("2026-01-01T00:00:00.000Z");

/** @type {import("dexie").default[]} 当前用例创建并等待清理的数据库实例。 */
const testDatabases = [];

/**
 * 创建名称唯一的测试数据库，并登记到用例清理队列。
 * @param {string} scenario - 便于诊断的测试场景名称。
 * @returns {import("dexie").default} 独立 Dexie 数据库实例。
 */
function createTestDatabase(scenario) {
  const uniquePart =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const database = createCommerceDatabase(
    `lingnan-editions-test-${scenario}-${uniquePart}`,
  );
  testDatabases.push(database);
  return database;
}

/**
 * 初始化浏览器身份并完成一次虚拟会费支付。
 * @param {import("dexie").default} database - 当前用例的独立数据库。
 * @param {Date} [now] - 会籍开通时间。
 * @returns {Promise<{browserId: string, membership: Object}>} 已开通会籍的测试上下文。
 */
async function createActiveMember(database, now = MEMBERSHIP_START) {
  const identity = await initializeBrowserIdentity(database, now);
  const activation = await activateMembership(database, identity.browserId, {
    idempotencyKey: `membership:${identity.browserId}`,
    method: "concierge",
    now,
  });
  return {
    browserId: identity.browserId,
    membership: activation.membership,
  };
}

/**
 * 把一个常规款加入购物袋并完成虚拟结账。
 * @param {import("dexie").default} database - 当前用例的独立数据库。
 * @param {string} browserId - 浏览器身份标识。
 * @param {Date} now - 商品成交时间。
 * @param {string} [variantId] - 要成交的常规商品变体。
 * @returns {Promise<Awaited<ReturnType<typeof checkoutCart>>>} 结账结果。
 */
async function checkoutStandardVariant(
  database,
  browserId,
  now,
  variantId = "stool-grey",
) {
  const cart = await addCartItem(
    database,
    browserId,
    variantId,
    1,
    new Date(now.getTime() - 1_000),
  );
  return checkoutCart(database, browserId, {
    expectedRevision: cart.revision,
    idempotencyKey: `checkout:${browserId}:${cart.revision}`,
    method: "unionpay",
    now,
  });
}

afterEach(async () => {
  vi.restoreAllMocks();
  const databases = testDatabases.splice(0);
  for (const database of databases) {
    await database.delete();
  }
});

describe("IndexedDB 身份与会籍", () => {
  it("并发和重复初始化都只保留一个浏览器身份", async () => {
    const database = createTestDatabase("identity");
    const now = new Date("2026-07-30T08:00:00.000Z");

    const [first, second, third] = await Promise.all([
      initializeBrowserIdentity(database, now),
      initializeBrowserIdentity(database, now),
      initializeBrowserIdentity(database, now),
    ]);
    const repeated = await initializeBrowserIdentity(database, now);

    expect(new Set([
      first.browserId,
      second.browserId,
      third.browserId,
      repeated.browserId,
    ])).toHaveLength(1);
    await expect(database.identities.count()).resolves.toBe(1);
    await expect(database.memberships.count()).resolves.toBe(1);
    await expect(database.carts.count()).resolves.toBe(1);
  });

  it("有商品订单时仅免费续会一个 365 天周期，下一周期到期后失效", async () => {
    const database = createTestDatabase("renew-once");
    const { browserId } = await createActiveMember(database);
    await checkoutStandardVariant(
      database,
      browserId,
      new Date("2026-01-02T00:00:00.000Z"),
    );

    const renewed = await refreshMembership(
      database,
      browserId,
      new Date("2027-01-01T00:00:00.000Z"),
    );
    expect(renewed).toMatchObject({
      status: "active",
      cycle: 2,
      termStartAt: "2027-01-01T00:00:00.000Z",
      termEndAt: "2028-01-01T00:00:00.000Z",
      renewalQualified: false,
    });

    const repeatedRefresh = await refreshMembership(
      database,
      browserId,
      new Date("2027-01-02T00:00:00.000Z"),
    );
    expect(repeatedRefresh.cycle).toBe(2);

    const lapsed = await refreshMembership(
      database,
      browserId,
      new Date("2028-01-01T00:00:00.000Z"),
    );
    expect(lapsed).toMatchObject({
      status: "lapsed",
      cycle: 2,
      renewalQualified: false,
    });
    await expect(
      database.memberLedger
        .where("type")
        .equals("membership_free_renewal")
        .count(),
    ).resolves.toBe(1);
  });

  it("当期没有商品消费时会籍在 365 天到期点失效", async () => {
    const database = createTestDatabase("lapse-without-order");
    const { browserId, membership } = await createActiveMember(database);

    expect(membership.termEndAt).toBe("2027-01-01T00:00:00.000Z");
    const lapsed = await refreshMembership(
      database,
      browserId,
      new Date(membership.termEndAt),
    );

    expect(lapsed).toMatchObject({
      status: "lapsed",
      cycle: 1,
      renewalQualified: false,
    });
    await expect(
      database.memberLedger
        .where("type")
        .equals("membership_free_renewal")
        .count(),
    ).resolves.toBe(0);
  });
});

describe("商品结账事务", () => {
  it("手工写入受限商品时事务层只返回公共 UNAVAILABLE 且不落账", async () => {
    const database = createTestDatabase("restricted-injection");
    const { browserId } = await createActiveMember(database);
    const injectedAt = "2026-01-02T00:00:00.000Z";

    await database.transaction(
      "rw",
      database.carts,
      database.cartItems,
      async () => {
        await database.cartItems.put({
          browserId,
          variantId: "stool-red",
          quantity: 1,
          addedAt: injectedAt,
          updatedAt: injectedAt,
        });
        await database.carts.update(browserId, {
          revision: 1,
          updatedAt: injectedAt,
        });
      },
    );

    await expect(
      checkoutCart(database, browserId, {
        expectedRevision: 1,
        idempotencyKey: "checkout:restricted-injection",
        method: "concierge",
        now: new Date("2026-01-02T00:00:01.000Z"),
      }),
    ).rejects.toMatchObject({ code: "UNAVAILABLE" });
    await expect(database.orders.count()).resolves.toBe(0);
    await expect(
      database.payments.where("purpose").equals("merchandise").count(),
    ).resolves.toBe(0);
    await expect(
      database.memberLedger.where("type").equals("merchandise").count(),
    ).resolves.toBe(0);
  });

  it("末段物流写入失败时回滚支付、订单、流水、会籍和购物袋变更", async () => {
    const database = createTestDatabase("checkout-rollback");
    const { browserId } = await createActiveMember(database);
    const cart = await addCartItem(
      database,
      browserId,
      "stool-grey",
      1,
      new Date("2026-01-02T00:00:00.000Z"),
    );
    const shipmentWrite = vi
      .spyOn(database.shipments, "add")
      .mockRejectedValueOnce(new Error("模拟物流写入失败"));

    await expect(
      checkoutCart(database, browserId, {
        expectedRevision: cart.revision,
        idempotencyKey: "checkout:forced-rollback",
        method: "concierge",
        now: new Date("2026-01-02T00:00:01.000Z"),
      }),
    ).rejects.toThrow("模拟物流写入失败");
    shipmentWrite.mockRestore();

    await expect(database.orders.count()).resolves.toBe(0);
    await expect(database.shipments.count()).resolves.toBe(0);
    await expect(
      database.payments.where("purpose").equals("merchandise").count(),
    ).resolves.toBe(0);
    await expect(
      database.memberLedger.where("type").equals("merchandise").count(),
    ).resolves.toBe(0);
    await expect(
      database.cartItems.where("browserId").equals(browserId).count(),
    ).resolves.toBe(1);
    await expect(database.carts.get(browserId)).resolves.toMatchObject({
      revision: cart.revision,
    });
    await expect(database.memberships.get(browserId)).resolves.toMatchObject({
      tier: "edition",
      qualifyingSpendCents: 0,
      renewalQualified: false,
    });
  });

  it("同一购物袋版本并发结账只创建一个订单和一份累计消费", async () => {
    const database = createTestDatabase("checkout-idempotency");
    const { browserId } = await createActiveMember(database);
    const cart = await addCartItem(
      database,
      browserId,
      "stool-grey",
      1,
      new Date("2026-01-02T00:00:00.000Z"),
    );
    const options = {
      expectedRevision: cart.revision,
      idempotencyKey: "checkout:concurrent",
      method: "unionpay",
      now: new Date("2026-01-02T00:00:01.000Z"),
    };

    const results = await Promise.all([
      checkoutCart(database, browserId, options),
      checkoutCart(database, browserId, options),
    ]);

    expect(new Set(results.map((result) => result.order.id))).toHaveLength(1);
    expect(results.filter((result) => result.created)).toHaveLength(1);
    await expect(database.orders.count()).resolves.toBe(1);
    await expect(database.shipments.count()).resolves.toBe(1);
    await expect(
      database.payments.where("purpose").equals("merchandise").count(),
    ).resolves.toBe(1);
    await expect(
      database.memberLedger.where("type").equals("merchandise").count(),
    ).resolves.toBe(1);
    await expect(database.memberships.get(browserId)).resolves.toMatchObject({
      qualifyingSpendCents: getVariant("stool-grey").priceCents,
      renewalQualified: true,
    });
  });

  it("成交订单快照不随目录字段或后续购物袋变化", async () => {
    const database = createTestDatabase("order-snapshot");
    const { browserId } = await createActiveMember(database);
    const variant = getVariant("stool-grey");
    const result = await checkoutStandardVariant(
      database,
      browserId,
      new Date("2026-01-02T00:00:00.000Z"),
    );

    await addCartItem(
      database,
      browserId,
      variant.id,
      2,
      new Date("2026-01-03T00:00:00.000Z"),
    );

    const [storedOrder, currentCart] = await Promise.all([
      database.orders.get(result.order.id),
      readCartSnapshot(database, browserId),
    ]);
    expect(currentCart).toMatchObject({
      subtotalCents: variant.priceCents * 2,
    });
    expect(storedOrder.items[0]).toMatchObject({
      variantId: variant.id,
      productId: variant.productId,
      seriesId: variant.seriesId,
      productSlug: variant.slug,
      nameZh: variant.nameZh,
      priceCents: variant.priceCents,
      image: variant.heroImage,
      imageAsset: variant.media.hero.assetKey,
      quantity: 1,
    });
    expect(storedOrder.subtotalCents).toBe(variant.priceCents);
  });

  it("两个正式商品可混合结账并分别保存规范目录快照", async () => {
    const database = createTestDatabase("mixed-products");
    const { browserId } = await createActiveMember(database);
    const stool = getVariant("stool-grey");
    const archive = getVariant("archive-set");

    await database.memberships.update(browserId, {
      tier: "patron",
      qualifyingSpendCents: TIER_THRESHOLDS.patron,
    });
    await addCartItem(
      database,
      browserId,
      stool.id,
      1,
      new Date("2026-01-02T00:00:00.000Z"),
    );
    const cart = await addCartItem(
      database,
      browserId,
      archive.id,
      1,
      new Date("2026-01-02T00:00:01.000Z"),
    );

    const result = await checkoutCart(database, browserId, {
      expectedRevision: cart.revision,
      idempotencyKey: "checkout:mixed-products",
      method: "unionpay",
      now: new Date("2026-01-02T00:00:02.000Z"),
    });
    const itemsByVariant = Object.fromEntries(
      result.order.items.map((item) => [item.variantId, item]),
    );

    expect(new Set(result.order.items.map((item) => item.productId))).toEqual(
      new Set(["guangdong-stool-01", "guangdong-stool-archive-01"]),
    );
    expect(itemsByVariant[stool.id]).toMatchObject({
      productId: stool.productId,
      productSlug: "guangdong-stool-01",
      seriesId: stool.seriesId,
      imageAsset: stool.media.hero.assetKey,
      quantity: 1,
    });
    expect(itemsByVariant[archive.id]).toMatchObject({
      productId: archive.productId,
      productSlug: "guangdong-stool-archive-01",
      seriesId: archive.seriesId,
      imageAsset: archive.media.hero.assetKey,
      quantity: 1,
    });
    expect(result.order.subtotalCents).toBe(
      stool.priceCents + archive.priceCents,
    );
    await expect(
      database.cartItems.where("browserId").equals(browserId).count(),
    ).resolves.toBe(0);
  });

  it("同一订单产生的消费升级不能解锁订单内原本无资格的限定款", async () => {
    const database = createTestDatabase("same-order-tier");
    const { browserId } = await createActiveMember(database);
    const injectedAt = "2026-01-02T00:00:00.000Z";

    await database.transaction(
      "rw",
      database.carts,
      database.cartItems,
      async () => {
        await database.cartItems.bulkPut([
          {
            browserId,
            variantId: "stool-grey",
            quantity: 4,
            addedAt: injectedAt,
            updatedAt: injectedAt,
          },
          {
            browserId,
            variantId: "stool-red",
            quantity: 1,
            addedAt: injectedAt,
            updatedAt: injectedAt,
          },
        ]);
        await database.carts.update(browserId, {
          revision: 1,
          updatedAt: injectedAt,
        });
      },
    );

    await expect(
      checkoutCart(database, browserId, {
        expectedRevision: 1,
        idempotencyKey: "checkout:same-order-tier",
        method: "concierge",
        now: new Date("2026-01-02T00:00:01.000Z"),
      }),
    ).rejects.toMatchObject({ code: "UNAVAILABLE" });
    await expect(database.orders.count()).resolves.toBe(0);
    await expect(database.memberships.get(browserId)).resolves.toMatchObject({
      tier: "edition",
      qualifyingSpendCents: 0,
    });
  });

  it("终身限购按历史订单拒绝第二次购买同一限定变体", async () => {
    const database = createTestDatabase("variant-lifetime-limit");
    const { browserId } = await createActiveMember(database);

    await addCartItem(
      database,
      browserId,
      "stool-grey",
      4,
      new Date("2026-01-02T00:00:00.000Z"),
    );
    const upgradeCart = await database.carts.get(browserId);
    await checkoutCart(database, browserId, {
      expectedRevision: upgradeCart.revision,
      idempotencyKey: "checkout:upgrade-collector",
      method: "unionpay",
      now: new Date("2026-01-02T00:00:01.000Z"),
    });
    await expect(database.memberships.get(browserId)).resolves.toMatchObject({
      tier: "collector",
    });

    const limitedCart = await addCartItem(
      database,
      browserId,
      "stool-red",
      1,
      new Date("2026-01-03T00:00:00.000Z"),
    );
    await checkoutCart(database, browserId, {
      expectedRevision: limitedCart.revision,
      idempotencyKey: "checkout:first-red",
      method: "unionpay",
      now: new Date("2026-01-03T00:00:01.000Z"),
    });

    await expect(
      addCartItem(
        database,
        browserId,
        "stool-red",
        1,
        new Date("2026-01-04T00:00:00.000Z"),
      ),
    ).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });

  it("旧订单缺少新增快照字段时仍可按 productId 汇总商品购买数量", async () => {
    const database = createTestDatabase("legacy-order");
    const { browserId } = await createActiveMember(database);
    const nowIso = "2026-01-02T00:00:00.000Z";

    await database.orders.add({
      id: "legacy-order",
      checkoutKey: "legacy-checkout",
      orderNo: "LE20260102-LEGACY",
      browserId,
      status: "confirmed",
      items: [
        {
          variantId: "stool-grey",
          productId: "guangdong-stool-01",
          nameZh: "旧版骑楼灰",
          nameEn: "LEGACY ARCADE GREY",
          shortName: "骑楼灰",
          productClass: "standard",
          priceCents: 1_880_000,
          quantity: 2,
          image: "/assets/products/stool-grey-three-quarter.png",
          editionNote: "旧订单",
        },
      ],
      subtotalCents: 3_760_000,
      shippingCents: 0,
      totalCents: 3_760_000,
      tierBefore: "edition",
      tierAfter: "edition",
      delivery: {},
      createdAt: nowIso,
    });

    await expect(
      countPurchasedProduct(database, browserId, "guangdong-stool-01"),
    ).resolves.toBe(2);
  });
});

describe("购物袋输入与目录兼容", () => {
  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 0, 1.5])(
    "加入购物袋拒绝非法数量 %s",
    async (quantity) => {
      const database = createTestDatabase(`invalid-add-${String(quantity)}`);
      const { browserId } = await createActiveMember(database);

      await expect(
        addCartItem(database, browserId, "stool-grey", quantity),
      ).rejects.toMatchObject({ code: "INVALID_CART_ITEM" });
    },
  );

  it("超过显式每单上限时拒绝而不静默截断", async () => {
    const database = createTestDatabase("max-per-order");
    const { browserId } = await createActiveMember(database);

    await expect(
      addCartItem(database, browserId, "stool-grey", 5),
    ).rejects.toMatchObject({ code: "UNAVAILABLE" });
    await expect(
      database.cartItems.where("browserId").equals(browserId).count(),
    ).resolves.toBe(0);
  });

  it("设置数量只允许零删除或正整数，未知行也能用原始 variantId 删除", async () => {
    const database = createTestDatabase("unknown-cart-row");
    const { browserId } = await createActiveMember(database);
    const nowIso = "2026-01-02T00:00:00.000Z";

    await database.cartItems.put({
      browserId,
      variantId: "retired-unknown-variant",
      quantity: 2,
      addedAt: nowIso,
      updatedAt: nowIso,
    });
    await database.carts.update(browserId, {
      revision: 1,
      updatedAt: nowIso,
    });

    const snapshot = await readCartSnapshot(database, browserId);
    expect(snapshot.subtotalCents).toBe(0);
    expect(snapshot.items).toHaveLength(1);
    expect(snapshot.items[0]).toMatchObject({
      variantId: "retired-unknown-variant",
      catalogStatus: "missing",
      unavailable: true,
      variant: {
        id: "retired-unknown-variant",
        nameZh: "商品已下架",
        priceCents: 0,
      },
    });
    await expect(
      checkoutCart(database, browserId, {
        expectedRevision: 1,
        idempotencyKey: "checkout:unknown-cart-row",
        method: "concierge",
      }),
    ).rejects.toMatchObject({ code: "UNAVAILABLE" });
    await expect(
      setCartItemQuantity(
        database,
        browserId,
        "retired-unknown-variant",
        -1,
      ),
    ).rejects.toMatchObject({ code: "INVALID_CART_ITEM" });

    const updatedCart = await setCartItemQuantity(
      database,
      browserId,
      "retired-unknown-variant",
      0,
    );
    expect(updatedCart.revision).toBe(2);
    await expect(
      database.cartItems.where("browserId").equals(browserId).count(),
    ).resolves.toBe(0);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 1.5])(
    "设置购物袋数量拒绝非法值 %s",
    async (quantity) => {
      const database = createTestDatabase(`invalid-set-${String(quantity)}`);
      const { browserId } = await createActiveMember(database);
      await addCartItem(database, browserId, "stool-grey", 1);

      await expect(
        setCartItemQuantity(
          database,
          browserId,
          "stool-grey",
          quantity,
        ),
      ).rejects.toMatchObject({ code: "INVALID_CART_ITEM" });
      await expect(
        database.cartItems.get([browserId, "stool-grey"]),
      ).resolves.toMatchObject({ quantity: 1 });
    },
  );
});

describe("虚拟物流", () => {
  it("在 0/12/28/45/66/90 秒边界推进，且逆向时间不会让状态倒退", async () => {
    const database = createTestDatabase("shipment-timeline");
    const { browserId } = await createActiveMember(database);
    const paidAt = new Date("2026-01-02T00:00:00.000Z");
    const { order, shipment } = await checkoutStandardVariant(
      database,
      browserId,
      paidAt,
    );

    expect(
      shipment.events.map((event) => (
        new Date(event.scheduledAt).getTime() - paidAt.getTime()
      ) / 1_000),
    ).toEqual([0, 12, 28, 45, 66, 90]);

    const offsets = [0, 12, 28, 45, 66, 28, 90, 0];
    const expectedStages = [0, 1, 2, 3, 4, 4, 5, 5];
    for (const [index, offsetSeconds] of offsets.entries()) {
      const updated = await reconcileShipment(
        database,
        order.id,
        new Date(paidAt.getTime() + offsetSeconds * 1_000),
      );
      expect(updated.currentStage).toBe(expectedStages[index]);
      expect(updated.status).toBe(
        SHIPMENT_MILESTONES[expectedStages[index]].key,
      );
    }

    const delivered = await database.shipments
      .where("orderId")
      .equals(order.id)
      .first();
    expect(delivered).toMatchObject({
      currentStage: 5,
      status: "delivered",
      nextTransitionAt: null,
    });
  });
});
