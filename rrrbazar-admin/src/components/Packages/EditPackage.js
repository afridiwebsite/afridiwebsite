import React, { useEffect, useRef, useState } from 'react'
import { useHistory, withRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Editor } from 'react-draft-wysiwyg';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import { EditorState } from 'draft-js';
import { convertToHTML, convertFromHTML } from 'draft-convert';
import axiosInstance from '../../common/axios';
import useUpload from '../../hooks/useUpload';
import useGet from '../../hooks/useGet';
import { getErrors, hasData, toastDefault } from '../../utils/handler.utils';
import { draftToHTMLConfig, draftFromHTMLConfig } from '../../utils/draftEditor.utils';
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
    const order_once = useRef(null);
    const bot_url = useRef(null);

    const [editorState, setEditorState] = useState(EditorState.createEmpty());

    // Seed the editor once the package loads. Skips reseeding on later
    // updates so the admin's in-progress edits aren't clobbered.
    useEffect(() => {
        if (data?.description) {
            setEditorState(
                EditorState.createWithContent(convertFromHTML(draftFromHTMLConfig)(data.description))
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data?.id]);

    const uploadImageCallback = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve({ data: { link: reader.result } });
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

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
            in_stock: in_stock.current.checked ? 1 : 0,
            order_once: order_once.current?.checked ? 1 : 0,
            bot_url: bot_url.current?.value || '',
            description: convertToHTML(draftToHTMLConfig)(editorState.getCurrentContent()),
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

                                    <div className="form_grid">
                                        <div>
                                            <label className="inline-flex items-center cursor-pointer select-none">
                                                <input
                                                    ref={order_once}
                                                    id="order_once"
                                                    value="1"
                                                    className="form-checkbox"
                                                    type="checkbox"
                                                    defaultChecked={data?.order_once == 1}
                                                />
                                                <span className="ml-2">Order once per user</span>
                                            </label>
                                            <p className="text-xs text-gray-500 mt-1">
                                                When on, each user can only order this package once.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="form_grid">
                                        <div>
                                            <label htmlFor="bot_url">Auto-bot URL</label>
                                            <input
                                                ref={bot_url}
                                                id="bot_url"
                                                type="url"
                                                defaultValue={data?.bot_url || ''}
                                                className="form_input"
                                                placeholder="https://bot.example.com/dispatch"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Optional. When set, completed orders for this package are POSTed to this URL for automated fulfillment. Leave empty to keep the order pending for manual processing.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="my-4">
                                        <label className="block mb-2 font-semibold">
                                            Description{' '}
                                            <span className="text-xs font-normal text-gray-500">
                                                (shown as a tooltip when users hover the package card — inline images supported)
                                            </span>
                                        </label>
                                        <Editor
                                            editorState={editorState}
                                            editorStyle={{ height: 220 }}
                                            wrapperStyle={{
                                                border: '1px solid #dcdcf3',
                                                borderRadius: 6,
                                            }}
                                            onEditorStateChange={setEditorState}
                                            toolbar={{
                                                image: {
                                                    uploadCallback: uploadImageCallback,
                                                    alt: { present: true, mandatory: false },
                                                    previewImage: true,
                                                    inputAccept: 'image/jpeg,image/jpg,image/png,image/gif,image/webp',
                                                },
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <button type="submit" disabled={uploading} className="cstm_btn w-full block">Edit package</button>
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
