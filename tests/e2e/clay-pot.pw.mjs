import {
  expect,
  expectNoHorizontalOverflow,
  gotoRoute,
  test,
} from "./support.mjs";

/** 「煲点什么」系列的 canonical 路由片段。 */
const CLAY_POT_SERIES_ROUTE = "/series/clay-pot";

/** 「慢慢滚」商品的 canonical 路由片段。 */
const CLAY_POT_PRODUCT_ROUTE = "/products/clay-pot-01";

/**
 * 计划要求覆盖的代表性视口。
 * @type {{name: string, width: number, height: number}[]}
 */
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1024 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "mobile", width: 390, height: 844 },
];

/**
 * 获取主要内容区中指向「慢慢滚」的第一个链接。
 * @param {import("@playwright/test").Page} page - 当前浏览器页面。
 * @returns {import("@playwright/test").Locator} 沙煲商品链接。
 */
function getClayPotProductLink(page) {
  return page
    .locator(`main a[href*="${CLAY_POT_PRODUCT_ROUTE}"]`)
    .first();
}

/**
 * 断言指定图片全部完成加载且具有有效自然宽度。
 * @param {import("@playwright/test").Locator} images - 待检查的图片集合。
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

test.describe("慢慢滚目录与交易", () => {
  test("新品、系列、搜索和单变体详情完整接入六张影像", async ({
    page,
  }) => {
    await gotoRoute(page, "");
    await expect(getClayPotProductLink(page)).toBeVisible();

    await gotoRoute(page, "products");
    await expect(page.locator("main")).toContainText("煲点什么");
    await expect(getClayPotProductLink(page)).toBeVisible();

    await gotoRoute(page, "series/clay-pot");
    await expect(page).toHaveURL(new RegExp(`${CLAY_POT_SERIES_ROUTE}$`));
    await expect(page.locator("main")).toContainText("煲点什么");
    await expect(getClayPotProductLink(page)).toBeVisible();
    await expect(
      page.locator('main a[href*="/products/guangdong-stool-"]'),
    ).toHaveCount(0);

    await gotoRoute(page, "products");
    await page.getByRole("button", { name: "搜索作品" }).click();
    await page.getByLabel("搜索岭南辑造作品").fill("沙煲");
    await expect(
      page.locator(
        `.search-results a[href*="${CLAY_POT_PRODUCT_ROUTE}"]`,
      ),
    ).toBeVisible();

    await gotoRoute(page, "products/clay-pot-01");
    await expect(page).toHaveURL(new RegExp(`${CLAY_POT_PRODUCT_ROUTE}$`));
    await expect(page.locator("main")).toContainText("慢慢滚 · 砂褐");
    await expect(
      page.getByRole("group", { name: "选择版本" }),
    ).toHaveCount(0);

    const galleryImages = page.locator(".product-gallery img");
    await expect(galleryImages).toHaveCount(6);
    await expectImagesLoaded(galleryImages);

    const aiFigure = page.getByRole("figure", {
      name: "品牌 AI 概念影像 · 白色展馆陈列",
    });
    await expect(aiFigure).toBeVisible();
    await expect(aiFigure.locator("img")).toHaveAttribute(
      "alt",
      /沙煲|砂褐/,
    );
    const milanoFigure = page.getByRole("figure", {
      name: "品牌 AI 概念影像 · 米兰造型",
    });
    await expect(milanoFigure).toBeVisible();
    await expect(milanoFigure.locator("img")).toHaveAttribute(
      "alt",
      /虚构成年米兰模特.*轻触.*短柄/,
    );
    await expect(
      page.getByRole("button", { name: /入会后选购/ }),
    ).toBeVisible();
  });

  test("EDITION 会员可购买四件并生成 ¥75,200 订单快照", async ({
    page,
  }) => {
    await gotoRoute(page, "membership/checkout");
    const membershipPayment = page.getByRole("button", {
      name: /^虚拟支付/,
    });
    await expect(membershipPayment).toBeEnabled();
    await membershipPayment.click();
    await expect(page).toHaveURL(/\/membership$/, { timeout: 10_000 });
    await expect(page.locator("main")).toContainText("辑选会员");

    await gotoRoute(page, "products/clay-pot-01");
    const addToBag = page.getByRole("button", { name: /加入购物袋/ });
    await expect(addToBag).toBeEnabled();
    await addToBag.click();
    await expect(page.getByText("作品已加入购物袋。")).toBeVisible();

    await gotoRoute(page, "bag");
    await expect(page.locator("main")).toContainText("慢慢滚 · 砂褐");
    const quantityControl = page.getByLabel("慢慢滚 · 砂褐数量", {
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
    await expect(
      page.getByRole("heading", { name: "慢慢滚 · 砂褐", level: 3 }),
    ).toBeVisible();
    await expect(page.locator(".checkout-products")).toContainText(
      "4 × ¥18,800",
    );

    await page.getByRole("button", { name: "确认订单" }).click();
    await page.getByRole("button", { name: "确认礼宾配送" }).click();
    const payButton = page.getByRole("button", {
      name: "虚拟支付 ¥75,200",
    });
    await expect(payButton).toBeEnabled();
    await payButton.click();

    await expect(page).toHaveURL(/\/orders\/[^/?]+\?success=1$/, {
      timeout: 10_000,
    });
    const orderRecord = page.locator(".order-record");
    await expect(orderRecord).toContainText("慢慢滚 · 砂褐");
    await expect(orderRecord).toContainText("4 × ¥18,800");
    await expect(orderRecord).toContainText("¥75,200");
  });
});

for (const viewport of VIEWPORTS) {
  test(`${viewport.name} 视口下沙煲总览、系列与详情无横向溢出`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });

    await gotoRoute(page, "products");
    await expect(page.locator("main")).toContainText("煲点什么");
    await expect(getClayPotProductLink(page)).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await gotoRoute(page, "series/clay-pot");
    await expect(page.locator("main")).toContainText("煲点什么");
    await expect(getClayPotProductLink(page)).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await gotoRoute(page, "products/clay-pot-01");
    await expect(page.locator("main")).toContainText("慢慢滚 · 砂褐");
    await expect(
      page.getByRole("group", { name: "选择版本" }),
    ).toHaveCount(0);
    await expect(page.locator(".product-gallery img").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
}
