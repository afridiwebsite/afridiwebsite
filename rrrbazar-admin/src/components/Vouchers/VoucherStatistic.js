import { Link } from 'react-router-dom';
import useGet from '../../hooks/useGet';
import { hasData } from '../../utils/handler.utils';
import UiHandler from '../UiHandler';

// Voucher pool overview — totals/used/unused per package across the entire
// catalogue. Sorted with the most-depleted packages first so the admin can
// see what needs restocking at a glance. Each row links straight to the
// per-package voucher manager.
export default function VoucherStatistic() {
  const [data, loading, error] = useGet('admin/voucher/available-voucher-by-package');

  const totals = (data || []).reduce(
    (acc, r) => {
      acc.total += Number(r.total) || 0;
      acc.used += Number(r.used) || 0;
      acc.unused += Number(r.unused) || 0;
      return acc;
    },
    { total: 0, used: 0, unused: 0 },
  );

  return (
    <section className="relative container_admin">
      <div className="bg-white overflow-hidden rounded">
        <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between flex-wrap">
          <h3 className="text-lg font-bold text-black">Voucher Statistics</h3>
          {hasData(data) && (
            <div className="flex gap-3 text-sm">
              <span className="px-2 py-1 rounded bg-gray-100">
                Total: <strong>{totals.total}</strong>
              </span>
              <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700">
                Unused: <strong>{totals.unused}</strong>
              </span>
              <span className="px-2 py-1 rounded bg-amber-50 text-amber-700">
                Used: <strong>{totals.used}</strong>
              </span>
            </div>
          )}
        </div>

        <div className="md:px-6 my-6 md:max-w-[1100px] min-h-[200px] md:mx-auto">
          <UiHandler absoluteLoader data={data} loading={loading} error={error} />
          {hasData(data, loading, error) && (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-600">
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Package</th>
                    <th className="px-3 py-2 text-right">Unused</th>
                    <th className="px-3 py-2 text-right">Used</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => {
                    const lowStock = row.unused === 0;
                    return (
                      <tr
                        key={row.package_id}
                        className={`border-t border-gray-100 ${
                          lowStock ? 'bg-red-50/40' : ''
                        }`}
                      >
                        <td className="px-3 py-2 font-semibold text-gray-700">
                          {row.product_name}
                        </td>
                        <td className="px-3 py-2 text-gray-700">{row.package_name}</td>
                        <td
                          className={`px-3 py-2 text-right font-semibold ${
                            lowStock ? 'text-red-600' : 'text-emerald-700'
                          }`}
                        >
                          {row.unused}
                        </td>
                        <td className="px-3 py-2 text-right text-amber-700">{row.used}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{row.total}</td>
                        <td className="px-3 py-2 text-right">
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
          )}
        </div>
      </div>
    </section>
  );
}
