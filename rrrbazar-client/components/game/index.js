/*
 * Title: Game
 * Renders one product tile on the home grid:
 *   - Full-width square image at the top.
 *   - Title "rises from behind the image" via a keyframe on entry.
 *   - Hover popover lazy-loads and lists this product's packages.
 *
 * The popover is rendered through a React portal to <body> so it escapes
 * every ancestor stacking context. Without this, sibling tiles in the next
 * row (which also create stacking contexts via .animate-fade-in-up's
 * persistent transform) end up painting over the popover regardless of any
 * z-index gymnastics on the wrapper.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { getTopupPackage } from "../../api/api";
import { imgPath } from "../../helpers/helpers";

function Game({ game }) {
  const { logo, name, id } = game;
  const cardRef = useRef(null);
  const closeTimerRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false); // SSR-safe portal gate
  const [packages, setPackages] = useState(null);
  const [loading, setLoading] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  // Cache the first fetch — null = not loaded, array = loaded (maybe empty).
  const loadedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadPackages = async () => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);
    try {
      const res = await getTopupPackage(id);
      const list = res?.data?.data?.packages ?? res?.data?.packages ?? [];
      setPackages(Array.isArray(list) ? list : []);
    } catch (e) {
      setPackages([]);
    } finally {
      setLoading(false);
    }
  };

  // Anchor the menu below the card centered horizontally.
  const updateMenuPos = () => {
    if (!cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    setMenuPos({
      top: r.bottom + window.scrollY + 10,
      left: r.left + r.width / 2 + window.scrollX,
    });
  };

  // Tiny grace period on leave so the mouse can travel from the card to the
  // popover without the menu closing en route. Cancelled when the cursor
  // enters either element again.
  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };
  const onEnter = () => {
    cancelClose();
    updateMenuPos();
    setOpen(true);
    loadPackages();
  };
  const onLeave = () => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => setOpen(false), 120);
  };

  // Keep the menu glued to the card while it's open even if the page scrolls.
  useEffect(() => {
    if (!open) return undefined;
    const handler = () => updateMenuPos();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [open]);

  const menu =
    open && mounted
      ? ReactDOM.createPortal(
          <div
            className="game-card-menu is-open"
            role="menu"
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
            style={{
              position: "absolute",
              top: menuPos.top,
              left: menuPos.left,
              transform: "translateX(-50%)",
            }}
          >
            <div className="game-card-menu-arrow" aria-hidden="true" />
            <div className="game-card-menu-header">
              <span className="game-card-menu-name">{name}</span>
              {!loading && Array.isArray(packages) && (
                <span className="game-card-menu-count">
                  {packages.length} {packages.length === 1 ? "pack" : "packs"}
                </span>
              )}
            </div>

            {loading && (
              <div className="game-card-menu-empty">Loading packages…</div>
            )}
            {!loading && Array.isArray(packages) && packages.length === 0 && (
              <div className="game-card-menu-empty">No packages yet.</div>
            )}
            {!loading && Array.isArray(packages) && packages.length > 0 && (
              <ul className="game-card-pkg-list">
                {packages.slice(0, 6).map((p, i) => (
                  <li
                    key={p.id ?? i}
                    className="game-card-pkg"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <span className="game-card-pkg-name">{p.name}</span>
                    <span className="game-card-pkg-price">৳ {p.price}</span>
                  </li>
                ))}
                {packages.length > 6 && (
                  <li className="game-card-pkg-more">
                    +{packages.length - 6} more
                  </li>
                )}
              </ul>
            )}

            <Link href={`/topup/${id}`}>
              <a className="game-card-menu-cta">View all packages →</a>
            </Link>
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      ref={cardRef}
      className={`game-card ${open ? "is-hover" : ""}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
    >
      <Link href={`/topup/${id}`}>
        <div className="game-card-link">
          <div className="game-card-image-wrap">
            <img src={imgPath(logo)} className="game-card-image" alt={name} />
          </div>
          <div className="game-card-title-wrap">
            <h6 className="game-card-title">{name}</h6>
          </div>
        </div>
      </Link>
      {menu}
    </div>
  );
}

export default Game;
