import React, { useEffect, useState } from 'react'
import ReactTable from '../ReactTables/ReactTable';
import Pagination from '../ReactTables/Pagination';
import ListPerPage from '../ReactTables/ListPerPage';
import { botTableColumns } from '../../utils/reactTableColumns';
import { getErrors, hasData, toastDefault } from '../../utils/handler.utils';
import { Link } from 'react-router-dom';
import useGet from '../../hooks/useGet';
import UiHandler from '../UiHandler';
import SearchBot from './SearchBot';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';
function Bots() {
    const [currentPage, setCurrentPage] = useState(1)
    const [listPerPage, setListPerPage] = useState(10)
    const [searchQuery, setSearchQuery] = useState('')
    const [uniqueState, setUniqueState] = useState(false)
    const [urlToFetch, setUrlToFetch] = useState(`admin/botservers?page=${currentPage}&limit=${listPerPage}`)
    const [upinsData, loading, error] = useGet(urlToFetch, '', uniqueState)
   
    useEffect(() => {
        setUrlToFetch(`admin/botservers?page=${currentPage}&limit=${listPerPage}&${searchQuery}`)
    }, [currentPage, listPerPage])

    useEffect(() => {
        setCurrentPage(1)
        setUrlToFetch(`admin/botservers?page=${1}&limit=${listPerPage}&${searchQuery}`)
    }, [searchQuery])


    const deleteAdmin = (id) => {
        if (window.confirm('Are you sure')) {
            toast.promise(
                axiosInstance.post(`admin/botserver/delete/${id}`),
                {
                    pending: 'Deleting Bot Server...',
                    error: {
                        render(err) {
                            return getErrors(err.data, false, true)
                        }
                    },
                    success: {
                        render() {
                            setUniqueState(prev => !prev);
                            return 'Bot Server deleted successfully'
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
                <Link to={`/botserver/edit/${e.value}`} className="cstm_btn_small">
                    Update
                </Link>
                <button type="button" className="cstm_btn_small btn_red" onClick={() => deleteAdmin(e.value)}>Delete</button>
            </ul>
        }
    };

    let withEditButton = [...botTableColumns, editButton]


    return (
        <section className="relative container_admin" >
            <div className="bg-white overflow-hidden rounded">
                <div className="px-6 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between">
                    <h3 className="text-lg font-bold text-black">
                        BOT SERVER
                    </h3>
                    <SearchBot setSearchQuery={setSearchQuery} />
                    <Link className="cstm_btn" to="/botserver/add">
                        Add BOT Server
                    </Link>
                </div>

                <div>
                    <div className="relative min-h-[100px]">
                        <UiHandler data={upinsData} loading={loading} error={error} />
                        {hasData(upinsData, error) && (
                            <ReactTable tableId="upins_table" columns={withEditButton} data={upinsData} />
                        )}
                    </div>
                    {Array.isArray(upinsData) && (
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

export default Bots
