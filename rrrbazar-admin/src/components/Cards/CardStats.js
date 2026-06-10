import React from "react";
import PropTypes from "prop-types";
import Loader from '../Loader/Loader'

export default function CardStats({
  statSubtitle,
  statTitle,
  statArrow,
  statPercent,
  statPercentColor,
  statDescripiron,
  statIconName,
  statIconColor,
  loading,
  color = "white"
}) {
  // Map color names to subtle border/background classes
  const colorMap = {
    blue: "border-blue-200 bg-blue-50/30",
    emerald: "border-emerald-200 bg-emerald-50/30",
    orange: "border-orange-200 bg-orange-50/30",
    sky: "border-sky-200 bg-sky-50/30",
    indigo: "border-indigo-200 bg-indigo-50/30",
    green: "border-green-200 bg-green-50/30",
    purple: "border-purple-200 bg-purple-50/30",
    teal: "border-teal-200 bg-teal-50/30",
    amber: "border-amber-200 bg-amber-50/30",
    rose: "border-rose-200 bg-rose-50/30",
    pink: "border-pink-200 bg-pink-50/30",
    white: "border-gray-200 bg-white"
  };

  const colorClass = colorMap[color] || colorMap.white;

  // Map color names to solid accent colors
  const accentMap = {
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
    orange: "bg-orange-500",
    sky: "bg-sky-500",
    indigo: "bg-indigo-500",
    green: "bg-green-500",
    purple: "bg-purple-500",
    teal: "bg-teal-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    pink: "bg-pink-500",
    white: "bg-gray-200"
  };
  const accentClass = accentMap[color] || accentMap.white;

  return (
    <>
      <div className={`relative overflow-hidden flex flex-col min-w-0 break-words rounded-xl shadow-md border ${colorClass} transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 bg-white`}>
        {/* Top Accent Bar */}
        <div className={`h-1.5 w-full ${accentClass}`} />
        
        {loading && <Loader absolute />}
        <div className="flex-auto px-6 py-6">
          <div className="flex items-start justify-between">
            <div className="relative w-full pr-4 max-w-full flex-grow flex-1">
              <h5 className="text-blueGray-400 uppercase font-bold text-[10px] tracking-widest mb-1">
                {statSubtitle}
              </h5>
              <span className="text-2xl text-blueGray-800 font-extrabold block">
                {statTitle}
              </span>
            </div>
            <div className="relative w-auto flex-initial">
              <div
                className={
                  "text-white p-3 text-center inline-flex items-center justify-center w-12 h-12 shadow-lg rounded-xl transform transition-transform group-hover:scale-110 " +
                  statIconColor
                }
              >
                <i className={statIconName}></i>
              </div>
            </div>
          </div>
          {statDescripiron && (
            <div className="mt-4 flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${accentClass}`} />
              <p className="text-xs text-blueGray-500 font-medium italic">
                {statDescripiron}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

CardStats.defaultProps = {
  statSubtitle: "Traffic",
  statTitle: "350,897",
  statArrow: "up",
  statPercent: "3.48",
  statPercentColor: "text-emerald-500",
  statDescripiron: "",
  statIconName: "far fa-chart-bar",
  statIconColor: "bg-red-500",
  color: "white"
};

CardStats.propTypes = {
  statSubtitle: PropTypes.string,
  statTitle: PropTypes.any,
  statArrow: PropTypes.oneOf(["up", "down"]),
  statPercent: PropTypes.string,
  statPercentColor: PropTypes.string,
  statDescripiron: PropTypes.string,
  statIconName: PropTypes.string,
  statIconColor: PropTypes.string,
  loading: PropTypes.bool,
  color: PropTypes.string
};
