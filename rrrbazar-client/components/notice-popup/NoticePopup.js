/*
 *
 * Title: NoticePopup
 * Description: --
 * Author: Saymon
 * Date: 25 November 2021 (Thursday)
 *
 */
import { useContext, useEffect, useState } from 'react';
import { IoCloseSharp } from 'react-icons/io5';
import { useQuery } from 'react-query';
import { getPopupNotice } from '../../api/api';
import { __last_seen_modal_key } from '../../config/globalConfig';
import reactQueryConfig from '../../config/reactQueryConfig';
import { hasData, imgPath } from '../../helpers/helpers';
import { setSession, getSession, setLocal } from '../../lib/localStorage';
function NoticePopup() {
  const [showModal, setShowModal] = useState(false);
  const { data } = useQuery('notice-popup', getPopupNotice, reactQueryConfig);

  useEffect(() => {
    const isAlreadySeenModal = getSession(__last_seen_modal_key) === data?.id;
    if (hasData(data) && !isAlreadySeenModal) {
      setShowModal(true);
    }
  }, [data]);

  const closeModal = (id) => {
    setSession(__last_seen_modal_key, id);
    setShowModal(false);
  };

  if (!showModal) return null;
  return (
    <div className="_absolute_full fixed bg-black/70 z-[99999999999] _flex_center">
      <div className="relative _animate_slide_in">
        {/* Close Popup --Start-- */}
        <div
          onClick={() => closeModal(data?.id)}
          className="w-8 h-8 rounded-full overflow-hidden absolute bottom-[calc(100%+6px)] right-[6px] sm:top-0 sm:left-full _flex_center bg-white sm:-translate-x-1/2 sm:-translate-y-1/2 p-1 border border-gray-200 cursor-pointer hover:scale-110 duration-100"
        >
          <IoCloseSharp className="w-full h-full" />
        </div>
        {/* Close Popup --End-- */}
        <div className="bg-white rounded-md overflow-hidden w-[95%] mx-auto sm:w-[600px] grid grid-cols-1 sm:grid-cols-[45%,55%]">
          <img
            src={imgPath(data?.image)}
            alt="Notice Image"
            className="w-full h-full object-cover"
          />

          <div className="p-4">
            {data?.title && <h3 className="_h3 mb-1.5">{data?.title}</h3>}
            {data?.notice && <p className="_subtitle1">{data?.notice}</p>}
            {data?.link && (
              <div className="mt-3">
                <a
                  href={data?.link}
                  target="_blank"
                  rel="noreferrer"
                  className="_btn"
                >
                  Go to link
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
