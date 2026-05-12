import React, { useRef, useState } from 'react'
import { useHistory } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';
import useUpload from '../../hooks/useUpload';
import { getErrors, toastDefault } from '../../utils/handler.utils';
import Loader from '../Loader/Loader';

function AddPaymentMethod() {
    const name = useRef(null);
    const logo = useRef(null);
    const information = useRef(null);

    const [paymentLogo, setPaymentLogo] = useState(null)
    const { path, uploading } = useUpload(paymentLogo)

    const [loading, setLoading] = useState(null)
    const history = useHistory()

    const createPaymentMethodHandler = (e) => {
        e.preventDefault()

        if (!uploading) {
            setLoading(true)
            axiosInstance.post('/admin/payment-method/create', {
                name: name.current.value,
                logo: path,
                info: information.current.value,
                status: '1',
            }).then(res => {
                toast.success('Payment method created successfully', toastDefault)

                setTimeout(() => {
                    history.push('/payment-method')
                }, 1500);
            }).catch(err => {
                toast.error(getErrors(err, false, true), toastDefault)
                setLoading(false)
            })
        }
    }

    return (
        <section className="relative container_admin" >
            <div className="bg-white overflow-hidden rounded">
                <div className="px-6 py-3 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-black">
                        Create new payment method
                    </h3>
                </div>
                <div className="py-10 px-4" >
                    <div className="w-full md:w-[70%] mx-auto py-6 relative border border-gray-200 px-4">
                        {loading && <Loader absolute />}
                        <form onSubmit={createPaymentMethodHandler} >
                            <div>
                                <div className="form_grid">
                                    <div>
                                        <label htmlFor="name">Name</label>
                                        <input ref={name} id="name" className="form_input" type="text" placeholder="Name" required />
                                    </div>
                                    <div>
                                        <label htmlFor="logo">Logo</label>
                                        <input ref={logo} id="logo" className="form_input" type="file" required onChange={e => setPaymentLogo(e.target.files[0])} />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="information">Information</label>
                                    <input ref={information} id="information" className="form_input" type="number" placeholder="Information" required />
                                </div>

                                <div>
                                    <button type="submit" disabled={uploading} className="cstm_btn w-full block">Create Payment Method</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default AddPaymentMethod
