import { useContext, useState } from 'react';
import { useAsyncDebounce } from 'react-table';
import Input from '../Input';
import { reactTableContext } from './Table';
import TableSettings from './table-settings/TableSettings';
import TableGlobalSearch from './TableGlobalSearch';

function TableTopBar() {
    const { tableTitle, tableSubTitle, disableGlobalSearch, disableSetting, enableLocalSearch, tableInstance } =
        useContext(reactTableContext);

    const { preGlobalFilteredRows, state, setGlobalFilter } = tableInstance
    return (
        <div className='_s_table_topbar'>
            {/* Table Title and Subtitle ----Start---- */}
            <div>
                {tableTitle && <h3 className='_s_table_title'>{tableTitle}</h3>}
                {tableSubTitle && <p className='_s_table_subtitle'>{tableSubTitle}</p>}
            </div>
            {/* Table Title and Subtitle ----Starend---- */}
            {/* Table Global Search and Setting Modal Toggle Button ----Start---- */}
            <div className='_s_topbar_global_search_and_table_setting_wrapper' style={{
                ...(disableGlobalSearch ? { height: 'auto' } : {})
            }} >
                <TableGlobalSearch />
                {enableLocalSearch && <GlobalFilter
                    preGlobalFilteredRows={preGlobalFilteredRows}
                    globalFilter={state.globalFilter}
                    setGlobalFilter={setGlobalFilter}
                />}
                {!disableSetting && <TableSettings />}
            </div>
            {/* Table Global Search and Setting Modal Toggle Button ----End---- */}
        </div>
    );
}

export default TableTopBar;


function GlobalFilter({
    preGlobalFilteredRows,
    globalFilter,
    setGlobalFilter,
}) {
    const count = preGlobalFilteredRows.length
    const [value, setValue] = useState(globalFilter)
    const onChange = useAsyncDebounce(value => {
        setGlobalFilter(value || undefined)
    }, 200)

    return (
        <span>
            <Input
                value={value || ""}
                onChange={e => {
                    setValue(e.target.value);
                    onChange(e.target.value);
                }}
                placeholder={`Search ${count} players...`}
            />
        </span>
    )
}
