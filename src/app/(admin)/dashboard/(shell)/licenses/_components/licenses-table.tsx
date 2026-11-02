'use client';

import { format } from 'date-fns';
import { KeyRound } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { LicenseStatusBadge } from './license-status-badge';
import type { LicenseListItem } from './types';

interface LicensesTableProps {
  items: LicenseListItem[];
  children?: React.ReactNode;
}

export function LicensesTable({ items, children }: LicensesTableProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3 font-semibold">License ID</th>
              <th className="px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3 font-semibold">Owner</th>
              <th className="px-6 py-3 font-semibold">Issued / Expires</th>
              <th className="px-6 py-3 font-semibold">Reassignments</th>
              <th className="px-6 py-3 font-semibold">Last Validated</th>
              <th className="px-6 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-slate-500"
                >
                  <KeyRound className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                  No licenses found matching your criteria.
                </td>
              </tr>
            ) : (
              items.map(lic => (
                <tr
                  key={lic.id}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition"
                >
                  <td className="px-6 py-4 font-mono font-medium text-slate-900 dark:text-slate-100">
                    <Link
                      href={`/dashboard/licenses/${lic.publicId}`}
                      className="hover:underline text-primary"
                    >
                      {lic.publicId}
                    </Link>
                    <div className="text-xs text-slate-400 font-sans mt-0.5">
                      Product: {lic.productId} (max 1 install)
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <LicenseStatusBadge status={lic.status} />
                  </td>
                  <td className="px-6 py-4">
                    {lic.ownerName ? (
                      <div>
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {lic.ownerName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {lic.ownerEmail}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs italic">
                        Unassigned
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400">
                    <div>
                      Issued: {format(new Date(lic.issuedAt), 'yyyy-MM-dd')}
                    </div>
                    {lic.expiresAt && (
                      <div className="text-slate-400">
                        Expires:{' '}
                        {format(new Date(lic.expiresAt), 'yyyy-MM-dd')}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono">
                    {lic.reassignmentCount}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {lic.lastValidatedAt
                      ? format(
                          new Date(lic.lastValidatedAt),
                          'yyyy-MM-dd HH:mm'
                        )
                      : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/dashboard/licenses/${lic.publicId}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {children}
    </div>
  );
}
