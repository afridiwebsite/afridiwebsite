import React, { useEffect, useState } from 'react'
import ReactTable from '../ReactTables/ReactTable';
import Pagination from '../ReactTables/Pagination';
import ListPerPage from '../ReactTables/ListPerPage';
import { authsTableColumns } from '../../utils/reactTableColumns';
import { getErrors, hasData, toastDefault } from '../../utils/handler.utils';
import useGet from '../../hooks/useGet';
import UiHandler from '../UiHandler';
import Swal from 'sweetalert2';
import axiosInstance from '../../common/axios'
import { toast } from 'react-toastify';
function Admins() {
    const [currentPage, setCurrentPage] = useState(1)
    const [listPerPage, setListPerPage] = useState(10)
    const [urlToFetch, setUrlToFetch] = useState(`admin/auth-modules?page=${currentPage}&limit=${listPerPage}`)
    const [uniqueState, setUniqueState] = useState(false)
    const [authData, loading, error] = useGet(urlToFetch, '', uniqueState)

    useEffect(() => {
        setUrlToFetch(`admin/auth-modules?page=${currentPage}&limit=${listPerPage}`)
    }, [currentPage, listPerPage])

    let editButton = {
        id: 'edit',
        Header: "Action",
        accessor: 'id',
        Cell: (e) => {
            return e.row.original.status == 0 ? <button className="cstm_btn_extra_small" onClick={() => editRow(e)}>Active</button> : <span className="cstm_btn_extra_small !bg-green-500" >Activated</span>
        }
    };

    let withEditButton = [...authsTableColumns, editButton]

    const editRow = async (e) => {
        const { value: formValues } = await Swal.fire({
            title: 'Activate Auth',
            html:
                '<input placeholder="Name" id="swal-name-input" class="form_input mb-4">' +
                '<input placeholder="Slug" required id="swal-slug" class="form_input mb-4">' +
                '<textarea placeholder="Description" id="swal-description" class="form_input" rows="5"></textarea>',
            focusConfirm: false,
            preConfirm: () => {
                let name = document.getElementById('swal-name-input').value
                let slug = document.getElementById('swal-slug').value
                let description = document.getElementById('swal-description').value

                if (!name) {
                    toast.error('Auth name is required', toastDefault)
                }
                if (!slug) {
                    toast.error('Slug is required', toastDefault)
                }
                if (slug && !slug.match(/^[a-z0-9_]*$/)) {
                    toast.error('Invalid slug type. Slug should be like:- this_is_a_valid_slug', toastDefault)
                }
                if (!description) {
                    toast.error('Description is required', toastDefault)
                }
                if (!name || !slug || !description || !slug.match(/^[a-z0-9_]*$/)) {
                    return false
                }

                return { name, slug, description };

            }
        })

        if (formValues) {
            toast.promise(
                axiosInstance.post(`/admin/auth-modules/active/${e.value}`, {
                    name: formValues.name,
                    slug: formValues.slug,
                    description: formValues.description
                }),
                {
                    pending: 'Activating auth...',
                    error: {
                        render(err) {
                            console.log(err);
                            return getErrors(err.data, false, true)
                        }
                    },
                    success: {
                        render() {
                            setUniqueState(prev => !prev);
                            return 'Auth activated successfully'
                        }
                    }
                },
                toastDefault
            )
        }


    }


    return (
        <section className="relative container_admin" >
            <div className="bg-white overflow-hidden rounded">
                <div className="px-6 py-3 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-black">
                        Auths
                    </h3>
                </div>
                <div>
                    <div className="relative min-h-[100px]">
                        <UiHandler data={authData} loading={loading} error={error} />
                        {hasData(authData, error) && (
                            <ReactTable tableId="auths_table" columns={withEditButton} data={authData} />
                        )}
                    </div>
                    {Array.isArray(authData) && (
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
