import axios from 'axios';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useColumnOrder, useGlobalFilter, useTable } from 'react-table';
import { getLocal, getSession } from '../../utils/localStorage.utils';
import ErrorIndicator from './ErrorIndicator';
import LoadingIndicator from './LoadingIndicator';
import NoResultIndicator from './NoResultIndicator';
import Pagination from './Pagination';
import ColumnShowHideMove from './table-settings/ColumnShowHideMove';
import './table.scss';
import TableHeader from './TableHeader';
import TableTopBar from './TableTopBar';

export const reactTableContext = React.createContext();

const token = getLocal('token') || getSession('token')

function Table({
    reloadRefFunc,
    columns = [],
    rowsPerPageOptions = [5, 10, 20, 50],
    rowsPerPageDefaultValue = 10,
    pageString = 'page',
    limitString = 'limit',
    queryString = 'q',
    tableId,
    tableTitle,
    tableSubTitle = '',
    fetch,
    url,
    selectData,
    selectError,
    globalSearchPlaceholder,
    disableGlobalSearch,
    disableRowsPerPage,
    disablePagination,
    disableSetting,
    boundaryCount,
    siblingCount,
    hideFirstButton,
    hideLastButton,
    hidePrevButton,
    hideNextButton,
    customGlobalSearch,
    enableLocalSearch
}) {
    if (!tableId) throw new Error('An unique table id is required');

    const setBlankInitialStates = () => {
        const defaultBlankStates = {
            initialHiddenColumns: [],
            initialColumnOrder: [],
        };
        localStorage.setItem(tableId, JSON.stringify(defaultBlankStates));
        return localStorage.getItem(tableId);
    };

    const initialStatesInJSON = localStorage.getItem(tableId) || setBlankInitialStates();
    const { initialHiddenColumns, initialColumnOrder } = JSON.parse(initialStatesInJSON);

    const rowsPerPageHandler = (e) => {
        if (disableRowsPerPage) return;
        const rowsPerPageState = parseInt(e.target.value);
        const checkPageLimit = Math.ceil(parseInt(totalDataCount) / parseInt(rowsPerPageState));
        if (checkPageLimit < page) {
            onPageChangeHandler(checkPageLimit);
        }
        setSearchParams((prevState) => {
            return { ...prevState, [limitString]: rowsPerPageState };
        });
    };

    const onPageChangeHandler = (currentPage) => {
        if (currentPage === page) return;
        setPage(currentPage);
        setSearchParams((prevState) => {
            return { ...prevState, [pageString]: currentPage };
        });
    };

    // For adding extra search param from outside oof the component
    const addSearchParam = useCallback((searchParamKey, searchParamValue) => {
        if (!searchParamKey || !searchParamValue)
            throw new Error('searchParamKey & searchParamValue is required for custom search'); // Validating params
        setSearchParams((prevState) => {
            if (prevState[searchParamKey] === searchParamValue) return prevState; // Preventing unwanted network request
            return {
                ...prevState,
                [searchParamKey]: searchParamValue,
                [pageString]: 1,
            };
        });
        setPage(1);
    });

    // For removing extra search param from outside oof the component
    const removeSearchParam = useCallback((searchParamKey) => {
        setSearchParams((prevState) => {
            delete prevState[searchParamKey];
            return {
                ...prevState,
                [pageString]: 1,
            };
        });
        setPage(1);
    })

    // Rows per page default value
    const _rowsPerPageDefaultValue = useMemo(() => {
        return rowsPerPageOptions?.includes(rowsPerPageDefaultValue)
            ? rowsPerPageDefaultValue
            : rowsPerPageOptions[0];
    }, [rowsPerPageDefaultValue, rowsPerPageOptions]);

    const [loading, setLoading] = useState(false); // Loading table data state
    const [errorLoadingData, setErrorLoadingData] = useState(false); // Error loading table data state
    const [tableData, setTableData] = useState([]); // Table data state
    const [totalDataCount, setTotalDataCount] = useState(null); // Table data state
    const [page, setPage] = useState(1);

    const [refreshFetcher, setRefreshFetcher] = useState(false);

    const toggleRefreshFetcher = () => setRefreshFetcher(prev => !prev)


    const [searchParams, setSearchParams] = useState({
        [limitString]: _rowsPerPageDefaultValue,
        [pageString]: page,
    });

    const tableColumns = useMemo(() => columns, [columns]); // Table columns state

    // Data Fetcher Function ----Start----
    const dataFetcher = useCallback(async () => {
        let binSearchParams = '';
        Object.keys(searchParams).forEach((key, index) => {
            if (searchParams[key]) {
                binSearchParams += `${key}=${searchParams[key]}${index + 1 !== Object.keys(searchParams).length ? '&' : ''
                    }`;
            }
        });


        setLoading(true);
        setErrorLoadingData(false);

        const states = {
            ...searchParams,
        };

        let result;

        if (fetch && typeof fetch === 'function') {
            result = await fetch(binSearchParams, states);
        } else {
            axios(`${process.env.REACT_APP_API_ENDPOINT + url}?${binSearchParams}`, {
                headers: {
                    authorization: token
                },
            }).then((res) => {
                result = selectData(res)
            }).catch(error => {
                if (selectError && typeof selectError === 'function') {
                    result = selectError(error)
                }
            }).finally(() => {
                if (result?.data) {
                    setTableData(result.data);
                    setTotalDataCount(result?.total);
                } else {
                    const errorMessage =
                        result && typeof result === 'string'
                            ? result
                            : !window.navigator.onLine
                                ? 'You are offline.'
                                : 'Something went wrong';
                    setTableData([]);
                    setErrorLoadingData(errorMessage);
                }
                setLoading(false);
            })
        }

    }, [fetch, searchParams, selectData, selectError, url, refreshFetcher]);
    // Data Fetcher Function ----End----

    // Calling the fetcher function to load api data
    useEffect(() => {
        dataFetcher();
    }, [searchParams, dataFetcher]);

    useEffect(() => {
        reloadRefFunc.current = toggleRefreshFetcher
    }, [])

    const tableInstance = useTable(
        {
            data: tableData,
            columns: tableColumns,
            initialState: {
                hiddenColumns: initialHiddenColumns,
                columnOrder: initialColumnOrder,
            },
        },
        useColumnOrder,
        useGlobalFilter
    );

    // Distructuring table tableInstance Object
    const {
        getTableProps,
        getTableBodyProps,
        prepareRow,
        headerGroups,
        rows,
        state,
        allColumns,
        visibleColumns,
    } = tableInstance;
    const { hiddenColumns, columnOrder } = state;

    useEffect(() => {
        localStorage.setItem(
            tableId,
            JSON.stringify({
                initialHiddenColumns: hiddenColumns,
                initialColumnOrder: columnOrder,
            })
        );
    }, [hiddenColumns, columnOrder, tableId]);

    // Context api data
    const contextApiData = {
        searchParams,
        queryString,
        pageString,
        setPage,
        // setSearchParams,
        addSearchParam,
        removeSearchParam,
        tableInstance,
        tableTitle,
        tableSubTitle,
        disableGlobalSearch,
        disableSetting,
        loading,
        globalSearchPlaceholder,
        customGlobalSearch,
        enableLocalSearch
    };

    return (
        <div className='_s_react_table_wrapper'>
            {/* Table Top Search Bar and Setting ----Start---- */}
            {(tableTitle || !disableGlobalSearch || !disableSetting) && (
                <reactTableContext.Provider value={contextApiData}>
                    <TableTopBar />
                </reactTableContext.Provider>
            )}
            {/* Table Top Search Bar and Setting ----End---- */}

            {/* Table ----Start---- */}
            <div className='_s_table_wrapper'>
                <table {...getTableProps()} className='_s_react_table'>
                    {/* Table Header ----Start---- */}
                    <TableHeader headerGroups={headerGroups} />
                    {/* Table Header ----End---- */}

                    {/* Table Body ----Start---- */}
                    <tbody {...getTableBodyProps()}>
                        {/* {(errorLoadingData || loading) && ( */}
                        <tr className='_s_table_indicator_tr'>
                            <td colSpan='100%'>
                                {loading && <LoadingIndicator data={tableData} />}
                                {errorLoadingData && (
                                    <ErrorIndicator
                                        error={errorLoadingData}
                                        retryFunc={dataFetcher}
                                    />
                                )}
                                {!loading && !errorLoadingData && tableData?.length <= 0 && (
                                    <NoResultIndicator />
                                )}

                                {/* All Columns Hidden Warning */}
                                {tableData?.length > 0 &&
                                    visibleColumns?.length === 0 &&
                                    allColumns?.length !== 0 && (
                                        <div className='all_column_hidden_indicator'>
                                            <div className='all_column_hidden_indicator_scroller'>
                                                <h3>All column is hidden</h3>
                                                <ColumnShowHideMove
                                                    table_instance={tableInstance}
                                                />
                                            </div>
                                        </div>
                                    )}
                            </td>
                        </tr>
                        {/* )} */}
                        {rows.map((row) => {
                            prepareRow(row);
                            return (
                                <tr {...row.getRowProps()}>
                                    {row.cells.map((cell) => {
                                        return (
                                            <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                    {/* Table Body ----End---- */}
                </table>
            </div>
            {/* Table ----End---- */}

            {/* Table Pagination and rows per page section ----Start---- */}
            {(!disablePagination || !disableRowsPerPage) && (
                <div className='_s_pagination_and_rows_per_page_wrapper'>
                    {/* Pagination ----Start---- */}
                    {!disablePagination && (
                        <Pagination
                            count={Math.ceil(totalDataCount / searchParams[limitString])}
                            page={page <= 0 ? 1 : page}
                            onChange={onPageChangeHandler}
                            boundaryCount={boundaryCount}
                            siblingCount={siblingCount}
                            hideFirstButton={hideFirstButton}
                            hideLastButton={hideLastButton}
                            hidePrevButton={hidePrevButton}
                            hideNextButton={hideNextButton}
                        />
                    )}
                    {/* Pagination ----End---- */}

                    {/* Rows per page ----Start---- */}
                    {!disableRowsPerPage && (
                        <label
                            className='_s_rows_per_page_select_wrapper'
                            style={{ ...(disablePagination && { marginLeft: 'auto' }) }}
                        >
                            <select
                                defaultValue={searchParams[limitString]}
                                onChange={rowsPerPageHandler}
                                className='_s_rows_per_page_select'
                            >
                                {rowsPerPageOptions.map((option, index) => (
                                    <option value={option} key={index}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                            <div className='_s_select_arrow_wrapper'>
                                <svg
                                    stroke='currentColor'
                                    fill='none'
                                    strokeWidth='2'
                                    viewBox='0 0 24 24'
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    height='1em'
                                    width='1em'
                                    xmlns='http://www.w3.org/2000/svg'
                                >
                                    <polyline points='6 9 12 15 18 9'></polyline>
                                </svg>
                            </div>
                        </label>
                    )}
                    {/* Rows per page ----End---- */}
                </div>
            )}
            {/* Table Pagination and rows per page section ----End---- */}
        </div>
    );
}

/**
 *
 * Table is a all in one reusable data management table,
 *
 * You must have to install
 * npm i react-table axios sass react-sortable-hoc array-move package
 *
 */
export default Table;
