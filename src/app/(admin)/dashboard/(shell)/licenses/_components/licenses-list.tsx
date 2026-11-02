'use client';

import { useState } from 'react';
import { IssueLicenseDialog } from './issue-license-dialog';
import { LicensesPagination } from './licenses-pagination';
import { LicensesTable } from './licenses-table';
import { LicensesToolbar } from './licenses-toolbar';
import type { LicensesListProps } from './types';

export type { LicenseListItem, LicensesListProps } from './types';

export function LicensesList({
  items,
  total,
  page,
  limit,
  totalPages,
  currentSearch = '',
  currentStatus = '',
}: LicensesListProps) {
  const [isIssueOpen, setIsIssueOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Search, status filter, and issue trigger */}
      <LicensesToolbar
        currentSearch={currentSearch}
        currentStatus={currentStatus}
        onOpenIssueModal={() => setIsIssueOpen(true)}
      />

      {/* Table with integrated pagination footer */}
      <LicensesTable items={items}>
        <LicensesPagination
          currentCount={items.length}
          total={total}
          page={page}
          totalPages={totalPages}
          currentSearch={currentSearch}
          currentStatus={currentStatus}
        />
      </LicensesTable>

      {/* Shadcn Form-driven Issue License Modal */}
      <IssueLicenseDialog
        open={isIssueOpen}
        onOpenChange={setIsIssueOpen}
      />
    </div>
  );
}
