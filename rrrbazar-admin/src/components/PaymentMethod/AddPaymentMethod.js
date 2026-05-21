import React, { useRef, useState } from 'react'
import { useHistory } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';
import useUpload from '../../hooks/useUpload';
import { getErrors, toastDefault } from '../../utils/handler.utils';
import TextEditor from '../TextEditor/TextEditor';
import Loader from '../Loader/Loader';

function AddPaymentMethod() {
    const name = useRef(null);
    const logo = useRef(null);
    const seller_id = useRef(null);

    const [paymentLogo, setPaymentLogo] = useState(null)
    const { path, uploading } = useUpload(paymentLogo)

    const [loading, setLoading] = useState(null)
    const [type, setType] = useState('normal')
    const [infoHtml, setInfoHtml] = useState('')
    const history = useHistory()

    const createPaymentMethodHandler = (e) => {
        e.preventDefault()

        if (uploading) return

        setLoading(true)
        axiosInstance.post('/admin/payment-method/create', {
            name: name.current.value,
            logo: path,
            info: infoHtml,
            status: '1',
            type,
            seller_id: type === 'direct' ? (seller_id.current?.value || null) : null,
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
                                <div className="form_grid">
                                    <div>
                                        <label htmlFor="type">Type</label>
                                        <select
                                            id="type"
                                            className="form_input"
                                            value={type}
                                            onChange={(e) => setType(e.target.value)}
                                        >
                                            <option value="normal">Normal — user reports a sender number, admin verifies</option>
                                            <option value="direct">Direct — auto-payment via UddoktaPay/FastPay</option>
                                        </select>
                                    </div>
                                    {type === 'direct' && (
                                        <div>
                                            <label htmlFor="seller_id">Seller ID (UddoktaPay)</label>
                                            <input
                                                ref={seller_id}
                                                id="seller_id"
                                                className="form_input"
                                                type="number"
                                                placeholder="e.g. 13"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="mt-2">
                                    <label>Information (shown to users)</label>
                                    <TextEditor
                                        value={infoHtml}
                                        onHtmlChange={setInfoHtml}
                                        minHeight={160}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Rendered as HTML on the storefront. Leave empty if not needed.
                                    </p>
                                </div>

                                <div>
                                    <button type="submit" disabled={uploading} className="cstm_btn w-full block mt-4">Create Payment Method</button>
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
