import Link from 'next/link';
import {
  AiOutlineDollarCircle,
  AiOutlinePhone,
  AiOutlineShopping,
  AiOutlineTransaction,
  AiOutlineUser,
} from 'react-icons/ai';
import { BsTrophy } from 'react-icons/bs';
import { GiShoppingCart } from 'react-icons/gi';
import { IoGameControllerOutline } from 'react-icons/io5';
import { MdBorderAll } from 'react-icons/md';
import { VscAccount } from 'react-icons/vsc';
import Button from '../components/Button';
import Devider from '../components/Devider';
import RenderGuard from '../components/RenderGuard';
import UserPopoverMenu from '../components/user-popover-menu/UserPopoverMenu';
import routes from './routes';
import { FaDiceSix } from 'react-icons/fa';

export default [
  {
    icon: <AiOutlineUser size={20} />,
    link: routes.profile.name,
    disabled_for_desktop: true,
    text: 'My Profile',
    auth: true,
  },
  {
    icon: <AiOutlineDollarCircle size={20} />,
    text: 'Add Money',
    link: routes.addMoney.name,
    disabled_for_desktop: true,
    auth: true,
  },
  {
    icon: <MdBorderAll size={20} />,
    text: 'My Order',
    link: routes.myOrder.name,
    disabled_for_desktop: true,
    auth: true,
  },
  {
    icon: <AiOutlineTransaction size={20} />,
    text: 'My Transaction',
    link: routes.myTransaction.name,
    disabled_for_desktop: true,
    auth: true,
  },
  {
    icon: <FaDiceSix size={20} />,
    text: 'Spin',
    link: routes.spin.name,
    disabled_for_desktop: true,
    auth: true,
  },
  {
    component: <Devider />,
    auth: true,
    disabled_for_desktop: true,
  },
];
