import React, { useEffect, useState } from 'react'
import ReactTable from '../ReactTables/ReactTable';
import Pagination from '../ReactTables/Pagination';
import ListPerPage from '../ReactTables/ListPerPage';
import { uPinsTableColumns } from '../../utils/reactTableColumns';
import { getErrors, hasData, toastDefault } from '../../utils/handler.utils';
import { Link } from 'react-router-dom';
import useGet from '../../hooks/useGet';
import UiHandler from '../UiHandler';
import SearchUpin from './SearchUpin';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';
function Upins() {
    const [currentPage, setCurrentPage] = useState(1)
    const [listPerPage, setListPerPage] = useState(10)
    const [searchQuery, setSearchQuery] = useState('')
    const [uniqueState, setUniqueState] = useState(false)
    const [urlToFetch, setUrlToFetch] = useState(`admin/unipins?page=${currentPage}&limit=${listPerPage}`)
    const [upinsData, loading, error] = useGet(urlToFetch, '', uniqueState)
   
    useEffect(() => {
        setUrlToFetch(`admin/unipins?page=${currentPage}&limit=${listPerPage}&${searchQuery}`)
    }, [currentPage, listPerPage])

    useEffect(() => {
        setCurrentPage(1)
        setUrlToFetch(`admin/unipins?page=${1}&limit=${listPerPage}&${searchQuery}`)
    }, [searchQuery])


    const deleteAdmin = (id) => {
        if (window.confirm('Are you sure')) {
            toast.promise(
                axiosInstance.post(`admin/unipin/delete/${id}`),
                {
                    pending: 'Deleting UniPin...',
                    error: {
                        render(err) {
                            return getErrors(err.data, false, true)
                        }
                    },
                    success: {
                        render() {
                            setUniqueState(prev => !prev);
                            return 'UniPin deleted successfully'
                        }
                    }
                },
                toastDefault
            )
        }
    }

    let editButton = {
        id: 'edit',
        Header: "Action",
        accessor: 'id',
        Cell: (e) => {
            return <ul className="flex space-x-2">
                <Link to={`/unipin/edit/${e.value}`} className="cstm_btn_small">
                    Update
                </Link>
                <button type="button" className="cstm_btn_small btn_red" onClick={() => deleteAdmin(e.value)}>Delete</button>
            </ul>
        }
    };

    let withEditButton = [...uPinsTableColumns, editButton]


    return (
        <section className="relative container_admin" >
            <div className="bg-white overflow-hidden rounded">
                <div className="px-6 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between">
                    <h3 className="text-lg font-bold text-black">
                        UniPIn Voucher
                    </h3>
                    <p class="_s_table_subtitle">Total Voucher: {upinsData?.voucher_count}</p>
                    <SearchUpin setSearchQuery={setSearchQuery} />
                    <Link className="cstm_btn" to="/upin/add">
                        Add Voucher
                    </Link>
                </div>

                <div>
                    <div className="relative min-h-[100px]">
                        <UiHandler data={upinsData?.vouchers} loading={loading} error={error} />
                        {hasData(upinsData?.vouchers, error) && (
                            <ReactTable tableId="upins_table" columns={withEditButton} data={upinsData?.vouchers} />
                        )}
                    </div>
                    {Array.isArray(upinsData?.vouchers) && (
                        <div className="flex flex-wrap items-center justify-center md:justify-between px-6 py-4 border-t border-gray-200 gap-4">
                            <Pagination setCurrentPage={setCurrentPage} page={currentPage} />
                            <ListPerPage listPerPage={listPerPage} setListPerPage={setListPerPage} />
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}

export default Upins
