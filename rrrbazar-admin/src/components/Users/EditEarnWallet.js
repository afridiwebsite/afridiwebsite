import React, { useRef, useState } from 'react'
import { useHistory, withRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';
import useGet from '../../hooks/useGet';
import { getErrors, hasData, toastDefault } from '../../utils/handler.utils';
import Loader from '../Loader/Loader';
function EditEarnWallet(props) {
    const history = useHistory()
    const userId = props.match.params.id;

    const [loading, setLoading] = useState(null)
    const [data, loadingData, error] = useGet(`/admin/users/earn-wallet/${userId}`)
    const [userData, loadingUserData, userError] = useGet(`admin/user/${userId}`)

    const amount = useRef(null);
    const type = useRef(null);

    const editPaymentMethodHandler = (e) => {
        e.preventDefault()
        setLoading(true)
        axiosInstance.post(`/admin/earn-wallet/update/${userId}`, {
            type: type.current.value,
            amount: amount.current.value,
        }).then(res => {
            toast.success('User updated successfully', toastDefault)

            setTimeout(() => {
                history.push('/user')
            }, 1500);
        }).catch(err => {
            toast.error(getErrors(err, false, true), toastDefault)
            setLoading(false)
        })
    }

    return (
        <section className="relative container_admin" >
            <div className="bg-white overflow-hidden rounded">
                <div className="px-6 py-3 border-b border-gray-200">
                    {
                        hasData(userData) && (
                            <h3 className="text-lg font-bold text-black">
                                Edit Earn Wallet - {userData?.username}
                            </h3>
                        )
                    }
                </div>
                <div className="py-10 px-4" >
                    <div className="w-full md:w-[70%] min-h-[300px] mx-auto py-6 relative border border-gray-200 px-4">
                        {loadingData && <Loader absolute />}
                        {loading && <Loader absolute />}
                        {
                            hasData(data, loading, error) && (
                                <form onSubmit={editPaymentMethodHandler} >
                                    <div>

                                        <h4 className="text-lg font-bold text-black">
                                            Total Earn: {data?.total_amount}
                                        </h4>

                                        <div className="form_grid">
                                            <div>
                                                <label>Amount</label>
                                                <input ref={amount} defaultValue="" className="form_input" type="number" placeholder="Amount" />
                                            </div>

                                            <div>
                                                <label htmlFor="name">Type</label>
                                                <select defaultValue="add" ref={type} className="form_input">
                                                    
                                                    <option value="add">Add</option>
                                                    <option value="deduct">Deduct</option>
                                                    
                                                </select>
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <button type="submit" className="cstm_btn w-full block">Updated Earn Wallet</button>
                                        </div>
                                    </div>
                                </form>
                            )
                        }
                    </div>
                </div>
            </div>
        </section>
    )
}

export default withRouter(EditEarnWallet)
