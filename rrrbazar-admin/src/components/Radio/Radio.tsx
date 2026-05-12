import React from 'react';
import { RadioTypes } from './Radio.types';

function Radio(ownerState, ref) {
    const { className = '', size, icon, checkedIcon, type = 'radio', label, ...props } = ownerState;

    const radioSize =
        size === 'extra_small'
            ? {
                  size: 'w-3 h-3 rounded-[3px]',
                  fontSize: 'text-[12px]',
              }
            : size === 'small'
            ? {
                  size: 'w-[14px] h-[14px] rounded-[3px]',
                  fontSize: 'text-[13px]',
              }
            : size === 'large'
            ? {
                  size: 'w-5 h-5 rounded-[5px]',
                  fontSize: 'text-[16px]',
              }
            : {
                  size: 'w-4 h-4 rounded',
                  fontSize: 'text-[14px]',
              };

    const radioCommonClasses = `${radioSize.size} ${className} ${radioSize.fontSize} duration-100 rounded-full peer-disabled:opacity-40 peer-disabled:pointer-events-none`;

    return (
        <label
            className={`flex items-center gap-2 w-max cursor-pointer ${
                props.disabled ? 'opacity-40 pointer-events-none' : ''
            }`}
        >
            <input ref={ref} type='radio' className='sr-only peer' {...props} />
            {/* Radio Uncheckd Styles */}
            <div
                className={`peer-checked:hidden ${
                    !icon
                        ? `${radioCommonClasses} border-[1.5px] border-slate-300 ring-slate-200 peer-hover:border-slate-400 peer-disabled:peer-hover:border-slate-300`
                        : ''
                }`}
            >
                {icon}
            </div>
            {/* Radio Checkd Styles */}
            <div className='hidden peer-checked:block'>
                {checkedIcon || (
                    <div className={`bg-blue-500 ${radioCommonClasses}`}>
                        <svg
                            viewBox='0 0 24 24'
                            width='100%'
                            height='100%'
                            stroke='#fff'
                            fill='#fff'
                        >
                            <path d='M8.465 8.465C9.37 7.56 10.62 7 12 7C14.76 7 17 9.24 17 12C17 13.38 16.44 14.63 15.535 15.535C14.63 16.44 13.38 17 12 17C9.24 17 7 14.76 7 12C7 10.62 7.56 9.37 8.465 8.465Z'></path>
                        </svg>
                    </div>
                )}
            </div>
            {label && (
                <span
                    className={`text-slate-600 font-medium dark:text-slate-200 ${
                        radioSize.fontSize
                    } ${props.disabled ? 'opacity-40 pointer-events-none' : ''}`}
                >
                    {label}
                </span>
            )}
        </label>
    );
}

export default React.forwardRef<HTMLInputElement, RadioTypes>(Radio);
