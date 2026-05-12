/*
 *
 * Title: Product
 * Description: --
 * Author: Saymon
 * Date: 25 November 2021 (Thursday)
 *
 */
import Link from 'next/link';
import { imgPath } from '/helpers/helpers';

function Product({ title, product }) {
  return (
    <div className="_product_wrapper">
      <Link href={`/product/${product.id}`}>
        <a>
          <img
            alt={title}
            src={imgPath(product.image)}
            className="bg-gray-100 w-[60%] mx-auto h-auto object-cover"
          />
          {/* <img src="/game.jpg" className="w-full h-auto object-cover" alt="" /> */}
          <div className="py-2.5 px-3">
            <h6 className="_h6 font-semibold !text-sm line-clamp-2">{title}</h6>
            <p className="_subtitle2 !text-primary-600 mt-1 font-semibold">
              ৳ {product.sale_price}
            </p>
          </div>
        </a>
      </Link>
    </div>
  );
}

export default Product;
