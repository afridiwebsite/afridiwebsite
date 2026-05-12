import React, { useState } from 'react'
import ReactTable from '../ReactTables/ReactTable';
import { productTableColumns } from '../../utils/reactTableColumns';
import { getErrors, hasData, toastDefault } from '../../utils/handler.utils';
import { Link } from 'react-router-dom';
import useGet from '../../hooks/useGet';
import UiHandler from '../UiHandler';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';

function TopupProduct() {
    const [uniqueState, setUniqueState] = useState(false)

    const [productData, loading, error] = useGet(`admin/topup-products`, '', uniqueState)

    const deleteProductHangdler = (id) => {
        if (window.confirm('Are you sure')) {
            toast.promise(
                axiosInstance.post(`admin/topup-product/delete/${id}`),
                {
                    pending: 'Deleting Product...',
                    error: {
                        render(err) {
                            console.log(err);
                            return getErrors(err.data, false, true)
                        }
                    },
                    success: {
                        render() {
                            setUniqueState(prev => !prev);
                            return 'Product deleted successfully'
                        }
                    }
                },
                toastDefault
            )
        }
    }

    let editButton = {
        id: 'action',
        Header: "Action",
        accessor: 'id',
        Cell: (e) => {
            return <ul className="flex space-x-2">
                <Link to={`/topup-product/edit/${e.value}`} className="cstm_btn_small">
                    Edit
                </Link>
                <button className="cstm_btn_small !bg-red-600 hover:!bg-red-700" type="button" onClick={() => deleteProductHangdler(e.value)}>
                    Delete
                </button>
                <Link to={`/topup-package/add/${e.value}`} className="cstm_btn_small">
                    Add package
                </Link>

            </ul>
        }
    };

    let withEditButton = [...productTableColumns, editButton]


    return (
        <section className="relative container_admin" >
            <div className="bg-white overflow-hidden rounded">
                <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between flex-wrap">
                    <h3 className="text-lg font-bold text-black">
                        Product
                    </h3>
                    <Link className="cstm_btn" to="/topup-product/add">
                        Add new
                    </Link>
                </div>
                <div>
                    <div className="relative min-h-[100px]">
                        <UiHandler data={productData} loading={loading} error={error} />
                        {hasData(productData, error) && (
                            <ReactTable tableId="product_methods_table" columns={withEditButton} data={productData} />
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}

export default TopupProduct
