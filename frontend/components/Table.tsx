import { ReactNode } from 'react';
import { SkeletonTable } from './Skeleton';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => ReactNode;
  sortable?: boolean;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
  emptyComponent?: ReactNode;
  onRowClick?: (item: T, index: number) => void;
  rowClassName?: (item: T, index: number) => string;
  stickyHeader?: boolean;
}

export default function Table<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  emptyMessage = 'No data available',
  emptyComponent,
  onRowClick,
  rowClassName,
  stickyHeader = false,
}: TableProps<T>) {
  if (loading) {
    return <SkeletonTable rows={5} />;
  }

  if (data.length === 0) {
    if (emptyComponent) {
      return <>{emptyComponent}</>;
    }
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-slate-400">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <div className="overflow-x-auto -mx-6">
      <table className="w-full min-w-full">
        <thead className={stickyHeader ? 'sticky top-0 bg-slate-800 z-10' : ''}>
          <tr className="border-b border-white/5">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`
                  py-3 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider
                  ${alignClasses[column.align || 'left']}
                  ${column.className || ''}
                `}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {data.map((item, index) => (
            <tr
              key={index}
              onClick={onRowClick ? () => onRowClick(item, index) : undefined}
              className={`
                transition-colors duration-150
                ${onRowClick ? 'cursor-pointer hover:bg-white/5' : 'hover:bg-white/[0.02]'}
                ${rowClassName ? rowClassName(item, index) : ''}
              `}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`
                    py-4 px-6 text-sm
                    ${alignClasses[column.align || 'left']}
                    ${column.className || ''}
                  `}
                >
                  {column.render 
                    ? column.render(item, index) 
                    : <span className="text-slate-300">{item[column.key]}</span>
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Compact table variant for dashboards
export function CompactTable<T extends Record<string, any>>(props: TableProps<T>) {
  return (
    <Table
      {...props}
      columns={props.columns.map(col => ({
        ...col,
        className: `${col.className || ''} py-2 px-4`,
      }))}
    />
  );
}
