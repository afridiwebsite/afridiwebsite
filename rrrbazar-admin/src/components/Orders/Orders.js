import { getErrors, hasData, toastDefault } from "../../utils/handler.utils";
import { ordersTableColumns } from "../../utils/reactTableColumns";
import Table from "../react-table/Table";
import { Link } from 'react-router-dom'
import { toast } from "react-toastify";
import axiosInstance from "../../common/axios";
import { useRef, useState } from "react";
import Swal from "sweetalert2";
import SearchOrder from "./SearchOrder";

function Orders() {
    const [totalDataCount, setTotalDataCount] = useState(null)
    const reloadRefFunc = useRef(null)


    let actionMenu = {
        id: 'edit',
        Header: "Action",
        accessor: 'id',
        Cell: (e) => {
            const status = e.row.original.status
            if (status !== 'pending' && status !== 'In Progress') return '---'
            return <ul className="flex space-x-2">
                <li className="cstm_btn_small" onClick={() => openChangeStatusModal(e.value)}>
                    Edit
                </li>
            </ul>
        }
    };
    let withActionMenu = [...ordersTableColumns, actionMenu]


    const openChangeStatusModal = async (order_id) => {

        const { value: formValues } = await Swal.fire({
            title: 'Change order status',
            html:
                `<select id="order-status-value" class="form_input w-full mb-4">
                    <option value="completed" style="font-size: 2em;">Completed</option>
                    <option value="pending" selected style="font-size: 2em;">Pending</option>
                    <option value="In Progress" style="font-size: 2em;">In Progress</option>
                    <option value="cancel" style="font-size: 2em;">Cancel</option>
                </select>` +
                `
            <label class="block text-left">
                <span class="form_label">Brief Note</span>
                <input type="text" class="mt-1 block w-full form_input" id="order-note" placeholder="Enter some long form content." list="auto_comment" />
                <datalist id="auto_comment">
                    <option value="আইডি কোড ভুল"></option>
                    <option value="অন্য সার্ভার এর আইডি"></option>
                    <option value="আইডি/পাসওয়ার্ড ভুল"></option>
                    <option value="এই order টি নেই"></option>
                    <option value="আপনার আইডিতে এই order টি নেই"></option>
                </datalist>
            </label>`,
            focusConfirm: false,
            preConfirm: () => {
                let orderStatus = document.getElementById('order-status-value').value
                let orderNote = document.getElementById('order-note').value

                if (!orderStatus) {
                    toast.error('Select an order status', toastDefault)
                }
                // if (!orderNote) {
                //     toast.error('Order note is required', toastDefault)
                // }
                if (!orderStatus) {
                    return false
                }

                return { orderStatus, orderNote };
            }
        })


        if (formValues) {
            toast.promise(
                axiosInstance.post(`/admin/order/update-order-status/${order_id}`, {
                    status: formValues.orderStatus,
                    order_note: formValues.orderNote
                }),
                {
                    pending: 'Updating order...',
                    error: {
                        render(err) {
                            console.log(err);
                            return getErrors(err.data, false, true)
                        }
                    },
                    success: {
                        render() {
                            reloadRefFunc.current()
                            return 'Order updated successfully'
                        }
                    }
                },
                toastDefault
            )
        }
    }
    return (
        <div className="md:px-5" >
            <div className="bg-white py-5 mb-5 px-5">
                <Table
                    customGlobalSearch={({ addSearchParam, removeSearchParam }) => (
                        <SearchOrder addSearchParam={addSearchParam} removeSearchParam={removeSearchParam} />
                    )}
                    reloadRefFunc={reloadRefFunc}
                    tableTitle="Product Orders"
                    tableSubTitle={hasData(totalDataCount) && `Total result: ${totalDataCount}`}
                    globalSearchPlaceholder="Product id or user id"
                    tableId="order_table"
                    url="/admin/orders"
                    selectData={(res) => {
                        setTotalDataCount(res.data.data.order_count)

                        return {
                            data: res.data.data.orders,
                            total: res.data.data.order_count,
                        }
                    }}
                    queryString="order_id"
                    disableGlobalSearch
                    selectError={(err) => getErrors(err, true)[0]}
                    columns={withActionMenu}
                />
            </div>
        </div>
    )
}

export default Orders