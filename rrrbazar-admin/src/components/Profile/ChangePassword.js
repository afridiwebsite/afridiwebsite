import React, { useRef } from 'react'
import { toast } from 'react-toastify'
import axiosInstance from '../../common/axios'
import { getErrors, toastDefault } from '../../utils/handler.utils'
import ProfileLayout from './ProfileLayout'

function ChangePassword() {
    const oldPassRef = useRef(null)
    const newPassRef = useRef(null)
    const confirmPassRef = useRef(null)

    const submitHandler = (e) => {
        e.preventDefault();



        toast.promise(
            axiosInstance.post('admin/change-password', {
                old_password: oldPassRef.current.value,
                new_password: newPassRef.current.value,
                confirm_password: confirmPassRef.current.value
            }),
            {
                pending: 'Changing password...',
                error: {
                    render({ data }) {
                        return getErrors(data, false, true)
                    }
                },
                success: {
                    render() {
                        return 'Password changed successfully'
                    }
                }
            },
            toastDefault
        )

    }

    return (
        <ProfileLayout>
            <form className="md:max-w-[450px]" onSubmit={submitHandler} >
                <input type="text" placeholder="Old password" ref={oldPassRef} className="form_input w-full" required />
                <input type="text" placeholder="New password" ref={newPassRef} className="form_input w-full" required />
                <input type="text" placeholder="Confirm password" ref={confirmPassRef} className="form_input w-full" required />
                <button type="submit" className="cstm_btn w-full">Change password</button>
            </form>
        </ProfileLayout>
    )
}

export default ChangePassword
