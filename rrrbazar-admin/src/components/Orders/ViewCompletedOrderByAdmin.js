import { useState } from 'react'
import Modal from 'react-modal'
import { ordersTableColumns } from '../../utils/reactTableColumns'
import ReactTable from '../ReactTables/ReactTable'

Modal.setAppElement('#root')

function ViewCompletedOrderByAdmin({ data }) {
    const [isOpenModal, setisOpenModal] = useState(false)
    const closeModal = () => {
        setisOpenModal(false)
    }

    return (
        <>
            <button type="button" disabled={true} className="cstm_btn_extra_small" onClick={() => setisOpenModal(true)}>View</button>
            <Modal
                isOpen={isOpenModal}
                onRequestClose={closeModal}
                style={{
                    overlay: {
                        background: 'rgba(0,0,0,0.7)'
                    }
                }}
            >
                <div className="py-2 px-3.5 md:py-2 md:px-5 border-b border-gray-300">
                    <h2 className="font-bold text-lg text-gray-500 flex items-center" >Order completed by <span className="text-gray-900 capitalize">&nbsp;{data.first_name + ' ' + data.last_name}</span> <span className="font-normal text-gray-700 text-base ml-2.5 inline-block">(Today)</span></h2>
                </div>
                <ReactTable data={data.total_order} columns={ordersTableColumns} tableId="order_completed_bt_details" />
            </Modal>
        </>
    )
}

export default ViewCompletedOrderByAdmin
