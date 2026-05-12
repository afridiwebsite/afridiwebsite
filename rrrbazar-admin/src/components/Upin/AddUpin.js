import React, { useRef, useState } from 'react'
import { useHistory } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';
import { getErrors, toastDefault } from '../../utils/handler.utils';
import Loader from '../Loader/Loader';
function AddUpin() {
    const code = useRef(null);
    const status = useRef(null);
    const package_id = useRef(null);
    const [loading, setLoading] = useState(null)
    const history = useHistory()

    const createUpinHandler = (e) => {
        e.preventDefault()
        setLoading(true)
        axiosInstance.post('/admin/unipin/create', {
            code: code.current.value,
            status: status.current.value,
            package_id: package_id.current.value,
        }).then(res => {
            toast.success('UniPin created successfully', toastDefault)
            setTimeout(() => {
                history.push('/upins')
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
                        Create New Voucher
                    </h3>
                </div>
                <div className="py-10 px-4" >
                    <div className="w-full md:w-[70%] mx-auto py-6 relative border border-gray-200 px-4">
                        {loading && <Loader absolute />}
                        <form onSubmit={createUpinHandler} >
                            <div>
                                <div className="form_grid">
                                    <div>
                                        <label htmlFor="code">Voucher Code</label>
                                        <textarea ref={code} id="code" className="form_input" type="text" placeholder="Voucher Code"></textarea>
                                    </div>
                                    <div>
                                        <label htmlFor="status">Status</label>
                                        <select ref={status} id="status" className="form_input">
                                            <option value="0">Select Status</option>
                                            <option value="1">Active</option>
                                            <option value="2">Used</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form_grid">
                                    <div>
                                        <label htmlFor="package_id">Package ID</label>
                                        <input ref={package_id} id="package_id" className="form_input" type="text" placeholder="Package ID" required />
                                    </div>
                                </div>
                                <div>
                                    <button type="submit" className="cstm_btn w-full block">Create Voucher</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default AddUpin
