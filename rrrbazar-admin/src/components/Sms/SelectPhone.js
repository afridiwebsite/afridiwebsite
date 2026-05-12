import { useCallback, useEffect, useRef, useState } from "react"
import useGet from "../../hooks/useGet"
import { hasData } from "../../utils/handler.utils"
import UiHandler from '../UiHandler'

function SelectPhone({ onGoSecondStep, isShow }) {
    const addNewPhoneInputRef = useRef(null)
    const selectAllChekboxRef = useRef(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [data, loading, error] = useGet(`/admin/users-for-send-sms?page=${currentPage}&limit=50`)
    const [openAddPhoneForm, setOpenAddPhoneForm] = useState(false)
    const [users, setUsers] = useState(null)
    const [selectedPhones, setSelectedPhones] = useState([])

    const observer = useRef();
    const lastMovieElement = useCallback(
        (node) => {
            if (loading) return;
            if (observer.current) observer.current.disconnect();
            observer.current = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    setCurrentPage((prevPageNumber) => prevPageNumber + 1);
                }
            });
            if (node) observer.current.observe(node);
        },
        []
    );

    useEffect(() => {
        if (!data) return
        setUsers(prev => {
            if (prev) {
                return [...prev, ...data]
            }
            return data
        })
    }, [data])

    useEffect(() => {
        if (selectedPhones?.length > 0 && selectedPhones?.length !== users?.length) {
            selectAllChekboxRef.current.indeterminate = true
        } else {
            selectAllChekboxRef.current.indeterminate = false
        }
    }, [selectedPhones, users])

    const addNewPhoneSubmitHandler = (e) => {
        e.preventDefault()
        const phone = addNewPhoneInputRef.current.value?.trim()
        if (!phone) return
        addPhoneHandler(phone)
        addNewPhoneInputRef.current.value = ''
    }


    const addPhoneHandler = (phone) => {
        const newUser = {
            username: 'Unknown',
            phone,
            is_phone_verify: false,
            addedManually: true
        }
        setUsers(prevState => {
            return [...prevState, newUser]
        })
        setSelectedPhones(prev => [...prev, phone])
    }

    const isChecked = (phone) => {
        if (!selectedPhones) return false;
        if (selectedPhones.includes(phone)) return true
        return false
    }

    const checkboxHandler = (e, phone) => {
        if (e.target.checked) {
            setSelectedPhones(prev => [...prev, phone])
        } else {
            setSelectedPhones(prevs => {
                return [...prevs.filter(prev => prev !== phone)]
            })
        }
    }

    const selectAllHandler = (e) => {
        if (e.target.checked) {
            setSelectedPhones(users.map(user => user.phone))
        } else {
            setSelectedPhones([])
        }
    }

    const goNextStepHandler = () => {
        if (selectedPhones.length <= 0) return
        onGoSecondStep(selectedPhones)
    }






    return (
        <div style={{ display: isShow ? 'block' : 'none' }}>
            {/* Header Start */}
            <div className="grid grid-cols-[35px,280px,220px,auto] border-b border-gray-200" >
                <label className="px-3 py-2 block cursor-pointer hover:bg-gray-50" >
                    <input type="checkbox" ref={selectAllChekboxRef} onChange={selectAllHandler} checked={selectedPhones?.length === users?.length} />
                </label>
                <div className="px-2 py-2 font-bold">
                    <p>Name</p>
                </div>
                <div className="px-2 py-2 font-bold">
                    <p>Phone</p>
                </div>
                <div className="px-2 py-2 font-bold">
                    <p>Is Verified</p>
                </div>
            </div>
            {/* Header End */}
            {/* Body Start */}
            <div className="max-h-[400px] overflow-hidden overflow-y-auto relative" >
                <UiHandler data={users} loading={loading} error={error} />
                {hasData(users) && users.map((user, index) => (
                    <label
                        key={index}
                        className={`grid grid-cols-[35px,280px,220px,auto] border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${user.addedManually ? '!bg-blue-600 !bg-opacity-10' : ''}`}
                        ref={users.length === index + 1 ? lastMovieElement : undefined}
                    >
                        <label className="px-3 py-2 block cursor-pointer" >
                            <input type="checkbox" checked={isChecked(user.phone)} onChange={(e) => checkboxHandler(e, user?.phone)} />
                        </label>
                        <div className="px-2 py-2">
                            <p>{user?.username}</p>
                        </div>
                        <div className="px-2 py-2">
                            <p>{user?.phone}</p>
                        </div>
                        <div className="px-2 py-2">
                            <p>{user.is_phone_verify?.toString() === '1' ? <span className="text-green-500 font-bold" >✓</span> : <span className="text-red-500" >✖</span>}</p>
                        </div>
                    </label>
                ))
                }
            </div>
            {/* Body End */}
            {/* Footer Start */}
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3" >
                <div className="relative" >
                    {openAddPhoneForm && (
                        <div className="animate-slideBottom-in absolute bottom-[calc(100%+10px)] bg-gray-100 shadow-lg rounded-md left-0 p-4 w-[250px]" >
                            <form onSubmit={addNewPhoneSubmitHandler}>
                                <input autoFocus ref={addNewPhoneInputRef} type="number" placeholder="Phone number" className="form_input !mb-0" />
                            </form>
                        </div>
                    )}
                    <button className="cstm_btn_small" onClick={() => setOpenAddPhoneForm(prev => !prev)}>
                        {openAddPhoneForm ? 'Close' : 'Add Number'}
                    </button>
                </div>
                <div className="text-sm font-bold text-gray-600" >
                    Total {users?.length} - Selected {selectedPhones?.length}
                </div>
                <button className="cstm_btn_small" onClick={goNextStepHandler}>Next</button>
            </div>
            {/* Footer End */}
        </div>
    )
}

export default SelectPhone
