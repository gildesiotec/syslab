import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/AuthProvider';
import { AuthGuard } from './components/AuthGuard';
import { Toaster } from 'sonner';
import Home from './pages/Home';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import PatientPortal from './pages/PatientPortal';
import Navbar from './components/Navbar';

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" richColors />
      <Router>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              
              {/* Admin Routes */}
              <Route element={<AuthGuard allowedRoles={['admin']} />}>
                <Route path="/admin/*" element={<AdminDashboard />} />
              </Route>

              {/* Patient Routes */}
              <Route element={<AuthGuard allowedRoles={['patient']} />}>
                <Route path="/portal/*" element={<PatientPortal />} />
              </Route>
            </Routes>
          </main>
          <footer className="bg-gray-900 text-white py-12 px-4">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-4">Labclin</h3>
                <p className="text-gray-400">Excelência em diagnósticos por imagem e laboratoriais.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Links Úteis</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="/" className="hover:text-white transition-colors">Home</a></li>
                  <li><a href="/login" className="hover:text-white transition-colors">Portal do Paciente</a></li>
                  <li><a href="/#exames" className="hover:text-white transition-colors">Exames</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Contato</h4>
                <p className="text-gray-400">Rua da Saúde, 123 - Centro</p>
                <p className="text-gray-400">(11) 4002-8922</p>
                <p className="text-gray-400">contato@labclin.com.br</p>
              </div>
            </div>
            <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-gray-800 text-center text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} Labclin. Todos os direitos reservados.
            </div>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}
