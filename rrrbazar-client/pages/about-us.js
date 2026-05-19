import Head from 'next/head';
import { useContext } from 'react';
import { FaShieldAlt, FaBolt, FaUserCheck, FaGamepad } from 'react-icons/fa';
import { __page_title_end, __site_name_1 } from '../config/globalConfig';
import { globalContext } from './_app';

function AboutUsPage() {
  const { siteSettings } = useContext(globalContext) || {};
  const siteName = siteSettings?.site_name || __site_name_1;

  return (
    <>
      <Head>
        <title>About Us {__page_title_end}</title>
      </Head>
      
      <section className="container my-12">
        <div className="contact-page animate-fade-in-up">
          <div className="text-center mb-16">
            <h1 className="legal-page-title mb-4">About {siteName}</h1>
            <p className="_body1 max-w-2xl mx-auto">
              Your trusted partner for all gaming needs. We provide the fastest and most secure 
              top-up services for your favorite mobile and PC games.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <h2 className="_h2 mb-6">Our Mission</h2>
              <p className="_body1 mb-4">
                At {siteName}, our mission is simple: to provide gamers in Bangladesh and beyond with a seamless, 
                secure, and instant way to recharge their favorite games. We understand the thrill of gaming 
                and the frustration of waiting for credits.
              </p>
              <p className="_body1">
                Whether it&apos;s Free Fire Diamonds, PUBG Mobile UC, or any other in-game currency, we strive to 
                be the bridge that keeps you in the game with zero downtime.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <FaBolt size={24} />
                </div>
                <h4 className="font-bold mb-1">Instant</h4>
                <p className="text-xs text-gray-500">Fast delivery</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <FaShieldAlt size={24} />
                </div>
                <h4 className="font-bold mb-1">Secure</h4>
                <p className="text-xs text-gray-500">100% safe pay</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <FaUserCheck size={24} />
                </div>
                <h4 className="font-bold mb-1">Reliable</h4>
                <p className="text-xs text-gray-500">Trusted service</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <FaGamepad size={24} />
                </div>
                <h4 className="font-bold mb-1">Support</h4>
                <p className="text-xs text-gray-500">24/7 Gaming</p>
              </div>
            </div>
          </div>

          <div className="_order_box_wrapper p-8 md:p-12 text-center bg-white">
            <h2 className="_h2 mb-6">Why Choose Us?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
              <div>
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">1</span>
                  Best Prices
                </h3>
                <p className="text-sm text-gray-600">
                  We offer the most competitive rates in the market, ensuring you get the most value for your money.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">2</span>
                  Easy Payments
                </h3>
                <p className="text-sm text-gray-600">
                  Pay using bKash, Nagad, Rocket, or your RRR-Bazar wallet. Our checkout process is smooth and hassle-free.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">3</span>
                  Expert Support
                </h3>
                <p className="text-sm text-gray-600">
                  Our dedicated support team is available via WhatsApp and Telegram to assist you with any issues.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-20 text-center">
            <h2 className="_h3 mb-4">Join our community</h2>
            <p className="_body1 mb-8 max-w-xl mx-auto">
              Thousands of gamers trust {siteName} for their daily recharges. 
              Join us and experience the difference.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

export default AboutUsPage;
