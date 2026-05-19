import Head from 'next/head';
import { useContext } from 'react';
import { FaWhatsapp, FaTelegramPlane, FaEnvelope, FaFacebook, FaYoutube } from 'react-icons/fa';
import Button from '../components/Button';
import {
  __whatsapp_support_number_link,
  __support_number,
  __facebook_link,
  __youtube_link,
  __email_name,
  __page_title_end,
  __site_time
} from '../config/globalConfig';
import { globalContext } from './_app';

function ContactUsPage() {
  const { siteSettings } = useContext(globalContext) || {};
  const supportEmail = siteSettings?.support_email || __email_name;
  const whatsappLink = __whatsapp_support_number_link;
  const telegramRaw = siteSettings?.telegram_number || '';
  
  // Reuse the logic from Footer or just use a simple t.me link if available
  const telegramLink = telegramRaw ? (telegramRaw.startsWith('http') ? telegramRaw : `https://t.me/${telegramRaw.replace('@', '')}`) : '';

  return (
    <>
      <Head>
        <title>Contact Us {__page_title_end}</title>
      </Head>
      
      <section className="container my-10">
        <div className="contact-page animate-fade-in-up">
          <div className="text-center mb-12">
            <h1 className="legal-page-title mb-4">Contact Us</h1>
            <p className="_body1 max-w-xl mx-auto">
              Have questions or need help? Our support team is here for you. 
              Contact us through any of the channels below and we'll get back to you as soon as possible.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-600 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Support Hours: {__site_time}
            </div>
          </div>

          <div className="contact-grid">
            {/* WhatsApp Card */}
            <div className="contact-card">
              <div className="contact-card-icon contact-card-icon--whatsapp">
                <FaWhatsapp />
              </div>
              <h3 className="contact-card-title">WhatsApp Support</h3>
              <p className="contact-card-text">
                Fastest way to get help with your orders and payments.
              </p>
              <a href={whatsappLink} target="_blank" rel="noreferrer" className="contact-card-btn">
                <Button className="primary w-full">Message on WhatsApp</Button>
              </a>
            </div>

            {/* Telegram Card */}
            <div className="contact-card">
              <div className="contact-card-icon contact-card-icon--telegram">
                <FaTelegramPlane />
              </div>
              <h3 className="contact-card-title">Telegram Support</h3>
              <p className="contact-card-text">
                Join our telegram group for updates and quick support.
              </p>
              <a href={telegramLink || '#'} target="_blank" rel="noreferrer" className="contact-card-btn">
                <Button className="primary w-full" disabled={!telegramLink}>
                  Join Telegram
                </Button>
              </a>
            </div>

            {/* Email Card */}
            <div className="contact-card">
              <div className="contact-card-icon contact-card-icon--email">
                <FaEnvelope />
              </div>
              <h3 className="contact-card-title">Email Us</h3>
              <p className="contact-card-text">
                For business inquiries and formal support requests.
              </p>
              <a href={`mailto:${supportEmail}`} className="contact-card-btn">
                <Button className="outlined w-full">Send Email</Button>
              </a>
            </div>

            {/* Social Card */}
            <div className="contact-card">
              <div className="contact-card-icon contact-card-icon--social">
                <FaFacebook />
              </div>
              <h3 className="contact-card-title">Follow Us</h3>
              <p className="contact-card-text">
                Stay updated with our latest offers and gaming news.
              </p>
              <div className="flex gap-3 w-full mt-auto">
                <a href={__facebook_link} target="_blank" rel="noreferrer" className="flex-1">
                  <Button className="outlined w-full px-0"><FaFacebook size={18} /></Button>
                </a>
                <a href={__youtube_link} target="_blank" rel="noreferrer" className="flex-1">
                  <Button className="outlined w-full px-0 text-red-600"><FaYoutube size={18} /></Button>
                </a>
              </div>
            </div>
          </div>

          <div className="_order_box_wrapper mt-12 bg-white p-8 text-center">
            <h3 className="_h4 mb-4">Frequently Asked Questions</h3>
            <p className="_body2 mb-6">
              Check our Help Center for instant answers to common questions about top-ups, payments, and account security.
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
              <Button className="small outlined">How to Top Up?</Button>
              <Button className="small outlined">Payment Methods</Button>
              <Button className="small outlined">Order Status</Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default ContactUsPage;
