import React, { useState } from 'react'
import ReactTable from '../ReactTables/ReactTable';
import { paymentMethodTableColumns } from '../../utils/reactTableColumns';
import { getErrors, hasData, toastDefault } from '../../utils/handler.utils';
import { Link } from 'react-router-dom';
import useGet from '../../hooks/useGet';
import UiHandler from '../UiHandler';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';

function PaymentMethod() {
    const [uniqueState, setUniqueState] = useState(false)

    const [paymentMethodData, loading, error] = useGet(`admin/payment-methods`, '', uniqueState)

    const deletePaymentHangdler = (id) => {
        if (window.confirm('Are you sure')) {
            toast.promise(
                axiosInstance.post(`admin/payment-method/delete/${id}`),
                {
                    pending: 'Deleting payment method...',
                    error: {
                        render(err) {
                            console.log(err);
                            return getErrors(err.data, false, true)
                        }
                    },
                    success: {
                        render() {
                            setUniqueState(prev => !prev);
                            return 'Payment method deleted successfully'
                        }
                    }
                },
                toastDefault
            )
        }
    }

    let editButton = {
        id: 'action',
        Header: "Action",
        accessor: 'id',
        Cell: (e) => {
            return <ul className="flex space-x-2">
                <Link to={`/payment-method/edit/${e.value}`} className="cstm_btn_small">
                    Edit
                </Link>
                <button className="cstm_btn_small !bg-red-600 hover:!bg-red-700" type="button" onClick={() => deletePaymentHangdler(e.value)}>
                    Delete
                </button>

            </ul>
        }
    };

    let withEditButton = [...paymentMethodTableColumns, editButton]


    return (
        <section className="relative container_admin" >
            <div className="bg-white overflow-hidden rounded">
                <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between flex-wrap">
                    <h3 className="text-lg font-bold text-black">
                        Payment Method
                    </h3>
                    <Link className="cstm_btn" to="/payment-method/add">
                        Add new
                    </Link>
                </div>
                <div>
                    <div className="relative min-h-[100px]">
                        <UiHandler data={paymentMethodData} loading={loading} error={error} />
                        {hasData(paymentMethodData, error) && (
                            <ReactTable tableId="payment_methods_table" columns={withEditButton} data={paymentMethodData} />
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}

export default PaymentMethod
