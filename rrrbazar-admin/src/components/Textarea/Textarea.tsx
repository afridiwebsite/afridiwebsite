import React, { useEffect, useRef, useState } from 'react';
import { useTwInput } from '../Input/useTwInput';
import { AdornmentProps, TextareaProps } from './Textarea.types';

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

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>((ownerState, ref) => {
    const {
        className,
        style,
        varient,
        size,
        rounded,
        startAdornment = '',
        startAdornmentClass = '',
        endAdornment,
        endAdornmentClass,
        label,
        labelClass = '',
        floatingLabel,
        floatingLabelClass = '',
        placeholder,
        ...props
    } = ownerState;

    const defaultRef = React.useRef();
    const resolvedRef = ref || defaultRef;

    const textAreaClasses = useTwInput({
        varient,
        size,
        rounded,
    });

    const input_font_size = fontSize(size);

    const [inputExtraStyle, setTextareaExtraStyle] = useState<React.CSSProperties>();
    const startAdornmentRef = useRef<HTMLDivElement>(null);
    const endAdornmentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setTextareaExtraStyle((prev) => ({
            ...prev,
            transition: '0s',
            paddingLeft: startAdornment ? startAdornmentRef.current.clientWidth + 10 : undefined,
            paddingRight: endAdornment ? endAdornmentRef.current.clientWidth + 10 : undefined,
        }));

        setTimeout(() => {
            setTextareaExtraStyle((prev) => ({
                ...prev,
                transition: undefined,
            }));
        }, 500);
    }, [startAdornment, endAdornment, size]);

    return (
        <div className='inline-block w-full'>
            <label className='relative block w-full'>
                {/* Textarea Label --Start-- */}
                {label && (
                    <span
                        className={`${input_font_size} ${labelClass} text-slate-500 dark:text-slate-200 font-semibold mb-1 inline-block select-none ${
                            props.disabled ? 'opacity-50 pointer-events-none' : ''
                        }`}
                    >
                        {label}
                    </span>
                )}
                {/* Textarea Label --End-- */}

                {/* Textarea Wrapper --Start-- */}
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

                    {/* Main Textarea --Start-- */}
                    <textarea
                        ref={resolvedRef}
                        style={{
                            ...style,
                            ...inputExtraStyle,
                        }}
                        {...props}
                        className={`${textAreaClasses} ${className} ${
                            floatingLabel ? 'placeholder:!text-transparent select-none' : ''
                        } peer align-bottom`}
                        placeholder={floatingLabel ? 'floatingLabel' : placeholder}
                    ></textarea>
                    {/* Main Textarea --End-- */}

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
                </div>
                {/* Textarea Wrapper --End-- */}
            </label>
        </div>
    );
});

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
            className={`absolute top-1/2 -translate-y-1/2 h-[calc(100%-3px)] flex justify-center text-slate-400 
                 font-medium dark:text-slate-500 py-2.5 ${
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

export default Textarea;
