import React from "react";

import UserDropdown from "../../components/Dropdowns/UserDropdown.js";
import { setLocal } from "../../utils/localStorage.utils.js";

export default function Navbar({ setIsOpenSidebar }) {

  const toggleSidebarHandler = () => {

    setIsOpenSidebar(prev => {
      setLocal('is_open_sidebar', !prev)
      return !prev
    })
  }

  return (
    <>
      {/* Navbar */}
      <nav className="md:bg-blue-600 sticky top-0 left-0 w-full z-50 md:flex-row md:flex-nowrap md:justify-start flex items-center md:py-4">
        <div className="w-full mx-autp items-center flex justify-between md:flex-nowrap flex-wrap container_admin">
          <i className="fas fa-bars p-2 text-xl cursor-pointer text-white hover:text-blueGray-100 mr-1.5 hidden md:inline-block" onClick={toggleSidebarHandler}></i>
          {/* Brand */}
          <a
            className="text-white text-sm uppercase hidden lg:inline-block font-semibold"
            href="#pablo"
            onClick={(e) => e.preventDefault()}
          >
            Admin Panel
          </a>
          {/* Form */}
          <form className="md:flex hidden flex-row flex-wrap items-center lg:ml-auto mr-3">
            <div className="relative flex w-full flex-wrap items-stretch">
              <span className="z-10 h-full leading-snug font-normal absolute text-center text-blueGray-300 absolute bg-transparent rounded text-base items-center justify-center w-8 pl-3 py-3">
                <i className="fas fa-search"></i>
              </span>
              <input
                type="text"
                placeholder="Search here..."
                className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 relative bg-white bg-white rounded text-sm shadow outline-none focus:outline-none focus:ring w-full pl-10"
              />
            </div>
          </form>
          {/* User */}
          <ul className="flex-col md:flex-row list-none items-center hidden md:flex">
            <UserDropdown />
          </ul>
        </div>
      </nav>
      {/* End Navbar */}
    </>
  );
}
