import React, { useEffect, useState } from 'react'

function SearchUser({ setSearchQuery }) {
    const [user, setUser] = useState('')

    useEffect(() => {
        if (!user) setSearchQuery(`q=${user}`)
    }, [user])

    const submitHandler = (e) => {
        e.preventDefault()
        setSearchQuery(`q=${user}`)
    }


    return (
        <form onSubmit={submitHandler} >
            <div className="flex w-full md:w-auto items-center space-y-4 md:space-x-3 md:space-y-0 justify-end flex-wrap my-4">
                <div className="w-full md:w-[200px]">
                    <input type="text" placeholder="Search user" className="form_input mb-0" onChange={(e) => setUser(e.target.value)} />
                </div>
                <button type="submit" className="cstm_btn !py-1.5">Search</button>
            </div>
        </form>
    )
}

export default SearchUser
