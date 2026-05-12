/*
 *
 * Title: MobileSidebar
 * Description: --
 * Author: Saymon
 * Date: 25 November 2021 (Thursday)
 *
 */
import { useRouter } from 'next/dist/client/router';
import { useContext, useEffect } from 'react';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import routes from '../config/routes';
import Devider from './Devider';
import UserMenuList from './user-popover-menu/UserMenuList';
import navlinks from '/config/navlinks';
import { globalContext } from '/pages/_app';

function MobileSidebar({ isOpenSidebar, setIsOPenSidebar }) {
  const { isAuth, signOut, authUser } = useContext(globalContext);
  const router = useRouter();
  // Close Sidebar
  const closeSidebar = (e) =>
    e?.target?.id === 'sidebar_overly' && setIsOPenSidebar(false);

  const closeSidebarForcely = () => setIsOPenSidebar(false);

  useEffect(() => {
    document.body.style.overflow = isOpenSidebar ? 'hidden' : 'auto';
  }, [isOpenSidebar]);

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
          className={`w-[80%] sm:w-[300px] bg-white h-full overflow-auto duration-150 ${
            isOpenSidebar ? 'translate-x-0 delay-150' : '-translate-x-full'
          }`}
        >
          <div className="xxs:flex justify-between items-center px-4 py-3">
            {isAuth ? (
              <>
                <div className="flex gap-3 items-center overflow-hidden">
                  <Avatar
                    src={authUser?.avatar || null}
                    text={authUser?.username[0]}
                    size={50}
                  />
                  <div className="pr-1.5 flex-grow-0">
                    <h6 className="_h6 line-clamp-1">{authUser?.username}</h6>
                    <p className="_body1 text-sm overflow-hidden break-all">
                      {authUser?.email}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end mt-2 xxs:block xxs:mt-0">
                  <Button
                    text="Logout"
                    onClick={() => {
                      closeSidebarForcely();
                      signOut();
                    }}
                    className="small"
                  />
                </div>
              </>
            ) : (
              <>
                <Button
                  text="Login"
                  onClick={() => {
                    closeSidebarForcely();
                    router.push(routes.login.name);
                  }}
                />
              </>
            )}
          </div>
          <Devider />
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
            if (component)
              return (
                <div key={index} onClick={closeSidebarForcely}>
                  {component}
                </div>
              );
            return (
              <div onClick={closeSidebarForcely} key={index}>
                <UserMenuList icon={icon} text={text} link={link} />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default MobileSidebar;
