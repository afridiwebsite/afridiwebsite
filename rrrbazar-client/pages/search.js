/*
 * /search?q=…
 *
 * Full-page results view, used as the destination for the header search
 * dropdown's "View all results" link. Renders two buckets (products and
 * packages) with the same routing rules as the dropdown:
 *   - product → /topup/<id>
 *   - package → /topup/<product_id>
 */
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import { searchGlobal } from '../api/api';
import { imgPath } from '../helpers/helpers';

function SearchPage() {
  const router = useRouter();
  const queryParam = (router.query.q || '').toString();

  // Inline-editable search box so users can refine without bouncing back to
  // the header.
  const [q, setQ] = useState(queryParam);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ products: [], packages: [] });

  // Sync local state when the URL changes (back/forward nav, header re-submit).
  useEffect(() => { setQ(queryParam); }, [queryParam]);

  useEffect(() => {
    const term = queryParam.trim();
    if (!term) {
      setData({ products: [], packages: [] });
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await searchGlobal(term, 30);
        if (cancelled) return;
        const body = res?.data?.data || {};
        setData({
          products: Array.isArray(body.products) ? body.products : [],
          packages: Array.isArray(body.packages) ? body.packages : [],
        });
      } catch (e) {
        if (!cancelled) setData({ products: [], packages: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [queryParam]);

  const onSubmit = (e) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  const total = data.products.length + data.packages.length;

  return (
    <>
      <Head>
        <title>{queryParam ? `Search: ${queryParam}` : 'Search'}</title>
      </Head>

      <section className="container my-7 search-page">
        <form onSubmit={onSubmit} className="search-page-bar animate-fade-in-up">
          <FaSearch className="search-page-bar-icon" aria-hidden="true" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search games and packages…"
            className="search-page-input"
            autoFocus
          />
          <button type="submit" className="search-page-btn">Search</button>
        </form>

        {queryParam && (
          <p className="search-page-meta animate-fade-in" style={{ animationDelay: '80ms' }}>
            {loading
              ? `Searching “${queryParam}”…`
              : `${total} result${total === 1 ? '' : 's'} for “${queryParam}”`}
          </p>
        )}

        {!queryParam && (
          <p className="search-page-meta">
            Type a game or package name above to search.
          </p>
        )}

        {!loading && queryParam && total === 0 && (
          <div className="search-page-empty animate-fade-in-up" style={{ animationDelay: '120ms' }}>
            <span className="search-page-empty-emoji" aria-hidden="true">🔍</span>
            <p>Nothing matched <strong>{queryParam}</strong>.</p>
            <p className="text-sm text-gray-500">Try a shorter query or different spelling.</p>
          </div>
        )}

        {!loading && data.products.length > 0 && (
          <div className="mt-6">
            <h2 className="search-page-section-title">Products</h2>
            <div className="grid grid-cols-3 xs:grid-cols-4 md:grid-cols-6 gap-2 md:gap-3 mt-3">
              {data.products.map((p, i) => (
                <Link key={p.id} href={`/topup/${p.id}`}>
                  <a
                    className="search-product-tile animate-fade-in-up"
                    style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
                  >
                    <div className="search-product-img-wrap">
                      <img
                        src={p.logo_full_url || imgPath(p.logo)}
                        alt={p.name}
                        className="search-product-img"
                      />
                    </div>
                    <div className="search-product-name">{p.name}</div>
                  </a>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!loading && data.packages.length > 0 && (
          <div className="mt-8">
            <h2 className="search-page-section-title">Packages</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
              {data.packages.map((pk, i) => (
                <Link key={pk.id} href={`/topup/${pk.product_id}`}>
                  <a
                    className="search-package-card animate-fade-in-up"
                    style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}
                  >
                    <img
                      src={pk.product_logo_full_url || imgPath(pk.product_logo)}
                      alt=""
                      className="search-package-img"
                    />
                    <div className="search-package-main">
                      <div className="search-package-name">{pk.name}</div>
                      <div className="search-package-sub">
                        {pk.product_name ? `${pk.product_name}` : ''}
                      </div>
                    </div>
                    <div className="search-package-price">৳ {pk.price}</div>
                  </a>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}

export default SearchPage;
