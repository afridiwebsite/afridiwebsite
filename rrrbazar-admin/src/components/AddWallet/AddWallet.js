import React, { useEffect, useState } from 'react'
import ReactTable from '../ReactTables/ReactTable';
import Pagination from '../ReactTables/Pagination';
import ListPerPage from '../ReactTables/ListPerPage';
import { transactionsTableColumns } from '../../utils/reactTableColumns';
import { formatAddWalletTableData, getErrors, hasData, toastDefault } from '../../utils/handler.utils';
import useGet from '../../hooks/useGet';
import UiHandler from '../UiHandler';
import Swal from 'sweetalert2';
import axiosInstance from '../../common/axios';
import { toast } from 'react-toastify'
import { Link } from 'react-router-dom';
import Modal from 'react-modal';
import EditTransaction from '../AddWallet/EditTransaction'
import { FaEllipsisV } from 'react-icons/fa'
Modal.setAppElement('#root')

function AddWallet() {
    const [currentPage, setCurrentPage] = useState(1)
    const [listPerPage, setListPerPage] = useState(10)
    const [uniqueState, setUniqueState] = useState(false)
    const [searchWalletInput, setSearchWalletInput] = useState('')
    const [transactionIdInput, setTransactionIdInput] = useState('')
    const [isOpenModal, setIsOpenModal] = useState(false)
    const [editRowId, setEditRowId] = useState(null)

    // Build the URL from the current filter state. Centralizing this avoids
    // forgetting one of the params when a new filter is added later.
    const buildUrl = (page, perPage, q, txId) => {
        const params = new URLSearchParams()
        params.set('page', String(page))
        params.set('limit', String(perPage))
        if (q) params.set('q', q)
        if (txId) params.set('transaction_id', txId)
        return `admin/transaction?${params.toString()}`
    }

    const [urlToFetch, setUrlToFetch] = useState(buildUrl(currentPage, listPerPage, searchWalletInput, transactionIdInput))
    const [transactionData, loading, error] = useGet(urlToFetch, '', uniqueState)
    const addWalletData = transactionData?.transactions

    useEffect(() => {
        setUrlToFetch(buildUrl(currentPage, listPerPage, searchWalletInput, transactionIdInput))
    }, [currentPage, listPerPage])

    useEffect(() => {
        if (!searchWalletInput) clearSearchHandler()
    }, [searchWalletInput])

    // Debounce the transaction-id input so we don't fire a request on every
    // keystroke when the admin pastes a long id.
    useEffect(() => {
        const t = setTimeout(() => {
            setCurrentPage(1)
            setUrlToFetch(buildUrl(1, listPerPage, searchWalletInput, transactionIdInput))
        }, 400)
        return () => clearTimeout(t)
    }, [transactionIdInput])

    const searchWalletHandler = (e) => {
        setCurrentPage(1)
        e.preventDefault();
        if (!searchWalletInput) return false
        setUrlToFetch(buildUrl(1, listPerPage, searchWalletInput, transactionIdInput))
    }

    const clearSearchHandler = () => {
        setSearchWalletInput('')
        setCurrentPage(1)
        setUrlToFetch(buildUrl(1, listPerPage, '', transactionIdInput))
    }

    const openChangeStatusModal = async (transaction_id) => {
        const { value: status } = await Swal.fire({
            title: 'Change status',
            input: 'select',
            inputOptions: {
                completed: 'Completed',
                pending: 'Pending',
                cancel: 'Cancel',
            },
            inputPlaceholder: 'Select a status',
            confirmButtonText: "Update",
            showCancelButton: true,
            inputValidator: (value) => {
                return new Promise((resolve) => {
                    if (value) {
                        resolve()
                    } else {
                        resolve('Select an option to update')
                    }
                })
            }
        })


        if (status) {
            toast.promise(
                axiosInstance.post('/admin/transaction/update', {
                    transaction_id: transaction_id.value,
                    status: status,
                }),
                {
                    pending: 'Updating transaction...',
                    error: {
                        render({ data }) {
                            return getErrors(data, false, true)
                        }
                    },
                    success: {
                        render() {
                            setUniqueState(prev => !prev)
                            return 'Transaction updated successfully'
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
                {e.row.original.status === 'pending' && (
                    <li className="cstm_btn_small" onClick={() => openChangeStatusModal(e)}>
                        Edit Status
                    </li>
                )}
                <li onClick={() => editRowHandler(e.value)} className="bg-gray-200 hover:bg-gray-400 cursor-pointer w-8 h-8 rounded-full overflow-hidden flex items-center justify-center p-1 ">
                    <FaEllipsisV />
                </li>
            </ul>

        }
    };

    let withEditButton = [...transactionsTableColumns, editButton]

    const cancelAllHandler = () => {
        if (window.confirm('Are you sure')) {



            toast.promise(
                axiosInstance.post('admin/transaction/cancel-all'),
                {
                    pending: 'Cancelling transaction...',
                    error: {
                        render(err) {
                            console.log(err);
                            return getErrors(err.data, false, true)
                        }
                    },
                    success: {
                        render(res) {
                            console.log(res?.data);
                            setUniqueState(prev => !prev);
                            return `Total cancelled ${res?.data?.data?.data?.total} transaction.`
                        }
                    }
                },
                toastDefault
            )



            axiosInstance.post('admin/transaction/cancel-all').then(res => console.log(res.data)).catch(error => console.log(error))
        }
    }

    const editRowHandler = (id) => {
        setIsOpenModal(true)
        setEditRowId(id)
    }



    return (
        <>
            <Modal
                isOpen={isOpenModal}
                onRequestClose={() => setIsOpenModal(false)}
                style={{
                    overlay: {
                        background: 'rgba(0,0,0,0.7)'
                    }
                }}
            >
                {editRowId &&
                    <EditTransaction
                        transactionId={editRowId}
                        onComplete={() => {
                            setIsOpenModal(false); setUniqueState((prev) => !prev)
                        }}
                    />
                }
            </Modal>
            <section className="relative container_admin" >
                <div className="bg-white overflow-hidden rounded">
                    <div className="px-6 py-3 border-b border-gray-200 flex flex-wrap justify-start items-center md:justify-between gap-y-4 md:gap-y-0">
                        <div className="flex items-center space-x-3 flex-wrap" >
                            <h3 className="text-lg font-bold text-black">
                                Add Wallet
                                {/* {<span className="text-base ml-2 text-blue-600 font-semibold">Total order {transactionData?.total}</span>} */}
                            </h3>
                            <button className="cstm_btn_small !bg-red-500 hover:!bg-red-700" onClick={cancelAllHandler}>Cancel All</button>
                        </div>

                        <div className="w-full md:w-auto">
                            <form onSubmit={searchWalletHandler} className="flex items-center space-x-2 flex-wrap gap-y-2">
                                <input
                                    value={transactionIdInput}
                                    onChange={(e) => setTransactionIdInput(e.target.value)}
                                    type="text"
                                    placeholder="Transaction id"
                                    className="form_input mb-0 w-full md:w-[160px]"
                                />
                                <input value={searchWalletInput} onChange={(e) => setSearchWalletInput(e.target.value)} type="text" placeholder="Search number / user id" className="form_input mb-0 w-full md:w-auto" />
                                {(searchWalletInput || transactionIdInput) && (
                                    <button
                                        onClick={() => {
                                            setSearchWalletInput('')
                                            setTransactionIdInput('')
                                            setCurrentPage(1)
                                            setUrlToFetch(buildUrl(1, listPerPage, '', ''))
                                        }}
                                        type="button"
                                        className="cstm_btn !py-[7px] !rounded"
                                    >
                                        Clear
                                    </button>
                                )}
                            </form>
                        </div>
                    </div>
                    <div>
                        <div className="relative min-h-[100px]">
                            <UiHandler data={addWalletData} loading={loading} error={error} />
                            {hasData(addWalletData, error) && (
                                <ReactTable tableId="add_wallet_table" columns={withEditButton} data={formatAddWalletTableData(addWalletData)} />
                            )}
                        </div>
                        {Array.isArray(addWalletData) && (
                            <div className="flex flex-wrap items-center justify-center md:justify-between px-6 py-4 border-t border-gray-200 gap-4">
                                <Pagination setCurrentPage={setCurrentPage} page={currentPage} listPerPage={listPerPage} totalList={transactionData.total} />
                                <ListPerPage listPerPage={listPerPage} setListPerPage={setListPerPage} />
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </>
    )
}

export default AddWallet
