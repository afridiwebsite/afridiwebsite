import {
  __site_name_1,
  __site_name_2
} from '../config/globalConfig';

function WhyChoose() {
  return (
    <>
      <section className="bg-gray-50/40 py-10">
        <div className="container">
          <h2 className="shop-about__header text-2xl pt-2 pb-3">
            Why top up games on {__site_name_1}?
          </h2>
          <div className="shop-about__short-description">
            Millions of gamers count on {__site_name_1} every month for a seamless
            purchase experience when buying game credits or vouchers – No
            registration or log-in is required, and purchases are added to your
            game account instantly! Top-up your game credit now!
          </div>
          <div className="shop-about__card-group">
            <div className="shop-about__card-container">
              <div className="shop-about__card-icon-container">
                <img
                  src="https://cdn1.codashop.com/S/content/mobile/images/reskin/usp-icons/pay_in_seconds_astral.png"
                  alt="Quick icon"
                  className="shop-about__card-icon"
                />
              </div>
              <div className="shop-about__card-content">
                <h4 className="shop-about__card-title">Easy and Fast</h4>
                <div className="shop-about__card-description">
                  It only takes a few seconds to complete a purchase on
                  {__site_name_1}.
                </div>
              </div>
            </div>
            <div className="shop-about__card-container">
              <div className="shop-about__card-icon-container">
                <img
                  src="https://cdn1.codashop.com/S/content/mobile/images/reskin/usp-icons/fast_delivery_astral.png"
                  alt="Delivery icon"
                  className="shop-about__card-icon"
                />
              </div>
              <div className="shop-about__card-content">
                <h4 className="shop-about__card-title">Instant Delivery</h4>
                <div className="shop-about__card-description">
                  When you top-up on {__site_name_1}, your purchase is delivered
                  directly to your game account as soon as your payment is
                  complete.
                </div>
              </div>
            </div>
            <div className="shop-about__card-container">
              <div className="shop-about__card-icon-container">
                <img
                  src="https://cdn1.codashop.com/S/content/mobile/images/reskin/usp-icons/best_payment_method_astral.png"
                  alt="Payments icon"
                  className="shop-about__card-icon"
                />
              </div>
              <div className="shop-about__card-content">
                <h4 className="shop-about__card-title">
                  Convenient Payment Methods
                </h4>
                <div className="shop-about__card-description">
                  To ensure your convenience, we have partnered with the most
                  Bkash, Nagad, Rocket, Upay.
                </div>
              </div>
            </div>
            <div data-v-2c8a6725="" className="shop-about__card-container">
              <div className="shop-about__card-icon-container">
                <img
                  src="https://cdn1.codashop.com/S/content/mobile/images/reskin/usp-icons/time_astral.png"
                  alt="Customer support"
                  className="shop-about__card-icon"
                />
              </div>
              <div className="shop-about__card-content">
                <h4 className="shop-about__card-title">Customer Support</h4>
                <div className="shop-about__card-description">
                  Our support team is available from 9 am to 12 am, 7 days a
                  week. Submit your queries SelfGameShop@gmail.com and we will
                  get right back to you!
                </div>
              </div>
            </div>
            <div className="shop-about__card-container">
              <div className="shop-about__card-icon-container">
                <img
                  src="https://cdn1.codashop.com/S/content/mobile/images/reskin/usp-icons/promo_astral.png"
                  alt="Promo icon"
                  className="shop-about__card-icon"
                />
              </div>
              <div className="shop-about__card-content">
                <h4 className="shop-about__card-title">Exciting Promotions</h4>
                <div className="shop-about__card-description">
                  Keep a lookout for the best deals for your favourite games
                  with {__site_name_1} promotions.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default WhyChoose;
