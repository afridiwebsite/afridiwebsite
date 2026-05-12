import React from "react";

// components

import CardLineChart from "../../components/Cards/CardLineChart.js";
import CardBarChart from "../../components/Cards/CardBarChart.js";
import CardPageVisits from "../../components/Cards/CardPageVisits.js";
import CardSocialTraffic from "../../components/Cards/CardSocialTraffic.js";
import HeaderStats from "../../components/Headers/HeaderStats.js";

export default function Dashboard() {

  return (
    <>
      <div className="container_admin">
        <HeaderStats />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <CardLineChart />
          <CardBarChart />
          <CardPageVisits />
          <CardSocialTraffic />
        </div>
      </div>
    </>
  );
}
