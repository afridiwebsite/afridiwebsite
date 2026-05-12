import { useEffect, useState } from 'react'
import ReactTable from '../ReactTables/ReactTable';
import Pagination from '../ReactTables/Pagination';
import ListPerPage from '../ReactTables/ListPerPage';
import { adminTransactionsTableColumns, transactionsTableColumns } from '../../utils/reactTableColumns';
import { formatAddWalletTableData, getErrors, hasData, toastDefault } from '../../utils/handler.utils';
import useGet from '../../hooks/useGet';
import UiHandler from '../UiHandler';
import Swal from 'sweetalert2';
import axiosInstance from '../../common/axios';
import { toast } from 'react-toastify'
import Modal from 'react-modal';
import EditTransaction from '../AddWallet/EditTransaction'
import { FaEllipsisV } from 'react-icons/fa'
Modal.setAppElement('#root')

function AdminWallet() {
    const [currentPage, setCurrentPage] = useState(1)
    const [listPerPage, setListPerPage] = useState(10)
    const [uniqueState, setUniqueState] = useState(false)
    const [searchWalletInput, setSearchWalletInput] = useState('')
    const [isOpenModal, setIsOpenModal] = useState(false)
    const [editRowId, setEditRowId] = useState(null)

    const [urlToFetch, setUrlToFetch] = useState(`admin/profile/transactions?page=${currentPage}&limit=${listPerPage}&q=${searchWalletInput}`)
    const [transactionData, loading, error] = useGet(urlToFetch, '', uniqueState)
    const addWalletData = transactionData?.transactions

    useEffect(() => {
        setUrlToFetch(`admin/profile/transactions?page=${currentPage}&limit=${listPerPage}&q=${searchWalletInput}`)
    }, [currentPage, listPerPage])

    useEffect(() => {
        if (!searchWalletInput) clearSearchHandler()
    }, [searchWalletInput])

    const searchWalletHandler = (e) => {
        setCurrentPage(1)
        e.preventDefault();
        if (!searchWalletInput) return false
        const totalLength = searchWalletInput.length;
        if (totalLength >= 8) {
            setUrlToFetch(`admin/profile/transactions?q=${searchWalletInput}&page=${currentPage}&limit=${listPerPage}`)
        } else {
            setUrlToFetch(`admin/profile/transactions?q=${searchWalletInput}&page=${currentPage}&limit=${listPerPage}`)
        }
    }

    const clearSearchHandler = () => {
        setSearchWalletInput('')
        setCurrentPage(1)
        setUrlToFetch(`admin/profile/transactions?page=${currentPage}&limit=${listPerPage}`)
    }


    let withEditButton = [...adminTransactionsTableColumns]



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
                        </div>

                        <div className="w-full md:w-auto">
                            <form onSubmit={searchWalletHandler} className="flex items-center space-x-2">
                                <input value={searchWalletInput} onChange={(e) => setSearchWalletInput(e.target.value)} type="text" placeholder="Search" className="form_input mb-0 w-full" />
                                {searchWalletInput && <button onClick={clearSearchHandler} type="button" className="cstm_btn !py-[7px] !rounded">Clear</button>}
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

export default AdminWallet
