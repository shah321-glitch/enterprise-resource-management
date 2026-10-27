import React from 'react';
import { cn } from '../../lib/utils.js';

export const Table = ({ className, children, ...props }) => (
  <div className="relative w-full overflow-auto rounded-lg border border-border">
    <table className={cn('w-full caption-bottom text-sm', className)} {...props}>
      {children}
    </table>
  </div>
);

export const TableHeader = ({ className, children, ...props }) => (
  <thead className={cn('[&_tr]:border-b bg-muted/40', className)} {...props}>
    {children}
  </thead>
);

export const TableBody = ({ className, children, ...props }) => (
  <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props}>
    {children}
  </tbody>
);

export const TableRow = ({ className, children, ...props }) => (
  <tr
    className={cn(
      'border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
      className
    )}
    {...props}
  >
    {children}
  </tr>
);

export const TableHead = ({ className, children, ...props }) => (
  <th
    className={cn(
      'h-10 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
      className
    )}
    {...props}
  >
    {children}
  </th>
);

export const TableCell = ({ className, children, ...props }) => (
  <td className={cn('p-4 align-middle [&:has([role=checkbox])]:pr-0', className)} {...props}>
    {children}
  </td>
);

