import React, { useEffect, useRef, useState } from 'react'
import { useHistory, withRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';
import useGet from '../../hooks/useGet';
import { getErrors, hasData, toastDefault } from '../../utils/handler.utils';
import TextEditor from '../TextEditor/TextEditor';
import Loader from '../Loader/Loader';

function EditTutorial(props) {
    const tutorialId = props.match.params.id;
    const history = useHistory()

    const title = useRef(null);
    const video_link = useRef(null);
    const serial = useRef(null);
    const is_active = useRef(null);

    const [data, loadingData] = useGet(`admin/tutorial/${tutorialId}`)
    const [descriptionHtml, setDescriptionHtml] = useState('')
    const [loading, setLoading] = useState(null)

    useEffect(() => {
        if (data?.description != null) setDescriptionHtml(data.description || '')
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data?.id])

    const editTutorialHandler = (e) => {
        e.preventDefault()
        setLoading(true)
        axiosInstance.post(`/admin/tutorial/update/${tutorialId}`, {
            title: title.current?.value || '',
            description: descriptionHtml,
            video_link: video_link.current?.value || '',
            serial: Number(serial.current?.value) || 0,
            is_active: is_active.current?.checked ? 1 : 0,
        }).then(() => {
            toast.success('Tutorial updated successfully', toastDefault)
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
                        Edit tutorial — {data?.title}
                    </h3>
                </div>
                <div className="py-10 px-4" >
                    <div className="w-full md:w-[70%] min-h-[250px] mx-auto py-6 relative border border-gray-200 px-4">
                        {(loadingData || loading) && <Loader absolute />}
                        {hasData(data) && (
                            <form onSubmit={editTutorialHandler} >
                                <div>
                                    <div>
                                        <label htmlFor="title">Title</label>
                                        <input ref={title} id="title" className="form_input" defaultValue={data?.title} type="text" placeholder="Title" required />
                                    </div>

                                    <div>
                                        <label htmlFor="video_link">Video link</label>
                                        <input ref={video_link} id="video_link" className="form_input" defaultValue={data?.video_link} type="url" placeholder="https://youtube.com/watch?v=..." required />
                                    </div>

                                    <div>
                                        <label htmlFor="serial">Serial</label>
                                        <input ref={serial} id="serial" className="form_input" type="number" defaultValue={data?.serial || 0} placeholder="0" />
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
                                        <input ref={is_active} id="is_active" type="checkbox" className="mr-2" defaultChecked={Number(data?.is_active) === 1} key={`ia-${data?.id}-${data?.is_active}`} />
                                        <label htmlFor="is_active" className="select-none cursor-pointer">Is Active</label>
                                    </div>

                                    <div className="mt-4">
                                        <button type="submit" className="cstm_btn w-full block">Update Tutorial</button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}

export default withRouter(EditTutorial)
