import React, { useEffect, useState } from 'react'
import { Editor } from 'react-draft-wysiwyg'
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css'
import { EditorState } from 'draft-js'
import { convertFromHTML, convertToHTML } from 'draft-convert'
import { toast } from 'react-toastify'
import axiosInstance from '../../common/axios'
import { getErrors, toastDefault } from '../../utils/handler.utils'
import Loader from '../Loader/Loader'

// Manages the saved comment templates used by the Orders edit modal.
function OrderComments() {
    const [list, setList] = useState([])
    const [loading, setLoading] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [label, setLabel] = useState('')
    const [editorState, setEditorState] = useState(EditorState.createEmpty())
    const [saving, setSaving] = useState(false)

    const refresh = async () => {
        setLoading(true)
        try {
            const res = await axiosInstance.get('/admin/order-comments')
            setList(Array.isArray(res?.data?.data) ? res.data.data : [])
        } catch (err) {
            toast.error(getErrors(err, false, true), toastDefault)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        refresh()
    }, [])

    const resetForm = () => {
        setEditingId(null)
        setLabel('')
        setEditorState(EditorState.createEmpty())
    }

    const startEditing = (item) => {
        setEditingId(item.id)
        setLabel(item.label || '')
        if (item.html) {
            setEditorState(EditorState.createWithContent(convertFromHTML(item.html)))
        } else {
            setEditorState(EditorState.createEmpty())
        }
    }

    const submit = async (e) => {
        e.preventDefault()
        const html = convertToHTML(editorState.getCurrentContent())
        const url = editingId
            ? `/admin/order-comments/${editingId}`
            : '/admin/order-comments'
        setSaving(true)
        try {
            await axiosInstance.post(url, { html, label })
            toast.success(
                editingId ? 'Comment updated' : 'Comment saved',
                toastDefault,
            )
            resetForm()
            refresh()
        } catch (err) {
            toast.error(getErrors(err, false, true), toastDefault)
        } finally {
            setSaving(false)
        }
    }

    const remove = async (id) => {
        if (!window.confirm('Delete this comment template?')) return
        try {
            await axiosInstance.post(`/admin/order-comments/${id}/delete`)
            toast.success('Comment template deleted', toastDefault)
            if (editingId === id) resetForm()
            refresh()
        } catch (err) {
            toast.error(getErrors(err, false, true), toastDefault)
        }
    }

    return (
        <section className="relative container_admin">
            <div className="bg-white overflow-hidden rounded">
                <div className="px-6 py-3 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-black">
                        Order comment templates
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                        Reusable notes shown in the Orders edit modal. Plain
                        text from each template gets dropped into the order's
                        brief note.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-6">
                    <div className="py-8 px-4">
                        <form onSubmit={submit} className="relative border border-gray-200 rounded px-4 py-6">
                            {saving && <Loader absolute />}
                            <h4 className="font-bold mb-3">
                                {editingId ? 'Edit template' : 'New template'}
                            </h4>
                            <div className="mb-3">
                                <label className="text-xs text-gray-600 block mb-1">
                                    Short label (optional)
                                </label>
                                <input
                                    type="text"
                                    className="form_input"
                                    placeholder="e.g. Wrong Player ID"
                                    value={label}
                                    onChange={(e) => setLabel(e.target.value)}
                                />
                                <p className="text-[11px] text-gray-500 mt-1">
                                    Used in the picker. If empty, the first 80
                                    chars of the comment are used.
                                </p>
                            </div>
                            <label className="text-xs text-gray-600 block mb-1">
                                Comment
                            </label>
                            <Editor
                                editorState={editorState}
                                editorStyle={{ height: 220 }}
                                wrapperStyle={{
                                    border: '1px solid #dcdcf3',
                                    borderRadius: 6,
                                }}
                                onEditorStateChange={setEditorState}
                            />
                            <div className="mt-4 flex gap-2">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="cstm_btn"
                                >
                                    {editingId ? 'Update' : 'Save template'}
                                </button>
                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="px-4 py-2 bg-gray-200 rounded"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    <div className="py-8 px-4">
                        <div className="relative border border-gray-200 rounded px-4 py-6 min-h-[200px]">
                            {loading && <Loader absolute />}
                            <h4 className="font-bold mb-3">
                                Saved templates ({list.length})
                            </h4>
                            {list.length === 0 && !loading ? (
                                <p className="text-sm text-gray-500 italic">
                                    No saved templates yet.
                                </p>
                            ) : (
                                <ul className="flex flex-col gap-2">
                                    {list.map((item) => (
                                        <li
                                            key={item.id}
                                            className="border border-gray-100 rounded p-3 bg-gray-50"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    {item.label && (
                                                        <div className="font-semibold text-sm text-gray-800 truncate">
                                                            {item.label}
                                                        </div>
                                                    )}
                                                    <div className="text-xs text-gray-600 whitespace-pre-wrap break-words">
                                                        {item.plain_text}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-1 flex-shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => startEditing(item)}
                                                        className="cstm_btn_small"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => remove(item.id)}
                                                        className="cstm_btn_small !bg-red-500 hover:!bg-red-700"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default OrderComments
