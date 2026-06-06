import React, { useRef, useState } from 'react'
import { useHistory } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';
import useGet from '../../hooks/useGet';
import { getErrors, toastDefault } from '../../utils/handler.utils';
function AdminWalletRequest({ transactionId, onComplete }) {
    const history = useHistory()

    const [, setLoading] = useState(null)
    const [data, loadingData] = useGet(`admin/profile`)
    
    const amount = useRef(null);
    const number = useRef(null);


    const editTransactionHandler = (e) => {
        e.preventDefault()
        setLoading(true)
        axiosInstance.post(`/admin/admin-transaction/request/transaction`, {
            amount: amount.current.value,
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
                        Admin Wallet Request
                    </h3>
                    {!loadingData &&  <p>Your wallet: {data?.wallet}</p>}
                </div>
                <div className="py-10 px-4" >
                    <div className="w-full md:w-[70%] min-h-[250px] mx-auto py-6 relative border border-gray-200 px-4">
                        
                        <form onSubmit={editTransactionHandler} >
                            <div>
                                <div className="form_grid">
                                    <div>
                                        <label htmlFor="amount">Amount</label>
                                        <input ref={amount} id="amount" className="form_input" type="text" placeholder="Amount" required />
                                    </div>
                                    <div>
                                        <label htmlFor="number">Phone (optional)</label>
                                        <input ref={number} id="number"  className="form_input" type="text" placeholder="Name" required />
                                    </div>
                                </div>

                                
                                <div>
                                    <button type="submit" className="cstm_btn w-full block">Edit transaction</button>
                                </div>
                            </div>
                        </form>
                    
                    </div>
                </div>
            </div>
        </section>
    )
}

export default AdminWalletRequest
