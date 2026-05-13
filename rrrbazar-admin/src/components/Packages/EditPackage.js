import React, { useRef, useState } from 'react'
import { useHistory, withRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';
import useUpload from '../../hooks/useUpload';
import useGet from '../../hooks/useGet';
import { getErrors, hasData, toastDefault } from '../../utils/handler.utils';
import Loader from '../Loader/Loader';

function EditPackage(props) {
    const history = useHistory()
    const packageId = props.match.params.id;

    const [paymentLogo, setPaymentLogo] = useState(null)
    const { path, uploading } = useUpload(paymentLogo)

    const [loading, setLoading] = useState(null)
    const [data, loadingData] = useGet(`admin/topup-package/${packageId}`)
    const [products, loadingProducts] = useGet(`admin/topup-products`)

    const product_id = useRef(null);
    const name = useRef(null);
    const sell_price = useRef(null);
    const buy_price = useRef(null);
    const in_stock = useRef(null);
    const serial = useRef(null);
    const logo = useRef(null);
    const coin_value = useRef(null);

    const editPackageHandler = (e) => {
        e.preventDefault()
        setLoading(true)
        axiosInstance.post(`/admin/topup-package/update/${packageId}`, {
            product_id: product_id.current.value,
            name: name.current.value,
            price: sell_price.current.value,
            bprice: buy_price.current.value,
            serial: serial.current.value,
            logo: path || data?.logo,
            coin_value: coin_value.current.value || 0,
            in_stock: in_stock.current.checked ? 1 : 0

        }).then(res => {
            toast.success('Topup package updated successfully', toastDefault)

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
                        Edit topup package -- {data?.name}
                    </h3>
                </div>
                <div className="py-10 px-4" >
                    <div className="w-full md:w-[70%] min-h-[250px] mx-auto py-6 relative border border-gray-200 px-4">
                        {loadingData || loading || loadingProducts ? <Loader absolute /> : ''}
                        {hasData(data) && hasData(products) &&
                            <form onSubmit={editPackageHandler} >
                                <div>
                                    <div className="form_grid">
                                        <div>
                                            <label htmlFor="name">Product</label>
                                            <select defaultValue={data?.product_id} ref={product_id} className="form_input">
                                                {
                                                    products?.map(product => (
                                                        <option value={product.id}>{product.name}</option>
                                                    ))
                                                }
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="name">Name</label>
                                            <input ref={name} id="name" defaultValue={data?.name} className="form_input" type="text" placeholder="Name" required />
                                        </div>
                                    </div>
                                    <div className="form_grid">
                                        <div>
                                            <label htmlFor="sell_price">Sell price</label>
                                            <input ref={sell_price} step="any" id="sell_price" defaultValue={data?.price} className="form_input" type="number" placeholder="Sell price" required />
                                        </div>
                                        <div>
                                            <label htmlFor="buy_price">Buy price</label>
                                            <input ref={buy_price} id="buy_price" defaultValue={data?.bprice} className="form_input" type="number" placeholder="Buy price" required />
                                        </div>
                                    </div>

                                    <div className="form_grid">
                                        <div>
                                            <label htmlFor="serial">Serial</label>
                                            <input ref={serial} id="serial" defaultValue={data?.serial} className="form_input" type="number" placeholder="Package Serial" required />
                                        </div>
                                        <div>
                                            <label htmlFor="logo">Logo</label>
                                            <input ref={logo} id="logo" className="form_input" type="file" onChange={e => setPaymentLogo(e.target.files[0])} />
                                        </div>
                                    </div>

                                    <div className="form_grid">
                                        <div>
                                            <label htmlFor="coin_value">Coin reward per purchase</label>
                                            <input ref={coin_value} defaultValue={data?.coin_value || 0} id="coin_value" className="form_input" type="number" min="0" placeholder="0" />
                                        </div>
                                        <div>
                                            <label class="inline-flex items-center mt-6">
                                                <input ref={in_stock} id="in_stock" value="1" className="form-checkbox" type="checkbox" defaultChecked={data?.in_stock == 1 ? true: false} />
                                                <span class="ml-2">In Stock</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div>
                                        <button type="submit" className="cstm_btn w-full block">Edit package</button>
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

export default withRouter(EditPackage)
