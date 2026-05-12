import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';
import useGet from '../../hooks/useGet';
import { getErrors, hasData, toastDefault } from '../../utils/handler.utils';
import { physicalProductTableColumns } from '../../utils/reactTableColumns';
import ReactTable from '../ReactTables/ReactTable';
import UiHandler from '../UiHandler';

function PhysicalProduct() {
    const [uniqueState, setUniqueState] = useState(false)

    const [productData, loading, error] = useGet(`admin/physical-products`, '', uniqueState)

    const deleteProductHangdler = (id) => {
        if (window.confirm('Are you sure')) {
            toast.promise(
                axiosInstance.post(`admin/physical-product/delete/${id}`),
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
                <Link to={`/physical-product/edit/${e.value}`} className="cstm_btn_small">
                    Edit
                </Link>
                <button className="cstm_btn_small !bg-red-600 hover:!bg-red-700" type="button" onClick={() => deleteProductHangdler(e.value)}>
                    Delete
                </button>
            </ul>
        }
    };

    let withEditButton = [...physicalProductTableColumns, editButton]


    return (
        <section className="relative container_admin" >
            <div className="bg-white overflow-hidden rounded">
                <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between flex-wrap">
                    <h3 className="text-lg font-bold text-black">
                        Product
                    </h3>
                    <Link className="cstm_btn" to="/physical-product/add">
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

export default PhysicalProduct
