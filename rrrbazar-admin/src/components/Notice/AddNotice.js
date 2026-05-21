import React, { useMemo, useRef, useState } from 'react'
import { useHistory, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';
import useUpload from '../../hooks/useUpload';
import { getErrors, toastDefault } from '../../utils/handler.utils';
import Loader from '../Loader/Loader';

// Human-readable labels for the three notice types. The picker is gone — the
// type is supplied by the Notice listing page via `?type=…` query string.
const TYPE_LABELS = {
    normal: 'Normal',
    marquee: 'Marquee',
    navbar_bottom: 'Below Navbar (Closable)',
};

function AddNotice() {
    const image = useRef(null);
    const link = useRef(null);
    const notice = useRef(null);
    const is_active = useRef(null);

    const [noticeLogo, setNoticeLogo] = useState(null)
    const { path, uploading } = useUpload(noticeLogo)

    const [loading, setLoading] = useState(null)
    const history = useHistory()
    const location = useLocation()

    // Type is set by the listing page through the URL. Fall back to 'normal'
    // if someone lands on the add screen without a query string.
    const noticeType = useMemo(() => {
        const params = new URLSearchParams(location.search || '')
        const t = params.get('type')
        return TYPE_LABELS[t] ? t : 'normal'
    }, [location.search])

    const createPaymentMethodHandler = (e) => {
        e.preventDefault()

        if (!uploading) {
            setLoading(true)
            axiosInstance.post('/admin/notice/create', {
                title: '',
                image: path,
                link: link.current.value,
                notice: notice.current.value,
                type: noticeType,
                for_home_modal: 1,
                template: '',
                is_active: is_active.current.checked ? 1 : 0,
            }).then(res => {
                toast.success('Notice created successfully', toastDefault)

                setTimeout(() => {
                    history.push('/notice')
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
                <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-lg font-bold text-black">
                        Create new notice
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                        Type: {TYPE_LABELS[noticeType]}
                    </span>
                </div>
                <div className="py-10 px-4" >
                    <div className="w-full md:w-[70%] mx-auto py-6 relative border border-gray-200 px-4">
                        {loading && <Loader absolute />}
                        <form onSubmit={createPaymentMethodHandler} >
                            <div>
                                <div>
                                    <label htmlFor="image">Image</label>
                                    <input ref={image} id="image" className="form_input" type="file" required onChange={e => setNoticeLogo(e.target.files[0])} />
                                </div>


                                <div>
                                    <label htmlFor="link">Link</label>
                                    <input ref={link} id="link" className="form_input" type="text" placeholder="Link" />
                                </div>
                                <div>
                                    <label htmlFor="notice">Notice</label>
                                    <textarea required ref={notice} id="notice" className="form_input" placeholder="Notice" cols="30" rows="10"></textarea>
                                </div>

                                <div className="cursor-pointer" >
                                    <input ref={is_active} id="is_active" type="checkbox" className="mr-2" />
                                    <label htmlFor="is_active" className="select-none cursor-pointer">Is Active</label>
                                </div>

                                <div className="mt-4">
                                    <button type="submit" disabled={uploading} className="cstm_btn w-full block">Create Notice</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default AddNotice
