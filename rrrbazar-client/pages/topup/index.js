import Head from 'next/head';
import { useMemo, useState } from 'react';
import api from '../../api/api';
import ActivityIndicator from '../../components/ActivityIndicator';
import Game from '../../components/game';
import { __page_title_end } from '../../config/globalConfig';
import { hasData } from '/helpers/helpers';

function CategoryChips({ categories, active, onChange }) {
  return (
    <div className="cat-chip-row">
      <button
        type="button"
        className={`cat-chip ${active === 'all' ? 'active' : ''}`}
        onClick={() => onChange('all')}
      >
        <span aria-hidden="true">🎮</span>
        All
      </button>
      {(categories || []).map((c) => (
        <button
          type="button"
          key={c.id}
          className={`cat-chip ${active === c.id ? 'active' : ''}`}
          onClick={() => onChange(c.id)}
        >
          <span aria-hidden="true">{c.emoji || '🎮'}</span>
          {c.name}
        </button>
      ))}
    </div>
  );
}

function ProductGrid({ products }) {
  if (!hasData(products)) {
    return (
      <div className="text-center text-gray-500 py-8 text-sm">
        No products in this category yet.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 xs:grid-cols-4 md:grid-cols-6 gap-2 md:gap-3">
      {products.map((p, i) => (
        <div
          key={p.id || i}
          style={{ animationDelay: `${i * 25}ms` }}
          className="animate-fade-in-up"
        >
          <Game game={p} />
        </div>
      ))}
    </div>
  );
}

function TopupPage({ topup_products, products_by_category }) {
  const [active, setActive] = useState('all');

  const sections = useMemo(() => {
    if (!products_by_category || products_by_category.length === 0) {
      return [{ id: 'all', name: 'Games Topup', products: topup_products || [] }];
    }
    if (active === 'all') return products_by_category;
    return products_by_category.filter((c) => c.id === active);
  }, [products_by_category, topup_products, active]);

  return (
    <>
      <Head>
        <title>Topup Games {__page_title_end}</title>
      </Head>

      <section className="container my-4">
        <h2 className="_h3 mb-2 theme-text-primary">Browse by category</h2>
        <CategoryChips
          categories={products_by_category}
          active={active}
          onChange={setActive}
        />
      </section>

      <ActivityIndicator data={topup_products} error={!topup_products} />

      {sections.map((cat) => (
        <section
          key={cat.id || cat.name}
          className="container my-3 animate-fade-in"
        >
          <div className="section-card">
            <h3 className="section-heading">
              <span>{cat.name}</span>
              <span className="fire" aria-hidden="true">🔥</span>
            </h3>
            <ProductGrid products={cat.products} />
          </div>
        </section>
      ))}
    </>
  );
}

export default TopupPage;

export async function getServerSideProps() {
  let topup_products = null;
  let products_by_category = null;

  try {
    const res = await api.get('/topup-products-with-categories');
    products_by_category = res?.data?.data?.categories || [];
    topup_products = res?.data?.data?.products || [];
  } catch (error) {
    products_by_category = null;
    try {
      const res2 = await api.get('/topupproduct');
      topup_products = res2?.data?.data || null;
    } catch (e) {
      topup_products = null;
    }
  }

  return {
    props: {
      topup_products,
      products_by_category,
    },
  };
}
