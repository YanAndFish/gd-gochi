import {
  expect,
  expectNoHorizontalOverflow,
  gotoRoute,
  test,
} from "./support.mjs";

/** 「粤拖系列」的 canonical 路由片段。 */
const FLIP_FLOP_SERIES_ROUTE = "/series/guangdong-flip-flop";

/** 「踢踢拖拖」商品的 canonical 路由片段。 */
const FLIP_FLOP_PRODUCT_ROUTE = "/products/guangdong-flip-flop-01";

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
 * 获取主要内容区中指向「踢踢拖拖」的第一个链接。
 * @param {import("@playwright/test").Page} page - 当前浏览器页面。
 * @returns {import("@playwright/test").Locator} 人字拖商品链接。
 */
function getFlipFlopProductLink(page) {
  return page
    .locator(`main a[href*="${FLIP_FLOP_PRODUCT_ROUTE}"]`)
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

test.describe("踢踢拖拖目录与交易", () => {
  test("新品、系列、搜索和四色详情完整接入米兰造型", async ({
    page,
  }) => {
    await gotoRoute(page, "");
    await expect(getFlipFlopProductLink(page)).toBeVisible();

    await gotoRoute(page, "products");
    await expect(page.locator("main")).toContainText("粤拖系列");
    await expect(getFlipFlopProductLink(page)).toBeVisible();

    await gotoRoute(page, "series/guangdong-flip-flop");
    await expect(page).toHaveURL(new RegExp(`${FLIP_FLOP_SERIES_ROUTE}$`));
    await expect(page.locator("main")).toContainText("粤拖系列");
    await expect(getFlipFlopProductLink(page)).toBeVisible();
    await expect(
      page.locator(
        'main a[href*="/products/guangdong-stool-"], main a[href*="/products/clay-pot-01"]',
      ),
    ).toHaveCount(0);

    await gotoRoute(page, "products");
    await page.getByRole("button", { name: "搜索作品" }).click();
    await page.getByLabel("搜索岭南辑造作品").fill("踢踢拖拖");
    await expect(
      page.locator(
        `.search-results a[href*="${FLIP_FLOP_PRODUCT_ROUTE}"]`,
      ),
    ).toBeVisible();

    await gotoRoute(page, "products/guangdong-flip-flop-01");
    await expect(page).toHaveURL(new RegExp(`${FLIP_FLOP_PRODUCT_ROUTE}$`));
    await expect(page.locator("main")).toContainText("踢踢拖拖 · 蓝白");

    const selector = page.getByRole("group", { name: "选择版本" });
    const variants = [
      { label: "蓝白", id: "flip-flop-blue-white", gallerySize: 6 },
      { label: "绿白", id: "flip-flop-green-white", gallerySize: 4 },
      { label: "朱白", id: "flip-flop-red-white", gallerySize: 4 },
      { label: "墨黑", id: "flip-flop-black", gallerySize: 4 },
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
        new RegExp(
          `/products/guangdong-flip-flop-01\\?variant=${id}$`,
        ),
      );
      await expect(page.locator("main")).toContainText(
        `踢踢拖拖 · ${label}`,
      );
      const variantImages = page.locator(".product-gallery img");
      await expect(variantImages).toHaveCount(gallerySize);
      await expectImagesLoaded(variantImages);
    }

    await gotoRoute(page, "products/guangdong-flip-flop-01");
    const galleryImages = page.locator(".product-gallery img");
    await expect(galleryImages).toHaveCount(6);
    await expectImagesLoaded(galleryImages);
    await expect(
      page.getByRole("figure", {
        name: "品牌 AI 概念影像 · 四色错落陈列",
      }),
    ).toBeVisible();
    const milanoFigure = page.getByRole("figure", {
      name: "品牌 AI 概念影像 · 米兰造型",
    });
    await expect(milanoFigure).toBeVisible();
    await expect(milanoFigure.locator("img")).toHaveAttribute(
      "alt",
      /虚构成年米兰模特.*蓝白平底人字拖.*自然迈步/,
    );
    await expect(
      page.getByRole("button", { name: /入会后选购/ }),
    ).toBeVisible();
  });

  test("EDITION 会员可购买四双并生成 ¥27,200 订单快照", async ({
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

    await gotoRoute(page, "products/guangdong-flip-flop-01");
    const addToBag = page.getByRole("button", { name: /加入购物袋/ });
    await expect(addToBag).toBeEnabled();
    await addToBag.click();
    await expect(page.getByText("作品已加入购物袋。")).toBeVisible();

    await gotoRoute(page, "bag");
    await expect(page.locator("main")).toContainText("踢踢拖拖 · 蓝白");
    const quantityControl = page.getByLabel("踢踢拖拖 · 蓝白数量", {
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
      page.getByRole("heading", {
        name: "踢踢拖拖 · 蓝白",
        level: 3,
      }),
    ).toBeVisible();
    await expect(page.locator(".checkout-products")).toContainText(
      "4 × ¥6,800",
    );

    await page.getByRole("button", { name: "确认订单" }).click();
    await page.getByRole("button", { name: "确认礼宾配送" }).click();
    const payButton = page.getByRole("button", {
      name: "虚拟支付 ¥27,200",
    });
    await expect(payButton).toBeEnabled();
    await payButton.click();

    await expect(page).toHaveURL(/\/orders\/[^/?]+\?success=1$/, {
      timeout: 10_000,
    });
    const orderRecord = page.locator(".order-record");
    await expect(orderRecord).toContainText("踢踢拖拖 · 蓝白");
    await expect(orderRecord).toContainText("4 × ¥6,800");
    await expect(orderRecord).toContainText("¥27,200");
  });
});

for (const viewport of VIEWPORTS) {
  test(`${viewport.name} 视口下粤拖总览、系列与详情无横向溢出`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });

    await gotoRoute(page, "products");
    await expect(page.locator("main")).toContainText("粤拖系列");
    await expect(getFlipFlopProductLink(page)).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await gotoRoute(page, "series/guangdong-flip-flop");
    await expect(page.locator("main")).toContainText("粤拖系列");
    await expect(getFlipFlopProductLink(page)).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await gotoRoute(page, "products/guangdong-flip-flop-01");
    await expect(page.locator("main")).toContainText("踢踢拖拖 · 蓝白");
    await expect(page.getByRole("group", { name: "选择版本" })).toBeVisible();
    await expect(page.locator(".product-gallery img").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
}
