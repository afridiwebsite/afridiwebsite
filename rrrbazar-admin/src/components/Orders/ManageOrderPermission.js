import { useEffect, useState } from "react";
import { useHistory, withRouter } from "react-router-dom"
import Swal from "sweetalert2";
import axiosInstance from "../../common/axios";
import useGet from "../../hooks/useGet";
import { getErrors, hasData } from "../../utils/handler.utils";
import Accordion from "../Accordion";
import AdminProfile from "../Admin/AdminProfile";
import UiHandler from "../UiHandler";

function ManageOrderPermission(props) {
    const history = useHistory()
    const adminId = props.match.params.id;
    const [packages, setPackage] = useState([])
    const [loading, setLoading] = useState(false)
    const [products, loadingProducts, errorProducts] = useGet(`admin/topup-products`)
    const [topupPackagesByAdmin, loadingPackages, errorPackages] = useGet(`admin/topup-package-permission/admin/${adminId}`)

    useEffect(() => {
        if (topupPackagesByAdmin?.length > 0 && !errorPackages) {
            setPackage(prev => [...prev, ...topupPackagesByAdmin])
        }
    }, [topupPackagesByAdmin, errorPackages])


    const submitHandler = (e) => {
        e.preventDefault();

        if (products.length <= 0) {
            return false;
        }
        const uniqueAuthIds = [...new Set(packages)]
        setLoading(true)
        axiosInstance.post('admin/topup-package-permission/add-permission', {
            admin_id: adminId,
            topup_package_id: uniqueAuthIds
        }).then(res => {
            history.replace('/admins')
        }).catch(error => {
            console.log(error);
            Swal.fire('Error!', getErrors(error), 'error')
        }).finally(() => setLoading(false))
    }

    return (
        <section className="relative container_admin" >
            <div className="bg-white overflow-hidden rounded">
                <div className="px-6 py-3 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-black">
                        Manage Order Permission
                    </h3>
                </div>
                <div className="md:px-6 grid grid-cols-1 md:grid-cols-[70%,auto] gap-6 my-10 " >
                    <div className="rounded relative overflow-hidden">
                        <div className="border border-gray-200">
                            <UiHandler data={products} loading={loadingProducts || loadingPackages || loading} error={errorProducts || errorPackages} />
                            {
                                !errorPackages && hasData(products) && !loading && (
                                    <>
                                        {products?.map(product => (
                                            <Accordion topupPackagesByAdmin={topupPackagesByAdmin} product={product} setPackage={setPackage} />
                                        ))}
                                        <div className="pb-3 px-2 flex items-center justify-end">
                                            <button className="cstm_btn" onClick={submitHandler}>Save</button>
                                        </div>
                                    </>
                                )
                            }
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

export default withRouter(ManageOrderPermission)
