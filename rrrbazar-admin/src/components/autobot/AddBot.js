import React, { useRef, useState } from 'react'
import { useHistory } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';
import { getErrors, toastDefault } from '../../utils/handler.utils';
import Loader from '../Loader/Loader';
function AddBot() {
    const name = useRef(null);
    const status = useRef(null);
    const ip_url = useRef(null);
    const [loading, setLoading] = useState(null)
    const history = useHistory()

    const createUpinHandler = (e) => {
        e.preventDefault()
        setLoading(true)
        axiosInstance.post('/admin/botserver/create', {
            name: name.current.value,
            status: status.current.value,
            ip_url: ip_url.current.value,
        }).then(res => {
            toast.success('BOT Server created successfully', toastDefault)
            setTimeout(() => {
                history.push('/bots')
            }, 1500);
        }).catch(err => {
            toast.error(getErrors(err, false, true), toastDefault)
        }).finally(() => setLoading(false))
    }

    return (
        <section className="relative container_admin" >
            <div className="bg-white overflow-hidden rounded">
                <div className="px-6 py-3 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-black">
                        Create New BotServer
                    </h3>
                </div>
                <div className="py-10 px-4" >
                    <div className="w-full md:w-[70%] mx-auto py-6 relative border border-gray-200 px-4">
                        {loading && <Loader absolute />}
                        <form onSubmit={createUpinHandler} >
                            <div>
                                <div className="form_grid">
                                    <div>
                                        <label htmlFor="name">Name</label>
                                        <input ref={name} id="name" className="form_input" type="text" placeholder="Name" required />
                                    </div>
                                    <div>
                                        <label htmlFor="status">Status</label>
                                        <select ref={status} id="status" className="form_input">
                                            <option value="0">Select Status</option>
                                            <option value="1">Active</option>
                                            <option value="3">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form_grid">
                                    <div>
                                        <label htmlFor="ip_url">Server Address</label>
                                        <input ref={ip_url} id="ip_url" className="form_input" type="text" placeholder="Server Address" required />
                                    </div>
                                </div>
                                <div>
                                    <button type="submit" className="cstm_btn w-full block">Create Bot Server</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default AddBot
