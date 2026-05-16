import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useHistory, withRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';
import useGet from '../../hooks/useGet';
import { getErrors, hasData, toastDefault } from '../../utils/handler.utils';
import Loader from '../Loader/Loader';

function EditUpin(props) {
    const history = useHistory()
    const id = props.match.params.id;

    const [loading, setLoading] = useState(null)
    const [data, loadingData, error] = useGet(`admin/unipin/${id}`)
    const [packages, loadingPackages] = useGet('admin/topup-packages')
    const [products, loadingProducts] = useGet('admin/topup-products')

    const code = useRef(null);
    const status = useRef(null);

    const [selectedProductId, setSelectedProductId] = useState('')
    const [selectedPackageId, setSelectedPackageId] = useState('')

    // Seed both selects once data + packages have loaded. The product id is
    // not stored on the voucher row directly — derive it by looking up the
    // package the voucher is linked to.
    useEffect(() => {
        if (!data?.package_id || !Array.isArray(packages) || packages.length === 0) return;
        const pkg = packages.find((p) => String(p.id) === String(data.package_id));
        if (pkg) {
            setSelectedProductId(String(pkg.product_id || ''));
            setSelectedPackageId(String(pkg.id));
        }
    }, [data?.package_id, packages])

    const productOptions = useMemo(() => {
        const list = Array.isArray(products) ? [...products] : [];
        return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [products])

    const packagesForProduct = useMemo(() => {
        if (!selectedProductId) return [];
        const list = Array.isArray(packages) ? packages : [];
        return list
            .filter((p) => String(p.product_id) === String(selectedProductId))
            .sort((a, b) => (a.serial || 0) - (b.serial || 0));
    }, [packages, selectedProductId])

    const handleProductChange = (e) => {
        setSelectedProductId(e.target.value);
        setSelectedPackageId('');
    }

    const editUpinHandler = (e) => {
        e.preventDefault()
        if (!selectedPackageId) {
            toast.error('Pick a package', toastDefault)
            return
        }
        setLoading(true)
        axiosInstance.post(`/admin/unipin/update/${id}`, {
            code: code.current.value,
            status: status.current.value,
            package_id: selectedPackageId,
        }).then(res => {
            toast.success('Voucher updated successfully', toastDefault)

            setTimeout(() => {
                history.push('/upins')
            }, 1500);
        }).catch(err => {
            toast.error(getErrors(err, false, true), toastDefault)
            setLoading(false)
        })
    }

    const showLoader = loadingData || loading || loadingPackages || loadingProducts;

    return (
        <section className="relative container_admin" >
            <div className="bg-white overflow-hidden rounded">
                <div className="px-6 py-3 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-black">
                        Edit Voucher
                    </h3>
                </div>
                <div className="py-10 px-4" >
                    <div className="w-full md:w-[70%] min-h-[300px] mx-auto py-6 relative border border-gray-200 px-4">
                        {showLoader && <Loader absolute />}
                        {
                            hasData(data, loading, error) && (
                                <form onSubmit={editUpinHandler} >
                                    <div>

                                        <div className="form_grid">
                                            <div>
                                                <label htmlFor="code">Voucher Code</label>
                                                <input ref={code} id="code" defaultValue={data?.code} className="form_input" type="text" placeholder="Voucher Code" required />
                                            </div>
                                            <div>
                                                <label htmlFor="status">Status</label>
                                                <select defaultValue={data?.status} ref={status} id="status" className="form_input">
                                                    <option value="0">Select Status</option>
                                                    <option value="1">Active</option>
                                                    <option value="2">Used</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="form_grid">
                                            <div>
                                                <label htmlFor="product_id">Product</label>
                                                <select
                                                    id="product_id"
                                                    className="form_input"
                                                    required
                                                    value={selectedProductId}
                                                    onChange={handleProductChange}
                                                >
                                                    <option value="" disabled>
                                                        -- Select a product --
                                                    </option>
                                                    {productOptions.map((p) => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label htmlFor="package_id">Package</label>
                                                <select
                                                    id="package_id"
                                                    className="form_input"
                                                    required
                                                    value={selectedPackageId}
                                                    onChange={(e) => setSelectedPackageId(e.target.value)}
                                                    disabled={!selectedProductId}
                                                >
                                                    <option value="" disabled>
                                                        {selectedProductId
                                                            ? '-- Select a package --'
                                                            : 'Select a product first'}
                                                    </option>
                                                    {packagesForProduct.map((pkg) => (
                                                        <option key={pkg.id} value={pkg.id}>
                                                            {pkg.name}
                                                            {pkg.uc ? ` (${pkg.uc} UC)` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                                {selectedProductId &&
                                                    packagesForProduct.length === 0 && (
                                                        <p className="text-xs text-amber-700 mt-1">
                                                            This product has no packages yet.
                                                        </p>
                                                    )}
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <button type="submit" disabled={showLoader} className="cstm_btn w-full block">Updated Voucher</button>
                                        </div>
                                    </div>
                                </form>
                            )
                        }
                    </div>
                </div>
            </div>
        </section>
    )
}

export default withRouter(EditUpin)
