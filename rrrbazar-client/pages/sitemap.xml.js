import api from '../api/api';
import { SITE_URL } from '../config/seoConfig';

// Public, indexable static routes (mirrors the Allow list in robots.txt).
const STATIC_PATHS = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/shop', priority: '0.9', changefreq: 'daily' },
  { path: '/topup', priority: '0.9', changefreq: 'daily' },
  { path: '/tournament', priority: '0.8', changefreq: 'daily' },
  { path: '/tutorials', priority: '0.6', changefreq: 'weekly' },
  { path: '/about-us', priority: '0.5', changefreq: 'monthly' },
  { path: '/contact-us', priority: '0.5', changefreq: 'monthly' },
  { path: '/privacy-policy', priority: '0.3', changefreq: 'yearly' },
  { path: '/terms-condition', priority: '0.3', changefreq: 'yearly' },
  { path: '/refund-return-policy', priority: '0.3', changefreq: 'yearly' },
];

function urlNode({ path, priority, changefreq, lastmod }) {
  return `  <url>
    <loc>${SITE_URL}${path === '/' ? '' : path}</loc>${
    lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''
  }
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

function buildSitemap(products) {
  const nodes = [
    ...STATIC_PATHS.map(urlNode),
    ...products.map((p) =>
      urlNode({
        path: `/product/${p.id}`,
        priority: '0.7',
        changefreq: 'weekly',
        lastmod: p.updated_at
          ? new Date(p.updated_at).toISOString()
          : undefined,
      }),
    ),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${nodes.join('\n')}
</urlset>`;
}

function SiteMap() {
  // getServerSideProps writes the XML directly to the response.
  return null;
}

export async function getServerSideProps({ res }) {
  let products = [];
  try {
    const r = await api.get('/topupproduct');
    products = Array.isArray(r?.data?.data) ? r.data.data : [];
  } catch (e) {
    // If the API is unreachable, still serve a sitemap of static routes.
    products = [];
  }

  res.setHeader('Content-Type', 'text/xml');
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=3600, stale-while-revalidate=86400',
  );
  res.write(buildSitemap(products));
  res.end();

  return { props: {} };
}

export default SiteMap;
