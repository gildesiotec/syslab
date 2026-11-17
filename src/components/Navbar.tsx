import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, LayoutDashboard, FileText, Camera, Upload, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { auth, db, storage } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

const AvatarUpdateModal: React.FC<{ isOpen: boolean; onClose: () => void; uid: string; currentPhoto?: string }> = ({ isOpen, onClose, uid, currentPhoto }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(currentPhoto || null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 2 * 1024 * 1024) {
        toast.error("A imagem deve ter no máximo 2MB.");
        return;
      }
      setFile(selected);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selected);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const storageRef = ref(storage, `avatars/${uid}`);
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);
      
      await updateDoc(doc(db, 'users', uid), { photoURL });
      
      toast.success("Avatar atualizado com sucesso!");
      onClose();
    } catch (error) {
      console.error("Erro ao atualizar avatar:", error);
      toast.error("Erro ao atualizar avatar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-8"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Atualizar Avatar</h3>
            
            <div className="flex flex-col items-center gap-6">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-green-50 bg-gray-100 flex items-center justify-center">
                  {preview ? (
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User size={64} className="text-gray-300" />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-green-600 text-white p-2.5 rounded-full shadow-lg hover:bg-green-700 transition-all"
                >
                  <Camera size={20} />
                </button>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />

              <div className="w-full space-y-4">
                <button
                  onClick={handleUpload}
                  disabled={!file || loading}
                  className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Upload size={20} />
                      Salvar Novo Avatar
                    </>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-4 text-gray-500 font-bold hover:bg-gray-50 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const Navbar: React.FC = () => {
  const { user, profile, isAdmin, isPatient } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Exames', path: '/#exames' },
    { name: 'Sobre', path: '/#sobre' },
    { name: 'Contato', path: '/#contato' },
  ];

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center gap-2">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <FileText className="text-white w-6 h-6" />
              </div>
              <span className="text-2xl font-bold text-gray-900 tracking-tight">Labclin</span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.path}
                className="text-gray-600 hover:text-green-600 font-medium transition-colors"
              >
                {link.name}
              </a>
            ))}
            
            {user ? (
              <div className="flex items-center gap-6 border-l pl-8">
                <div className="flex items-center gap-3 group">
                  <button
                    onClick={() => setShowAvatarModal(true)}
                    className="relative w-10 h-10 rounded-full overflow-hidden bg-green-50 border-2 border-transparent group-hover:border-green-600 transition-all flex items-center justify-center"
                  >
                    {profile?.photoURL ? (
                      <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-green-700 font-bold text-sm">
                        {profile ? getUserInitials(profile.name) : <User size={18} />}
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera size={14} className="text-white" />
                    </div>
                  </button>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900 leading-none">
                      {profile?.name.split(' ')[0]}
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-1">
                      {isAdmin ? 'Administrador' : 'Paciente'}
                    </span>
                  </div>
                </div>

                <div className="h-8 w-px bg-gray-100 mx-2" />

                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-2 text-gray-700 hover:text-green-600 font-medium"
                  >
                    <LayoutDashboard size={18} />
                    Painel
                  </Link>
                )}
                {isPatient && (
                  <Link
                    to="/portal"
                    className="flex items-center gap-2 text-gray-700 hover:text-green-600 font-medium"
                  >
                    <User size={18} />
                    Portal
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-red-500 hover:text-red-600 font-medium"
                >
                  <LogOut size={18} />
                  Sair
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-green-600 text-white px-6 py-2.5 rounded-full font-semibold hover:bg-green-700 transition-all shadow-lg shadow-green-200"
              >
                Acessar Portal
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-600 hover:text-gray-900 focus:outline-none"
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={cn("md:hidden bg-white border-b border-gray-100 overflow-hidden transition-all duration-300", isOpen ? "max-h-[500px]" : "max-h-0")}>
        <div className="px-4 pt-2 pb-6 space-y-2">
          {user && (
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-2xl mb-4">
              <button
                onClick={() => {
                  setShowAvatarModal(true);
                  setIsOpen(false);
                }}
                className="w-12 h-12 rounded-full overflow-hidden bg-green-100 flex items-center justify-center"
              >
                {profile?.photoURL ? (
                  <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-green-700 font-bold">
                    {profile ? getUserInitials(profile.name) : <User size={20} />}
                  </span>
                )}
              </button>
              <div>
                <p className="font-bold text-gray-900">{profile?.name}</p>
                <p className="text-xs text-gray-500">{profile?.email}</p>
              </div>
            </div>
          )}

          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.path}
              className="block px-3 py-3 text-base font-medium text-gray-700 hover:text-green-600 hover:bg-gray-50 rounded-md"
              onClick={() => setIsOpen(false)}
            >
              {link.name}
            </a>
          ))}
          {user ? (
            <>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="block px-3 py-3 text-base font-medium text-gray-700 hover:text-green-600 hover:bg-gray-50 rounded-md"
                  onClick={() => setIsOpen(false)}
                >
                  Painel Admin
                </Link>
              )}
              {isPatient && (
                <Link
                  to="/portal"
                  className="block px-3 py-3 text-base font-medium text-gray-700 hover:text-green-600 hover:bg-gray-50 rounded-md"
                  onClick={() => setIsOpen(false)}
                >
                  Meus Exames
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="block w-full text-left px-3 py-3 text-base font-medium text-red-500 hover:bg-red-50 rounded-md"
              >
                Sair
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="block px-3 py-4 text-center text-base font-semibold text-white bg-green-600 rounded-md"
              onClick={() => setIsOpen(false)}
            >
              Acessar Portal
            </Link>
          )}
        </div>
      </div>

      {user && (
        <AvatarUpdateModal
          isOpen={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          uid={user.uid}
          currentPhoto={profile?.photoURL}
        />
      )}
    </nav>
  );
};

export default Navbar;
