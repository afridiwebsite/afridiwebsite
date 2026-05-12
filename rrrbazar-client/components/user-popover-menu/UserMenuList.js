/*
 *
 * Title: UserMenuList
 * Description: --
 * Author: Saymon
 * Date: 25 November 2021 (Thursday)
 *
 */
import { useRouter } from 'next/dist/client/router';
import Link from 'next/link';

function UserMenuList({
  icon,
  link = '#',
  text,
  onClick,
  className,
  iconClass,
}) {
  const RenderPart = () => (
    <div
      onClick={onClick && onClick}
      className={`flex items-center px-4 py-2.5 cursor-pointer select-none _subtitle2 text-gray-600 hover:bg-gray-50 duration-75 ${
        route === link ? 'bg-primary-100/40 text-primary-500' : ''
      } ${className || ''}`}
    >
      {icon && <div className={`mr-2.5 ${iconClass || ''}`}>{icon}</div>}
      <span>{text}</span>
    </div>
  );
  const { route } = useRouter();
  if (link && link !== '#')
    return (
      <Link href={link}>
        <a>
          <RenderPart />
        </a>
      </Link>
    );
  return <RenderPart />;
}

export default UserMenuList;
