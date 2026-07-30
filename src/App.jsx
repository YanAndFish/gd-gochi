import {
  ArrowLeft,
  ArrowRight,
  Check,
  Handbag,
  List,
  MagnifyingGlass,
  MapPin,
  Minus,
  Package,
  Plus,
  SealCheck,
  UserCircle,
  X,
} from "@phosphor-icons/react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  HOME_MERCHANDISING,
  MEMBERSHIP_FEE_CENTS,
  PRODUCTS,
  PRODUCT_SERIES,
  formatCny,
  getProduct,
  getProductsForSeries,
  getSeries,
  getSeriesBySlug,
  getVariant,
  getVariantsForProduct,
  publicAssetUrl,
  resolveProductRoute,
} from "./catalog.js";
import {
  getTierLabel,
  getTierProgress,
  isMembershipActive,
} from "./commerce-rules.js";
import {
  DEMO_DELIVERY,
  commerceDb,
  reconcileShipment,
} from "./db.js";
import {
  createIdempotencyKey,
  useCommerce,
} from "./CommerceProvider.jsx";

/** 全站支付方式。 */
const PAYMENT_METHODS = Object.freeze([
  {
    id: "concierge",
    name: "岭南礼宾账户",
    note: "由本地礼宾演示账户完成确认",
  },
  {
    id: "unionpay",
    name: "虚拟银联",
    note: "仅模拟银联支付结果，不要求卡号",
  },
]);

/**
 * 把业务错误映射为不泄露高阶商品资格的公开文案。
 * @param {unknown} error - 捕获到的错误。
 * @returns {string} 面向用户的错误文案。
 */
function getPublicErrorMessage(error) {
  if (error?.code === "UNAVAILABLE") {
    return "暂时缺货";
  }
  if (error?.code === "MEMBERSHIP_REQUIRED") {
    return "请先开通有效会籍再选购常设作品。";
  }
  if (error?.code === "CART_CHANGED") {
    return "购物袋已在其他页面更新，请重新确认订单。";
  }
  if (error?.code === "EMPTY_CART") {
    return "购物袋目前为空。";
  }
  if (error?.code === "STORAGE_UNAVAILABLE") {
    return "当前浏览器无法保存你的作品档案，入会与结账暂不可用。";
  }
  return "当前体验暂时无法完成，请稍后再试。";
}

/**
 * 格式化中文日期。
 * @param {string | null | undefined} value - UTC ISO 时间。
 * @param {boolean} [includeTime] - 是否包含时间。
 * @returns {string} 中文日期。
 */
function formatDate(value, includeTime = false) {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...(includeTime
      ? { hour: "2-digit", minute: "2-digit", second: "2-digit" }
      : {}),
  }).format(new Date(value));
}

/**
 * 返回商品在总览中使用的价格文案。
 * @param {import("./catalog.js").ProductDefinition} product - 商品定义。
 * @returns {string} 单价或价格区间。
 */
function formatProductPrice(product) {
  if (product.minPriceCents === product.maxPriceCents) {
    return formatCny(product.minPriceCents);
  }
  return `${formatCny(product.minPriceCents)} 起`;
}

/**
 * 从订单快照解析兼容本地与 GitHub Pages 子路径的图片地址。
 * @param {{image?: string, imageAsset?: string}} item - 新旧订单商品快照。
 * @returns {string} 可直接渲染的图片地址。
 */
function resolveOrderItemImage(item) {
  return item.imageAsset ? publicAssetUrl(item.imageAsset) : (item.image ?? "");
}

/**
 * 计算购物袋行在当前整袋数量下的公开可售状态。
 * @param {Object} item - 已与目录合并的购物袋行。
 * @param {Object[]} cartItems - 当前购物袋全部商品行。
 * @param {(variantId: string, options?: Object) => Object} getAvailability - 统一资格判断入口。
 * @param {number} [requestedQuantity] - 准备校验的新数量。
 * @returns {Object} 面向顾客的可售状态。
 */
function getCartItemAvailability(
  item,
  cartItems,
  getAvailability,
  requestedQuantity = item.quantity,
) {
  if (item.unavailable) {
    return { state: "sold_out", label: "暂时缺货", eligible: false };
  }
  const productScoped =
    item.variant.purchasePolicy?.lifetimeLimit?.scope === "product";
  const scopeOrderQuantity = productScoped
    ? cartItems.reduce(
        (sum, candidate) =>
          candidate.variant.productId === item.variant.productId
            ? sum +
              (candidate.variantId === item.variantId
                ? requestedQuantity
                : candidate.quantity)
            : sum,
        0,
      )
    : requestedQuantity;
  return getAvailability(item.variant.id, {
    requestedQuantity,
    scopeOrderQuantity,
  });
}

/**
 * 为演示动画等待一小段时间；系统要求减少动态效果时显著缩短等待。
 * @param {number} milliseconds - 常规动画等待毫秒数。
 * @returns {Promise<void>} 等待完成。
 */
function waitForPresentation(milliseconds) {
  const reduceMotion = globalThis.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  return new Promise((resolve) =>
    globalThis.setTimeout(resolve, reduceMotion ? 30 : milliseconds),
  );
}

/**
 * 为生成式编辑场景提供统一且可见的顾客说明。
 * @param {{media: import("./catalog.js").CatalogMedia, className?: string}} props - 媒体与附加样式。
 * @returns {import("react").ReactElement | null} AI 概念影像标记。
 */
function AiConceptLabel({ media, className = "" }) {
  if (
    !media?.aiConcept ||
    (media.role !== "editorial-ai" && media.role !== "installation")
  ) {
    return null;
  }
  return (
    <span className={`media-concept-label ${className}`.trim()}>
      品牌 AI 概念影像
    </span>
  );
}

/**
 * 路由切换时回到页面顶部并更新页面标题。
 * @param {string} title - 当前页面标题。
 * @returns {null} 无可见节点。
 */
function PageMeta({ title }) {
  const location = useLocation();
  useEffect(() => {
    document.title = `${title} | LINGNAN EDITIONS`;
  }, [title]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    const main = document.getElementById("page-content");
    main?.setAttribute("tabindex", "-1");
    main?.focus({ preventScroll: true });
  }, [location.pathname]);
  return null;
}

/**
 * 全站顶栏与页脚。
 * @param {{children: import("react").ReactNode}} props - 页面内容。
 * @returns {import("react").ReactElement} 网站框架。
 */
function SiteLayout({ children }) {
  const { cartCount, membership, storageError } = useCommerce();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const limitedVariant = getVariant(HOME_MERCHANDISING.hero.variantId);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  const searchResults = useMemo(() => {
    const normalized = searchQuery.trim().toLocaleLowerCase();
    if (!normalized) {
      return PRODUCTS.slice(0, 4);
    }
    return PRODUCTS.filter((product) => {
      const series = getSeries(product.seriesId);
      const searchableText = [
        product.nameZh,
        product.nameEn,
        product.summary,
        ...product.searchTerms,
        series?.nameZh,
        series?.nameEn,
        ...product.variants.flatMap((variant) => [
          variant.nameZh,
          variant.nameEn,
          variant.option.label,
          variant.description,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();
      return searchableText.includes(normalized);
    });
  }, [searchQuery]);

  return (
    <div className="site-shell">
      <a className="skip-link" href="#page-content">
        跳至主要内容
      </a>
      <header className="site-header">
        <div className="header-inner">
          <button
            className="icon-button mobile-only"
            type="button"
            aria-label={menuOpen ? "关闭导航" : "打开导航"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? <X size={22} /> : <List size={22} />}
          </button>
          <nav className={`primary-nav ${menuOpen ? "is-open" : ""}`} aria-label="主要导航">
            <NavLink to="/products">精品系列</NavLink>
            <NavLink
              to={`/products/${limitedVariant.slug}?variant=${limitedVariant.id}`}
            >
              2026 限定
            </NavLink>
            <NavLink to="/#maison">品牌故事</NavLink>
          </nav>
          <Link className="wordmark" to="/" aria-label="岭南辑造首页">
            <img
              className="brand-mark brand-mark-header"
              src={publicAssetUrl("assets/brand/lingnan-editions-mark.png")}
              alt=""
              aria-hidden="true"
            />
            <span className="wordmark-type">
              <span className="wordmark-name">LINGNAN</span>
              <small>EDITIONS</small>
            </span>
          </Link>
          <div className="header-actions">
            <button
              className="icon-button"
              type="button"
              aria-label="搜索作品"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((value) => !value)}
            >
              <MagnifyingGlass size={20} />
            </button>
            <Link
              className="icon-button"
              to="/membership"
              aria-label={`会员中心，当前为${getTierLabel(membership?.tier ?? "none").zh}`}
            >
              <UserCircle size={21} />
            </Link>
            <Link
              className="icon-button bag-link"
              to="/bag"
              aria-label={`购物袋，共 ${cartCount} 件`}
            >
              <Handbag size={20} />
              {cartCount > 0 ? <span aria-hidden="true">{cartCount}</span> : null}
            </Link>
          </div>
        </div>
        {searchOpen ? (
          <div className="search-panel" role="search">
            <label htmlFor="site-search">搜索岭南辑造作品</label>
            <div className="search-input-wrap">
              <MagnifyingGlass size={18} aria-hidden="true" />
              <input
                id="site-search"
                autoFocus
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="输入颜色、系列或作品名称"
              />
              <button
                type="button"
                aria-label="关闭搜索"
                onClick={() => setSearchOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="search-results" aria-live="polite">
              {searchResults.length ? (
                searchResults.map((product) => (
                  <Link
                    key={product.id}
                    to={`/products/${product.slug}`}
                  >
                    <img src={product.heroImage} alt="" />
                    <span>
                      {product.nameZh}
                      <small>{formatProductPrice(product)}</small>
                    </span>
                  </Link>
                ))
              ) : (
                <p>没有找到相符作品。</p>
              )}
            </div>
          </div>
        ) : null}
      </header>
      {storageError ? (
        <div className="storage-alert" role="alert">
          {storageError}
        </div>
      ) : null}
      <main id="page-content">{children}</main>
      <footer className="site-footer">
        <div>
          <Link className="footer-wordmark" to="/">
            <img
              className="brand-mark footer-brand-mark"
              src={publicAssetUrl("assets/brand/lingnan-editions-mark.png")}
              alt=""
              aria-hidden="true"
            />
            <span>LINGNAN EDITIONS</span>
          </Link>
          <p>岭南为源，辑造当代。</p>
          <p className="serif">ROOTED IN LINGNAN. EDITED FOR THE PRESENT.</p>
        </div>
        <div className="footer-links">
          <Link to="/products">全部商品</Link>
          <Link to="/membership">会员制度</Link>
          <Link to="/orders">订单档案</Link>
          <Link to="/bag">购物袋</Link>
        </div>
        <p className="footer-note">
          本页为岭南辑造概念体验。订单与礼宾配送仅作展示，
          不构成真实交易或履约。
        </p>
      </footer>
    </div>
  );
}

/**
 * 首页商品卡片。
 * @param {{variant: import("./catalog.js").ProductVariant, editorial?: boolean}} props - 卡片参数。
 * @returns {import("react").ReactElement} 商品卡片。
 */
function ProductCard({ variant, editorial = false }) {
  const { getAvailability } = useCommerce();
  const availability = getAvailability(variant.id);
  return (
    <article className={`product-card ${editorial ? "product-card-editorial" : ""}`}>
      <Link
        className="product-card-image"
        to={`/products/${variant.slug}?variant=${variant.id}`}
      >
        <img src={variant.heroImage} alt={`${variant.nameZh}影棚展示`} />
        <AiConceptLabel media={variant.media.hero} />
        <span className="product-card-action" aria-hidden="true">
          查看作品 <ArrowRight size={14} />
        </span>
      </Link>
      <div className="product-card-copy">
        <p className="eyebrow">{variant.editionNote}</p>
        <h3>{variant.nameZh}</h3>
        <p className="product-name-en">{variant.nameEn}</p>
        <div className="product-card-meta">
          <span>{formatCny(variant.priceCents)}</span>
          <span className={availability.state === "available" ? "" : "muted"}>
            {availability.state === "available" ? "可供选购" : availability.label}
          </span>
        </div>
      </div>
    </article>
  );
}

/**
 * 商品总览与系列页使用的独立商品卡片。
 * @param {{product: import("./catalog.js").ProductDefinition}} props - 商品卡片参数。
 * @returns {import("react").ReactElement} 商品总览卡片。
 */
function CatalogProductCard({ product }) {
  const { getAvailability } = useCommerce();
  const variant =
    getVariant(product.defaultVariantId) ?? product.variants[0];
  const availability = getAvailability(variant.id);
  return (
    <article className="product-card catalog-product-card">
      <Link
        className="product-card-image"
        to={`/products/${product.slug}`}
        aria-label={`查看${product.nameZh}`}
      >
        <img src={variant.media.hero.src} alt={variant.media.hero.alt} />
        <AiConceptLabel media={variant.media.hero} />
        <span className="product-card-action" aria-hidden="true">
          查看作品 <ArrowRight size={14} />
        </span>
      </Link>
      <div className="product-card-copy">
        <p className="eyebrow">{variant.editionNote}</p>
        <h3>{product.nameZh}</h3>
        <p className="product-name-en">{product.nameEn}</p>
        <p className="catalog-product-summary">{product.summary}</p>
        <div className="product-card-meta">
          <span>{formatProductPrice(product)}</span>
          <span className={availability.state === "available" ? "" : "muted"}>
            {availability.state === "available" ? "可供选购" : availability.label}
          </span>
        </div>
      </div>
    </article>
  );
}

/**
 * 品牌首页。
 * @returns {import("react").ReactElement} 首页。
 */
function HomePage() {
  const { getAvailability } = useCommerce();
  const featured = getVariant(HOME_MERCHANDISING.hero.variantId);
  const archiveProduct = getProduct(HOME_MERCHANDISING.archiveProductId);
  const archive =
    getVariant(archiveProduct.defaultVariantId) ?? archiveProduct.variants[0];
  const rougeEditorial = HOME_MERCHANDISING.editorials.find(
    (editorial) => editorial.variantId === featured.id,
  );
  const maisonEditorial = HOME_MERCHANDISING.editorials.find(
    (editorial) => editorial.id === "three-colour-installation",
  );
  const featuredAvailability = getAvailability(featured.id);
  return (
    <>
      <PageMeta title="岭南辑造" />
      <section className="home-hero" aria-labelledby="home-hero-title">
        <img
          className="home-hero-image"
          src={HOME_MERCHANDISING.hero.media.src}
          alt={HOME_MERCHANDISING.hero.media.alt}
        />
        <AiConceptLabel
          className="home-hero-concept-label"
          media={HOME_MERCHANDISING.hero.media}
        />
        <div className="home-hero-copy">
          <p className="eyebrow">LINGNAN EDITIONS · 2026</p>
          <h1 id="home-hero-title">
            粤凳 01
            <br />
            朱色限定
          </h1>
          <p className="home-hero-en">
            GUANGDONG STOOL N°01 · ROUGE EDITION
          </p>
          <p className="hero-price">{formatCny(featured.priceCents)}</p>
          <Link
            className="text-link"
            to={`/products/${featured.slug}?variant=${featured.id}`}
          >
            探索岭南朱 <ArrowRight size={15} />
          </Link>
        </div>
        <p className="hero-index" aria-hidden="true">
          OBJ. 01 / 2026
        </p>
      </section>

      <section className="intro-section" id="collection">
        <p className="eyebrow">THE NEW ICON</p>
        <h2>熟悉的轮廓，<br />在当代生活中重新成形。</h2>
        <p>
          取形于岭南街巷的日常坐器。原有的比例、拱口与堆叠秩序被悉数保留，
          再以色彩、编号与影像，回应当代空间的使用与审美。
        </p>
      </section>

      <section
        className="collection-grid section-pad"
        aria-label="岭南辑造新品"
      >
        {PRODUCTS.map((product) => (
          <CatalogProductCard key={product.id} product={product} />
        ))}
      </section>

      <div className="catalog-home-link">
        <Link className="text-link" to="/products">
          查看全部商品与系列 <ArrowRight size={15} />
        </Link>
      </div>

      <section className="home-series-index section-pad" aria-label="品牌系列">
        <div className="home-series-heading">
          <div>
            <p className="eyebrow">THE SERIES</p>
            <h2>由系列进入岭南日常</h2>
          </div>
          <Link className="text-link" to="/products">
            全部系列 <ArrowRight size={15} />
          </Link>
        </div>
        <div className="home-series-grid">
          {PRODUCT_SERIES.map((series) => (
            <article key={series.id} className="home-series-card">
              <Link to={`/series/${series.slug}`}>
                <img src={series.heroMedia.src} alt={series.heroMedia.alt} />
                <AiConceptLabel
                  className="home-series-concept-label"
                  media={series.heroMedia}
                />
                <span>
                  <small>{series.eyebrow}</small>
                  <strong>{series.nameZh}</strong>
                  <em>{series.nameEn}</em>
                </span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="rouge-feature">
        <div className="rouge-copy">
          <p className="eyebrow">2026 LIMITED EDITION</p>
          <h2>岭南朱</h2>
          <p className="serif">A RED HELD IN MEMORY.</p>
          <p>
            饭桌旁、骑楼下、喜宴间。高光朱红不需要被解释，
            它属于这片土地的共同视觉记忆。
          </p>
          <p className="rouge-availability">
            {featuredAvailability.state === "available"
              ? "可供选购"
              : featuredAvailability.label}
          </p>
          <Link
            className="light-link"
            to={`/products/${featured.slug}?variant=${featured.id}`}
          >
            查看限定作品 <ArrowRight size={15} />
          </Link>
        </div>
        <img
          src={rougeEditorial.media.src}
          alt={rougeEditorial.media.alt}
        />
        <p className="ai-caption">品牌 AI 概念影像</p>
      </section>

      <section className="maison-story section-pad" id="maison">
        <div className="maison-media">
          <img
            src={maisonEditorial.media.src}
            alt={maisonEditorial.media.alt}
          />
          <AiConceptLabel media={maisonEditorial.media} />
        </div>
        <div>
          <p className="eyebrow">THE MAISON</p>
          <h2>岭南为源，<br />辑造当代。</h2>
          <p className="serif">ROOTED IN LINGNAN. EDITED FOR THE PRESENT.</p>
          <p>
            岭南辑造从地方经验中提取形制、色彩与工艺线索。
            我们以克制的设计与更慢的观看，让熟悉之物进入当代生活的语境。
          </p>
        </div>
      </section>

      <section className="archive-feature section-pad">
        <div className="archive-heading">
          <p className="eyebrow">ARCHIVE OBJECTS</p>
          <h2>三色典藏</h2>
          <p>同一轮廓，三种岭南光线。</p>
        </div>
        <ProductCard variant={archive} editorial />
      </section>

      <section className="membership-banner">
        <p className="eyebrow">LINGNAN EDITIONS MEMBERSHIP</p>
        <h2>成为岭南辑造会员</h2>
        <p>
          年度会籍 ¥688。进入岭南辑造的会员序列，
          续写专属于你的作品档案。
        </p>
        <Link className="button button-light" to="/membership">
          查看会籍
        </Link>
      </section>
    </>
  );
}

/**
 * 全部商品与系列总览页。
 * @returns {import("react").ReactElement} 商品总览。
 */
function ProductsPage() {
  return (
    <>
      <PageMeta title="全部商品" />
      <section className="page-hero catalog-page-hero">
        <p className="eyebrow">ALL EDITIONS</p>
        <h1>岭南当代器物</h1>
        <p>
          从熟悉的形制、色彩与日常动作出发，进入每个系列与作品的完整档案。
        </p>
      </section>
      <div className="catalog-index section-pad">
        {PRODUCT_SERIES.map((series) => {
          const products = getProductsForSeries(series.id);
          return (
            <section
              className="catalog-series-section"
              key={series.id}
              aria-labelledby={`series-${series.id}`}
            >
              <div className="catalog-series-heading">
                <div>
                  <p className="eyebrow">{series.eyebrow}</p>
                  <h2 id={`series-${series.id}`}>{series.nameZh}</h2>
                  <p className="product-name-en">{series.nameEn}</p>
                </div>
                <Link className="text-link" to={`/series/${series.slug}`}>
                  进入系列 <ArrowRight size={15} />
                </Link>
              </div>
              <p className="catalog-series-description">{series.description}</p>
              <div className="catalog-product-grid">
                {products.map((product) => (
                  <CatalogProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

/**
 * 单一商品系列页。
 * @returns {import("react").ReactElement} 系列页或 404 页面。
 */
function SeriesPage() {
  const { slug } = useParams();
  const series = getSeriesBySlug(slug);
  if (!series) {
    return <NotFoundPage />;
  }
  const products = getProductsForSeries(series.id);
  return (
    <>
      <PageMeta title={series.nameZh} />
      <section className="series-hero">
        <img src={series.heroMedia.src} alt={series.heroMedia.alt} />
        <div>
          <p className="eyebrow">{series.eyebrow}</p>
          <h1>{series.nameZh}</h1>
          <p className="product-name-en">{series.nameEn}</p>
          <p>{series.description}</p>
          {series.heroMedia.aiConcept ? (
            <small>品牌 AI 概念影像</small>
          ) : null}
        </div>
      </section>
      <section className="series-products section-pad">
        <div className="catalog-series-heading">
          <div>
            <p className="eyebrow">SERIES INDEX</p>
            <h2>系列作品</h2>
          </div>
          <Link className="text-link" to="/products">
            查看全部系列 <ArrowRight size={15} />
          </Link>
        </div>
        <div className="catalog-product-grid">
          {products.map((product) => (
            <CatalogProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </>
  );
}

/**
 * 商品详情页。
 * @returns {import("react").ReactElement} 商品详情。
 */
function ProductPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const [notice, setNotice] = useState("");
  const { addToCart, getAvailability } = useCommerce();
  const navigate = useNavigate();
  const requestedVariantId = searchParams.get("variant");
  const resolution = useMemo(
    () => resolveProductRoute(slug, requestedVariantId),
    [requestedVariantId, slug],
  );

  useEffect(() => {
    if (
      resolution.status === "redirect" &&
      resolution.canonicalPath
    ) {
      navigate(
        `${resolution.canonicalPath}${resolution.canonicalSearch}`,
        { replace: true },
      );
    }
  }, [navigate, resolution]);

  useEffect(() => {
    setNotice("");
  }, [requestedVariantId, slug]);

  if (resolution.status === "not_found") {
    return <NotFoundPage />;
  }

  const { product, variant } = resolution;
  const productVariants = getVariantsForProduct(product.id);
  const series = getSeries(product.seriesId);
  const availability = getAvailability(variant.id);

  /**
   * 切换当前商品的变体并同步到 canonical URL。
   * @param {string} variantId - 新变体标识。
   * @returns {void}
   */
  function selectVariant(variantId) {
    navigate(`/products/${product.slug}?variant=${variantId}`);
    setNotice("");
  }

  /**
   * 按当前公开资格加入购物袋或进入会籍页。
   * @returns {Promise<void>}
   */
  async function handlePrimaryAction() {
    if (availability.state === "membership_required") {
      navigate("/membership");
      return;
    }
    if (availability.state !== "available") {
      return;
    }
    try {
      await addToCart(variant.id);
      setNotice("作品已加入购物袋。");
    } catch (error) {
      setNotice(getPublicErrorMessage(error));
    }
  }

  return (
    <>
      <PageMeta title={variant.nameZh} />
      <div className="product-page">
        <Link
          className="back-link"
          to={series ? `/series/${series.slug}` : "/products"}
        >
          <ArrowLeft size={15} /> 返回{series?.nameZh ?? "全部商品"}
        </Link>
        <div className="product-layout">
          <div className="product-gallery">
            {variant.media.gallery.map((media) => (
              <figure key={`${variant.id}-${media.assetKey}`}>
                <img src={media.src} alt={media.alt} />
                <figcaption>
                  {media.caption}
                  {media.aiConcept &&
                  !media.caption.includes("品牌 AI 概念影像")
                    ? " · 品牌 AI 概念影像"
                    : ""}
                </figcaption>
              </figure>
            ))}
          </div>
          <aside className="product-summary">
            <p className="eyebrow">{variant.editionNote}</p>
            <h1>{variant.nameZh}</h1>
            <p className="product-name-en">{variant.nameEn}</p>
            <p className="product-price">{formatCny(variant.priceCents)}</p>
            <p className="product-description">{variant.description}</p>
            {productVariants.length > 1 ? (
              <fieldset className="variant-selector">
                <legend>选择版本</legend>
                <div>
                  {productVariants.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={option.id === variant.id ? "is-selected" : ""}
                      aria-pressed={option.id === variant.id}
                      onClick={() => selectVariant(option.id)}
                    >
                      {option.option.colorHex ? (
                        <span
                          className="swatch"
                          style={{ backgroundColor: option.option.colorHex }}
                          aria-hidden="true"
                        />
                      ) : null}
                      <span>{option.option.label}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}
            <button
              className="button button-dark product-cta"
              type="button"
              disabled={
                availability.state !== "available" &&
                availability.state !== "membership_required"
              }
              aria-label={`${variant.nameZh}：${availability.label}`}
              onClick={handlePrimaryAction}
            >
              {availability.label}
            </button>
            <p className="transaction-note">
              本页为概念选购体验，不会产生真实交易。
            </p>
            <p className="inline-notice" aria-live="polite">
              {notice}
            </p>
            <div className="product-facts">
              {product.detailSections.map((section, index) => (
                <details key={section.title} open={index === 0}>
                  <summary>{section.title}</summary>
                  <p>{section.body}</p>
                </details>
              ))}
              <details>
                <summary>规格与用途</summary>
                <dl className="product-specifications">
                  {product.specifications.map((specification) => (
                    <div key={specification.label}>
                      <dt>{specification.label}</dt>
                      <dd>{specification.value}</dd>
                    </div>
                  ))}
                </dl>
              </details>
              <details>
                <summary>礼宾配送</summary>
                <p>
                  完成选购后将开启 90 秒加速礼宾旅程，
                  可在订单详情中持续查看。
                </p>
              </details>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

/**
 * 会员中心。
 * @returns {import("react").ReactElement} 会员中心。
 */
function MembershipPage() {
  const { membership, identity, ready } = useCommerce();
  const active = isMembershipActive(membership);
  const tier = getTierLabel(membership?.tier ?? "none");
  const spend = membership?.qualifyingSpendCents ?? 0;
  const progress = getTierProgress(spend);
  const nextTier = progress.nextTier ? getTierLabel(progress.nextTier) : null;

  return (
    <>
      <PageMeta title="会员中心" />
      <section className="page-hero membership-hero">
        <p className="eyebrow">LINGNAN EDITIONS MEMBERSHIP</p>
        <h1>你的辑造档案</h1>
        <p>
          每位访客都拥有一份专属作品档案，无需注册、登录或提交个人资料。
        </p>
      </section>
      <section className="membership-content section-pad">
        {!ready ? (
          <p>正在读取会籍…</p>
        ) : active ? (
          <>
            <div className="membership-status">
              <div>
                <p className="eyebrow">CURRENT STATUS</p>
                <h2>{tier.en}</h2>
                <p>{tier.zh}</p>
              </div>
              <SealCheck size={54} weight="thin" aria-hidden="true" />
            </div>
            <div className="membership-metrics">
              <div>
                <span>终身有效商品消费</span>
                <strong>{formatCny(spend)}</strong>
              </div>
              <div>
                <span>会籍有效期至</span>
                <strong>{formatDate(membership.termEndAt)}</strong>
              </div>
              <div>
                <span>下一年度免费续会</span>
                <strong>
                  {membership.renewalQualified ? "资格已获得" : "本期选购后获得"}
                </strong>
              </div>
            </div>
            <div className="tier-progress">
              <div>
                <span>
                  {nextTier ? `距离 ${nextTier.en}` : "当前已达最高级别"}
                </span>
                <strong>
                  {nextTier
                    ? `${formatCny(spend)} / ${formatCny(progress.thresholdCents)}`
                    : formatCny(spend)}
                </strong>
              </div>
              <progress
                aria-label={nextTier ? `距离${nextTier.zh}的进度` : "典藏会员进度"}
                max="1"
                value={progress.progress}
              />
            </div>
          </>
        ) : (
          <div className="membership-invitation">
            <div>
              <p className="eyebrow">ANNUAL MEMBERSHIP</p>
              <h2>成为 EDITION 辑选会员</h2>
              <p>
                一年会籍 {formatCny(MEMBERSHIP_FEE_CENTS)}。
                入会后即可选购常设作品；当期成功选购任一商品，
                即获得下一年度一次免费续会资格。
              </p>
            </div>
            <Link className="button button-dark" to="/membership/checkout">
              开通年度会籍
            </Link>
          </div>
        )}
        <div className="identity-panel">
          <div>
            <p className="eyebrow">COLLECTOR NUMBER</p>
            <h3>专属会员编号</h3>
          </div>
          <code>{identity ? `${identity.browserId.slice(0, 8)} ··· ${identity.browserId.slice(-4)}` : "读取中"}</code>
          <p>
            你的会籍与订单记录只随当前浏览器保留。
            清除浏览数据或结束无痕浏览后，记录将无法恢复。
          </p>
        </div>
        <div className="membership-rules">
          <div>
            <span>01</span>
            <h3>365 天年度制</h3>
            <p>每个付费或免费续会周期固定为 365 天，不叠加多年。</p>
          </div>
          <div>
            <span>02</span>
            <h3>选购记录累积</h3>
            <p>会费与配送不计入；有效商品消费会持续更新你的辑造档案。</p>
          </div>
          <div>
            <span>03</span>
            <h3>私密而轻盈</h3>
            <p>无需账户或提交个人资料，会员档案仅随当前浏览器保留。</p>
          </div>
        </div>
      </section>
    </>
  );
}

/**
 * 会籍虚拟支付页。
 * @returns {import("react").ReactElement} 会籍结账页。
 */
function MembershipCheckoutPage() {
  const { membership, payMembership, storageAvailable } = useCommerce();
  const [method, setMethod] = useState("concierge");
  const [paymentState, setPaymentState] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const paymentKeyRef = useRef(createIdempotencyKey("membership"));
  const navigate = useNavigate();
  const active = isMembershipActive(membership);

  /**
   * 播放虚拟支付并原子开通会籍。
   * @returns {Promise<void>}
   */
  async function handlePayment() {
    if (paymentState !== "idle" || !storageAvailable) {
      return;
    }
    setErrorMessage("");
    setPaymentState("authorizing");
    await waitForPresentation(650);
    setPaymentState("confirming");
    await waitForPresentation(650);
    try {
      await payMembership(method, paymentKeyRef.current);
      setPaymentState("succeeded");
      await waitForPresentation(500);
      navigate("/membership", { replace: true });
    } catch (error) {
      setPaymentState("idle");
      setErrorMessage(getPublicErrorMessage(error));
    }
  }

  return (
    <>
      <PageMeta title="会籍虚拟支付" />
      <section className="checkout-page narrow-page">
        <Link className="back-link" to="/membership">
          <ArrowLeft size={15} /> 返回会员中心
        </Link>
        <p className="eyebrow">ANNUAL MEMBERSHIP</p>
        <h1>开通辑选会籍</h1>
        {active ? (
          <div className="already-active">
            <SealCheck size={48} weight="thin" />
            <h2>会籍当前有效</h2>
            <p>无需重复支付，本年度会籍已生效。</p>
            <Link className="button button-dark" to="/membership">
              返回会员中心
            </Link>
          </div>
        ) : (
          <>
            <div className="checkout-summary-line">
              <span>LINGNAN EDITIONS · 365 天年度会籍</span>
              <strong>{formatCny(MEMBERSHIP_FEE_CENTS)}</strong>
            </div>
            <PaymentMethods value={method} onChange={setMethod} />
            <div className="demo-disclosure" role="note">
              <strong>本地虚拟支付</strong>
              <p>不会扣款、联系金融机构或提交任何资料。</p>
            </div>
            <button
              className="button button-dark payment-button"
              type="button"
              disabled={paymentState !== "idle" || !storageAvailable}
              onClick={handlePayment}
            >
              {paymentState === "idle"
                ? `虚拟支付 ${formatCny(MEMBERSHIP_FEE_CENTS)}`
                : paymentState === "authorizing"
                  ? "正在连接礼宾账户…"
                  : paymentState === "confirming"
                    ? "正在确认会籍…"
                    : "会籍已开通"}
            </button>
            <p className="inline-notice" aria-live="assertive">
              {errorMessage}
            </p>
          </>
        )}
      </section>
    </>
  );
}

/**
 * 虚拟支付方式选择器。
 * @param {{value: string, onChange: (value: "concierge" | "unionpay") => void}} props - 选择器参数。
 * @returns {import("react").ReactElement} 支付方式选择器。
 */
function PaymentMethods({ value, onChange }) {
  return (
    <fieldset className="payment-methods">
      <legend>选择演示支付方式</legend>
      {PAYMENT_METHODS.map((method) => (
        <label key={method.id} className={value === method.id ? "is-selected" : ""}>
          <input
            type="radio"
            name="payment-method"
            value={method.id}
            checked={value === method.id}
            onChange={() => onChange(method.id)}
          />
          <span>
            <strong>{method.name}</strong>
            <small>{method.note}</small>
          </span>
          {value === method.id ? <Check size={18} aria-hidden="true" /> : null}
        </label>
      ))}
    </fieldset>
  );
}

/**
 * 购物袋页。
 * @returns {import("react").ReactElement} 购物袋。
 */
function BagPage() {
  const {
    cartItems,
    cartSubtotalCents,
    getAvailability,
    setQuantity,
  } = useCommerce();
  const [notice, setNotice] = useState("");
  const invalidItem = cartItems.find(
    (item) =>
      getCartItemAvailability(item, cartItems, getAvailability).state !==
      "available",
  );

  /**
   * 更新数量并显示业务错误。
   * @param {string} variantId - 变体标识。
   * @param {number} quantity - 新数量。
   * @returns {Promise<void>}
   */
  async function updateQuantity(variantId, quantity) {
    try {
      await setQuantity(variantId, quantity);
      setNotice("");
    } catch (error) {
      setNotice(getPublicErrorMessage(error));
    }
  }

  return (
    <>
      <PageMeta title="购物袋" />
      <section className="page-hero compact-page-hero">
        <p className="eyebrow">YOUR SELECTION</p>
        <h1>购物袋</h1>
      </section>
      <section className="bag-page section-pad">
        {cartItems.length === 0 ? (
          <div className="empty-state">
            <Handbag size={42} weight="thin" aria-hidden="true" />
            <h2>购物袋是空的</h2>
            <p>从全部系列中选择适合当代生活的岭南器物。</p>
            <Link className="button button-dark" to="/products">
              浏览全部商品
            </Link>
          </div>
        ) : (
          <div className="bag-layout">
            <div className="bag-items">
              {cartItems.map((item) => {
                const availability = getCartItemAvailability(
                  item,
                  cartItems,
                  getAvailability,
                );
                const nextAvailability = getCartItemAvailability(
                  item,
                  cartItems,
                  getAvailability,
                  item.quantity + 1,
                );
                return (
                  <article className="bag-item" key={item.variantId}>
                    <img
                      src={item.variant.heroImage}
                      alt={`${item.variant.nameZh}影棚图`}
                    />
                    <div>
                      <p className="eyebrow">{item.variant.editionNote}</p>
                      <h2>{item.variant.nameZh}</h2>
                      <p className="product-name-en">{item.variant.nameEn}</p>
                      <p>
                        {item.unavailable
                          ? "不计入作品小计"
                          : formatCny(item.variant.priceCents)}
                      </p>
                      {availability.state !== "available" ? (
                        <p className="unavailable-label">{availability.label}</p>
                      ) : null}
                      <div className="quantity-control" aria-label={`${item.variant.nameZh}数量`}>
                        <button
                          type="button"
                          aria-label={`减少${item.variant.nameZh}数量`}
                          onClick={() =>
                            updateQuantity(item.variantId, item.quantity - 1)
                          }
                        >
                          <Minus size={15} />
                        </button>
                        <span aria-live="polite">{item.quantity}</span>
                        <button
                          type="button"
                          aria-label={`增加${item.variant.nameZh}数量`}
                          disabled={nextAvailability.state !== "available"}
                          onClick={() =>
                            updateQuantity(item.variantId, item.quantity + 1)
                          }
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                      <button
                        className="text-button bag-remove-button"
                        type="button"
                        onClick={() => updateQuantity(item.variantId, 0)}
                      >
                        移出购物袋
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            <aside className="bag-summary">
              <p className="eyebrow">ORDER SUMMARY</p>
              <div>
                <span>作品小计</span>
                <strong>{formatCny(cartSubtotalCents)}</strong>
              </div>
              <div>
                <span>礼宾配送</span>
                <strong>敬请惠存</strong>
              </div>
              <div className="bag-total">
                <span>合计</span>
                <strong>{formatCny(cartSubtotalCents)}</strong>
              </div>
              {invalidItem ? (
                <p className="unavailable-label" aria-live="polite">
                  {
                    getCartItemAvailability(
                      invalidItem,
                      cartItems,
                      getAvailability,
                    ).label
                  }
                </p>
              ) : (
                <Link className="button button-dark" to="/checkout">
                  进入礼宾结账
                </Link>
              )}
              <p className="transaction-note">
                结账金额将以确认时的作品定价为准。
              </p>
            </aside>
          </div>
        )}
        <p className="inline-notice" aria-live="polite">
          {notice}
        </p>
      </section>
    </>
  );
}

/**
 * 商品虚拟结账页。
 * @returns {import("react").ReactElement} 商品结账。
 */
function CheckoutPage() {
  const {
    cart,
    cartItems,
    cartSubtotalCents,
    getAvailability,
    placeOrder,
    storageAvailable,
  } = useCommerce();
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState("concierge");
  const [paymentState, setPaymentState] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const stepHeadingRef = useRef(null);
  const hasChangedStepRef = useRef(false);
  const navigate = useNavigate();
  const invalidItem = cartItems.find(
    (item) =>
      getCartItemAvailability(item, cartItems, getAvailability).state !==
      "available",
  );

  useEffect(() => {
    if (hasChangedStepRef.current) {
      stepHeadingRef.current?.focus({ preventScroll: true });
    } else {
      hasChangedStepRef.current = true;
    }
  }, [step]);

  /**
   * 播放支付动画后以确认时版本提交订单。
   * @returns {Promise<void>}
   */
  async function handlePlaceOrder() {
    if (
      paymentState !== "idle" ||
      !cart ||
      !storageAvailable ||
      invalidItem
    ) {
      return;
    }
    const expectedRevision = cart.revision;
    const idempotencyKey = createIdempotencyKey(
      `order:${cart.browserId}:${expectedRevision}`,
    );
    setErrorMessage("");
    setPaymentState("authorizing");
    await waitForPresentation(650);
    setPaymentState("confirming");
    await waitForPresentation(650);
    setPaymentState("finalizing");
    await waitForPresentation(500);
    try {
      const result = await placeOrder({
        expectedRevision,
        idempotencyKey,
        method,
      });
      setPaymentState("succeeded");
      navigate(`/orders/${result.order.id}?success=1`, { replace: true });
    } catch (error) {
      setPaymentState("idle");
      setStep(1);
      setErrorMessage(getPublicErrorMessage(error));
    }
  }

  if (cartItems.length === 0) {
    return (
      <>
        <PageMeta title="商品结账" />
        <section className="checkout-page narrow-page">
          <div className="empty-state">
            <Handbag size={42} weight="thin" />
            <h1>购物袋是空的</h1>
            <Link className="button button-dark" to="/products">
              返回全部商品
            </Link>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageMeta title="商品结账" />
      <section className="checkout-page checkout-wide">
        <Link className="back-link" to="/bag">
          <ArrowLeft size={15} /> 返回购物袋
        </Link>
        <div className="checkout-heading">
          <p className="eyebrow">LOCAL CHECKOUT</p>
          <h1>礼宾结账</h1>
          <ol className="checkout-steps" aria-label="结账进度">
            {["订单确认", "礼宾配送", "虚拟支付"].map((label, index) => (
              <li
                key={label}
                className={step >= index + 1 ? "is-active" : ""}
                aria-current={step === index + 1 ? "step" : undefined}
              >
                <span>{index + 1}</span>
                {label}
              </li>
            ))}
          </ol>
        </div>
        <div className="checkout-layout">
          <div className="checkout-main">
            {step === 1 ? (
              <section aria-labelledby="review-heading">
                <p className="eyebrow">STEP 01</p>
                <h2 id="review-heading" ref={stepHeadingRef} tabIndex="-1">
                  确认作品
                </h2>
                <div className="checkout-products">
                  {cartItems.map((item) => {
                    const availability = getCartItemAvailability(
                      item,
                      cartItems,
                      getAvailability,
                    );
                    return (
                      <article key={item.variantId}>
                        <img src={item.variant.heroImage} alt="" />
                        <div>
                          <h3>{item.variant.nameZh}</h3>
                          <p>{item.variant.nameEn}</p>
                          <span>
                            {item.unavailable
                              ? "不计入小计"
                              : `${item.quantity} × ${formatCny(item.variant.priceCents)}`}
                          </span>
                          {availability.state !== "available" ? (
                            <strong className="unavailable-label">
                              {availability.label}
                            </strong>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
                <button
                  className="button button-dark"
                  type="button"
                  disabled={Boolean(invalidItem)}
                  onClick={() => setStep(2)}
                >
                  确认订单
                </button>
              </section>
            ) : null}
            {step === 2 ? (
              <section aria-labelledby="delivery-heading">
                <p className="eyebrow">STEP 02</p>
                <h2 id="delivery-heading" ref={stepHeadingRef} tabIndex="-1">
                  礼宾配送
                </h2>
                <div className="delivery-card">
                  <MapPin size={28} weight="thin" aria-hidden="true" />
                  <div>
                    <strong>{DEMO_DELIVERY.recipient}</strong>
                    <p>{DEMO_DELIVERY.address}</p>
                    <small>{DEMO_DELIVERY.phone}</small>
                  </div>
                </div>
                <p className="transaction-note">
                  以上为预置虚构收件人与演示地址，不采集或保存真实个人资料。
                </p>
                <div className="checkout-actions">
                  <button className="text-button" type="button" onClick={() => setStep(1)}>
                    返回
                  </button>
                  <button className="button button-dark" type="button" onClick={() => setStep(3)}>
                    确认礼宾配送
                  </button>
                </div>
              </section>
            ) : null}
            {step === 3 ? (
              <section aria-labelledby="payment-heading">
                <p className="eyebrow">STEP 03</p>
                <h2 id="payment-heading" ref={stepHeadingRef} tabIndex="-1">
                  虚拟支付
                </h2>
                <PaymentMethods value={method} onChange={setMethod} />
                <div className="demo-disclosure">
                  <strong>本地虚拟支付</strong>
                  <p>不会扣款、联系金融机构或提交任何资料。</p>
                </div>
                <div className="checkout-actions">
                  <button
                    className="text-button"
                    type="button"
                    disabled={paymentState !== "idle"}
                    onClick={() => setStep(2)}
                  >
                    返回
                  </button>
                  <button
                    className="button button-dark payment-button"
                    type="button"
                    disabled={paymentState !== "idle" || !storageAvailable}
                    onClick={handlePlaceOrder}
                  >
                    {paymentState === "idle"
                      ? `虚拟支付 ${formatCny(cartSubtotalCents)}`
                      : paymentState === "authorizing"
                        ? "正在连接礼宾账户…"
                        : paymentState === "confirming"
                          ? "正在确认付款…"
                          : paymentState === "finalizing"
                            ? "正在创建礼宾物流…"
                            : "订单已确认"}
                  </button>
                </div>
              </section>
            ) : null}
            <p className="inline-notice" aria-live="assertive">
              {errorMessage}
            </p>
          </div>
          <aside className="order-aside">
            <p className="eyebrow">ORDER TOTAL</p>
            <div>
              <span>作品小计</span>
              <strong>{formatCny(cartSubtotalCents)}</strong>
            </div>
            <div>
              <span>礼宾配送</span>
              <strong>敬请惠存</strong>
            </div>
            <div className="order-total">
              <span>总计</span>
              <strong>{formatCny(cartSubtotalCents)}</strong>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

/**
 * 本地历史订单列表。
 * @returns {import("react").ReactElement} 订单列表。
 */
function OrdersPage() {
  const { orders } = useCommerce();
  return (
    <>
      <PageMeta title="订单档案" />
      <section className="page-hero compact-page-hero">
        <p className="eyebrow">ORDER ARCHIVE</p>
        <h1>订单档案</h1>
        <p>你的订单凭证与礼宾旅程会保留在当前浏览器中。</p>
      </section>
      <section className="orders-page section-pad">
        {orders.length === 0 ? (
          <div className="empty-state">
            <Package size={42} weight="thin" />
            <h2>尚无订单记录</h2>
            <Link className="button button-dark" to="/#collection">
              浏览精品系列
            </Link>
          </div>
        ) : (
          <div className="order-list">
            {orders.map((order) => (
              <Link to={`/orders/${order.id}`} key={order.id}>
                <div className="order-thumbnails">
                  {order.items.slice(0, 3).map((item) => (
                    <img
                      key={item.variantId}
                      src={resolveOrderItemImage(item)}
                      alt=""
                    />
                  ))}
                </div>
                <div>
                  <p className="eyebrow">{formatDate(order.createdAt, true)}</p>
                  <h2>{order.orderNo}</h2>
                  <p>{order.items.map((item) => item.shortName).join(" · ")}</p>
                </div>
                <strong>{formatCny(order.totalCents)}</strong>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

/**
 * 单一订单与加速虚拟物流详情。
 * @returns {import("react").ReactElement} 订单详情。
 */
function OrderDetailPage() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const [nowMs, setNowMs] = useState(Date.now());
  const { storageAvailable } = useCommerce();
  const order = useLiveQuery(
    async () => {
      if (!orderId || !storageAvailable) {
        return null;
      }
      try {
        return (await commerceDb.orders.get(orderId)) ?? null;
      } catch {
        return null;
      }
    },
    [orderId, storageAvailable],
    undefined,
  );
  const shipment = useLiveQuery(
    async () => {
      if (!orderId || !storageAvailable) {
        return null;
      }
      try {
        return (
          (await commerceDb.shipments
            .where("orderId")
            .equals(orderId)
            .first()) ?? null
        );
      } catch {
        return null;
      }
    },
    [orderId, storageAvailable],
    undefined,
  );

  useEffect(() => {
    if (!orderId || !storageAvailable) {
      return undefined;
    }
    reconcileShipment(commerceDb, orderId).catch(() => undefined);
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
      reconcileShipment(commerceDb, orderId).catch(() => undefined);
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [orderId, storageAvailable]);

  if (order === undefined) {
    return (
      <>
        <PageMeta title="订单详情" />
        <section className="checkout-page narrow-page">
          <h1>正在读取订单…</h1>
        </section>
      </>
    );
  }

  if (order === null) {
    return (
      <>
        <PageMeta title="订单未找到" />
        <section className="checkout-page narrow-page empty-state">
          <Package size={42} weight="thin" />
          <h1>没有找到这笔订单</h1>
          <p>
            当前订单档案中没有这笔记录，或相关浏览数据已被清除。
          </p>
          <Link className="button button-dark" to="/orders">
            返回订单档案
          </Link>
        </section>
      </>
    );
  }

  const currentStage = shipment?.currentStage ?? 0;
  const nextEvent = shipment?.events?.[currentStage + 1] ?? null;
  const secondsRemaining = nextEvent
    ? Math.max(
        0,
        Math.ceil((new Date(nextEvent.scheduledAt).getTime() - nowMs) / 1_000),
      )
    : 0;

  return (
    <>
      <PageMeta title={`订单 ${order.orderNo}`} />
      <section className="order-detail section-pad">
        {searchParams.get("success") === "1" ? (
          <div className="order-success" role="status">
            <SealCheck size={42} weight="thin" />
            <div>
              <p className="eyebrow">ORDER CONFIRMED</p>
              <h1>感谢你的选购</h1>
              <p>你的订单已确认，岭南礼宾将陪伴接下来的配送旅程。</p>
            </div>
          </div>
        ) : (
          <h1>订单详情</h1>
        )}
        <div className="order-detail-grid">
          <section className="shipment-section" aria-labelledby="shipment-heading">
            <div className="shipment-heading">
              <div>
                <p className="eyebrow">CONCIERGE DELIVERY</p>
                <h2 id="shipment-heading">礼宾物流</h2>
              </div>
              <span>虚拟物流 · 加速演示</span>
            </div>
            <div className="shipment-current">
              <Package size={31} weight="thin" />
              <div>
                <strong aria-live="polite" aria-atomic="true">
                  {shipment?.events?.[currentStage]?.label ?? "订单已确认"}
                </strong>
                <p>
                  {nextEvent
                    ? `下一节点「${nextEvent.label}」约 ${secondsRemaining} 秒`
                    : "本次礼宾配送展示已完成"}
                </p>
              </div>
            </div>
            <progress
              className="shipment-progress"
              aria-label="礼宾物流进度"
              max={(shipment?.events?.length ?? 1) - 1}
              value={currentStage}
            />
            <ol className="shipment-timeline">
              {shipment?.events?.map((event, index) => {
                const reached = index <= currentStage;
                const current = index === currentStage;
                return (
                  <li
                    key={event.key}
                    className={reached ? "is-reached" : ""}
                    aria-current={current ? "step" : undefined}
                  >
                    <span aria-hidden="true">
                      {reached ? <Check size={13} /> : index + 1}
                    </span>
                    <div>
                      <strong>{event.label}</strong>
                      <time dateTime={event.scheduledAt}>
                        {formatDate(event.scheduledAt, true)}
                      </time>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
          <aside className="order-record">
            <p className="eyebrow">ORDER RECORD</p>
            <h2>{order.orderNo}</h2>
            <p>{formatDate(order.createdAt, true)}</p>
            <div className="order-record-items">
              {order.items.map((item) => (
                <article key={item.variantId}>
                  <img src={resolveOrderItemImage(item)} alt="" />
                  <div>
                    <strong>{item.nameZh}</strong>
                    <span>
                      {item.quantity} × {formatCny(item.priceCents)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
            <div className="order-record-total">
              <span>总计</span>
              <strong>{formatCny(order.totalCents)}</strong>
            </div>
            <div className="delivery-mini">
              <MapPin size={18} />
              <p>
                {order.delivery.recipient}
                <br />
                {order.delivery.address}
              </p>
            </div>
            <p className="tracking-number">礼宾旅程编号 {shipment?.trackingNo ?? "生成中"}</p>
          </aside>
        </div>
      </section>
    </>
  );
}

/**
 * 未匹配路由页面。
 * @returns {import("react").ReactElement} 404 页面。
 */
function NotFoundPage() {
  return (
    <>
      <PageMeta title="未找到页面" />
      <section className="checkout-page narrow-page empty-state">
        <p className="eyebrow">404</p>
        <h1>这一页暂未入档</h1>
        <Link className="button button-dark" to="/">
          返回首页
        </Link>
      </section>
    </>
  );
}

/**
 * 应用路由入口。
 * @returns {import("react").ReactElement} 完整站点。
 */
export function App() {
  return (
    <SiteLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:slug" element={<ProductPage />} />
        <Route path="/series/:slug" element={<SeriesPage />} />
        <Route path="/membership" element={<MembershipPage />} />
        <Route
          path="/membership/checkout"
          element={<MembershipCheckoutPage />}
        />
        <Route path="/bag" element={<BagPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:orderId" element={<OrderDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </SiteLayout>
  );
}
