import React, { useRef, useState } from 'react'
import { useHistory, withRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';
import useGet from '../../hooks/useGet';
import { getErrors, hasData, imgPath, toastDefault } from '../../utils/handler.utils';
import Loader from '../Loader/Loader';
function EditUser(props) {
    const history = useHistory()
    const userId = props.match.params.id;

    const [loading, setLoading] = useState(null)
    const [data, loadingData, error] = useGet(`admin/user/${userId}`)

    const wallet = useRef(null);
    const coins = useRef(null);
    const password = useRef(null);

    const editPaymentMethodHandler = (e) => {
        e.preventDefault()
        setLoading(true)
        axiosInstance.post(`/admin/user/update/${userId}`, {
            wallet: wallet.current.value,
            coins: coins.current.value,
            password: password.current.value,
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
                    <h3 className="text-lg font-bold text-black">
                        Edit user - {data?.username}
                    </h3>
                </div>
                <div className="py-10 px-4" >
                    <div className="w-full md:w-[70%] min-h-[300px] mx-auto py-6 relative border border-gray-200 px-4 rounded">
                        {loadingData && <Loader absolute />}
                        {loading && <Loader absolute />}
                        {
                            hasData(data, loading, error) && (
                                <form onSubmit={editPaymentMethodHandler} >
                                    <div className="flex flex-col items-center mb-8">
                                        <img
                                            alt="Avatar"
                                            src={data?.avatar ? (data.avatar.startsWith('http') ? data.avatar : imgPath(data.avatar)) : require("../../assets/img/team-2-800x800.jpg").default}
                                            className="shadow-xl rounded-full h-24 w-24 object-cover border-none"
                                        />
                                        <h4 className="text-xl font-bold mt-4">{data?.username}</h4>
                                        <p className="text-gray-500 text-sm">{data?.email}</p>
                                    </div>
                                    <div>

                                        <div className="form_grid">
                                            <div>
                                                <label className="block text-sm font-bold mb-1">Wallet (BDT)</label>
                                                <input ref={wallet} defaultValue={data?.wallet} className="form_input" type="number" step="0.01" placeholder="Wallet balance" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold mb-1">Coins</label>
                                                <input ref={coins} defaultValue={data?.coins} className="form_input" type="number" placeholder="Coin balance" />
                                            </div>
                                        </div>
                                        {/* <div className="form_grid">
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-bold mb-1">Set new password (leave blank to keep current)</label>
                                                <input ref={password} className="form_input" type="text" placeholder="New password" />
                                            </div>
                                        </div> */}

                                        <div className="mt-8">
                                            <button type="submit" className="cstm_btn w-full block">Update User Balance</button>
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

export default withRouter(EditUser)
