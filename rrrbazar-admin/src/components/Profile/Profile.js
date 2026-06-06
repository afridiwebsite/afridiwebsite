import React, { useState, useEffect } from 'react'
import ProfileLayout from './ProfileLayout'
import useGet from '../../hooks/useGet'
import axios from '../../common/axios'
import { toast } from 'react-toastify'
import { imgPath, toastDefault } from '../../utils/handler.utils'
import { useFormik } from 'formik'

import { getLocal, getSession, setLocal, setSession } from '../../utils/localStorage.utils'

function Profile() {
    const [data, loading, _error, refresh] = useGet('admin/profile')
    const [uploading, setUploading] = useState(false)

    const formik = useFormik({
        initialValues: {
            first_name: '',
            last_name: '',
            email: '',
            image: ''
        },
        onSubmit: async (values) => {
            try {
                const res = await axios.post('admin/profile/update', values)
                toast.success(res.data.message || 'Profile updated', toastDefault)

                // Update local storage
                const user = getLocal('user') || getSession('user')
                if (user) {
                    const updatedUser = { ...user, ...values }
                    if (getLocal('user')) setLocal('user', updatedUser)
                    else setSession('user', updatedUser)
                }

                refresh()
            } catch (err) {
                toast.error(err.response?.data?.message || 'Update failed', toastDefault)
            }
        }
    })

    useEffect(() => {
        if (data) {
            formik.setValues({
                first_name: data.first_name || '',
                last_name: data.last_name || '',
                email: data.email || '',
                image: data.image || ''
            })
        }
    }, [data, formik])

    const handleImageChange = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        const formData = new FormData()
        formData.append('image', file)

        setUploading(true)
        try {
            const res = await axios.post('v1/upload/image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            const fileName = res.data.data.image
            formik.setFieldValue('image', fileName)
            // Auto save profile after image upload
            await axios.post('admin/profile/update', { ...formik.values, image: fileName })

            // Update local storage so header reflects changes
            const user = getLocal('user') || getSession('user')
            if (user) {
                user.image = fileName
                if (getLocal('user')) setLocal('user', user)
                else setSession('user', user)
            }

            toast.success('Profile image updated', toastDefault)
            refresh()
        } catch (err) {
            toast.error('Image upload failed', toastDefault)
        } finally {
            setUploading(false)
        }
    }

    if (loading) return <ProfileLayout>Loading...</ProfileLayout>

    return (
        <ProfileLayout>
            <div className="flex flex-wrap">
                <div className="w-full lg:w-4/12 px-4 mb-6 lg:mb-0">
                    <div className="flex flex-col items-center">
                        <div className="relative group cursor-pointer">
                            <img
                                alt="Profile"
                                src={formik.values.image ? imgPath(formik.values.image) : require("../../assets/img/team-2-800x800.jpg").default}
                                className="shadow-xl rounded-full h-32 w-32 object-cover border-none"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <label className="cursor-pointer text-white text-xs font-bold">
                                    {uploading ? '...' : 'Change Image'}
                                    <input type="file" className="hidden" onChange={handleImageChange} accept="image/*" disabled={uploading} />
                                </label>
                            </div>
                        </div>
                        <h4 className="text-xl font-bold mt-4">{formik.values.first_name} {formik.values.last_name}</h4>
                        <p className="text-gray-500 text-sm">{formik.values.email}</p>
                    </div>
                </div>
                <div className="w-full lg:w-8/12 px-4">
                    <form onSubmit={formik.handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">First Name</label>
                                <input
                                    type="text"
                                    name="first_name"
                                    className="border-0 px-3 py-2 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                                    {...formik.getFieldProps('first_name')}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Last Name</label>
                                <input
                                    type="text"
                                    name="last_name"
                                    className="border-0 px-3 py-2 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                                    {...formik.getFieldProps('last_name')}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    className="border-0 px-3 py-2 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                                    {...formik.getFieldProps('email')}
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            className="bg-indigo-600 !text-white active:bg-indigo-700 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 ease-linear transition-all duration-150 mt-6"
                        >
                            Update Profile
                        </button>
                    </form>
                </div>
            </div>
        </ProfileLayout>
    )
}

export default Profile
