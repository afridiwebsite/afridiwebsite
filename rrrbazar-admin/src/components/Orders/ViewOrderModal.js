import { useMemo, useState } from "react";
import Modal from "react-modal";
import parse from "html-react-parser";
import { toast } from "react-toastify";
import axiosInstance from "../../common/axios";
import { getErrors, toastDefault } from "../../utils/handler.utils";
import Badge from "../Badge";

Modal.setAppElement("#root");

// Mirror the server-side cap (MAX_DISPATCH_ATTEMPTS in dispatchBot.ts).
// Dispatches at or above this are excluded from the per-order Retry button.
const DISPATCH_RETRY_CAP = 5;

const DISPATCH_STATUS_STYLE = {
  pending: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  success: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-amber-100 text-amber-700",
};

const maskCode = (s) => {
  const v = String(s || "");
  if (v.length <= 8) return v;
  return `${v.slice(0, 4)}…${v.slice(-2)}`;
};

// Parse `ingameid` into { title, value } pairs. The order endpoint encodes
// non-Player-ID dynamic inputs as "Title: value | Title: value | …". Falls
// back to a single Raw row if the string doesn't match that shape.
const parseDynamicInputs = (raw) => {
  if (!raw || typeof raw !== "string") return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];

  // Heuristic: at least one " | " or a "Title: value" colon — otherwise
  // treat the whole thing as an unparseable string.
  const parts = trimmed
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
  const rows = parts
    .map((p) => {
      const idx = p.indexOf(":");
      if (idx === -1) return null;
      return {
        title: p.slice(0, idx).trim(),
        value: p.slice(idx + 1).trim(),
      };
    })
    .filter((r) => r && r.title);
  if (rows.length > 0) return rows;
  return [{ title: "Raw", value: trimmed }];
};

const Copyable = ({ label, value }) => {
  if (value === null || value === undefined || value === "")
    return <span className="text-gray-400">---</span>;
  return (
    <span
      className="cursor-pointer text-blue-600 hover:underline break-all"
      title={`Click to copy ${label}`}
      onClick={() => {
        navigator.clipboard.writeText(String(value));
        toast.info(`Copied ${label}: ${value}`, toastDefault);
      }}
    >
      {value}
    </span>
  );
};

const Row = ({ label, children }) => (
  <div className="grid grid-cols-3 gap-3 py-2 border-b border-gray-100 last:border-b-0">
    <div className="col-span-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
      {label}
    </div>
    <div className="col-span-2 text-sm text-gray-900">{children}</div>
  </div>
);

function ViewOrderModal({ order, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);

  // BotDispatch rows come in from the admin getOrders include.
  const dispatches = useMemo(() => {
    const list = order?.BotDispatches || order?.bot_dispatches || [];
    return Array.isArray(list) ? list : [];
  }, [order]);

  const retryableCount = useMemo(
    () =>
      dispatches.filter(
        (d) =>
          d.status === "failed" &&
          Number(d.attempt_count || 0) < DISPATCH_RETRY_CAP,
      ).length,
    [dispatches],
  );

  const dynamicInputs = useMemo(
    () => parseDynamicInputs(order?.ingameid),
    [order?.ingameid],
  );

  const hasPlayerId = useMemo(
    () => !!order?.playerid && order?.playerid !== "UNIPIN_VOUCHER",
    [order?.playerid],
  );

  if (!order) return null;

  const close = () => setOpen(false);

  const handleRetry = async () => {
    if (retrying || retryableCount === 0) return;
    setRetrying(true);
    try {
      const res = await axiosInstance.post("/admin/orders/bot-retry", {
        order_ids: [order.id],
      });
      const summary = res?.data?.data?.[0] || {};
      toast.success(
        `Retried ${summary.retried || 0} dispatch(es) — ` +
          `${summary.sent || 0} sent, ${summary.still_failed || 0} still failed`,
        toastDefault,
      );
      if (typeof onUpdated === "function") onUpdated();
    } catch (err) {
      toast.error(getErrors(err, false, true), toastDefault);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <>
      <li className="cstm_btn_small" onClick={() => setOpen(true)}>
        View
      </li>
      <Modal
        isOpen={open}
        onRequestClose={close}
        style={{
          overlay: { background: "rgba(0,0,0,0.7)", zIndex: 50 },
          content: {
            maxWidth: 720,
            margin: "auto",
            height: "fit-content",
            maxHeight: "90vh",
            padding: 0,
            borderRadius: 12,
          },
        }}
      >
        <div className="flex items-center justify-between py-3 px-5 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <h2 className="font-bold text-lg text-gray-800">Order #{order.id}</h2>
          <button
            type="button"
            onClick={close}
            className="text-gray-500 hover:text-gray-900 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4">
          {/* <Row label="Order ID">
                        <Copyable label="Order ID" value={order.id} />
                    </Row>
                    <Row label="Status">
                        <Badge type={order.status} />
                    </Row>
                    <Row label="User ID">
                        <Copyable label="User ID" value={order.user_id} />
                    </Row>
                    <Row label="Package">
                        {order.name || <span className="text-gray-400">---</span>}
                    </Row>
                    <Row label="Price">
                        {order.amount ? `৳ ${order.amount}` : <span className="text-gray-400">---</span>}
                    </Row> */}
          {/* {order.uc ? (
                        <Row label="UC">
                            <Copyable label="UC code" value={order.uc} />
                        </Row>
                    ) : null} */}
          {/* <Row label="Created">
                        {order.created_at || <span className="text-gray-400">---</span>}
                    </Row> */}
          {order.brief_note ? (
            <Row label="Note">
              {/* brief_note may contain rich HTML when the
                                admin applied a saved comment template; parse
                                it so formatting / links render properly. */}
              <span className="break-words order-note-html">
                {parse(String(order.brief_note))}
              </span>
            </Row>
          ) : null}

          <div className="mt-5 mb-2">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-1">
              Account info
            </h3>
            <p className="text-xs text-gray-500 mb-2">
              Values submitted via the product's admin-defined dynamic inputs.
            </p>
          </div>

          {hasPlayerId && (
            <Row label="Player ID">
              <Copyable label="Player ID" value={order.playerid} />
            </Row>
          )}
          {dynamicInputs.length > 0 ? (
            dynamicInputs.map((row, idx) => (
              <Row key={idx} label={row.title}>
                <Copyable label={row.title} value={row.value} />
              </Row>
            ))
          ) : !hasPlayerId ? (
            <p className="text-sm text-gray-500 italic">
              No additional fields for this order.
            </p>
          ) : null}

          {dispatches.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-1">
                Bot dispatches
              </h3>
              <p className="text-xs text-gray-500 mb-2">
                Per-bot delivery attempts. Cancelled dispatches (Invalid player
                ID / region) are NOT retryable.
              </p>
              <ul className="flex flex-col gap-2">
                {dispatches.map((d) => {
                  const cls =
                    DISPATCH_STATUS_STYLE[d.status] ||
                    DISPATCH_STATUS_STYLE.pending;
                  const atCap =
                    Number(d.attempt_count || 0) >= DISPATCH_RETRY_CAP;
                  return (
                    <li
                      key={d.id}
                      className="border border-gray-200 rounded p-2.5 text-xs flex flex-col gap-1"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full font-semibold ${cls}`}
                        >
                          {d.status}
                        </span>
                        {d.tag && (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-mono">
                            #{d.tag}
                          </span>
                        )}
                        {d.voucher_id && (
                          <span className="text-gray-500">
                            voucher #{d.voucher_id}
                          </span>
                        )}
                        <span className="text-gray-500">
                          attempt {d.attempt_count || 0}/{DISPATCH_RETRY_CAP}
                          {atCap && d.status === "failed" && (
                            <span className="ml-1 text-red-600 font-semibold">
                              (capped)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="text-gray-600 break-all">
                        <span className="font-semibold">code:</span>{" "}
                        <span className="font-mono">{maskCode(d.code)}</span>
                        {" · "}
                        <span className="font-semibold">→</span>{" "}
                        <span className="break-all">
                          {d.bot_url || "(no url)"}
                        </span>
                      </div>
                      {d.error_reason && (
                        <div className="text-red-600">{d.error_reason}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end gap-2">
          {retryableCount > 0 && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {retrying
                ? "Retrying…"
                : `Retry ${retryableCount} failed dispatch${retryableCount === 1 ? "" : "es"}`}
            </button>
          )}
          <button
            type="button"
            onClick={close}
            className="px-4 py-2 rounded bg-gray-200 text-gray-800 text-sm font-semibold hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </Modal>
    </>
  );
}

export default ViewOrderModal;
