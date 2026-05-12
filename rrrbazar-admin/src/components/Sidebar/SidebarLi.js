import React, { useState } from "react";
import { useLocation } from "react-router-dom";


function SidebarLi({ data }) {
  const [isShowSubmenu, setIsShowSubmenu] = useState(false)
  const location = useLocation();
  const isActive = (pathName) => {
    return location.pathname === pathName;
  };

  return (
    <li
      className="cursor-pointer group select-none"
    >
      <div className="flex items-center justify-between w-full group">
        {data?.submenu?.length > 0 ? (
          <>
            <div className="px-5 flex justify-between items-center w-full hover:bg-gray-200" onClick={() => setIsShowSubmenu(!isShowSubmenu)}>
              <div className="text-xs pointer-events-none uppercase py-3 font-bold block text-blueGray-500 group-hover:text-black">
                <i className={`${data?.icon} mr-2 text-sm`}></i>
                {data?.text}
              </div>
              <i className="fas fa-chevron-down pointer-events-none text-blueGray-500 group-hover:text-black text-xs"></i>
            </div>
          </>
        ) : (
          <a
            className={`block text-xs uppercase py-3 font-bold block sidebar_anchor ${isActive(data?.path) && "active_anchor"
              } `}
            href={data?.path}
          >
            <i className={`${data?.icon} mr-2 text-sm`}></i> {data?.text}
          </a>
        )}
      </div>
      {data?.submenu?.length > 0 && isShowSubmenu && (
        <ul className="w-full mt-1 mb-2 border-l-[3px] border-blue-600 ml-5">
          {data?.submenu.map((s, i) => (
            <li className="w-full" key={i}>
              <a
                href={s?.path}
                className={`block text-xs uppercase py-2 font-bold block sidebar_anchor ${isActive(s.path) && "active_anchor"
                  } `}
              >
                <i className={`${s?.icon} mr-2 text-sm`}></i> {s?.text}
              </a>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default SidebarLi;
