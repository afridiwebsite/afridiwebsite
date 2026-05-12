import React, { useEffect, useRef, useState } from 'react'
import { BsChevronDoubleLeft, BsChevronDoubleRight, BsChevronLeft, BsChevronRight } from 'react-icons/bs';
import { hasData } from '../../utils/handler.utils';

function Pagination({ setCurrentPage, page, totalList, listPerPage }) {
    const [paginationArray, setPaginationArray] = useState([])
    const goToPageRef = useRef(null)
    const clickHandler = (e) => {
        setCurrentPage && setCurrentPage(e)
    }
    const paginationLength = Math.ceil(totalList / listPerPage)

    useEffect(() => {
        setPaginationArray(prev => []) // Reset pagination

        if (totalList && listPerPage) {
            let arr = []
            for (let i = 0; i < paginationLength; i++) {
                arr.push(i + 1)
            }

            if (arr.length <= 30) {
                setPaginationArray(arr)
            } else {
                let paginationLastPortion = page >= paginationLength - listPerPage ? [] : ['...', ...arr.slice(arr.length - 5, arr.length)]
                // let hasMore = 
                setPaginationArray(prev =>
                    [...new Set(
                        [...arr.slice((page >= 10 ? page - 10 : 0), (page >= 10 ? page + 10 : 15)), ...paginationLastPortion]
                    )])
            }
        } else {
            const startFrom = page >= 6 ? page - 5 : 1
            setPaginationArray(Array.from({ length: 20 }, (_, i) => i + startFrom))
        }



    }, [page, totalList, listPerPage])

    const gotoPageHandler = (e) => {
        e.preventDefault()
        let pageVal = Number(goToPageRef.current.value)
        if (!goToPageRef.current.value?.trim() || pageVal > paginationLength || pageVal <= 0) return false;
        clickHandler(pageVal)
    }


    return (
        <>
            {/* <h6>grg</h6> */}
            {
                hasData(paginationArray) && (
                    <div className="flex items-center space-x-3">
                        <div className="flex justify-center items-center gap-2 md:justify-start flex-wrap">
                            <button type="button" className={`h-6 px-2 flex-shrink-0 flex_center shadow rounded hover:shadow-md text-xs cursor-pointer bg-white select-none text-gray-700 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed`} disabled={page <= 1} onClick={() => clickHandler(1)}>
                                <BsChevronDoubleLeft className="w-3 h-3 mt-[-2px]" />
                            </button>
                            <button type="button" className={`h-6 px-2 flex-shrink-0 flex_center shadow rounded hover:shadow-md text-xs cursor-pointer bg-white select-none text-gray-700 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed`} disabled={page <= 1} onClick={() => clickHandler(page - 1)}>
                                <BsChevronLeft className="w-3 h-3 mr-1.5 mt-[-2px]" />
                                Prev
                            </button>
                            {paginationArray.map((e) => (
                                <button type="button" key={e} className={`min-w-6 min-h-6 py-0.5 px-1.5 flex_center select-none shadow rounded hover:shadow-md text-xs cursor-pointer ${page === e ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-blue-100'}`} onClick={() => e !== '...' && clickHandler(e)}>
                                    {e}
                                </button>
                            ))}

                            <button type="button" disabled={page >= paginationLength} className={`h-6 px-2 flex-shrink-0 flex_center shadow rounded hover:shadow-md text-xs cursor-pointer bg-white select-none text-gray-700 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed`} onClick={() => clickHandler(page + 1)}>
                                Next
                                <BsChevronRight className="w-3 h-3 ml-1.5 mt-[-2px]" />
                            </button>
                            <button type="button" disabled={page >= paginationLength} className={`h-6 px-2 flex-shrink-0 flex_center shadow rounded hover:shadow-md text-xs cursor-pointer bg-white select-none text-gray-700 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed`} onClick={() => clickHandler(paginationLength)}>
                                <BsChevronDoubleRight className="w-3 h-3 mt-[-2px]" />
                            </button>
                        </div>

                        {/* Go to page */}
                        <form onSubmit={gotoPageHandler}>
                            <input type="number" className="w-8 min-h-6 py-0.5 px-0.5 flex_center select-none shadow rounded hover:shadow-md text-xs focus:outline-none border border-blue-600 text-center" ref={goToPageRef} />
                        </form>
                    </div>
                )
            }
        </>

    )
}

export default Pagination
