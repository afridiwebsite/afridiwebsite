import { useMemo } from 'react';
import './pagination.scss';

function Pagination({
    count,
    boundaryCount = 1,
    siblingCount = 1,
    hideFirstButton = false,
    hideLastButton = false,
    hidePrevButton = false,
    hideNextButton = false,
    page = 1,
    onChange,
}) {
    // Simple validation
    // if (!count) throw new Error('count property is required');
    // if (!page) throw new Error('page property is required');
    if (!onChange) throw new Error('onChange function is required');
    if (typeof onChange !== 'function') throw new Error('onChange must be a function');
    //xxxxxxxxxxxx//

    const hasCount = count && typeof count === 'number' ? true : false;

    const goToPageHandler = (page) => {
        if (page >= 1 && page <= count) onChange(page);
    };
    const firstPageHandler = () => {
        onChange(1);
    };
    const lastPageHandler = () => {
        onChange(count);
    };

    const nextPageHandler = () => {
        if (page < count && hasCount) return onChange(page + 1);
        else onChange(page + 1);
    };
    const previousPageHandler = () => {
        if (page > 1 && hasCount) return onChange(page - 1);
        else onChange(page - 1);
    };

    const arrayRange = function (from, to) {
        if (from > to || typeof from !== 'number' || typeof to !== 'number') return [];
        const newArray = [];
        for (let i = from; i <= to; i++) {
            newArray.push(i);
        }
        return newArray;
    };

    const paginationArray = useMemo(() => {
        if (!hasCount) return [null];

        const startPage = 1; // Start Page
        const startPageSQ = startPage + startPage;
        const siblingSQ = siblingCount + siblingCount;
        let firstPortionLength = siblingSQ + boundaryCount + startPageSQ;

        let firstPortion = [];
        let middlePortion = [];
        let lastPortion = [];

        // this calculation check that sibling part of pagination should genarate or not eg: ['...', 4, 5, 6, '...']
        const siblingPortion = page + siblingCount > firstPortionLength;

        /**
         * this calculation check that last part of pagination should genarate or not.
         * if true then what will be the limit
         * eg: ['...', 8, 9, 10]
         */
        let limit = count - (boundaryCount ? boundaryCount + startPage : startPage) - siblingCount;

        if (siblingPortion) {
            firstPortion = boundaryCount ? arrayRange(startPage, boundaryCount) : [];
        } else {
            firstPortion = arrayRange(startPage, firstPortionLength);
        }

        if (siblingPortion && page < limit) {
            middlePortion = siblingCount
                ? arrayRange(page - siblingCount, page + siblingCount)
                : [page];
        }

        if (page >= limit) {
            middlePortion = [];
            lastPortion = arrayRange(limit - siblingCount, count);
        } else {
            lastPortion = boundaryCount ? arrayRange(count + startPage - boundaryCount, count) : [];
        }

        // Binding all array of blocks
        let allArrays = [...firstPortion, ...middlePortion, ...lastPortion];

        // Checking if total genarated pages is bigger then the 'count' limit
        // if limit exceded then return array, range from 'startPage' to 'count'
        if (allArrays.length >= count) {
            return arrayRange(startPage, count);
        }

        // Adding ellipsis
        if (middlePortion.length) {
            middlePortion.unshift('...');
            middlePortion.push('...');
        } else if (page >= limit) {
            lastPortion.unshift('...');
        } else {
            firstPortion.push('...');
        }

        // finally return the actual pagination array
        return [...firstPortion, ...middlePortion, ...lastPortion];
    }, [count, boundaryCount, siblingCount, page, hasCount]);

    return (
        <div className='_s_pagination_btn_wrapper'>
            {/* First page button ----Start---- */}
            {!hideFirstButton && (
                <button onClick={firstPageHandler} disabled={page <= 1}>
                    <svg
                        stroke='currentColor'
                        fill='currentColor'
                        strokeWidth='0'
                        viewBox='0 0 24 24'
                        xmlns='http://www.w3.org/2000/svg'
                    >
                        <path fill='none' d='M24 0v24H0V0h24z' opacity='.87'></path>
                        <path d='M18.41 16.59L13.82 12l4.59-4.59L17 6l-6 6 6 6 1.41-1.41zM6 6h2v12H6V6z'></path>
                    </svg>
                </button>
            )}
            {/* First page button ----End---- */}

            {/* Previous page button ----Start---- */}
            {(!hidePrevButton || !hasCount) && (
                <button disabled={page <= 1} onClick={previousPageHandler}>
                    <svg
                        stroke='currentColor'
                        fill='none'
                        strokeWidth='2'
                        viewBox='0 0 24 24'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        xmlns='http://www.w3.org/2000/svg'
                    >
                        <polyline points='15 18 9 12 15 6'></polyline>
                    </svg>
                </button>
            )}
            {/* Previous page button ----End---- */}

            {/* Go to page button ----Start---- */}
            {paginationArray.map((currentPage, i) => {
                if (!currentPage) return null;
                if (currentPage === '...')
                    return (
                        <span key={i} className='_s_pagination_ellipsis'>
                            {currentPage}
                        </span>
                    );
                return (
                    <button
                        className={page === currentPage ? '_s_active_page' : ''}
                        onClick={() => goToPageHandler(currentPage)}
                        key={i}
                    >
                        {currentPage}
                    </button>
                );
            })}
            {/* Go to page button ----End---- */}

            {/* If count not passed */}
            {!hasCount && <button className={'_s_active_page'}>{page}</button>}

            {/* Next page button ----Start---- */}
            {(!hideNextButton || !hasCount) && (
                <button disabled={hasCount && page >= count} onClick={nextPageHandler}>
                    <svg
                        stroke='currentColor'
                        fill='none'
                        strokeWidth='2'
                        viewBox='0 0 24 24'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        xmlns='http://www.w3.org/2000/svg'
                    >
                        <polyline points='9 18 15 12 9 6'></polyline>
                    </svg>
                </button>
            )}
            {/* Next page button ----End---- */}

            {/* Last page button ----Start---- */}
            {!hideLastButton && hasCount && (
                <button disabled={page >= count} onClick={lastPageHandler}>
                    <svg
                        stroke='currentColor'
                        fill='currentColor'
                        strokeWidth='0'
                        viewBox='0 0 24 24'
                        xmlns='http://www.w3.org/2000/svg'
                    >
                        <path fill='none' d='M0 0h24v24H0V0z' opacity='.87'></path>
                        <path d='M5.59 7.41L10.18 12l-4.59 4.59L7 18l6-6-6-6-1.41 1.41zM16 6h2v12h-2V6z'></path>
                    </svg>
                </button>
            )}
            {/* Last page button ----End---- */}
        </div>
    );
}

export default Pagination;
