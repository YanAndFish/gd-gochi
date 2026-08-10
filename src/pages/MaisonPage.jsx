import { ArrowRight } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getVariant, publicAssetUrl } from "../catalog.js";
import { PageMeta } from "../components/PageMeta.jsx";
import {
  MAISON_ARCHIVE_VARIANT_IDS,
  MAISON_CHAPTERS,
  MAISON_MEDIA,
} from "../maison-content.js";

/** 品牌故事页摘要，同时用于搜索引擎与开放图谱元数据。 */
const MAISON_DESCRIPTION =
  "岭南辑造从街巷日常中观察轮廓，以描摹、校正、对色、检视与编号，编辑属于当代的岭南记忆。";

/**
 * 品牌故事媒体组件参数。
 * @typedef {Object} MaisonFigureProps
 * @property {import("../maison-content.js").MaisonMedia} media - 品牌故事媒体定义。
 * @property {string} [className] - 追加到 figure 的样式类。
 * @property {string} [sizes] - 浏览器选择响应式资源时使用的尺寸提示。
 * @property {boolean} [priority] - 是否作为首屏高优先级图片加载。
 * @property {boolean} [showCaption] - 是否显示描述性图片说明。
 */

/**
 * 输出带真实尺寸与响应式源的品牌故事图片。
 * @param {MaisonFigureProps} props - 图片渲染参数。
 * @returns {import("react").ReactElement} 响应式品牌故事图片。
 */
function MaisonFigure({
  media,
  className = "",
  sizes = "(max-width: 760px) 100vw, 76vw",
  priority = false,
  showCaption = true,
}) {
  const smallSrc = publicAssetUrl(media.sources.smallAssetKey);
  const largeSrc = publicAssetUrl(media.sources.largeAssetKey);
  const mobileSrc = media.sources.mobileAssetKey
    ? publicAssetUrl(media.sources.mobileAssetKey)
    : null;

  return (
    <figure className={`maison-figure ${className}`.trim()}>
      <picture>
        {mobileSrc ? (
          <source media="(max-width: 760px)" srcSet={mobileSrc} />
        ) : null}
        <img
          src={smallSrc}
          srcSet={`${smallSrc} 960w, ${largeSrc} 1920w`}
          sizes={sizes}
          width={media.width}
          height={media.height}
          alt={media.alt}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          fetchPriority={priority ? "high" : "auto"}
        />
      </picture>
      {showCaption ? <figcaption>{media.caption}</figcaption> : null}
    </figure>
  );
}

/**
 * 输出移动端与流程行共用的章节序号。
 * @param {{chapter: import("../maison-content.js").MaisonChapter}} props - 章节定义。
 * @returns {import("react").ReactElement} 章节序号和双语短名。
 */
function MaisonChapterMark({ chapter }) {
  return (
    <div className="maison-chapter-mark" aria-hidden="true">
      <span>{chapter.index}</span>
      <strong>{chapter.labelZh}</strong>
      <small>{chapter.labelEn}</small>
    </div>
  );
}

/**
 * 品牌页中的横向辑造步骤。
 * @param {Object} props - 流程行参数。
 * @param {import("../maison-content.js").MaisonChapter} props.chapter - 章节定义。
 * @param {import("../maison-content.js").MaisonMedia} props.media - 对应概念影像。
 * @param {"dark" | "light"} props.tone - 行背景色调。
 * @returns {import("react").ReactElement} 单个辑造步骤。
 */
function MaisonProcessRow({ chapter, media, tone }) {
  return (
    <section
      id={chapter.id}
      className={`maison-chapter maison-process-row is-${tone}`}
      data-chapter-id={chapter.id}
      data-reveal
      aria-labelledby={`${chapter.id}-title`}
    >
      <MaisonChapterMark chapter={chapter} />
      <MaisonFigure media={media} showCaption={false} />
      <div className="maison-process-copy">
        <p className="maison-step-kicker">{chapter.labelEn}</p>
        <h2 id={`${chapter.id}-title`}>{chapter.title}</h2>
        <p>{chapter.body}</p>
      </div>
    </section>
  );
}

/**
 * 岭南辑造品牌故事页。
 * @returns {import("react").ReactElement} 历史序章与六章品牌叙事页面。
 */
export function MaisonPage() {
  const pageRef = useRef(null);
  const [activeChapterId, setActiveChapterId] = useState(
    MAISON_CHAPTERS[0].id,
  );
  const archiveVariants = useMemo(
    () =>
      MAISON_ARCHIVE_VARIANT_IDS.map((variantId) => getVariant(variantId)).filter(
        Boolean,
      ),
    [],
  );

  useEffect(() => {
    const page = pageRef.current;
    if (!page) {
      return undefined;
    }

    const revealTargets = [...page.querySelectorAll("[data-reveal]")];
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let revealObserver = null;
    if (reducedMotion || !("IntersectionObserver" in window)) {
      revealTargets.forEach((element) => element.classList.add("is-visible"));
      page.classList.add("is-reveal-ready");
    } else {
      revealTargets.forEach((element) => {
        if (element.getBoundingClientRect().top < window.innerHeight * 0.95) {
          element.classList.add("is-visible");
        }
      });
      page.classList.add("is-reveal-ready");

      revealObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px -10%", threshold: 0.08 },
      );
      revealTargets.forEach((element) => {
        if (!element.classList.contains("is-visible")) {
          revealObserver.observe(element);
        }
      });
    }

    if (!("IntersectionObserver" in window)) {
      return undefined;
    }

    const chapterElements = [...page.querySelectorAll("[data-chapter-id]")];
    let chapterUpdateFrame = 0;

    /**
     * 以视口 32% 的阅读线解析当前章节；进入档案尾声时延续最后一章状态。
     * @returns {void}
     */
    const updateActiveChapter = () => {
      const readingLine = window.innerHeight * 0.32;
      const currentChapter =
        chapterElements.find((element) => {
          const bounds = element.getBoundingClientRect();
          return bounds.top <= readingLine && bounds.bottom > readingLine;
        }) ??
        [...chapterElements]
          .reverse()
          .find(
            (element) => element.getBoundingClientRect().top <= readingLine,
          );
      const resolvedChapter = currentChapter ?? chapterElements[0];
      if (resolvedChapter?.dataset.chapterId) {
        setActiveChapterId(resolvedChapter.dataset.chapterId);
      }
    };

    /**
     * 将连续滚动与尺寸变化合并到下一帧，避免重复读取章节几何信息。
     * @returns {void}
     */
    const scheduleChapterUpdate = () => {
      if (chapterUpdateFrame) {
        return;
      }
      chapterUpdateFrame = window.requestAnimationFrame(() => {
        chapterUpdateFrame = 0;
        updateActiveChapter();
      });
    };

    const chapterObserver = new IntersectionObserver(
      scheduleChapterUpdate,
      {
        rootMargin: "-31% 0px -68%",
        threshold: 0,
      },
    );
    chapterElements.forEach((element) => chapterObserver.observe(element));
    window.addEventListener("scroll", scheduleChapterUpdate, { passive: true });
    window.addEventListener("resize", scheduleChapterUpdate);
    updateActiveChapter();

    return () => {
      revealObserver?.disconnect();
      chapterObserver.disconnect();
      window.removeEventListener("scroll", scheduleChapterUpdate);
      window.removeEventListener("resize", scheduleChapterUpdate);
      if (chapterUpdateFrame) {
        window.cancelAnimationFrame(chapterUpdateFrame);
      }
    };
  }, []);

  const credo = MAISON_CHAPTERS[0];
  const observe = MAISON_CHAPTERS[1];
  const abstract = MAISON_CHAPTERS[2];
  const refine = MAISON_CHAPTERS[3];
  const colour = MAISON_CHAPTERS[4];
  const number = MAISON_CHAPTERS[5];

  return (
    <>
      <PageMeta
        title="品牌故事"
        description={MAISON_DESCRIPTION}
        canonicalPath="/maison"
      />
      <article className="maison-page" ref={pageRef}>
        <aside className="maison-rail" aria-label="品牌故事章节">
          <div className="maison-rail-heading">
            <span>章序</span>
            <small>CHAPTERS</small>
          </div>
          <ol>
            {MAISON_CHAPTERS.map((chapter) => (
              <li key={chapter.id}>
                <a
                  href={`#${chapter.id}`}
                  onClick={() => setActiveChapterId(chapter.id)}
                  aria-current={
                    activeChapterId === chapter.id ? "location" : undefined
                  }
                >
                  <span>{chapter.index}</span>
                  <strong>{chapter.labelZh}</strong>
                  <small>{chapter.labelEn}</small>
                </a>
              </li>
            ))}
          </ol>
          <p className="maison-rail-progress" aria-hidden="true">
            {String(
              MAISON_CHAPTERS.findIndex(
                (chapter) => chapter.id === activeChapterId,
              ) + 1,
            ).padStart(3, "0")}
            <span>/</span>
            {String(MAISON_CHAPTERS.length).padStart(3, "0")}
          </p>
        </aside>

        <div className="maison-storyline">
          <header className="maison-hero" data-reveal>
            <MaisonFigure
              media={MAISON_MEDIA.hero}
              className="maison-hero-figure"
              sizes="(max-width: 760px) 100vw, calc(100vw - 112px)"
              priority
              showCaption={false}
            />
            <div className="maison-hero-brand" aria-hidden="true">
              <span>LINGNAN EDITIONS</span>
              <small>岭 南 辑 造</small>
            </div>
            <div className="maison-hero-copy">
              <p className="maison-hero-index">THE MAISON · VOL. 01</p>
              <h1>朱色礼拜</h1>
              <p className="maison-hero-en">A RED<br />HELD IN MEMORY.</p>
              <p className="maison-hero-deck">日常之物，登堂入室。</p>
            </div>
          </header>

          <section
            className="maison-prologue"
            data-reveal
            aria-labelledby="maison-prologue-title"
          >
            <MaisonFigure
              media={MAISON_MEDIA.history}
              sizes="(max-width: 760px) 100vw, 58vw"
              showCaption={false}
            />
            <div className="maison-prologue-copy">
              <p className="maison-prologue-index">前史 · BEFORE THE OBJECT</p>
              <h2 id="maison-prologue-title">
                在成为设计以前，<br />它先属于生活。
              </h2>
              <p className="maison-prologue-lead">
                一张矮凳没有署名。它在骑楼檐下接住短暂的歇脚，在饭桌边补上临时的一席，也在夜深收摊时一层层叠起。
              </p>
              <p>
                这些动作没有写进史册，却把轮廓留在共同日常里。岭南辑造不替它发明年代，也不把共同记忆归给某一个人；我们只从反复使用留下的弧线、孔洞与比例出发，让无名之形进入今天。
              </p>
            </div>
          </section>

          <section
            id={credo.id}
            className="maison-chapter maison-credo"
            data-chapter-id={credo.id}
            data-reveal
            aria-labelledby="credo-title"
          >
            <MaisonChapterMark chapter={credo} />
            <div className="maison-credo-copy">
              <p className="maison-signature">LINGNAN EDITIONS<br />岭南辑造</p>
              <h2 id="credo-title">熟悉的轮廓，<br />在当代生活中重新成形。</h2>
              <p>{credo.body}</p>
            </div>
            <MaisonFigure
              media={MAISON_MEDIA.redLight}
              className="maison-credo-light"
              sizes="(max-width: 760px) 100vw, 38vw"
              showCaption={false}
            />
          </section>

          <MaisonProcessRow
            chapter={observe}
            media={MAISON_MEDIA.observe}
            tone="dark"
          />

          <section
            id={abstract.id}
            className="maison-chapter maison-sketch-chapter"
            data-chapter-id={abstract.id}
            data-reveal
            aria-labelledby="abstract-title"
          >
            <div className="maison-sketch-heading">
              <MaisonChapterMark chapter={abstract} />
              <div>
                <p className="maison-step-kicker">FORM STUDY</p>
                <h2 id="abstract-title">{abstract.title}</h2>
                <p>{abstract.body}</p>
              </div>
            </div>
            <div className="maison-sketch-grid">
              <MaisonFigure media={MAISON_MEDIA.sketchForm} showCaption={false} />
              <MaisonFigure media={MAISON_MEDIA.sketchDetail} showCaption={false} />
            </div>
            <div className="maison-sketch-caption">
              <p>从街巷到案内，<br />从日常到永恒。</p>
            </div>
            <div className="maison-trace-panel">
              <MaisonFigure media={MAISON_MEDIA.trace} showCaption={false} />
              <blockquote>线不是装饰，<br />而是取舍留下的证据。</blockquote>
            </div>
          </section>

          <MaisonProcessRow
            chapter={refine}
            media={MAISON_MEDIA.inspect}
            tone="dark"
          />
          <MaisonProcessRow
            chapter={colour}
            media={MAISON_MEDIA.colour}
            tone="light"
          />
          <MaisonProcessRow
            chapter={number}
            media={MAISON_MEDIA.number}
            tone="dark"
          />

          <blockquote className="maison-quote" data-reveal>
            <span aria-hidden="true">“</span>
            被反复使用的形，<br />终会成为共同记忆。
            <span aria-hidden="true">”</span>
          </blockquote>

          <section
            className="maison-archive"
            data-reveal
            aria-labelledby="maison-archive-title"
          >
            <div className="maison-archive-seal">
              <img
                src={publicAssetUrl("assets/brand/lingnan-editions-mark.png")}
                alt=""
                aria-hidden="true"
              />
              <p>岭南之物<br />日常之形<br />当代之美</p>
            </div>
            <div className="maison-archive-grid">
              {archiveVariants.map((variant) => (
                <Link
                  key={variant.id}
                  to={`/products/${variant.slug}?variant=${variant.id}`}
                  aria-label={`查看作品 ${variant.nameZh}`}
                >
                  <img
                    src={variant.media.hero.src}
                    width={variant.media.hero.width}
                    height={variant.media.hero.height}
                    loading="lazy"
                    decoding="async"
                    alt={variant.media.hero.alt}
                  />
                  <span>{variant.nameZh.split(" · ")[0]}</span>
                </Link>
              ))}
            </div>
            <div className="maison-archive-cta">
              <p className="maison-step-kicker">ARCHIVE</p>
              <h2 id="maison-archive-title">作品档案</h2>
              <Link to="/products">
                进入作品档案 <ArrowRight size={16} />
              </Link>
            </div>
          </section>
        </div>
      </article>
    </>
  );
}
