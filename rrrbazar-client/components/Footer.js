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
import { FaTelegramPlane, FaEnvelope, FaHeadset, FaYoutube } from 'react-icons/fa';
import { globalContext } from '../pages/_app';
import {
  __email_name,
  __site_name_1,
  __site_name_2,
  __site_url,
  __youtube_link,
} from '../config/globalConfig';

// Build a t.me link from an admin-provided value. Phone-like inputs (digits,
// optional leading +) become https://t.me/+<digits>; anything else is treated
// as a username (https://t.me/<value>).
function buildTelegramLink(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const stripped = raw.replace(/^@/, '');
  const digits = stripped.replace(/[^0-9]/g, '');
  const looksLikePhone = /^\+?\d[\d\s-]*$/.test(stripped);
  if (looksLikePhone && digits) return `https://t.me/+${digits}`;
  return `https://t.me/${stripped}`;
}

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
  const supportEmail = siteSettings?.support_email || __email_name;
  const telegramRaw = siteSettings?.telegram_number || '';
  const telegramLink = buildTelegramLink(telegramRaw);
  const youtubeLink = siteSettings?.youtube_link || __youtube_link || '';

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
            {telegramLink && (
              <a
                href={telegramLink}
                target="_blank"
                rel="noreferrer"
                className="footer-support-card footer-support-card--telegram"
              >
                <div className="footer-support-icon">
                  <FaTelegramPlane size={18} />
                </div>
                <div className="footer-support-text">
                  <div className="footer-support-label">Message on Telegram</div>
                  <div className="footer-support-value">{telegramRaw}</div>
                </div>
                <span className="footer-support-arrow" aria-hidden="true">→</span>
              </a>
            )}
            {supportEmail && (
              <a
                href={`mailto:${supportEmail}`}
                className="footer-support-card footer-support-card--mail"
              >
                <div className="footer-support-icon">
                  <FaEnvelope size={16} />
                </div>
                <div className="footer-support-text">
                  <div className="footer-support-label">Email support</div>
                  <div className="footer-support-value">{supportEmail}</div>
                </div>
                <span className="footer-support-arrow" aria-hidden="true">→</span>
              </a>
            )}
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
              Reach out on Telegram or drop us an email — we usually reply
              within minutes.
            </p>
            {youtubeLink && (
              <div className="footer-socials">
                <a
                  href={youtubeLink}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="YouTube"
                  className="footer-social footer-social--youtube"
                >
                  <FaYoutube size={17} />
                </a>
              </div>
            )}
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

      {/* Floating Telegram FAB — always visible on the storefront. */}
      {telegramLink && (
        <a
          href={telegramLink}
          target="_blank"
          rel="noreferrer"
          aria-label="Chat on Telegram"
          className="telegram-fab"
        >
          <FaTelegramPlane size={26} />
          <span className="telegram-fab-pulse" aria-hidden="true" />
        </a>
      )}
    </footer>
  );
}

export default Footer;
