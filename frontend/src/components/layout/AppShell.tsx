import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';

export const AppShell: React.FC = () => {
  const location = useLocation();
  const isFullBleed =
    location.pathname.includes('/twin') ||
    location.pathname === '/digital-twin' ||
    location.pathname === '/simulator';
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-900 text-slate-100 font-sans">
      <TopBar />
      <div className="flex flex-1 overflow-hidden min-w-0">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        />
        <main
          className={
            isFullBleed
              ? 'flex-1 overflow-x-hidden overflow-y-auto bg-[#060a12] p-2 md:p-3 min-w-0'
              : 'flex-1 overflow-y-auto bg-slate-50 p-6 md:p-8 min-w-0 text-slate-900'
          }
        >
          <div
            className={
              isFullBleed
                ? 'w-full max-w-none min-w-0 space-y-3'
                : 'max-w-7xl mx-auto space-y-6'
            }
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
