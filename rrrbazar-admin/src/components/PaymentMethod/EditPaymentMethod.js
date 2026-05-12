import React, { useRef, useState } from 'react'
import { useHistory, withRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';
import useGet from '../../hooks/useGet';
import useUpload from '../../hooks/useUpload';
import { getErrors, toastDefault } from '../../utils/handler.utils';
import Loader from '../Loader/Loader';
function EditPaymentMethod(props) {
    const history = useHistory()
    const paymentMethodId = props.match.params.id;

    const [loading, setLoading] = useState(null)
    const [data, loadingData] = useGet(`admin/payment-method/${paymentMethodId}`)
    const [paymentLogo, setPaymentLogo] = useState(data?.logo)
    const { path, uploading } = useUpload(paymentLogo)

    const name = useRef(null);
    const logo = useRef(null);
    const information = useRef(null);
    const status = useRef(null);

    const editPaymentMethodHandler = (e) => {
        e.preventDefault()
        setLoading(true)
        axiosInstance.post(`/admin/payment-method/update/${paymentMethodId}`, {
            name: name.current.value,
            logo: path || data?.logo,
            info: information.current.value,
            status: status.current.value,
        }).then(res => {
            toast.success('Payment method updated successfully', toastDefault)

            setTimeout(() => {
                history.push('/payment-method')
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
                        Edit payment method {`{ ${data?.name} }`}
                    </h3>
                </div>
                <div className="py-10 px-4" >
                    <div className="w-full md:w-[70%] mx-auto py-6 relative border border-gray-200 px-4">
                        {loadingData && <Loader absolute />}
                        {loading && <Loader absolute />}
                        <form onSubmit={editPaymentMethodHandler} >
                            <div>
                                <div className="form_grid">
                                    <div>
                                        <label htmlFor="name">Name</label>
                                        <input ref={name} id="name" defaultValue={data?.name} className="form_input" type="text" placeholder="Name" required />
                                    </div>
                                    <div>
                                        <label htmlFor="logo">Logo</label>
                                        <input ref={logo} id="logo" className="form_input" type="file" onChange={e => setPaymentLogo(e.target.files[0])} />
                                    </div>
                                </div>
                                <div className="form_grid">
                                    <div>
                                        <label htmlFor="information">Information</label>
                                        <input ref={information} id="information" defaultValue={data?.info} className="form_input" type="number" placeholder="Information" required />
                                    </div>
                                    <div>
                                        <label htmlFor="status">Status</label>
                                        <input ref={status} id="status" defaultValue={data?.status} className="form_input" type="text" placeholder="Status" required />
                                    </div>
                                </div>

                                <div>
                                    <button disabled={uploading} type="submit" className="cstm_btn w-full block">Edit Payment Method</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default withRouter(EditPaymentMethod)
