import { arrayMoveImmutable } from 'array-move';
import { useContext, useState } from 'react';
import { SortableContainer, SortableElement, SortableHandle } from 'react-sortable-hoc';
import { reactTableContext } from '../Table';
import TableCheckbox from '../TableCheckbox';

function ColumnShowHideMove({ table_instance }) {
    // table instance context api
    const tableContext = useContext(reactTableContext);

    // distructuring table instance
    const { visibleColumns, allColumns, setColumnOrder, getToggleHideAllColumnsProps } =
        table_instance || tableContext.tableInstance;

    const columnIds = allColumns.map((column) => column.id);
    const [items, setItems] = useState(columnIds);

    const sortEndHandler = ({ oldIndex, newIndex }) => {
        setItems((prevItems) => {
            const newColumnOrder = arrayMoveImmutable(prevItems, oldIndex, newIndex);
            setColumnOrder(newColumnOrder);
            return newColumnOrder;
        });
    };

    const { indeterminate } = getToggleHideAllColumnsProps();
    const is_indeterminate = indeterminate === 0 || indeterminate === false ? undefined : true;

    return (
        <div style={{ padding: '6px 0' }}>
            <div className='_s_column_show_hide_list'>
                <label tabIndex={0}>
                    <TableCheckbox
                        className='_s_cstm_table_checkbox'
                        indeterminate={is_indeterminate}
                        {...getToggleHideAllColumnsProps()}
                    />
                    <p>{`${
                        visibleColumns.length === allColumns.length ? 'Hide' : 'Show'
                    } all columns`}</p>
                </label>
            </div>
            <SortableList
                axis='y'
                lockAxis='y'
                items={items}
                allColumns={allColumns}
                onSortEnd={sortEndHandler}
                useDragHandle
                helperClass='dragging_element'
            />
        </div>
    );
}

export default ColumnShowHideMove;

const DragHandle = SortableHandle(() => (
    <div className='_s_drag_handler'>
        <svg
            stroke='currentColor'
            fill='currentColor'
            strokeWidth='0'
            viewBox='0 0 24 24'
            height='1.2em'
            width='1.2em'
            xmlns='http://www.w3.org/2000/svg'
        >
            <path fill='none' d='M0 0h24v24H0z'></path>
            <path d='M20 9H4v2h16V9zM4 15h16v-2H4v2z'></path>
        </svg>
    </div>
));

const SortableItem = SortableElement(({ column }) => {
    return (
        <div className='_s_column_show_hide_list'>
            <label tabIndex={0}>
                <TableCheckbox
                    className='_s_cstm_table_checkbox'
                    {...column.getToggleHiddenProps()}
                />
                <p>{column.Header}</p>
            </label>
            <DragHandle />
        </div>
    );
});

const SortableList = SortableContainer(({ items, allColumns }) => {
    const columns = items.map((item) => allColumns.filter((column) => column.id === item)[0]);
    return (
        <div>
            {columns.map(
                (column, index) =>
                    items.includes(column.id) && (
                        <SortableItem key={index} index={index} column={column} />
                    )
            )}
        </div>
    );
});
