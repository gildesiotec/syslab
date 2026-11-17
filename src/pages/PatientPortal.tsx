import React, { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { 
  FileText, 
  Download, 
  Clock, 
  CheckCircle, 
  User, 
  Calendar, 
  Search, 
  AlertCircle,
  ChevronRight,
  ExternalLink,
  MapPin,
  Phone,
  Mail,
  CreditCard
} from 'lucide-react';
import { collection, query, getDocs, where, orderBy, doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../components/AuthProvider';
import { PatientRecord, ExamRecord } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const PatientOverview: React.FC = () => {
  const { user, profile } = useAuth();
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Find patient record by email or userId
        let q = query(collection(db, 'patients'), where('userId', '==', user.uid));
        let snap = await getDocs(q);
        
        if (snap.empty) {
          q = query(collection(db, 'patients'), where('email', '==', user.email));
          snap = await getDocs(q);
        }
        
        if (!snap.empty) {
          const pDoc = snap.docs[0];
          const pData = { id: pDoc.id, ...pDoc.data() } as PatientRecord;
          setPatient(pData);

          // Link user to patient if not already linked
          if (!pData.userId) {
            await updateDoc(doc(db, 'patients', pDoc.id), { userId: user.uid });
          }

          // 2. Fetch exams for this patient with real-time updates
          const eq = query(collection(db, 'exams'), where('patientId', '==', pDoc.id), orderBy('date', 'desc'));
          const unsubscribe = onSnapshot(eq, (eSnap) => {
            setExams(eSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamRecord)));
          }, (error) => {
            console.error("Error listening to exams:", error);
            toast.error("Erro ao carregar exames em tempo real.");
          });

          return () => unsubscribe();
        } else {
          setPatient(null);
        }
      } catch (error) {
        console.error("Error fetching patient data:", error);
        toast.error("Erro ao carregar seus dados.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="bg-white p-12 rounded-3xl shadow-sm border border-gray-100 text-center max-w-2xl mx-auto">
        <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-8">
          <AlertCircle className="text-amber-500 w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Cadastro não encontrado</h2>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Não encontramos um registro de paciente vinculado ao seu e-mail ({user?.email}). 
          Por favor, entre em contato com a clínica para atualizar seu cadastro.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/#contato" className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 transition-all">
            Falar com a Clínica
          </a>
          <Link to="/" className="bg-gray-100 text-gray-700 px-8 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all">
            Voltar para Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Card */}
      <div className="bg-green-600 p-8 rounded-3xl shadow-xl shadow-green-600/20 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">Olá, {profile?.name}!</h2>
          <p className="text-green-100 opacity-90">Bem-vindo ao seu portal de saúde. Aqui você encontra todos os seus resultados.</p>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <FileText size={120} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Exam List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">Seus Exames</h3>
            <div className="text-sm text-gray-500 font-medium">{exams.length} exames encontrados</div>
          </div>

          <div className="space-y-4">
            {exams.map((exam) => (
              <motion.div 
                key={exam.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:shadow-lg transition-all group"
              >
                <div className="flex items-center gap-5">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm",
                    exam.status === 'available' ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
                  )}>
                    <FileText size={28} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 group-hover:text-green-600 transition-colors">{exam.examName}</h4>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1.5 text-sm text-gray-500">
                        <Calendar size={14} />
                        {format(exam.date.toDate(), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                      </span>
                      <span className={cn(
                        "flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider",
                        exam.status === 'available' ? "text-green-600" : "text-amber-600"
                      )}>
                        {exam.status === 'available' ? <CheckCircle size={14} /> : <Clock size={14} />}
                        {exam.status === 'available' ? 'Disponível' : 'Em processamento'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                  {exam.status === 'available' && ((exam.files && exam.files.length > 0) || exam.fileUrl) ? (
                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                      {exam.files && exam.files.length > 0 ? (
                        exam.files.map((f, i) => (
                          <a 
                            key={i}
                            href={f.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto bg-green-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-600/10 text-sm"
                          >
                            <Download size={16} /> {exam.files!.length > 1 ? `Baixar Arq ${i+1}` : 'Baixar PDF'}
                          </a>
                        ))
                      ) : (
                        <a 
                          href={exam.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-full sm:w-auto bg-green-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-600/10 text-sm"
                        >
                          <Download size={16} /> Baixar PDF
                        </a>
                      )}
                    </div>
                  ) : (
                    <button disabled className="w-full sm:w-auto bg-gray-100 text-gray-400 px-6 py-3 rounded-xl font-bold cursor-not-allowed text-sm">
                      Aguardando
                    </button>
                  )}
                </div>
              </motion.div>
            ))}

            {exams.length === 0 && (
              <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center">
                <p className="text-gray-500 italic">Você ainda não possui exames cadastrados.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <User className="text-green-600" />
              Seu Perfil
            </h3>
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
                  <User size={20} className="text-green-600" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Nome Completo</label>
                  <p className="font-bold text-gray-900 text-sm">{patient.name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
                  <CreditCard size={20} className="text-green-600" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">CPF</label>
                  <p className="font-bold text-gray-900 text-sm">{patient.cpf}</p>
                </div>
              </div>

              {patient.birthDate && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
                    <Calendar size={20} className="text-green-600" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Data de Nascimento</label>
                    <p className="font-bold text-gray-900 text-sm">
                      {format(new Date(patient.birthDate + 'T12:00:00'), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
                  <Mail size={20} className="text-green-600" />
                </div>
                <div className="min-w-0">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">E-mail</label>
                  <p className="font-bold text-gray-900 text-sm truncate">{patient.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
                  <Phone size={20} className="text-green-600" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Telefone</label>
                  <p className="font-bold text-gray-900 text-sm">{patient.phone || 'Não informado'}</p>
                </div>
              </div>

              {(patient.street || patient.city) && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
                    <MapPin size={20} className="text-green-600" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Endereço</label>
                    <p className="text-sm font-medium text-gray-900 leading-relaxed">
                      {patient.street}{patient.number ? `, ${patient.number}` : ''}
                      {patient.complement && ` - ${patient.complement}`}
                      <br />
                      {patient.neighborhood}
                      <br />
                      {patient.city} - {patient.state}
                      <br />
                      CEP: {patient.zipCode}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <button 
              onClick={() => toast.info("Funcionalidade de alteração de dados em breve. Por favor, contate a recepção.")}
              className="mt-8 w-full py-3 text-green-600 font-bold text-sm hover:bg-green-50 rounded-xl transition-all border border-green-100"
            >
              Solicitar Alteração
            </button>
          </div>

          <div className="bg-gray-900 p-8 rounded-3xl shadow-xl text-white">
            <h4 className="font-bold text-lg mb-4">Precisa de ajuda?</h4>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">Caso tenha dúvidas sobre seus resultados ou encontre algum problema, nossa equipe está à disposição.</p>
            <a 
              href="https://wa.me/5511999998888" 
              target="_blank" 
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold transition-all"
            >
              Falar no WhatsApp <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

const PatientPortal: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Routes>
        <Route index element={<PatientOverview />} />
      </Routes>
    </div>
  );
};

export default PatientPortal;
