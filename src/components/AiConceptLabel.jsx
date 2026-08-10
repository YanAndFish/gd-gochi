/** 允许在顾客界面显示 AI 概念说明的媒体角色。 */
const VISIBLE_AI_ROLES = new Set([
  "editorial-ai",
  "installation",
  "story",
  "process",
]);

/**
 * 为生成式编辑和品牌叙事场景提供统一且可见的顾客说明。
 * @param {Object} props - 组件参数。
 * @param {{aiConcept?: boolean, role?: string} | null | undefined} props.media - 媒体定义。
 * @param {string} [props.className] - 附加样式类名。
 * @returns {import("react").ReactElement | null} AI 概念影像标记。
 */
export function AiConceptLabel({ media, className = "" }) {
  if (!media?.aiConcept || !VISIBLE_AI_ROLES.has(media.role ?? "")) {
    return null;
  }

  return (
    <span className={`media-concept-label ${className}`.trim()}>
      品牌 AI 概念影像
    </span>
  );
}
