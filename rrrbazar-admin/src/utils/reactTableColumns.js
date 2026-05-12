import { toastDefault } from "../utils/handler.utils";
import parse from 'html-react-parser';
import moment from 'moment';
import Badge from '../components/Badge';
import { toast } from "react-toastify";
import { Link } from 'react-router-dom';
import ViewCompletedOrderByAdmin from '../components/Orders/ViewCompletedOrderByAdmin';
import PlayerKillEditForm from '../components/PlayerKillEditForm';
import PlayerRankingEditForm from '../components/PlayerRankingEditForm';
import ProductDescriptionSeeMore from '../components/ProductDescriptionSeeMore';
import { imgPath } from './handler.utils';

export const ordersTableColumns = [
    {
        Header: 'Order id',
        accessor: 'id',
        Cell: (e) => <span className="capitalize" onClick={() => {navigator.clipboard.writeText(e.row.original['id']); toast.info('Copied Order ID:: ' + e.row.original['id'], toastDefault); return e.row.original['id'];} }>{e.row.original['id']}</span>
    },
    {
        Header: 'Player id',
        accessor: 'playerid',
        Cell: (e) => <span className="capitalize" onClick={() => {navigator.clipboard.writeText(e.row.original['playerid']); toast.info('Copied Player ID:: ' + e.row.original['playerid'], toastDefault); return e.row.original['playerid'];} }>{e.row.original['playerid']}</span>
    },
    {
        Header: 'Password',
        accessor: 'ingamepassword',
        Cell: (e) => <span className="capitalize" onClick={() => {navigator.clipboard.writeText(e.row.original['ingamepassword']); toast.info('Copied Password:: ' + e.row.original['ingamepassword'], toastDefault); return e.row.original['ingamepassword'];} }>{e.row.original['ingamepassword']}</span>
    },
    {
        Header: 'Package name',
        accessor: 'name',
    },
    {
        Header: 'Price',
        accessor: 'amount',
    },
    {
        Header: 'Account type',
        accessor: 'accounttype',
    },
    {
        Header: 'Security code',
        accessor: 'securitycode',
        Cell: (e) => <span className="capitalize" onClick={() => {navigator.clipboard.writeText(e.row.original['securitycode']); toast.info('Copied Security code:: ' + e.row.original['securitycode'], toastDefault); return e.row.original['securitycode'];} }>{e.row.original['securitycode']}</span>
    },
    {
        Header: 'uc',
        accessor: 'uc',
    },
    {
        Header: 'Completed by',
        accessor: 'completed_by',
        Cell: (e) => <span className="capitalize" >{e.row.original?.Admin?.first_name + ' ' + e.row.original?.Admin?.last_name}</span>
    },
    {
        Header: 'Created at',
        accessor: 'created_at',
    },
    {
        Header: 'Status',
        accessor: 'status',
        Cell: (e) => <Badge type={e.row.original['status']} />
    },
    {
        Header: 'User id',
        accessor: 'user_id',
        Cell: (e) => <span className="capitalize" onClick={() => {navigator.clipboard.writeText(e.row.original['user_id']); toast.info('Copied User ID:: ' + e.row.original['user_id'], toastDefault); return e.row.original['user_id'];} }>{e.row.original['user_id']}</span>
    },
];

export const tournametnsTableColumns = [
    {
        Header: 'Id',
        accessor: 'id',
    },
    {
        Header: 'Image',
        accessor: 'image',
        Cell: (e) => <img src={imgPath(e.value)} style={{ maxWidth: '100px' }} />
    },
    {
        Header: 'Title',
        accessor: 'title',
    },
    {
        Header: 'Start time',
        accessor: 'start_time',
        Cell: (e) => moment(e.value).format('DD/MM/Y [at] hh:mm A')

    },
    {
        Header: 'Per kill',
        accessor: 'per_kill',
    },
    {
        Header: 'Version',
        accessor: 'version',
    },
    {
        Header: 'Entry fee',
        accessor: 'entry_fee',
    },
    {
        Header: 'Map',
        accessor: 'map',
    },
    {
        Header: 'Live link',
        accessor: 'live_link',
        Cell: ({ value }) => <a href={value} target="_blank" className="!text-blue-500 hover:!text-blue-600 hover:underline" >{value}</a>
    },
    {
        Header: 'Type',
        accessor: 'type',
    },
    // {
    //     Header: 'Prize',
    //     accessor: 'prize',
    //     Cell: (e) => typeof e.value == 'string' ? parse(e.value) : '---'
    // },
    {
        Header: 'Rules',
        accessor: 'rules',
        Cell: (e) => typeof e.value == 'string' ? parse(e.value) : '---'
    },
    {
        Header: 'Room details',
        accessor: 'room_details',
    },
    {
        Header: 'Status',
        accessor: 'status',
        Cell: (e) => <Badge type={e.row.original['status']} />
    },
    {
        Header: 'User limit',
        accessor: 'user_limit',
    },
    {
        Header: 'Created at',
        accessor: 'created_at',
    },
    {
        Header: 'Updated at',
        accessor: 'updated_at',
    },
];

export const tournametnPlayersColumns = [
    {
        Header: 'Id',
        accessor: 'id',
    },
    {
        Header: 'Game name',
        accessor: 'game_name',
    },
    {
        Header: 'Title',
        accessor: 'title',
    },
    {
        Header: 'Kills',
        accessor: 'kills',
        Cell: (e) => <PlayerKillEditForm {...e} />
    },
    {
        Header: 'Ranking',
        accessor: 'ranking',
        Cell: (e) => <PlayerRankingEditForm {...e} />
    },
    {
        Header: 'User Id',
        accessor: 'user_id',
    },
];

export const authsTableColumns = [
    {
        Header: 'Id',
        accessor: 'id',
    },
    {
        Header: 'Name',
        accessor: 'name',
    },
    {
        Header: 'Slug',
        accessor: 'slug',
    },
    {
        Header: 'Description',
        accessor: 'description',
    },
    {
        Header: 'Status',
        accessor: 'status',
    },
    {
        Header: 'Auth URL',
        accessor: 'auth_url',
    },
];

export const adminsTableColumns = [
    {
        Header: 'Id',
        accessor: 'id',
    },
    {
        Header: 'First Name',
        accessor: 'first_name',
    },
    {
        Header: 'Last Name',
        accessor: 'last_name',
    },
    {
        Header: 'Username',
        accessor: 'username',
    },
    {
        Header: 'Gender',
        accessor: 'gender',
    },
    {
        Header: 'Date of birth',
        accessor: 'date_of_birth',
    },
    {
        Header: 'Image',
        accessor: 'image',
    },
    {
        Header: 'Email',
        accessor: 'email',
    },
    {
        Header: 'Phone',
        accessor: 'phone',
    },
];

export const uPinsTableColumns = [
    {
        Header: 'Id',
        accessor: 'id',
    },
    {
        Header: 'Voucher',
        accessor: 'code',
    },
    {
        Header: 'Status',
        accessor: 'status',
    },
    {
        Header: 'Package Id',
        accessor: 'package_id',
    },
    {
        Header: 'User Id',
        accessor: 'user_id',
    }
];

export const botTableColumns = [
    {
        Header: 'Id',
        accessor: 'id',
    },
    {
        Header: 'Name',
        accessor: 'name',
    },
    {
        Header: 'Status',
        accessor: 'status',
    },
    {
        Header: 'Bot Server',
        accessor: 'ip_url',
    },
    {
        Header: 'Total Order',
        accessor: 'total_order',
    }
];


export const withdrawEarnWalletTableColumns = [
    {
        Header: 'Id',
        accessor: 'id',
    },
    {
        Header: 'User Id',
        accessor: 'user_id',
    },
    {
        Header: 'Payment',
        accessor: 'payment_method',
    },
    {
        Header: 'Amount',
        accessor: 'amount',
    },
    {
        Header: 'Number',
        accessor: 'number',
    },
    {
        Header: 'Status',
        accessor: 'status',
    },
    // {
    //     Header: 'Transaction id',
    //     accessor: 'transaction_id',
    // },
    {
        Header: 'Created at',
        accessor: 'created_at',
    },
    {
        Header: 'Updated at',
        accessor: 'updated_at',
    },

    // {
    //     Header: 'Purpose',
    //     accessor: 'purpose',
    // },

];

export const adminTransactionsTableColumns = [
    {
        Header: 'Id',
        accessor: 'id',
    },
    {
        Header: 'Admin Id',
        accessor: 'Admin.first_name',
    },
    {
        Header: 'Amount',
        accessor: 'amount',
    },
    {
        Header: 'Number',
        accessor: 'number',
    },
    {
        Header: 'Status',
        accessor: 'status',
    },
    {
        Header: 'Created at',
        accessor: 'created_at',
    },
    {
        Header: 'Updated at',
        accessor: 'updated_at',
    },

];

export const transactionsTableColumns = [
    {
        Header: 'Id',
        accessor: 'id',
    },
    {
        Header: 'User Id',
        accessor: 'user_id',
    },
    {
        Header: 'Payment',
        accessor: 'payment_method_name',
    },
    {
        Header: 'Amount',
        accessor: 'amount',
    },
    {
        Header: 'Number',
        accessor: 'number',
    },
    {
        Header: 'Status',
        accessor: 'status',
    },
    {
        Header: 'Action By',
        accessor: (originalRow, index) => {
            if(!originalRow.Admin) {
                return '---'
            }
            return originalRow.Admin?.first_name + " " + originalRow.Admin?.last_name;
        } ,
    },
    {
        Header: 'Created at',
        accessor: 'created_at',
    },
    {
        Header: 'Updated at',
        accessor: 'updated_at',
    },

    // {
    //     Header: 'Purpose',
    //     accessor: 'purpose',
    // },

];

export const paymentMethodTableColumns = [
    {
        Header: 'Id',
        accessor: 'id',
    },
    {
        Header: 'Name',
        accessor: 'name',
    },
    {
        Header: 'Logo',
        accessor: 'logo_full_url',
        Cell: (e) => {
            return <img src={e.value} alt="" width={50} />
        }
    },
    {
        Header: 'Information',
        accessor: 'info',
    },
    {
        Header: 'Status',
        accessor: 'status',
    },
];

export const noticeTableColumns = [
    {
        Header: 'Id',
        accessor: 'id',
    },
    // {
    //     Header: 'Title',
    //     accessor: 'title',
    // },
    {
        Header: 'Image',
        accessor: 'image_full_url',
        Cell: (e) => {
            return <img src={e.value} alt="" width={50} />
        }
    },
    {
        Header: 'Link',
        accessor: 'link',
    },
    {
        Header: 'Notice',
        accessor: 'notice',
    },
    // {
    //     Header: 'Home modal',
    //     accessor: 'for_home_modal',
    // },
    // {
    //     Header: 'Template',
    //     accessor: 'template',
    // },
    {
        Header: 'Is Active',
        accessor: 'is_active',
    },
];

export const bannerTableColumns = [
    {
        Header: 'Id',
        accessor: 'id',
    },
    {
        Header: 'Note',
        accessor: 'note',
    },
    {
        Header: 'Link',
        accessor: 'link',
    },
    {
        Header: 'Image',
        accessor: 'banner_full_url',
        Cell: (e) => {
            return <img src={e.value} alt="" width={50} />
        }
    },

    {
        Header: 'Is Active',
        accessor: 'isactive',
    },
];

export const userTableColumns = [
    {
        Header: 'Id',
        accessor: 'id',
    },
    {
        Header: 'Username',
        accessor: 'username',
    },
    {
        Header: 'Account status',
        accessor: 'account_status',
    },
    {
        Header: 'Is banned',
        accessor: 'is_banned',
    },
    {
        Header: 'Avatar',
        accessor: 'avatar',
        Cell: (e) => {
            return <img src={e.value} alt="" width={50} />
        }
    },
    {
        Header: 'Phone',
        accessor: 'phone',
    },
    {
        Header: 'Email',
        accessor: 'email',
    },
    {
        Header: 'Wallet',
        accessor: 'wallet',
    },
    {
        Header: 'Earn wallet',
        accessor: 'earn_wallet',
    },
    {
        Header: 'Scores',
        accessor: 'scores',
    },
    {
        Header: 'Provider',
        accessor: 'provider',
    },
    {
        Header: 'Is phone verify',
        accessor: 'is_phone_verify',
    },
    {
        Header: 'Created at',
        accessor: 'created_at',
    },
];

export const productTableColumns = [
    {
        Header: 'Id',
        accessor: 'id',
    },
    {
        Header: 'Name',
        accessor: 'name',
    },
    {
        Header: 'Logo',
        accessor: 'logo_full_url',
        Cell: (e) => {
            return <img src={e.value} alt="" width={50} className="bg-gray-300 min-h-[60px]" />
        }
    },
    {
        Header: 'Price/Stock',
        accessor: 'price',
    },
    {
        Header: 'Rules',
        accessor: 'rules',
        Cell: (e) => {
            return <ProductDescriptionSeeMore text={e.value} />
        }
    },
    {
        Header: 'Active for topup',
        accessor: 'isactivefortopup',
    },
    {
        Header: 'IS OFFER PRODUC',
        accessor: 'is_offer'
    },
    {
        Header: 'Offer Items',
        accessor: 'offer_items',
    },
    {
        Header: 'Created at',
        accessor: 'created_at',
    },
];

export const physicalProductTableColumns = [
    {
        Header: 'Id',
        accessor: 'id',
    },
    {
        Header: 'Name',
        accessor: 'name',
    },
    {
        Header: 'Image',
        accessor: 'image_full_url',
        Cell: (e) => {
            return <img src={e.value} alt="Img" style={{ minWidth: '60px', maxWidth: '60px', objectFit: 'cover' }} className="bg-gray-300 min-h-[60px]" />
        }
    },
    {
        Header: 'Sale Price',
        accessor: 'sale_price',
    },
    {
        Header: 'Regular Price',
        accessor: 'regular_price',
    },
    {
        Header: 'Description',
        accessor: 'description',
        Cell: (e) => {
            return <ProductDescriptionSeeMore text={e.value} />
        }
    },
    {
        Header: 'Is Active',
        accessor: 'is_active',
    },
    {
        Header: 'Created at',
        accessor: 'created_at',
    },
];

export const packageTableColumns = [
    {
        Header: 'Id',
        accessor: 'id',
    },
    {
        Header: 'Product',
        accessor: 'product_id',
    },
    {
        Header: 'Name',
        accessor: 'name',
    },
    {
        Header: 'Sale price',
        accessor: 'price',
    },
    {
        Header: 'Buy price',
        accessor: 'bprice',
    },
    {
        Header: 'Serial',
        accessor: 'serial',
    },
    {
        Header: 'In-Stock Voucher',
        accessor: 'voucher',
        Cell: (e) => {
            console.log(e)
            return <Link to={`/upins?package_id=${e.value}`}>{e.value}</Link>
        }
    },
    {
        Header: 'Logo',
        accessor: 'logo',
        Cell: (e) => {
            return <img src={imgPath(e.value)} alt="" width={50} />
        }
    },
];

export const completedOrderByAdminsTableColumns = [

    {
        Header: 'Name',
        accessor: 'username',
        Cell: (e) => {
            let data = e.row.original
            return <span style={{ textTransform: 'capitalize' }}>{data.first_name + ' ' + data.last_name}</span>
        }
    },
    {
        Header: "Today",
        accessor: 'id',
        Cell: (e) => {
            return e.row.original?.today_order || '---'
        }
    },
    {
        Header: "Total",
        accessor: 'first_name',
        Cell: (e) => {
            return e.row.original?.total_order || '---'
        }
    },
    {
        Header: "Wallet",
        Cell: (e) => {
            return e.row.original?.wallet || '---'
        }
    }

];

export const physicalProductOrderTableColumns = [
    {
        Header: 'Id',
        accessor: 'id',
    },
    {
        Header: 'Product id',
        Cell: (e) => e.row.original['product_id']
    },
    {
        Header: 'Product name',
        Cell: (e) => e.row.original['Product.name']
    },
    {
        Header: 'Image',
        Cell: (e) => <img style={{ width: '60px' }} src={imgPath(e.row.original['Product.image'])} alt="Img" />
    },
    {
        Header: 'Sale price',
        Cell: (e) => e.row.original['Product.sale_price']
    },
    {
        Header: 'Order Status',
        Cell: (e) => <Badge type={e.row.original['status']} />
    },
    {
        Header: 'User id',
        Cell: (e) => e.row.original['user_id']
    },
    {
        Header: 'Username',
        Cell: (e) => e.row.original['User.username']
    },
    {
        Header: 'Phone',
        Cell: (e) => e.row.original['User.phone']
    },
    {
        Header: 'Email',
        Cell: (e) => e.row.original['User.email']
    },
];