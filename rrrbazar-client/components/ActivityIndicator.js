/*
 *
 * Title: ActivityIndicator
 * Description: --
 * Author: Saymon
 * Date: 25 November 2021 (Thursday)
 *
 */
import { BiError, BiSearchAlt } from 'react-icons/bi';
import { getErrors } from '../helpers/helpers';
import CircularProgress from './CircularProgress';
import { hasData } from '/helpers/helpers';

function ActivityIndicator({ data, error, loading, className, errorMsg }) {
  const hastData = hasData(data);

  const finalLoading = loading || (!loading && !error & !data) || false;

  if (finalLoading)
    return (
      <div className={`_flex_center py-6 ${className || ''}`}>
        <div className="w-[30px] h-[30px]">
          <CircularProgress className="text-primary-500" />
        </div>
      </div>
    );
  if (!hastData && !finalLoading && !error)
    return (
      <div className={`_flex_center py-7 flex-col gap-3 ${className || ''}`}>
        <BiSearchAlt size={55} />
        <div className="text-center">
          <h3 className="_h3 font-extrabold mb-1.5">Sorry</h3>
          <p className="_body2">We found nothing for you.</p>
        </div>
      </div>
    );
  if (error && !finalLoading)
    return (
      <div className={`_flex_center py-7 flex-col gap-3 ${className || ''}`}>
        <BiError size={55} />
        <div className="text-center">
          <h3 className="_h3 font-extrabold mb-1.5">Opps</h3>
          <p className="_body2">{errorMsg || getErrors(error)}</p>
        </div>
      </div>
    );

  return null;
}

export default ActivityIndicator;
