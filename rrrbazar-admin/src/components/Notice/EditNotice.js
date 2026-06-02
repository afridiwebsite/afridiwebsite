import React, { useEffect, useRef, useState } from 'react'
import { useHistory, withRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';
import useGet from '../../hooks/useGet';
import useUpload from '../../hooks/useUpload';
import { getErrors, hasData, toastDefault } from '../../utils/handler.utils';
import TextEditor from '../TextEditor/TextEditor';
import Loader from '../Loader/Loader';

const TYPE_LABELS = {
    normal: 'Normal',
    marquee: 'Marquee',
    navbar_bottom: 'Below Navbar (Closable)',
};

function EditNotice(props) {
    const history = useHistory()
    const noticeId = props.match.params.id;

    const [loading, setLoading] = useState(null)
    const [data, loadingData, error] = useGet(`admin/notice/${noticeId}`)
    const [noticeImage, setNoticeLogo] = useState(data?.image)
    const { path, uploading } = useUpload(noticeImage)
    const [product_id, setProductId] = useState('')

    const link = useRef(null);
    const button_text = useRef(null);
    const is_active = useRef(null);

    const [noticeHtml, setNoticeHtml] = useState('')

    const [products] = useGet('admin/topup-products')

    useEffect(() => {
        if (data?.notice != null) setNoticeHtml(data.notice || '')
        if (data?.product_id != null) setProductId(data.product_id)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data?.id])

    const noticeType = data?.type || 'normal'
    const isStripType = noticeType === 'marquee' || noticeType === 'navbar_bottom'

    const editPaymentMethodHandler = (e) => {
        e.preventDefault()
        setLoading(true)
        axiosInstance.post(`/admin/notice/update/${noticeId}`, {
            title: '',
            image: isStripType ? '' : (path || data?.image || ''),
            link: isStripType ? '' : (link.current?.value || ''),
            notice: noticeHtml,
            type: noticeType,
            for_home_modal: 1,
            template: '',
            is_active: is_active.current.checked ? 1 : 0,
            button_text: isStripType ? '' : (button_text.current?.value || ''),
            product_id: product_id || null,
        }).then(res => {
            toast.success('Notice updated successfully', toastDefault)

            setTimeout(() => {
                history.push('/notice')
            }, 1500);
        }).catch(err => {
            toast.error(getErrors(err, false, true), toastDefault)
            setLoading(false)
        })
    }

    const currentTypeLabel = TYPE_LABELS[noticeType] || TYPE_LABELS.normal

    return (
        <section className="relative container_admin" >
            <div className="bg-white overflow-hidden rounded">
                <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-lg font-bold text-black">
                        Edit notice
                    </h3>
                    {data && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                            Type: {currentTypeLabel}
                        </span>
                    )}
                </div>
                <div className="py-10 px-4" >
                    <div className="w-full md:w-[70%] min-h-[300px] mx-auto py-6 relative border border-gray-200 px-4">
                        {loadingData && <Loader absolute />}
                        {loading && <Loader absolute />}
                        {
                            hasData(data, loading, error) && (
                                <form onSubmit={editPaymentMethodHandler} >
                                    <div>
                                        {!isStripType && (
                                            <>
                                                <div>
                                                    <label htmlFor="image">Image</label>
                                                    <input id="image" className="form_input" type="file" onChange={e => setNoticeLogo(e.target.files[0])} />
                                                </div>

                                                <div>
                                                    <label htmlFor="link">Link</label>
                                                    <input ref={link} id="link" defaultValue={data?.link} className="form_input" type="url" placeholder="Link (optional)" />
                                                </div>

                                                <div>
                                                    <label htmlFor="button_text">Button text</label>
                                                    <input
                                                        ref={button_text}
                                                        id="button_text"
                                                        className="form_input"
                                                        type="text"
                                                        defaultValue={data?.button_text || ''}
                                                        placeholder="e.g. Go to link, Learn more, Claim now"
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Shown on the modal CTA when a Link is set. Falls back to "Go to link" when empty.
                                                    </p>
                                                </div>

                                                <div className="mt-3">
                                                    <label htmlFor="product_id">Target Product (Optional)</label>
                                                    <select
                                                        id="product_id"
                                                        className="form_input"
                                                        value={product_id}
                                                        onChange={e => setProductId(e.target.value)}
                                                    >
                                                        <option value="">Global (All Products / Home)</option>
                                                        {products?.map(p => (
                                                            <option key={p.id} value={p.id}>{p.name}</option>
                                                        ))}
                                                    </select>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        If selected, this notice will only show on that product's topup page.
                                                    </p>
                                                </div>
                                            </>
                                        )}

                                        <div className="mt-2">
                                            <label>Notice</label>
                                            <TextEditor
                                                value={noticeHtml}
                                                onHtmlChange={setNoticeHtml}
                                                minHeight={160}
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Rendered as HTML on the storefront.
                                            </p>
                                        </div>

                                        <div className="cursor-pointer mt-3" >
                                            <input ref={is_active} id="is_active" defaultChecked={data?.is_active == 1} type="checkbox" className="mr-2" />
                                            <label htmlFor="is_active" className="select-none cursor-pointer">Is Active</label>
                                        </div>

                                        <div className="mt-4">
                                            <button type="submit" disabled={uploading} className="cstm_btn w-full block">Updated Notice</button>
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

export default withRouter(EditNotice)
