import React, { useRef, useState } from 'react'
import { useHistory } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';
import useUpload from '../../hooks/useUpload';
import { getErrors, toastDefault } from '../../utils/handler.utils';
import Loader from '../Loader/Loader';

function AddBanner() {
    const note = useRef(null);
    const image = useRef(null);
    const link = useRef(null);

    const isactive = useRef(null);

    const [bannerImage, setBannerImage] = useState(null)
    const { path, uploading } = useUpload(bannerImage)

    const [loading, setLoading] = useState(null)
    const history = useHistory()

    const createPaymentMethodHandler = (e) => {
        e.preventDefault()

        if (!uploading) {
            setLoading(true)
            axiosInstance.post('/admin/banner/create', {
                note: note.current.value,
                banner: path,
                link: link.current.value,
                isactive: isactive.current.checked ? 1 : 0,
            }).then(res => {
                toast.success('Banner created successfully', toastDefault)

                setTimeout(() => {
                    history.push('/banner')
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
                        Create new banner
                    </h3>
                </div>
                <div className="py-10 px-4" >
                    <div className="w-full md:w-[70%] mx-auto py-6 relative border border-gray-200 px-4">
                        {loading && <Loader absolute />}
                        <form onSubmit={createPaymentMethodHandler} >
                            <div>
                                <div>
                                    <label htmlFor="title">Note</label>
                                    <input ref={note} id="note" className="form_input" type="text" placeholder="Note" required />
                                </div>
                                <div>
                                    <label htmlFor="image">Banner</label>
                                    <input ref={image} id="image" className="form_input" type="file" required onChange={e => setBannerImage(e.target.files[0])} />
                                </div>


                                <div>
                                    <label htmlFor="link">Link</label>
                                    <input ref={link} id="link" className="form_input" type="text" placeholder="Link" />
                                </div>

                                <div className="cursor-pointer" >
                                    <input ref={isactive} id="isactive" type="checkbox" className="mr-2" />
                                    <label htmlFor="isactive" className="select-none cursor-pointer">Is Active</label>
                                </div>

                                <div className="mt-4">
                                    <button type="submit" disabled={uploading} className="cstm_btn w-full block">Create Banner</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default AddBanner
