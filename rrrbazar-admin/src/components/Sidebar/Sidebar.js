import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import NotificationDropdown from "../../components/Dropdowns/NotificationDropdown";
import UserDropdown from "../../components/Dropdowns/UserDropdown";
import SidebarLi from "./SidebarLi";


export default function Sidebar({ isOpenSidebar }) {
  const navLinks = [
    {
      text: "Dashboard",
      path: "/",
      icon: "fas fa-tachometer-alt",
    },
    {
      text: "User",
      path: "/settings",
      icon: "fas fa-user",
      submenu: [
        {
          text: "Admin",
          path: "/admins",
          icon: "fas fa-tachometer-alt",
        },
        {
          text: "User",
          path: "/user",
          icon: "fas fa-tachometer-alt",
        },
      ],
    },
    {
      text: "Payment Method",
      path: "/payment-method",
      icon: "fas fa-money-bill-wave",
    },
    {
      text: "Topup",
      path: "/tables",
      icon: "fas fa-table",

      submenu: [
        {
          text: "Top Product",
          path: "/topup-product",
          icon: "fab fa-product-hunt",
        },
        {
          text: "Categories",
          path: "/categories",
          icon: "fas fa-tags",
        },
        {
          text: "Topup Packages",
          path: "/topup-packages",
          icon: "fas fa-cubes",
        },
        {
          text: "Physical Product",
          path: "/physical-product",
          icon: "fab fa-product-hunt",
        },
       
      ]
    },
     {
          text: "UniPin Voucher",
          path: "/upins",
          icon: "fas fa-cubes",
        },
    {
      text: "Add Wallet",
      path: "/add-wallet",
      icon: "fas fa-plus-circle",
    },

    {
      text: "Topup Order",
      path: "/tables",
      icon: "fas fa-table",

      submenu: [
        {
          text: "Order",
          path: "/order",
          icon: "fab fa-first-order",
        },
        {
          text: "Admin Order",
          path: "/subadmin-order",
          icon: "fab fa-first-order",
        },
      ],
    },
    {
      text: "Product Order",
      path: "/product-order",
      icon: "fab fa-first-order",
    },
    {
      text: "Auths",
      path: "/auths",
      icon: "fas fa-shield-alt",
    },
    {
      text: "Banner",
      path: "/banner",
      icon: "fas fa-map-marker-alt",
    },
    {
      text: "Notice",
      path: "/notice",
      icon: "fas fa-flag-checkered",
    },
    {
      text: "Site Settings",
      path: "/site-settings",
      icon: "fas fa-cog",
    },
    {
      text: "Profile",
      path: "/profile",
      icon: "fas fa-user-circle",
    },
  ];
  const [collapseShow, setCollapseShow] = useState(false);

  useEffect(() => {
    if (collapseShow) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
  }, [collapseShow])

  return (
    <>
      <div className="relative">
        <header className="flex items-center justify-between container md:hidden" >
          <div >
            <i className={`fas fa-${collapseShow ? 'times' : 'bars'} p-2 text-xl`} onClick={() => setCollapseShow(prev => !prev)}></i>
          </div>
          <div>
            {/* <img
              style={{ width: "110px" }}
              src={require("../../assets/img/selften.png").default}
              alt="SelfTen"
              className="mx-auto mt-4 mb-5"
            /> */}
            <h3 className="text-2xl text-center font-bold">Admin panel</h3>
          </div>
          <div className="flex items-center space-x-2 relative z-[999999999]" >
            <NotificationDropdown />
            <UserDropdown />
          </div>
        </header>
        <nav className={`${isOpenSidebar ? 'md:left-0' : 'md:-left-full'} ${collapseShow ? 'block' : 'hidden'} md:block fixed w-full h-[calc(100vh-75px)] top-[75px] md:top-0 left-1/2 -translate-x-1/2 z-[999] duration-150 md:w-56 md:h-screen md:translate-x-0 md:translate-y-0 overflow-hidden overflow-y-auto bg-white`}>

          <Link
            to="/"
            className="hidden md:block"
          >
            {/* <img
              style={{ width: "120px" }}
              src={require("../../assets/img/selften.png").default}
              alt="SelfTen"
              className="mx-auto mt-4 mb-5"
            /> */}
            <h3 className="text-2xl text-center font-bold">Admin panel</h3>
          </Link>


          <ul className="md:flex-col md:min-w-full flex flex-col list-none">
            {navLinks.map((e, index) => (
              <SidebarLi key={index} data={e} />
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}
