
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileCheck, 
  Files, 
  Users, 
  Settings, 
  LogOut,
  Menu,
  Bell,
  PenTool,
  Tractor,
  X
} from 'lucide-react';
import ChecklistList from './components/ChecklistList';
import CreateTemplate from './components/CreateTemplate';
import ChecklistDetail from './components/ChecklistDetail';
import ChecklistSubmission from './components/ChecklistSubmission';
import ChecklistToFillList from './components/ChecklistToFillList';
import ProducerList from './components/ProducerList';
import { DocumentStatus } from './types';

// Sidebar Component
const Sidebar = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const location = useLocation();
  
  // Hide sidebar on public submission page only (routes starting with /submit/)
  if (location.pathname.includes('/submit/')) return null;

  const isActive = (path: string) => {
    // Basic active check (starts with path to handle nested routes like /fill/:id)
    return location.pathname.startsWith(path) ? "bg-slate-800 text-emerald-400 border-l-4 border-emerald-500" : "text-slate-400 hover:text-white hover:bg-slate-800";
  };

  const sidebarClasses = `
    fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    md:translate-x-0 md:static md:flex md:flex-col md:flex-shrink-0 md:h-screen
  `;

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      <div className={sidebarClasses}>
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          <div className="text-2xl font-bold tracking-tighter text-emerald-500">MER<span className="text-white">X</span></div>
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 py-6 space-y-1 overflow-y-auto">
          <div className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Principal</div>
          <Link to="/dashboard" onClick={onClose} className={`flex items-center gap-3 px-6 py-3 text-sm font-medium ${isActive('/dashboard')}`}>
            <LayoutDashboard size={20} />
            Dashboard
          </Link>
          <Link to="/checklists" onClick={onClose} className={`flex items-center gap-3 px-6 py-3 text-sm font-medium ${isActive('/checklists')}`}>
            <FileCheck size={20} />
            Gestão de Checklist
          </Link>
          <Link to="/producers" onClick={onClose} className={`flex items-center gap-3 px-6 py-3 text-sm font-medium ${isActive('/producers')}`}>
            <Tractor size={20} />
            Produtores
          </Link>
          <Link to="/fill" onClick={onClose} className={`flex items-center gap-3 px-6 py-3 text-sm font-medium ${isActive('/fill')}`}>
            <PenTool size={20} />
            Preencher Checklist
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-slate-400 hover:text-white w-full transition-colors">
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </div>
    </>
  );
};

// Topbar Component
const Topbar = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const location = useLocation();
  // Hide topbar on public submission page
  if (location.pathname.includes('/submit/')) return null;

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8 flex-shrink-0 z-10">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="text-gray-500 hover:text-gray-700 md:hidden p-2 rounded-lg hover:bg-gray-100">
          <Menu size={24} />
        </button>
        <h2 className="text-gray-800 font-semibold text-lg hidden sm:block">Gestão de Contrapartes</h2>
        <span className="text-gray-800 font-semibold text-sm sm:hidden">MerX</span>
      </div>
      
      <div className="flex items-center gap-4 md:gap-6">
        <button className="relative text-gray-500 hover:text-emerald-600 transition-colors">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
        </button>
        <div className="flex items-center gap-3 border-l pl-4 md:pl-6 border-gray-200">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-gray-900">Usuário Admin</p>
            <p className="text-xs text-gray-500">admin@merx.com</p>
          </div>
          <div className="h-9 w-9 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold border border-emerald-200">
            MX
          </div>
        </div>
      </div>
    </header>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState({
    pendingVerification: 0,
    approved: 0,
    rejected: 0,
    missing: 0
  });

  useEffect(() => {
    // Read from localStorage to calculate real stats
    const storedTemplates = JSON.parse(localStorage.getItem('merx_templates') || '[]');
    let pendingVerification = 0;
    let approved = 0;
    let rejected = 0;
    let missing = 0;

    storedTemplates.forEach((template: any) => {
      if (template.items && Array.isArray(template.items)) {
        template.items.forEach((item: any) => {
          const status = item.status || DocumentStatus.MISSING;
          if (status === DocumentStatus.PENDING_VERIFICATION) pendingVerification++;
          else if (status === DocumentStatus.APPROVED) approved++;
          else if (status === DocumentStatus.REJECTED) rejected++;
          else if (status === DocumentStatus.MISSING) missing++;
        });
      }
    });

    setStats({ pendingVerification, approved, rejected, missing });
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Dashboard</h1>
      <p className="text-gray-600">Visão geral em tempo real dos documentos do sistema.</p>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col border-l-4 border-l-yellow-500">
          <p className="text-sm text-gray-500 font-medium uppercase">Pendente de Verificação</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{stats.pendingVerification}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col border-l-4 border-l-emerald-500">
          <p className="text-sm text-gray-500 font-medium uppercase">Aprovados</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{stats.approved}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col border-l-4 border-l-red-500">
          <p className="text-sm text-gray-500 font-medium uppercase">Rejeitados</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{stats.rejected}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col border-l-4 border-l-gray-300">
          <p className="text-sm text-gray-500 font-medium uppercase">Faltantes</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{stats.missing}</p>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <HashRouter>
      <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Navigate to="/checklists" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/checklists" element={<ChecklistList />} />
              <Route path="/checklists/new" element={<CreateTemplate />} />
              <Route path="/checklists/:id" element={<ChecklistDetail />} />
              
              {/* Internal Route for Filling */}
              <Route path="/fill" element={<ChecklistToFillList />} />
              <Route path="/fill/:id" element={<ChecklistSubmission />} />
              
              {/* Route for Producers */}
              <Route path="/producers" element={<ProducerList />} />

              {/* Public/External Route for Producer Submission */}
              <Route path="/submit/:id" element={<ChecklistSubmission />} />
              
              <Route path="*" element={<div className="p-8">Página em construção</div>} />
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  );
};

export default App;