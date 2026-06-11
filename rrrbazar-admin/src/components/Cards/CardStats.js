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
  // Map color names to full-body gradient backgrounds
  const colorMap = {
    blue: "bg-gradient-to-br from-blue-500 to-blue-700",
    emerald: "bg-gradient-to-br from-emerald-500 to-emerald-700",
    orange: "bg-gradient-to-br from-orange-500 to-orange-600",
    sky: "bg-gradient-to-br from-sky-500 to-sky-700",
    indigo: "bg-gradient-to-br from-indigo-500 to-indigo-700",
    green: "bg-gradient-to-br from-green-500 to-green-700",
    purple: "bg-gradient-to-br from-purple-500 to-purple-700",
    teal: "bg-gradient-to-br from-teal-500 to-teal-700",
    amber: "bg-gradient-to-br from-amber-400 to-amber-600",
    rose: "bg-gradient-to-br from-rose-500 to-rose-700",
    pink: "bg-gradient-to-br from-pink-500 to-pink-700",
    white: "bg-gradient-to-br from-gray-600 to-gray-800"
  };

  const colorClass = colorMap[color] || colorMap.white;

  return (
    <>
      <div className={`group relative overflow-hidden flex h-full flex-col min-w-0 break-words rounded-xl shadow-md ${colorClass} transition-all duration-300 hover:shadow-2xl hover:-translate-y-1`}>
        {/* Decorative glow */}
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 -left-6 w-28 h-28 rounded-full bg-black/10" />

        {loading && <Loader absolute />}
        <div className="relative flex-auto px-4 py-4">
          <div className="flex items-start justify-between">
            <div className="relative w-full pr-3 max-w-full flex-grow flex-1">
              <h5 className="text-white/70 uppercase font-bold text-[9px] tracking-widest mb-1">
                {statSubtitle}
              </h5>
              <span className="text-lg text-white font-extrabold block drop-shadow-sm break-words">
                {statTitle}
              </span>
            </div>
            <div className="relative w-auto flex-initial">
              <div className="text-white text-sm text-center inline-flex items-center justify-center w-9 h-9 shadow-lg rounded-lg bg-white/20 backdrop-blur-sm transform transition-transform group-hover:scale-110">
                <i className={statIconName}></i>
              </div>
            </div>
          </div>
          {statDescripiron && (
            <div className="mt-3 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
              <p className="text-[11px] text-white/90 font-medium italic">
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
