import React, { useState } from 'react'
import ReactTable from '../ReactTables/ReactTable';
import { noticeTableColumns } from '../../utils/reactTableColumns';
import { getErrors, hasData, toastDefault } from '../../utils/handler.utils';
import { Link } from 'react-router-dom';
import useGet from '../../hooks/useGet';
import UiHandler from '../UiHandler';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';

function Notice() {
    const [uniqueState, setUniqueState] = useState(false)

    const [noticeData, loading, error] = useGet(`admin/notices`, '', uniqueState)

    const deletePaymentHangdler = (id) => {
        if (window.confirm('Are you sure')) {
            toast.promise(
                axiosInstance.post(`admin/notice/delete/${id}`),
                {
                    pending: 'Deleting notice...',
                    error: {
                        render(err) {
                            console.log(err);
                            return getErrors(err.data, false, true)
                        }
                    },
                    success: {
                        render() {
                            setUniqueState(prev => !prev);
                            return 'Notice deleted successfully'
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
                <Link to={`/notice/edit/${e.value}`} className="cstm_btn_small">
                    Edit
                </Link>
                <button className="cstm_btn_small !bg-red-600 hover:!bg-red-700" type="button" onClick={() => deletePaymentHangdler(e.value)}>
                    Delete
                </button>

            </ul>
        }
    };

    let withEditButton = [...noticeTableColumns, editButton]


    return (
        <section className="relative container_admin" >
            <div className="bg-white overflow-hidden rounded">
                <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between flex-wrap">
                    <h3 className="text-lg font-bold text-black">
                        Notice
                    </h3>
                    <Link className="cstm_btn" to="/notice/add">
                        Add new
                    </Link>
                </div>
                <div>
                    <div className="relative min-h-[100px]">
                        <UiHandler data={noticeData} loading={loading} error={error} />
                        {hasData(noticeData, error) && (
                            <ReactTable tableId="notice_table" columns={withEditButton} data={noticeData} />
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Notice
