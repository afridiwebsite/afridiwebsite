import React, { useMemo, useRef, useState } from 'react'
import { useHistory } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';
import useGet from '../../hooks/useGet';
import { getErrors, toastDefault } from '../../utils/handler.utils';
import Loader from '../Loader/Loader';

function AddUpin() {
    const code = useRef(null);
    const status = useRef(null);
    const [loading, setLoading] = useState(null)
    const history = useHistory()

    // Two cascading selects: product first, then the package belonging to it.
    const [packages, loadingPackages] = useGet('admin/topup-packages')
    const [products, loadingProducts] = useGet('admin/topup-products')

    const [selectedProductId, setSelectedProductId] = useState('')
    const [selectedPackageId, setSelectedPackageId] = useState('')

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
        // Clear package whenever the product changes so we can't end up with
        // a package that doesn't belong to the selected product.
        setSelectedPackageId('');
    }

    const createUpinHandler = (e) => {
        e.preventDefault()
        if (!selectedPackageId) {
            toast.error('Pick a package', toastDefault)
            return
        }
        setLoading(true)
        axiosInstance.post('/admin/unipin/create', {
            code: code.current.value,
            status: status.current.value,
            package_id: selectedPackageId,
        }).then(res => {
            toast.success('UniPin created successfully', toastDefault)
            setTimeout(() => {
                history.push('/upins')
            }, 1500);
        }).catch(err => {
            toast.error(getErrors(err, false, true), toastDefault)
        }).finally(() => setLoading(false))
    }

    const showLoader = loading || loadingPackages || loadingProducts;

    return (
        <section className="relative container_admin" >
            <div className="bg-white overflow-hidden rounded">
                <div className="px-6 py-3 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-black">
                        Create New Voucher
                    </h3>
                </div>
                <div className="py-10 px-4" >
                    <div className="w-full md:w-[70%] mx-auto py-6 relative border border-gray-200 px-4">
                        {showLoader && <Loader absolute />}
                        <form onSubmit={createUpinHandler} >
                            <div>
                                <div className="form_grid">
                                    <div>
                                        <label htmlFor="code">Voucher Code</label>
                                        <textarea ref={code} id="code" className="form_input" type="text" placeholder="One code per line for bulk upload"></textarea>
                                    </div>
                                    <div>
                                        <label htmlFor="status">Status</label>
                                        <select ref={status} id="status" className="form_input">
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
                                <div>
                                    <button type="submit" disabled={showLoader} className="cstm_btn w-full block">Create Voucher</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default AddUpin
