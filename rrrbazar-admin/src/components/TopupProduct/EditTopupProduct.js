import { convertFromHTML, convertToHTML } from 'draft-convert';
import { EditorState } from 'draft-js';
import { Editor } from 'react-draft-wysiwyg';
import { useEffect, useRef, useState } from 'react'
import { useHistory, withRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';
import useGet from '../../hooks/useGet';
import useUpload from '../../hooks/useUpload';
import { getErrors, hasData, toastDefault } from '../../utils/handler.utils';
import Loader from '../Loader/Loader';
function EditTopupProduct(props) {
    const history = useHistory()
    const productId = props.match.params.id;

    const [loading, setLoading] = useState(null)
    const [data, loadingData, error] = useGet(`admin/topup-product/${productId}`)
    const [productLogo, setProductLogo] = useState(data?.logo)
    const { path, uploading } = useUpload(productLogo)

    const [editorState, setEditorState] = useState(EditorState.createEmpty())
    useEffect(() => {
        if (hasData(data?.rules)) {
            setEditorState(
                EditorState.createWithContent(convertFromHTML(data?.rules))
            )
        }
    }, [data])

    const name = useRef(null);
    const logo = useRef(null);
    const price = useRef(null);
    const serial = useRef(null);
    const isactivefortopup = useRef(null);
    const is_active_product = useRef(null);
    const is_offer_product = useRef(null);
    const offer_items = useRef(null);

    const [categories] = useGet('admin/categories')
    const [selectedCategoryIds, setSelectedCategoryIds] = useState([])

    useEffect(() => {
        if (data && data.categories) {
            setSelectedCategoryIds(data.categories.map((c) => c.id))
        }
    }, [data])

    const toggleCategory = (id) => {
        setSelectedCategoryIds((prev) =>
            prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
        )
    }

    const editProductHandler = (e) => {
        e.preventDefault()
        setLoading(true)
        axiosInstance.post(`/admin/topup-product/update/${productId}`, {
            name: name.current.value,
            logo: path || data?.logo,
            price: price.current.value,
            serial: serial.current.value,
            rules: convertToHTML(editorState.getCurrentContent()),
            isactivefortopup: isactivefortopup.current.checked ? 1 : 0,
            is_active: is_active_product.current.checked ? 1 : 0,
            is_offer: 0,
            offer_items: offer_items.current.value || 0
        }).then(async () => {
            try {
                await axiosInstance.post(`/admin/topup-product/${productId}/categories`, {
                    category_ids: selectedCategoryIds,
                })
            } catch (e) { /* ignore */ }
            toast.success('Product updated successfully', toastDefault)

            setTimeout(() => {
                history.push('/topup-product')
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
                        Edit product {`{ ${data?.name} }`}
                    </h3>
                </div>
                <div className="py-10 px-4" >
                    <div className="w-full md:w-[70%] mx-auto py-6 relative border border-gray-200 px-4">
                        {loadingData && <Loader absolute />}
                        {loading && <Loader absolute />}
                        <form onSubmit={editProductHandler} className="min-h-[250px]">
                            {
                                hasData(data, loading, error) && (
                                    <div>
                                        <div className="form_grid">
                                            <div>
                                                <label htmlFor="name">Name</label>
                                                <input ref={name} id="name" defaultValue={data?.name} className="form_input" type="text" placeholder="Name" required />
                                            </div>
                                            <div>
                                                <label htmlFor="price">Price</label>
                                                <input ref={price} defaultValue={data?.price} id="price" className="form_input" type="number" placeholder="Price" required />
                                            </div>
                                        </div>
                                        <div className="form_grid">
                                            <div>
                                                <label htmlFor="logo">Logo</label>
                                                <input ref={logo} id="logo" className="form_input" type="file" onChange={e => setProductLogo(e.target.files[0])} />
                                            </div>
                                            <div>
                                                <label htmlFor="serial">Serial</label>
                                                <input ref={serial} defaultValue={data?.serial} id="serial" className="form_input" type="number" placeholder="serial" required />
                                            </div>
                                        </div>

                                        <div className="my-3">
                                            <label className="block mb-2 font-semibold">Categories</label>
                                            <div className="flex flex-wrap gap-2">
                                                {(categories || []).map((c) => (
                                                    <label key={c.id} className={`px-3 py-1 border rounded cursor-pointer select-none ${selectedCategoryIds.includes(c.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}>
                                                        <input type="checkbox" className="hidden" checked={selectedCategoryIds.includes(c.id)} onChange={() => toggleCategory(c.id)} />
                                                        <span className="mr-1">{c.emoji}</span>{c.name}
                                                    </label>
                                                ))}
                                                {(!categories || categories.length === 0) && (
                                                    <span className="text-sm text-gray-500">No categories yet</span>
                                                )}
                                            </div>
                                        </div>

                                        <Editor
                                            editorState={editorState}
                                            editorStyle={{
                                                height: 300,
                                            }}
                                            wrapperStyle={{
                                                border: '1px solid #dcdcf3',
                                                borderRadius: 6
                                            }}
                                            onEditorStateChange={(e) => setEditorState(e)}
                                        />

                                        <div className="my-2" >
                                            <label className="py-2 inline-block cursor-pointer select-none" >
                                                <input type="checkbox" defaultChecked={data?.isactivefortopup == 1} ref={isactivefortopup} className="mr-2" />
                                                Is active for Id Code
                                            </label>
                                        </div>
                                        <div className="my-2" >
                                            <label className="py-2 inline-block cursor-pointer select-none" >
                                                <input type="checkbox" defaultChecked={data?.is_active == 1} ref={is_active_product} className="mr-2" />
                                                Is active product
                                            </label>
                                        </div>

                                       

                                        <div>
                                            <button disabled={uploading} type="submit" className="cstm_btn w-full block">Edit Product</button>
                                        </div>
                                    </div>
                                )
                            }
                        </form>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default withRouter(EditTopupProduct)
