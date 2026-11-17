import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Clock, FileCheck, MapPin, Phone, Mail, ArrowRight, ChevronRight, ArrowUp, Activity, Heart, Zap, Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  const features = [
    {
      icon: <Shield className="text-green-600" size={32} />,
      title: "Segurança de Dados",
      description: "Seus resultados protegidos com criptografia de ponta a ponta."
    },
    {
      icon: <Clock className="text-green-600" size={32} />,
      title: "Agilidade",
      description: "Resultados disponíveis online assim que liberados pela equipe médica."
    },
    {
      icon: <FileCheck className="text-green-600" size={32} />,
      title: "Histórico Completo",
      description: "Acesse todos os seus exames realizados em um só lugar."
    }
  ];

  const exames = [
    {
      title: "Análises Clínicas",
      description: "Exames de sangue, urina e fezes com processamento automatizado e precisão laboratorial.",
      icon: <FileCheck className="text-green-600" size={24} />,
      image: "https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&q=80&w=800"
    },
    {
      title: "Radiografia Digital",
      description: "Imagens de alta resolução com menor exposição à radiação e entrega rápida de resultados.",
      icon: <Zap className="text-green-600" size={24} />,
      image: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=800"
    },
    {
      title: "Ultrassonografia",
      description: "Diagnóstico por imagem em tempo real para diversas especialidades médicas.",
      icon: <Activity className="text-green-600" size={24} />,
      image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=800"
    },
    {
      title: "Tomografia",
      description: "Imagens detalhadas em 3D para diagnósticos complexos e precisos.",
      icon: <Stethoscope className="text-green-600" size={24} />,
      image: "https://images.unsplash.com/photo-1516062423079-7ca13cdc7f5a?auto=format&fit=crop&q=80&w=800"
    },
    {
      title: "Ressonância",
      description: "Tecnologia avançada para visualização precisa de tecidos moles e órgãos internos.",
      icon: <Shield className="text-green-600" size={24} />,
      image: "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&q=80&w=800"
    },
    {
      title: "Eletrocardiograma",
      description: "Avaliação rápida e precisa da atividade elétrica do coração para check-ups cardiológicos.",
      icon: <Heart className="text-green-600" size={24} />,
      image: "https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&q=80&w=800"
    }
  ];

  const heroImages = [
    "https://images.unsplash.com/photo-1559839734-2b71f153678f?auto=format&fit=crop&q=80&w=2000",
    "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=2000",
    "https://images.unsplash.com/photo-1581056771107-24ca5f033842?auto=format&fit=crop&q=80&w=2000",
    "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=2000"
  ];

  const [isVisible, setIsVisible] = useState(false);
  const [currentHeroImage, setCurrentHeroImage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHeroImage((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <div className="flex flex-col relative">
      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center overflow-hidden bg-gray-900">
        <div className="absolute inset-0 z-0">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentHeroImage}
              src={heroImages[currentHeroImage]}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/70 to-transparent"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl"
          >
            <span className="inline-block py-1 px-3 rounded-full bg-green-600/20 text-green-400 text-sm font-semibold mb-6 border border-green-500/30">
              Excelência em Diagnósticos
            </span>
            <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-8">
              Cuidando da sua saúde com <span className="text-green-500">tecnologia</span> e precisão.
            </h1>
            <p className="text-xl text-gray-300 mb-10 leading-relaxed">
              Acesse seus resultados de exames de forma rápida, segura e totalmente digital. 
              Sua saúde na palma da sua mão.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                to="/login" 
                className="bg-green-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-green-600/20"
              >
                Ver Meus Exames <ArrowRight size={20} />
              </Link>
              <a 
                href="#exames" 
                className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-8 py-4 rounded-full font-bold text-lg hover:bg-white/20 transition-all text-center"
              >
                Nossos Exames
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="sobre" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Por que escolher a Labclin?</h2>
            <p className="text-lg text-gray-600">Investimos constantemente em tecnologia e treinamento para oferecer o melhor atendimento e diagnósticos precisos.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {features.map((feature, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ y: -10 }}
                className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:shadow-2xl hover:shadow-green-600/5 transition-all"
              >
                <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-8">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Exames Section */}
      <section id="exames" className="py-24 bg-gray-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl font-bold text-gray-900 mb-6"
            >
              Exames que realizamos
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-gray-600"
            >
              Contamos com equipamentos de última geração e uma equipe de especialistas prontos para realizar seus exames com o máximo de conforto e precisão.
            </motion.p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {exames.map((exame, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -10 }}
                className="group relative bg-white rounded-[2rem] overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100"
              >
                <div className="h-48 overflow-hidden relative">
                  <img 
                    src={exame.image} 
                    alt={exame.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
                  <div className="absolute top-4 right-4 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg transform group-hover:rotate-12 transition-transform">
                    {exame.icon}
                  </div>
                </div>
                
                <div className="p-8 pt-4">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-green-600 transition-colors">
                    {exame.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed mb-6">
                    {exame.description}
                  </p>
                  <div className="flex items-center text-green-600 font-bold gap-2 group/btn cursor-pointer">
                    Saiba mais <ArrowRight size={18} className="group-hover/btn:translate-x-2 transition-transform" />
                  </div>
                </div>
                
                {/* Decorative element */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-green-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="mt-20 p-12 rounded-[3rem] bg-gray-900 text-white relative overflow-hidden"
          >
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="max-w-xl text-center lg:text-left">
                <h3 className="text-3xl font-bold mb-4">Não encontrou o exame que procura?</h3>
                <p className="text-gray-400 text-lg">Realizamos mais de 1.000 tipos de exames diferentes. Entre em contato para consultar nossa lista completa.</p>
              </div>
              <a 
                href="#contato" 
                className="bg-green-600 text-white px-10 py-5 rounded-full font-bold text-lg hover:bg-green-700 transition-all shadow-xl shadow-green-600/20 whitespace-nowrap"
              >
                Consultar Lista Completa
              </a>
            </div>
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-600/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-600/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-green-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">Pronto para ver seus resultados?</h2>
          <p className="text-xl text-green-100 mb-12 max-w-2xl mx-auto">Acesse agora o portal do paciente e tenha seus exames em mãos de forma simples e segura.</p>
          <Link 
            to="/login" 
            className="inline-flex items-center gap-2 bg-white text-green-600 px-10 py-5 rounded-full font-bold text-xl hover:bg-green-50 transition-all shadow-2xl"
          >
            Acessar Portal <ChevronRight size={24} />
          </Link>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contato" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-8">Entre em contato</h2>
              <p className="text-lg text-gray-600 mb-12">Estamos aqui para tirar suas dúvidas e agendar seus exames. Escolha o canal de sua preferência.</p>
              
              <div className="space-y-8">
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">Endereço</h4>
                    <p className="text-gray-600">Rua da Saúde, 123 - Centro, São Paulo - SP</p>
                  </div>
                </div>
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Phone className="text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">Telefone</h4>
                    <p className="text-gray-600">(11) 4002-8922 / (11) 99999-8888</p>
                  </div>
                </div>
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Mail className="text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">E-mail</h4>
                    <p className="text-gray-600">contato@labclin.com.br</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-10 rounded-3xl border border-gray-100">
              <form className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nome</label>
                    <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all" placeholder="Seu nome" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">E-mail</label>
                    <input type="email" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all" placeholder="seu@email.com" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Assunto</label>
                  <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all" placeholder="Como podemos ajudar?" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mensagem</label>
                  <textarea rows={4} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all" placeholder="Sua mensagem..."></textarea>
                </div>
                <button className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition-all shadow-lg shadow-green-600/20">
                  Enviar Mensagem
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {isVisible && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 z-50 p-4 bg-green-600 text-white rounded-full shadow-2xl hover:bg-green-700 transition-all focus:outline-none focus:ring-4 focus:ring-green-500/50 group"
            aria-label="Voltar ao topo"
          >
            <ArrowUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Home;
