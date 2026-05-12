import React, { useRef, useState } from 'react'
import { useHistory, withRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';
import useGet from '../../hooks/useGet';
import useUpload from '../../hooks/useUpload';
import { getErrors, hasData, toastDefault } from '../../utils/handler.utils';
import Loader from '../Loader/Loader';
function EditUpin(props) {
    const history = useHistory()
    const id = props.match.params.id;

    const [loading, setLoading] = useState(null)
    const [data, loadingData, error] = useGet(`admin/unipin/${id}`)
    const [upinCode, setUpinCode] = useState(data?.code)
    const [upinStatus, setUpinStatus] = useState(data?.status)
    const [upinPackageId, setUpinPackageId] = useState(data?.pacage_id)

    const code = useRef(null);
    const status = useRef(null);
    const package_id = useRef(null);

    const editUpinHandler = (e) => {
        e.preventDefault()
        setLoading(true)
        axiosInstance.post(`/admin/unipin/update/${id}`, {
            code: code.current.value,
            status: status.current.value,
            package_id: package_id.current.value,
        }).then(res => {
            toast.success('Voucher updated successfully', toastDefault)

            setTimeout(() => {
                history.push('/upins')
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
                        Edit Voucher
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
                                                <label htmlFor="code">Voucher Code</label>
                                                <input ref={code} id="code" defaultValue={data?.code} className="form_input" type="text" placeholder="Voucher Code" required />
                                            </div>
                                            <div>
                                                <label htmlFor="status">Status</label>
                                                <select value={data?.status} ref={status} id="status" className="form_input">
                                                    <option value="0">Select Status</option>
                                                    <option value="1">Active</option>
                                                    <option value="2">Used</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="form_grid">
                                            <div>
                                                <label htmlFor="package_id">Package ID</label>
                                                <input ref={package_id} id="package_id" defaultValue={data?.package_id} className="form_input" type="text" placeholder="Package ID" required />
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <button type="submit" className="cstm_btn w-full block">Updated Voucher</button>
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

export default withRouter(EditUpin)
