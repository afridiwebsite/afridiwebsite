/*
 * Title: Game
 * Renders one product tile on the home grid:
 *   - Full-width square image at the top.
 *   - Title "rises from behind the image" via a keyframe on entry.
 *   - Hover popover lazy-loads and lists this product's packages.
 */
import Link from 'next/link';
import { useRef, useState } from 'react';
import { getTopupPackage } from '../../api/api';
import { imgPath } from '../../helpers/helpers';

function Game({ game }) {
  const { logo, name, id } = game;
  const [open, setOpen] = useState(false);
  const [packages, setPackages] = useState(null);
  const [loading, setLoading] = useState(false);
  // Cache the first fetch — `null` means "not loaded yet", an array means
  // "loaded" (possibly empty). We don't want to re-hit the API every hover.
  const loadedRef = useRef(false);

  const loadPackages = async () => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);
    try {
      const res = await getTopupPackage(id);
      // The endpoint returns { product, packages } — accept either shape so
      // we're robust to small backend variations.
      const list =
        res?.data?.data?.packages ??
        res?.data?.packages ??
        [];
      setPackages(Array.isArray(list) ? list : []);
    } catch (e) {
      setPackages([]);
    } finally {
      setLoading(false);
    }
  };

  const onEnter = () => {
    setOpen(true);
    loadPackages();
  };
  const onLeave = () => setOpen(false);

  return (
    <div
      className={`game-card ${open ? 'is-hover' : ''}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
    >
      <Link href={`/topup/${id}`}>
        <a target="_blank" rel="noreferrer" className="game-card-link">
          <div className="game-card-image-wrap">
            <img src={imgPath(logo)} className="game-card-image" alt={name} />
          </div>
          <div className="game-card-title-wrap">
            <h6 className="game-card-title">{name}</h6>
          </div>
        </a>
      </Link>

      {/* Floating menu — visible on hover, lazy-loaded packages. */}
      <div
        className="game-card-menu"
        role="menu"
        aria-hidden={!open}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        <div className="game-card-menu-arrow" aria-hidden="true" />
        <div className="game-card-menu-header">
          <span className="game-card-menu-name">{name}</span>
          {!loading && Array.isArray(packages) && (
            <span className="game-card-menu-count">
              {packages.length} {packages.length === 1 ? 'pack' : 'packs'}
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
      </div>
    </div>
  );
}

export default Game;
