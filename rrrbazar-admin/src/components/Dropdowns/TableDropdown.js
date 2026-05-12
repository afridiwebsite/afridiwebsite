import React, { useRef, useState } from "react";
import { createPopper } from "@popperjs/core";

const TableDropdown = ({ children }) => {
  // dropdown props
  const [dropdownPopoverShow, setDropdownPopoverShow] = useState(false);
  const btnDropdownRef = useRef(null);
  const popoverDropdownRef = useRef(null);
  const openDropdownPopover = () => {
    createPopper(btnDropdownRef.current, popoverDropdownRef.current, {
      placement: "left-start",
    });
    setDropdownPopoverShow(true);
  };
  const closeDropdownPopover = () => {
    setDropdownPopoverShow(false);
  };
  return (
    <>
      <a
        className="text-blueGray-500 py-1 px-3"
        href="#pablo"
        ref={btnDropdownRef}
        onClick={(e) => {
          e.preventDefault();
          dropdownPopoverShow ? closeDropdownPopover() : openDropdownPopover();
        }}
      >
        <i className={`fas ${dropdownPopoverShow ? 'fa-times' : 'fa-ellipsis-v'}`}></i>
      </a>
      <div
        ref={popoverDropdownRef}
        className={`${dropdownPopoverShow ? "block " : "hidden"} bg-white text-base z-50 float-left py-2 list-none text-left rounded shadow-lg min-w-48`}
      >
        {children || <h1>Empty</h1>}
      </div>
    </>
  );
};

export default TableDropdown;
