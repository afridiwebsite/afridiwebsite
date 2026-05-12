import { useContext } from 'react';
import { BiChevronDown } from 'react-icons/bi';
import { globalContext } from '../../pages/_app';
import Avatar from '../Avatar';

function UserPopoverHead({ onClick, isOpen }) {
  const {
    authUser: { avatar, username },
  } = useContext(globalContext);

  return (
    <div
      className="_flex_center gap-1.5 cursor-pointer"
      onClick={onClick && onClick}
    >
      <div className="hidden xs:block">
        <Avatar
          src={avatar || undefined}
          text={username[0]}
          className="bg-gray-100 cursor-pointer"
          size={35}
        />
      </div>
      <p className="_body2 font-semibold text-gray-500 capitalize select-none">
        {username}
      </p>
      <BiChevronDown
        className={`text-gray-500 duration-150 ${isOpen ? 'rotate-180' : ''}`}
      />
    </div>
  );
}

export default UserPopoverHead;
