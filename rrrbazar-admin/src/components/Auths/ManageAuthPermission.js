import { useEffect, useState } from "react";
import { useHistory, withRouter } from "react-router-dom"
import Swal from "sweetalert2";
import axiosInstance from "../../common/axios";
import useGet from "../../hooks/useGet";
import { getErrors, hasData } from "../../utils/handler.utils";
import AdminProfile from "../Admin/AdminProfile";
import UiHandler from "../UiHandler";

function ManageAuthPermission(props) {
    const history = useHistory()
    const adminId = props.match.params.id;
    const [selectedAuthIds, setselectedAuthIds] = useState([])
    const [loading, setLoading] = useState(false)

    const [adminauthModules, loadingAdminAuthModules, errorAdminAuthModules] = useGet(`admin/admin-auth/${adminId}`)
    const [authModules, loadingAuthModules, errorAuthModules] = useGet('admin/auth-modules')

    useEffect(() => {
        hasData(adminauthModules) && setselectedAuthIds(prev => [...prev, ...adminauthModules])
    }, [adminauthModules])

    const isChecked = (id) => {
        return !loadingAdminAuthModules && adminauthModules?.includes(id)
    }

    const submitHandler = (e) => {
        e.preventDefault();
        const uniqueAuthIds = [...new Set(selectedAuthIds)]
        setLoading(true)

        axiosInstance.post('admin/admin-auth/update', {
            auth_ids: uniqueAuthIds,
            admin_id: adminId
        }).then(res => {
            history.replace('/admins')
        }).catch(error => {
            console.log(error);
            Swal.fire('Error!', getErrors(error), 'error')
        }).finally(() => setLoading(false))
    }

    const onChangeHandler = (e) => {
        setselectedAuthIds(prevAuths => {
            if (e.target.checked) {
                return [...prevAuths, Number(e.target.value)]
            }
            return [...prevAuths.filter(prevAuth => prevAuth !== Number(e.target.value))]
        })
    }

    return (
        <section className="relative container_admin" >
            <div className="bg-white overflow-hidden rounded">
                <div className="px-6 py-3 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-black">
                        Manage Auth Permission
                    </h3>
                </div>
                <div className="md:px-6 grid grid-cols-1 md:grid-cols-[70%,auto] gap-6 my-10 " >
                    <div className="border rounded border-gray-200 relative overflow-hidden">
                        <label className="py-2 px-4 border-b w-full grid grid-cols-[1fr,1fr,50px] gap-4 font-bold text-black" >
                            <span>Auth Name</span>
                            <span>Auth Url</span>
                            <span>Status</span>
                        </label>
                        <div className="relative">
                            <UiHandler data={authModules} loading={loadingAuthModules || loadingAdminAuthModules || loading} error={errorAuthModules || errorAdminAuthModules} />
                            <form onSubmit={submitHandler} >
                                {
                                    hasData(authModules, errorAuthModules) &&
                                    !loadingAdminAuthModules &&
                                    authModules.map(authModule => (
                                        <label className="py-2 px-4 cursor-pointer hover:bg-gray-200 border-b w-full grid grid-cols-[1fr,1fr,50px] gap-4 last:border-b-0 select-none" >
                                            <span>
                                                <span className="mr-3.5" >
                                                    <input type="checkbox" value={authModule.id} defaultChecked={isChecked(authModule.id)} onChange={onChangeHandler} />
                                                </span>
                                                {authModule.name || 'Not named'}
                                            </span>
                                            <span>{authModule.auth_url}</span>
                                            <span>{authModule.status}</span>
                                        </label>
                                    ))}
                                <div className="py-2 px-4 flex items-center justify-end border-t border-gray-200">
                                    <button className="cstm_btn">Save</button>
                                </div>
                            </form>
                        </div>
                    </div>
                    <div>
                        <AdminProfile id={adminId} />
                    </div>
                </div>
            </div>
        </section>
    )
}

export default withRouter(ManageAuthPermission)
