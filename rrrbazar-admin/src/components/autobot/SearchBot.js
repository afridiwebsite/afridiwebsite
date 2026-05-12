import React, { useEffect, useState } from 'react'

function SearchBot({ setSearchQuery }) {
    const [name, setName] = useState('')
    const [ip_url, setIP] = useState('')
    const [status, setStatus] = useState('')

    useEffect(() => {
        setSearchQuery(`name=${name}&ip_url=${ip_url}&status=${status}`)
    }, [name])

    const submitHandler = (e) => {
        e.preventDefault()
        setSearchQuery(`name=${name}&ip_url=${ip_url}&status=${status}`)
    }


    return (
        <form onSubmit={submitHandler} >
            <div className="flex w-full md:w-auto items-center space-y-4 md:space-x-3 md:space-y-0 justify-end flex-wrap my-4">
                <div className="w-full md:w-[160px]">
                    <input type="text" placeholder="Name" className="form_input mb-0" onChange={(e) => setName(e.target.value)} />
                </div>
                <div class="w-full md:w-[260px]">
                    <input type="text" placeholder="Server Address" className="form_input mb-0" onChange={(e) => setIP(e.target.value)} />
                </div>
                <div class="w-full md:w-[100px]">
                    <select className="form_input mb-0" onChange={(e) => setStatus(e.target.value)}>
                        <option value="">Status</option>
                        <option value="1">Active</option>
                        <option value="2">Working</option>
                        <option value="3">Inactive</option>
                    </select>
                </div>
                <button type="submit" className="cstm_btn !py-1.5">Search</button>
            </div>
        </form>
    )
}

export default SearchBot