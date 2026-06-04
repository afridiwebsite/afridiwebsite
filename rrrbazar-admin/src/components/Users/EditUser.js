import React, { useEffect, useRef, useState } from "react";
import { useHistory, withRouter } from "react-router-dom";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import {
  FaIdBadge,
  FaWallet,
  FaPlusCircle,
  FaCoins,
  FaShoppingCart,
  FaClipboardList,
  FaGift,
} from "react-icons/fa";
import axiosInstance from "../../common/axios";
import useGet from "../../hooks/useGet";
import {
  getErrors,
  hasData,
  imgPath,
  toastDefault,
} from "../../utils/handler.utils";
import Loader from "../Loader/Loader";

// Reusable per-card style. Same six stat tiles the storefront's profile
// page renders, just sourced from an admin-side aggregate endpoint so the
// values reflect the user being edited rather than the admin themself.
const STAT_DEFS = [
  {
    key: "id",
    label: "User Id",
    icon: <FaIdBadge />,
    color: "#3b82f6",
    anim: "pp-float 3s ease-in-out infinite",
    format: (v) => v ?? "—",
  },
  {
    key: "wallet",
    label: "Total Wallet",
    icon: <FaWallet />,
    color: "#10b981",
    anim: "pp-pulse 2s ease-in-out infinite",
    format: (v) => `৳ ${Number(v || 0).toFixed(2)}`,
  },
  {
    key: "total_added",
    label: "Total Added",
    icon: <FaPlusCircle />,
    color: "#8b5cf6",
    anim: "pp-bounce 1.6s ease-in-out infinite",
    format: (v) => `৳ ${Number(v || 0).toFixed(2)}`,
  },
  {
    key: "coins",
    label: "Total Coins",
    icon: <FaCoins />,
    color: "#f59e0b",
    anim: "pp-spin 8s linear infinite",
    format: (v) => Number(v || 0),
  },
  {
    key: "total_spent",
    label: "Total Spent",
    icon: <FaShoppingCart />,
    color: "#ef4444",
    anim: "pp-shake 2.6s ease-in-out infinite",
    format: (v) => `৳ ${Number(v || 0).toFixed(2)}`,
  },
  {
    key: "total_order",
    label: "Total Order",
    icon: <FaClipboardList />,
    color: "#06b6d4",
    anim: "pp-swing 2.4s ease-in-out infinite",
    format: (v) => Number(v || 0),
  },
];

const STAT_ANIM_CSS = `
    @keyframes pp-float  { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
    @keyframes pp-pulse  { 0%,100% { transform: scale(1); }       50% { transform: scale(1.12); } }
    @keyframes pp-bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
    @keyframes pp-spin   { from { transform: rotate(0); } to { transform: rotate(360deg); } }
    @keyframes pp-shake  { 0%,100% { transform: translateX(0) rotate(0); }
                           25%     { transform: translateX(-2px) rotate(-6deg); }
                           75%     { transform: translateX(2px)  rotate(6deg); } }
    @keyframes pp-swing  { 0%,100% { transform: rotate(0); }
                           25%     { transform: rotate(15deg); }
                           75%     { transform: rotate(-15deg); } }
`;

function EditUser(props) {
  const userId = props.match.params.id;

  const [loading, setLoading] = useState(null);
  const [data, loadingData, error, refreshData] = useGet(`admin/user/${userId}`);
  // Aggregate stats — kept in a separate request so the existing user fetch
  // doesn't need to grow extra fields.
  const [stats, loadingStats, , refreshStats] = useGet(
    `admin/user/${userId}/stats`
  );

  const wallet = useRef(null);
  const coins = useRef(null);
  const password = useRef(null);

  // Reseller toggle — hydrated from the user row once it loads. Persisted
  // through the existing /admin/user/update/:id endpoint as `user_type`
  // ('reseller' | 'normal'). Resellers unlock the cashback stat card.
  const [isReseller, setIsReseller] = useState(false);
  useEffect(() => {
    if (data?.user_type != null) {
      setIsReseller(
        String(data.user_type).toLowerCase() === "reseller"
      );
    }
  }, [data?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResellerChange = (e) => {
    const val = e.target.checked;
    if (val) {
      Swal.fire({
        title: "Promote to Reseller?",
        text: "This user will earn per-package Reseller cashback on every completed order.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, promote!",
      }).then((result) => {
        if (result.isConfirmed) {
          setIsReseller(true);
        }
      });
    } else {
      setIsReseller(false);
    }
  };

  const editPaymentMethodHandler = (e) => {
    e.preventDefault();
    setLoading(true);
    axiosInstance
      .post(`/admin/user/update/${userId}`, {
        wallet: wallet.current.value,
        coins: coins.current.value,
        user_type: isReseller ? "reseller" : "normal",
        // The password input is currently commented out, so the ref
        // never gets attached. Use optional chaining so accessing it
        // doesn't throw and abort the submit.
        password: password.current?.value || undefined,
      })
      .then((res) => {
        toast.success("User updated successfully", toastDefault);

        setTimeout(() => {
          setLoading(false);
          refreshData();
          refreshStats();
        }, 1500);
      })
      .catch((err) => {
        toast.error(getErrors(err, false, true), toastDefault);
        setLoading(false);
      });
  };

  return (
    <section className="relative container_admin">
      <style dangerouslySetInnerHTML={{ __html: STAT_ANIM_CSS }} />
      <div className="bg-white overflow-hidden rounded">
        <div className="px-6 py-3 border-b border-gray-200">
          <h3 className="text-lg font-bold text-black">
            Edit user - {data?.username}
          </h3>
        </div>
        <div className="py-10 px-4">
          <div className="w-full md:w-[70%] min-h-[300px] mx-auto py-6 relative border border-gray-200 px-4 rounded">
            {loadingData && <Loader absolute />}
            {loading && <Loader absolute />}
            {hasData(data, loading || loadingData, error) && (
              <form onSubmit={editPaymentMethodHandler}>
                <div className="flex flex-col items-center mb-6">
                  <img
                    alt="Avatar"
                    src={
                      data?.avatar
                        ? data.avatar.startsWith("http")
                          ? data.avatar
                          : imgPath(data.avatar)
                        : require("../../assets/img/team-2-800x800.jpg").default
                    }
                    className="shadow-xl rounded-full h-24 w-24 object-cover border-none"
                  />
                  <h4 className="text-xl font-bold mt-4">{data?.username}</h4>
                  <p className="text-gray-500 text-sm">{data?.email}</p>
                </div>

                {/* Stat cards — mirror of the storefront Profile page.
                    The cashback card is appended only when this user is a
                    reseller; non-resellers stay on the six-card row. */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
                  {STAT_DEFS.map((s) => {
                    const value = s.key === "id" ? data?.id : stats?.[s.key];
                    return (
                      <div
                        key={s.key}
                        className="relative bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
                        style={{ borderTop: `3px solid ${s.color}` }}
                      >
                        <div className="flex flex-col items-center gap-2 py-4 px-2">
                          <div
                            className="inline-flex items-center justify-center w-10 h-10 rounded-full text-lg"
                            style={{
                              color: s.color,
                              background: `${s.color}1a`,
                              animation: s.anim,
                            }}
                          >
                            {s.icon}
                          </div>
                          <p className="text-lg font-bold text-gray-800 leading-tight text-center">
                            {loadingStats && s.key !== "id"
                              ? "…"
                              : s.format(value)}
                          </p>
                          <p className="text-xs text-gray-500 text-center">
                            {s.label}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {isReseller && (
                    <div
                      className="relative bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
                      style={{ borderTop: "3px solid #ec4899" }}
                    >
                      <div className="flex flex-col items-center gap-2 py-4 px-2">
                        <div
                          className="inline-flex items-center justify-center w-10 h-10 rounded-full text-lg"
                          style={{
                            color: "#ec4899",
                            background: "#ec48991a",
                            animation: "pp-bounce 1.6s ease-in-out infinite",
                          }}
                        >
                          <FaGift />
                        </div>
                        <p className="text-lg font-bold text-gray-800 leading-tight text-center">
                          {loadingStats
                            ? "…"
                            : `৳ ${Number(stats?.cashback_total || 0).toFixed(2)}`}
                        </p>
                        <p className="text-xs text-gray-500 text-center">
                          Cashback / Rewards
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="form_grid">
                    <div>
                      <label className="block text-sm font-bold mb-1">
                        Wallet (BDT)
                      </label>
                      <input
                        ref={wallet}
                        defaultValue={data?.wallet}
                        className="form_input"
                        type="number"
                        step="0.01"
                        placeholder="Wallet balance"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">
                        Coins
                      </label>
                      <input
                        ref={coins}
                        defaultValue={data?.coins}
                        className="form_input"
                        type="number"
                        placeholder="Coin balance"
                      />
                    </div>
                  </div>
                  <div className="form_grid">
                    <div>
                      <label className="inline-flex items-center cursor-pointer select-none mt-2">
                        <input
                          type="checkbox"
                          className="form-checkbox"
                          checked={isReseller}
                          onChange={handleResellerChange}
                        />
                        <span className="ml-2">Reseller</span>
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Resellers earn the per-package Reseller cashback (BDT)
                        on every completed order, on top of the regular
                        coin/cashback reward.
                      </p>
                    </div>
                  </div>

                  {/* <div className="form_grid">
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-bold mb-1">Set new password (leave blank to keep current)</label>
                                                <input ref={password} className="form_input" type="text" placeholder="New password" />
                                            </div>
                                        </div> */}

                  <div className="mt-8">
                    <button type="submit" className="cstm_btn w-full block">
                      Update User Balance
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default withRouter(EditUser);
