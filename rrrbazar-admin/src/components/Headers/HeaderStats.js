import React from "react";
import useGet from '../../hooks/useGet'
// components

import CardStats from "../../components/Cards/CardStats.js";
import { getErrors } from "../../utils/handler.utils";

// Format a money amount with thousands separators and two decimals
// (e.g. 1234567.5 -> "1,234,567.50").
const money = (v) =>
  Number(v || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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
            statTitle={`৳ ${money(stats?.totalWallet)}`}
            statIconName="fas fa-wallet"
            color="emerald"
            loading={loading}
          />
          <CardStats
            statSubtitle="Wallet Added Today"
            statTitle={`৳ ${money(stats?.todaysTotalWallet)}`}
            statIconName="fas fa-plus-circle"
            color="emerald"
            loading={loading}
          />

          {/* Row 3: Total Sales | Today Sales */}
          <CardStats
            statSubtitle="Total Sales"
            statTitle={`৳ ${money(stats?.totalCompletedOrderAmount)}`}
            statIconName="fas fa-coins"
            color="indigo"
            loading={loading}
          />
          <CardStats
            statSubtitle="Todays Sales"
            statTitle={`৳ ${money(stats?.todaysCompletedOrderAmount)}`}
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
            statTitle={`৳ ${money(stats?.monthlyCompletedOrderAmount)}`}
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
            statTitle={`৳ ${money(stats?.todaysProfileAmount)}`}
            statIconName="fas fa-hand-holding-usd"
            color="teal"
            loading={loading}
          />
          <CardStats
            statSubtitle="Monthly Profit"
            statTitle={`৳ ${money(stats?.monthlyProfitAmount)}`}
            statIconName="fas fa-money-bill-wave"
            color="teal"
            loading={loading}
          />
         

           {/* Row 9: Monthly Cashback | Today Cashback */}
          <CardStats
            statSubtitle="Cashback This Month"
            statTitle={`৳ ${money(stats?.monthlyCashback)}`}
            statIconName="fas fa-gift"
            color="pink"
            loading={loading}
          />
          <CardStats
            statSubtitle="Cashback Today"
            statTitle={`৳ ${money(stats?.todaysCashback)}`}
            statIconName="fas fa-gift"
            color="pink"
            loading={loading}
          />

              {/* Row 6: Total Coin | Today Coin */}
          <CardStats
            statSubtitle="Total User Coins"
            statTitle={`${stats?.totalCoinsAcrossUsers || 0} Coins`}
            statDescripiron={`Value: ৳ ${money(stats?.totalCoinsMoney)}`}
            statIconName="fas fa-coins"
            color="amber"
            loading={loading}
          />
          <CardStats
            statSubtitle="Coins Earned Today"
            statTitle={`${stats?.todaysCoinsEarned || 0} Coins`}
            statDescripiron={`Value: ৳ ${money(stats?.todaysCoinsEarnedMoney)}`}
            statIconName="fas fa-coins"
            color="amber"
            loading={loading}
          />


          {/* Row 8: Monthly Coin Conversion | Today Coin Conversion */}
          <CardStats
            statSubtitle="Coins Converted This Month"
            statTitle={`${stats?.monthlyConvertedCoins || 0} Coins`}
            statDescripiron={`Value: ৳ ${money(stats?.monthlyConvertedMoney)}`}
            statIconName="fas fa-exchange-alt"
            color="rose"
            loading={loading}
          />
          <CardStats
            statSubtitle="Coins Converted Today"
            statTitle={`${stats?.todaysConvertedCoins || 0} Coins`}
            statDescripiron={`Value: ৳ ${money(stats?.todaysConvertedMoney)}`}
            statIconName="fas fa-exchange-alt"
            color="rose"
            loading={loading}
          />

         
        </div>
      )}
    </div>
  );
}
