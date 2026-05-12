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
import { FaFacebookF, FaTelegramPlane } from 'react-icons/fa';
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
    <div>
      <h3 className="text-xs font-bold tracking-[3px] uppercase text-white/80 mb-4">
        {title}
      </h3>
      <div className="flex flex-col gap-2.5 text-sm text-white/70">{children}</div>
    </div>
  );
}

function Footer() {
  const { siteSettings } = useContext(globalContext) || {};
  const siteName = siteSettings?.site_name || __site_name_2;

  return (
    <footer
      className="mt-auto text-white"
      style={{
        background:
          'linear-gradient(to bottom, var(--theme-secondary, #1B2A4A) 20%, var(--theme-primary, #3856B5))',
      }}
    >
      <div className="container py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <FooterColumn title="Customer Support">
            <a
              href={'tel:' + __support_number}
              className="flex items-center gap-3 hover:text-white"
            >
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                <BsTelephone size={16} />
              </div>
              <div>
                <div className="text-xs text-white/50">Call us</div>
                <div className="text-sm font-semibold text-white">
                  {__support_number}
                </div>
              </div>
            </a>
            <a
              href={__whatsapp_support_number_link}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 hover:text-white"
            >
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                <BsWhatsapp size={16} />
              </div>
              <div>
                <div className="text-xs text-white/50">WhatsApp</div>
                <div className="text-sm font-semibold text-white">
                  {__support_number}
                </div>
              </div>
            </a>
          </FooterColumn>

          <FooterColumn title="Information">
            <Link href="/terms-condition">
              <a className="hover:text-white">Terms &amp; Conditions</a>
            </Link>
            <Link href="/privacy-policy">
              <a className="hover:text-white">Privacy Policy</a>
            </Link>
            <Link href="/refund-return-policy">
              <a className="hover:text-white">Refund Policy</a>
            </Link>
            <Link href="/contact-us">
              <a className="hover:text-white">Contact Us</a>
            </Link>
            <Link href="/coins">
              <a className="hover:text-white">My Coins</a>
            </Link>
          </FooterColumn>

          <FooterColumn title="Stay Connected">
            <div className="text-white font-semibold">{siteName}</div>
            <div className="text-white/60 text-sm">
              <a href={`mailto:${__email_name}`}>{__email_name}</a>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <a
                href={__facebook_link}
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              >
                <FaFacebookF size={14} />
              </a>
              <a
                href={__youtube_link}
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              >
                <AiFillYoutube size={16} />
              </a>
              <a
                href="https://t.me/"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              >
                <FaTelegramPlane size={14} />
              </a>
            </div>
          </FooterColumn>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container py-4 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-xs text-white/60 text-center md:text-left">
            © {new Date().getFullYear()} {siteName}. All rights reserved.
          </p>
          <p className="text-xs text-white/60">
            Built with{' '}
            <a
              className="text-white/80 hover:text-white"
              rel="noreferrer"
              href={__site_url}
            >
              {__site_name_1}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
