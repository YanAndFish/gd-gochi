/**
 * 品牌故事媒体的响应式资源。
 * @typedef {Object} MaisonMediaSources
 * @property {string} smallAssetKey - 960 像素宽资源的 public 相对键。
 * @property {string} largeAssetKey - 1920 像素宽资源的 public 相对键。
 * @property {string | null} mobileAssetKey - 可选的移动端专用构图资源键。
 */

/**
 * 品牌故事媒体。
 * @typedef {Object} MaisonMedia
 * @property {string} id - 页面内部使用的稳定媒体标识。
 * @property {"story" | "process"} role - 媒体在品牌叙事中的角色。
 * @property {boolean} aiConcept - 是否属于品牌 AI 概念影像。
 * @property {string} alt - 图片替代文本。
 * @property {string} caption - 顾客可见的图片说明。
 * @property {number} width - 大图资源宽度。
 * @property {number} height - 大图资源高度。
 * @property {number | null} mobileWidth - 移动端专用资源宽度。
 * @property {number | null} mobileHeight - 移动端专用资源高度。
 * @property {MaisonMediaSources} sources - 响应式资源键集合。
 */

/**
 * 品牌故事章节。
 * @typedef {Object} MaisonChapter
 * @property {string} id - 章节锚点标识。
 * @property {string} index - 顾客可见的章节序号。
 * @property {string} labelZh - 中文章节短名。
 * @property {string} labelEn - 英文章节短名。
 * @property {string} title - 章节主标题。
 * @property {string} body - 章节正文。
 */

/** 品牌故事页使用的专用媒体。 @type {Readonly<Record<string, MaisonMedia>>} */
export const MAISON_MEDIA = Object.freeze({
  hero: {
    id: "maison-hero",
    role: "story",
    aiConcept: true,
    alt: "一道暖光照亮黑色建筑空间中的岭南朱粤凳 01",
    caption: "朱色礼拜 · 品牌 AI 概念影像",
    width: 1920,
    height: 1080,
    mobileWidth: 960,
    mobileHeight: 1280,
    sources: {
      smallAssetKey: "assets/brand/maison/hero-dark-960.webp",
      largeAssetKey: "assets/brand/maison/hero-dark-1920.webp",
      mobileAssetKey: "assets/brand/maison/hero-dark-mobile-960.webp",
    },
  },
  history: {
    id: "maison-history-memory",
    role: "story",
    aiConcept: true,
    alt: "手在深色桌面翻检骑楼拱影、门廊与日常矮凳轮廓的匿名视觉资料",
    caption: "无名之形的前史",
    width: 1920,
    height: 1280,
    mobileWidth: null,
    mobileHeight: null,
    sources: {
      smallAssetKey: "assets/brand/maison/history-memory-v2-960.webp",
      largeAssetKey: "assets/brand/maison/history-memory-v2-1920.webp",
      mobileAssetKey: null,
    },
  },
  sketchForm: {
    id: "maison-sketch-form",
    role: "story",
    aiConcept: true,
    alt: "深色桌面铺满十余张被划去、揉皱与保留的粤凳轮廓迭代草图",
    caption: "反复取舍",
    width: 1920,
    height: 1280,
    mobileWidth: null,
    mobileHeight: null,
    sources: {
      smallAssetKey: "assets/brand/maison/sketch-iterations-v2-960.webp",
      largeAssetKey: "assets/brand/maison/sketch-iterations-v2-1920.webp",
      mobileAssetKey: null,
    },
  },
  sketchDetail: {
    id: "maison-sketch-detail",
    role: "story",
    aiConcept: true,
    alt: "手掀起多层错位描图纸，底层杂乱轮廓逐步收敛为清楚的粤凳方案",
    caption: "结构校正 · 逐层收敛",
    width: 1920,
    height: 1280,
    mobileWidth: null,
    mobileHeight: null,
    sources: {
      smallAssetKey: "assets/brand/maison/sketch-progression-v2-960.webp",
      largeAssetKey: "assets/brand/maison/sketch-progression-v2-1920.webp",
      mobileAssetKey: null,
    },
  },
  observe: {
    id: "maison-process-observe",
    role: "process",
    aiConcept: true,
    alt: "设计者在岭南街巷与骑楼光影之间观察日常矮凳和拱形轮廓",
    caption: "观察 · 品牌 AI 概念影像",
    width: 1920,
    height: 1280,
    mobileWidth: null,
    mobileHeight: null,
    sources: {
      smallAssetKey: "assets/brand/maison/process-observe-v2-960.webp",
      largeAssetKey: "assets/brand/maison/process-observe-v2-1920.webp",
      mobileAssetKey: null,
    },
  },
  trace: {
    id: "maison-process-trace",
    role: "process",
    aiConcept: true,
    alt: "设计者从自身视角描画正面朝向自己的粤凳拱口与前脚轮廓",
    caption: "取形 · 朝向设计者的稿面",
    width: 1920,
    height: 1280,
    mobileWidth: null,
    mobileHeight: null,
    sources: {
      smallAssetKey: "assets/brand/maison/process-trace-v2-960.webp",
      largeAssetKey: "assets/brand/maison/process-trace-v2-1920.webp",
      mobileAssetKey: null,
    },
  },
  inspect: {
    id: "maison-process-inspect",
    role: "process",
    aiConcept: true,
    alt: "双手用细砂纸沿哑光凳形原型的拱口边缘缓慢打磨",
    caption: "清稿 · 反复打磨",
    width: 1920,
    height: 1280,
    mobileWidth: null,
    mobileHeight: null,
    sources: {
      smallAssetKey: "assets/brand/maison/process-refine-v2-960.webp",
      largeAssetKey: "assets/brand/maison/process-refine-v2-1920.webp",
      mobileAssetKey: null,
    },
  },
  colour: {
    id: "maison-process-colour",
    role: "process",
    aiConcept: true,
    alt: "手持朱色样卡在光影之间观察岭南朱粤凳表面",
    caption: "定色 · 品牌 AI 概念影像",
    width: 1920,
    height: 1280,
    mobileWidth: null,
    mobileHeight: null,
    sources: {
      smallAssetKey: "assets/brand/maison/process-colour-960.webp",
      largeAssetKey: "assets/brand/maison/process-colour-1920.webp",
      mobileAssetKey: null,
    },
  },
  number: {
    id: "maison-process-number",
    role: "process",
    aiConcept: true,
    alt: "双手为岭南朱粤凳整理无文字的档案标记",
    caption: "编号 · 品牌 AI 概念影像",
    width: 1920,
    height: 1280,
    mobileWidth: null,
    mobileHeight: null,
    sources: {
      smallAssetKey: "assets/brand/maison/process-number-960.webp",
      largeAssetKey: "assets/brand/maison/process-number-1920.webp",
      mobileAssetKey: null,
    },
  },
  redLight: {
    id: "maison-red-light",
    role: "story",
    aiConcept: true,
    alt: "岭南朱粤凳在暖白建筑光线中进入当代室内",
    caption: "岭南朱与室内硬光",
    width: 1920,
    height: 1080,
    mobileWidth: null,
    mobileHeight: null,
    sources: {
      smallAssetKey: "assets/brand/maison/red-light-960.webp",
      largeAssetKey: "assets/brand/maison/red-light-1920.webp",
      mobileAssetKey: null,
    },
  },
});

/** 品牌故事章节与章节轨道。 @type {ReadonlyArray<MaisonChapter>} */
export const MAISON_CHAPTERS = Object.freeze([
  {
    id: "credo",
    index: "01",
    labelZh: "信条",
    labelEn: "CREDO",
    title: "我们编辑记忆",
    body:
      "真正持久的形，往往早已在生活里被反复验证。我们不发明遥远的传奇；我们回到街巷、饭桌与门廊，从共同记忆中取出轮廓，让它们在当代重新被看见。",
  },
  {
    id: "observe",
    index: "02",
    labelZh: "观察",
    labelEn: "OBSERVE",
    title: "从街巷到案内",
    body:
      "观察不是复制。我们走进街巷，记录骑楼门洞与矮凳开口如何让光穿过，也记录一件日常器物如何回应身体与空间。带回案内的不是某个物件，而是一组被反复验证的比例与动作。",
  },
  {
    id: "abstract",
    index: "03",
    labelZh: "取形",
    labelEn: "ABSTRACT",
    title: "一条线留下之前",
    body:
      "留下的线必须有理由。许多失衡的比例先在纸上被划去、覆盖、重来；草图反复删去姿态，只保留与动作、辨识和空间有关的部分。",
  },
  {
    id: "refine",
    index: "04",
    labelZh: "清稿",
    labelEn: "REFINE",
    title: "形的经文",
    body:
      "轮廓先在模型上被校正。细砂沿拱口缓慢往复，细节被放大，光沿着转折移动。每一次停手与退后观看，都是为了让器物更接近它原本的清楚。",
  },
  {
    id: "colour",
    index: "05",
    labelZh: "定色",
    labelEn: "COLOUR",
    title: "朱色礼拜",
    body:
      "瓷象牙是室内缓慢移动的光；骑楼灰是雨后沉静的阴影；岭南朱来自街巷、排档与家宴的共同视觉记忆。",
  },
  {
    id: "number",
    index: "06",
    labelZh: "编号",
    labelEn: "NUMBER",
    title: "让物件被妥善记录",
    body:
      "编号不是稀缺的宣言，而是一种观看方式：让每件作品进入清晰的序列，也让变化被妥善记录。",
  },
]);

/** 品牌故事尾声固定使用的真实目录变体。 */
export const MAISON_ARCHIVE_VARIANT_IDS = Object.freeze([
  "stool-red",
  "clay-pot-01-sand-brown",
  "flip-flop-blue-white",
  "floral-flask-red",
]);
