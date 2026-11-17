import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { motion } from 'motion/react';
import { LogIn, ShieldCheck, Mail, Eye, EyeOff, KeyRound, ArrowRight } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { toast } from 'sonner';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();

  const handleForgotPassword = async () => {
    if (!usuario) {
      setError('Por favor, insira seu e-mail de usuário para recuperar a senha.');
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, usuario);
      toast.success('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
      setError(null);
    } catch (err: any) {
      console.error('Reset error:', err);
      setError('Erro ao enviar e-mail de recuperação. Verifique o usuário informado.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let loginEmail = usuario;

      // If it looks like a CPF (only numbers, 11 digits), try to find the email
      const isCpf = /^\d{11}$/.test(usuario.replace(/\D/g, ''));
      if (isCpf) {
        const cleanCpf = usuario.replace(/\D/g, '');
        const patientsRef = collection(db, 'patients');
        const q = query(patientsRef, where('cpf', '==', cleanCpf));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const patientData = querySnapshot.docs[0].data();
          if (patientData.email) {
            loginEmail = patientData.email;
          }
        }
      }

      const result = await signInWithEmailAndPassword(auth, loginEmail, password);
      const user = result.user;
      
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const shouldBeAdmin = user.email === 'gildesiotec@gmail.com';
        
        if (shouldBeAdmin && userData.role !== 'admin') {
          // Update role to admin if it's the admin email
          await updateDoc(userRef, { role: 'admin' });
          navigate('/admin');
        } else if (userData.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/portal');
        }
      } else {
        // This shouldn't happen if admin created the user correctly
        const shouldBeAdmin = user.email === 'gildesiotec@gmail.com';
        if (shouldBeAdmin) {
          navigate('/admin');
        } else {
          navigate('/portal');
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Usuário ou senha incorretos.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('O login por Usuário/Senha não está ativado no Firebase Console. Por favor, ative-o em Authentication > Sign-in method.');
      } else if (err.code === 'permission-denied') {
        setError('Acesso negado. Verifique se seu perfil está configurado corretamente.');
      } else {
        setError('Falha ao realizar login: ' + (err.message || 'Tente novamente.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user exists in Firestore
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Create new user profile
        // Default admin email from runtime context
        const isAdmin = user.email === 'gildesiotec@gmail.com';
        
        const newUser = {
          uid: user.uid,
          name: user.displayName || 'Usuário',
          email: user.email || '',
          role: isAdmin ? 'admin' : 'patient',
          createdAt: serverTimestamp(),
        };

        await setDoc(userRef, newUser);
        
        if (isAdmin) {
          navigate('/admin');
        } else {
          navigate('/portal');
        }
      } else {
        const userData = userSnap.data();
        const isAdminEmail = user.email === 'gildesiotec@gmail.com';
        
        if (isAdminEmail && userData.role !== 'admin') {
          // Force update to admin role for the main admin email
          await updateDoc(userRef, { role: 'admin' });
          navigate('/admin');
        } else if (userData.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/portal');
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'permission-denied') {
        setError('Acesso negado pelas regras de segurança. Verifique se seu e-mail está correto.');
      } else {
        setError('Falha ao realizar login com Google: ' + (err.message || 'Tente novamente.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12 bg-gray-50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="bg-white p-10 rounded-3xl shadow-2xl shadow-green-600/5 border border-gray-100 text-center">
          <div className="w-20 h-20 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-green-600/20">
            <ShieldCheck className="text-white w-10 h-10" />
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Portal Labclin</h2>
          <p className="text-gray-600 mb-8">Acesse sua conta para visualizar seus exames ou gerenciar a clínica.</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4 mb-8">
            <div className="text-left">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Usuário</label>
              <input 
                required
                type="text" 
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all" 
                placeholder="Seu e-mail ou CPF (apenas números)"
                value={usuario}
                onChange={e => setUsuario(e.target.value)}
              />
            </div>
            <div className="text-left">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Senha</label>
              <div className="relative">
                <input 
                  required
                  type={showPassword ? "text" : "password"} 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all pr-12" 
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading}
                className="text-xs font-semibold text-green-600 hover:text-green-700 transition-colors disabled:opacity-50"
              >
                {resetLoading ? 'Enviando...' : 'Esqueceu sua senha?'}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 disabled:opacity-50 flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              ) : (
                <>
                  Entrar
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="relative py-4 mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-400 uppercase tracking-widest text-[10px] font-bold">Ou continue com</span>
            </div>
          </div>

          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-100 py-4 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 hover:border-green-100 transition-all group disabled:opacity-50"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
              Entrar com Google
            </button>
            
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-400">Acesso Restrito</span>
              </div>
            </div>

            <p className="text-sm text-gray-500">
              Ao entrar, você concorda com nossos <a href="#" className="text-green-600 hover:underline">Termos de Uso</a> e <a href="#" className="text-green-600 hover:underline">Política de Privacidade</a>.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-500 flex items-center justify-center gap-2">
            <Mail size={16} />
            Dúvidas? <a href="mailto:suporte@clinicaexame.com.br" className="text-green-600 font-semibold hover:underline">Fale com o suporte</a>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
