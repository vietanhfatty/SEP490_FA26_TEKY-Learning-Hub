import React, { useState } from 'react';
import { HomePage } from './pages/home/HomePage';
import { LoginPage } from './pages/auth/LoginPage';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { ParentDashboard } from './pages/parent/ParentDashboard';
import type { UserRole } from '@teky/shared';

export function App() {
  const [currentView, setCurrentView] = useState<'home' | 'login' | 'student' | 'parent'>('home');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-md">
            T
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">TEKY Learning Hub</h1>
            <p className="text-xs text-blue-600 font-medium">Cổng Học sinh & Phụ huynh</p>
          </div>
        </div>

        <nav className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView('home')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              currentView === 'home' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Trang chủ
          </button>
          <button
            onClick={() => setCurrentView('login')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              currentView === 'login' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Đăng nhập
          </button>
          <button
            onClick={() => setCurrentView('student')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              currentView === 'student' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Học sinh
          </button>
          <button
            onClick={() => setCurrentView('parent')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              currentView === 'parent' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Phụ huynh
          </button>
        </nav>
      </header>

      <main>
        {currentView === 'home' && <HomePage onNavigateToLogin={() => setCurrentView('login')} onSelectRole={(role) => setCurrentView(role === 'student' ? 'student' : 'parent')} />}
        {currentView === 'login' && <LoginPage onLoginSuccess={(role) => setCurrentView(role === 'student' ? 'student' : 'parent')} />}
        {currentView === 'student' && <StudentDashboard />}
        {currentView === 'parent' && <ParentDashboard />}
      </main>
    </div>
  );
}

