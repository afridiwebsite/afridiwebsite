import React, { useRef, useState } from 'react'
import { useHistory } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';
import useUpload from '../../hooks/useUpload';
import { getErrors, toastDefault } from '../../utils/handler.utils';
import Loader from '../Loader/Loader';
import { Editor } from "react-draft-wysiwyg";
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import { EditorState } from 'draft-js';
import { convertToHTML } from 'draft-convert';

function AddPhysicalProduct() {
    const name = useRef(null);
    const image = useRef(null);
    const sale_price = useRef(null);
    const regular_price = useRef(null);
    const is_active_product = useRef(null);
    const quantity = useRef(null);

    const [editorState, setEditorState] = useState(EditorState.createEmpty())
    const [productLogo, setProductLogo] = useState(null)
    const { path, uploading } = useUpload(productLogo)


    const [loading, setLoading] = useState(null)
    const history = useHistory()

    const createProductHandler = (e) => {
        e.preventDefault()

        if (!uploading) {
            setLoading(true)
            axiosInstance.post('/admin/physical-product/create', {
                name: name.current.value,
                image: path,
                sale_price: sale_price.current.value,
                regular_price: regular_price.current.value,
                quantity: quantity.current.value,
                is_active: is_active_product.current.checked ? 1 : 0,
                description: convertToHTML(editorState.getCurrentContent())

            }).then(res => {
                toast.success('Product created successfully', toastDefault)

                setTimeout(() => {
                    history.push('/physical-product')
                }, 1500);
            }).catch(err => {
                toast.error(getErrors(err, false, true), toastDefault)
                setLoading(false)
            })
        }
    }

    return (
        <section className="relative container_admin" >
            <div className="bg-white overflow-hidden rounded">
                <div className="px-6 py-3 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-black">
                        Create new product
                    </h3>
                </div>
                <div className="py-10 px-4" >
                    <div className="w-full md:w-[70%] mx-auto py-6 relative border border-gray-200 px-4">
                        {loading && <Loader absolute />}
                        <form onSubmit={createProductHandler} >
                            <div>
                                <div className="form_grid">
                                    <div>
                                        <label htmlFor="name">Name</label>
                                        <input ref={name} id="name" className="form_input" type="text" placeholder="Name" required />
                                    </div>
                                    <div>
                                        <label htmlFor="image">Image</label>
                                        <input ref={image} id="image" className="form_input" type="file" required onChange={e => setProductLogo(e.target.files[0])} />
                                    </div>
                                </div>

                                <div className="form_grid">
                                    <div>
                                        <label htmlFor="sale_price">Sale Price</label>
                                        <input ref={sale_price} id="sale_price" className="form_input" type="number" placeholder="Sale Price" required />
                                    </div>
                                    <div>
                                        <label htmlFor="regular_price">Regular Price</label>
                                        <input ref={regular_price} id="regular_price" className="form_input" type="number" placeholder="Regular Price" required />
                                    </div>
                                </div>
                                <div className="form_grid">
                                    <div>
                                        <label htmlFor="quantity">Quantity</label>
                                        <input ref={quantity} id="quantity" className="form_input" type="number" placeholder="Quantity " required />
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
                                />;

                                <div className="my-2" >
                                    <label className="py-2 inline-block cursor-pointer select-none" >
                                        <input type="checkbox" defaultChecked ref={is_active_product} className="mr-2" />
                                        Is active
                                    </label>
                                </div>

                                <div>
                                    <button type="submit" disabled={uploading} className="cstm_btn w-full block">Create Product</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default AddPhysicalProduct
