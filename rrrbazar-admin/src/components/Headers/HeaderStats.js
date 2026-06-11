import React from "react";
import useGet from '../../hooks/useGet'
// components

import CardStats from "../../components/Cards/CardStats.js";
import { getErrors } from "../../utils/handler.utils";

export default function HeaderStats() {
  const [stats, loading, error] = useGet('admin/dashboard-stats')
  return (
    <div className="pb-8 py-5">
      {error && (
        <div className="text-center py-4">
          <ul className="inline-block">{getErrors(error, false, true)}</ul>
        </div>
      )}

      {!error && (
        <div className="grid grid-cols-2 gap-2 items-start">
          {/* Left column: totals / today's primary stats */}
          <div className="flex flex-col gap-2">
            <CardStats
              statSubtitle="Total User"
              statTitle={stats?.totalUser}
              statIconName="fas fa-users"
              color="blue"
              loading={loading}
            />
            <CardStats
              statSubtitle="Total Wallet"
              statTitle={`৳ ${Number(stats?.totalWallet || 0).toFixed(2)}`}
              statIconName="fas fa-wallet"
              color="emerald"
              loading={loading}
            />
            <CardStats
              statSubtitle="Todays Sales"
              statTitle={`৳ ${Number(stats?.todaysCompletedOrderAmount || 0).toFixed(2)}`}
              // statDescripiron={`Cost: ৳ ${Number(stats?.todaysCompletedOrderBPrice || 0).toFixed(2)}`}
              statIconName="fas fa-chart-line"
              color="indigo"
              loading={loading}
            />
            <CardStats
              statSubtitle="Today Profit"
              statTitle={`৳ ${Number(stats?.todaysProfileAmount || 0).toFixed(2)}`}
              statIconName="fas fa-hand-holding-usd"
              color="green"
              loading={loading}
            />
            <CardStats
              statSubtitle="Total User Coins"
              statTitle={`${stats?.totalCoinsAcrossUsers || 0} Coins`}
              statDescripiron={`Value: ৳ ${Number(stats?.totalCoinsMoney || 0).toFixed(2)}`}
              statIconName="fas fa-coins"
              color="amber"
              loading={loading}
            />
            <CardStats
              statSubtitle="Coins Converted Today"
              statTitle={`${stats?.todaysConvertedCoins || 0} Coins`}
              statDescripiron={`Value: ৳ ${Number(stats?.todaysConvertedMoney || 0).toFixed(2)}`}
              statIconName="fas fa-exchange-alt"
              color="rose"
              loading={loading}
            />
            <CardStats
              statSubtitle="Cashback Today"
              statTitle={`৳ ${Number(stats?.todaysCashback || 0).toFixed(2)}`}
              statIconName="fas fa-gift"
              color="pink"
              loading={loading}
            />
          </div>

          {/* Right column: monthly / derived stats */}
          <div className="flex flex-col gap-2">
            <CardStats
              statSubtitle="Today New Users"
              statTitle={stats?.todaysUser}
              statIconName="fas fa-user-plus"
              color="sky"
              loading={loading}
            />
            <CardStats
              statSubtitle="Wallet Added Today"
              statTitle={`৳ ${Number(stats?.todaysTotalWallet || 0).toFixed(2)}`}
              statIconName="fas fa-plus-circle"
              color="emerald"
              loading={loading}
            />
            <CardStats
              statSubtitle="Today Orders"
              statTitle={stats?.todaysOrder}
              statDescripiron={`Completed: ${stats?.todaysCompletedOrder}`}
              statIconName="fas fa-shopping-cart"
              color="orange"
              loading={loading}
            />
            <CardStats
              statSubtitle="Monthly Sales"
              statTitle={`৳ ${Number(stats?.monthlyCompletedOrderAmount || 0).toFixed(2)}`}
              // statDescripiron={`Cost: ৳ ${Number(stats?.monthlyCompletedOrderBPrice || 0).toFixed(2)}`}
              statIconName="fas fa-calendar-check"
              color="purple"
              loading={loading}
            />
            <CardStats
              statSubtitle="Monthly Profit"
              statTitle={`৳ ${Number(stats?.monthlyProfitAmount || 0).toFixed(2)}`}
              statIconName="fas fa-money-bill-wave"
              color="teal"
              loading={loading}
            />
            <CardStats
              statSubtitle="Coins Converted This Month"
              statTitle={`${stats?.monthlyConvertedCoins || 0} Coins`}
              statDescripiron={`Value: ৳ ${Number(stats?.monthlyConvertedMoney || 0).toFixed(2)}`}
              statIconName="fas fa-exchange-alt"
              color="rose"
              loading={loading}
            />
            <CardStats
              statSubtitle="Cashback This Month"
              statTitle={`৳ ${Number(stats?.monthlyCashback || 0).toFixed(2)}`}
              statIconName="fas fa-gift"
              color="pink"
              loading={loading}
            />
          </div>
        </div>
      )}
    </div>
  );
}
