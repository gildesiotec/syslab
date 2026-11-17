import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  Users, 
  FileText, 
  LayoutDashboard, 
  Plus, 
  Search, 
  ChevronRight, 
  ChevronLeft,
  Upload, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Activity,
  Trash2,
  Download,
  AlertTriangle,
  Calendar,
  ShieldCheck
} from 'lucide-react';
import { collection, query, getDocs, addDoc, updateDoc, serverTimestamp, where, orderBy, limit, startAfter, startAt, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { deleteApp } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';
import { db, storage, auth } from '../firebase';
import { PatientRecord, ExamRecord, SystemLog, UserProfile } from '../types';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Helpers ---

const validateCPF = (cpf: string) => {
  const cleanCPF = cpf.replace(/\D/g, '');
  
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleanCPF)) return false;
  
  let sum = 0;
  let remainder;
  
  for (let i = 1; i <= 9; i++) {
    sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if ((remainder === 10) || (remainder === 11)) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;
  
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }
  
  remainder = (sum * 10) % 11;
  if ((remainder === 10) || (remainder === 11)) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;
  
  return true;
};

const validateEmail = (email: string) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const getEmailErrorMessage = (email: string) => {
  if (!email) return "";
  if (!email.includes('@')) return "O e-mail deve conter '@' (ex: usuario@email.com)";
  
  const parts = email.split('@');
  if (parts.length > 2) return "O e-mail não pode ter mais de um '@'";
  if (!parts[0]) return "Informe a parte antes do '@'";
  if (!parts[1]) return "Informe o domínio após o '@' (ex: gmail.com)";
  if (!parts[1].includes('.')) return "O domínio deve conter um ponto (ex: .com)";
  if (parts[1].split('.').some(p => p.length === 0)) return "Domínio mal formatado";
  
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) return "Formato inválido. Evite espaços ou caracteres especiais";
  
  return "";
};

const validatePhone = (phone: string) => {
  // Basic validation for Brazilian phone numbers: (XX) XXXXX-XXXX or XX XXXXX-XXXX or XXXXXXXXXXX
  // Allows optional parentheses, spaces, and hyphens.
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length >= 10 && cleanPhone.length <= 11;
};

const notifyPatientByEmail = async (patient: PatientRecord, examName: string) => {
  // In a real application, this would call a backend service (e.g., NodeMailer, SendGrid, AWS SES)
  // to send the actual email. For this implementation, we simulate the notification
  // and log the details for audit purposes.
  
  console.log(`[EMAIL NOTIFICATION]
    To: ${patient.email}
    Subject: Resultado de Exame Disponível - Labclin
    Body: Olá ${patient.name}, seu exame "${examName}" já está disponível para visualização em nosso portal.
    Link: ${window.location.origin}/login
  `);

  toast.success(`Notificação enviada para ${patient.email}`, {
    description: `O paciente ${patient.name} foi avisado sobre o resultado do exame "${examName}".`,
    duration: 5000,
  });

  // Log the notification in the system logs
  try {
    await addDoc(collection(db, 'logs'), {
      action: 'NOTIFICACAO_EMAIL',
      userId: 'system',
      timestamp: serverTimestamp(),
      details: `E-mail de notificação enviado para ${patient.email} (Paciente: ${patient.name}) referente ao exame "${examName}".`
    });
  } catch (err) {
    console.error("Erro ao registrar log de notificação:", err);
  }
};

// --- Sub-components ---

const AdminOverview: React.FC = () => {
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalExams: 0,
    pendingExams: 0,
    deliveredExams: 0
  });
  const [recentExams, setRecentExams] = useState<ExamRecord[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const patientsSnap = await getDocs(collection(db, 'patients'));
      const examsSnap = await getDocs(collection(db, 'exams'));
      
      const exams = examsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamRecord));
      
      setStats({
        totalPatients: patientsSnap.size,
        totalExams: examsSnap.size,
        pendingExams: exams.filter(e => e.status === 'pending').length,
        deliveredExams: exams.filter(e => e.status === 'available').length
      });

      setRecentExams(exams.sort((a, b) => b.date.toMillis() - a.date.toMillis()).slice(0, 5));

      // Mock chart data for visualization
      setChartData([
        { name: 'Seg', exames: 12 },
        { name: 'Ter', exames: 19 },
        { name: 'Qua', exames: 15 },
        { name: 'Qui', exames: 22 },
        { name: 'Sex', exames: 30 },
        { name: 'Sáb', exames: 10 },
      ]);
    };
    fetchData();
  }, []);

  const statCards = [
    { title: "Total de Pacientes", value: stats.totalPatients, icon: <Users />, color: "bg-green-500" },
    { title: "Total de Exames", value: stats.totalExams, icon: <FileText />, color: "bg-purple-500" },
    { title: "Exames Pendentes", value: stats.pendingExams, icon: <Clock />, color: "bg-amber-500" },
    { title: "Exames Entregues", value: stats.deliveredExams, icon: <CheckCircle />, color: "bg-green-500" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bem-vindo ao Painel Administrativo</h2>
          <p className="text-gray-500">Acompanhe o desempenho e gerencie pacientes, exames e usuários.</p>
        </div>
        <Link 
          to="/admin/admins"
          className="bg-green-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
        >
          <ShieldCheck size={20} /> Cadastrar Admin
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4"
          >
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg", card.color)}>
              {card.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{card.title}</p>
              <h3 className="text-2xl font-bold text-gray-900">{card.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="text-green-600" />
              Volume de Exames (Semanal)
            </h3>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  cursor={{ fill: '#f3f4f6' }}
                />
                <Bar dataKey="exames" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-2">
            <Activity className="text-green-600" />
            Exames Recentes
          </h3>
          <div className="space-y-6">
            {recentExams.map((exam, idx) => (
              <div key={idx} className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", exam.status === 'available' ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600")}>
                    <FileText size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm group-hover:text-green-600 transition-colors">{exam.examName}</h4>
                    <p className="text-xs text-gray-500">{format(exam.date.toDate(), "dd 'de' MMM, yyyy", { locale: ptBR })}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-green-600 transition-all" />
              </div>
            ))}
            {recentExams.length === 0 && (
              <p className="text-center text-gray-400 py-8 italic">Nenhum exame recente.</p>
            )}
          </div>
          <Link to="/admin/exams" className="mt-8 block w-full text-center py-3 text-green-600 font-bold text-sm hover:bg-green-50 rounded-xl transition-all">
            Ver Todos os Exames
          </Link>
        </div>
      </div>
    </div>
  );
};

const ManagePatients: React.FC = () => {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [editingPatient, setEditingPatient] = useState<PatientRecord | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    cpf: '', 
    email: '', 
    phone: '', 
    birthDate: '', 
    password: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [cpfError, setCpfError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [patientIdToDelete, setPatientIdToDelete] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [firstVisible, setFirstVisible] = useState<any>(null);
  const [pageStack, setPageStack] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const PAGE_SIZE = 20;

  const fetchPatients = async (direction: 'next' | 'prev' | 'initial' = 'initial') => {
    setLoading(true);
    try {
      let q;
      if (direction === 'initial') {
        q = query(collection(db, 'patients'), orderBy('name'), limit(PAGE_SIZE + 1));
        setCurrentPage(1);
        setPageStack([]);
      } else if (direction === 'next' && lastVisible) {
        q = query(collection(db, 'patients'), orderBy('name'), startAfter(lastVisible), limit(PAGE_SIZE + 1));
        setPageStack([...pageStack, firstVisible]);
        setCurrentPage(prev => prev + 1);
      } else if (direction === 'prev' && pageStack.length > 0) {
        const prevFirstVisible = pageStack[pageStack.length - 1];
        q = query(collection(db, 'patients'), orderBy('name'), startAt(prevFirstVisible), limit(PAGE_SIZE + 1));
        const newStack = [...pageStack];
        newStack.pop();
        setPageStack(newStack);
        setCurrentPage(prev => prev - 1);
      } else {
        setLoading(false);
        return;
      }

      const snap = await getDocs(q);
      const docs = snap.docs;
      
      const hasMore = docs.length > PAGE_SIZE;
      setHasNextPage(hasMore);
      
      const pageDocs = hasMore ? docs.slice(0, PAGE_SIZE) : docs;
      
      setPatients(pageDocs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as PatientRecord)));
      setFirstVisible(pageDocs[0]);
      setLastVisible(pageDocs[pageDocs.length - 1]);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar pacientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleOpenModal = (patient?: PatientRecord) => {
    setCpfError("");
    setEmailError("");
    setPhoneError("");
    setShowSuccess(false);
    if (patient) {
      setEditingPatient(patient);
      setFormData({ 
        name: patient.name, 
        cpf: patient.cpf, 
        email: patient.email, 
        phone: patient.phone || '',
        birthDate: patient.birthDate || '',
        password: '',
        street: patient.street || '',
        number: patient.number || '',
        complement: patient.complement || '',
        neighborhood: patient.neighborhood || '',
        city: patient.city || '',
        state: patient.state || '',
        zipCode: patient.zipCode || ''
      });
    } else {
      setEditingPatient(null);
      setFormData({ 
        name: '', 
        cpf: '', 
        email: '', 
        phone: '', 
        birthDate: '', 
        password: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        zipCode: ''
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateCPF(formData.cpf)) {
      setCpfError("CPF inválido. Verifique os números.");
      return;
    }
    
    const emailErr = getEmailErrorMessage(formData.email);
    if (emailErr) {
      setEmailError(emailErr);
      return;
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      setPhoneError("Telefone inválido. Use (DDD) 99999-9999.");
      return;
    }
    
    setCpfError("");
    setEmailError("");
    setPhoneError("");
    setLoading(true);
    try {
      // Check for duplicate CPF if creating new patient
      if (!editingPatient) {
        const cpfQuery = query(collection(db, 'patients'), where('cpf', '==', formData.cpf));
        const cpfSnap = await getDocs(cpfQuery);
        if (!cpfSnap.empty) {
          setCpfError("Este CPF já está cadastrado no sistema.");
          setLoading(false);
          return;
        }
      }

      if (editingPatient) {
        const { password, ...updateData } = formData;
        await updateDoc(doc(db, 'patients', editingPatient.id), updateData);
        
        // Update user profile if exists
        if (editingPatient.userId) {
          await updateDoc(doc(db, 'users', editingPatient.userId), {
            name: formData.name,
            email: formData.email
          });
        }
      } else {
        // Create Auth user using secondary app to avoid logging out admin
        const secondaryApp = initializeApp(firebaseConfig, 'Secondary');
        const secondaryAuth = getAuth(secondaryApp);
        
        try {
          const cpfPassword = formData.cpf.replace(/\D/g, '');
          const userCredential = await createUserWithEmailAndPassword(
            secondaryAuth, 
            formData.email, 
            cpfPassword
          );
          
          const uid = userCredential.user.uid;
          
          // Create user profile
          await setDoc(doc(db, 'users', uid), {
            uid,
            name: formData.name,
            email: formData.email,
            role: 'patient',
            createdAt: serverTimestamp()
          });

          // Create patient record
          const { password, ...patientData } = formData;
          await addDoc(collection(db, 'patients'), {
            ...patientData,
            userId: uid
          });
        } catch (authErr: any) {
          if (authErr.code === 'auth/email-already-in-use') {
            setEmailError("Este e-mail já está em uso por outro usuário.");
            await deleteApp(secondaryApp);
            setLoading(false);
            return;
          }
          if (authErr.code === 'auth/operation-not-allowed') {
            toast.error("O método de login por E-mail/Senha não está ativado no Firebase Console. Por favor, ative-o em Authentication > Sign-in method.");
            await deleteApp(secondaryApp);
            setLoading(false);
            return;
          }
          await deleteApp(secondaryApp);
          throw authErr;
        }

        // Clean up secondary app
        await deleteApp(secondaryApp);
      }
      setShowSuccess(true);
      setFormData({ 
        name: '', 
        cpf: '', 
        email: '', 
        phone: '', 
        birthDate: '', 
        password: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        zipCode: ''
      });
      // Refresh current page
      fetchPatients('initial');
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao salvar paciente: " + (err.message || "Erro desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePatient = (id: string) => {
    setPatientIdToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDeletePatient = async () => {
    if (!patientIdToDelete) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'patients', patientIdToDelete));
      fetchPatients('initial');
      setShowDeleteModal(false);
      setPatientIdToDelete(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.cpf.includes(search)
  );

  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Relatório de Pacientes Cadastrados', 14, 22);
    
    // Add date
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 30);
    
    // Define table columns
    const columns = [
      { header: 'Nome', dataKey: 'name' },
      { header: 'CPF', dataKey: 'cpf' },
      { header: 'E-mail', dataKey: 'email' },
      { header: 'Telefone', dataKey: 'phone' }
    ];
    
    // Prepare data
    const data = filteredPatients.map(p => ({
      name: p.name,
      cpf: p.cpf,
      email: p.email,
      phone: p.phone || '-'
    }));
    
    // Generate table
    autoTable(doc, {
      columns,
      body: data,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      margin: { top: 40 }
    });
    
    // Save PDF
    doc.save(`relatorio-pacientes-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Gestão de Pacientes</h2>
        <div className="flex gap-3 w-full sm:w-auto">
          <button 
            onClick={generatePDF}
            className="flex-1 sm:flex-none bg-white text-gray-700 border border-gray-200 px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-all"
          >
            <Download size={20} /> Exportar PDF
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex-1 sm:flex-none bg-green-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
          >
            <Plus size={20} /> Novo Paciente
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou CPF..." 
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-green-500 outline-none transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-8 py-4 font-bold">Nome</th>
                <th className="px-8 py-4 font-bold">CPF</th>
                <th className="px-8 py-4 font-bold">E-mail</th>
                <th className="px-8 py-4 font-bold">Telefone</th>
                <th className="px-8 py-4 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPatients.map((patient) => (
                <tr 
                  key={patient.id} 
                  className="hover:bg-gray-50 transition-colors group cursor-pointer"
                  onClick={() => {
                    setSelectedPatient(patient);
                    setShowDetailsModal(true);
                  }}
                >
                  <td className="px-8 py-5">
                    <div className="font-bold text-gray-900 group-hover:text-green-600 transition-colors">{patient.name}</div>
                  </td>
                  <td className="px-8 py-5 text-gray-600">{patient.cpf}</td>
                  <td className="px-8 py-5 text-gray-600">{patient.email}</td>
                  <td className="px-8 py-5 text-gray-600">{patient.phone || '-'}</td>
                  <td className="px-8 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => {
                          setSelectedPatient(patient);
                          setShowDetailsModal(true);
                        }}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-xl transition-colors"
                        title="Ver Detalhes"
                      >
                        <Search size={20} />
                      </button>
                      <button 
                        onClick={() => handleOpenModal(patient)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                        title="Editar Paciente"
                      >
                        <FileText size={20} />
                      </button>
                      <button 
                        onClick={() => handleDeletePatient(patient.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        title="Excluir Paciente"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPatients.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-gray-400 italic">Nenhum paciente encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Página <span className="font-bold text-gray-900">{currentPage}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchPatients('prev')}
              disabled={currentPage === 1 || loading}
              className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1 px-4 font-bold text-sm"
            >
              <ChevronLeft size={18} /> Anterior
            </button>
            <button
              onClick={() => fetchPatients('next')}
              disabled={!hasNextPage || loading}
              className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1 px-4 font-bold text-sm"
            >
              Próximo <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Detalhes do Paciente */}
      <AnimatePresence>
        {showDetailsModal && selectedPatient && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDetailsModal(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            ></motion.div>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="overflow-y-auto flex-1 custom-scrollbar">
                <div className="p-8 border-b border-gray-100 flex justify-between items-start sticky top-0 bg-white z-10">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{selectedPatient.name}</h3>
                    <p className="text-gray-500 mt-1">Perfil do Paciente</p>
                  </div>
                  <button 
                    onClick={() => setShowDetailsModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
                  >
                    <Plus className="rotate-45" size={24} />
                  </button>
                </div>

                <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">CPF</p>
                    <p className="font-bold text-gray-900">{selectedPatient.cpf}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Nascimento</p>
                    <p className="font-bold text-gray-900">{selectedPatient.birthDate ? format(new Date(selectedPatient.birthDate + 'T00:00:00'), "dd/MM/yyyy") : '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Telefone</p>
                    <p className="font-bold text-gray-900">{selectedPatient.phone || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">E-mail</p>
                    <p className="font-bold text-gray-900">{selectedPatient.email}</p>
                  </div>
                  
                  {(selectedPatient.street || selectedPatient.city) && (
                    <div className="col-span-2 pt-4 border-t border-gray-50">
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Endereço</p>
                      <p className="font-bold text-gray-900">
                        {selectedPatient.street}{selectedPatient.number ? `, ${selectedPatient.number}` : ''}
                        {selectedPatient.complement ? ` - ${selectedPatient.complement}` : ''}
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedPatient.neighborhood ? `${selectedPatient.neighborhood}, ` : ''}
                        {selectedPatient.city} - {selectedPatient.state}
                      </p>
                      {selectedPatient.zipCode && <p className="text-sm text-gray-600">CEP: {selectedPatient.zipCode}</p>}
                    </div>
                  )}

                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">ID do Usuário</p>
                    <p className="font-mono text-xs text-gray-400">{selectedPatient.userId || 'Não vinculado'}</p>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <button 
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleOpenModal(selectedPatient);
                    }}
                    className="w-full bg-green-50 text-green-600 py-3 rounded-2xl font-bold hover:bg-green-600 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <FileText size={18} /> Editar Informações
                  </button>
                </div>
              </div>

              <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end sticky bottom-0 z-10">
                <button 
                  onClick={() => setShowDetailsModal(false)}
                  className="bg-white text-gray-900 px-8 py-3 rounded-2xl font-bold border border-gray-200 hover:bg-gray-100 transition-all shadow-sm"
                >
                  Fechar
                </button>
              </div>
            </div>
          </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Novo/Editar Paciente */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            ></motion.div>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="overflow-y-auto p-8 custom-scrollbar">
                <AnimatePresence mode="wait">
                {showSuccess ? (
                  <motion.div 
                    key="success"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-8"
                  >
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <CheckCircle size={40} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {editingPatient ? 'Paciente Atualizado!' : 'Paciente Cadastrado!'}
                    </h3>
                    <p className="text-gray-500 mb-8">
                      {editingPatient 
                        ? 'As informações do paciente foram atualizadas com sucesso.' 
                        : 'O novo paciente foi registrado com sucesso. Ele poderá acessar o portal usando o CPF ou E-mail, e a senha padrão é o CPF (apenas números).'}
                    </p>
                    <button 
                      onClick={() => setShowModal(false)}
                      className="bg-green-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
                    >
                      Continuar
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">
                      {editingPatient ? 'Editar Paciente' : 'Cadastrar Novo Paciente'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Nome Completo <span className="text-red-500">*</span></label>
                          <input 
                            required 
                            type="text" 
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all" 
                            placeholder="Nome do paciente"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">CPF <span className="text-red-500">*</span></label>
                          <input 
                            required 
                            type="text" 
                            className={cn(
                              "w-full px-4 py-3 rounded-xl border focus:ring-2 outline-none transition-all",
                              cpfError ? "border-red-500 focus:ring-red-500" : "border-gray-200 focus:ring-green-500"
                            )}
                            placeholder="000.000.000-00"
                            value={formData.cpf}
                            onChange={e => {
                              let val = e.target.value.replace(/\D/g, '');
                              if (val.length > 11) val = val.slice(0, 11);
                              
                              // Apply mask
                              let masked = val;
                              if (val.length > 3) masked = val.slice(0, 3) + '.' + val.slice(3);
                              if (val.length > 6) masked = masked.slice(0, 7) + '.' + masked.slice(7);
                              if (val.length > 9) masked = masked.slice(0, 11) + '-' + masked.slice(11);
                              
                              setFormData({...formData, cpf: masked});
                              if (val.length === 11 && !validateCPF(val)) {
                                setCpfError("CPF inválido. Verifique os números.");
                              } else {
                                setCpfError("");
                              }
                            }}
                          />
                          {cpfError && <p className="text-red-500 text-xs mt-1 font-medium">{cpfError}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Telefone</label>
                          <input 
                            type="text" 
                            className={cn(
                              "w-full px-4 py-3 rounded-xl border focus:ring-2 outline-none transition-all",
                              phoneError ? "border-red-500 focus:ring-red-500" : "border-gray-200 focus:ring-green-500"
                            )}
                            placeholder="(11) 99999-9999"
                            value={formData.phone}
                            onChange={e => {
                              let val = e.target.value.replace(/\D/g, '');
                              if (val.length > 11) val = val.slice(0, 11);
                              
                              // Apply mask
                              let masked = val;
                              if (val.length > 0) masked = '(' + val;
                              if (val.length > 2) masked = '(' + val.slice(0, 2) + ') ' + val.slice(2);
                              if (val.length > 7) masked = masked.slice(0, 10) + '-' + masked.slice(10);
                              
                              setFormData({...formData, phone: masked});
                              if (val.length >= 10 && !validatePhone(val)) {
                                setPhoneError("Telefone inválido. Use (DDD) 99999-9999.");
                              } else {
                                setPhoneError("");
                              }
                            }}
                          />
                          {phoneError && <p className="text-red-500 text-xs mt-1 font-medium">{phoneError}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Data de Nascimento</label>
                          <input 
                            type="date" 
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all"
                            value={formData.birthDate}
                            onChange={e => setFormData({...formData, birthDate: e.target.value})}
                          />
                        </div>

                        <div className="md:col-span-2 pt-4 border-t border-gray-100">
                          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Endereço</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                              <label className="block text-sm font-semibold text-gray-700 mb-1">Rua</label>
                              <input 
                                type="text" 
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                placeholder="Nome da rua"
                                value={formData.street}
                                onChange={e => setFormData({...formData, street: e.target.value})}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">Número</label>
                              <input 
                                type="text" 
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                placeholder="Nº"
                                value={formData.number}
                                onChange={e => setFormData({...formData, number: e.target.value})}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">Complemento</label>
                              <input 
                                type="text" 
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                placeholder="Apt, Bloco, etc."
                                value={formData.complement}
                                onChange={e => setFormData({...formData, complement: e.target.value})}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">Bairro</label>
                              <input 
                                type="text" 
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                placeholder="Bairro"
                                value={formData.neighborhood}
                                onChange={e => setFormData({...formData, neighborhood: e.target.value})}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">CEP</label>
                              <input 
                                type="text" 
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                placeholder="00000-000"
                                value={formData.zipCode}
                                onChange={e => {
                                  let val = e.target.value.replace(/\D/g, '');
                                  if (val.length > 8) val = val.slice(0, 8);
                                  let masked = val;
                                  if (val.length > 5) masked = val.slice(0, 5) + '-' + val.slice(5);
                                  setFormData({...formData, zipCode: masked});
                                }}
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-semibold text-gray-700 mb-1">Cidade</label>
                              <input 
                                type="text" 
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                placeholder="Cidade"
                                value={formData.city}
                                onChange={e => setFormData({...formData, city: e.target.value})}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">Estado</label>
                              <input 
                                type="text" 
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                placeholder="UF"
                                maxLength={2}
                                value={formData.state}
                                onChange={e => setFormData({...formData, state: e.target.value.toUpperCase()})}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-gray-700 mb-1 flex justify-between items-center">
                            <span>E-mail <span className="text-red-500">*</span></span>
                            {formData.email && !emailError && (
                              <span className="text-green-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                <CheckCircle size={10} /> Formato Válido
                              </span>
                            )}
                          </label>
                          <div className="relative">
                            <input 
                              required 
                              type="email" 
                              className={cn(
                                "w-full px-4 py-3 rounded-xl border focus:ring-2 outline-none transition-all pr-10",
                                emailError 
                                  ? "border-red-500 focus:ring-red-500 bg-red-50/30" 
                                  : formData.email && !emailError 
                                    ? "border-green-500 focus:ring-green-500 bg-green-50/30"
                                    : "border-gray-200 focus:ring-green-500"
                              )}
                              placeholder="exemplo@email.com"
                              value={formData.email}
                              onChange={e => {
                                const val = e.target.value;
                                setFormData({...formData, email: val});
                                setEmailError(getEmailErrorMessage(val));
                              }}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {emailError ? (
                                <AlertTriangle size={18} className="text-red-500" />
                              ) : formData.email ? (
                                <CheckCircle size={18} className="text-green-500" />
                              ) : null}
                            </div>
                          </div>
                          {emailError && (
                            <motion.p 
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-red-500 text-xs mt-1.5 font-medium flex items-center gap-1"
                            >
                              <AlertTriangle size={12} /> {emailError}
                            </motion.p>
                          )}
                        </div>

                        {!editingPatient && (
                          <div className="md:col-span-2 bg-green-50 p-4 rounded-xl border border-green-100">
                            <p className="text-green-800 text-sm font-medium flex items-center gap-2">
                              <Activity size={16} /> Senha Automática Gerada
                            </p>
                            <p className="text-green-600 text-xs mt-1">
                              A senha inicial de acesso do paciente será o seu número de **CPF (apenas números)**.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-4 mt-8">
                        <button 
                          type="button" 
                          onClick={() => setShowModal(false)}
                          className="flex-1 px-6 py-4 rounded-2xl font-bold text-gray-600 hover:bg-gray-100 transition-all"
                        >
                          Cancelar
                        </button>
                        <button 
                          type="submit" 
                          disabled={loading}
                          className="flex-1 bg-green-600 text-white px-6 py-4 rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 disabled:opacity-50"
                        >
                          {loading ? "Salvando..." : (editingPatient ? "Salvar Alterações" : "Cadastrar")}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Confirmação de Exclusão Paciente */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !loading && setShowDeleteModal(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            ></motion.div>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Excluir Paciente?</h3>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Esta ação não pode ser desfeita. Todos os dados do paciente serão removidos permanentemente.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmDeletePatient}
                  disabled={loading}
                  className="w-full bg-red-600 text-white py-3 rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 disabled:opacity-50"
                >
                  {loading ? 'Excluindo...' : 'Sim, Excluir'}
                </button>
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  disabled={loading}
                  className="w-full bg-gray-50 text-gray-700 py-3 rounded-2xl font-bold hover:bg-gray-100 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};


const ManageExams: React.FC = () => {
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [search, setSearch] = useState("");
  const [examSearch, setExamSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [patientFilter, setPatientFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [examToDelete, setExamToDelete] = useState<ExamRecord | null>(null);
  const [fileToDownload, setFileToDownload] = useState<{ url: string; name: string } | null>(null);
  const [selectedExam, setSelectedExam] = useState<ExamRecord | null>(null);
  const [editingExam, setEditingExam] = useState<ExamRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [newExam, setNewExam] = useState({ 
    patientId: '', 
    examName: '', 
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    status: 'pending' as 'pending' | 'available',
    observations: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      const examsSnap = await getDocs(query(collection(db, 'exams'), orderBy('date', 'desc')));
      const patientsSnap = await getDocs(collection(db, 'patients'));
      setExams(examsSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as ExamRecord)));
      setPatients(patientsSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as PatientRecord)));
    };
    fetchData();
  }, []);

  const handleOpenModal = (exam?: ExamRecord) => {
    setShowSuccess(false);
    setFiles([]);
    if (exam) {
      setEditingExam(exam);
      setNewExam({
        patientId: exam.patientId,
        examName: exam.examName,
        date: exam.date ? format(exam.date.toDate(), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        status: exam.status,
        observations: exam.observations || ''
      });
    } else {
      setEditingExam(null);
      setNewExam({ 
        patientId: '', 
        examName: '', 
        date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        status: 'pending',
        observations: ''
      });
    }
    setShowModal(true);
  };

  const handleSubmitExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log("Iniciando submissão de exame...");
    
    try {
      const uploadedFiles: { url: string; name: string }[] = [];

      if (files.length > 0) {
        console.log(`Fazendo upload de ${files.length} arquivo(s)...`);
        for (const file of files) {
          try {
            const fileRef = ref(storage, `exams/${Date.now()}_${file.name}`);
            console.log(`Enviando arquivo: ${file.name}`);
            const uploadResult = await uploadBytes(fileRef, file);
            console.log(`Upload concluído para: ${file.name}`);
            const url = await getDownloadURL(uploadResult.ref);
            console.log(`URL obtida: ${url}`);
            uploadedFiles.push({ url, name: file.name });
          } catch (uploadErr: any) {
            console.error(`Erro no upload do arquivo ${file.name}:`, uploadErr);
            toast.error(`Erro ao enviar arquivo ${file.name}: ${uploadErr.message || 'Erro desconhecido'}`);
            throw uploadErr; // Rethrow to stop the process
          }
        }
      }

      const examData: any = {
        ...newExam,
        date: new Date(newExam.date)
      };

      if (editingExam) {
        console.log("Atualizando exame existente...");
        if (uploadedFiles.length > 0) {
          examData.files = [...(editingExam.files || []), ...uploadedFiles];
          examData.fileUrl = uploadedFiles[0].url;
          examData.fileName = uploadedFiles[0].name;
        }

        await updateDoc(doc(db, 'exams', editingExam.id), examData);
        
        // Notify patient if status was changed to 'available'
        if (newExam.status === 'available' && editingExam.status !== 'available') {
          const patient = patients.find(p => p.id === newExam.patientId);
          if (patient) {
            await notifyPatientByEmail(patient, newExam.examName);
          }
        }
        
        // Log the change
        await addDoc(collection(db, 'logs'), {
          action: 'EDICAO_EXAME',
          userId: auth.currentUser?.email || 'admin',
          timestamp: serverTimestamp(),
          details: `Exame "${newExam.examName}" editado.`
        });
      } else {
        console.log("Criando novo exame...");
        await addDoc(collection(db, 'exams'), {
          ...examData,
          files: uploadedFiles,
          fileUrl: uploadedFiles.length > 0 ? uploadedFiles[0].url : '',
          fileName: uploadedFiles.length > 0 ? uploadedFiles[0].name : '',
          uploadedBy: 'admin',
          createdAt: serverTimestamp()
        });

        // Notify patient if status is 'available'
        if (newExam.status === 'available') {
          const patient = patients.find(p => p.id === newExam.patientId);
          if (patient) {
            await notifyPatientByEmail(patient, newExam.examName);
          }
        }

        // Log the creation
        await addDoc(collection(db, 'logs'), {
          action: 'CADASTRO_EXAME',
          userId: auth.currentUser?.email || 'admin',
          timestamp: serverTimestamp(),
          details: `Novo exame "${newExam.examName}" cadastrado para o paciente ID: ${newExam.patientId}`
        });
      }

      console.log("Submissão concluída com sucesso!");
      setShowSuccess(true);
      // Refresh
      const snap = await getDocs(collection(db, 'exams'));
      setExams(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamRecord)));
    } catch (err: any) {
      console.error("Erro geral no handleSubmitExam:", err);
      toast.error("Erro ao salvar exame: " + (err.message || "Erro desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExam = (exam: ExamRecord) => {
    setExamToDelete(exam);
    setShowDeleteModal(true);
  };

  const confirmDeleteExam = async () => {
    if (!examToDelete) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'exams', examToDelete.id));
      setExams(exams.filter(e => e.id !== examToDelete.id));
      setShowDeleteModal(false);
      setExamToDelete(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const confirmDownload = () => {
    if (!fileToDownload) return;
    
    const link = document.createElement('a');
    link.href = fileToDownload.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.download = fileToDownload.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setShowDownloadModal(false);
    setFileToDownload(null);
  };

  const handleUpdateStatus = async (id: string, newStatus: 'pending' | 'available') => {
    try {
      const exam = exams.find(e => e.id === id);
      if (!exam) return;
      
      const oldStatus = exam.status;
      const patient = patients.find(p => p.id === exam.patientId);
      
      await updateDoc(doc(db, 'exams', id), { status: newStatus });
      
      // Notify patient if status is changed to 'available'
      if (newStatus === 'available' && patient) {
        await notifyPatientByEmail(patient, exam.examName);
      }
      
      // Log the change
      await addDoc(collection(db, 'logs'), {
        action: 'ALTERACAO_STATUS',
        userId: auth.currentUser?.email || 'admin',
        timestamp: serverTimestamp(),
        details: `Status do exame "${exam.examName}" (Paciente: ${patient?.name || 'Desconhecido'}) alterado de "${oldStatus === 'available' ? 'Disponível' : 'Pendente'}" para "${newStatus === 'available' ? 'Disponível' : 'Pendente'}"`
      });

      setExams(exams.map(e => e.id === id ? { ...e, status: newStatus } : e));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredExams = exams.filter(exam => {
    const patient = patients.find(p => p.id === exam.patientId);
    const searchLower = search.toLowerCase();
    const examSearchLower = examSearch.toLowerCase();
    const patientName = patient?.name.toLowerCase() || "";
    const examName = exam.examName.toLowerCase();
    const statusText = exam.status === 'available' ? 'disponível' : 'pendente';
    
    const matchesSearch = patientName.includes(searchLower) || 
                         statusText.includes(searchLower);
    
    const matchesExamSearch = examName.includes(examSearchLower);
    
    const matchesStatus = statusFilter === "all" || exam.status === statusFilter;
    const matchesPatient = patientFilter === "all" || exam.patientId === patientFilter;
    
    let matchesDate = true;
    if (exam.date) {
      const examDate = exam.date.toDate();
      if (startDate) {
        const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
        const sDate = new Date(sYear, sMonth - 1, sDay);
        matchesDate = matchesDate && !isBefore(examDate, startOfDay(sDate));
      }
      if (endDate) {
        const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
        const eDate = new Date(eYear, eMonth - 1, eDay);
        matchesDate = matchesDate && !isAfter(examDate, endOfDay(eDate));
      }
    }
    
    return matchesSearch && matchesExamSearch && matchesStatus && matchesPatient && matchesDate;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredExams.length / itemsPerPage);
  const paginatedExams = filteredExams.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, examSearch, statusFilter, patientFilter, startDate, endDate]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gestão de Exames</h2>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-green-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
        >
          <Upload size={20} /> Novo Exame
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col lg:flex-row justify-between gap-4">
          <div className="flex flex-col md:flex-row gap-4 flex-grow max-w-2xl">
            <div className="relative flex-grow">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="Buscar por paciente ou status..." 
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-green-500 outline-none transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="relative flex-grow">
              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="Buscar por nome do exame..." 
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-green-500 outline-none transition-all"
                value={examSearch}
                onChange={(e) => setExamSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-gray-500 whitespace-nowrap">Status:</label>
              <select 
                className="px-4 py-2 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-green-500 outline-none transition-all font-medium text-gray-700 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="pending">Pendente</option>
                <option value="available">Disponível</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-gray-500 whitespace-nowrap">Paciente:</label>
              <select 
                className="px-4 py-2 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-green-500 outline-none transition-all font-medium text-gray-700 text-sm max-w-[200px]"
                value={patientFilter}
                onChange={(e) => setPatientFilter(e.target.value)}
              >
                <option value="all">Todos os Pacientes</option>
                {patients.sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-gray-500 whitespace-nowrap">Período:</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                <input 
                  type="date" 
                  className="pl-10 pr-4 py-2 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-green-500 outline-none transition-all font-medium text-gray-700 text-sm"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  title="Data Inicial"
                />
              </div>
              <span className="text-gray-400 font-bold">à</span>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                <input 
                  type="date" 
                  className="pl-10 pr-4 py-2 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-green-500 outline-none transition-all font-medium text-gray-700 text-sm"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  title="Data Final"
                />
              </div>
            </div>
            {(startDate || endDate || statusFilter !== "all" || patientFilter !== "all" || search || examSearch) && (
              <button 
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setStatusFilter("all");
                  setPatientFilter("all");
                  setSearch("");
                  setExamSearch("");
                }}
                className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-8 py-4 font-bold">Paciente</th>
                <th className="px-8 py-4 font-bold">Exame</th>
                <th className="px-8 py-4 font-bold">Data</th>
                <th className="px-8 py-4 font-bold">Status</th>
                <th className="px-8 py-4 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedExams.map((exam) => {
                const patient = patients.find(p => p.id === exam.patientId);
                return (
                  <tr 
                    key={exam.id} 
                    className="hover:bg-gray-50 transition-colors cursor-pointer group"
                    onClick={() => {
                      setSelectedExam(exam);
                      setShowDetailsModal(true);
                    }}
                  >
                    <td className="px-8 py-5">
                      <div className="font-bold text-gray-900 group-hover:text-green-600 transition-colors">{patient?.name || 'Desconhecido'}</div>
                      <div className="text-xs text-gray-500">{patient?.cpf}</div>
                    </td>
                    <td className="px-8 py-5 text-gray-700 font-medium">{exam.examName}</td>
                    <td className="px-8 py-5 text-gray-600">
                      {exam.date ? format(exam.date.toDate(), "dd/MM/yyyy HH:mm") : '-'}
                    </td>
                    <td className="px-8 py-5" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={exam.status}
                        onChange={(e) => handleUpdateStatus(exam.id, e.target.value as any)}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold border-none outline-none cursor-pointer transition-all appearance-none text-center",
                          exam.status === 'available' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                        )}
                        style={{ width: '100px' }}
                      >
                        <option value="pending">Pendente</option>
                        <option value="available">Disponível</option>
                      </select>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(exam);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                          title="Editar Exame"
                        >
                          <FileText size={20} />
                        </button>
                        {(exam.files && exam.files.length > 0) || exam.fileUrl ? (
                          <div className="flex flex-col items-end gap-1">
                            {exam.files && exam.files.length > 0 ? (
                              exam.files.map((f, i) => (
                                <button 
                                  key={i}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFileToDownload(f);
                                    setShowDownloadModal(true);
                                  }}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all font-bold text-xs"
                                  title={`Baixar ${f.name}`}
                                >
                                  <Download size={14} />
                                  {exam.files!.length > 1 ? `Arq ${i+1}` : 'Baixar'}
                                </button>
                              ))
                            ) : (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFileToDownload({ url: exam.fileUrl!, name: exam.fileName || "exame" });
                                  setShowDownloadModal(true);
                                }}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all font-bold text-xs"
                                title="Baixar Exame"
                              >
                                <Download size={14} />
                                Baixar
                              </button>
                            )}
                          </div>
                        ) : (
                          <button 
                            disabled 
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-300 rounded-lg cursor-not-allowed font-bold text-xs"
                            title="Arquivo não disponível"
                          >
                            <Download size={14} />
                            Baixar
                          </button>
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteExam(exam);
                          }}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all font-bold text-xs h-fit"
                          title="Excluir Exame"
                        >
                          <Trash2 size={14} />
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedExams.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-gray-400 italic">Nenhum exame encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <div className="text-sm text-gray-500 font-medium">
              Mostrando <span className="font-bold text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-bold text-gray-900">{Math.min(currentPage * itemsPerPage, filteredExams.length)}</span> de <span className="font-bold text-gray-900">{filteredExams.length}</span> resultados
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  // Show only current page, first, last, and neighbors
                  if (
                    pageNum === 1 || 
                    pageNum === totalPages || 
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn(
                          "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                          currentPage === pageNum 
                            ? "bg-green-600 text-white shadow-md shadow-green-600/20" 
                            : "text-gray-500 hover:bg-white hover:shadow-sm"
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (
                    pageNum === currentPage - 2 || 
                    pageNum === currentPage + 2
                  ) {
                    return <span key={pageNum} className="text-gray-400 text-xs px-1">...</span>;
                  }
                  return null;
                })}
              </div>

              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Novo/Editar Exame */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            ></motion.div>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="overflow-y-auto flex-1 custom-scrollbar p-8">
                <AnimatePresence mode="wait">
                  {showSuccess ? (
                  <motion.div 
                    key="success"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-8"
                  >
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <CheckCircle size={40} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {editingExam ? 'Exame Atualizado!' : 'Exame Cadastrado!'}
                    </h3>
                    <p className="text-gray-500 mb-8">
                      {editingExam 
                        ? 'As informações do exame foram atualizadas com sucesso.' 
                        : 'O novo exame foi registrado no sistema com sucesso.'}
                    </p>
                    <button 
                      onClick={() => setShowModal(false)}
                      className="bg-green-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
                    >
                      Continuar
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">
                      {editingExam ? 'Editar Resultado de Exame' : 'Cadastrar Resultado de Exame'}
                    </h3>
                    <form onSubmit={handleSubmitExam} className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Paciente</label>
                        <select 
                          required
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all"
                          value={newExam.patientId}
                          onChange={e => setNewExam({...newExam, patientId: e.target.value})}
                        >
                          <option value="">Selecione um paciente</option>
                          {patients.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.cpf})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Nome do Exame</label>
                        <input 
                          required 
                          type="text" 
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all" 
                          placeholder="Ex: Hemograma Completo"
                          value={newExam.examName}
                          onChange={e => setNewExam({...newExam, examName: e.target.value})}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Data do Exame</label>
                          <input 
                            type="datetime-local" 
                            required
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all"
                            value={newExam.date}
                            onChange={e => setNewExam({...newExam, date: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                          <select 
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all"
                            value={newExam.status}
                            onChange={e => setNewExam({...newExam, status: e.target.value as any})}
                          >
                            <option value="pending">Pendente</option>
                            <option value="available">Disponível</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          {editingExam ? "Adicionar Arquivos" : "Arquivos do Exame"}
                        </label>
                        <div className="relative">
                          <input 
                            type="file" 
                            multiple
                            accept=".pdf,image/*"
                            className="hidden" 
                            id="exam-file"
                            onChange={e => setFiles(Array.from(e.target.files || []))}
                          />
                          <label 
                            htmlFor="exam-file"
                            className="w-full flex flex-col items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-gray-300 hover:border-green-500 hover:bg-green-50 cursor-pointer transition-all text-gray-500 font-medium"
                          >
                            <div className="flex items-center gap-2">
                              <Upload size={18} />
                              {files.length > 0 ? `${files.length} arquivo(s) selecionado(s)` : (editingExam ? "Novo arquivo" : "Selecionar arquivos")}
                            </div>
                            {files.length > 0 && (
                              <div className="text-[10px] text-gray-400 truncate max-w-full">
                                {files.map(f => f.name).join(', ')}
                              </div>
                            )}
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Observações (Opcional)</label>
                        <textarea 
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all resize-none" 
                          rows={3}
                          placeholder="Notas adicionais sobre o exame..."
                          value={newExam.observations}
                          onChange={e => setNewExam({...newExam, observations: e.target.value})}
                        ></textarea>
                      </div>
                      <div className="flex gap-4 mt-8">
                        <button 
                          type="button" 
                          onClick={() => setShowModal(false)}
                          className="flex-1 px-6 py-4 rounded-2xl font-bold text-gray-600 hover:bg-gray-100 transition-all"
                        >
                          Cancelar
                        </button>
                        <button 
                          type="submit" 
                          disabled={loading}
                          className="flex-1 bg-green-600 text-white px-6 py-4 rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 disabled:opacity-50"
                        >
                          {loading ? "Salvando..." : (editingExam ? "Salvar Alterações" : "Salvar Exame")}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Detalhes do Exame */}
      <AnimatePresence>
        {showDetailsModal && selectedExam && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDetailsModal(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            ></motion.div>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedExam.examName}</h3>
                  <p className="text-gray-500 mt-1">Detalhes completos do resultado</p>
                </div>
                <button 
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
                >
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Informações do Paciente</h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500">Nome</p>
                        <p className="font-bold text-gray-900">{patients.find(p => p.id === selectedExam.patientId)?.name || 'Desconhecido'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">CPF</p>
                        <p className="font-bold text-gray-900">{patients.find(p => p.id === selectedExam.patientId)?.cpf || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Status e Data</h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500">Status</p>
                        <span className={cn(
                          "inline-block px-3 py-1 rounded-full text-xs font-bold mt-1",
                          selectedExam.status === 'available' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                        )}>
                          {selectedExam.status === 'available' ? 'Disponível' : 'Pendente'}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Data do Exame</p>
                        <p className="font-bold text-gray-900">
                          {selectedExam.date ? format(selectedExam.date.toDate(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR }) : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedExam.observations && (
                  <div className="space-y-4 pt-8 border-t border-gray-100">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Observações</h4>
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedExam.observations}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-4 pt-8 border-t border-gray-100">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Documentos</h4>
                  {(selectedExam.files && selectedExam.files.length > 0) || selectedExam.fileUrl ? (
                    <div className="grid grid-cols-1 gap-3">
                      {selectedExam.files && selectedExam.files.length > 0 ? (
                        selectedExam.files.map((f, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-green-50 rounded-2xl border border-green-100">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white">
                                <FileText size={20} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-green-900">{f.name}</p>
                                <p className="text-xs text-green-600">Clique para visualizar ou baixar</p>
                              </div>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setFileToDownload(f);
                                setShowDownloadModal(true);
                              }}
                              className="bg-white text-green-600 px-4 py-2 rounded-xl font-bold text-sm shadow-sm hover:bg-green-600 hover:text-white transition-all flex items-center gap-2"
                            >
                              <Download size={16} />
                              Baixar
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center justify-between p-4 bg-green-50 rounded-2xl border border-green-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white">
                              <FileText size={20} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-green-900">Resultado do Exame</p>
                              <p className="text-xs text-green-600">Clique para visualizar ou baixar</p>
                            </div>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setFileToDownload({ url: selectedExam.fileUrl!, name: selectedExam.fileName || "exame" });
                              setShowDownloadModal(true);
                            }}
                            className="bg-white text-green-600 px-4 py-2 rounded-xl font-bold text-sm shadow-sm hover:bg-green-600 hover:text-white transition-all flex items-center gap-2"
                          >
                            <Download size={16} />
                            Baixar
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      <p className="text-gray-400 text-sm italic">Nenhum arquivo anexado a este exame.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button 
                  onClick={() => setShowDetailsModal(false)}
                  className="bg-white text-gray-900 px-8 py-3 rounded-2xl font-bold border border-gray-200 hover:bg-gray-100 transition-all shadow-sm"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Confirmação de Exclusão */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !loading && setShowDeleteModal(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            ></motion.div>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Excluir Exame?</h3>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Deseja realmente excluir o exame <span className="font-bold text-gray-700">"{examToDelete?.examName}"</span>?<br />
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmDeleteExam}
                  disabled={loading}
                  className="w-full bg-red-600 text-white py-3 rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 disabled:opacity-50"
                >
                  {loading ? 'Excluindo...' : 'Sim, Excluir'}
                </button>
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  disabled={loading}
                  className="w-full bg-gray-50 text-gray-700 py-3 rounded-2xl font-bold hover:bg-gray-100 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Confirmação de Download */}
      <AnimatePresence>
        {showDownloadModal && fileToDownload && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDownloadModal(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            ></motion.div>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Download size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Baixar Arquivo?</h3>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Deseja iniciar o download do arquivo: <br />
                <span className="font-bold text-gray-700">{fileToDownload.name}</span>
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmDownload}
                  className="w-full bg-green-600 text-white py-3 rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
                >
                  Sim, Baixar
                </button>
                <button 
                  onClick={() => {
                    setShowDownloadModal(false);
                    setFileToDownload(null);
                  }}
                  className="w-full bg-gray-50 text-gray-700 py-3 rounded-2xl font-bold hover:bg-gray-100 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- System Logs Component ---

const SystemLogs: React.FC = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(100));
        const snap = await getDocs(q);
        setLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SystemLog)));
      } catch (err) {
        console.error("Erro ao buscar logs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.userId.toLowerCase().includes(search.toLowerCase()) ||
    (log.details && log.details.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Logs do Sistema</h2>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar logs por ação, usuário ou detalhes..." 
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-green-500 outline-none transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-8 py-4 font-bold">Data/Hora</th>
                <th className="px-8 py-4 font-bold">Ação</th>
                <th className="px-8 py-4 font-bold">Usuário</th>
                <th className="px-8 py-4 font-bold">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center text-gray-400 italic">Carregando logs...</td>
                </tr>
              ) : filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-8 py-5 text-sm text-gray-600">
                    {log.timestamp ? format(log.timestamp.toDate(), "dd/MM/yyyy HH:mm:ss") : '-'}
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-sm font-medium text-gray-900">{log.userId}</td>
                  <td className="px-8 py-5 text-sm text-gray-500 max-w-xs truncate" title={log.details}>
                    {log.details || '-'}
                  </td>
                </tr>
              ))}
              {!loading && filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center text-gray-400 italic">Nenhum log encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- Manage Admins Component ---

const ManageAdmins: React.FC = () => {
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [emailError, setEmailError] = useState("");

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'admin'), orderBy('name'));
      const snap = await getDocs(q);
      setAdmins(snap.docs.map(doc => ({ ...doc.data() } as UserProfile)));
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar administradores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleOpenModal = () => {
    setFormData({ name: '', email: '', password: '' });
    setEmailError("");
    setShowSuccess(false);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailErr = getEmailErrorMessage(formData.email);
    if (emailErr) {
      setEmailError(emailErr);
      return;
    }
    
    if (formData.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);
    const secondaryApp = initializeApp(firebaseConfig, 'SecondaryAdmin');
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth, 
        formData.email, 
        formData.password
      );
      
      const uid = userCredential.user.uid;
      
      await setDoc(doc(db, 'users', uid), {
        uid,
        name: formData.name,
        email: formData.email,
        role: 'admin',
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, 'logs'), {
        action: 'CADASTRO_ADMIN',
        userId: auth.currentUser?.email || 'admin',
        timestamp: serverTimestamp(),
        details: `Novo administrador cadastrado: ${formData.email}`
      });

      setShowSuccess(true);
      fetchAdmins();
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setEmailError("Este e-mail já está em uso.");
      } else {
        toast.error("Erro ao cadastrar administrador: " + err.message);
      }
    } finally {
      await deleteApp(secondaryApp);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gestão de Administradores</h2>
        <button 
          onClick={handleOpenModal}
          className="bg-green-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
        >
          <Plus size={20} /> Novo Admin
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-8 py-4 font-bold">Nome</th>
                <th className="px-8 py-4 font-bold">E-mail</th>
                <th className="px-8 py-4 font-bold">Criado em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {admins.map((admin) => (
                <tr key={admin.uid} className="hover:bg-gray-50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="font-bold text-gray-900">{admin.name}</div>
                  </td>
                  <td className="px-8 py-5 text-gray-600">{admin.email}</td>
                  <td className="px-8 py-5 text-gray-600">
                    {admin.createdAt ? format(admin.createdAt.toDate(), "dd/MM/yyyy") : '-'}
                  </td>
                </tr>
              ))}
              {admins.length === 0 && !loading && (
                <tr>
                  <td colSpan={3} className="px-8 py-12 text-center text-gray-400 italic">Nenhum administrador encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo Admin */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            ></motion.div>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                {showSuccess ? (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <CheckCircle size={40} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Admin Cadastrado!</h3>
                    <p className="text-gray-500 mb-8">
                      O novo administrador foi registrado com sucesso e já pode acessar o sistema.
                    </p>
                    <button 
                      onClick={() => setShowModal(false)}
                      className="bg-green-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
                    >
                      Continuar
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">Cadastrar Administrador</h3>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Nome Completo</label>
                      <input 
                        required
                        type="text"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all"
                        placeholder="Nome do admin"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">E-mail</label>
                      <input 
                        required
                        type="email"
                        className={cn(
                          "w-full px-4 py-3 rounded-xl border focus:ring-2 outline-none transition-all",
                          emailError ? "border-red-500 focus:ring-red-500" : "border-gray-200 focus:ring-green-500"
                        )}
                        placeholder="email@servidor.com"
                        value={formData.email}
                        onChange={e => {
                          setFormData({...formData, email: e.target.value});
                          setEmailError(getEmailErrorMessage(e.target.value));
                        }}
                      />
                      {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Senha</label>
                      <input 
                        required
                        type="password"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all"
                        placeholder="Mínimo 6 caracteres"
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                      />
                    </div>
                    <div className="flex gap-4 mt-8">
                      <button 
                        type="button" 
                        onClick={() => setShowModal(false)}
                        className="flex-1 px-6 py-4 rounded-2xl font-bold text-gray-600 hover:bg-gray-100 transition-all"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit" 
                        disabled={loading}
                        className="flex-1 bg-green-600 text-white px-6 py-4 rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 disabled:opacity-50"
                      >
                        {loading ? "Cadastrando..." : "Cadastrar"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main Dashboard Component ---

const AdminDashboard: React.FC = () => {
  const location = useLocation();
  
  const menuItems = [
    { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={20} />, exact: true },
    { name: 'Pacientes', path: '/admin/patients', icon: <Users size={20} /> },
    { name: 'Exames', path: '/admin/exams', icon: <FileText size={20} /> },
    { name: 'Administradores', path: '/admin/admins', icon: <ShieldCheck size={20} /> },
    { name: 'Logs', path: '/admin/logs', icon: <Activity size={20} /> },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 space-y-2 sticky top-24">
            {menuItems.map((item) => {
              const isActive = item.exact 
                ? location.pathname === item.path 
                : location.pathname.startsWith(item.path);
              
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all",
                    isActive 
                      ? "bg-green-600 text-white shadow-lg shadow-green-600/20" 
                      : "text-gray-500 hover:text-green-600 hover:bg-green-50"
                  )}
                >
                  {item.icon}
                  {item.name}
                </Link>
              );
            })}
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-grow">
          <Routes>
            <Route index element={<AdminOverview />} />
            <Route path="patients" element={<ManagePatients />} />
            <Route path="exams" element={<ManageExams />} />
            <Route path="admins" element={<ManageAdmins />} />
            <Route path="logs" element={<SystemLogs />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
