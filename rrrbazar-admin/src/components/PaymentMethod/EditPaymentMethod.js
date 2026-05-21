import React, { useEffect, useRef, useState } from 'react'
import { useHistory, withRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Editor } from 'react-draft-wysiwyg';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import { EditorState } from 'draft-js';
import { convertToHTML, convertFromHTML } from 'draft-convert';
import axiosInstance from '../../common/axios';
import useGet from '../../hooks/useGet';
import useUpload from '../../hooks/useUpload';
import { getErrors, toastDefault } from '../../utils/handler.utils';
import {
    draftToHTMLConfig,
    draftFromHTMLConfig,
} from '../../utils/draftEditor.utils';
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
    const seller_id = useRef(null);
    const status = useRef(null);

    const [type, setType] = useState('normal')
    const [editorState, setEditorState] = useState(EditorState.createEmpty())

    // Hydrate type + editor once the payment method finishes loading. Skips
    // reseeding on later updates so in-progress edits aren't clobbered.
    useEffect(() => {
        if (!data) return
        setType(data?.type === 'direct' ? 'direct' : 'normal')
        if (data?.info) {
            setEditorState(
                EditorState.createWithContent(
                    convertFromHTML(draftFromHTMLConfig)(data.info),
                ),
            )
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data?.id])

    const uploadImageCallback = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve({ data: { link: reader.result } });
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const editPaymentMethodHandler = (e) => {
        e.preventDefault()
        const infoHtml = convertToHTML(draftToHTMLConfig)(editorState.getCurrentContent())
        setLoading(true)
        axiosInstance.post(`/admin/payment-method/update/${paymentMethodId}`, {
            name: name.current.value,
            logo: path || data?.logo,
            info: infoHtml,
            status: status.current.value,
            type,
            seller_id: type === 'direct' ? (seller_id.current?.value || null) : null,
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
                        Edit payment method {`{ ${data?.name || ''} }`}
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
                                    <div>
                                        <label htmlFor="status">Status</label>
                                        <input ref={status} id="status" defaultValue={data?.status} className="form_input" type="text" placeholder="Status" required />
                                    </div>
                                </div>
                                {type === 'direct' && (
                                    <div className="form_grid">
                                        <div>
                                            <label htmlFor="seller_id">Seller ID (UddoktaPay)</label>
                                            <input
                                                ref={seller_id}
                                                id="seller_id"
                                                className="form_input"
                                                type="number"
                                                defaultValue={data?.seller_id || ''}
                                                placeholder="e.g. 13"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="mt-2">
                                    <label>Information (shown to users)</label>
                                    <div className="border border-gray-200 rounded mt-1">
                                        <Editor
                                            editorState={editorState}
                                            onEditorStateChange={setEditorState}
                                            wrapperClassName="px-2"
                                            editorClassName="px-2 min-h-[160px]"
                                            toolbar={{
                                                image: { uploadCallback: uploadImageCallback, alt: { present: true, mandatory: false } },
                                            }}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Rendered as HTML on the storefront. Leave empty if not needed.
                                    </p>
                                </div>

                                <div>
                                    <button disabled={uploading} type="submit" className="cstm_btn w-full block mt-4">Edit Payment Method</button>
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
