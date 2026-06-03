import React, { useEffect, useState } from 'react'
import ReactTable from '../ReactTables/ReactTable';
import Pagination from '../ReactTables/Pagination';
import ListPerPage from '../ReactTables/ListPerPage';
import { userTableColumns } from '../../utils/reactTableColumns';
import { hasData } from '../../utils/handler.utils';
import useGet from '../../hooks/useGet';
import UiHandler from '../UiHandler';
import SearchUser from '../Users/SearchUser';
import { Link } from 'react-router-dom';

// Sibling of Users.js, narrowed server-side to user_type=reseller. Action
// menu is a single "View" that re-uses the existing EditUser screen (which
// already renders the reseller-aware stat cards + reseller checkbox).
function Resellers() {
    const [currentPage, setCurrentPage] = useState(1)
    const [listPerPage, setListPerPage] = useState(10)
    const [searchQuery, setSearchQuery] = useState('')
    const [urlToFetch, setUrlToFetch] = useState(
        `admin/users?page=${currentPage}&limit=${listPerPage}&user_type=reseller`
    )
    const [userData, loading, error] = useGet(urlToFetch, '')

    useEffect(() => {
        setUrlToFetch(
            `admin/users?page=${currentPage}&limit=${listPerPage}&user_type=reseller&${searchQuery}`
        )
    }, [currentPage, listPerPage])

    useEffect(() => {
        setCurrentPage(1)
        setUrlToFetch(
            `admin/users?page=${1}&limit=${listPerPage}&user_type=reseller&${searchQuery}`
        )
    }, [searchQuery])

    let actionMenu = {
        id: 'view',
        Header: 'Action',
        accessor: 'id',
        Cell: (e) => (
            <ul className="flex space-x-2">
                <Link to={`/user/edit/${e.value}`} className="cstm_btn_small">
                    View
                </Link>
            </ul>
        ),
    };
    let withActionMenu = [...userTableColumns, actionMenu]

    return (
        <section className="relative container_admin">
            <div className="bg-white overflow-hidden rounded">
                <div className="px-6 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between">
                    <h3 className="text-lg font-bold text-black mb-4 md:mb-0">
                        Resellers
                        {
                            <span className="text-base ml-2 text-blue-600 font-semibold">
                                Total reseller {userData?.user_count}
                            </span>
                        }
                    </h3>
                    <SearchUser setSearchQuery={setSearchQuery} />
                </div>
                <div>
                    <div className="relative min-h-[100px]">
                        <UiHandler data={userData?.data} loading={loading} error={error} />
                        {hasData(userData?.data, error) && (
                            <ReactTable
                                tableId="reseller_table"
                                columns={withActionMenu}
                                data={userData.data}
                            />
                        )}
                    </div>
                    {Array.isArray(userData?.data) && (
                        <div className="flex flex-wrap md:flex-nowrap items-center justify-center md:justify-between px-6 py-4 border-t border-gray-200 gap-4">
                            <Pagination
                                setCurrentPage={setCurrentPage}
                                page={currentPage}
                                totalList={userData?.user_count}
                                listPerPage={listPerPage}
                            />
                            <ListPerPage listPerPage={listPerPage} setListPerPage={setListPerPage} />
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}

export default Resellers
