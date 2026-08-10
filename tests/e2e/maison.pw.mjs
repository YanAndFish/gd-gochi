import {
  expect,
  expectNoHorizontalOverflow,
  gotoRoute,
  test,
} from "./support.mjs";

/** 品牌故事页需要覆盖的代表性视口。 */
const MAISON_VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1024 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "mobile", width: 390, height: 844 },
];

/**
 * 逐张进入视口以触发长页面的原生懒加载，并验证资源全部可解码。
 * @param {import("@playwright/test").Page} page - 当前品牌故事页。
 * @returns {Promise<void>}
 */
async function loadAllMaisonImages(page) {
  const images = page.locator(".maison-page img");
  const imageCount = await images.count();
  for (let index = 0; index < imageCount; index += 1) {
    await images.nth(index).scrollIntoViewIfNeeded();
  }
  await expect
    .poll(async () =>
      images.evaluateAll((elements) =>
        elements.every((image) => image.complete && image.naturalWidth > 0),
      ),
    )
    .toBe(true);
}

test.describe("品牌故事页", () => {
  test("全站入口、深链、返回前进与页面元数据保持一致", async ({ page }) => {
    await gotoRoute(page, "");
    await page
      .locator(".primary-nav")
      .getByRole("link", { name: "品牌故事" })
      .click();

    await expect(page).toHaveURL(/\/gd-gochi\/maison$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("朱色礼拜");
    await expect(page).toHaveTitle("品牌故事 | LINGNAN EDITIONS");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /描摹、校正、对色、检视与编号/,
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      "品牌故事 | LINGNAN EDITIONS",
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      "content",
      "https://yanandfish.github.io/gd-gochi/maison",
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://yanandfish.github.io/gd-gochi/maison",
    );
    await expect(page.locator(".site-header")).toHaveClass(/site-header-dark/);

    await page.goBack();
    await expect(page).toHaveURL(/\/gd-gochi\/$/);
    await page.goForward();
    await expect(page).toHaveURL(/\/gd-gochi\/maison$/);

    await gotoRoute(page, "maison#colour");
    await expect(page).toHaveURL(/\/maison#colour$/);
    await expect(page.getByRole("heading", { name: "朱色礼拜", level: 2 })).toBeVisible();
  });

  test("桌面章序轨道可键盘操作并同步当前章节", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1024 });
    await gotoRoute(page, "maison");

    const rail = page.locator(".maison-rail");
    await expect(rail).toBeVisible();
    await expect(rail.locator("a")).toHaveCount(6);
    await expect(rail).not.toContainText("入室");
    await expect(page.locator(".maison-rail-progress")).toContainText("/006");
    await expect(rail.locator('a[aria-current="location"]')).toContainText("信条");

    const colourLink = rail.locator('a[href="#colour"]');
    await colourLink.focus();
    await expect(colourLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#colour$/);
    await expect
      .poll(async () => rail.locator('a[aria-current="location"]').textContent())
      .toContain("定色");
  });

  test("影像加载策略、真实档案作品和焦点路径完整", async ({ page }) => {
    await gotoRoute(page, "maison");

    const heroImage = page.locator(".maison-hero img");
    await expect(heroImage).toHaveAttribute("loading", "eager");
    await expect(heroImage).toHaveAttribute("fetchpriority", "high");
    await expect(page.locator('.maison-figure img[loading="lazy"]')).toHaveCount(9);
    await expect(
      page.getByText("品牌 AI 概念影像", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", {
        name: /在成为设计以前.*它先属于生活/,
      }),
    ).toBeVisible();
    await expect(page.locator("#place")).toHaveCount(0);

    const archive = page.locator(".maison-archive");
    await archive.scrollIntoViewIfNeeded();
    await expect(archive).toContainText("粤凳 01");
    await expect(archive).toContainText("慢慢滚");
    await expect(archive).toContainText("踢踢拖拖");
    await expect(archive).toContainText("花里壶哨");
    await expect
      .poll(async () =>
        page.locator(".maison-rail-progress").textContent(),
      )
      .toContain("006/006");
    await expect(
      page.locator('.maison-rail a[aria-current="location"]'),
    ).toContainText("编号");

    await loadAllMaisonImages(page);

    const archiveLink = page.getByRole("link", { name: /进入作品档案/ });
    await archiveLink.focus();
    await expect(archiveLink).toBeFocused();
  });

  for (const viewport of MAISON_VIEWPORTS) {
    test(`${viewport.name} 视口无横向溢出且响应式章节结构正确`, async ({
      page,
    }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await gotoRoute(page, "maison");
      await loadAllMaisonImages(page);
      await expectNoHorizontalOverflow(page);

      const rail = page.locator(".maison-rail");
      if (viewport.width <= 760) {
        await expect(rail).toBeHidden();
        await expect(page.locator(".maison-credo .maison-chapter-mark")).toBeVisible();
        await expect(page.locator(".site-header")).not.toHaveCSS("position", "sticky");
      } else {
        await expect(rail).toBeVisible();
      }

      const revealStates = await page.locator("[data-reveal]").evaluateAll(
        (elements) => elements.map((element) => getComputedStyle(element).opacity),
      );
      expect(new Set(revealStates)).toEqual(new Set(["1"]));
    });
  }
});
