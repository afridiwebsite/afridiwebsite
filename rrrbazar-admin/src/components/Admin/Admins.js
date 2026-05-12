import React, { useEffect, useState } from 'react'
import ReactTable from '../ReactTables/ReactTable';
import Pagination from '../ReactTables/Pagination';
import ListPerPage from '../ReactTables/ListPerPage';
import { adminsTableColumns } from '../../utils/reactTableColumns';
import { getErrors, hasData, toastDefault } from '../../utils/handler.utils';
import { Link } from 'react-router-dom';
import useGet from '../../hooks/useGet';
import UiHandler from '../UiHandler';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';
function Admins() {
    const [currentPage, setCurrentPage] = useState(1)
    const [listPerPage, setListPerPage] = useState(10)
    const [uniqueState, setUniqueState] = useState(false)
    const [urlToFetch, setUrlToFetch] = useState(`admin/admins?page=${currentPage}&limit=${listPerPage}`)
    const [adminsData, loading, error] = useGet(urlToFetch, '', uniqueState)
    useEffect(() => {
        setUrlToFetch(`admin/admins?page=${currentPage}&limit=${listPerPage}`)
    }, [currentPage, listPerPage])


    const deleteAdmin = (id) => {
        if (window.confirm('Are you sure')) {
            toast.promise(
                axiosInstance.post(`admin/admin/delete/${id}`),
                {
                    pending: 'Deleting admin...',
                    error: {
                        render(err) {
                            console.log(err);
                            return getErrors(err.data, false, true)
                        }
                    },
                    success: {
                        render() {
                            setUniqueState(prev => !prev);
                            return 'Admin deleted successfully'
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
                <Link to={`/manage-auth-permission/${e.value}`} className="cstm_btn_small">
                    Manage Auth Permission
                </Link>
                <Link to={`/manage-order-permission/${e.value}`} className="cstm_btn_small">
                    Manage Order Permission
                </Link>
                <button type="button" className="cstm_btn_small btn_red" onClick={() => deleteAdmin(e.value)}>Delete</button>
            </ul>
        }
    };

    let withEditButton = [...adminsTableColumns, editButton]


    return (
        <section className="relative container_admin" >
            <div className="bg-white overflow-hidden rounded">
                <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between flex-wrap">
                    <h3 className="text-lg font-bold text-black">
                        Admins
                    </h3>
                    <Link className="cstm_btn" to="/admin/add">
                        Add new admin
                    </Link>
                </div>
                <div>
                    <div className="relative min-h-[100px]">
                        <UiHandler data={adminsData} loading={loading} error={error} />
                        {hasData(adminsData, error) && (
                            <ReactTable tableId="admins_table" columns={withEditButton} data={adminsData} />
                        )}
                    </div>
                    {Array.isArray(adminsData) && (
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

export default Admins
