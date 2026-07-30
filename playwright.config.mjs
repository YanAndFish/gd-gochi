import { defineConfig } from "@playwright/test";

/**
 * 统一补齐基础地址末尾的斜杠，确保相对路由在本地预览与 GitHub Pages 下行为一致。
 * @param {string} value - 原始基础地址。
 * @returns {string} 可用于 Playwright 的规范基础地址。
 */
function normalizeBaseUrl(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

/** 外部站点地址；传入后不会自动启动本地预览服务。 */
const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL?.trim();

/** 默认以生产构建的 GitHub Pages 子路径运行冒烟测试。 */
const baseURL = normalizeBaseUrl(
  externalBaseUrl || "http://127.0.0.1:4173/gd-gochi/",
);

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.pw.mjs",
  outputDir: "output/playwright/test-results",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 30_000,
  expect: {
    timeout: 7_000,
  },
  reporter: [
    [process.env.CI ? "line" : "list"],
    [
      "html",
      {
        open: "never",
        outputFolder: "output/playwright/report",
      },
    ],
  ],
  use: {
    baseURL,
    browserName: "chromium",
    channel: "chromium",
    locale: "zh-CN",
    colorScheme: "light",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command:
          "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
      },
});
