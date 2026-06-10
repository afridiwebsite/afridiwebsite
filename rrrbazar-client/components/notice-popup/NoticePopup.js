/*
 *
 * Title: NoticePopup
 * Description: --
 * Author: Saymon
 * Date: 25 November 2021 (Thursday)
 *
 */
import { useEffect, useState } from "react";
import ReactHtmlParser from "react-html-parser";
import { IoCloseSharp } from "react-icons/io5";
import { useQuery } from "react-query";
import { getPopupNotice } from "../../api/api";
import {
  __last_seen_modal_key,
  __user_key,
} from "../../config/globalConfig";
import reactQueryConfig from "../../config/reactQueryConfig";
import { hasData, imgPath } from "../../helpers/helpers";
import { setLocal, getLocal } from "../../lib/localStorage";

function NoticePopup({ productId = null }) {
  const [showModal, setShowModal] = useState(false);
  const { data } = useQuery(
    ["notice-popup", productId],
    () => getPopupNotice(productId),
    reactQueryConfig,
  );

  useEffect(() => {
    if (hasData(data)) {
      // Namespace "seen" state per-user. Auth is a httpOnly cookie now, so key
      // off the persisted user id instead of the (gone) token.
      const user = getLocal(__user_key);
      const persistenceKey = `${__last_seen_modal_key}_${data.id}_${user?.id || "guest"}`;
      const isAlreadySeen = getLocal(persistenceKey);

      if (!isAlreadySeen) {
        setShowModal(true);
        setLocal(persistenceKey, true);
      }
    }
  }, [data]);

  const closeModal = () => {
    setShowModal(false);
  };

  if (!showModal) return null;
  return (
    <div className="_absolute_full fixed bg-black/70 z-[999999999999] _flex_center">
      <div className="relative _animate_slide_in">
        {/* Close Popup --Start-- */}
        <div
          onClick={closeModal}
          className="w-8 h-8 rounded-full overflow-hidden absolute bottom-[calc(100%+6px)] right-[6px] sm:top-0 sm:left-full _flex_center bg-white sm:-translate-x-1/2 sm:-translate-y-1/2 p-1 border border-gray-200 cursor-pointer hover:scale-110 duration-100"
        >
          <IoCloseSharp className="w-full h-full" />
        </div>
        {/* Close Popup --End-- */}
        <div
          className={`bg-white rounded-md overflow-hidden w-[95%] mx-auto sm:w-[600px] grid grid-cols-1 ${
            data?.link ? "sm:grid-cols-[45%,55%]" : ""
          }`}
        >
          <img
            src={imgPath(data?.image)}
            alt="Notice Image"
            className="w-full h-full object-cover"
          />

          <div className="p-4 flex flex-col justify-center">
            {data?.title && <h3 className="_h3 mb-1.5">{data?.title}</h3>}
            {data?.notice && (
              <div className="_subtitle1 notice-popup-body">
                {ReactHtmlParser(String(data.notice))}
              </div>
            )}
            {data?.link && (
              <div className="mt-3">
                <a
                  href={data?.link}
                  target="_blank"
                  rel="noreferrer"
                  className="_btn"
                >
                  {data?.button_text || "Go to link"}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NoticePopup;
