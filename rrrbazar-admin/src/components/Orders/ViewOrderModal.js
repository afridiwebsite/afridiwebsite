import { useMemo, useState } from "react";
import Modal from "react-modal";
import parse from "html-react-parser";
import { toast } from "react-toastify";
import { toastDefault } from "../../utils/handler.utils";

Modal.setAppElement("#root");

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

// Lightweight account-info dialog. Dispatch errors + the per-order Retry
// button live in the Details modal (reactTableColumns.js) now — this
// view is just for inspecting the customer's submitted form fields.
function ViewOrderModal({ order }) {
  const [open, setOpen] = useState(false);

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

  return (
    <>
      <li
        className="cstm_btn_small bg-green-700 hover:bg-green-600"
        onClick={() => setOpen(true)}
      >
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
          <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
            Order #{order.id}
            {order?.TopupPackage?.seller ? (
              <span className="text-xs font-semibold text-gray-600 bg-gray-200 rounded px-2 py-0.5">
                {order.TopupPackage.seller}
              </span>
            ) : null}
          </h2>
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
          {order.brief_note ? (
            <Row label="Note">
              {/* brief_note may contain rich HTML when the admin applied a
                  saved comment template; parse it so formatting / links
                  render properly. */}
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
        </div>

        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end gap-2">
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
