import type { ReactNode } from "react";
import { cn } from "@utils/libs/cn";

interface TableProps {
  headers: { label: string; align?: "left" | "right" | "center" }[];
  children: ReactNode;
  /** Below this the wrapper scrolls horizontally instead of squashing columns. */
  minWidth?: string;
}

export function Table({ headers, children, minWidth = "500px" }: TableProps) {
  return (
    <div className="bg-surface border-border rounded-card overflow-hidden border shadow-card">
      <div className="overflow-x-auto">
        <table
          className="text-foreground-body w-full text-left text-xs"
          style={{ minWidth }}
        >
          <thead className="bg-surface-muted text-foreground-body border-border border-b font-bold">
            <tr>
              {/* Keyed by position, not label: `headers` is a fixed positional
                  list, and two columns may legitimately share a label. */}
              {headers.map((header, index) => (
                <th
                  key={index}
                  scope="col"
                  className={cn(
                    "px-3 py-2.5 whitespace-nowrap",
                    header.align === "right" && "text-right",
                    header.align === "center" && "text-center",
                  )}
                >
                  {header.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-border-subtle divide-y">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

export function TableRow({ children }: { children: ReactNode }) {
  return (
    <tr className="hover:bg-accent-soft/40 transition-colors">{children}</tr>
  );
}

export function TableCell({
  children,
  align,
  className,
}: {
  children: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <td
      className={cn(
        "px-3 py-2.5",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </td>
  );
}
