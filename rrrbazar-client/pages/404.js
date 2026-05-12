import Head from 'next/head';
import Link from 'next/link';
import Button from '../components/Button';
import { __page_title_end } from '../config/globalConfig';

function PageNotFound() {
  return (
    <>
      <Head>
        <title>404 | Not Found {__page_title_end}</title>
      </Head>
      <div className="w-9/12 m-auto py-16 flex-grow flex items-center justify-center">
        <div className="bg-white overflow-hidden sm:rounded-lg pb-8">
          <div className=" text-center pt-8">
            <h1 className="text-5xl md:text-9xl font-bold text-primary-400">
              404
            </h1>
            <h1 className="text-3xl md:text-4xl font-medium capitalize py-5">
              oops! Page not found
            </h1>
            <div>
              <Link href="/">
                <a>
                  <Button className="large">Go Home</Button>
                </a>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default PageNotFound;
