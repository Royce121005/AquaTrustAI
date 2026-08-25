export default function Table({ columns, rows, getRowKey = (_, index) => index, emptyMessage = 'No records found.' }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 ${
                  column.headerClassName ?? ''
                }`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr key={getRowKey(row, rowIndex)} className="transition-colors hover:bg-slate-50">
                {columns.map((column) => (
                  <td key={column.key} className={`whitespace-nowrap px-4 py-3 text-slate-700 ${column.className ?? ''}`}>
                    {column.render ? column.render(row) : (row[column.key] ?? '\u2014')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
