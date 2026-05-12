/*
 *
 * Title: CircularProgress
 * Description: --
 * Author: Saymon
 * Date: 25 November 2021 (Thursday)
 *
 */
function CircularProgress({ color, className, size }) {
  return (
    <svg
      style={{
        ...(size && {
          width: size,
          height: size,
        }),
      }}
      className={`_svg_spinner inline-block ${className || ''}`}
      viewBox="0 0 50 50"
    >
      <circle
        className={`path`}
        cx="25"
        cy="25"
        r="20"
        fill="none"
        strokeWidth="5"
        style={{ stroke: color || 'currentcolor' }}
      ></circle>
    </svg>
  );
}

export default CircularProgress;
