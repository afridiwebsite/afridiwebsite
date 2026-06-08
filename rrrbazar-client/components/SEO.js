import Head from 'next/head';
import { useRouter } from 'next/router';
import { geoConfig, seoConfig, SITE_URL } from '../config/seoConfig';

/*
 * Reusable per-page SEO head. Renders title, description, canonical, Open
 * Graph, Twitter card, Bangladesh geo tags and optional JSON-LD structured
 * data. Any prop left out falls back to the site-wide defaults in seoConfig.
 *
 * Usage:
 *   <SEO title="Free Fire Diamond Top Up" description="..." image={url} />
 */
function SEO({
  title,
  description = seoConfig.description,
  keywords = seoConfig.keywords,
  image = seoConfig.ogImage,
  // Pass `false` on private/duplicate pages to keep them out of the index.
  noindex = false,
  // Forces og:type — "website" for landing pages, "product" for products.
  type = 'website',
  // Optional JSON-LD object (or array of objects) for the page.
  jsonLd,
  // Override the canonical path (defaults to the current route, query
  // stripped). Should start with "/".
  canonicalPath,
}) {
  const router = useRouter();

  const fullTitle = title
    ? seoConfig.titleTemplate.replace('%s', title)
    : seoConfig.defaultTitle;

  // Strip query string so paginated/filtered variants share one canonical.
  const path = canonicalPath ?? (router.asPath || '/').split('?')[0];
  const canonical = `${SITE_URL}${path === '/' ? '' : path}`;

  // Absolutise the image URL — crawlers reject relative og:image values.
  const ogImage = image?.startsWith('http') ? image : `${SITE_URL}${image}`;

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} key="description" />
      <meta name="keywords" content={keywords} key="keywords" />
      <meta
        name="robots"
        content={noindex ? 'noindex, nofollow' : 'index, follow'}
        key="robots"
      />
      <link rel="canonical" href={canonical} key="canonical" />

      {/* Open Graph */}
      <meta property="og:type" content={type} key="og:type" />
      <meta property="og:site_name" content={seoConfig.siteName} key="og:site_name" />
      <meta property="og:title" content={fullTitle} key="og:title" />
      <meta property="og:description" content={description} key="og:description" />
      <meta property="og:url" content={canonical} key="og:url" />
      <meta property="og:image" content={ogImage} key="og:image" />
      <meta property="og:locale" content={seoConfig.locale} key="og:locale" />
      <meta
        property="og:locale:alternate"
        content={seoConfig.localeAlternate}
        key="og:locale:alternate"
      />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" key="twitter:card" />
      <meta name="twitter:site" content={seoConfig.twitterHandle} key="twitter:site" />
      <meta name="twitter:title" content={fullTitle} key="twitter:title" />
      <meta name="twitter:description" content={description} key="twitter:description" />
      <meta name="twitter:image" content={ogImage} key="twitter:image" />

      {/* Geo / location — Bangladesh */}
      <meta name="geo.region" content={geoConfig.region} key="geo.region" />
      <meta name="geo.placename" content={geoConfig.placename} key="geo.placename" />
      <meta
        name="geo.position"
        content={`${geoConfig.latitude};${geoConfig.longitude}`}
        key="geo.position"
      />
      <meta
        name="ICBM"
        content={`${geoConfig.latitude}, ${geoConfig.longitude}`}
        key="ICBM"
      />

      {/* Structured data */}
      {jsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
    </Head>
  );
}

export default SEO;
