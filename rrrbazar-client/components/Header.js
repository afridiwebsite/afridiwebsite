/*
 *
 * Title: Header
 * Description: --
 * Author: Saymon
 * Date: 25 November 2021 (Thursday)
 *
 */
import { useRouter } from "next/dist/client/router";
import Link from "next/link";
import { useContext, useEffect, useRef, useState } from "react";
import { HiMenuAlt3 } from "react-icons/hi";
import Button from "../components/Button";
import navlinks from "../config/navlinks";
import routes from "../config/routes";
import { globalContext } from "../pages/_app";
import MobileSidebar from "./MobileSidebar";
import NoticePopup from "./notice-popup/NoticePopup";
import UserPopoverHead from "./user-popover-menu/UserPopoverHead";
import UserPopoverMenu from "./user-popover-menu/UserPopoverMenu";
import { imgPath } from "../helpers/helpers";
import { searchGlobal } from "../api/api";
import { __site_name_1, __site_name_2 } from "../config/globalConfig";

const SEARCH_DEBOUNCE_MS = 220;
const SEARCH_MIN_CHARS = 1;

// Live search box that opens a dropdown menu with hits as the user types.
// Two buckets are shown — Products and Packages — plus a "View all results"
// link that routes to /search?q=…. Closes on outside-click and on submit.
function HeaderSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ products: [], packages: [] });
  const containerRef = useRef(null);
  const requestSeqRef = useRef(0);

  // Debounced fetch — bumps a sequence counter so out-of-order responses
  // can't overwrite a newer one's state.
  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < SEARCH_MIN_CHARS) {
      setResults({ products: [], packages: [] });
      setLoading(false);
      return undefined;
    }
    const mine = ++requestSeqRef.current;
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await searchGlobal(trimmed);
        if (mine !== requestSeqRef.current) return; // a newer request won
        const data = res?.data?.data || {};
        setResults({
          products: Array.isArray(data.products) ? data.products : [],
          packages: Array.isArray(data.packages) ? data.packages : [],
        });
      } catch (e) {
        if (mine === requestSeqRef.current)
          setResults({ products: [], packages: [] });
      } finally {
        if (mine === requestSeqRef.current) setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [q]);

  // Click-outside closes the dropdown.
  useEffect(() => {
    const onDoc = (e) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const onItemClick = () => {
    setOpen(false);
  };

  const total = results.products.length + results.packages.length;
  const showResults = open && q.trim().length >= SEARCH_MIN_CHARS;

  return (
    <div className="header-search" ref={containerRef}>
      <form onSubmit={onSubmit}>
        <div className="header-search-bar">
          <input
            type="text"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search games and packages…"
            className="header-search-input"
          />
          <button type="submit" className="header-search-btn">
            Search
          </button>
        </div>
      </form>

      {showResults && (
        <div className="header-search-menu animate-fade-in" role="listbox">
          {loading && <div className="header-search-empty">Searching…</div>}

          {!loading && total === 0 && (
            <div className="header-search-empty">
              No matches for <strong>{q}</strong>
            </div>
          )}

          {!loading && results.products.length > 0 && (
            <div className="header-search-group">
              <div className="header-search-group-title">Products</div>
              {results.products.map((p) => (
                <Link key={`p-${p.id}`} href={`/topup/${p.id}`}>
                  <a className="header-search-row" onClick={onItemClick}>
                    <img
                      src={p.logo_full_url || imgPath(p.logo)}
                      alt=""
                      className="header-search-row-img"
                    />
                    <div className="header-search-row-main">
                      <div className="header-search-row-name">{p.name}</div>
                      <div className="header-search-row-sub">Product</div>
                    </div>
                  </a>
                </Link>
              ))}
            </div>
          )}

          {!loading && results.packages.length > 0 && (
            <div className="header-search-group">
              <div className="header-search-group-title">Packages</div>
              {results.packages.map((pk) => (
                <Link key={`pk-${pk.id}`} href={`/topup/${pk.product_id}`}>
                  <a className="header-search-row" onClick={onItemClick}>
                    <img
                      src={pk.product_logo_full_url || imgPath(pk.product_logo)}
                      alt=""
                      className="header-search-row-img"
                    />
                    <div className="header-search-row-main">
                      <div className="header-search-row-name">{pk.name}</div>
                      <div className="header-search-row-sub">
                        {pk.product_name ? `${pk.product_name} · ` : ""}৳{" "}
                        {pk.price}
                      </div>
                    </div>
                  </a>
                </Link>
              ))}
            </div>
          )}

          {!loading && total > 0 && (
            <Link href={`/search?q=${encodeURIComponent(q.trim())}`}>
              <a className="header-search-all" onClick={onItemClick}>
                View all results for &ldquo;{q.trim()}&rdquo; →
              </a>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function Header() {
  const router = useRouter();
  const { isAuth, authUser, siteSettings } = useContext(globalContext);
  const [isOpenSidebar, setIsOpenSidebar] = useState(false);

  const openSidebar = () => setIsOpenSidebar(true);

  const logoSrc = siteSettings?.logo_full_url || "/logo.png";
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
              <HeaderSearch />
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
                  if (
                    link === routes.login.name ||
                    link === routes.register.name ||
                    text === "Login" ||
                    text === "Register"
                  )
                    return null;
                  if (navLink.isUserMenu) return null;

                  if (component) return <li key={index}>{component}</li>;
                  if (text && link)
                    return (
                      <li key={index}>
                        <Link href={link || "#"}>
                          <a
                            className={`_body2 font-semibold text-gray-500 hover:text-primary-600 duration-150 ${
                              router.route === link ? "text-primary-600" : ""
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
                  {/* Wallet pill — links to Add Money */}
                  <Link href={routes.addMoney.name}>
                    <a
                      aria-label="Open wallet — add money"
                      className="header-pill header-pill-wallet"
                    >
                      <span aria-hidden="true" className="header-pill-emoji">
                        💰
                      </span>
                      <span className="header-pill-value">
                        ৳ {Number(authUser?.wallet ?? 0).toFixed(2)}
                      </span>
                    </a>
                  </Link>
                  <div className="hidden md:block">
                    <UserPopoverMenu />
                  </div>
                  <div className="md:hidden" onClick={openSidebar}>
                    <UserPopoverHead />
                  </div>
                </>
              ) : (
                <div className="flex items-center">
                  <Link href={routes.login.name}>
                    <a>
                      <Button
                        text="Login"
                        className="bg-primary-500 hover:bg-primary-600 text-white font-bold small"
                      />
                    </a>
                  </Link>
                </div>
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
