/*
 *
 * Title: Avatar
 * Description: --
 * Author: Saymon
 * Date: 25 November 2021 (Thursday)
 *
 */
import { FaUserAlt } from 'react-icons/fa';
function Avatar({ size = 50, src, text, className, onClick }) {
  const quatar = size / 4;
  return (
    <div
      style={{
        width: size,
        height: size,
      }}
      onClick={onClick && onClick}
      className={`overflow-hidden rounded-full bg-gray-100 _flex_center flex-shrink-0 select-none ${
        className || ''
      }`}
    >
      {src ? (
        <img src={src} className="w-full h-full object-cover" alt="?" />
      ) : text ? (
        <span
          className="uppercase font-bold"
          style={{ fontSize: quatar * 2.5 }}
        >
          {text}
        </span>
      ) : (
        <FaUserAlt
          size={quatar * 3.5}
          className="text-gray-700"
          style={{ marginBottom: `-${quatar / 2}` }}
        />
      )}
    </div>
  );
}

export default Avatar;
