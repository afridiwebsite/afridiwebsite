import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

import useGet from "../../hooks/useGet";
import { getErrors, hasData, toastDefault } from "../../utils/handler.utils";
import UiHandler from "../UiHandler";
import axiosInstance from "../../common/axios";

const VOUCHER_MAPPING = {
  "BDMB-T-S": "🔰 20-UC Voucher",
  "UPBD-Q-S": "🔰 20-UC Voucher",
  "BDMB-U-S": "🔰 36-UC Voucher",
  "UPBD-R-S": "🔰 36-UC Voucher",
  "BDMB-J-S": "🔰 80-UC Voucher",
  "UPBD-G-S": "🔰 80-UC Voucher",
  "BDMB-I-S": "🔰 160-UC Voucher",
  "UPBD-F-S": "🔰 160-UC Voucher",
  "BDMB-K-S": "🔰 405-UC Voucher",
  "UPBD-H-S": "🔰 405-UC Voucher",
  "BDMB-L-S": "🔰 810-UC Voucher",
  "UPBD-I-S": "🔰 810-UC Voucher",
  "BDMB-M-S": "🔰 1625-UC Voucher",
  "UPBD-J-S": "🔰 1625-UC Voucher",
  "BDMB-Q-S": "🟪 Weekly-UC Vouchers",
  "UPBD-N-S": "🟪 Weekly-UC Vouchers",
  "BDMB-S-S": "🟧Monthly-UC Vouchers",
  "UPBD-P-S": "🟧Monthly-UC Vouchers",
};

// Color palette for row coding.
const ROW_COLORS = [
  "bg-blue-50 border-blue-200",
  "bg-green-50 border-green-200",
  "bg-indigo-50 border-indigo-200",
  "bg-yellow-50 border-yellow-200",
  "bg-pink-50 border-pink-200",
  "bg-purple-50 border-purple-200",
  "bg-gray-50 border-gray-200",
  "bg-blue-100/30 border-blue-300/50",
];

// Voucher Statistics — packages from voucher-type products grouped under
export default function VoucherStatistic() {
  const [refreshTick, setRefreshTick] = useState(0);
  const [data, loading, error] = useGet(
    "admin/voucher/available-voucher-by-package",
    undefined,
    refreshTick,
  );

  // Auto-distribution modal state.
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Frontend detection logic for real-time stats in modal
  const detectedStats = useMemo(() => {
    if (!pasteText.trim()) return [];
    const mapping = VOUCHER_MAPPING;
    const keys = Object.keys(mapping);
    const sortedKeys = [...keys].sort((a, b) => b.length - a.length);
    const keyPattern = sortedKeys
      .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");
    const regex = new RegExp(`(${keyPattern})`, "g");

    const segments = String(pasteText).split(regex);
    const counts = {}; // packageName -> count

    for (let i = 1; i < segments.length; i += 2) {
      const sku = segments[i];
      const content = segments[i + 1] || "";

      const words = content
        .replace(/[:\t\r\n]+/g, " ")
        .split(/\s+/)
        .map((w) => w.trim())
        .filter(Boolean);

      const candidates = words.filter((w) => {
        if (/^[0-9]+\.$/.test(w)) return false;
        if (/^\[.*\]$/.test(w)) return false;
        const low = w.toLowerCase();
        if (["ready", "active", "used", "consumed"].includes(low)) return false;
        return w.length > 5;
      });

      if (candidates.length > 0) {
        const pkgName = mapping[sku];
        counts[pkgName] = (counts[pkgName] || 0) + 1;
      }
    }

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [pasteText]);

  const totalDetected = detectedStats.reduce((sum, s) => sum + s.count, 0);

  const openAddModal = () => {
    setPasteText("");
    setIsAddOpen(true);
  };
  const closeAddModal = () => {
    if (submitting) return;
    setIsAddOpen(false);
  };

  const handleAutoDistribute = (e) => {
    e.preventDefault();
    if (!pasteText.trim()) {
      toast.error("Enter voucher data to distribute", toastDefault);
      return;
    }
    setSubmitting(true);
    axiosInstance
      .post("/admin/voucher/auto-distribute", { rawData: pasteText })
      .then((res) => {
        toast.success(
          res.data?.message || "Vouchers distributed successfully",
          toastDefault,
        );
        setPasteText("");
        setIsAddOpen(false);
        setRefreshTick((t) => t + 1);
      })
      .catch((err) => toast.error(getErrors(err, false, true), toastDefault))
      .finally(() => setSubmitting(false));
  };

  const grouped = (data || []).reduce((acc, row) => {
    const key = row.product_id ?? `_${row.product_name}`;
    if (!acc.has(key)) {
      acc.set(key, {
        product_id: row.product_id,
        product_name: row.product_name,
        packages: [],
        totals: { total: 0, used: 0, unused: 0 },
      });
    }
    const group = acc.get(key);
    group.packages.push(row);
    group.totals.total += Number(row.total) || 0;
    group.totals.used += Number(row.used) || 0;
    group.totals.unused += Number(row.unused) || 0;
    return acc;
  }, new Map());
  // Convert to an array so we can sort: keep product order stable by name,
  // and packages within each product ordered by package_id ascending so
  // the list stays in a predictable creation order.
  const groups = Array.from(grouped.values()).sort((a, b) =>
    a.product_name.localeCompare(b.product_name),
  );
  for (const g of groups) {
    g.packages.sort(
      (a, b) => (Number(a.package_id) || 0) - (Number(b.package_id) || 0),
    );
  }

  const grandTotals = groups.reduce(
    (acc, g) => {
      acc.total += g.totals.total;
      acc.used += g.totals.used;
      acc.unused += g.totals.unused;
      return acc;
    },
    { total: 0, used: 0, unused: 0 },
  );

  return (
    <section className="relative container_admin">
      <div className="bg-white overflow-hidden rounded">
        <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-lg font-bold text-black">Voucher Statistics</h3>
          <div className="flex items-center gap-4">
            {hasData(data) && (
              <div className="flex gap-3 text-sm">
                <span className="px-2 py-1 rounded bg-gray-100">
                  Total: <strong>{grandTotals.total}</strong>
                </span>
                <span className="px-2 py-1 rounded bg-green-100 text-green-700">
                  Ready: <strong>{grandTotals.unused}</strong>
                </span>
                <span className="px-2 py-1 rounded bg-red-100 text-red-700">
                  Used: <strong>{grandTotals.used}</strong>
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={openAddModal}
              className="cstm_btn !py-2 !px-4"
            >
              Add Vouchers
            </button>
          </div>
        </div>

        <div className="md:px-6 my-6 md:max-w-[1100px] min-h-[200px] md:mx-auto">
          <UiHandler
            absoluteLoader
            data={data}
            loading={loading}
            error={error}
          />
          {!loading && !error && groups.length === 0 && (
            <p className="text-sm text-gray-500 italic text-center py-6">
              No packages under voucher-type products. Mark a product as
              <em> "Is voucher product"</em> and add a package to surface it
              here.
            </p>
          )}

          {groups.length > 0 && (
            <div className="flex flex-col gap-6">
              {groups.map((group) => (
                <div
                  key={group.product_id ?? group.product_name}
                  className="border border-gray-200 rounded overflow-hidden"
                >
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-base font-bold text-gray-800">
                      {group.product_name}
                    </h4>
                    {/* <div className="flex gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded bg-gray-100">
                        Total: <strong>{group.totals.total}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-green-100 text-green-700">
                        Ready: <strong>{group.totals.unused}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-red-100 text-red-700">
                        Used: <strong>{group.totals.used}</strong>
                      </span>
                    </div> */}
                  </div>

                  <div className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-white text-left text-gray-600">
                          <th className="px-3 py-2">Package</th>
                          <th className="px-3 py-2 text-center">Ready</th>

                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.packages.map((row, idx) => {
                          const lowStock = row.unused === 0;
                          const colorClass =
                            ROW_COLORS[idx % ROW_COLORS.length];
                          return (
                            <tr
                              key={row.package_id}
                              className={`border-b-2 border-solid ${
                                lowStock
                                  ? "bg-red-100 border-red-300"
                                  : colorClass
                              }`}
                            >
                              <td className="px-3 py-6 text-gray-700">
                                {row.package_name}
                              </td>
                              <td
                                className={`px-3 py-2 text-center font-semibold ${
                                  lowStock ? "text-red-600" : "text-green-700"
                                }`}
                              >
                                {row.unused}
                              </td>

                              <td className="px-3 py-2 text-center">
                                <Link
                                  to={`/topup-package/voucher/${row.package_id}`}
                                  className="cstm_btn_small"
                                >
                                  Manage
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isAddOpen && (
        <div
          className="fixed inset-0 z-[9999999] bg-black/50 flex items-center justify-center p-4"
          onClick={closeAddModal}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
              <h4 className="text-lg font-bold text-black">
                Auto Distribute Vouchers
              </h4>
              <button
                type="button"
                onClick={closeAddModal}
                disabled={submitting}
                className="text-gray-500 hover:text-gray-800 text-2xl leading-none disabled:opacity-40"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleAutoDistribute}
              className="flex flex-col flex-1 min-h-0"
            >
              <div className="px-5 py-4 overflow-auto flex-1">
                <p className="text-xs text-gray-500 mb-3">
                  Paste the raw voucher data here. Vouchers will be
                  automatically assigned to their respective packages based on
                  the predefined mapping.
                </p>
                <textarea
                  className="form_input !mb-0 w-full font-mono"
                  rows={10}
                  placeholder={"Paste voucher data (e.g. from spreadsheet)..."}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  autoFocus
                />
                {totalDetected > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-100">
                    <h5 className="text-xs font-bold text-blue-800 uppercase mb-2">
                      Detected Vouchers ({totalDetected})
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                      {detectedStats.map((s) => (
                        <div
                          key={s.name}
                          className="flex justify-between text-[11px] text-blue-700"
                        >
                          <span className="truncate mr-2">{s.name}</span>
                          <span className="font-bold whitespace-nowrap">
                            × {s.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeAddModal}
                  disabled={submitting}
                  className="cstm_btn_small !bg-gray-200 !text-gray-700 hover:!bg-gray-300 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !pasteText.trim()}
                  className="cstm_btn disabled:opacity-60"
                >
                  {submitting ? "Processing…" : "Distribute Vouchers"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
