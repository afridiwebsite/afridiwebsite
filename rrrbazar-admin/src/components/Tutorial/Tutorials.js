import React, { useState } from 'react'
import ReactTable from '../ReactTables/ReactTable';
import { tutorialTableColumns } from '../../utils/reactTableColumns';
import { getErrors, hasData, toastDefault } from '../../utils/handler.utils';
import { Link } from 'react-router-dom';
import useGet from '../../hooks/useGet';
import UiHandler from '../UiHandler';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';

function Tutorials() {
    const [uniqueState, setUniqueState] = useState(false)
    const [tutorialData, loading, error] = useGet(`admin/tutorials`, '', uniqueState)

    const deleteTutorialHandler = (id) => {
        if (window.confirm('Are you sure')) {
            toast.promise(
                axiosInstance.post(`admin/tutorial/delete/${id}`),
                {
                    pending: 'Deleting tutorial...',
                    error: {
                        render(err) {
                            console.log(err);
                            return getErrors(err.data, false, true)
                        }
                    },
                    success: {
                        render() {
                            setUniqueState(prev => !prev);
                            return 'Tutorial deleted successfully'
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
                <Link to={`/tutorials/edit/${e.value}`} className="cstm_btn_small">
                    Edit
                </Link>
                <button className="cstm_btn_small !bg-red-600 hover:!bg-red-700" type="button" onClick={() => deleteTutorialHandler(e.value)}>
                    Delete
                </button>
            </ul>
        }
    };

    let withEditButton = [...tutorialTableColumns, editButton]

    return (
        <section className="relative container_admin" >
            <div className="bg-white overflow-hidden rounded">
                <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
                    <h3 className="text-lg font-bold text-black">
                        Tutorials
                    </h3>
                    <Link className="cstm_btn" to={`/tutorials/add`}>
                        Add new
                    </Link>
                </div>
                <div>
                    <div className="relative min-h-[100px]">
                        <UiHandler data={tutorialData} loading={loading} error={error} />
                        {hasData(tutorialData, error) && (
                            <ReactTable tableId="tutorials_table" columns={withEditButton} data={tutorialData} />
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Tutorials
