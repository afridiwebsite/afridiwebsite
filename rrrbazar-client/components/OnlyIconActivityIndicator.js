/*
 *
 * Title: OnlyIconActivityIndicator
 * Description: --
 * Author: Saymon
 * Date: 25 November 2021 (Thursday)
 *
 */

import { BiError, BiSearchAlt } from 'react-icons/bi';
import CircularProgress from './CircularProgress';

function OnlyIconActivityIndicator({ data, error, loading, size = 25 }) {
  if (!loading && (data === 0 || data === '0' ? true : false) && !error)
    return null;
  return (
    <span className="_flex_center">
      {loading && <CircularProgress size={size} />}
      {!data && !loading && !error && <BiSearchAlt size={size} />}
      {error && !loading && <BiError color="red" size={size} />}
    </span>
  );
}

export default OnlyIconActivityIndicator;
