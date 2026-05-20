/*
 *
 * Title: MobileSidebar
 * Description: Enhanced mobile sidebar with a colorful boxed design.
 * Author: Saymon
 * Date: 25 November 2021 (Thursday)
 *
 */
import { useRouter } from 'next/dist/client/router';
import { useContext, useEffect } from 'react';
import Link from 'next/link';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import routes from '../config/routes';
import Devider from './Devider';
import navlinks from '../config/navlinks';
import { globalContext } from '../pages/_app';

function MobileSidebar({ isOpenSidebar, setIsOPenSidebar }) {
  const { isAuth, signOut, authUser } = useContext(globalContext);
  const router = useRouter();

  // Close Sidebar
  const closeSidebar = (e) =>
    e?.target?.id === 'sidebar_overly' && setIsOPenSidebar(false);

  const closeSidebarForcely = () => setIsOPenSidebar(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = isOpenSidebar ? 'hidden' : 'auto';
  }, [isOpenSidebar]);

  const schemes = ['blue', 'emerald', 'indigo', 'amber', 'purple', 'rose', 'sky', 'teal'];

  return (
    <>
      <div
        onClick={closeSidebar}
        id="sidebar_overly"
        className={`_absolute_full fixed z-[999999999] bg-black/60 duration-150 ${
          isOpenSidebar
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none delay-150'
        }`}
      >
        <div
          className={`absolute right-0 w-[80%] sm:w-[300px] bg-white h-full overflow-auto duration-150 shadow-2xl ${
            isOpenSidebar ? 'translate-x-0 delay-150' : 'translate-x-full'
          }`}
        >
          {/* Header / User Profile */}
          <div className="px-5 py-6 bg-gray-50/50">
            {isAuth ? (
              <div className="flex gap-4 items-center">
                <Avatar
                  src={authUser?.avatar || null}
                  text={authUser?.username?.[0] || 'U'}
                  size={60}
                  className="bg-primary-100 text-primary-600 ring-4 ring-white shadow-sm"
                />
                <div className="overflow-hidden">
                  <h6 className="text-lg font-bold text-gray-800 line-clamp-1">
                    {authUser?.username}
                  </h6>
                  <p className="text-sm text-gray-500 truncate">
                    {authUser?.email}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <h6 className="text-lg font-bold text-gray-800">Welcome Guest</h6>
                <p className="text-sm text-gray-500 mb-2">Login to access more features</p>
                <Button
                  text="Login Now"
                  className="bg-primary-500 hover:bg-primary-600 text-white font-bold py-2.5 px-6 rounded-xl w-full shadow-lg shadow-primary-500/25 transition-all active:scale-95"
                  onClick={() => {
                    closeSidebarForcely();
                    router.push(routes.login.name);
                  }}
                />
              </div>
            )}
          </div>

          <div className="px-4 py-6">
            <h6 className="px-1 mb-4 text-xs font-bold uppercase tracking-widest text-gray-400">
              Menu Navigation
            </h6>
            
            <div className="grid grid-cols-1 gap-3">
              {navlinks.map((navLink, index) => {
                const {
                  icon,
                  disabled_for_mobile_sidebar,
                  text,
                  link,
                  component,
                  auth,
                } = navLink;

                if (disabled_for_mobile_sidebar) return null;
                if (auth !== undefined && auth !== isAuth) return null;
                
                if (component) return <div key={index} className="my-1">{component}</div>;

                const scheme = schemes[index % schemes.length];

                return (
                  <Link key={index} href={link || '#'}>
                    <a 
                      onClick={closeSidebarForcely}
                      className={`mobile-sidebar-box mobile-sidebar-box--${scheme}`}
                    >
                      <div className="mobile-sidebar-icon-wrap">
                        {icon}
                      </div>
                      <span className="font-bold text-sm tracking-wide">{text}</span>
                    </a>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default MobileSidebar;