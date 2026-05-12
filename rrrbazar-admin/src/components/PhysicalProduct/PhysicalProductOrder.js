import { getErrors, toastDefault } from "../../utils/handler.utils";
import { physicalProductOrderTableColumns } from "../../utils/reactTableColumns";
import Table from "../react-table/Table";
import { Link } from 'react-router-dom'
import { toast } from "react-toastify";
import axiosInstance from "../../common/axios";
import { useRef } from "react";
import Swal from "sweetalert2";

function PhysicalProductOrder() {

    const reloadRefFunc = useRef(null)


    let actionMenu = {
        id: 'edit',
        Header: "Action",
        accessor: 'id',
        Cell: (e) => {
            const status = e.row.original.status
            if (status !== 'pending' && status !== 'in_progress') return '---'
            return <ul className="flex space-x-2">
                <li className="cstm_btn_small" onClick={() => openChangeStatusModal(e.value)}>
                    Edit
                </li>
            </ul>
        }
    };
    let withActionMenu = [...physicalProductOrderTableColumns, actionMenu]


    const openChangeStatusModal = async (order_id) => {

        const { value: formValues } = await Swal.fire({
            title: 'Change order status',
            html:
                `<select id="order-status-value" class="form_input w-full mb-4">
                    <option value="">Select order status</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="pending" selected>Pending</option>
                    <option value="cancelled">Cancel</option>
                </select>` +
                `
            <label class="block text-left">
            <span class="form_label">Brief Note</span>
            <textarea
                class="mt-1 block w-full form_input"
                rows="3"
                id="order-note"
                placeholder="Enter some long form content."
            ></textarea>
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
                axiosInstance.post(`/admin/update-physical-order-status/${order_id}`, {
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
                    reloadRefFunc={reloadRefFunc}
                    tableTitle="Product Orders"
                    globalSearchPlaceholder="Product id or user id"
                    tableId="product_orders_table"
                    url="/admin/physical-products-order"
                    selectData={(res) => ({
                        data: res.data.data.orders,
                        total: res.data.data.order_count,
                    })}
                    // disableGlobalSearch
                    selectError={(err) => getErrors(err, true)[0]}
                    columns={withActionMenu}
                />
            </div>
        </div>
    )
}

export default PhysicalProductOrder