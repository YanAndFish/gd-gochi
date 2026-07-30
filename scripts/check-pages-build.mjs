import { access, readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** GitHub Pages 项目站点使用的固定部署前缀。 */
const PAGES_BASE_PATH = "/gd-gochi/";

/** 当前脚本所在目录。 */
const scriptsDirectory = dirname(fileURLToPath(import.meta.url));

/** Vite 生产构建目录。 */
const buildDirectory = resolve(scriptsDirectory, "../dist/client");

/**
 * 在条件不成立时中止产物校验并给出可操作错误。
 * @param {unknown} condition - 待判断的条件。
 * @param {string} message - 校验失败说明。
 * @returns {asserts condition}
 */
function assertBuild(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * 检查相对于构建目录的文件是否存在。
 * @param {string} relativePath - 构建目录内相对路径。
 * @returns {Promise<void>}
 */
async function assertFileExists(relativePath) {
  try {
    await access(join(buildDirectory, relativePath));
  } catch {
    throw new Error(`Pages 产物缺少 ${relativePath}`);
  }
}

/**
 * 从 HTML 中提取 src 与 href 地址。
 * @param {string} html - HTML 源码。
 * @returns {string[]} 去重后的地址。
 */
function collectHtmlUrls(html) {
  return [
    ...new Set(
      [...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)].map(
        (match) => match[1],
      ),
    ),
  ];
}

/**
 * 校验入口资源全部使用项目子路径，并且能在构建目录中找到。
 * @param {string[]} urls - HTML 中引用的地址。
 * @returns {Promise<string[]>} 本地 Pages 资源相对路径。
 */
async function validateEntryAssets(urls) {
  const localAssetPaths = [];
  for (const url of urls) {
    if (!url.startsWith("/") || url.startsWith("//")) {
      continue;
    }

    assertBuild(
      url.startsWith(PAGES_BASE_PATH),
      `入口仍包含未加部署前缀的根路径资源：${url}`,
    );
    const relativePath = decodeURIComponent(
      url.slice(PAGES_BASE_PATH.length).split(/[?#]/, 1)[0],
    );
    assertBuild(relativePath.length > 0, `入口包含无效资源地址：${url}`);
    await assertFileExists(relativePath);
    localAssetPaths.push(relativePath);
  }
  return localAssetPaths;
}

/**
 * 校验 GitHub Pages 生产产物、资源基路径和 SPA 深层路由回退。
 * @returns {Promise<void>}
 */
async function main() {
  await Promise.all([
    assertFileExists("index.html"),
    assertFileExists("404.html"),
  ]);

  const [indexHtml, fallbackHtml] = await Promise.all([
    readFile(join(buildDirectory, "index.html"), "utf8"),
    readFile(join(buildDirectory, "404.html"), "utf8"),
  ]);
  const entryAssetPaths = await validateEntryAssets(
    collectHtmlUrls(indexHtml),
  );

  assertBuild(
    entryAssetPaths.some((path) => path.endsWith(".js")),
    "Pages 入口没有找到带 /gd-gochi/ 前缀的 JavaScript 资源",
  );
  assertBuild(
    entryAssetPaths.some((path) => path.endsWith(".css")),
    "Pages 入口没有找到带 /gd-gochi/ 前缀的 CSS 资源",
  );
  const faviconTag = indexHtml.match(
    /<link\b[^>]*\brel=["'](?:shortcut\s+)?icon["'][^>]*>/i,
  )?.[0];
  assertBuild(
    faviconTag,
    "Pages 入口必须显式声明 favicon，避免项目子路径下回退请求域名根目录",
  );
  const faviconHref = faviconTag.match(/\bhref=["']([^"']+)["']/i)?.[1];
  assertBuild(
    faviconHref?.startsWith(PAGES_BASE_PATH),
    "favicon 必须使用 /gd-gochi/ 部署前缀",
  );
  assertBuild(
    indexHtml.includes('location.search.startsWith("?/")'),
    "index.html 缺少 GitHub Pages 深层路由还原逻辑",
  );
  assertBuild(
    fallbackHtml.includes("pathSegmentsToKeep = 1") &&
      fallbackHtml.includes("${repositoryRoot}/?/"),
    "404.html 缺少 /gd-gochi/ 项目站点的 SPA 路由回退逻辑",
  );

  const bundleDirectory = join(buildDirectory, "assets");
  const bundleFilenames = (await readdir(bundleDirectory)).filter((filename) =>
    /\.(?:css|js)$/.test(filename),
  );
  const bundleSources = await Promise.all(
    bundleFilenames.map((filename) =>
      readFile(join(bundleDirectory, filename), "utf8"),
    ),
  );
  assertBuild(
    bundleSources.every(
      (source) => !/(?:["'`(])\/assets\//.test(source),
    ),
    "生产 bundle 仍包含绕过 BASE_URL 的 /assets/ 根路径",
  );

  process.stdout.write(
    `Pages 产物校验通过：${entryAssetPaths.length} 个入口资源，部署前缀 ${PAGES_BASE_PATH}。\n`,
  );
}

await main();
