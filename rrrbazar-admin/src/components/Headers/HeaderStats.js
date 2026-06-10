import React from "react";
import useGet from '../../hooks/useGet'
// components

import CardStats from "../../components/Cards/CardStats.js";
import { getErrors } from "../../utils/handler.utils";

export default function HeaderStats() {
  const [stats, loading, error] = useGet('admin/dashboard-stats')
  return (
    <div className="space-y-12 pb-8 py-5">
      {error && (
        <div className="text-center py-4">
          <ul className="inline-block">{getErrors(error, false, true)}</ul>
        </div>
      )}

      {!error && (
        <>
          {/* Section 1: Overview (2x2) */}
          <section>
            <div className="flex items-center gap-2 mb-4 ml-1">
              <div className="w-1 h-5 bg-blue-600 rounded-full" />
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Overview</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <CardStats
                statSubtitle="Total User"
                statTitle={stats?.totalUser}
                statIconName="fas fa-users"
                statIconColor="bg-blue-500"
                color="blue"
                loading={loading}
              />
              <CardStats
                statSubtitle="Total Wallet"
                statTitle={`৳ ${Number(stats?.totalWallet || 0).toFixed(2)}`}
                statDescripiron={`Today Added: ৳ ${Number(stats?.todaysTotalWallet || 0).toFixed(2)}`}
                statIconName="fas fa-wallet"
                statIconColor="bg-emerald-500"
                color="emerald"
                loading={loading}
              />
              <CardStats
                statSubtitle="Today Orders"
                statTitle={stats?.todaysOrder}
                statDescripiron={`Completed: ${stats?.todaysCompletedOrder}`}
                statIconName="fas fa-shopping-cart"
                statIconColor="bg-orange-500"
                color="orange"
                loading={loading}
              />
              <CardStats
                statSubtitle="Today New Users"
                statTitle={stats?.todaysUser}
                statIconName="fas fa-user-plus"
                statIconColor="bg-sky-500"
                color="sky"
                loading={loading}
              />
            </div>
          </section>

          {/* Section 2: Performance (2x2) */}
          <section>
       
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <CardStats
                statSubtitle="Todays Sales"
                statTitle={`৳ ${Number(stats?.todaysCompletedOrderAmount || 0).toFixed(2)}`}
                statDescripiron={`Cost: ৳ ${Number(stats?.todaysCompletedOrderBPrice || 0).toFixed(2)}`}
                statIconName="fas fa-chart-line"
                statIconColor="bg-indigo-500"
                color="indigo"
                loading={loading}
              />
              <CardStats
                statSubtitle="Today Profit"
                statTitle={`৳ ${Number(stats?.todaysProfileAmount || 0).toFixed(2)}`}
                statIconName="fas fa-hand-holding-usd"
                statIconColor="bg-green-500"
                color="green"
                loading={loading}
              />
              <CardStats
                statSubtitle="Monthly Sales"
                statTitle={`৳ ${Number(stats?.monthlyCompletedOrderAmount || 0).toFixed(2)}`}
                statDescripiron={`Cost: ৳ ${Number(stats?.monthlyCompletedOrderBPrice || 0).toFixed(2)}`}
                statIconName="fas fa-calendar-check"
                statIconColor="bg-purple-500"
                color="purple"
                loading={loading}
              />
              <CardStats
                statSubtitle="Monthly Profit"
                statTitle={`৳ ${Number(stats?.monthlyProfitAmount || 0).toFixed(2)}`}
                statIconName="fas fa-money-bill-wave"
                statIconColor="bg-teal-500"
                color="teal"
                loading={loading}
              />
            </div>
          </section>

          {/* Section 3: Economy (Remaining) */}
          <section>
          
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <CardStats
                statSubtitle="Total User Coins"
                statTitle={`${stats?.totalCoinsAcrossUsers || 0} Coins`}
                statDescripiron={`Value: ৳ ${Number(stats?.totalCoinsMoney || 0).toFixed(2)}`}
                statIconName="fas fa-coins"
                statIconColor="bg-amber-500"
                color="amber"
                loading={loading}
              />
              <CardStats
                statSubtitle="Coins Converted Today"
                statTitle={`${stats?.todaysConvertedCoins || 0} Coins`}
                statDescripiron={`Month: ${stats?.monthlyConvertedCoins || 0} (৳ ${Number(stats?.monthlyConvertedMoney || 0).toFixed(2)})`}
                statIconName="fas fa-exchange-alt"
                statIconColor="bg-rose-500"
                color="rose"
                loading={loading}
              />
              <CardStats
                statSubtitle="Cashback Today"
                statTitle={`৳ ${Number(stats?.todaysCashback || 0).toFixed(2)}`}
                statDescripiron={`This Month: ৳ ${Number(stats?.monthlyCashback || 0).toFixed(2)}`}
                statIconName="fas fa-gift"
                statIconColor="bg-pink-500"
                color="pink"
                loading={loading}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
