import React, { useEffect, useState } from "react";

function Dropdown({ children, dotClass, dropdwondWidth }) {
  const [showDropdown, setShowDropdown] = useState(false);

  const toogleDropdown = (e) => {
    if (e.target.id !== "dropdownClick") {
      setShowDropdown(false);
    }
  };

  useEffect(() => {
    document.addEventListener("click", toogleDropdown);
    return () => {
      document.removeEventListener("click", toogleDropdown);
    };
  });

  return (
    <>
      {/* {showDropdown && (
        <div className="absolute_full fixed cursor-default z-40"></div>
      )} */}
      <div className={`relative flex justify-end ${showDropdown && "z-50"}`}>
        <div
          className={`${dotClass || ""
            } max-w-[22px] status_box_small text-gray-700 duration-100`}
          onClick={() => {
            setShowDropdown(!showDropdown);
          }}
          id="dropdownClick"
        >
          <div className="list_icon_box p-0 flex justify-end pointer-events-none">
            <svg
              x="0px"
              y="0px"
              viewBox="0 0 98.258 98.258"
              width="10"
              height="10"
            >
              <g>
                <g>
                  <path d="M49.129,0c-10.3,0-18.678,8.377-18.678,18.677c0,10.3,8.378,18.678,18.678,18.678c10.301,0,18.678-8.378,18.678-18.678 C67.807,8.377,59.43,0,49.129,0z" />
                  <path d="M49.129,60.902c-10.3,0-18.678,8.379-18.678,18.678c0,10.301,8.378,18.678,18.678,18.678 c10.301,0,18.678-8.377,18.678-18.678S59.43,60.902,49.129,60.902z" />
                </g>
              </g>
            </svg>
          </div>
        </div>
        {
          <div
            className={`${showDropdown ? 'scale-100' : 'scale-0'} duration-150 origin-top-right z-20 absolute top-0 right-0 ${dropdwondWidth || "min-w-[120px]"
              }`}
          >
            {children}
          </div>
        }
      </div>
    </>
  );
}

export default Dropdown;
