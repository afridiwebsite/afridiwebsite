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
import { FaTelegramPlane, FaEnvelope, FaYoutube } from 'react-icons/fa';
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

// Section title with the small underline accent from the reference.
function FooterColTitle({ children }) {
  return (
    <h3 className="footer-col-title">
      <span>{children}</span>
      <span className="footer-col-title-bar" aria-hidden="true" />
    </h3>
  );
}

function FooterColumn({ title, children }) {
  return (
    <div className="footer-col">
      <FooterColTitle>{title}</FooterColTitle>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          <FooterColumn title="Customer Support">
            {telegramLink && (
              <a
                href={telegramLink}
                target="_blank"
                rel="noreferrer"
                className="footer-support-card"
              >
                <span className="footer-support-icon footer-support-icon--telegram">
                  <FaTelegramPlane size={18} />
                </span>
                <div className="footer-support-text">
                  <div className="footer-support-label">9AM – 11PM Daily</div>
                  <div className="footer-support-value">Telegram Support</div>
                </div>
              </a>
            )}
            {telegramLink && (
              <a
                href={telegramLink}
                target="_blank"
                rel="noreferrer"
                className="footer-support-card"
              >
                <span className="footer-support-icon footer-support-icon--telegram">
                  <FaTelegramPlane size={18} />
                </span>
                <div className="footer-support-text">
                  <div className="footer-support-label">Telegram Group</div>
                  <div className="footer-support-value">Join Now</div>
                </div>
              </a>
            )}
          </FooterColumn>

          <FooterColumn title="Information">
            <div className="footer-info-grid">
              <Link href="/terms-condition">
                <a className="footer-link">Terms &amp; Conditions</a>
              </Link>
              <Link href="/contact-us">
                <a className="footer-link">Contact Us</a>
              </Link>
              <Link href="/privacy-policy">
                <a className="footer-link">Privacy Policy</a>
              </Link>
              <Link href="/about-us">
                <a className="footer-link">About Us</a>
              </Link>
              <Link href="/refund-return-policy">
                <a className="footer-link">Refund &amp; Returns</a>
              </Link>
            </div>
          </FooterColumn>

          <FooterColumn title="Stay Connected">
            <div className="footer-connect-card">
              <div className="footer-brand">{siteName}</div>
              {supportEmail && (
                <a
                  href={`mailto:${supportEmail}`}
                  className="footer-connect-row"
                >
                  <FaEnvelope size={14} className="footer-connect-row-icon" />
                  <span className="footer-connect-row-label">Email:</span>
                  <span className="footer-connect-row-value">
                    {supportEmail}
                  </span>
                </a>
              )}
              {youtubeLink && (
                <div className="footer-socials">
                  <a
                    href={youtubeLink}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="YouTube"
                    className="footer-social footer-social--youtube"
                  >
                    <FaYoutube size={18} />
                  </a>
                </div>
              )}
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
