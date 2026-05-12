import React from 'react'
import useGet from '../../hooks/useGet'
import { hasData } from '../../utils/handler.utils'
import UiHandler from '../UiHandler'

function AdminProfile({ id }) {
    const [admin, loading, error] = useGet(`admin/admin/${id}`)
    return (
        <div className="border rounded border-gray-200 relative overflow-hidden">
            <UiHandler data={admin} loading={loading} error={error} />
            {
                hasData(admin, error) && (
                    <div className="py-5 px-4 w-full flex flex-col items-center ">
                        <div className="w-[150px] h-[150px] rounded-full overflow-hidden mb-2 flex_center bg-gray-50">
                            <img src={admin?.image} alt={admin?.first_name + ' ' + admin?.last_name} />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 capitalize mb-2">{admin?.first_name} {admin?.last_name}</h3>
                        <p className="text-gray-500 font-semibold mb-2">
                            Username: {admin?.username}
                        </p>
                        <p className="text-gray-500 font-semibold mb-2">
                            Email: {admin?.email}
                        </p>
                        <p className="text-gray-500 font-semibold mb-2">
                            Phone: {admin?.phone}
                        </p>
                    </div>
                )
            }
        </div>
    )
}

export default AdminProfile
