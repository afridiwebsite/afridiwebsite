import React, { useState } from "react";
import AdminNavbar from "../components/Navbars/AdminNavbar.js";
import Sidebar from "../components/Sidebar/Sidebar.js";
import FooterAdmin from "../components/Footers/FooterAdmin.js";
import { getLocal } from "../utils/localStorage.utils.js";

export default function AdminLayout({ children }) {
  const is_open_sidebar = getLocal('is_open_sidebar')
  const [isOpenSidebar, setIsOpenSidebar] = useState(is_open_sidebar || false)
  return (
    <>
      { <Sidebar isOpenSidebar={isOpenSidebar} /> }
      <div className={`relative ${isOpenSidebar ? 'md:ml-56' : 'md:ml-0'} duration-150 bg-gray-100 min-h-screen flex flex-col`}>
        <AdminNavbar setIsOpenSidebar={setIsOpenSidebar} />
        <div className="mx-auto w-full pt-5"> {/* px-4 md:px-10  */}
          {children}
        </div>
        <FooterAdmin />
      </div>
    </>
  );
}
