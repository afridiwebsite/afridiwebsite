/*
 *
 * Title: Button
 * Description: --
 * Author: Saymon
 * Date: 25 November 2021 (Thursday)
 *
 */
import React from 'react';
import CircularProgress from './CircularProgress';

function Button({
  children,
  text,
  rounded,
  className,
  loading,
  disabled,
  StartIcon,
  EndIcon,
  onClick,
  ...props
}) {
  const Icon = StartIcon || EndIcon;
  const isRounded = rounded ?? ((StartIcon || EndIcon) && !children && !text);

  const btnSize =
    className?.split(' ')?.map((e) => {
      if (e === 'small') return '28px';
      if (e === 'large') return '42px';
      return '34px';
    }) || '34px';

  return (
    <>
      <button
        onClick={onClick && typeof onClick === 'function' && onClick}
        className={`_btn ${className || ''} ${
          isRounded ? 'rounded-full' : ''
        } ${loading ? '_btn_laoding' : ''}`}
        style={{
          ...(isRounded && {
            borderRadius: '100%',
            padding: 6,
            width: btnSize,
            height: btnSize,
          }),
        }}
        disabled={disabled || loading}
        {...props}
      >
        <span
          className={`_flex_center gap-1.5  ${
            StartIcon ? 'flex-row-reverse' : ''
          }`}
          style={{
            ...(loading && { opacity: 0 }),
          }}
        >
          {/* Btn Content ----Start---- */}
          {rounded ? children || text || Icon : children || text}
          {!rounded ? Icon : null}
          {!children && !text && !Icon && 'Button'} {/* Fallback Text */}
          {/* Btn Content ----End---- */}
        </span>

        {/* Loading Indicator Start */}
        {loading && (
          <div className="_absolute_full _flex_center p-1.5 overflow-hidden">
            {typeof loading === 'string' && !rounded ? (
              <span className="px-1 font-semibold" style={{ fontSize: '80%' }}>
                {loading}
              </span>
            ) : (
              <CircularProgress />
            )}
          </div>
        )}
        {/* Loading Indicator End */}
      </button>
    </>
  );
}

export default Button;
