import React, { useRef, useState } from 'react'
import { useHistory } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';
import { getErrors, toastDefault } from '../../utils/handler.utils';
import Loader from '../Loader/Loader';
function AddAdmins() {
    const first_name = useRef(null);
    const last_name = useRef(null);
    const username = useRef(null);
    const email = useRef(null);
    const password = useRef(null);
    const confirm_password = useRef(null);
    const [loading, setLoading] = useState(null)
    const history = useHistory()

    const createAdminHandler = (e) => {
        e.preventDefault()
        setLoading(true)
        axiosInstance.post('/admin/create-admin', {
            first_name: first_name.current.value,
            last_name: last_name.current.value,
            username: username.current.value,
            email: email.current.value,
            password: password.current.value,
            confirm_password: confirm_password.current.value
        }).then(res => {
            toast.success('Admin created successfully', toastDefault)

            setTimeout(() => {
                history.push('/admins')
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
                        Create new admin
                    </h3>
                </div>
                <div className="py-10 px-4" >
                    <div className="w-full md:w-[70%] mx-auto py-6 relative border border-gray-200 px-4">
                        {loading && <Loader absolute />}
                        <form onSubmit={createAdminHandler} >
                            <div>
                                <div className="form_grid">
                                    <div>
                                        <label htmlFor="first_name">First name</label>
                                        <input ref={first_name} id="first_name" className="form_input" type="text" placeholder="First name" required />
                                    </div>
                                    <div>
                                        <label htmlFor="last_name">Last name</label>
                                        <input ref={last_name} id="last_name" className="form_input" type="text" placeholder="Last name" required />
                                    </div>
                                </div>
                                <div className="form_grid">
                                    <div>
                                        <label htmlFor="username">Username</label>
                                        <input ref={username} id="username" className="form_input" type="text" placeholder="Username" required />
                                    </div>
                                    <div>
                                        <label htmlFor="email">Email</label>
                                        <input ref={email} id="email" className="form_input" type="email" placeholder="Email" required />
                                    </div>
                                </div>
                                <div className="form_grid">
                                    <div>
                                        <label htmlFor="password">Password</label>
                                        <input ref={password} id="password" className="form_input" type="password" placeholder="Password" required />
                                    </div>
                                    <div>
                                        <div>
                                            <label htmlFor="confirm_password">Confirm Password</label>
                                            <input ref={confirm_password} className="form_input" id="confirm_password" type="password" placeholder="Confirm Password" required />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <button type="submit" className="cstm_btn w-full block">Create Admin</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default AddAdmins
