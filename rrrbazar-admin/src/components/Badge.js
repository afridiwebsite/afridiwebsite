/*
 *
 * Title: Badge
 * Description: --
 * Author: Saymon
 * Date: 25 November 2021 (Thursday)
 *
 */
function Badge({ type }) {
  const badgeType =
    (type === 'completed' || type === 'open')
      ? 'bg-green-100 text-green-600'
      : (type === 'cancel' || type === 'cancelled' || type === 'ended')
        ? 'bg-red-100 text-red-600'
        : (type === 'in_progress' || type === 'running')
          ? 'bg-yellow-100 text-yellow-600'
          : 'bg-gray-200 text-gray-600';

  return (
    <div
      className={`_subtitle2 inline-block text-[13px] font-normal py-1 px-3 rounded-full capitalize ${badgeType}`}
    >
      {type?.split('_')?.join(' ')}
    </div>
  );
}

export default Badge;
