import React from "react";
import ReactApexChart from 'react-apexcharts';
import useGet from "../../hooks/useGet";
import { hasData } from "../../utils/handler.utils";
import UiHandler from "../UiHandler";


export default function CardLineChart() {


  const [data, loading, error] = useGet('/admin/orders-chart-data');

  const CHART_DATA = [
    {
      name: 'Orders',
      type: 'line',
      data: data?.data || []
    },
  ];

  const chartOptions = {
    stroke: { width: 2, curve: 'smooth', },
    // fill: { type: ['solid', 'solid', 'solid'] },
    labels: data?.dates || [],
    xaxis: { type: 'datetime' },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (y) => {
          if (typeof y !== 'undefined') {
            return `${y.toFixed(0)} orders`;
          }
          return y;
        }
      }
    }
  };


  return (
    <>
      <div className="relative flex flex-col min-w-0 break-words w-full shadow-lg rounded bg-white">
        <div className="rounded-t mb-0 px-4 py-3 bg-transparent bg-blue-500">
          <div className="flex flex-wrap items-center">
            <div className="relative w-full max-w-full flex-grow flex-1">
              <h6 className="uppercase text-blueGray-100 mb-1 text-xs font-semibold">
                Overview
              </h6>
              <h2 className="text-white text-xl font-semibold">Orders chart</h2>
            </div>
          </div>
        </div>
        <div className="flex-auto">
          <div className="relative h-full">
            <UiHandler absoluteLoader={true} loading={loading} error={error} data={data} />
            {
              hasData(data, loading) && (
                <ReactApexChart className="mt-3" type="line" series={CHART_DATA} options={chartOptions} height={364} />
              )
            }
          </div>
        </div>
      </div>
    </>
  );
}
