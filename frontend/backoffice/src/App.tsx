import React, { useState } from 'react';
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { AcademicManagerDashboard } from './pages/academic-manager/AcademicManagerDashboard';
import { AdminDashboard } from './pages/system-admin/AdminDashboard';

export function App() {
  const [currentTab, setCurrentTab] = useState<'teacher' | 'manager' | 'admin'>('teacher');

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans">
      <header className="bg-slate-900 text-white border-b border-slate-800 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
            B
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">TEKY Backoffice</h1>
            <p className="text-xs text-slate-400">Hệ thống Quản trị & Đào tạo Nội bộ</p>
          </div>
        </div>

        <nav className="flex items-center gap-2">
          <button
            onClick={() => setCurrentTab('teacher')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              currentTab === 'teacher' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Giảng viên
          </button>
          <button
            onClick={() => setCurrentTab('manager')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              currentTab === 'manager' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Quản lý học thuật
          </button>
          <button
            onClick={() => setCurrentTab('admin')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              currentTab === 'admin' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Quản trị hệ thống
          </button>
        </nav>
      </header>

      <main>
        {currentTab === 'teacher' && <TeacherDashboard />}
        {currentTab === 'manager' && <AcademicManagerDashboard />}
        {currentTab === 'admin' && <AdminDashboard />}
      </main>
    </div>
  );
}

