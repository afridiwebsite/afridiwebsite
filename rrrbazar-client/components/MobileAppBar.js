import { useContext, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  AiOutlineDollarCircle,
  AiOutlinePoweroff,
  AiOutlineTransaction,
  AiOutlineUser,
} from 'react-icons/ai';
import { GiShoppingCart } from 'react-icons/gi';
import { MdBorderAll } from 'react-icons/md';
import routes from '../config/routes';
import { globalContext } from '../pages/_app';

// Mobile-only bottom app bar. Mirrors the items from the desktop user
// popover so logged-in users get one-tap access on phones.
function MobileAppBar() {
  const router = useRouter();
  const { isAuth, signOut } = useContext(globalContext) || {};

  // Toggle a body class so the CSS can shift the Telegram FAB upward and add
  // page padding only when the bar is actually rendered.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isAuth) document.body.classList.add('has-mobile-appbar');
    else document.body.classList.remove('has-mobile-appbar');
    return () => document.body.classList.remove('has-mobile-appbar');
  }, [isAuth]);

  if (!isAuth) return null;

  const items = [
    { href: routes.profile.name, label: 'Profile', icon: AiOutlineUser },
    { href: routes.addMoney.name, label: 'Wallet', icon: AiOutlineDollarCircle },
    { href: routes.myOrder.name, label: 'Orders', icon: MdBorderAll },
    { href: routes.myTransaction.name, label: 'Txns', icon: AiOutlineTransaction },
    { href: routes.spin.name, label: 'Spin', icon: GiShoppingCart },
  ];

  // Pick the single best-matching item: the one whose href is the longest
  // prefix of the current pathname. This avoids "Profile" lighting up at the
  // same time as "Orders" or "Txns" on /profile/order, /profile/transaction.
  const activeHref = items
    .filter(({ href }) =>
      router.pathname === href || router.pathname.startsWith(href + '/'),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className="mobile-appbar" aria-label="Quick navigation">
      <ul className="mobile-appbar-list">
        {items.map(({ href, label, icon: Icon }) => {
          const isActive = href === activeHref;
          return (
            <li key={href}>
              <Link href={href}>
                <a className={`mobile-appbar-item ${isActive ? 'is-active' : ''}`}>
                  <Icon size={20} />
                  <span>{label}</span>
                </a>
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={signOut}
            className="mobile-appbar-item mobile-appbar-item--btn"
            aria-label="Logout"
          >
            <AiOutlinePoweroff size={20} />
            <span>Logout</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}

export default MobileAppBar;
