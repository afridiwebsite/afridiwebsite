import React, { useRef, useState } from 'react'
import { useHistory, withRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';
import useGet from '../../hooks/useGet';
import useUpload from '../../hooks/useUpload';
import { getErrors, hasData, toastDefault } from '../../utils/handler.utils';
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

    const image = useRef(null);
    const link = useRef(null);
    const notice = useRef(null);
    const is_active = useRef(null);

    const editPaymentMethodHandler = (e) => {
        e.preventDefault()
        setLoading(true)
        axiosInstance.post(`/admin/notice/update/${noticeId}`, {
            title: '',
            image: path || data?.image,
            link: link.current.value,
            notice: notice.current.value,
            // Preserve whatever type this notice was created under. The
            // listing-page tabs are the only place type is chosen now.
            type: data?.type || 'normal',
            for_home_modal: 1,
            template: '',
            is_active: is_active.current.checked ? 1 : 0,
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

    const currentTypeLabel = TYPE_LABELS[data?.type] || TYPE_LABELS.normal

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
                                        <div>
                                            <label htmlFor="image">Image</label>
                                            <input ref={image} id="image" className="form_input" type="file" onChange={e => setNoticeLogo(e.target.files[0])} />
                                        </div>

                                        <div>
                                            <label htmlFor="link">Link</label>
                                            <input ref={link} id="link" defaultValue={data?.link} className="form_input" type="url" placeholder="Link" />
                                        </div>
                                        <div>
                                            <label htmlFor="notice">Notice</label>
                                            <textarea required ref={notice} id="notice" className="form_input" placeholder="Notice" cols="30" rows="10" defaultValue={data?.notice} />
                                        </div>

                                        <div className="cursor-pointer" >
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
