import React, { useRef, useState } from 'react'
import { useHistory, withRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';
import useUpload from '../../hooks/useUpload';
import useGet from '../../hooks/useGet';
import { getErrors, hasData, toastDefault } from '../../utils/handler.utils';
import Loader from '../Loader/Loader';

function AddPackage(props) {
    const history = useHistory()
    const productId = props.match.params.id;

    const [paymentLogo, setPaymentLogo] = useState(null)
    const { path, uploading } = useUpload(paymentLogo)

    const [loading, setLoading] = useState(null)
    const [products, loadingProducts] = useGet(`admin/topup-products`)

    const product_id = useRef(null);
    const name = useRef(null);
    const sell_price = useRef(null);
    const buy_price = useRef(null);
    const in_stock = useRef(null);
    const serial = useRef(null);
    const logo = useRef(null);
    const coin_value = useRef(null);

    const addPackageHandler = (e) => {
        e.preventDefault()
        setLoading(true)
        axiosInstance.post(`/admin/topup-package/add`, {
            product_id: product_id.current.value,
            name: name.current.value,
            price: sell_price.current.value,
            bprice: buy_price.current.value,
            serial: serial.current.value,
            logo: path,
            coin_value: coin_value.current.value || 0,
            in_stock: in_stock.current.checked ? 1 : 0
        }).then(res => {
            toast.success('Topup package created successfully', toastDefault)

            setTimeout(() => {
                history.push('/topup-packages')
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
                        Add package
                    </h3>
                </div>
                <div className="py-10 px-4" >
                    <div className="w-full md:w-[70%] min-h-[250px] mx-auto py-6 relative border border-gray-200 px-4">
                        {loading || loadingProducts ? <Loader absolute /> : ''}
                        {hasData(products) &&
                            <form onSubmit={addPackageHandler} >
                                <div>
                                    <div className="form_grid">
                                        <div>
                                            <label htmlFor="name">Product</label>
                                            <select defaultValue={productId} ref={product_id} className="form_input">
                                                {
                                                    products?.map(product => (
                                                        <option value={product.id}>{product.name}</option>
                                                    ))
                                                }
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="name">Name</label>
                                            <input ref={name} id="name" className="form_input" type="text" placeholder="Name" required />
                                        </div>
                                    </div>
                                    <div className="form_grid">
                                        <div>
                                            <label htmlFor="sell_price">Sell price</label>
                                            <input ref={sell_price} id="sell_price" className="form_input" type="number" placeholder="Sell price" required />
                                        </div>
                                        <div>
                                            <label htmlFor="buy_price">Buy price</label>
                                            <input ref={buy_price} id="buy_price" className="form_input" type="number" placeholder="Buy price" required />
                                        </div>
                                    </div>

                                    <div className="form_grid">
                                        <div>
                                            <label htmlFor="serial">Serial</label>
                                            <input ref={serial} id="serial" className="form_input" type="number" placeholder="Package Serial" required />
                                        </div>
                                        <div>
                                            <label htmlFor="logo">Logo</label>
                                            <input ref={logo} id="logo" className="form_input" type="file" required onChange={e => setPaymentLogo(e.target.files[0])} />
                                        </div>
                                    </div>

                                    <div className="form_grid">
                                        <div>
                                            <label htmlFor="coin_value">Coin reward per purchase</label>
                                            <input ref={coin_value} id="coin_value" className="form_input" type="number" min="0" defaultValue={0} placeholder="0" />
                                        </div>
                                        <div>
                                            <label class="inline-flex items-center mt-6">
                                                <input ref={in_stock} id="in_stock" value="1" className="form-checkbox" type="checkbox" />
                                                <span class="ml-2">In Stock</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div>
                                        <button type="submit" className="cstm_btn w-full block">Add package</button>
                                    </div>
                                </div>
                            </form>
                        }
                    </div>
                </div>
            </div>
        </section>
    )
}

export default withRouter(AddPackage)
