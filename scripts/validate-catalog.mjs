import { readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectCatalogAssetKeys,
  validateCatalogData,
} from "../src/catalog/validation.js";

/** 当前脚本所在目录。 */
const scriptsDirectory = dirname(fileURLToPath(import.meta.url));

/** 项目根目录。 */
const projectRoot = resolve(scriptsDirectory, "..");

/**
 * 读取目录下全部 JSON，并按文件名稳定排序。
 * @param {string} directory - JSON 目录绝对路径。
 * @returns {Promise<unknown[]>} JSON 默认对象列表。
 */
async function readJsonDirectory(directory) {
  const filenames = (await readdir(directory))
    .filter((filename) => filename.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(
    filenames.map(async (filename) => {
      const source = await readFile(join(directory, filename), "utf8");
      try {
        return JSON.parse(source);
      } catch (error) {
        throw new Error(`${filename} 不是有效 JSON：${error.message}`);
      }
    }),
  );
}

/**
 * 从 PNG IHDR 中读取真实像素尺寸。
 * @param {Buffer} buffer - PNG 文件内容。
 * @param {string} assetKey - 用于错误说明的资源键。
 * @returns {{width: number, height: number}} 图片尺寸。
 */
function readPngDimensions(buffer, assetKey) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (
    buffer.length < 24 ||
    !buffer.subarray(0, signature.length).equals(signature) ||
    buffer.toString("ascii", 12, 16) !== "IHDR"
  ) {
    throw new Error(`${assetKey} 不是包含有效 IHDR 的 PNG 文件`);
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

/**
 * 为目录声明的全部资源建立真实尺寸索引。
 * 缺失文件不会在此抛错，而会交给统一目录校验器报告准确字段路径。
 * @param {string[]} assetKeys - 去重后的资源键。
 * @returns {Promise<Record<string, {width: number, height: number}>>} 媒体信息索引。
 */
async function readAssetMetadata(assetKeys) {
  /** @type {Record<string, {width: number, height: number}>} */
  const metadata = {};
  await Promise.all(
    assetKeys.map(async (assetKey) => {
      const absolutePath = resolve(projectRoot, "public", assetKey);
      const publicRoot = `${resolve(projectRoot, "public")}/`;
      if (!absolutePath.startsWith(publicRoot)) {
        return;
      }
      try {
        const buffer = await readFile(absolutePath);
        metadata[assetKey] = readPngDimensions(buffer, assetKey);
      } catch (error) {
        if (error?.code !== "ENOENT") {
          throw error;
        }
      }
    }),
  );
  return metadata;
}

/**
 * 读取并校验项目商品目录。
 * @returns {Promise<void>}
 */
async function main() {
  const [series, products, homeSource] = await Promise.all([
    readJsonDirectory(join(projectRoot, "src/catalog/series")),
    readJsonDirectory(join(projectRoot, "src/catalog/products")),
    readFile(join(projectRoot, "src/catalog/home.json"), "utf8"),
  ]);
  const home = JSON.parse(homeSource);
  const catalog = { series, products, home };
  const assetKeys = collectCatalogAssetKeys(catalog);
  const assetMetadata = await readAssetMetadata(assetKeys);
  const result = validateCatalogData(catalog, { assetMetadata });

  if (!result.valid) {
    result.errors.forEach((error) => {
      process.stderr.write(
        `- [${error.code}] ${error.path}: ${error.message}\n`,
      );
    });
    process.exitCode = 1;
    return;
  }

  const variantCount = products.reduce(
    (count, product) => count + product.variants.length,
    0,
  );
  process.stdout.write(
    `商品目录校验通过：${series.length} 个系列、${products.length} 个商品、${variantCount} 个变体、${assetKeys.length} 个资源。\n`,
  );
}

await main();
