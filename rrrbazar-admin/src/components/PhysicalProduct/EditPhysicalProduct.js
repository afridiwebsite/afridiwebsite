import React, { useEffect, useRef, useState } from 'react';
import { useHistory, withRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';
import useGet from '../../hooks/useGet';
import useUpload from '../../hooks/useUpload';
import { getErrors, hasData, toastDefault } from '../../utils/handler.utils';
import TextEditor from '../TextEditor/TextEditor';
import Loader from '../Loader/Loader';
function EditPhysicalProduct(props) {
    const history = useHistory()
    const productId = props.match.params.id;

    const [loading, setLoading] = useState(null)
    const [descriptionHtml, setDescriptionHtml] = useState('')
    const [data, loadingData, error] = useGet(`admin/physical-product/${productId}`)
    const [productLogo, setProductLogo] = useState(data?.image)
    const { path, uploading } = useUpload(productLogo)

    useEffect(() => {
        if (data?.description != null) setDescriptionHtml(data.description || '')
    }, [data])

    const name = useRef(null);
    const image = useRef(null);
    const sale_price = useRef(null);
    const regular_price = useRef(null);
    const is_active_product = useRef(null);
    const quantity = useRef(null);

    const editProductHandler = (e) => {
        e.preventDefault()
        setLoading(true)
        axiosInstance.post(`/admin/physical-product/update/${productId}`, {
            name: name.current.value,
            image: path || data?.image,
            sale_price: sale_price.current.value,
            regular_price: regular_price.current.value,
            quantity: quantity.current.value,
            is_active: is_active_product.current.checked ? 1 : 0,
            description: descriptionHtml
        }).then(res => {
            toast.success('Product updated successfully', toastDefault)

            setTimeout(() => {
                history.push('/physical-product')
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
                                                <label htmlFor="image">Image</label>
                                                <input ref={image} id="image" className="form_input" type="file" onChange={e => setProductLogo(e.target.files[0])} />
                                            </div>
                                        </div>
                                        <div className="form_grid">
                                            <div>
                                                <label htmlFor="sale_price">Sale Price</label>
                                                <input ref={sale_price} defaultValue={data?.sale_price} id="sale_price" className="form_input" type="number" placeholder="Price" required />
                                            </div>
                                            <div>
                                                <label htmlFor="regular_price">Regular Price</label>
                                                <input ref={regular_price} defaultValue={data?.regular_price} id="regular_price" className="form_input" type="number" placeholder="Price" required />
                                            </div>
                                        </div>
                                        <div className="form_grid">
                                            <div>
                                                <label htmlFor="quantity">Quantity</label>
                                                <input ref={quantity} defaultValue={data?.quantity} id="quantity" className="form_input" type="number" placeholder="Quantity " required />
                                            </div>
                                        </div>

                                        <TextEditor
                                            value={descriptionHtml}
                                            onHtmlChange={setDescriptionHtml}
                                            minHeight={300}
                                        />

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

export default withRouter(EditPhysicalProduct)
