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
          {/* Row 1: Total User | Today User */}
          <CardStats
            statSubtitle="Total User"
            statTitle={stats?.totalUser}
            statIconName="fas fa-users"
            color="blue"
            loading={loading}
          />
          <CardStats
            statSubtitle="Today New Users"
            statTitle={stats?.todaysUser}
            statIconName="fas fa-user-plus"
            color="blue"
            loading={loading}
          />

          {/* Row 2: Total Wallet | Today Add Wallet */}
          <CardStats
            statSubtitle="Total Wallet"
            statTitle={`৳ ${Number(stats?.totalWallet || 0).toFixed(2)}`}
            statIconName="fas fa-wallet"
            color="emerald"
            loading={loading}
          />
          <CardStats
            statSubtitle="Wallet Added Today"
            statTitle={`৳ ${Number(stats?.todaysTotalWallet || 0).toFixed(2)}`}
            statIconName="fas fa-plus-circle"
            color="emerald"
            loading={loading}
          />

          {/* Row 3: Total Sales | Today Sales */}
          <CardStats
            statSubtitle="Total Sales"
            statTitle={`৳ ${Number(stats?.totalCompletedOrderAmount || 0).toFixed(2)}`}
            statIconName="fas fa-coins"
            color="indigo"
            loading={loading}
          />
          <CardStats
            statSubtitle="Todays Sales"
            statTitle={`৳ ${Number(stats?.todaysCompletedOrderAmount || 0).toFixed(2)}`}
            statIconName="fas fa-chart-line"
            color="indigo"
            loading={loading}
          />

          {/* Row 4: Total Order | Monthly Sales */}
          <CardStats
            statSubtitle="Total Orders"
            statTitle={stats?.totalOrder}
            statIconName="fas fa-shopping-cart"
            color="purple"
            loading={loading}
          />
          <CardStats
            statSubtitle="Monthly Sales"
            statTitle={`৳ ${Number(stats?.monthlyCompletedOrderAmount || 0).toFixed(2)}`}
            statIconName="fas fa-calendar-check"
            color="purple"
            loading={loading}
          />

          {/* Row 5: Today Order | Today Complete Order */}
          <CardStats
            statSubtitle="Today Orders"
            statTitle={stats?.todaysOrder}
            statIconName="fas fa-shopping-cart"
            color="orange"
            loading={loading}
          />
          <CardStats
            statSubtitle="Today Completed Orders"
            statTitle={stats?.todaysCompletedOrder}
            statIconName="fas fa-check-circle"
            color="orange"
            loading={loading}
          />

      
          {/* Row 7: Monthly Profit | Today Profit */}
           <CardStats
            statSubtitle="Today Profit"
            statTitle={`৳ ${Number(stats?.todaysProfileAmount || 0).toFixed(2)}`}
            statIconName="fas fa-hand-holding-usd"
            color="teal"
            loading={loading}
          />
          <CardStats
            statSubtitle="Monthly Profit"
            statTitle={`৳ ${Number(stats?.monthlyProfitAmount || 0).toFixed(2)}`}
            statIconName="fas fa-money-bill-wave"
            color="teal"
            loading={loading}
          />
         

           {/* Row 9: Monthly Cashback | Today Cashback */}
          <CardStats
            statSubtitle="Cashback This Month"
            statTitle={`৳ ${Number(stats?.monthlyCashback || 0).toFixed(2)}`}
            statIconName="fas fa-gift"
            color="pink"
            loading={loading}
          />
          <CardStats
            statSubtitle="Cashback Today"
            statTitle={`৳ ${Number(stats?.todaysCashback || 0).toFixed(2)}`}
            statIconName="fas fa-gift"
            color="pink"
            loading={loading}
          />

              {/* Row 6: Total Coin | Today Coin */}
          <CardStats
            statSubtitle="Total User Coins"
            statTitle={`${stats?.totalCoinsAcrossUsers || 0} Coins`}
            statDescripiron={`Value: ৳ ${Number(stats?.totalCoinsMoney || 0).toFixed(2)}`}
            statIconName="fas fa-coins"
            color="amber"
            loading={loading}
          />
          <CardStats
            statSubtitle="Coins Earned Today"
            statTitle={`${stats?.todaysCoinsEarned || 0} Coins`}
            statDescripiron={`Value: ৳ ${Number(stats?.todaysCoinsEarnedMoney || 0).toFixed(2)}`}
            statIconName="fas fa-coins"
            color="amber"
            loading={loading}
          />


          {/* Row 8: Monthly Coin Conversion | Today Coin Conversion */}
          <CardStats
            statSubtitle="Coins Converted This Month"
            statTitle={`${stats?.monthlyConvertedCoins || 0} Coins`}
            statDescripiron={`Value: ৳ ${Number(stats?.monthlyConvertedMoney || 0).toFixed(2)}`}
            statIconName="fas fa-exchange-alt"
            color="rose"
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

         
        </div>
      )}
    </div>
  );
}
