import React, { useRef, useState } from 'react'
import { useHistory } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';
import { getErrors, toastDefault } from '../../utils/handler.utils';
import TextEditor from '../TextEditor/TextEditor';
import Loader from '../Loader/Loader';

function AddTutorial() {
    const title = useRef(null);
    const video_link = useRef(null);
    const serial = useRef(null);
    const is_active = useRef(null);

    const [descriptionHtml, setDescriptionHtml] = useState('')
    const [loading, setLoading] = useState(null)
    const history = useHistory()

    const createTutorialHandler = (e) => {
        e.preventDefault()
        setLoading(true)
        axiosInstance.post('/admin/tutorial/create', {
            title: title.current?.value || '',
            description: descriptionHtml,
            video_link: video_link.current?.value || '',
            serial: Number(serial.current?.value) || 0,
            is_active: is_active.current?.checked ? 1 : 0,
        }).then(() => {
            toast.success('Tutorial created successfully', toastDefault)
            setTimeout(() => {
                history.push('/tutorials')
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
                        Create new tutorial
                    </h3>
                </div>
                <div className="py-10 px-4" >
                    <div className="w-full md:w-[70%] mx-auto py-6 relative border border-gray-200 px-4">
                        {loading && <Loader absolute />}
                        <form onSubmit={createTutorialHandler} >
                            <div>
                                <div>
                                    <label htmlFor="title">Title</label>
                                    <input ref={title} id="title" className="form_input" type="text" placeholder="Title" required />
                                </div>

                                <div>
                                    <label htmlFor="video_link">Video link</label>
                                    <input ref={video_link} id="video_link" className="form_input" type="url" placeholder="https://youtube.com/watch?v=..." required />
                                    <p className="text-xs text-gray-500 mt-1">
                                        The full URL the storefront opens in a new tab when the user clicks the tutorial card.
                                    </p>
                                </div>

                                <div>
                                    <label htmlFor="serial">Serial</label>
                                    <input ref={serial} id="serial" className="form_input" type="number" defaultValue={0} placeholder="0" />
                                </div>

                                <div className="mt-2">
                                    <label>Description</label>
                                    <TextEditor
                                        value={descriptionHtml}
                                        onHtmlChange={setDescriptionHtml}
                                        minHeight={180}
                                    />
                                </div>

                                <div className="cursor-pointer mt-3" >
                                    <input ref={is_active} id="is_active" type="checkbox" className="mr-2" defaultChecked />
                                    <label htmlFor="is_active" className="select-none cursor-pointer">Is Active</label>
                                </div>

                                <div className="mt-4">
                                    <button type="submit" className="cstm_btn w-full block">Create Tutorial</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default AddTutorial
