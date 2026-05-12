import React, { useEffect, useState } from 'react'

function SearchUpin({ setSearchQuery }) {
    const [user, setUser] = useState('')
    const [u_package, setPackage] = useState('')
    const [status, setStatus] = useState('')
    const [voucher, setVoucher] = useState('')

    useEffect(() => {
        setSearchQuery(`user=${user}&package=${u_package}&status=${status}&voucher=${voucher}`)
    }, [user])

    const submitHandler = (e) => {
        e.preventDefault()
        setSearchQuery(`user=${user}&package=${u_package}&status=${status}&voucher=${voucher}`)
    }


    return (
        <form onSubmit={submitHandler} >
            <div className="flex w-full md:w-auto items-center space-y-4 md:space-x-3 md:space-y-0 justify-end flex-wrap my-4">
                <div className="w-full md:w-[160px]">
                    <input type="number" placeholder="User ID" className="form_input mb-0" onChange={(e) => setUser(e.target.value)} />
                </div>
                <div class="w-full md:w-[160px]">
                    <input type="number" placeholder="Package ID" className="form_input mb-0" onChange={(e) => setPackage(e.target.value)} />
                </div>
                <div class="w-full md:w-[260px]">
                    <input type="text" placeholder="Voucher Code" className="form_input mb-0" onChange={(e) => setVoucher(e.target.value)} />
                </div>
                <div class="w-full md:w-[100px]">
                    <select className="form_input mb-0" onChange={(e) => setStatus(e.target.value)}>
                        <option value="">Status</option>
                        <option value="1">Ready</option>
                        <option value="2">Used</option>
                        <option value="0">Hide</option>
                    </select>
                </div>
                <button type="submit" className="cstm_btn !py-1.5">Search</button>
            </div>
        </form>
    )
}

export default SearchUpin