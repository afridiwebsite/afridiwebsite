import React from 'react'

function ListPerPage({ lists = [5, 10, 25, 50], listPerPage, setListPerPage, prefix = "List per page:" }) {
    const changeHandler = (e) => {
        setListPerPage(parseInt(e.target.value))
    }
    return (
        <label className="flex items-center text-blueGray-700 text-xs flex-wrap md:flex-nowrap" >
            <label className="mr-1 select-none md:whitespace-nowrap">{prefix}</label>
            <select onChange={changeHandler} defaultValue={listPerPage} className="outline-none cursor-pointer shadow rounded hover:shadow-md bg-white py-1 px-1.5">
                {lists.map((list, i) => (
                    <option key={i} value={list + ''} >{list}</option>
                ))}
            </select>
        </label>
    )
}

export default ListPerPage
