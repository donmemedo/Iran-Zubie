"use client";

import type { ReactNode } from "react";

import { clsx } from "@/lib/format";

export interface Column<Row> {
  key: string;
  header: string;
  cell: (row: Row) => ReactNode;
  className?: string;
  /** Numeric columns get tabular figures and end alignment. */
  numeric?: boolean;
  hideBelow?: "sm" | "md" | "lg";
}

const hideClass = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
};

export function DataTable<Row extends { id: number | string }>({
  columns,
  rows,
  onRowClick,
  empty,
}: {
  columns: Column<Row>[];
  rows: Row[];
  onRowClick?: (row: Row) => void;
  empty?: ReactNode;
}) {
  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="w-full border-collapse text-start">
        <thead>
          <tr className="border-b border-[var(--line)]">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={clsx(
                  "whitespace-nowrap px-4 py-3 text-[11.5px] font-medium uppercase tracking-wide text-ink-muted",
                  column.numeric ? "text-end" : "text-start",
                  column.hideBelow && hideClass[column.hideBelow],
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={clsx(
                "border-b border-[var(--line)] transition-colors last:border-0",
                onRowClick && "cursor-pointer hover:bg-[var(--surface-sunken)]",
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={clsx(
                    "px-4 py-3 text-[13px] text-ink",
                    column.numeric ? "tnum text-end" : "text-start",
                    column.hideBelow && hideClass[column.hideBelow],
                    column.className,
                  )}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
