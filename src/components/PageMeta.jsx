import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** 线上站点根地址，用于生成不受本地预览影响的 canonical URL。 */
const SITE_BASE_URL = "https://yanandfish.github.io/gd-gochi/";

/** 全站默认摘要。 */
const DEFAULT_DESCRIPTION =
  "LINGNAN EDITIONS 岭南辑造——以岭南文化为源，辑造面向当代生活的设计器物。";

/**
 * 更新已经存在于文档头部的 meta 标签。
 * @param {string} selector - 目标 meta 标签选择器。
 * @param {string} content - 新的 meta 内容。
 * @returns {void}
 */
function updateMetaContent(selector, content) {
  document.querySelector(selector)?.setAttribute("content", content);
}

/**
 * 把应用内路径转换为线上 canonical URL。
 * @param {string} path - React Router 中不含部署前缀的路径。
 * @returns {string} 完整线上地址。
 */
function resolveCanonicalUrl(path) {
  const relativePath = path === "/" ? "" : String(path).replace(/^\/+/, "");
  return new URL(relativePath, SITE_BASE_URL).href;
}

/**
 * 路由切换时更新页面元数据、回到顶部并把焦点移入主要内容。
 * @param {Object} props - 页面元数据。
 * @param {string} props.title - 页面标题。
 * @param {string} [props.description] - 页面摘要；未提供时使用全站默认摘要。
 * @param {string} [props.canonicalPath] - canonical 路径；未提供时使用当前 pathname。
 * @returns {null} 无可见节点。
 */
export function PageMeta({
  title,
  description = DEFAULT_DESCRIPTION,
  canonicalPath,
}) {
  const location = useLocation();
  const resolvedCanonicalPath = canonicalPath ?? location.pathname;

  useEffect(() => {
    const fullTitle = `${title} | LINGNAN EDITIONS`;
    const canonicalUrl = resolveCanonicalUrl(resolvedCanonicalPath);
    document.title = fullTitle;
    updateMetaContent('meta[name="description"]', description);
    updateMetaContent('meta[property="og:title"]', fullTitle);
    updateMetaContent('meta[property="og:description"]', description);
    updateMetaContent('meta[property="og:url"]', canonicalUrl);
    document
      .querySelector('link[rel="canonical"]')
      ?.setAttribute("href", canonicalUrl);
  }, [description, resolvedCanonicalPath, title]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    const main = document.getElementById("page-content");
    main?.setAttribute("tabindex", "-1");
    main?.focus({ preventScroll: true });
  }, [location.pathname]);

  return null;
}
