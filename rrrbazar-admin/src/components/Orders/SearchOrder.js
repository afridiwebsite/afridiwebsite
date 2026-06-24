import React, { useEffect, useState } from 'react';
import Select from 'react-select';

const colourOptions = [
    {
        label: "Completed",
        value: "completed"
    },
    {
        label: "Pending",
        value: "pending"
    },
    {
        label: "Cancel",
        value: "cancel"
    },
    {
        label: "Failed",
        value: "Failed"
    },
]

function SearchOrder({ addSearchParam, removeSearchParam }) {

    // https://stackoverflow.com/questions/4220126/run-javascript-function-when-user-finishes-typing-instead-of-on-key-up

    //setup before functions
    var typingTimer;                //timer identifier
    var doneTypingInterval = 500;  //time in ms, 5 second for example

    const [userId, setUserId] = useState('')
    const [orderId, setOrderId] = useState('')
    const [orserStatus, setOrderStatus] = useState('')
    const [uc, setUc] = useState('')
    const [packageName, setPackageName] = useState('')
    // Date range filter. Both ends optional; the backend interprets
    // start_date as inclusive (00:00:00) and end_date as inclusive
    // (23:59:59) so a same-day pair returns the whole day.
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    // useEffect(() => {
    //     setTimeout(() => {
    //         console.log("HELLO");
    //         addSearchParam('user_id', '56')
    //     }, 2000);
    // }, [])

    useEffect(() => {
        if (orserStatus) addSearchParam('status', orserStatus)
        else removeSearchParam('status')
    }, [orserStatus, addSearchParam, removeSearchParam])

    useEffect(() => {
        if (userId) addSearchParam('user_id', userId)
        else removeSearchParam('user_id')
    }, [userId, addSearchParam, removeSearchParam])

    useEffect(() => {
        if (orderId) addSearchParam('order_id', orderId)
        else removeSearchParam('order_id')
    }, [orderId, addSearchParam, removeSearchParam])

    useEffect(() => {
        if (uc) addSearchParam('uc', uc)
        else removeSearchParam('uc')
    }, [uc, addSearchParam, removeSearchParam])

    useEffect(() => {
        if (packageName) addSearchParam('package_name', packageName)
        else removeSearchParam('package_name')
    }, [packageName, addSearchParam, removeSearchParam])

    useEffect(() => {
        if (startDate) addSearchParam('start_date', startDate)
        else removeSearchParam('start_date')
    }, [startDate, addSearchParam, removeSearchParam])

    useEffect(() => {
        if (endDate) addSearchParam('end_date', endDate)
        else removeSearchParam('end_date')
    }, [endDate, addSearchParam, removeSearchParam])

    const submitHandler = (e) => {
        e.preventDefault()
        // setSearchQuery(`user_id=${userId}&order_id=${orderId}&status=${orserStatus}`)
    }


    return (
        <form onSubmit={submitHandler}>
            <div className="flex flex-col gap-2 md:gap-3 w-full md:w-auto">
                {/* Row 1 — User id, Order id, Status. */}
                <div className="flex w-full items-center gap-2 md:gap-3 justify-end flex-wrap">
                    <div className="flex-1 min-w-0 md:flex-none md:w-[200px]">
                        <input
                            type="text"
                            placeholder="User id"
                            className="form_input mb-0"
                            onChange={(e) => {
                                clearTimeout(typingTimer);
                                const value = e.target.value;
                                typingTimer = setTimeout(
                                    () => setUserId(value),
                                    value ? doneTypingInterval : 0,
                                );
                            }}
                        />
                    </div>
                    <div className="flex-1 min-w-0 md:flex-none md:w-[200px]">
                        <input
                            type="text"
                            placeholder="Order id"
                            className="form_input mb-0"
                            onChange={(e) => {
                                clearTimeout(typingTimer);
                                const value = e.target.value;
                                typingTimer = setTimeout(
                                    () => setOrderId(value),
                                    value ? doneTypingInterval : 0,
                                );
                            }}
                        />
                    </div>
                    <div className="flex-1 min-w-0 md:flex-none md:w-[200px]">
                        <Select
                            placeholder="Select status"
                            isSearchable={false}
                            isClearable={true}
                            options={colourOptions}
                            onChange={(e) => setOrderStatus(e?.value || null)}
                        />
                    </div>
                </div>

                {/* Row 2 — combined UC / player id search. The backend `uc`
                    filter now matches either column (or a voucher code). */}
                <div className="flex w-full items-center gap-2 md:gap-3 justify-end flex-wrap">
                    <div className="flex-1 min-w-0 md:flex-none md:w-[320px]">
                        <input
                            type="text"
                            placeholder="UC code or Player ID"
                            className="form_input mb-0"
                            onChange={(e) => {
                                clearTimeout(typingTimer);
                                const value = e.target.value;
                                typingTimer = setTimeout(
                                    () => setUc(value),
                                    value ? doneTypingInterval : 0,
                                );
                            }}
                        />
                    </div>
                    <div className="flex-1 min-w-0 md:flex-none md:w-[320px]">
                        <input
                            type="text"
                            placeholder="Package name"
                            className="form_input mb-0"
                            onChange={(e) => {
                                clearTimeout(typingTimer);
                                const value = e.target.value;
                                typingTimer = setTimeout(
                                    () => setPackageName(value),
                                    value ? doneTypingInterval : 0,
                                );
                            }}
                        />
                    </div>
                </div>

                {/* Row 3 — date range. Both inputs are optional and a Clear
                    button next to them wipes the range in one click. */}
                <div className="flex w-full items-center gap-2 md:gap-3 justify-end flex-wrap">
                    <div className="flex items-center gap-2 flex-1">
                        <input
                            type="date"
                            className="form_input mb-0"
                            value={startDate}
                            max={endDate || undefined}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>

                    --

                    <div className="flex items-center gap-2 flex-1">
                       
                        <input
                            type="date"
                            className="form_input mb-0"
                            value={endDate}
                            min={startDate || undefined}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    {(startDate || endDate) && (
                        <button
                            type="button"
                            className="cstm_btn_small !bg-gray-200 !text-gray-700 hover:!bg-gray-300"
                            onClick={() => {
                                setStartDate('')
                                setEndDate('')
                            }}
                        >
                            Clear dates
                        </button>
                    )}
                </div>
            </div>
        </form>
    )
}

export default SearchOrder
