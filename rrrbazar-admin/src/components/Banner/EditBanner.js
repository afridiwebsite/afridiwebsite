import React, { useRef, useState } from 'react'
import { useHistory, withRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';
import useGet from '../../hooks/useGet';
import useUpload from '../../hooks/useUpload';
import { getErrors, hasData, toastDefault } from '../../utils/handler.utils';
import Loader from '../Loader/Loader';
function EditBanner(props) {
    const history = useHistory()
    const noticeId = props.match.params.id;

    const [loading, setLoading] = useState(null)
    const [data, loadingData, error] = useGet(`admin/banner/${noticeId}`)
    const [bannerImage, setBannerImage] = useState(data?.banner)
    const { path, uploading } = useUpload(bannerImage)

    const note = useRef(null);
    const banner = useRef(null);
    const link = useRef(null);
    const isactive = useRef(null);

    console.log(data);

    const editPaymentMethodHandler = (e) => {
        e.preventDefault()
        setLoading(true)
        axiosInstance.post(`/admin/banner/update/${noticeId}`, {
            note: note.current.value,
            banner: path || data?.banner,
            link: link.current.value,
            isactive: isactive.current.checked ? 1 : 0,
        }).then(res => {
            toast.success('Banner updated successfully', toastDefault)

            setTimeout(() => {
                history.push('/banner')
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
                        Edit banner
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

                                        <div>
                                            <label htmlFor="note">Note</label>
                                            <input ref={note} id="note" defaultValue={data?.note} className="form_input" type="text" placeholder="Title" required />
                                        </div>


                                        <div>
                                            <label htmlFor="banner">Banner</label>
                                            <input ref={banner} id="banner" className="form_input" type="file" onChange={e => setBannerImage(e.target.files[0])} />
                                        </div>

                                        <div>
                                            <label htmlFor="link">Link</label>
                                            <input ref={link} id="link" defaultValue={data?.link} className="form_input" type="text" placeholder="Link" required />
                                        </div>


                                        <div className="cursor-pointer" >
                                            <input ref={isactive} id="isactive" defaultChecked={data?.isactive == 1} type="checkbox" className="mr-2" />
                                            <label htmlFor="isactive" className="select-none cursor-pointer">Is Active</label>
                                        </div>



                                        <div className="mt-4">
                                            <button type="submit" disabled={uploading} className="cstm_btn w-full block">Updated Banner</button>
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

export default withRouter(EditBanner)
