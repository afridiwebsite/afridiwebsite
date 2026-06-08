import { getErrors, hasData, toastDefault } from "../../utils/handler.utils";
import { makeOrdersTableColumns } from "../../utils/reactTableColumns";
import Table from "../react-table/Table";
import { toast } from "react-toastify";
import axiosInstance from "../../common/axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import SearchOrder from "./SearchOrder";
import ViewOrderModal from "./ViewOrderModal";

// Escape a string for safe inlining as an HTML attribute value inside the
// Swal markup (saved-comment <option>, etc.).
const escAttr = (s) =>
  String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// Format a number as a ৳ amount with thousands separators and 2 dp.
const fmtMoney = (n) =>
  `৳ ${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function Orders() {
  const [totalDataCount, setTotalDataCount] = useState(null);
  const [savedComments, setSavedComments] = useState([]);

  // "Total Spent" summary card. Mirrors whatever filters are active on the
  // table below (user id, status, uc/player id, date range) by listening to
  // the Table's search params. `spentFilters` holds only the filter keys
  // (pagination is ignored) so paging through results doesn't refetch the
  // total. `spentRefresh` is bumped after status edits / bulk retries so the
  // figure stays in step with the rows.
  const [spentFilters, setSpentFilters] = useState({});
  const [spentRefresh, setSpentRefresh] = useState(0);
  const [totalSpent, setTotalSpent] = useState(null);
  const [spentCount, setSpentCount] = useState(null);
  const [spentLoading, setSpentLoading] = useState(false);
  const [spentError, setSpentError] = useState(false);

  const bumpSpent = useCallback(() => setSpentRefresh((n) => n + 1), []);

  // Keep only the spend-relevant filter keys. Return the previous object
  // when nothing relevant changed (e.g. the admin only flipped the page) so
  // the fetch effect's identity check skips a redundant request.
  const onSearchParamsChange = useCallback((params) => {
    const keys = ["user_id", "order_id", "status", "uc", "start_date", "end_date"];
    const next = {};
    keys.forEach((k) => {
      if (params?.[k]) next[k] = params[k];
    });
    setSpentFilters((prev) =>
      JSON.stringify(prev) === JSON.stringify(next) ? prev : next,
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    const qs = Object.entries(spentFilters)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");
    setSpentLoading(true);
    setSpentError(false);
    axiosInstance
      .get(`/admin/orders/total-spent${qs ? `?${qs}` : ""}`)
      .then((res) => {
        if (cancelled) return;
        const d = res?.data?.data || {};
        setTotalSpent(Number(d.total_spent || 0));
        setSpentCount(Number(d.order_count || 0));
      })
      .catch(() => {
        if (cancelled) return;
        setSpentError(true);
        setTotalSpent(null);
        setSpentCount(null);
      })
      .finally(() => {
        if (!cancelled) setSpentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [spentFilters, spentRefresh]);

  // Human-readable description of the filters the card is summarising.
  const spentScope = (() => {
    const parts = [];
    if (spentFilters.user_id) parts.push(`user #${spentFilters.user_id}`);
    if (spentFilters.uc) parts.push(`"${spentFilters.uc}"`);
    if (spentFilters.status) parts.push(spentFilters.status);
    if (spentFilters.start_date || spentFilters.end_date) {
      parts.push(
        `${spentFilters.start_date || "…"} → ${spentFilters.end_date || "…"}`,
      );
    }
    return parts.length
      ? parts.join(" · ")
      : "all paid orders (excluding cancelled)";
  })();
  // Bulk-retry selection mode: when on, each retryable row shows a
  // leading checkbox and a floating action bar surfaces the count + a
  // "Retry selected" button. Only orders that have at least one
  // currently-failed BotDispatch are checkable.
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkRetrying, setBulkRetrying] = useState(false);
  const currentPageOrdersRef = useRef([]);
  const reloadRefFunc = useRef(null);

  const hasRetryableDispatch = (order) => {
    // Cancelled orders are terminal — admin must reopen them via the
    // status modal before retrying. Refunds also went out on cancel, so
    // silently re-dispatching would risk double-delivery.
    if (order?.status === "cancel") return false;
    const list = order?.BotDispatches || order?.bot_dispatches || [];
    if (!Array.isArray(list)) return false;
    return list.some(
      (d) => d.status === "failed" && Number(d.attempt_count || 0) < 5,
    );
  };

  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleHeaderCheckbox = () => {
    const retryableOnPage =
      currentPageOrdersRef.current.filter(hasRetryableDispatch);
    const allChecked =
      retryableOnPage.length > 0 &&
      retryableOnPage.every((o) => selectedIds.has(o.id));

    if (allChecked) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        retryableOnPage.forEach((o) => next.delete(o.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        retryableOnPage.forEach((o) => next.add(o.id));
        return next;
      });
    }
  };

  const submitBulkRetry = async () => {
    if (selectedIds.size === 0) {
      toast.error("Select at least one order", toastDefault);
      return;
    }
    setBulkRetrying(true);
    try {
      const res = await axiosInstance.post("/admin/orders/bot-retry", {
        order_ids: Array.from(selectedIds),
      });
      const summary = Array.isArray(res?.data?.data) ? res.data.data : [];
      const totals = summary.reduce(
        (acc, s) => {
          acc.retried += Number(s.retried || 0);
          acc.sent += Number(s.sent || 0);
          acc.still_failed += Number(s.still_failed || 0);
          acc.skipped_capped += Number(s.skipped_capped || 0);
          return acc;
        },
        { retried: 0, sent: 0, still_failed: 0, skipped_capped: 0 },
      );
      toast.success(
        `Retried ${totals.retried} across ${summary.length} order(s) — ` +
          `${totals.sent} sent, ${totals.still_failed} still failed` +
          (totals.skipped_capped
            ? `, ${totals.skipped_capped} skipped (capped)`
            : ""),
        toastDefault,
      );
      exitSelectionMode();
      reloadRefFunc.current && reloadRefFunc.current();
      bumpSpent();
    } catch (err) {
      toast.error(getErrors(err, false, true), toastDefault);
    } finally {
      setBulkRetrying(false);
    }
  };

  // Pull the saved comment templates once on mount and refresh whenever
  // the admin returns to this page. The dropdown in the edit modal is
  // populated from this list (admin can still type a custom note).
  useEffect(() => {
    let cancelled = false;
    axiosInstance
      .get("/admin/order-comments")
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res?.data?.data) ? res.data.data : [];

        setSavedComments(list);
      })
      .catch(() => {
        /* the dropdown just stays empty */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const reloadTable = () => {
    reloadRefFunc.current && reloadRefFunc.current();
    bumpSpent();
  };

  let actionMenu = {
    id: "edit",
    Header: "Action",
    accessor: "id",
    Cell: (e) => {
      const order = e.row.original;
      const status = order.status;
      const canEdit = status === "pending" || status === "In Progress";
      const hasPlayerId = !!(
        order.playerid && order.playerid !== "UNIPIN_VOUCHER"
      );

      const showView = !hasPlayerId;
      return (
        <ul className="flex space-x-2">
          {showView && <ViewOrderModal order={order} />}
          {canEdit && (
            <li
              className="cstm_btn_small"
              onClick={() => openChangeStatusModal(e.value)}
            >
              Edit
            </li>
          )}
        </ul>
      );
    },
  };

  // Leading checkbox column — only rendered when selectionMode is on.
  // Rows without any retryable failed dispatch render disabled cells so
  // the admin can see at a glance which orders are valid targets.
  const selectionColumn = {
    id: "select",
    Header: () => {
      const retryableOnPage =
        currentPageOrdersRef.current.filter(hasRetryableDispatch);
      const allChecked =
        retryableOnPage.length > 0 &&
        retryableOnPage.every((o) => selectedIds.has(o.id));
      const someChecked =
        !allChecked && retryableOnPage.some((o) => selectedIds.has(o.id));
      return (
        <input
          type="checkbox"
          title={allChecked ? "Deselect all" : "Select all retryable"}
          checked={allChecked}
          ref={(el) => {
            if (el) el.indeterminate = someChecked;
          }}
          onChange={handleHeaderCheckbox}
        />
      );
    },
    accessor: "id",
    Cell: (e) => {
      const order = e.row.original;
      const canSelect = hasRetryableDispatch(order);
      if (!canSelect) {
        return (
          <span className="text-gray-300" title="No failed dispatches">
            —
          </span>
        );
      }
      return (
        <input
          type="checkbox"
          checked={selectedIds.has(order.id)}
          onChange={() => toggleSelected(order.id)}
        />
      );
    },
  };

  const orderColumns = useMemo(
    () => makeOrdersTableColumns(reloadTable),
    // reloadTable closes over a ref; the function identity is stable for the
    // life of the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const withActionMenu = useMemo(
    () =>
      selectionMode
        ? [selectionColumn, ...orderColumns, actionMenu]
        : [...orderColumns, actionMenu],
    // selectionColumn / actionMenu close over selectionMode-derived state
    // (selectedIds), so we deliberately rebuild them when those change too.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectionMode, orderColumns, selectedIds, savedComments],
  );

  // Stable Table callbacks — these used to be inline arrow functions, which
  // changed identity on every render. Table.js memoises `dataFetcher` over
  // `selectData` / `selectError`, so a new identity each render invalidates
  // the memo and re-fires the data-fetch effect in a loop.
  const selectData = useCallback((res) => {
    // Ordering ("In Progress" first, then pending, then newest-first within
    // each group) is handled server-side in the admin getOrders query so it
    // holds across pagination — no client-side re-sort needed here.
    const orders = res.data.data.orders || [];
    setTotalDataCount(res.data.data.order_count);
    currentPageOrdersRef.current = orders;
    return {
      data: orders,
      total: res.data.data.order_count,
    };
  }, []);
  const selectError = useCallback((err) => getErrors(err, true)[0], []);
  const customGlobalSearch = useCallback(
    ({ addSearchParam, removeSearchParam }) => (
      <SearchOrder
        addSearchParam={addSearchParam}
        removeSearchParam={removeSearchParam}
      />
    ),
    [],
  );

  const openChangeStatusModal = async (order_id) => {
    // Build the saved-comment picker. The brief note is now a
    // contenteditable rich editor (not a textarea) so picking a saved
    // template can drop its HTML straight in — formatting like bold,
    // lists, and links survives the round-trip.
    const savedOptions = savedComments
      .map((c) => {
        const label = c.label || (c.plain_text || "").slice(0, 80);
        return `<option value="${escAttr(c.id)}">${escAttr(label)}</option>`;
      })
      .join("");
    const savedPickerHtml = savedComments.length
      ? `<label class="block text-left mb-2">
                    <span class="form_label">Load saved comment</span>
                    <select id="order-saved-comment" class="form_input">
                        <option value="">-- Select a saved comment --</option>
                        ${savedOptions}
                    </select>
                </label>`
      : `<p class="text-xs text-gray-500 mb-2 text-left">No saved comment templates yet — <a href="/order-comments" class="text-blue-600 underline">create one</a> to reuse here.</p>`;

    // Minimal rich-text toolbar. We use document.execCommand (deprecated
    // but still universally supported) because it's the simplest way to
    // get a working editor inside Swal's HTML body without mounting
    // React. The supported commands cover the formatting the admin
    // actually uses on order notes: bold/italic/underline, lists, link,
    // and a "clear" button that strips all inline formatting.
    const toolbarHtml = `
      <div id="order-note-toolbar" style="display:flex;flex-wrap:wrap;gap:4px;border:1px solid #dcdcf3;border-bottom:none;border-radius:6px 6px 0 0;padding:6px;background:#f9fafb;">
        <button type="button" data-cmd="bold"           style="font-weight:bold;min-width:32px;padding:4px 8px;border:1px solid #d1d5db;border-radius:4px;background:white;cursor:pointer;">B</button>
        <button type="button" data-cmd="italic"         style="font-style:italic;min-width:32px;padding:4px 8px;border:1px solid #d1d5db;border-radius:4px;background:white;cursor:pointer;">I</button>
        <button type="button" data-cmd="underline"      style="text-decoration:underline;min-width:32px;padding:4px 8px;border:1px solid #d1d5db;border-radius:4px;background:white;cursor:pointer;">U</button>
        <button type="button" data-cmd="insertUnorderedList" title="Bulleted list" style="min-width:32px;padding:4px 8px;border:1px solid #d1d5db;border-radius:4px;background:white;cursor:pointer;">• List</button>
        <button type="button" data-cmd="insertOrderedList"   title="Numbered list" style="min-width:32px;padding:4px 8px;border:1px solid #d1d5db;border-radius:4px;background:white;cursor:pointer;">1. List</button>
        <button type="button" data-cmd="createLink"     title="Link" style="min-width:32px;padding:4px 8px;border:1px solid #d1d5db;border-radius:4px;background:white;cursor:pointer;">Link</button>
        <button type="button" data-cmd="removeFormat"   title="Clear formatting" style="min-width:32px;padding:4px 8px;border:1px solid #d1d5db;border-radius:4px;background:white;cursor:pointer;">Clear</button>
      </div>`;

    const { value: formValues } = await Swal.fire({
      title: "Change order status",
      html:
        `<select id="order-status-value" class="form_input w-full mb-4">
                    <option value="completed" style="font-size: 2em;">Completed</option>
                    <option value="pending" selected style="font-size: 2em;">Pending</option>
                    <option value="In Progress" style="font-size: 2em;">In Progress</option>
                    <option value="cancel" style="font-size: 2em;">Cancel</option>
                </select>` +
        savedPickerHtml +
        `<label class="block text-left">
                <span class="form_label">Brief Note</span>
                ${toolbarHtml}
                <div
                  id="order-note"
                  contenteditable="true"
                  style="min-height:140px;max-height:300px;overflow-y:auto;border:1px solid #dcdcf3;border-top:none;border-radius:0 0 6px 6px;padding:8px 12px;background:white;text-align:left;outline:none;"
                  data-placeholder="Pick a saved comment above or type your own — bold, lists, and links are supported."
                ></div>
                <style>
                  #order-note:empty:before {
                    content: attr(data-placeholder);
                    color: #9ca3af;
                  }
                  #order-note ul { list-style-type: disc; padding-left: 20px; }
                  #order-note ol { list-style-type: decimal; padding-left: 20px; }
                  #order-note a { color: #2563eb; text-decoration: underline; }
                </style>
            </label>`,
      didOpen: () => {
        const picker = document.getElementById("order-saved-comment");
        const note = document.getElementById("order-note");
        const toolbar = document.getElementById("order-note-toolbar");
        if (!note) return;

        // Saved-comment picker → drop the template's HTML straight into
        // the editor. Falls back to plain text when the template doesn't
        // carry HTML (older rows).
        if (picker) {
          picker.addEventListener("change", (e) => {
            const id = e.target.value;
            if (!id) return;
            const found = savedComments.find(
              (c) => String(c.id) === String(id),
            );
            if (found) {
              note.innerHTML = found.html || found.plain_text || "";
            }
          });
        }

        // Toolbar — single delegated click handler covers every button.
        // Most commands are zero-arg; `createLink` prompts for the URL.
        if (toolbar) {
          toolbar.addEventListener("mousedown", (e) => {
            // Prevent the contenteditable from losing focus before the
            // command fires (execCommand operates on the active
            // selection).
            e.preventDefault();
          });
          toolbar.addEventListener("click", (e) => {
            const btn = e.target.closest("button[data-cmd]");
            if (!btn) return;
            const cmd = btn.getAttribute("data-cmd");
            note.focus();
            if (cmd === "createLink") {
              const url = window.prompt("Link URL:", "https://");
              if (url) document.execCommand(cmd, false, url);
            } else {
              document.execCommand(cmd, false, null);
            }
          });
        }
      },
      focusConfirm: false,
      preConfirm: () => {
        const orderStatus = document.getElementById("order-status-value").value;
        const note = document.getElementById("order-note");
        // Use innerHTML so saved-template formatting + the toolbar's
        // rich edits all flow through. An empty editor returns "" which
        // the backend treats the same as the old empty-textarea case.
        const orderNote = note ? note.innerHTML.trim() : "";

        if (!orderStatus) {
          toast.error("Select an order status", toastDefault);
          return false;
        }

        return { orderStatus, orderNote };
      },
    });

    if (formValues) {
      toast.promise(
        axiosInstance.post(`/admin/order/update-order-status/${order_id}`, {
          status: formValues.orderStatus,
          order_note: formValues.orderNote,
        }),
        {
          pending: "Updating order...",
          error: {
            render(err) {
              console.log(err);
              return getErrors(err.data, false, true);
            },
          },
          success: {
            render() {
              reloadRefFunc.current && reloadRefFunc.current();
              bumpSpent();
              return "Order updated successfully";
            },
          },
        },
        toastDefault,
      );
    }
  };

  return (
    <div className="md:px-5">
      {/* Total Spent summary — reflects the filters active on the table
          below (user id, status, uc/player id, date range). */}
      {/* <div className="bg-white py-5 mb-5 px-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Spent
            </p>
            <p className="text-3xl font-bold text-gray-800 mt-1">
              {spentLoading
                ? "…"
                : spentError
                  ? "—"
                  : fmtMoney(totalSpent)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {spentError ? (
                "Could not load total"
              ) : (
                <>
                  {spentCount != null && (
                    <span className="font-medium text-gray-600">
                      {spentCount} order{spentCount === 1 ? "" : "s"}
                    </span>
                  )}{" "}
                  · {spentScope}
                </>
              )}
            </p>
          </div>
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-2xl font-bold">
            ৳
          </div>
        </div>
      </div> */}
      <div className="bg-white py-5 mb-5 px-5">
        {/* Bulk retry controls live above the table so they don't
                    conflict with the per-row action menu. Enter selection
                    mode → checkboxes appear → action bar surfaces. */}
        <div className="flex items-center justify-between gap-2 mb-3">
        <div className="text-sm text-gray-600">
 {spentLoading
                ? "…"
                : spentError
                  ? "—"
                  : fmtMoney(totalSpent)}
                  </div>


        
        
          {!selectionMode ? (
            <button
              type="button"
              className="cstm_btn_small !bg-blue-600 hover:!bg-blue-700"
              onClick={() => setSelectionMode(true)}
            >
              Bulk retry
            </button>
          ) : (
            <>
              <span className="text-sm text-gray-600 mr-2">
                {selectedIds.size} selected
              </span>
              <button
                type="button"
                disabled={bulkRetrying || selectedIds.size === 0}
                className="cstm_btn_small !bg-blue-600 hover:!bg-blue-700 disabled:opacity-60"
                onClick={submitBulkRetry}
              >
                {bulkRetrying
                  ? "Retrying…"
                  : `Retry selected (${selectedIds.size})`}
              </button>
              <button
                type="button"
                className="cstm_btn_small !bg-gray-300 !text-gray-800 hover:!bg-gray-400"
                onClick={exitSelectionMode}
              >
                Cancel
              </button>
            </>
          )}
        </div>
        <Table
          customGlobalSearch={customGlobalSearch}
          reloadRefFunc={reloadRefFunc}
          tableTitle="Product Orders"
          tableSubTitle={
            hasData(totalDataCount) && `Total result: ${totalDataCount}`
          }
          globalSearchPlaceholder="Product id or user id"
          tableId="order_table"
          url="/admin/orders"
          selectData={selectData}
          queryString="order_id"
          disableGlobalSearch
          selectError={selectError}
          columns={withActionMenu}
          onSearchParamsChange={onSearchParamsChange}
        />
      </div>
    </div>
  );
}

export default Orders;
