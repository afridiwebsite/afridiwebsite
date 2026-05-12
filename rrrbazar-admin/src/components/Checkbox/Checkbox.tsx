import React, { useEffect } from 'react';
import { CheckboxTypes } from './Checkbox.types';

function Checkbox(ownerState, ref) {
    const {
        className = '',
        size,
        indeterminate,
        icon,
        checkedIcon,
        indeterminateIcon,
        label,
        type = 'checkbox',
        ...props
    } = ownerState;

    const defaultRef = React.useRef();
    const resolvedRef = ref || defaultRef;

    useEffect(() => {
        if (indeterminate === true) {
            resolvedRef.current.checked = false;
            resolvedRef.current.indeterminate = true;
        } else resolvedRef.current.indeterminate = false;
    }, [indeterminate]);

    const checkboxSize =
        size === 'extra_small'
            ? {
                  size: 'w-3 h-3 rounded-[2px]',
                  fontSize: 'text-[12px]',
              }
            : size === 'small'
            ? {
                  size: 'w-[14px] h-[14px] rounded-[2px]',
                  fontSize: 'text-[13px]',
              }
            : size === 'large'
            ? {
                  size: 'w-5 h-5 rounded-[4px]',
                  fontSize: 'text-[16px]',
              }
            : {
                  size: 'w-4 h-4 rounded-[3px]',
                  fontSize: 'text-[14px]',
              };

    const checkboxCommonClasses = `${checkboxSize.size} ${className} duration-100 ring-blue-200 dark:ring-blue-400 peer-focus:ring-1 peer-focus:border-blue-500 peer-disabled:opacity-40 peer-disabled:pointer-events-none`;

    return (
        <label
            className={`flex items-center gap-2 cursor-pointer w-max ${
                props.disabled ? 'opacity-40 pointer-events-none' : ''
            }`}
        >
            <div>
                <input ref={resolvedRef} type={'checkbox'} className='peer sr-only' {...props} />
                {/* Checkbox Uncheckd Styles */}
                <div
                    className={`peer-checked:hidden peer-indeterminate:hidden ${
                        !icon
                            ? `${checkboxCommonClasses} border-[1.5px] border-slate-300 peer-hover:border-slate-400 peer-disabled:peer-hover:border-slate-300`
                            : 'peer-focus:scale-105'
                    }`}
                >
                    {icon}
                </div>
                {/* Checkbox Checkd Styles */}
                <div
                    className={`hidden peer-checked:block ${
                        !checkedIcon ? `bg-blue-500 px-[3px] ${checkboxCommonClasses}` : ''
                    }`}
                >
                    {checkedIcon || (
                        <svg
                            stroke='#fff'
                            fill='#fff'
                            strokeWidth='1.5'
                            viewBox='0 0 16 16'
                            height='100%'
                            width='100%'
                            xmlns='http://www.w3.org/2000/svg'
                        >
                            <path d='M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z'></path>
                        </svg>
                    )}
                </div>
                {/* Checkbox Indeterminate Styles */}
                <div
                    className={`hidden peer-indeterminate:block ${
                        !indeterminateIcon ? `bg-blue-500 px-0.5 ${checkboxCommonClasses}` : ''
                    }`}
                >
                    {indeterminateIcon || (
                        <svg
                            stroke='#fff'
                            fill='none'
                            strokeWidth='3'
                            viewBox='0 0 24 24'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            height='100%'
                            width='100%'
                            xmlns='http://www.w3.org/2000/svg'
                        >
                            <line x1='5' y1='12' x2='19' y2='12'></line>
                        </svg>
                    )}
                </div>
            </div>
            {label && (
                <span
                    className={`text-slate-600 font-medium dark:text-slate-200 ${checkboxSize.fontSize}`}
                >
                    {label}
                </span>
            )}
        </label>
    );
}

export default React.forwardRef<HTMLInputElement, CheckboxTypes>(Checkbox);
