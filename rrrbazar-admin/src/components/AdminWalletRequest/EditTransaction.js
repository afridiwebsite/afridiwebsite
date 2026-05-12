import React, { useRef, useState } from 'react'
import { useHistory } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';
import useGet from '../../hooks/useGet';
import { getErrors, hasData, toastDefault } from '../../utils/handler.utils';
import Loader from '../Loader/Loader';
function EditTransaction({ transactionId, onComplete }) {
    const history = useHistory()

    const [loading, setLoading] = useState(null)
    const [data, loadingData] = useGet(`admin/transaction/${transactionId}`)
    console.log(data)
    const amount = useRef(null);
    const number = useRef(null);
    const status = useRef(null);


    const editTransactionHandler = (e) => {
        e.preventDefault()
        setLoading(true)
        axiosInstance.post(`/admin/transaction/update-full-row/${transactionId}`, {
            amount: amount.current.value,
            status: status?.current?.value || data.status,
            number: number.current.value
        }).then(res => {
            toast.success('Transaction updated successfully', toastDefault)

            setTimeout(() => {
                history.push('/add-wallet')
            }, 1500);
        }).catch(err => {
            toast.error(getErrors(err, false, true), toastDefault)
            setLoading(false)
        }).finally(() => (onComplete && typeof onComplete === 'function') && onComplete())
    }

    return (
        <section className="relative container_admin" >
            <div className="bg-white overflow-hidden rounded">
                <div className="px-6 py-3 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-black">
                        Edit transaction - <span>User id: {data?.id}</span>
                    </h3>
                </div>
                <div className="py-10 px-4" >
                    <div className="w-full md:w-[70%] min-h-[250px] mx-auto py-6 relative border border-gray-200 px-4">
                        {loadingData || loading ? <Loader absolute /> : ''}
                        {hasData(data) &&
                            <form onSubmit={editTransactionHandler} >
                                <div>
                                    <div className="form_grid">
                                        <div>
                                            <label htmlFor="amount">Amount</label>
                                            <input ref={amount} id="amount" defaultValue={data?.amount} className="form_input" type="text" placeholder="Amount" required />
                                        </div>
                                        <div>
                                            <label htmlFor="number">Phone</label>
                                            <input ref={number} id="number" defaultValue={data?.number} className="form_input" type="text" placeholder="Name" required />
                                        </div>
                                    </div>

                                    {
                                        data?.status === 'cancel' && (
                                            <div className="form_grid">
                                                <select ref={status} defaultValue={data?.status} required className="form_input">
                                                    <option value="">Select an option</option>
                                                    <option value="completed">Completed</option>
                                                    <option value="pending">Pending</option>
                                                    <option value="cancel">Cancel</option>
                                                </select>
                                            </div>
                                        )
                                    }
                                    <div>
                                        <button type="submit" className="cstm_btn w-full block">Edit transaction</button>
                                    </div>
                                </div>
                            </form>
                        }
                    </div>
                </div>
            </div>
        </section>
    )
}

export default EditTransaction
