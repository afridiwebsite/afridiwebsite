import { useContext, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  AiOutlineDollarCircle,
  AiOutlineHome,
  AiOutlineUser,
} from 'react-icons/ai';
import { GiShoppingCart } from 'react-icons/gi';
import { MdBorderAll } from 'react-icons/md';
import { FaTelegramPlane } from 'react-icons/fa';
import routes from '../config/routes';
import { globalContext } from '../pages/_app';

// Build a t.me link from an admin-provided value.
function buildTelegramLink(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const stripped = raw.replace(/^@/, '');
  const digits = stripped.replace(/[^0-9]/g, '');
  const looksLikePhone = /^\+?\d[\d\s-]*$/.test(stripped);
  if (looksLikePhone && digits) return `https://t.me/+${digits}`;
  return `https://t.me/${stripped}`;
}

// Mobile-only bottom app bar. Always visible on mobile to provide
// consistent navigation and support access.
function MobileAppBar() {
  const router = useRouter();
  const { isAuth, siteSettings } = useContext(globalContext) || {};

  // Toggle a body class so the CSS can add page padding on mobile.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.add('has-mobile-appbar');
    return () => document.body.classList.remove('has-mobile-appbar');
  }, []);

  const telegramRaw = siteSettings?.telegram_number || '';
  const telegramLink = buildTelegramLink(telegramRaw);

  const items = isAuth
    ? [
        { href: '/', label: 'Home', icon: AiOutlineHome, scheme: 'blue' },
        { href: routes.profile.name, label: 'Profile', icon: AiOutlineUser, scheme: 'indigo' },
        
        { href: routes.myOrder.name, label: 'Orders', icon: MdBorderAll, scheme: 'amber' },
        { href: routes.spin.name, label: 'Spin', icon: GiShoppingCart, scheme: 'purple' },
      ]
    : [
        { href: '/', label: 'Home', icon: AiOutlineHome, scheme: 'blue' },
        { href: routes.shop.name, label: 'Shop', icon: GiShoppingCart, scheme: 'indigo' },
        { href: routes.tournament.name, label: 'Play', icon: MdBorderAll, scheme: 'emerald' },
        
        { href: routes.login.name, label: 'Login', icon: AiOutlineUser, scheme: 'purple' },
      ];

  // Pick the single best-matching item: the one whose href is the longest
  // prefix of the current pathname.
  const activeHref = items
    .filter(
      ({ href }) =>
        router.pathname === href || router.pathname.startsWith(href + '/'),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className="mobile-appbar" aria-label="Quick navigation">
      <ul className="mobile-appbar-list">
        {items.map(({ href, label, icon: Icon, scheme }) => {
          const isActive = href === activeHref;
          return (
            <li key={href}>
              <Link href={href}>
                <a
                  className={`mobile-appbar-item mobile-appbar-item--${scheme} ${isActive ? 'is-active' : ''}`}
                >
                  <div className="mobile-appbar-icon-box">
                    <Icon size={20} />
                  </div>
                  <span>{label}</span>
                </a>
              </Link>
            </li>
          );
        })}
        {telegramLink && (
          <li>
            <a
              href={telegramLink}
              target="_blank"
              rel="noreferrer"
              className="mobile-appbar-item mobile-appbar-item"
              aria-label="Message Support"
            >
              <div className="mobile-appbar-icon-box">
                <FaTelegramPlane size={20} />
              </div>
              <span>Message</span>
            </a>
          </li>
        )}
      </ul>
    </nav>
  );
}

export default MobileAppBar;