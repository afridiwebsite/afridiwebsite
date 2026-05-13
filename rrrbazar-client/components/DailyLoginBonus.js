import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FaCheck, FaLock, FaStar } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';
import { claimCoins, getMyCoins } from '../api/api';

// 7-day daily streak modal — amber/gold coin theme with primary-color accents
// on the active day. State machine per cell:
//   * claimed (day < today)  — muted background, check icon
//   * today (day === today)  — gold gradient + pulse + sparkle icon
//   * locked (day > today)   — light background, lock icon
function DailyLoginBonus({ open, onClose, onClaimed }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [justClaimed, setJustClaimed] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getMyCoins();
      setData(res?.data?.data || null);
    } catch (e) { /* swallow */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (open) {
      setJustClaimed(false);
      load();
    }
  }, [open]);

  if (!open) return null;

  const rewards = Array.isArray(data?.rewards) && data.rewards.length === 7
    ? data.rewards
    : [2, 4, 6, 8, 10, 12, 14];
  const currentStreak = Number(data?.current_streak) || 0;
  const nextDay = Number(data?.next_streak_day) || 1;
  const canClaim = !!data?.can_claim;
  const nextReward = Number(data?.next_reward) || rewards[nextDay - 1] || 0;
  const todayDay = canClaim ? nextDay : (currentStreak || nextDay);

  const progressPct = Math.max(0, Math.min(100, ((todayDay - 1) / 6) * 100));

  const onClaim = async () => {
    if (claiming || !canClaim) return;
    setClaiming(true);
    try {
      const res = await claimCoins();
      toast.success(res?.data?.message || 'Coins claimed');
      setJustClaimed(true);
      await load();
      onClaimed && onClaimed();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not claim');
    } finally {
      setClaiming(false);
    }
  };

  const nextClaimAt = data?.next_claim_at ? new Date(data.next_claim_at) : null;

  return (
    <div
      className="dlb-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Daily Login Bonus"
    >
      <div
        className="dlb-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top banner — amber gradient with floating coin */}
        <div className="dlb-banner">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="dlb-close"
          >
            ✕
          </button>
          <div className={`dlb-coin ${justClaimed ? 'dlb-coin-pop' : ''}`}>
            <span aria-hidden="true">🪙</span>
          </div>
          <h3 className="dlb-title">Daily Login Bonus</h3>
          <p className="dlb-subtitle">
            Day <strong>{todayDay}</strong> of your 7-day streak
          </p>
          {/* Progress bar */}
          <div className="dlb-progress" aria-hidden="true">
            <div
              className="dlb-progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* 7-day grid */}
        <div className="dlb-body">
          <div className="dlb-grid">
            {rewards.map((amount, i) => {
              const day = i + 1;
              const claimed = day <= currentStreak && !(day === todayDay && canClaim === false && currentStreak === day);
              const isToday = day === todayDay;
              const locked = !isToday && !claimed;
              const cellState = isToday ? 'today' : claimed ? 'claimed' : 'locked';
              return (
                <div
                  key={day}
                  className={`dlb-cell flex flex-col p-5  dlb-cell-${cellState}`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="dlb-cell-day">Day {day}</div>
                  <div className="dlb-cell-icon">
                    {isToday ? (
                      <HiSparkles size={16} />
                    ) : claimed ? (
                      <FaCheck size={12} />
                    ) : (
                      <FaLock size={11} />
                    )}
                  </div>
                  <div className="dlb-cell-amount">
                    {amount}
                    <span className="dlb-cell-coin" aria-hidden="true">🪙</span>
                  </div>
                  {isToday && <div className="dlb-cell-today">Today!</div>}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onClaim}
            disabled={!canClaim || claiming || loading}
            className={`dlb-claim ${canClaim ? 'dlb-claim-active' : ''}`}
          >
            <span className="dlb-claim-shine" aria-hidden="true" />
            <span className="dlb-claim-content">
              {canClaim ? (
                <>
                  <FaStar size={14} />
                  {claiming
                    ? 'Claiming…'
                    : `Claim ${nextReward} Coins for Today!`}
                </>
              ) : (
                'Already claimed today'
              )}
            </span>
          </button>

          {!canClaim && nextClaimAt && (
            <div className="dlb-next">
              Come back in <strong>{relativeFromNow(nextClaimAt)}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Scoped styles — keeps the global stylesheet clean and lets the modal
          stay self-contained even when reused elsewhere. */}
      <style jsx>{`
        .dlb-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(
            ellipse at center,
            rgba(20, 30, 60, 0.55) 0%,
            rgba(0, 0, 0, 0.75) 100%
          );
          backdrop-filter: blur(4px);
          animation: dlb-fade 0.25s ease-out;
          padding: 16px;
        }
        @keyframes dlb-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .dlb-modal {
          position: relative;
          width: 100%;
          max-width: 560px;
          background: #fff;
          border-radius: 18px;
          overflow: hidden;
          box-shadow:
            0 20px 60px rgba(15, 23, 42, 0.35),
            0 0 0 1px rgba(255, 255, 255, 0.05);
          animation: dlb-pop 0.35s cubic-bezier(0.2, 0.9, 0.35, 1.15);
        }
        @keyframes dlb-pop {
          from { opacity: 0; transform: translateY(20px) scale(0.94); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }

        .dlb-banner {
          position: relative;
          padding: 28px 24px 22px;
          color: #fff;
          text-align: center;
          background:
            radial-gradient(circle at 20% -10%, rgba(255, 255, 255, 0.35), transparent 50%),
            radial-gradient(circle at 80% 110%, rgba(0, 0, 0, 0.15), transparent 60%),
            linear-gradient(135deg, #f59e0b 0%, #f97316 55%, #ea580c 100%);
          overflow: hidden;
        }
        .dlb-banner::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(circle at 10% 30%, rgba(255, 255, 255, 0.25) 1px, transparent 2px),
            radial-gradient(circle at 70% 20%, rgba(255, 255, 255, 0.20) 1px, transparent 2px),
            radial-gradient(circle at 85% 70%, rgba(255, 255, 255, 0.20) 1px, transparent 2px),
            radial-gradient(circle at 30% 80%, rgba(255, 255, 255, 0.20) 1px, transparent 2px);
          background-size: 100% 100%;
          pointer-events: none;
        }
        .dlb-close {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 30px;
          height: 30px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.18);
          color: #fff;
          border: 0;
          cursor: pointer;
          line-height: 1;
          font-size: 14px;
          transition: background 0.15s ease, transform 0.15s ease;
        }
        .dlb-close:hover { background: rgba(255, 255, 255, 0.32); transform: rotate(90deg); }

        .dlb-coin {
          font-size: 44px;
          line-height: 1;
          display: inline-block;
          filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.25));
          animation: dlb-float 3s ease-in-out infinite;
        }
        @keyframes dlb-float {
          0%, 100% { transform: translateY(0) rotate(-4deg); }
          50%      { transform: translateY(-6px) rotate(4deg); }
        }
        .dlb-coin-pop { animation: dlb-burst 0.6s ease-out; }
        @keyframes dlb-burst {
          0%   { transform: scale(1) rotate(0); }
          40%  { transform: scale(1.4) rotate(15deg); }
          100% { transform: scale(1) rotate(0); }
        }

        .dlb-title {
          font-size: 22px;
          font-weight: 800;
          margin: 6px 0 2px;
          letter-spacing: 0.01em;
          text-shadow: 0 1px 0 rgba(0, 0, 0, 0.15);
        }
        .dlb-subtitle {
          font-size: 13px;
          opacity: 0.95;
          margin: 0 0 14px;
        }

        .dlb-progress {
          height: 6px;
          width: 80%;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.28);
          border-radius: 9999px;
          overflow: hidden;
        }
        .dlb-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #fde68a, #fff);
          border-radius: 9999px;
          transition: width 0.6s cubic-bezier(0.2, 0.8, 0.3, 1);
          box-shadow: 0 0 12px rgba(255, 255, 255, 0.6);
        }

        .dlb-body { padding: 20px 18px 22px; }

        // 4-column / 2-row grid where Day 7 is the "grand prize" cell on
        // the right that spans both rows. Days 1–3 fill row 1 cols 1–3,
        // Days 4–6 fill row 2 cols 1–3, and Day 7 takes the full right
        // column. Auto-placement skips the explicit position Day 7 claims.
        .dlb-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          grid-auto-rows: 1fr;
          gap: 10px;
          margin-bottom: 18px;
        }
        .dlb-cell:nth-child(7) {
          grid-column: 4;
          grid-row: 1 / span 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 14px 8px;
        }
        .dlb-cell:nth-child(7) .dlb-cell-day {
          font-size: 12px;
          letter-spacing: 0.1em;
        }
        .dlb-cell:nth-child(7) .dlb-cell-icon {
          width: 32px;
          height: 32px;
          margin: 8px auto;
        }
        .dlb-cell:nth-child(7) .dlb-cell-amount {
          font-size: 20px;
          gap: 4px;
        }
        .dlb-cell:nth-child(7) .dlb-cell-coin { font-size: 14px; }
        .dlb-cell:nth-child(7) .dlb-cell-today {
          font-size: 10px;
          margin-top: 6px;
        }
        @media (max-width: 420px) {
          .dlb-grid { gap: 8px; }
          .dlb-cell:nth-child(7) .dlb-cell-amount { font-size: 17px; }
        }

        .dlb-cell {
          position: relative;
          border-radius: 12px;
          padding: 10px 6px 12px;
          text-align: center;
          border: 1px solid #e5e7eb;
          background: #fff;
          opacity: 0;
          transform: translateY(8px);
          animation: dlb-cell-in 0.4s ease-out forwards;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        @keyframes dlb-cell-in {
          to { opacity: 1; transform: translateY(0); }
        }
        .dlb-cell:hover { transform: translateY(-2px); }

        .dlb-cell-day {
          font-size: 11px;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .dlb-cell-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 9999px;
          margin: 4px auto;
          background: #f3f4f6;
          color: #9ca3af;
        }
        .dlb-cell-amount {
          font-size: 14px;
          font-weight: 800;
          color: #374151;
          display: inline-flex;
          align-items: baseline;
          gap: 2px;
        }
        .dlb-cell-coin { font-size: 10px; transform: translateY(-1px); }
        .dlb-cell-today {
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #b45309;
          margin-top: 4px;
        }

        .dlb-cell-claimed {
          background: #f9fafb;
          opacity: 0.85;
        }
        .dlb-cell-claimed .dlb-cell-icon {
          background: #d1fae5;
          color: #059669;
        }
        .dlb-cell-claimed .dlb-cell-amount { color: #6b7280; }

        .dlb-cell-locked .dlb-cell-icon {
          background: #f3f4f6;
          color: #9ca3af;
        }

        .dlb-cell-today {
          color: #b45309;
        }
        .dlb-cell.dlb-cell-today {
          border-color: #f59e0b;
          background: linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%);
          box-shadow:
            0 0 0 3px rgba(245, 158, 11, 0.18),
            0 8px 18px rgba(245, 158, 11, 0.25);
          animation:
            dlb-cell-in 0.4s ease-out forwards,
            dlb-glow 2.2s ease-in-out 0.4s infinite;
        }
        @keyframes dlb-glow {
          0%, 100% { box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.18), 0 8px 18px rgba(245, 158, 11, 0.25); }
          50%      { box-shadow: 0 0 0 5px rgba(245, 158, 11, 0.32), 0 10px 26px rgba(245, 158, 11, 0.42); }
        }
        .dlb-cell-today .dlb-cell-icon {
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: #fff;
          box-shadow: 0 4px 10px rgba(245, 158, 11, 0.45);
        }
        .dlb-cell-today .dlb-cell-amount { color: #b45309; }

        .dlb-claim {
          position: relative;
          display: block;
          width: 100%;
          padding: 14px 18px;
          border: 0;
          border-radius: 9999px;
          color: #fff;
          font-weight: 800;
          font-size: 15px;
          letter-spacing: 0.01em;
          cursor: pointer;
          overflow: hidden;
          background: linear-gradient(135deg, #94a3b8, #64748b);
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.1);
          transition: transform 0.15s ease, box-shadow 0.2s ease;
        }
        .dlb-claim:disabled { cursor: not-allowed; }
        .dlb-claim-active {
          background:
            linear-gradient(135deg, var(--theme-primary, #2563eb), #0ea5e9 60%, var(--theme-accent, #f59e0b));
          box-shadow:
            0 10px 22px rgba(37, 99, 235, 0.35),
            inset 0 -2px 0 rgba(0, 0, 0, 0.15);
          animation: dlb-pulse 2.6s ease-in-out infinite;
        }
        .dlb-claim-active:hover {
          transform: translateY(-1px);
          box-shadow:
            0 14px 28px rgba(37, 99, 235, 0.4),
            inset 0 -2px 0 rgba(0, 0, 0, 0.15);
        }
        .dlb-claim-active:active { transform: translateY(0); }
        @keyframes dlb-pulse {
          0%, 100% { filter: brightness(1); }
          50%      { filter: brightness(1.1); }
        }
        .dlb-claim-content {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          z-index: 1;
        }
        .dlb-claim-shine {
          position: absolute;
          top: 0;
          left: -50%;
          width: 50%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.4),
            transparent
          );
          transform: skewX(-20deg);
          pointer-events: none;
        }
        .dlb-claim-active .dlb-claim-shine {
          animation: dlb-shine 2.4s ease-in-out infinite;
        }
        @keyframes dlb-shine {
          0%   { left: -50%; }
          60%  { left: 110%; }
          100% { left: 110%; }
        }

        .dlb-next {
          margin-top: 12px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
        }
        .dlb-next strong { color: #374151; font-weight: 700; }
      `}</style>
    </div>
  );
}

// Human-friendly "in 4h 12m" / "in 38s" for the next-claim hint.
function relativeFromNow(date) {
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return 'a moment';
  const totalSec = Math.floor(diffMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${totalSec}s`;
}

export default DailyLoginBonus;
