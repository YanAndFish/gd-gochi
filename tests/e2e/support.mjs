import { expect, test as base } from "@playwright/test";

/**
 * 为每个浏览器页面收集脚本异常、console.error 与 console.warn，
 * 并在用例结束时统一断言，确保 React 警告也不会被遗漏。
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    /** @type {string[]} 当前页面捕获的运行时错误。 */
    const runtimeErrors = [];

    page.on("pageerror", (error) => {
      runtimeErrors.push(`pageerror: ${error.message}`);
    });
    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning") {
        const location = message.location();
        runtimeErrors.push(
          `console.${message.type()}: ${message.text()}${location.url ? ` @ ${location.url}` : ""}`,
        );
      }
    });
    await use(page);

    expect(
      runtimeErrors,
      `页面不应出现运行时错误：\n${runtimeErrors.join("\n")}`,
    ).toEqual([]);
  },
});

export { expect };

/**
 * 使用相对于 Playwright baseURL 的路由打开页面，并等待主要内容稳定。
 * 不能使用开头斜杠，否则会绕过 GitHub Pages 的 /gd-gochi/ 前缀。
 * @param {import("@playwright/test").Page} page - 当前浏览器页面。
 * @param {string} route - 不含开头斜杠的应用路由。
 * @returns {Promise<void>}
 */
export async function gotoRoute(page, route) {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await expect(page.locator("main")).toBeVisible();
}

/**
 * 等待字体与图片完成布局后检查页面没有横向溢出。
 * @param {import("@playwright/test").Page} page - 当前浏览器页面。
 * @returns {Promise<void>}
 */
export async function expectNoHorizontalOverflow(page) {
  await page.evaluate(async () => {
    await document.fonts?.ready;
    await Promise.all(
      [...document.images]
        .filter((image) => {
          if (image.complete) {
            return false;
          }
          const bounds = image.getBoundingClientRect();
          const nearViewport =
            bounds.bottom >= -window.innerHeight &&
            bounds.top <= window.innerHeight * 2;
          return image.loading !== "lazy" || nearViewport;
        })
        .map(
          (image) =>
            new Promise((resolve) => {
              image.addEventListener("load", resolve, { once: true });
              image.addEventListener("error", resolve, { once: true });
            }),
        ),
    );
  });

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}
