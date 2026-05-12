/*
 *
 * Title: Header
 * Description: --
 * Author: Saymon
 * Date: 25 November 2021 (Thursday)
 *
 */
import { useRouter } from 'next/dist/client/router';
import Link from 'next/link';
import { useContext, useState } from 'react';
import { HiMenuAlt3 } from 'react-icons/hi';
import Button from '../components/Button';
import navlinks from '../config/navlinks';
import routes from '../config/routes';
import { globalContext } from '../pages/_app';
import MobileSidebar from './MobileSidebar';
import NoticePopup from './notice-popup/NoticePopup';
import UserPopoverHead from './user-popover-menu/UserPopoverHead';
import UserPopoverMenu from './user-popover-menu/UserPopoverMenu';
import {
  __site_name_1,
  __site_name_2,
} from '../config/globalConfig';

function Header() {
  const router = useRouter();
  const { isAuth, authUser, siteSettings } = useContext(globalContext);
  const [isOpenSidebar, setIsOpenSidebar] = useState(false);

  const openSidebar = () => setIsOpenSidebar(true);

  const logoSrc = siteSettings?.logo_full_url || '/logo.png';
  const siteName = siteSettings?.site_name || __site_name_2;

  return (
    <>
      <NoticePopup />
      <MobileSidebar
        isOpenSidebar={isOpenSidebar}
        setIsOPenSidebar={setIsOpenSidebar}
      />
      <header className="theme-header bg-white border-b border-gray-200 sticky top-0 left-0 w-full z-[100] transition-shadow duration-200">
        <div className="container">
          <div className="flex items-center justify-between py-3 md:py-2.5 gap-3">
            {/* Logo --Start-- */}
            <div className="flex items-center gap-2 transition-transform duration-200 hover:scale-[1.02]">
              <Link href="/">
                <a className="flex items-center gap-2">
                  <img
                    src={logoSrc}
                    alt={siteName}
                    className="h-8 md:h-10 w-auto"
                  />
                </a>
              </Link>
            </div>
            {/* Logo --End-- */}

            {/* Header Search Bar --Start-- Only visible in desktop */}
            <div className="hidden lg:block flex-grow lg:px-10">
              <form>
                <div className="flex items-center rounded-full overflow-hidden bg-white border border-gray-200 focus-within:border-gray-300 transition-colors max-w-[600px] m-auto">
                  <input
                    type="text"
                    placeholder="Search games and packages…"
                    className="flex-grow text-sm font-medium py-2 px-4 outline-none bg-transparent"
                  />
                  <button
                    type="submit"
                    className="theme-bg-primary text-white text-sm font-semibold px-5 py-2 rounded-full m-0.5 transition-transform duration-150 active:scale-95"
                  >
                    Search
                  </button>
                </div>
              </form>
            </div>
            {/* Header Search Bar --End-- */}

            {/* Nav --Start-- */}
            <nav className="hidden md:block">
              <ul className="flex items-center justify-end gap-2">
                {navlinks.map((navLink, index) => {
                  const { disabled_for_desktop, component, text, link, auth } =
                    navLink;

                  if (disabled_for_desktop) return null;
                  if (auth !== undefined && auth !== isAuth) return null;
                  
                  // Skip login/register/user-menu as we handle them separately now
                  if (link === routes.login.name || link === routes.register.name || text === 'Login' || text === 'Register') return null;
                  if (navLink.isUserMenu) return null;

                  if (component) return <li key={index}>{component}</li>;
                  if (text && link)
                    return (
                      <li key={index}>
                        <Link href={link || '#'}>
                          <a
                            className={`_body2 font-semibold text-gray-500 hover:text-primary-600 duration-150 ${
                              router.route === link ? 'text-primary-600' : ''
                            }`}
                          >
                            {text}
                          </a>
                        </Link>
                      </li>
                    );

                  return null;
                })}
              </ul>
            </nav>
            {/* Nav --End-- */}

            {/* User Avatar or hamburger menu --Start-- */}
            <div className="flex items-center gap-2 md:gap-3">
              {isAuth ? (
                <>
                  <div className="hidden md:block">
                    <UserPopoverMenu />
                  </div>
                  <div className="md:hidden" onClick={openSidebar}>
                    <UserPopoverHead />
                  </div>
                </>
              ) : (
                <>
                  <Link href={routes.register.name}>
                    <a className="hidden sm:block">
                      <Button className="bg-primary-500 hover:bg-primary-600 text-white font-bold py-2 px-4 rounded small">
                        Register
                      </Button>
                    </a>
                  </Link>
                  <Link href={routes.login.name}>
                    <a>
                      <Button className="bg-transparent hover:bg-primary-50 text-primary-700 font-semibold py-2 px-4 border border-primary-500 hover:border-transparent rounded small">
                        Login
                      </Button>
                    </a>
                  </Link>
                  <div className="md:hidden ml-1" onClick={openSidebar}>
                    <HiMenuAlt3 size={28} className="text-gray-600 cursor-pointer" />
                  </div>
                </>
              )}
            </div>
            {/* User Avatar or hamburger menu --End-- */}
          </div>
        </div>
      </header>
    </>
  );
}

export default Header;
