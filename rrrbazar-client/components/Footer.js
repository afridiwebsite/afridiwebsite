/*
 *
 * Title: Footer
 * Description: --
 * Author: AM Masum
 * Date: 25 November 2021 (Thursday)
 *
 */
import { useContext } from 'react';
import Link from 'next/link';
import { AiFillYoutube } from 'react-icons/ai';
import { BsTelephone, BsWhatsapp } from 'react-icons/bs';
import { FaFacebookF, FaTelegramPlane, FaEnvelope, FaHeadset } from 'react-icons/fa';
import { globalContext } from '../pages/_app';
import {
  __support_number,
  __email_name,
  __site_name_1,
  __site_name_2,
  __site_url,
  __whatsapp_support_number_link,
  __youtube_link,
  __facebook_link,
} from '../config/globalConfig';

function FooterColumn({ title, children }) {
  return (
    <div className="footer-col">
      <h3 className="footer-col-title">{title}</h3>
      <div className="footer-col-body">{children}</div>
    </div>
  );
}

function Footer() {
  const { siteSettings } = useContext(globalContext) || {};
  const siteName = siteSettings?.site_name || __site_name_2;

  return (
    <footer className="footer-root">
      <div className="footer-decor" aria-hidden="true">
        <span className="footer-blob footer-blob-a" />
        <span className="footer-blob footer-blob-b" />
      </div>

      <div className="container footer-main">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <FooterColumn
            title={
              <span className="footer-col-title-row">
                <FaHeadset className="footer-col-title-icon" />
                24/7 Customer Support
              </span>
            }
          >
            <a
              href={'tel:' + __support_number}
              className="footer-support-card footer-support-card--phone"
            >
              <div className="footer-support-icon">
                <BsTelephone size={18} />
              </div>
              <div className="footer-support-text">
                <div className="footer-support-label">Call us anytime</div>
                <div className="footer-support-value">{__support_number}</div>
              </div>
              <span className="footer-support-arrow" aria-hidden="true">→</span>
            </a>
            <a
              href={__whatsapp_support_number_link}
              target="_blank"
              rel="noreferrer"
              className="footer-support-card footer-support-card--whatsapp"
            >
              <div className="footer-support-icon">
                <BsWhatsapp size={18} />
              </div>
              <div className="footer-support-text">
                <div className="footer-support-label">Chat on WhatsApp</div>
                <div className="footer-support-value">{__support_number}</div>
              </div>
              <span className="footer-support-arrow" aria-hidden="true">→</span>
            </a>
            <a
              href={`mailto:${__email_name}`}
              className="footer-support-card footer-support-card--mail"
            >
              <div className="footer-support-icon">
                <FaEnvelope size={16} />
              </div>
              <div className="footer-support-text">
                <div className="footer-support-label">Email support</div>
                <div className="footer-support-value">{__email_name}</div>
              </div>
              <span className="footer-support-arrow" aria-hidden="true">→</span>
            </a>
          </FooterColumn>

          <FooterColumn title="Information">
            <Link href="/terms-condition">
              <a className="footer-link">Terms &amp; Conditions</a>
            </Link>
            <Link href="/privacy-policy">
              <a className="footer-link">Privacy Policy</a>
            </Link>
            <Link href="/refund-return-policy">
              <a className="footer-link">Refund Policy</a>
            </Link>
            <Link href="/contact-us">
              <a className="footer-link">Contact Us</a>
            </Link>
          </FooterColumn>

          <FooterColumn title="Stay Connected">
            <div className="footer-brand">{siteName}</div>
            <p className="footer-brand-sub">
              Follow us for drops, tournaments and exclusive coin rewards.
            </p>
            <div className="footer-socials">
              <a
                href={__facebook_link}
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="footer-social footer-social--facebook"
              >
                <FaFacebookF size={15} />
              </a>
              <a
                href={__youtube_link}
                target="_blank"
                rel="noreferrer"
                aria-label="YouTube"
                className="footer-social footer-social--youtube"
              >
                <AiFillYoutube size={17} />
              </a>
              <a
                href="https://t.me/"
                target="_blank"
                rel="noreferrer"
                aria-label="Telegram"
                className="footer-social footer-social--telegram"
              >
                <FaTelegramPlane size={15} />
              </a>
            </div>
          </FooterColumn>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container py-4 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="footer-bottom-text">
            © {new Date().getFullYear()} {siteName}. All rights reserved.
          </p>
          <p className="footer-bottom-text">
            Built with{' '}
            <a className="footer-bottom-link" rel="noreferrer" href={__site_url}>
              {__site_name_1}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
