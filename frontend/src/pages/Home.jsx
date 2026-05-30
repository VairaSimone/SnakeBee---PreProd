import { useTranslation } from "react-i18next";
import {
    ChevronRight,
    Trophy, Users, Activity, Crown, Star,
    ShieldCheck, Zap, Heart, CheckCircle2, Quote, Mail, Instagram, MessageCircle, ExternalLink,
    ShoppingCart, HelpCircle
} from "lucide-react";
import MarketPromoSection from "../components/MarketPromoSection";
import axios from 'axios';
import { useState, useEffect } from "react";
import { MARKET_URL } from '../utils/marketData';
import { FaInstagram } from "react-icons/fa";

// --- COMPONENTE MACRO-AREA (Feature Group) ---
const FeatureGroup = ({ title, description, features, videoSrc, reverse }) => (
    <div className={`flex flex-col lg:flex-row items-center gap-12 py-16 ${reverse ? 'lg:flex-row-reverse' : ''}`}>
        <div className="flex-1 space-y-6">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h3>
            <p className="text-lg text-slate-600 leading-relaxed">{description}</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                        <CheckCircle2 className="text-amber-500 mt-1 shrink-0" size={18} />
                        <span className="text-sm font-semibold text-slate-700">{f}</span>
                    </li>
                ))}
            </ul>
        </div>
        <div className="flex-1 w-full max-w-2xl bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border-8 border-slate-800">
            <video 
                autoPlay loop muted playsInline 
                className="w-full h-full object-cover opacity-90"
                poster="https://placehold.co/600x400/1e293b/white?text=Anteprima+Dashboard"
            >
                <source src={videoSrc} type="video/mp4" />
            </video>
        </div>
    </div>
);

// --- SEZIONE STATISTICHE DELLA COMMUNITY (Live Stats) ---
const CommunityStats = () => {
    // In futuro puoi sostituire questi dati statici con una chiamata axios (es. /api/stats)
    const stats = [
        { label: "Rettili Registrati", value: "5.200+" },
        { label: "Pasti Tracciati", value: "18.500+" },
        { label: "Documenti CITES", value: "3.400+" },
        { label: "Allevatori Attivi", value: "850+" }
    ];

    return (
        <section className="py-12 bg-amber-500 text-slate-900">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    {stats.map((stat, i) => (
                        <div key={i} className="space-y-1">
                            <div className="text-4xl md:text-5xl font-black tracking-tighter">{stat.value}</div>
                            <div className="text-sm md:text-base font-bold opacity-80 uppercase tracking-widest">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

// --- SEZIONE CLASSIFICHE COMPATTA ---
const CompactLeaderboard = () => {
    const [data, setData] = useState(null);

    useEffect(() => {
        const fetchLeaderboards = async () => {
            try {
                const response = await axios.get('/api/gamification/leaderboards');
                setData(response.data);
            } catch (err) { console.error(err); }
        };
        fetchLeaderboards();
    }, []);

    if (!data) return null;

    const Board = ({ title, items, icon: Icon, unit, color }) => (
        <div className="flex-1 min-w-[300px] rounded-2xl p-5 shadow-md border border-slate-100 bg-white">
            <div className="flex items-center gap-2 mb-4">
                <Icon size={20} className={color} />
                <h4 className="font-bold text-slate-800 uppercase text-xs tracking-widest">{title}</h4>
            </div>
            <div className="space-y-2">
                {items.slice(0, 5).map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                            <span className={`text-xs font-bold w-5 ${i === 0 ? 'text-amber-500' : 'text-slate-400'}`}>#{i+1}</span>
                            <span className="text-sm font-bold text-slate-700">{item.name}</span>
                        </div>
                        <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-1 rounded text-slate-600">
                            {item.count || item.activityCount || item.referralCount} {unit}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <section className="py-12 bg-slate-50 border-y border-slate-200">
            <div className="container mx-auto px-6">
                <h2 className="text-2xl font-black text-center mb-8">Community Highlights</h2>
                <div className="flex flex-wrap gap-6 justify-center">
                    <Board title="Top Allevatori" items={data.topKeepers} icon={Trophy} unit="🐍" color="text-amber-500" />
                    <Board title="Più Attivi" items={data.topActive} icon={Activity} unit="🔥" color="text-blue-500" />
                    <Board title="Helpers" items={data.topReferrers} icon={Star} unit="✨" color="text-purple-500" />
                </div>
            </div>
        </section>
    );
};

// --- SEZIONE TESTIMONIAL ---
const Testimonials = () => {
    const reviews = [
        { name: "Marco R.", role: "Allevatore Professionista", text: "Finalmente un software che parla la nostra lingua. La gestione CITES mi risparmia ore di lavoro ogni mese.", stars: 5 },
        { name: "Sara V.", role: "Appassionata", text: "Il bot Telegram è la svolta. Posso segnare i pasti mentre sono in allevamento senza toccare il PC.", stars: 5 },
        { name: "Luca T.", role: "Vendor", text: "Professionale, intuitivo e completo. Il QR Code su ogni teca dà un'immagine pazzesca ai miei clienti.", stars: 5 },
    ];

    return (
        <section className="py-20">
            <div className="container mx-auto px-6 text-center">
                <h2 className="text-3xl font-black mb-12">Cosa dicono gli abbonati</h2>
                <div className="grid md:grid-cols-3 gap-8">
                    {reviews.map((rev, i) => (
                        <div key={i} className="p-8 rounded-3xl relative text-left border border-amber-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                            <Quote className="absolute top-4 right-4 text-amber-200" size={40} />
                            <div className="flex gap-1 mb-4 text-amber-500">
                                {[...Array(rev.stars)].map((_, s) => <Star key={s} size={16} fill="currentColor" />)}
                            </div>
                            <p className="text-slate-700 italic mb-6">"{rev.text}"</p>
                            <div>
                                <p className="font-bold text-slate-900">{rev.name}</p>
                                <p className="text-sm text-slate-500">{rev.role}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

// --- SEZIONE PREZZI & PIANI ---
// --- SEZIONE PREZZI & PIANI ---
const PricingSection = () => {
    // Sostituisci questi dati con i testi esatti della tua immagine
    const plans = [
        {
            name: "Free",
            price: "0€",
            period: "/ mese",
            description: "L'essenziale per iniziare a tracciare i tuoi primi animali.",
            features: [
                "Fino a 5 animali",
                "Registrazione pasti e mute",
                "Statistiche di base",
                "Generazione documenti CITES",
            ],
            cta: "Inizia Gratis",
            highlighted: false
        },
        {
            name: "Praticante",
            price: "6.99€", // Cambia con il tuo prezzo
            period: "/ mese",
            description: "Il piano perfetto per un piccolo allevamento",
            features: [
                "Fino a 50 animali",
                "Bot Telegram incluso",
                "Gestione riproduzioni"
            ],
            cta: "Prova SnakeBee",
            highlighted: false
        },
        {
            name: "Allevatore",
            price: "14.99€", // Cambia con il tuo prezzo
            period: "/ mese",
            description: "Nessun limite. Il massimo per il tuo allevamento professionale.",
            features: [
                "Animali ILLIMITATI",
                "Inventario cibo",
                "QR Code per i tuoi animali",
                "Gestione finanziaria del tuo allevamento",
                "Accesso multi-dispositivo"

            ],
            cta: "Scegli il meglio",
            highlighted: false
        }
    ];

    return (
        <section id="pricing" className="py-24 bg-slate-50 border-t border-slate-200">
            <div className="container mx-auto px-6 max-w-6xl text-center">
                <h2 className="text-4xl font-black text-slate-900 mb-4">Scegli il piano giusto per te</h2>
                <p className="text-slate-600 mb-12 max-w-2xl mx-auto text-lg">
                    Inizia gratuitamente, fai l'upgrade quando il tuo allevamento cresce. Tutti i piani a pagamento includono una prova di 14 giorni, senza vincoli.
                </p>
                
                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {plans.map((plan, index) => (
                        <div 
                            key={index} 
                            className={`p-8 rounded-3xl text-left relative flex flex-col transition-all duration-300 ${
                                plan.highlighted 
                                ? 'bg-slate-900 shadow-2xl border border-slate-800 transform md:-translate-y-4' 
                                : 'bg-white shadow-sm border border-slate-200 hover:shadow-md hover:-translate-y-1'
                            }`}
                        >
                            {plan.highlighted && (
                                <div className="absolute top-0 right-6 transform -translate-y-1/2 bg-amber-500 text-slate-900 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
                                    Il Più Scelto
                                </div>
                            )}
                            
                            <h3 className={`text-2xl font-bold mb-2 ${plan.highlighted ? 'text-white' : 'text-slate-900'}`}>
                                {plan.name}
                            </h3>
                            <p className={`mb-6 text-sm h-10 ${plan.highlighted ? 'text-slate-400' : 'text-slate-500'}`}>
                                {plan.description}
                            </p>
                            
                            <div className={`text-5xl font-black mb-6 ${plan.highlighted ? 'text-white' : 'text-slate-900'}`}>
                                {plan.price} <span className={`text-lg font-normal ${plan.highlighted ? 'text-slate-400' : 'text-slate-400'}`}>{plan.period}</span>
                            </div>
                            
                            <ul className="space-y-4 mb-8 flex-1">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className={`flex items-start gap-3 ${plan.highlighted ? 'text-slate-300' : 'text-slate-700'}`}>
                                        <CheckCircle2 className="text-amber-500 mt-0.5 shrink-0" size={20}/>
                                        <span className="text-sm font-semibold">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            
                            <a 
                                href="/register" 
                                className={`block w-full text-center font-bold py-4 rounded-xl transition-colors ${
                                    plan.highlighted 
                                    ? 'bg-amber-500 text-slate-900 hover:bg-amber-400' 
                                    : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                                }`}
                            >
                                {plan.cta}
                            </a>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

// --- SEZIONE FAQ ---
const FAQSection = () => {
    const faqs = [
        { q: "I miei dati sono al sicuro?", a: "Assolutamente sì. I tuoi dati sono crittografati, salvati su server protetti e visibili unicamente a te. Nessun altro utente avrà accesso alle tue statistiche." },
        { q: "Come funziona esattamente il bot Telegram?", a: "Dopo la registrazione potrai collegare il tuo account Telegram. Il bot diventerà il tuo assistente: potrai inviargli messaggi testuali o comandi per registrare i pasti, le mute e il peso direttamente mentre sei nella stanza dei rettili, senza toccare il PC." },
        { q: "Posso annullare l'abbonamento quando voglio?", a: "Sì, l'abbonamento è senza vincoli. Puoi disdirlo in qualsiasi momento direttamente dalla tua dashboard. I tuoi dati resteranno esportabili." },
        { q: "Serve installare un'applicazione?", a: "No, SnakeBee è una piattaforma web in Cloud. Puoi accedervi da PC, Tablet o Smartphone semplicemente usando il tuo browser preferito." }
    ];

    return (
        <section className="py-24 bg-white">
            <div className="container mx-auto px-6 max-w-4xl">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-black text-slate-900 mb-4">Domande Frequenti</h2>
                    <p className="text-slate-600 text-lg">Hai dubbi? Ecco le risposte alle domande più comuni della nostra community.</p>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    {faqs.map((faq, i) => (
                        <div key={i} className="p-8 bg-slate-50 rounded-3xl border border-slate-100 hover:border-amber-200 transition-colors">
                            <h4 className="text-lg font-bold text-slate-900 mb-3 flex items-start gap-3">
                                <HelpCircle className="text-amber-500 shrink-0 mt-1" size={20} />
                                {faq.q}
                            </h4>
                            <p className="text-slate-600 leading-relaxed ml-8">{faq.a}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

// --- FINAL CTA BANNER ---
const FinalCTA = () => {
    const { t } = useTranslation();
    
    return (
        <section className="py-24 bg-gradient-to-br from-slate-900 to-slate-800 text-center px-6 relative overflow-hidden">
            {/* Decorazioni di background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
                <div className="absolute -top-20 -left-20 w-64 h-64 bg-amber-500 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 -right-20 w-80 h-80 bg-amber-400 rounded-full blur-3xl"></div>
            </div>
            
            <div className="container mx-auto max-w-3xl relative z-10">
                <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
                    {t('home.ctaEnd.title', 'Sei pronto a fare il salto di qualità?')}
                </h2>
                <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
                    {t('home.ctaEnd.desc', 'Unisciti agli allevatori che hanno scelto il futuro.')}
                </p>
                <a href="/register" className="inline-flex items-center gap-2 bg-amber-500 text-slate-900 px-10 py-5 rounded-full font-black text-lg hover:bg-amber-400 transition-all hover:scale-105 shadow-2xl">
                    {t('home.ctaEnd.cta', 'Inizia la prova gratuita')}
                    <ChevronRight size={24} />
                </a>
            </div>
        </section>
    );
};

const Home = () => {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen text-slate-800 font-sans bg-white">
            {/* HERO SECTION */}
            <section className="relative bg-gradient-to-br from-amber-50 via-yellow-100 to-white overflow-hidden">
                <div className="container mx-auto px-6 pt-24 pb-20 text-center">
                    <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur px-4 py-2 rounded-full border border-amber-200 text-amber-700 text-sm font-bold mb-6">
                        <Zap size={16} fill="currentColor" /> {t('home.hero.badge', 'La rivoluzione del rettilario è qui')}
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-6 leading-tight tracking-tight">
                        {t('home.hero.title')}
                    </h1>
                    <p className="text-xl text-slate-700 max-w-3xl mx-auto mb-10 leading-relaxed">
                        {t('home.hero.subtitle')}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <a href="/register" className="group bg-slate-900 text-white px-10 py-5 rounded-full font-black text-lg hover:bg-slate-800 transition-all hover:scale-105 shadow-xl flex items-center gap-2">
                            {t('home.hero.ctaStart')}
                            <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                        </a>
                        <div className="flex items-center gap-4 text-slate-500 text-sm font-medium">
                            <span className="flex -space-x-2">
                                {[1,2,3,4].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold overflow-hidden"><img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="user"/></div>)}
                            </span>
                            +100 Allevatori attivi
                        </div>
                    </div>
                </div>
            </section>

            {/* LIVE COMMUNITY STATS */}
            <CommunityStats />

            {/* FEATURES SECTION */}
            <section id="funzionalita" className="py-20">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-black text-slate-900 mb-4">{t('home.features.title')}</h2>
                        <p className="text-slate-600 max-w-2xl mx-auto text-lg">{t('home.features.subtitle')}</p>
                    </div>

                    <FeatureGroup 
                        title={t('home.features.biological.title', 'Gestione Biologica & Allevamento')}
                        description={t('home.features.biological.desc', "Monitora ogni aspetto vitale dei tuoi animali con una precisione chirurgica. Genetica, crescita e benessere in un'unica vista.")}
                        features={["Schede Rettili Dettagliate", "Pianificazione Breeding", "Inventario Pasti Auto-aggiornante", "Analisi Tassi di Successo"]}
                        videoSrc="/videos/biological-demo.mp4" 
                        reverse={false}
                    />

                    <FeatureGroup 
                        title={t('home.features.admin.title', 'Amministrazione & CITES')}
                        description={t('home.features.admin.desc', "Dimentica la burocrazia manuale. Genera documenti legali e traccia la genealogia con un click.")}
                        features={["Generatore CITES PDF", "Registri Carico/Scarico", "Archivio Documenti Digitali", "QR Code Professionali"]}
                        videoSrc="/videos/admin-demo.mp4"
                        reverse={true}
                    />

                    <FeatureGroup 
                        title={t('home.features.automation.title', 'Automazioni & Smart Tools')}
                        description={t('home.features.automation.desc', "Il software lavora per te. Gestisci l'allevamento mentre sei fuori casa o direttamente dalla tua chat preferita.")}
                        features={["Bot Telegram Dedicato", "Calendario Eventi Intelligente", "Notifiche Real-time", "Accesso Multi-dispositivo"]}
                        videoSrc="/videos/automation-demo.mp4"
                        reverse={false}
                    />
                </div>
            </section>

            {/* SOCIAL PROOF */}

            {/* LEADERBOARD COMPATTA */}
            <CompactLeaderboard />

            {/* PIANI E PREZZI */}
            <PricingSection />

            {/* CHI SIAMO */}
            <section id="chi-siamo" className="py-24 border-t border-slate-100">
                <div className="container mx-auto px-6 grid md:grid-cols-2 gap-16 items-center text-left">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 mb-6">{t('home.about.title')}</h2>
                        <div className="w-20 h-2 bg-amber-400 mb-8 rounded-full"></div>
                        <p className="text-slate-700 text-lg leading-relaxed mb-6 italic border-l-4 border-amber-200 pl-6">
                            "{t('home.about.desc')}"
                        </p>
                    </div>
                    <div className="bg-slate-100 h-80 rounded-[3rem] flex items-center justify-center border-4 border-white shadow-inner">
                         <img src="/Logo.png" alt="About" className="h-48 opacity-50" />
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <FAQSection />

            {/* FINAL CTA BANNER */}
            <FinalCTA />

            {/* SEZIONE CONTATTI */}
            <section id="contatti" className="py-24 bg-slate-50">
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
                            {t('home.contact.title', 'Restiamo in Contatto')}
                        </h2>
                        <p className="text-slate-600 mb-12 text-lg">
                            {t('home.contact.desc', 'Per qualsiasi domanda, suggerimento o collaborazione, scrivici o ')} 
                            {t('home.contact.or', 'seguici sui social')}
                        </p>

                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Card Email */}
                            <a 
                                href="mailto:support@snakebee.it" 
                                className="group bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 hover:border-amber-400 hover:shadow-xl transition-all duration-300 text-left flex items-center gap-6"
                            >
                                <div className="p-4 bg-amber-100 text-amber-600 rounded-2xl group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                    <Mail size={32} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-xl text-slate-900">Supporto Email</h4>
                                    <p className="text-slate-500 text-sm mb-1">Rispondiamo entro 24h</p>
                                    <span className="text-amber-600 font-semibold group-hover:underline flex items-center gap-1">
                                        support@snakebee.it <ExternalLink size={14} />
                                    </span>
                                </div>
                            </a>

                            {/* Card Instagram */}
                            <a 
                                href="https://www.instagram.com/snakebeeofficial/" 
                                target="_blank" 
                                rel="noreferrer"
                                className="group bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 hover:border-pink-500 hover:shadow-xl transition-all duration-300 text-left flex items-center gap-6"
                            >
                                <div className="p-4 bg-pink-100 text-pink-600 rounded-2xl group-hover:bg-pink-500 group-hover:text-white transition-colors">
                                    <FaInstagram size={32} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-xl text-slate-900">{t('home.contact.instagram', 'Instagram')}</h4>
                                    <p className="text-slate-500 text-sm mb-1">Segui i nostri update</p>
                                    <span className="text-pink-600 font-semibold group-hover:underline flex items-center gap-1">
                                        @snakebeeofficial <ExternalLink size={14} />
                                    </span>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;