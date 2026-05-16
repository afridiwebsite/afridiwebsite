import React from "react";
import useGet from '../../hooks/useGet'
// components

import CardStats from "../../components/Cards/CardStats.js";
import { getErrors } from "../../utils/handler.utils";

export default function HeaderStats() {
  const [stats, loading, error] = useGet('admin/dashboard-stats')
  return (
    <>
      {/* Header */}
      <div className="relative mb-4">
        <div className="mx-auto w-full">
          {
            !error ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <CardStats
                  statSubtitle="Total User"
                  statTitle={stats?.totalUser}
                  // statDescripiron="Since last month"
                  statIconName="far fa-chart-bar"
                  statIconColor="bg-red-500"
                  loading={loading}
                />
                <CardStats
                  statSubtitle="Total Wallet"
                  statTitle={stats?.totalWallet}
                  statDescripiron={`Today Added ${stats?.todaysTotalWallet}`}
                  // statDescripiron="Since last week"
                  statIconName="fas fa-chart-pie"
                  statIconColor="bg-blue-500"
                  loading={loading}
                />
                <CardStats
                  statSubtitle="Today Orders"
                  statTitle={stats?.todaysOrder}
                  statDescripiron={`Today Completed ${stats?.todaysCompletedOrder}`}
                  statIconName="fas fa-sort-amount-up-alt"
                  statIconColor="bg-purple-500"
                  loading={loading}
                />
                <CardStats
                  statSubtitle="Today Users"
                  statTitle={stats?.todaysUser}
                  // statDescripiron="Since yesterday"
                  statIconName="fas fa-users"
                  statIconColor="bg-pink-500"
                  loading={loading}
                />
              </div>
            ) : (
              <ul className="text-center py-4" >
                {getErrors(error, false, true)}
              </ul>
            )
          }

        </div>
      </div>

      <div className="relative mb-4">
        <div className="mx-auto w-full">
          {
            !error ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <CardStats
                  statSubtitle="Todays Sales Amount"
                  statTitle={stats?.todaysCompletedOrderAmount}
                  statDescripiron={`Today Buy ${stats?.todaysCompletedOrderBPrice}`}
                  // statDescripiron="Since last week"
                  statIconName="fas fa-chart-pie"
                  statIconColor="bg-blue-500"
                  loading={loading}
                />
                <CardStats
                  statSubtitle="Today Profit"
                  statTitle={stats?.todaysProfileAmount}
                  statIconName="fas fa-sort-amount-up-alt"
                  statIconColor="bg-blue-500"
                  loading={loading}
                />
                <CardStats
                  statSubtitle="Monthly Profit"
                  statTitle={stats?.monthlyProfitAmount}
                  statIconName="fas fa-chart-line"
                  statIconColor="bg-green-500"
                  loading={loading}
                />
              </div>
            ) : (
              <ul className="text-center py-4" >
                {getErrors(error, false, true)}
              </ul>
            )
          }

        </div>
      </div>
    </>
  );
}
