import React, { useEffect, useRef, useState } from 'react';
import { AdornmentProps, InputProps } from './Input.types';
import { useTwInput } from './useTwInput';

export const fontSize = (size) => {
    const adornmentFontSize =
        size === 'extra_small'
            ? 'text-[11px]'
            : size === 'small'
            ? 'text-[12px]'
            : size === 'large'
            ? 'text-base'
            : 'text-[14px]';

    return adornmentFontSize;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>((ownerState, ref) => {
    const {
        className,
        style,
        varient,
        type = 'text',
        size,
        rounded,
        startAdornment = '',
        startAdornmentClass = '',
        endAdornment,
        endAdornmentClass,
        label,
        labelClass = '',
        enablePasswordShoHideButton,
        floatingLabel,
        floatingLabelClass = '',
        placeholder,
        ...props
    } = ownerState;

    const defaultRef = React.useRef();
    const resolvedRef = ref || defaultRef;

    const inputClasses = useTwInput({
        varient,
        size,
        rounded,
    });

    const input_font_size = fontSize(size);

    const [inputExtraStyle, setInputExtraStyle] = useState<React.CSSProperties>();
    const startAdornmentRef = useRef<HTMLDivElement>(null);
    const endAdornmentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setInputExtraStyle((prev) => ({
            ...prev,
            transition: '0s',
            paddingLeft: startAdornment ? startAdornmentRef.current.clientWidth + 10 : undefined,
            paddingRight:
                endAdornment || (type === 'password' && enablePasswordShoHideButton)
                    ? endAdornmentRef.current.clientWidth + 10
                    : undefined,
        }));

        setTimeout(() => {
            setInputExtraStyle((prev) => ({
                ...prev,
                transition: undefined,
            }));
        }, 500);
    }, [startAdornment, endAdornment, size, enablePasswordShoHideButton, type]);

    return (
        <div className='inline-block w-full'>
            <label className='relative block w-full'>
                {/* Input Label --Start-- */}
                {label && (
                    <span
                        className={`${input_font_size} ${labelClass} text-slate-500 dark:text-slate-200 font-semibold mb-1 inline-block select-none ${
                            props.disabled ? 'opacity-50 pointer-events-none' : ''
                        }`}
                    >
                        {label}
                    </span>
                )}
                {/* Input Label --End-- */}

                {/* Input Wrapper --Start-- */}
                <div className='relative inline-block w-full'>
                    {/* Start Adornment --Start-- */}
                    <Adornment
                        fontSize={input_font_size}
                        startAdornmentClass={startAdornmentClass}
                        position='start'
                        ref={startAdornmentRef}
                    >
                        {startAdornment}
                    </Adornment>
                    {/* Start Adornment --End-- */}

                    {/* Main Input --Start-- */}
                    <input
                        ref={resolvedRef}
                        type={type}
                        style={{
                            ...style,
                            ...inputExtraStyle,
                        }}
                        {...props}
                        className={`${inputClasses} peer ${
                            floatingLabel ? 'placeholder:!text-transparent select-none' : ''
                        } ${className}`}
                        placeholder={floatingLabel ? 'floatingLabel' : placeholder}
                    />
                    {/* Main Input --End-- */}

                    {/* Floating Label Start --Start-- */}
                    {floatingLabel && placeholder && (
                        <span
                            style={{
                                left: inputExtraStyle?.paddingLeft,
                                transition: inputExtraStyle?.transition,
                            }}
                            className={`
                            w-max
                            before:absolute
                            before:top-1/2
                            before:-translate-y-[calc(100%-1px)]
                            before:left-0
                            before:z-[-1]
                            before:h-[3px]
                            before:w-[calc(100%+10px)]
                            pl-1.5
                            before:bg-white
                            dark:before:bg-slate-800
                            dark:peer-focus:before:bg-slate-800
                            peer-focus:pl-1.5
                            peer-focus:before:bg-white
                            select-none
                            absolute
                            pointer-events-none 
                            origin-left 
                            scale-[0.85] 
                            text-slate-500 
                            dark:text-slate-200
                            -translate-y-1/2 
                            transition-all duration-200 
                            dark:peer-focus:text-slate-200
                            peer-focus:-translate-y-1/2
                            peer-focus:!text-blue-500
                            peer-focus:scale-[0.85] 
                            peer-placeholder-shown:pl-0
                            peer-placeholder-shown:translate-y-[calc(50%-2px)] 
                            peer-placeholder-shown:scale-100 
                            peer-placeholder-shown:bg-transparent 
                            peer-placeholder-shown:px-0 
                            peer-placeholder-shown:!text-slate-400 
                            font-medium 
                            ${
                                size === 'extra_small'
                                    ? 'text-[11px] left-2'
                                    : size === 'small'
                                    ? 'py-1.5 text-[12px] left-[10px]'
                                    : size === 'large'
                                    ? 'text-base left-4'
                                    : 'text-[14px] left-3'
                            }
                            ${floatingLabelClass}`}
                        >
                            {placeholder}
                        </span>
                    )}

                    {/* bg-white
                            dark:bg-slate-800
                            peer-focus:bg-white
                            dark:peer-focus:!bg-slate-800 */}
                    {/* Floating Label Start --End-- */}

                    {/* End Adornment --Start-- */}
                    <Adornment
                        fontSize={input_font_size}
                        endAdornmentClass={endAdornmentClass}
                        position='end'
                        ref={endAdornmentRef}
                    >
                        {endAdornment}
                    </Adornment>
                    {/* End Adornment --End-- */}

                    {/* Password Field Show Hide Toggle Button --Start-- */}
                    {type === 'password' && !endAdornment && enablePasswordShoHideButton && (
                        <Adornment
                            position='end'
                            ref={endAdornmentRef}
                            className='cursor-pointer !px-0'
                        >
                            <PasswordFieldToggleButton inputRef={resolvedRef} />
                        </Adornment>
                    )}
                    {/* Password Field Show Hide Toggle Button --End-- */}
                </div>
                {/* Input Wrapper --End-- */}
            </label>
        </div>
    );
});

const PasswordFieldToggleButton = ({ inputRef }) => {
    const [inputType, setInputType] = useState<string>('password');
    useEffect(() => {
        setInputType(inputRef.current.type);
    }, [inputRef]);

    const inputTypeHandler = (prev) => {
        if (prev === 'password') {
            inputRef.current.type = 'text';
            return 'text';
        }
        inputRef.current.type = 'password';
        return 'password';
    };

    return (
        <button
            onClick={() => setInputType((prev) => inputTypeHandler(prev))}
            className='px-2.5 h-full flex items-center outline-none focus:bg-slate-100 rounded'
        >
            {inputType === 'password' ? (
                <svg
                    stroke='currentColor'
                    fill='currentColor'
                    strokeWidth='0'
                    viewBox='0 0 1024 1024'
                    height='1.2em'
                    width='1.2em'
                    xmlns='http://www.w3.org/2000/svg'
                >
                    <path d='M396 512a112 112 0 1 0 224 0 112 112 0 1 0-224 0zm546.2-25.8C847.4 286.5 704.1 186 512 186c-192.2 0-335.4 100.5-430.2 300.3a60.3 60.3 0 0 0 0 51.5C176.6 737.5 319.9 838 512 838c192.2 0 335.4-100.5 430.2-300.3 7.7-16.2 7.7-35 0-51.5zM508 688c-97.2 0-176-78.8-176-176s78.8-176 176-176 176 78.8 176 176-78.8 176-176 176z'></path>
                </svg>
            ) : (
                <svg
                    stroke='currentColor'
                    fill='currentColor'
                    strokeWidth='0'
                    viewBox='0 0 1024 1024'
                    height='1.2em'
                    width='1.2em'
                    xmlns='http://www.w3.org/2000/svg'
                >
                    <defs>
                        <clipPath>
                            <path
                                fill='none'
                                d='M124-288l388-672 388 672H124z'
                                clipRule='evenodd'
                            ></path>
                        </clipPath>
                    </defs>
                    <path d='M508 624a112 112 0 0 0 112-112c0-3.28-.15-6.53-.43-9.74L498.26 623.57c3.21.28 6.45.43 9.74.43zm370.72-458.44L836 122.88a8 8 0 0 0-11.31 0L715.37 232.23Q624.91 186 512 186q-288.3 0-430.2 300.3a60.3 60.3 0 0 0 0 51.5q56.7 119.43 136.55 191.45L112.56 835a8 8 0 0 0 0 11.31L155.25 889a8 8 0 0 0 11.31 0l712.16-712.12a8 8 0 0 0 0-11.32zM332 512a176 176 0 0 1 258.88-155.28l-48.62 48.62a112.08 112.08 0 0 0-140.92 140.92l-48.62 48.62A175.09 175.09 0 0 1 332 512z'></path>
                    <path d='M942.2 486.2Q889.4 375 816.51 304.85L672.37 449A176.08 176.08 0 0 1 445 676.37L322.74 798.63Q407.82 838 512 838q288.3 0 430.2-300.3a60.29 60.29 0 0 0 0-51.5z'></path>
                </svg>
            )}
        </button>
    );
};

const Adornment = React.forwardRef<HTMLDivElement, AdornmentProps>((props, ref) => {
    const {
        children,
        position,
        className = '',
        fontSize,
        startAdornmentClass,
        endAdornmentClass,
        ...rest
    } = props;
    if (!children) return null;

    return (
        <div
            ref={ref}
            className={`absolute top-1/2 -translate-y-1/2 h-[calc(100%-3px)] flex items-center justify-center text-slate-400 
                 font-medium dark:text-slate-500 ${
                     position === 'start'
                         ? `left-[1px] pl-2.5 rounded-l-md ${startAdornmentClass}`
                         : `right-[1px] pr-2.5 rounded-r-md ${endAdornmentClass}`
                 } ${fontSize} ${className}`}
            {...rest}
        >
            {children}
        </div>
    );
});

export default Input;
