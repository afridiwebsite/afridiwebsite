import React from 'react'
import { Link } from 'react-router-dom'

function ProfileLayout({ children }) {
    return (
        <section className="relative container_admin" >
            <div className="bg-white overflow-hidden rounded">
                <div className="px-4 sm:px-6 py-3 border-b border-gray-200 flex items-center justify-between flex-wrap">
                    <h3 className="text-lg font-bold text-black">
                        Profile
                    </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[200px,auto]">
                    <div className="flex md:flex-col border-b md:border-b-0 md:border-r border-gray-200">
                        <Link to="/profile" className="dropdown_a !px-4 flex-1 justify-center md:justify-start border-r md:border-r-0 md:border-b border-gray-200">
                            Profile
                        </Link>
                        <Link to="/profile/change-password" className="dropdown_a !px-4 flex-1 justify-center md:justify-start md:border-b border-gray-200">
                            Change password
                        </Link>
                    </div>
                    <div className="p-4 md:p-6" >
                        {children}
                    </div>
                </div>
            </div>
        </section>
    )
}

export default ProfileLayout
