import React, { useRef, useState } from 'react'
import PackagesAccordion from '../PackagesAccordion'
import UiHandler from '../UiHandler'
import ReactTable from '../ReactTables/ReactTable'
import useGet from '../../hooks/useGet'
import { getErrors, hasData, toastDefault } from '../../utils/handler.utils'
import { packageTableColumns } from '../../utils/reactTableColumns'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import axiosInstance from '../../common/axios'

function Packages() {
    const [groupedData, loading, error] = useGet(`admin/topup-packages-grouped`)

    return (
        <section className="relative container_admin" >
            <div className="bg-white overflow-hidden rounded">
                <div className="px-6 py-3 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-black">
                        Packages
                    </h3>
                </div>
                <div className="md:px-6 my-10 md:max-w-[1000px] min-h-[200px] md:mx-auto" >
                    <div className="rounded relative overflow-hidden">
                        <div>
                            <UiHandler data={groupedData} loading={loading} error={error} />
                            {
                                hasData(groupedData, loading) && (
                                    <>
                                        {groupedData?.map((category, i) => (
                                            <PackagesAccordion title={category?.name || 'Uncategorized'} key={i}>
                                                <div className="space-y-4">
                                                    {category.products?.map((product, j) => (
                                                        <PackagesAccordion 
                                                            title={product?.name} 
                                                            key={j}
                                                            className="ml-4 border-l-2 border-gray-100"
                                                        >
                                                            <PackagesUnderProduct product={product} />
                                                        </PackagesAccordion>
                                                    ))}
                                                </div>
                                            </PackagesAccordion>
                                        ))}
                                    </>
                                )
                            }
                        </div>

                    </div>
                </div>
            </div>
        </section>
    )
}

export default Packages


const PackagesUnderProduct = ({ product }) => {
    const [uniqueState, setUniqueState] = useState(false)
    const [packages, loading, error] = useGet(`admin/topup-packages/${product.id}`, '', uniqueState)

    const update_dollar_ref = useRef(null)

    const updateDollarHandler = (e) => {
        e.preventDefault()

        const dollar_rate = update_dollar_ref.current?.value?.trim()

        if (!dollar_rate) return;

        toast.promise(
            axiosInstance.post(`/admin/topup-package/update-dollar`, {
                product_id: product.id,
                dollar_rate,
            }),
            {
                pending: 'Updating dollar rate...',
                error: {
                    render(err) {
                        console.log(err);
                        return getErrors(err.data, false, true)
                    }
                },
                success: {
                    render() {
                        setUniqueState(prev => !prev);
                        return 'Dollar rate updated successfully'
                    }
                }
            },
            toastDefault
        )

        update_dollar_ref.current.value = ''
    }

    const deletePackageHandler = (id) => {
        if (window.confirm('Are you sure')) {
            toast.promise(
                axiosInstance.post(`/admin/topup-package/delete/${id}`),
                {
                    pending: 'Deleting package...',
                    error: {
                        render(err) {
                            console.log(err);
                            return getErrors(err.data, false, true)
                        }
                    },
                    success: {
                        render() {
                            setUniqueState(prev => !prev);
                            return 'Package deleted successfully'
                        }
                    }
                },
                toastDefault
            )
        }
    }


    const withActionButton = [
        ...packageTableColumns,
        {
            id: 'edit',
            Header: "Action",
            accessor: 'id',
            Cell: (e) => {
                return <ul className="flex space-x-2">
                    <Link to={`/topup-package/edit/${e.value}`} className="cstm_btn_small">
                        Edit
                    </Link>
                    <li className="cstm_btn_small btn_red" onClick={() => deletePackageHandler(e.value)}>
                        Delete
                    </li>
                </ul>
            }
        },
    ]

    return (
        <>
            <UiHandler data={packages} loading={loading} error={error} />
            <div className="absolute top-4 left-4 flex items-center space-x-4" >
                {
                    hasData(packages) && (
                        <div>
                            <form className="flex items-center space-x-2" onSubmit={updateDollarHandler}>
                                <input type="text" className="form_input mb-0 text-xs w-[150px]" ref={update_dollar_ref} placeholder="Update rate" />
                                <button type="submit" className="cstm_btn_small text-xs">Update rate</button>
                            </form>
                        </div>

                    )
                }
                <Link to={`/topup-package/add/${product.id}`} className="cstm_btn_small text-xs" >Add new package</Link>
            </div>
            {hasData(packages) && (
                <div className="mt-4">
                    <ReactTable tableId={`package_${product.id}_table`} data={packages} columns={withActionButton} />
                </div>
            )}
        </>
    )
}
