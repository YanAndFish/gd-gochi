import {
  expect,
  expectNoHorizontalOverflow,
  gotoRoute,
  test,
} from "./support.mjs";

/** 「暖水有花样」系列的 canonical 路由。 */
const SERIES_ROUTE = "/series/floral-flask";

/** 「花里壶哨」商品的 canonical 路由。 */
const PRODUCT_ROUTE = "/products/floral-flask-01";

/** @type {{name: string, width: number, height: number}[]} 暖水樽响应式验收视口。 */
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1024 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "mobile", width: 390, height: 844 },
];

/**
 * 获取主要内容区内的暖水樽商品入口。
 * @param {import("@playwright/test").Page} page - 当前页面。
 * @returns {import("@playwright/test").Locator} 商品链接。
 */
function getProductLink(page) {
  return page.locator(`main a[href*="${PRODUCT_ROUTE}"]`).first();
}

/**
 * 断言一组商品图片均已真实加载。
 * @param {import("@playwright/test").Locator} images - 商品图片集合。
 * @returns {Promise<void>}
 */
async function expectImagesLoaded(images) {
  await expect
    .poll(async () =>
      images.evaluateAll((entries) =>
        entries.every((image) => image.complete && image.naturalWidth > 0),
      ),
    )
    .toBe(true);
}

test.describe("花里壶哨目录与交易", () => {
  test("新品、系列、搜索和五色详情完整接入米兰造型", async ({ page }) => {
    await gotoRoute(page, "");
    await expect(getProductLink(page)).toBeVisible();

    await gotoRoute(page, "products");
    await expect(page.locator("main")).toContainText("暖水有花样");
    await expect(getProductLink(page)).toBeVisible();

    await gotoRoute(page, "series/floral-flask");
    await expect(page).toHaveURL(new RegExp(`${SERIES_ROUTE}$`));
    await expect(page.locator("main")).toContainText("暖水有花样");
    await expect(getProductLink(page)).toBeVisible();
    await expect(
      page.locator(
        'main a[href*="/products/guangdong-stool-"], main a[href*="/products/clay-pot-01"], main a[href*="/products/guangdong-flip-flop-01"]',
      ),
    ).toHaveCount(0);

    await gotoRoute(page, "products");
    await page.getByRole("button", { name: "搜索作品" }).click();
    await page.getByLabel("搜索岭南辑造作品").fill("花里壶哨");
    await expect(
      page.locator(`.search-results a[href*="${PRODUCT_ROUTE}"]`),
    ).toBeVisible();

    await gotoRoute(page, "products/floral-flask-01");
    await expect(page).toHaveURL(new RegExp(`${PRODUCT_ROUTE}$`));
    await expect(page.locator("main")).toContainText("花里壶哨 · 朱红");
    await expect(page.locator("main")).toContainText("¥15,800");

    const selector = page.getByRole("group", { name: "选择版本" });
    const variants = [
      { label: "朱红", id: "floral-flask-red", gallerySize: 6 },
      { label: "紫罗兰", id: "floral-flask-violet", gallerySize: 4 },
      { label: "水青", id: "floral-flask-aqua", gallerySize: 4 },
      { label: "桃粉", id: "floral-flask-pink", gallerySize: 4 },
      { label: "暖黄", id: "floral-flask-yellow", gallerySize: 4 },
    ];
    await expect(selector.getByRole("button")).toHaveCount(variants.length);
    for (const { label, id, gallerySize } of variants) {
      const button = selector.getByRole("button", {
        name: new RegExp(`^${label}$`),
      });
      await button.focus();
      await expect(button).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(
        new RegExp(`/products/floral-flask-01\\?variant=${id}$`),
      );
      await expect(page.locator("main")).toContainText(`花里壶哨 · ${label}`);
      const images = page.locator(".product-gallery img");
      await expect(images).toHaveCount(gallerySize);
      await expectImagesLoaded(images);
    }

    await gotoRoute(page, "products/floral-flask-01");
    const galleryImages = page.locator(".product-gallery img");
    await expect(galleryImages).toHaveCount(6);
    await expectImagesLoaded(galleryImages);
    await expect(
      page.getByRole("figure", {
        name: "品牌 AI 概念影像 · 五色暖水樽展馆陈列",
      }),
    ).toBeVisible();
    const milanoFigure = page.getByRole("figure", {
      name: "品牌 AI 概念影像 · 米兰造型",
    });
    await expect(milanoFigure).toBeVisible();
    await expect(milanoFigure.locator("img")).toHaveAttribute(
      "alt",
      /虚构成年米兰模特.*顶部提梁携带.*朱红花卉暖水樽/,
    );
    await expect(
      page.getByRole("button", { name: /入会后选购/ }),
    ).toBeVisible();
  });

  test("EDITION 会员可购买四件并生成 ¥63,200 订单快照", async ({ page }) => {
    await gotoRoute(page, "membership/checkout");
    const membershipPayment = page.getByRole("button", {
      name: /^虚拟支付/,
    });
    await expect(membershipPayment).toBeEnabled();
    await membershipPayment.click();
    await expect(page).toHaveURL(/\/membership$/, { timeout: 10_000 });

    await gotoRoute(page, "products/floral-flask-01");
    const addToBag = page.getByRole("button", { name: /加入购物袋/ });
    await expect(addToBag).toBeEnabled();
    await addToBag.click();
    await expect(page.getByText("作品已加入购物袋。")).toBeVisible();

    await gotoRoute(page, "bag");
    const quantityControl = page.getByLabel("花里壶哨 · 朱红数量", {
      exact: true,
    });
    const increaseQuantity = quantityControl.getByRole("button", {
      name: /增加.*数量/,
    });
    for (const quantity of [2, 3, 4]) {
      await increaseQuantity.click();
      await expect(quantityControl).toContainText(String(quantity));
    }
    await expect(increaseQuantity).toBeDisabled();

    await page.getByRole("link", { name: "进入礼宾结账" }).click();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.locator(".checkout-products")).toContainText(
      "4 × ¥15,800",
    );
    await page.getByRole("button", { name: "确认订单" }).click();
    await page.getByRole("button", { name: "确认礼宾配送" }).click();
    const payButton = page.getByRole("button", {
      name: "虚拟支付 ¥63,200",
    });
    await expect(payButton).toBeEnabled();
    await payButton.click();

    await expect(page).toHaveURL(/\/orders\/[^/?]+\?success=1$/, {
      timeout: 10_000,
    });
    const orderRecord = page.locator(".order-record");
    await expect(orderRecord).toContainText("花里壶哨 · 朱红");
    await expect(orderRecord).toContainText("4 × ¥15,800");
    await expect(orderRecord).toContainText("¥63,200");
  });
});

for (const viewport of VIEWPORTS) {
  test(`${viewport.name} 视口下暖水樽总览、系列与详情无横向溢出`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });

    await gotoRoute(page, "products");
    await expect(page.locator("main")).toContainText("暖水有花样");
    await expect(getProductLink(page)).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await gotoRoute(page, "series/floral-flask");
    await expect(page.locator("main")).toContainText("暖水有花样");
    await expect(getProductLink(page)).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await gotoRoute(page, "products/floral-flask-01");
    await expect(page.locator("main")).toContainText("花里壶哨 · 朱红");
    await expect(page.getByRole("group", { name: "选择版本" })).toBeVisible();
    await expect(page.locator(".product-gallery img").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
}
