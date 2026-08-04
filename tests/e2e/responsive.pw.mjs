import {
  expect,
  expectNoHorizontalOverflow,
  gotoRoute,
  test,
} from "./support.mjs";

/**
 * 计划要求覆盖的代表性视口。
 * @type {{name: string, width: number, height: number}[]}
 */
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1024 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "mobile", width: 390, height: 844 },
];

for (const viewport of VIEWPORTS) {
  test(`${viewport.name} 视口下商品总览与系列页无横向溢出`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });

    await gotoRoute(page, "products");
    await expect(
      page.locator(
        'main a[href*="/products/guangdong-stool-01"]',
      ).first(),
    ).toBeVisible();
    await expect(
      page.locator(
        'main a[href*="/products/guangdong-stool-02"]',
      ).first(),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await gotoRoute(page, "series/guangdong-stool");
    await expect(page.locator("main")).toContainText("粤凳系列");
    await expectNoHorizontalOverflow(page);

    await gotoRoute(page, "products/guangdong-stool-02");
    await expect(page.locator("main")).toContainText("粤凳 02 · 浅蓝");
    await expectNoHorizontalOverflow(page);
  });
}
