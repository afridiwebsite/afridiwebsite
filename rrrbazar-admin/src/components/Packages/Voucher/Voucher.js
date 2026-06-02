import moment from 'moment';
import { useEffect, useMemo, useState } from 'react';
import { withRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../../common/axios';
import useGet from '../../../hooks/useGet';
import { getErrors, hasData, toastDefault } from '../../../utils/handler.utils';
import Loader from '../../Loader/Loader';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 1000];

// Split a textarea blob into clean, non-empty voucher codes. Newlines act
// as the row separator (the textarea is the single source of truth).
const parseVoucherCodes = (raw) =>
  String(raw || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

// Per-package voucher pool manager. Lists every voucher code for a
// package with status / date filters, server-side pagination, status
// sort, and a bulk-delete mode that toggles a checkbox column. Used
// codes are deletable.
function Voucher(props) {
  const packageId = props.match.params.id;

  const [refreshTick, setRefreshTick] = useState(0);

  // Filters. Default sort is "Used first" — the list always orders by
  // is_used DESC, id DESC; no user-facing sort control.
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [status, setStatus] = useState('');
  const orderBy = 'status';
  const orderDir = 'DESC';

  // Pagination.
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Bulk delete mode.
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Add-voucher modal state. Single textarea — one voucher per line.
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Debounce the search input so we don't refetch on every keystroke.
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(id);
  }, [searchInput]);

  // Reset to page 1 whenever a filter or sort changes — staying on page 5
  // of a now-empty result set is just confusing.
  useEffect(() => {
    setPage(1);
  }, [search, filterDate, status, limit]);

  const qs = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (status) params.set('status', status);
    if (filterDate) {
      // Single-date filter — bracket the chosen day on both ends so the
      // server returns everything created on that calendar date.
      params.set('start_date', filterDate);
      params.set('end_date', filterDate);
    }
    params.set('order_by', orderBy);
    params.set('order_dir', orderDir);
    params.set('page', String(page));
    params.set('limit', String(limit));
    return `?${params.toString()}`;
  }, [search, filterDate, status, page, limit]);

  const [data, loading] = useGet(
    `admin/packages/${packageId}/voucher${qs}`,
    undefined,
    refreshTick,
  );

  const stats = data?.stats || { total: 0, used: 0, unused: 0 };
  const vouchers = data?.vouchers || [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / limit));

  // ---- Bulk-mode helpers -------------------------------------------------
  const enterBulk = () => {
    setBulkMode(true);
    setSelectedIds(new Set());
  };
  const exitBulk = () => {
    setBulkMode(false);
    setSelectedIds(new Set());
  };
  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const visibleIds = vouchers.map((v) => v.id);
  const allOnPageSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const toggleAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };
  const bulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast.error('Select at least one voucher to delete', toastDefault);
      return;
    }
    if (!window.confirm(`Delete ${ids.length} voucher(s)? This cannot be undone.`))
      return;
    toast.promise(
      axiosInstance.post('/admin/packages/bulk-delete-voucher', { ids }),
      {
        pending: 'Deleting…',
        error: { render(err) { return getErrors(err.data, false, true); } },
        success: {
          render() {
            setSelectedIds(new Set());
            setRefreshTick((t) => t + 1);
            return `${ids.length} voucher(s) deleted`;
          },
        },
      },
      toastDefault,
    );
  };

  // ---- Add modal helpers -------------------------------------------------
  const openAddModal = () => {
    setPasteText('');
    setIsAddOpen(true);
  };
  const closeAddModal = () => {
    if (submitting) return;
    setIsAddOpen(false);
  };
  const parsedCodes = parseVoucherCodes(pasteText);
  const addVoucher = (e) => {
    e.preventDefault();
    const lines = parsedCodes;
    if (lines.length === 0) {
      toast.error('Enter at least one voucher code', toastDefault);
      return;
    }
    setSubmitting(true);
    axiosInstance
      .post('/admin/packages/add-voucher', { data: lines, package_id: packageId })
      .then(() => {
        toast.success(`${lines.length} voucher(s) added`, toastDefault);
        setPasteText('');
        setIsAddOpen(false);
        setRefreshTick((t) => t + 1);
      })
      .catch((err) => toast.error(getErrors(err, false, true), toastDefault))
      .finally(() => setSubmitting(false));
  };

  // ---- Single delete -----------------------------------------------------
  // Routes through the bulk endpoint with a 1-item array so this and the
  // bulk-delete action share a single auth_module row.
  const deleteVoucher = (id) => {
    if (!window.confirm('Delete this voucher? This cannot be undone.')) return;
    toast.promise(
      axiosInstance.post('/admin/packages/bulk-delete-voucher', { ids: [id] }),
      {
        pending: 'Deleting voucher…',
        error: { render(err) { return getErrors(err.data, false, true); } },
        success: {
          render() {
            setRefreshTick((t) => t + 1);
            return 'Voucher deleted';
          },
        },
      },
      toastDefault,
    );
  };

  const clearFilters = () => {
    setSearch('');
    setSearchInput('');
    setFilterDate('');
    setStatus('');
  };

  // Page-number list, clamped around the current page.
  const pageList = useMemo(() => {
    const span = 2;
    const start = Math.max(1, page - span);
    const end = Math.min(pageCount, page + span);
    const arr = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }, [page, pageCount]);

  return (
    <section className="relative container_admin">
      <div className="bg-white overflow-hidden rounded shadow-sm">
        <div className="px-6 py-3 border-b border-gray-200 flex flex-col">
          <h3 className="text-xl font-bold text-black mt-2">Voucher Management</h3>
          <div className="text-left">
            <p className="text-sm font-bold text-blue-600 uppercase">
              {data?.product?.name || '—'}
            </p>
            <p className="text-lg font-bold text-gray-500">{data?.package?.name || '—'}</p>
          </div>
        </div>

        <div className="p-6 flex justify-end">
          <button
            type="button"
            onClick={openAddModal}
            className="cstm_btn max-w-[280px]"
          >
            Add Vouchers
          </button>
        </div>

        {/* Filters row */}
        <div className="px-6 border-t border-gray-100 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="px-2 py-1 rounded bg-gray-100">
              Total: <strong>{stats.total}</strong>
            </span>
            <span className="px-2 py-1 rounded bg-green-100 text-green-700">
              Ready: <strong>{stats.unused}</strong>
            </span>
            <span className="px-2 py-1 rounded bg-red-100 text-red-700">
              Used: <strong>{stats.used}</strong>
            </span>
          </div>

          <div className="w-full lg:w-auto flex flex-col lg:items-end gap-3">
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex flex-col w-full sm:w-auto">
                <label className="text-[10px] text-gray-500 uppercase ml-1">
                  Date
                </label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="form_input !mb-0 !py-1.5 !px-2 min-h-[38px] w-full sm:w-[150px]"
                />
              </div>

              <div className="flex flex-col w-full sm:w-auto">
                <label className="text-[10px] text-gray-500 uppercase ml-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="form_input !mb-0 !py-1.5 !px-2 min-h-[38px] w-full sm:w-auto"
                  title="Filter by status"
                >
                  <option value="">All status</option>
                  <option value="unused">Ready</option>
                  <option value="used">Used</option>
                </select>
              </div>

              <div className="flex flex-col w-full sm:w-auto">
                <label className="text-[10px] text-gray-500 uppercase ml-1">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search code…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="form_input !mb-0 !py-1.5 !px-2 min-h-[38px] w-full sm:w-auto"
                />
              </div>

              {(search || filterDate || status) && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs text-blue-600 underline pb-2 sm:pb-3 h-fit"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Bulk delete sits under the search row */}
            <div className="flex gap-2 lg:justify-end">
              {!bulkMode ? (
                <button
                  type="button"
                  onClick={enterBulk}
                  className="cstm_btn_small !py-1 !px-3 !bg-red-600 hover:!bg-red-700"
                >
                  Bulk Delete
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={bulkDelete}
                    disabled={selectedIds.size === 0}
                    className="cstm_btn_small !py-1 !px-3 !bg-red-600 hover:!bg-red-700 disabled:opacity-50"
                  >
                    Delete Selected ({selectedIds.size})
                  </button>
                  <button
                    type="button"
                    onClick={exitBulk}
                    className="cstm_btn_small !py-1 !px-3 !bg-gray-500 hover:!bg-gray-600"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 relative min-h-[120px]">
          {loading && <Loader absolute />}
          {!loading && !hasData(vouchers) && (
            <p className="text-sm text-gray-500 italic text-center py-4">
              No vouchers match these filters.
            </p>
          )}
          {hasData(vouchers) && (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-600">
                    {bulkMode && (
                      <th className="px-3 py-2 w-10">
                        <input
                          type="checkbox"
                          checked={allOnPageSelected}
                          onChange={toggleAllOnPage}
                          aria-label="Select all on this page"
                        />
                      </th>
                    )}
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2 w-[400px]">Code</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Order</th>
                    <th className="px-3 py-2">Created</th>
                    {!bulkMode && <th className="px-3 py-2"></th>}
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map((v) => {
                    const checked = selectedIds.has(v.id);
                    return (
                      <tr
                        key={v.id}
                        className={`border-t border-gray-100 ${checked ? 'bg-red-50/50' : ''}`}
                      >
                        {bulkMode && (
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleOne(v.id)}
                              aria-label={`Select voucher ${v.id}`}
                            />
                          </td>
                        )}
                        <td className="px-3 py-2 text-gray-500">{v.id}</td>
                        <td className="px-3 py-2 ">
                          <div
                            className="font-mono text-gray-800 truncate cursor-pointer hover:text-blue-600 transition-colors"
                            title="Click to copy"
                            onClick={() => {
                              navigator.clipboard.writeText(v.data);
                              toast.success('Copied!', {
                                ...toastDefault,
                                autoClose: 1000,
                              });
                            }}
                          >
                            {v.data}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {Number(v.is_used) === 1 ? (
                            <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold">
                              Used
                            </span>
                          ) : Number(v.is_used) === 2 ? (
                            <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 font-semibold">
                              Consumed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 font-semibold">
                              Ready
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-500">
                          {v.order_id ? `#${v.order_id}` : '—'}
                        </td>
                        <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                          {v.created_at
                            ? moment(v.created_at).format('MMM D, YYYY h:mm A')
                            : '—'}
                        </td>
                        {!bulkMode && (
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => deleteVoucher(v.id)}
                              className="cstm_btn_small !bg-red-600 hover:!bg-red-700"
                            >
                              Delete
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Entries:</span>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="form_input !mb-0 !py-1 !px-2 !w-auto"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="text-gray-500">
            {total === 0
              ? 'No entries'
              : `Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}`}
          </div>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-2 py-1 rounded border border-gray-200 text-gray-600 disabled:opacity-40"
            >
              «
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 py-1 rounded border border-gray-200 text-gray-600 disabled:opacity-40"
            >
              ‹
            </button>
            {pageList[0] > 1 && <span className="px-1 text-gray-400">…</span>}
            {pageList.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`px-2 py-1 rounded border ${
                  p === page
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            ))}
            {pageList[pageList.length - 1] < pageCount && (
              <span className="px-1 text-gray-400">…</span>
            )}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}
              className="px-2 py-1 rounded border border-gray-200 text-gray-600 disabled:opacity-40"
            >
              ›
            </button>
            <button
              type="button"
              onClick={() => setPage(pageCount)}
              disabled={page >= pageCount}
              className="px-2 py-1 rounded border border-gray-200 text-gray-600 disabled:opacity-40"
            >
              »
            </button>
          </div>
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
              <h4 className="text-lg font-bold text-black">Add Vouchers</h4>
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

            <form onSubmit={addVoucher} className="flex flex-col flex-1 min-h-0">
              <div className="px-5 py-4 overflow-auto flex-1">
                <p className="text-xs text-gray-500 mb-3">
                  One voucher per line. Each non-empty line is inserted as a
                  separate voucher row.
                </p>
                <textarea
                  className="form_input !mb-0 w-full font-mono"
                  rows={10}
                  placeholder={'VOUCHER-1\nVOUCHER-2\nVOUCHER-3'}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-2">
                  Detected: <strong>{parsedCodes.length}</strong> voucher(s)
                </p>
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
                  disabled={submitting || parsedCodes.length === 0}
                  className="cstm_btn disabled:opacity-60"
                >
                  {submitting
                    ? 'Adding…'
                    : `Add ${parsedCodes.length || ''} voucher(s)`.trim()}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default withRouter(Voucher);
