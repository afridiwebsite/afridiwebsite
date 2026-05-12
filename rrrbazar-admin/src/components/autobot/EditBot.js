import React, { useRef, useState } from 'react'
import { useHistory, withRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';
import useGet from '../../hooks/useGet';
import useUpload from '../../hooks/useUpload';
import { getErrors, hasData, toastDefault } from '../../utils/handler.utils';
import Loader from '../Loader/Loader';
function EditBot(props) {
    const history = useHistory()
    const id = props.match.params.id;

    const [loading, setLoading] = useState(null)
    const [data, loadingData, error] = useGet(`admin/botserver/${id}`)
    const [botName, setBotName] = useState(data?.name)
    const [botStatus, setBotStatus] = useState(data?.status)
    const [botIP, setBotIP] = useState(data?.ip_url)

    const name = useRef(null);
    const status = useRef(null);
    const ip_url = useRef(null);

    const editUpinHandler = (e) => {
        e.preventDefault()
        setLoading(true)
        axiosInstance.post(`/admin/botserver/update/${id}`, {
            name: name.current.value,
            status: status.current.value,
            ip_url: ip_url.current.value,
        }).then(res => {
            toast.success('Bot Server updated successfully', toastDefault)

            setTimeout(() => {
                history.push('/bots')
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
                        Edit Bot Server
                    </h3>
                </div>
                <div className="py-10 px-4" >
                    <div className="w-full md:w-[70%] min-h-[300px] mx-auto py-6 relative border border-gray-200 px-4">
                        {loadingData && <Loader absolute />}
                        {loading && <Loader absolute />}
                        {
                            hasData(data, loading, error) && (
                                <form onSubmit={editUpinHandler} >
                                    <div>

                                        <div className="form_grid">
                                            <div>
                                                <label htmlFor="name">Bot Name</label>
                                                <input ref={name} id="name" defaultValue={data?.name} className="form_input" type="text" placeholder="Bot Name" required />
                                            </div>
                                            <div>
                                                <label htmlFor="status">Status</label>
                                                <select ref={status} id="status" className="form_input">
                                                    <option value="">Select Status</option>
                                                    <option value="1">Active</option>
                                                    <option value="2">Working</option>
                                                    <option value="3">Inactive</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="form_grid">
                                            <div>
                                                <label htmlFor="ip_url">Server Address</label>
                                                <input ref={ip_url} id="ip_url" defaultValue={data?.ip_url} className="form_input" type="text" placeholder="Server Address" required />
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <button type="submit" className="cstm_btn w-full block">Updated BOT</button>
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

export default withRouter(EditBot)
