function TableHeader({ headerGroups }) {
    return (
        <thead>
            {headerGroups.map(headerGroup => (
                <tr {...headerGroup.getHeaderGroupProps()}>
                    {headerGroup.headers.map(column => (
                        <th {...column.getHeaderProps([{ className: column.className }])}>
                            {column.render('Header')}
                        </th>
                    ))}
                </tr>
            ))}
        </thead>
    )
}

export default TableHeader
