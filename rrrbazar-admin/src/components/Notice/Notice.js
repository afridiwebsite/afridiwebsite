import React, { useMemo, useState } from 'react'
import ReactTable from '../ReactTables/ReactTable';
import { noticeTableColumns } from '../../utils/reactTableColumns';
import { getErrors, hasData, toastDefault } from '../../utils/handler.utils';
import { Link } from 'react-router-dom';
import useGet from '../../hooks/useGet';
import UiHandler from '../UiHandler';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';

// Tab definitions — order matters; first tab is the default. The `type`
// values must match what the API stores so the filter works directly.
const NOTICE_TABS = [
    { type: 'normal', label: 'Normal' },
    { type: 'marquee', label: 'Marquee' },
    { type: 'navbar_bottom', label: 'Below Navbar' },
];

function Notice() {
    const [uniqueState, setUniqueState] = useState(false)
    const [activeType, setActiveType] = useState(NOTICE_TABS[0].type)

    const [noticeData, loading, error] = useGet(`admin/notices`, '', uniqueState)

    const filtered = useMemo(() => {
        if (!Array.isArray(noticeData)) return noticeData
        return noticeData.filter((n) => (n?.type || 'normal') === activeType)
    }, [noticeData, activeType])

    const countsByType = useMemo(() => {
        const map = { normal: 0, marquee: 0, navbar_bottom: 0 }
        if (Array.isArray(noticeData)) {
            for (const n of noticeData) {
                const t = n?.type || 'normal'
                if (map[t] !== undefined) map[t] += 1
            }
        }
        return map
    }, [noticeData])

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
                <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
                    <h3 className="text-lg font-bold text-black">
                        Notice
                    </h3>
                    {/* The "Add new" button pre-fills the type field via query
                        string — the AddNotice form no longer asks for it. */}
                    <Link className="cstm_btn" to={`/notice/add?type=${activeType}`}>
                        Add new
                    </Link>
                </div>
                <div className="px-6 pt-4 flex flex-wrap items-center gap-2 border-b border-gray-100">
                    {NOTICE_TABS.map((tab) => {
                        const isActive = activeType === tab.type
                        return (
                            <button
                                key={tab.type}
                                type="button"
                                onClick={() => setActiveType(tab.type)}
                                className={`px-4 py-2 -mb-px border-b-2 text-sm font-medium transition-colors ${
                                    isActive
                                        ? 'border-blue-600 text-blue-700'
                                        : 'border-transparent text-gray-500 hover:text-gray-800'
                                }`}
                            >
                                {tab.label}
                                <span
                                    className={`ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold ${
                                        isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                                    }`}
                                >
                                    {countsByType[tab.type] || 0}
                                </span>
                            </button>
                        )
                    })}
                </div>
                <div>
                    <div className="relative min-h-[100px]">
                        <UiHandler data={noticeData} loading={loading} error={error} />
                        {hasData(noticeData, error) && (
                            <ReactTable tableId={`notice_table_${activeType}`} columns={withEditButton} data={filtered} />
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Notice
