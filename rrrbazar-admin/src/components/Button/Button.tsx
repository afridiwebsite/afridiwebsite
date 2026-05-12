import React from 'react';
import { ButtonProps } from './Button.types';
import CircularProgress from './CircularProgress';
import { useTwButton } from './useTwButton';

export const Button = (ownerState, ref) => {
    // Client props
    const {
        varient,
        color,
        size,
        className = '',
        rounded,
        startIcon,
        endIcon,
        loading,
        disabled,
        children,
        type = 'button',
        ...props
    } = ownerState;

    const buttonClasses = useTwButton({
        varient,
        color,
        size,
        rounded:
            rounded === true || rounded === false
                ? rounded
                : (startIcon || endIcon) && !children
                ? rounded || 'circle'
                : rounded,
    });

    return (
        <button
            ref={ref}
            disabled={loading || disabled ? true : false}
            className={`${buttonClasses} ${className} ${loading ? '!opacity-100' : ''} relative`}
            type={type}
            {...props}
        >
            <>
                {loading && (
                    <div
                        className={`absolute w-full h-full flex items-center justify-center aspect-square top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${
                            loading === true ? 'scale-[0.6]' : 'scale-[0.8]'
                        }`}
                    >
                        {loading === true ? <CircularProgress /> : loading}
                    </div>
                )}
                <span
                    className={`flex items-center h-full w-full justify-center gap-1.5 ${
                        loading ? 'opacity-0' : ''
                    }`}
                >
                    {startIcon}
                    {children}
                    {endIcon}
                </span>
            </>
        </button>
    );
};
export default React.forwardRef<HTMLButtonElement, ButtonProps>(Button);
