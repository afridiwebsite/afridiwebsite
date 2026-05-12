import React, { useRef, useState } from 'react'
import { toast } from 'react-toastify'
import axiosInstance from '../../common/axios'
import useGet from '../../hooks/useGet'
import { getErrors, toastDefault } from '../../utils/handler.utils'
import Loader from '../Loader/Loader'

function Categories() {
    const [refresh, setRefresh] = useState(false)
    const [categories, loading] = useGet('admin/categories', '', refresh)
    const [editing, setEditing] = useState(null)
    const [busy, setBusy] = useState(false)

    const name = useRef(null)
    const emoji = useRef(null)
    const serial = useRef(null)
    const is_active = useRef(null)

    const refreshList = () => setRefresh((p) => !p)

    const submit = (e) => {
        e.preventDefault()
        setBusy(true)
        const payload = {
            name: name.current.value,
            emoji: emoji.current.value,
            serial: Number(serial.current.value || 0),
            is_active: is_active.current.checked ? 1 : 0,
        }
        const req = editing
            ? axiosInstance.post(`/admin/category/update/${editing.id}`, payload)
            : axiosInstance.post('/admin/category/create', payload)
        req
            .then(() => {
                toast.success(editing ? 'Category updated' : 'Category created', toastDefault)
                setEditing(null)
                name.current.value = ''
                emoji.current.value = ''
                serial.current.value = ''
                is_active.current.checked = true
                refreshList()
            })
            .catch((err) => toast.error(getErrors(err, false, true), toastDefault))
            .finally(() => setBusy(false))
    }

    const startEdit = (c) => {
        setEditing(c)
        setTimeout(() => {
            if (name.current) name.current.value = c.name || ''
            if (emoji.current) emoji.current.value = c.emoji || ''
            if (serial.current) serial.current.value = c.serial || 0
            if (is_active.current) is_active.current.checked = c.is_active === 1
        }, 0)
    }

    const remove = (id) => {
        if (!window.confirm('Delete this category?')) return
        axiosInstance
            .post(`/admin/category/delete/${id}`)
            .then(() => {
                toast.success('Deleted', toastDefault)
                refreshList()
            })
            .catch((err) => toast.error(getErrors(err, false, true), toastDefault))
    }

    return (
        <section className="relative container_admin">
            <div className="bg-white overflow-hidden rounded">
                <div className="px-6 py-3 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-black">Product Categories</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6 p-6">
                    <form onSubmit={submit} className="relative border border-gray-200 rounded p-4">
                        {busy && <Loader absolute />}
                        <h4 className="font-bold mb-3">
                            {editing ? `Edit "${editing.name}"` : 'Add new category'}
                        </h4>
                        <div className="mb-3">
                            <label>Name</label>
                            <input ref={name} className="form_input" required placeholder="e.g. Free Fire Topup" />
                        </div>
                        <div className="mb-3">
                            <label>Emoji / icon</label>
                            <input ref={emoji} className="form_input" placeholder="🎮" maxLength={4} />
                            <small className="text-gray-500">Shown next to the section title.</small>
                        </div>
                        <div className="mb-3">
                            <label>Display order</label>
                            <input ref={serial} type="number" defaultValue={0} className="form_input" />
                        </div>
                        <div className="mb-3">
                            <label className="cursor-pointer select-none">
                                <input ref={is_active} type="checkbox" defaultChecked className="mr-2" />
                                Active
                            </label>
                        </div>
                        <div className="flex gap-2">
                            <button type="submit" disabled={busy} className="cstm_btn flex-1">
                                {editing ? 'Update' : 'Create'}
                            </button>
                            {editing && (
                                <button
                                    type="button"
                                    className="cstm_btn !bg-gray-500"
                                    onClick={() => {
                                        setEditing(null)
                                        if (name.current) name.current.value = ''
                                        if (emoji.current) emoji.current.value = ''
                                        if (serial.current) serial.current.value = 0
                                        if (is_active.current) is_active.current.checked = true
                                    }}
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>

                    <div className="border border-gray-200 rounded p-4 relative min-h-[200px]">
                        {loading && <Loader absolute />}
                        <h4 className="font-bold mb-3">All categories</h4>
                        <ul className="divide-y">
                            {(categories || []).map((c) => (
                                <li key={c.id} className="py-2 flex items-center justify-between">
                                    <div>
                                        <span className="mr-2">{c.emoji}</span>
                                        <strong>{c.name}</strong>{' '}
                                        <span className="text-xs text-gray-500">#{c.serial}</span>{' '}
                                        {c.is_active === 0 && <span className="text-xs text-red-500">inactive</span>}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => startEdit(c)} className="cstm_btn_small">
                                            Edit
                                        </button>
                                        <button onClick={() => remove(c.id)} className="cstm_btn_small !bg-red-600 hover:!bg-red-700">
                                            Delete
                                        </button>
                                    </div>
                                </li>
                            ))}
                            {(!categories || categories.length === 0) && !loading && (
                                <li className="py-2 text-sm text-gray-500">No categories yet.</li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Categories
