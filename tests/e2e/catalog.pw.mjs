import { expect, gotoRoute, test } from "./support.mjs";

/** 两个正式商品的 canonical 路由片段。 */
const STOOL_ROUTE = "/products/guangdong-stool-01";
const ARCHIVE_ROUTE = "/products/guangdong-stool-archive-01";

/**
 * 获取主要内容区中指向指定商品的第一个链接。
 * @param {import("@playwright/test").Page} page - 当前浏览器页面。
 * @param {string} route - canonical 商品路由片段。
 * @returns {import("@playwright/test").Locator} 商品链接。
 */
function getProductLink(page, route) {
  return page.locator(`main a[href*="${route}"]`).first();
}

test.describe("多商品目录与路由", () => {
  test("商品总览和系列页都自动陈列两个独立商品", async ({ page }) => {
    await gotoRoute(page, "products");
    await expect(getProductLink(page, STOOL_ROUTE)).toBeVisible();
    await expect(getProductLink(page, ARCHIVE_ROUTE)).toBeVisible();

    await gotoRoute(page, "series/guangdong-stool");
    await expect(page.locator("main")).toContainText("粤凳系列");
    await expect(getProductLink(page, STOOL_ROUTE)).toBeVisible();
    await expect(getProductLink(page, ARCHIVE_ROUTE)).toBeVisible();
  });

  test("粤凳详情只显示本商品变体，并可使用键盘切换", async ({ page }) => {
    await gotoRoute(
      page,
      "products/guangdong-stool-01?variant=stool-grey",
    );
    await expect(page).toHaveURL(
      /\/products\/guangdong-stool-01\?variant=stool-grey$/,
    );
    await expect(page.locator("main")).toContainText("粤凳 01");
    await expect(page.locator("main")).toContainText("骑楼灰");

    const selector = page.getByRole("group", { name: "选择版本" });
    await expect(selector).toBeVisible();
    await expect(
      selector.getByRole("button", { name: /瓷象牙/ }),
    ).toBeVisible();
    await expect(
      selector.getByRole("button", { name: /骑楼灰/ }),
    ).toBeVisible();
    const redButton = selector.getByRole("button", { name: /岭南朱/ });
    await expect(redButton).toBeVisible();
    await expect(selector).not.toContainText("三色典藏");

    await redButton.focus();
    await expect(redButton).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(
      /\/products\/guangdong-stool-01\?variant=stool-red$/,
    );
    await expect(page.locator("main")).toContainText("岭南朱");
  });

  test("单变体档案商品使用独立深链并隐藏无意义选择器", async ({ page }) => {
    await gotoRoute(page, "products/guangdong-stool-archive-01");
    await expect(page).toHaveURL(
      /\/products\/guangdong-stool-archive-01(?:\?.*)?$/,
    );
    await expect(page.locator("main")).toContainText("档案套装 01");
    await expect(page.locator("main")).toContainText("三色典藏");
    await expect(
      page.getByRole("group", { name: "选择版本" }),
    ).toHaveCount(0);
    await expect(page.locator("main")).toContainText("品牌 AI 概念影像");

    const unavailableButton = page.getByRole("button", {
      name: /暂时缺货/,
    });
    await expect(unavailableButton).toBeVisible();
    await expect(page.locator("main")).not.toContainText(
      /等级不足|升级后购买|PATRON/,
    );
  });

  test("旧的档案套装变体链接以 replace 方式归一到 canonical 路由", async ({
    page,
  }) => {
    await gotoRoute(
      page,
      "products/guangdong-stool-01?variant=archive-set",
    );
    await expect(page).toHaveURL(
      /\/products\/guangdong-stool-archive-01(?:\?variant=archive-set)?$/,
    );
    await expect(page.locator("main")).toContainText("档案套装 01");
  });
});
