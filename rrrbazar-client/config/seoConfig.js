/*
 *
 * Title: seoConfig
 * Description: Centralised SEO defaults — meta, Open Graph, geo / location
 *   (Bangladesh) and structured-data values. Page-level <SEO /> usage can
 *   override any of these per page.
 *
 */
import {
  __email_name,
  __facebook_link,
  __site_name_1,
  __site_url,
  __support_number,
  __youtube_link,
} from './globalConfig';

// Strip the trailing slash so we can safely build canonical/og URLs by
// concatenating the request path (which always starts with "/").
export const SITE_URL = String(__site_url || 'https://rrrbazar.com').replace(
  /\/+$/,
  '',
);

export const seoConfig = Object.freeze({
  siteName: __site_name_1,
  // Default <title> used when a page does not provide its own.
  defaultTitle: `${__site_name_1} | Buy Game Top-Up & Online Game Credits in Bangladesh`,
  // Appended to page-provided titles, e.g. "Free Fire | RRR-Bazar".
  titleTemplate: `%s | ${__site_name_1}`,
  description:
    'RRR-Bazar is Bangladesh’s trusted game top-up shop. Instantly buy Free Fire diamonds, PUBG Mobile UC, Mobile Legends, gift cards and online game credits with bKash, Nagad & Rocket. Fast delivery all over Bangladesh.',
  keywords: [
    'game top up bangladesh',
    'free fire diamond top up bd',
    'pubg mobile uc bangladesh',
    'mobile legends diamond bd',
    'buy game credits bangladesh',
    'bkash game top up',
    'nagad game top up',
    'online game recharge bd',
    'rrr-bazar',
    'rrrbazar',
  ].join(', '),
  // Social preview image (must be an absolute URL for crawlers).
  ogImage: `${SITE_URL}/logo.png`,
  twitterHandle: '@rrrbazar',
  // Open Graph locale — primary Bangla (Bangladesh), English as alternate.
  locale: 'bn_BD',
  localeAlternate: 'en_US',
});

// ---------------------------------------------------------------------------
// Location / geo info (Bangladesh). Used both for <meta name="geo.*"> tags
// and the LocalBusiness structured data. Dhaka coordinates by default.
// ---------------------------------------------------------------------------
export const geoConfig = Object.freeze({
  countryCode: 'BD',
  country: 'Bangladesh',
  region: 'BD-13', // ISO 3166-2 code for Dhaka division.
  placename: 'Dhaka',
  // "lat;long" for geo.position / "lat, long" for ICBM.
  latitude: '23.8103',
  longitude: '90.4125',
});

// JSON-LD for the storefront as an online business serving Bangladesh.
export const organizationJsonLd = Object.freeze({
  '@context': 'https://schema.org',
  '@type': 'OnlineStore',
  name: seoConfig.siteName,
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  image: seoConfig.ogImage,
  description: seoConfig.description,
  email: __email_name,
  telephone: __support_number,
  priceRange: '৳৳',
  currenciesAccepted: 'BDT',
  paymentAccepted: 'bKash, Nagad, Rocket',
  address: {
    '@type': 'PostalAddress',
    addressCountry: geoConfig.countryCode,
    addressRegion: geoConfig.placename,
  },
  areaServed: {
    '@type': 'Country',
    name: geoConfig.country,
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: geoConfig.latitude,
    longitude: geoConfig.longitude,
  },
  sameAs: [__facebook_link, __youtube_link].filter(Boolean),
});

// JSON-LD for the site itself, exposing the on-site search to search engines.
export const websiteJsonLd = Object.freeze({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: seoConfig.siteName,
  url: SITE_URL,
  inLanguage: 'bn-BD',
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/search?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
});
