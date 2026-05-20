import { Link } from 'react-router-dom';
import useGet from '../../hooks/useGet';
import { hasData } from '../../utils/handler.utils';
import UiHandler from '../UiHandler';

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
  const [data, loading, error] = useGet('admin/voucher/available-voucher-by-package');

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
  // Convert to an array so we can sort: keep product order stable by name.
  const groups = Array.from(grouped.values()).sort((a, b) =>
    a.product_name.localeCompare(b.product_name)
  );

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
        </div>

        <div className="md:px-6 my-6 md:max-w-[1100px] min-h-[200px] md:mx-auto">
          <UiHandler absoluteLoader data={data} loading={loading} error={error} />
          {!loading && !error && groups.length === 0 && (
            <p className="text-sm text-gray-500 italic text-center py-6">
              No packages under voucher-type products. Mark a product as
              <em> "Is voucher product"</em> and add a package to surface it here.
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
                          const colorClass = ROW_COLORS[idx % ROW_COLORS.length];
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
                                  lowStock ? 'text-red-600' : 'text-green-700'
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
    </section>
  );
}
