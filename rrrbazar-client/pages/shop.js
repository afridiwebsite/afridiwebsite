import Head from 'next/head';
import api from '../api/api';
import ActivityIndicator from '../components/ActivityIndicator';
import Product from '../components/product/Product';
import { __page_title_end } from '../config/globalConfig';
import { hasData } from '../helpers/helpers';

function ShopPage({ products }) {
  return (
    <>
      <Head>
        <title>Shop {__page_title_end}</title>
      </Head>
      <section className="container my-7">
        <h3 className="_section_title">All Products</h3>
        <ActivityIndicator data={products} error={!products} />
        {hasData(products) && (
          <div className="_grid_2_4_5">
            {products.map((e) => (
              <Product key={e} title={e.name} product={e} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export default ShopPage;

export async function getServerSideProps() {
  let products = null;
  // Fetching Products
  try {
    const productRes = await api.get('/products');
    products = productRes?.data?.data;
  } catch (error) {
    products = null;
  }

  return {
    props: {
      products,
    },
  };
}
