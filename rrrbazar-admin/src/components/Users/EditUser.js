import React, { useRef, useState } from 'react'
import { useHistory, withRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';
import useGet from '../../hooks/useGet';
import { getErrors, hasData, toastDefault } from '../../utils/handler.utils';
import Loader from '../Loader/Loader';
function EditUser(props) {
    const history = useHistory()
    const userId = props.match.params.id;

    const [loading, setLoading] = useState(null)
    const [data, loadingData, error] = useGet(`admin/user/${userId}`)

    console.log(data);

    const phone = useRef(null);
    const wallet = useRef(null);
    const address = useRef(null);
    const city = useRef(null);
    const zip_code = useRef(null);
    const password = useRef(null);

    const editPaymentMethodHandler = (e) => {
        e.preventDefault()
        setLoading(true)
        axiosInstance.post(`/admin/user/update/${userId}`, {
            phone: phone.current.value,
            wallet: wallet.current.value,
            address: address.current.value,
            city: city.current.value,
            zip_code: zip_code.current.value,
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
                    <div className="w-full md:w-[70%] min-h-[300px] mx-auto py-6 relative border border-gray-200 px-4">
                        {loadingData && <Loader absolute />}
                        {loading && <Loader absolute />}
                        {
                            hasData(data, loading, error) && (
                                <form onSubmit={editPaymentMethodHandler} >
                                    <div>

                                        <div className="form_grid">
                                            <div>
                                                <label>Phone</label>
                                                <input ref={phone} defaultValue={data?.phone} className="form_input" type="number" placeholder="Phone" />
                                            </div>
                                            <div>
                                                <label>Wallet</label>
                                                <input ref={wallet} defaultValue={data?.wallet} className="form_input" type="number" placeholder="Wallet" />
                                            </div>
                                        </div>
                                        <div className="form_grid">
                                            <div>
                                                <label>Set new password</label>
                                                <input ref={password} className="form_input" type="text" placeholder="Set new password" />
                                            </div>
                                            <div>
                                                <label>Address</label>
                                                <input ref={address} defaultValue={data?.address} className="form_input" type="text" placeholder="Address" />
                                            </div>

                                        </div>
                                        <div className="form_grid">
                                            <div>
                                                <label>City</label>
                                                <input ref={city} defaultValue={data?.city} className="form_input" type="text" placeholder="City" />
                                            </div>
                                            <div>
                                                <label>Zip code</label>
                                                <input ref={zip_code} defaultValue={data?.zip_code} className="form_input" type="text" placeholder="Zip code" />
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <button type="submit" className="cstm_btn w-full block">Updated user</button>
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
