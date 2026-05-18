import { useEffect, useMemo, useState } from 'react';
import { withRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../../common/axios';
import useGet from '../../../hooks/useGet';
import { getErrors, hasData, toastDefault } from '../../../utils/handler.utils';
import Loader from '../../Loader/Loader';

const newRow = () => ({ key: Math.random().toString(36).slice(2), value: '' });

// Per-package voucher pool manager. Lists all voucher codes for a package,
// lets the admin bulk-add new ones via a modal (one input per code, with
// "+ Add another" to seed more rows) and delete unused ones. Used codes
// are read-only.
function Voucher(props) {
  const packageId = props.match.params.id;

  const [refreshTick, setRefreshTick] = useState(0);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Add-voucher modal state.
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [rows, setRows] = useState([newRow()]);

  const qs = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (search.trim()) params.set('q', search.trim());
    const s = params.toString();
    return s ? `?${s}` : '';
  }, [status, search]);

  const [data, loading] = useGet(
    `admin/packages/${packageId}/voucher${qs}`,
    undefined,
    refreshTick,
  );

  // Tiny debouncer for the search box — Re-fetching on every keystroke is
  // wasteful, but useGet doesn't accept a custom debounce.
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(id);
  }, [searchInput]);

  const openAddModal = () => {
    setRows([newRow()]);
    setIsAddOpen(true);
  };
  const closeAddModal = () => {
    if (submitting) return; // don't let user close mid-flight
    setIsAddOpen(false);
  };
  const updateRow = (idx, value) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, value } : r)));
  const addRow = () => setRows((prev) => [...prev, newRow()]);
  const removeRow = (idx) =>
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  // Convenience for admins pasting a block of codes into a single input —
  // splits on newlines so they don't have to click "+ Add another" N times.
  const pasteMany = (idx, pasted) => {
    const lines = pasted
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length <= 1) return false;
    setRows((prev) => {
      const before = prev.slice(0, idx);
      const after = prev.slice(idx + 1);
      return [
        ...before,
        ...lines.map((v) => ({ key: Math.random().toString(36).slice(2), value: v })),
        ...after,
      ];
    });
    return true;
  };

  const addVoucher = (e) => {
    e.preventDefault();
    const lines = rows.map((r) => r.value.trim()).filter(Boolean);
    if (lines.length === 0) {
      toast.error('Enter at least one voucher code', toastDefault);
      return;
    }
    setSubmitting(true);
    axiosInstance
      .post('/admin/packages/add-voucher', { data: lines, package_id: packageId })
      .then(() => {
        toast.success(`${lines.length} voucher(s) added`, toastDefault);
        setRows([newRow()]);
        setIsAddOpen(false);
        setRefreshTick((t) => t + 1);
      })
      .catch((err) => toast.error(getErrors(err, false, true), toastDefault))
      .finally(() => setSubmitting(false));
  };

  const deleteVoucher = (id, isUsed) => {
    if (isUsed) {
      toast.error('Cannot delete a voucher that has already been used.', toastDefault);
      return;
    }
    if (!window.confirm('Delete this voucher? This cannot be undone.')) return;
    toast.promise(
      axiosInstance.post(`/admin/packages/delete-voucher/${id}`),
      {
        pending: 'Deleting voucher…',
        error: {
          render(err) {
            return getErrors(err.data, false, true);
          },
        },
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

  const stats = data?.stats || { total: 0, used: 0, unused: 0 };
  const vouchers = data?.vouchers || [];

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

        <div className="p-6">
          <button
            type="button"
            onClick={openAddModal}
            className="cstm_btn w-full block"
          >
            Add Vouchers
          </button>
        </div>

        <div className="px-6 border-t border-gray-100 py-4 flex flex-wrap items-center gap-3">
          <div className="flex gap-3 text-sm">
            <span className="px-2 py-1 rounded bg-gray-100">
              Total: <strong>{stats.total}</strong>
            </span>
            <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700">
              Unused: <strong>{stats.unused}</strong>
            </span>
            <span className="px-2 py-1 rounded bg-amber-50 text-amber-700">
              Used: <strong>{stats.used}</strong>
            </span>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="form_input !mb-0 !py-1 !px-2 !w-auto"
            >
              <option value="">All</option>
              <option value="unused">Unused</option>
              <option value="used">Used</option>
            </select>
            <input
              type="text"
              placeholder="Search code…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="form_input !mb-0 !py-1 !px-2"
            />
          </div>
        </div>

        <div className="p-6 relative min-h-[120px]">
          {loading && <Loader absolute />}
          {!loading && !hasData(vouchers) && (
            <p className="text-sm text-gray-500 italic text-center py-4">
              No vouchers yet. Paste codes above to seed the pool.
            </p>
          )}
          {hasData(vouchers) && (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-600">
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Order</th>
                    <th className="px-3 py-2">Created</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map((v) => (
                    <tr key={v.id} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-gray-500">{v.id}</td>
                      <td className="px-3 py-2 font-mono text-gray-800 break-all">
                        {v.data}
                      </td>
                      <td className="px-3 py-2">
                        {v.is_used ? (
                          <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold">
                            Used
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
                      <td className="px-3 py-2 text-gray-500">
                        {v.created_at
                          ? new Date(v.created_at).toLocaleString()
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          disabled={!!v.is_used}
                          onClick={() => deleteVoucher(v.id, !!v.is_used)}
                          className="cstm_btn_small !bg-red-600 hover:!bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                  One code per row. Paste-with-newlines into a single input also works —
                  it'll spread across rows automatically.
                </p>
                <div className="flex flex-col gap-2">
                  {rows.map((row, idx) => (
                    <div key={row.key} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-6 text-right shrink-0">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        className="form_input !mb-0 flex-1"
                        placeholder="Voucher code"
                        value={row.value}
                        onChange={(e) => updateRow(idx, e.target.value)}
                        onPaste={(e) => {
                          const text = e.clipboardData?.getData('text') || '';
                          if (pasteMany(idx, text)) e.preventDefault();
                        }}
                        autoFocus={idx === rows.length - 1}
                      />
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        disabled={rows.length === 1}
                        className="text-red-600 hover:text-red-800 px-2 disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Remove this code"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addRow}
                  className="mt-3 px-3 py-1.5 text-sm bg-blue-600 text-white rounded"
                >
                  + Add another
                </button>
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
                  disabled={submitting}
                  className="cstm_btn disabled:opacity-60"
                >
                  {submitting
                    ? 'Adding…'
                    : `Add ${rows.filter((r) => r.value.trim()).length || ''} voucher(s)`.trim()}
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
