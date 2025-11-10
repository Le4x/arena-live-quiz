/**
 * AdminLayout - Layout principal de l'interface admin/régie
 * Design moderne avec sidebar de navigation et header
 */

import { ReactNode } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

interface AdminLayoutProps {
  children: ReactNode;
  currentSection: string;
  onSectionChange: (section: string) => void;
  sessionName?: string;
  connectedTeamsCount?: number;
}

export const AdminLayout = ({
  children,
  currentSection,
  onSectionChange,
  sessionName,
  connectedTeamsCount = 0,
}: AdminLayoutProps) => {
  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden">
      {/* Sidebar Navigation */}
      <AdminSidebar
        currentSection={currentSection}
        onSectionChange={onSectionChange}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <AdminHeader
          sessionName={sessionName}
          connectedTeamsCount={connectedTeamsCount}
        />

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
