/*
 *
 * Title: Badge
 * Description: --
 * Author: Saymon
 * Date: 25 November 2021 (Thursday)
 *
 */

// Normalize a status string so server-side values like "In Progress",
// "in_progress", and "in progress" all collapse to a single slug. Without
// this the in-progress branch below misses on the mixed-case server output
// and the badge falls back to gray.
function slugifyStatus(t) {
  return String(t || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function Badge({ type, text, className = '' }) {
  const slug = slugifyStatus(type);
  const badgeType =
    slug === 'completed' || slug === 'open' || slug === 'success' || slug === 'delivered'
      ? 'bg-green-100 text-green-600'
      : slug === 'cancel' || slug === 'cancelled' || slug === 'ended' ||
        slug === 'failed' || slug === 'rejected'
      ? 'bg-red-100 text-red-600'
      : slug === 'in_progress' || slug === 'running' ||
      slug === 'processing'
      ? 'bg-yellow-100 text-yellow-600'
      : 'bg-gray-200 text-gray-600';

  return (
    <div
      className={`_subtitle2 inline-block text-[13px] font-normal py-1 px-3 rounded-full capitalize ${badgeType} ${className}`}
    >
      {text || (type ? String(type).replace(/_/g, ' ') : '')}
    </div>
  );
}

export default Badge;
