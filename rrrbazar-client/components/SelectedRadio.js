/*
 *
 * Title: SelectedRadio
 * Description: --
 * Author: Saymon
 * Date: 25 November 2021 (Thursday)
 *
 */
import { BsCheckLg } from 'react-icons/bs';

function SelectedRadio({
  onClick,
  topComponent,
  bottomComponent,
  isSelected,
  isError,
  disabled,
  outOfStock,
}) {
  return (
    <div
      className={`rounded cursor-pointer select-none duration-200 border relative flex items-stretch ${
        isSelected && !outOfStock && !disabled
          ? 'border-primary-500 duration-200 bg-gradient-to-b from-primary-500 to-primary-400'
          : ''
      }
    ${
      isError && !outOfStock && !disabled
        ? 'border-red-500'
        : 'border-gray-200 hover:border-gray-400'
    } justify-center ${disabled || outOfStock ? 'pointer-events-none' : ''}`}
    >
      {outOfStock && (
        <span className="absolute top-0 right-1.5 px-2 py-0 text-[11px] text-white bg-yellow-500 z-[5] rounded-full -translate-y-1/2">
          Out of stock
        </span>
      )}

      {/* Recharge Price --Star-- */}
      <div
        onClick={onClick && onClick}
        className={`flex flex-col justify-between w-full ${
          disabled || outOfStock ? 'opacity-50 pointer-events-none' : ''
        }
        `}
      >
        <div
          className={`_body2 flex-grow w-full flex items-center justify-center !text-base font-semibold text-center
        ${isSelected ? '!text-white duration-200' : '!text-gray-700'}`}
        >
          {topComponent}
        </div>
        <span
          className={`text-gray-500 rounded-t-[6px] z-10 text-[11px] py-2 border-t border-gray-100 font-medium px-2 flex items-center justify-end relative ${
            isSelected ? 'bg-gradient-to-t from-primary-500 to-primary-400' : ''
          }`}
        >
          <span
            className={`absolute top-1/2 w-full  -translate-y-1/2 text-sm duration-200 leading-[0]
            ${
              isSelected
                ? 'text-white left-3 text-left'
                : 'text-center left-1/2 -translate-x-1/2'
            }`}
          >
            {bottomComponent}
          </span>
          <div
            className={`${
              isSelected ? 'scale-1' : 'scale-0'
            } delay-75 duration-200 text-white`}
          >
            <BsCheckLg size={9} />
          </div>
        </span>
        {/* Recharge Price --End-- */}
      </div>
    </div>
  );
}

export default SelectedRadio;
