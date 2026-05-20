import { toastDefault } from "../utils/handler.utils";
import parse from 'html-react-parser';
import moment from 'moment';
import Badge from '../components/Badge';
import { toast } from "react-toastify";
import { Link } from 'react-router-dom';
import PlayerKillEditForm from '../components/PlayerKillEditForm';
import PlayerRankingEditForm from '../components/PlayerRankingEditForm';
import ProductDescriptionSeeMore from '../components/ProductDescriptionSeeMore';
import { imgPath } from './handler.utils';
import Swal from 'sweetalert2';

// Shared helper: copies on click and toasts. Renders '---' if empty.
const copyableCell = (label, accessor) => (e) => {
    const value = e.row.original[accessor];
    if (value === null || value === undefined || value === '') return <span className="text-gray-400">---</span>;
    return (
        <span
            className="cursor-pointer hover:text-blue-600"
            title={`Click to copy ${label}`}
            onClick={() => {
                navigator.clipboard.writeText(String(value));
                toast.info(`Copied ${label}: ${value}`, toastDefault);
            }}
        >
            {value}
        </span>
    );
};

export const ordersTableColumns = [
    {
        Header: 'Order id',
        accessor: 'id',
        Cell: copyableCell('Order ID', 'id'),
    },
    {
        Header: 'Player id',
        accessor: 'playerid',
        className: 'text-center',
        // Only meaningful when the product has a Player ID dynamic input —
        // otherwise the field is empty (or "UNIPIN_VOUCHER" for the legacy
        // Unipin path). The helper renders '---' for falsy values.
        Cell: (e) => {
            const v = e.row.original['playerid'];
            if (!v || v === 'UNIPIN_VOUCHER') return <span className="text-gray-400 w-max">---</span>;
            return copyableCell('Player ID', 'playerid')(e);
        },
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
        // "UC" column. For voucher-pool orders the allocated voucher code
        // lives on the joined Voucher row, so render that first and fall
        // back to the legacy `uc` field (UniPin / bot path).
        Header: 'UC / Voucher',
        accessor: 'uc',
        // Wide column so multi-voucher orders (auto-delivery / bulk) can
        // show every code without truncation.
        className: 'w-[300px] min-w-[300px]',
        Cell: (e) => {
            const row = e.row.original;
            // hasMany on Order → Voucher returns `Vouchers: []`. Fall back to
            // the legacy hasOne shape (`Voucher: {…}`) so older payloads still
            // render correctly.
            const list = Array.isArray(row?.Vouchers)
                ? row.Vouchers
                : row?.Voucher
                  ? [row.Voucher]
                  : [];
            if (list.length > 0) {
                return (
                    <div className="flex flex-wrap gap-1 min-w-[300px]">
                        {list.map((v) => (
                            <span
                                key={v.id}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold text-xs font-mono cursor-pointer hover:bg-green-200 break-all whitespace-normal"
                                title="Click to copy voucher"
                                onClick={() => {
                                    navigator.clipboard.writeText(String(v.data));
                                    toast.info(`Copied voucher: ${v.data}`, toastDefault);
                                }}
                            >
                                {v.data}
                            </span>
                        ))}
                    </div>
                );
            }
            const uc = row?.uc;
            if (uc === null || uc === undefined || uc === '')
                return <span className="text-gray-400">---</span>;
            return uc;
        },
    },
    {
        Header: 'Created at',
        accessor: 'created_at',
    },
    {
        Header: 'Details',
        accessor: 'details',
        Cell: (e) => {
            const val = e.row.original['details'];
            if (!val) return <span className="text-gray-400">---</span>;
            return (
                <button
                    className="cstm_btn_small !bg-gray-600 hover:!bg-gray-700"
                    onClick={() => {
                        require('sweetalert2').default.fire({
                            title: 'Order Details (Internal)',
                            text: val,
                            icon: 'info',
                            confirmButtonText: 'Close',
                        });
                    }}
                >
                    Details
                </button>
            );
        },
    },
    {
        Header: 'Status',
        accessor: 'status',
        Cell: (e) => <Badge type={e.row.original['status']} />
    },
    {
        Header: 'User id',
        accessor: 'user_id',
        Cell: copyableCell('User ID', 'user_id'),
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
    {
        Header: 'Type',
        accessor: 'type',
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
        Header: 'Rules',
        accessor: 'rules',
        Cell: (e) => {
            return <ProductDescriptionSeeMore text={e.value} />
        }
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