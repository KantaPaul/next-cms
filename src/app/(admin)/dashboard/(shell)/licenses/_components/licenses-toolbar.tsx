'use client';

import { Plus, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface LicensesToolbarProps {
  currentSearch?: string;
  currentStatus?: string;
  onOpenIssueModal: () => void;
}

export function LicensesToolbar({
  currentSearch = '',
  currentStatus = '',
  onOpenIssueModal,
}: LicensesToolbarProps) {
  const router = useRouter();
  const [search, setSearch] = useState(currentSearch);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (currentStatus) params.set('status', currentStatus);
    params.set('page', '1');
    router.push(`/dashboard/licenses?${params.toString()}`);
  };

  const handleStatusFilter = (status: string) => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (status) params.set('status', status);
    params.set('page', '1');
    router.push(`/dashboard/licenses?${params.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
      <form
        onSubmit={handleSearch}
        className="flex items-center gap-2 flex-1 max-w-md"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search public ID or prefix..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <Button type="submit" variant="outline" size="sm">
          Search
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <select
          value={currentStatus}
          onChange={e => handleStatusFilter(e.target.value)}
          className="text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="expired">Expired</option>
          <option value="revoked">Revoked</option>
        </select>

        <Button onClick={onOpenIssueModal} className="gap-2">
          <Plus className="w-4 h-4" />
          Issue License
        </Button>
      </div>
    </div>
  );
}
