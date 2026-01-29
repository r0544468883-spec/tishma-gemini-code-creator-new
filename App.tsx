
import React, { useState, useEffect } from 'react';
import { translations, Language } from './translations';
import ChatInterface from './components/ChatInterface';
import { Icons } from './constants';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('he');
  const t = translations[lang];

  useEffect(() => {
    const dir = lang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
    document.body.style.backgroundColor = '#000000';
  }, [lang]);

  const LanguageSwitcher = () => (
    <div className="flex gap-2 bg-white/5 p-1 rounded-full border border-white/10 backdrop-blur-md">
      {(['he', 'en', 'ru'] as Language[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`w-10 h-10 rounded-full text-[12px] font-black uppercase transition-all ${
            lang === l ? 'bg-primary text-black shadow-lg shadow-primary/40' : 'text-slate-400 hover:text-white'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-black text-white font-sans selection:bg-primary/30 overflow-x-hidden relative">
      {/* Dynamic Trust Background - Placeholder Logos */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.05] flex flex-wrap justify-around items-center p-20 gap-20 overflow-hidden grayscale">
         {Array.from({length: 12}).map((_, i) => (
           <div key={i} className="flex flex-col items-center gap-2">
             <div className="text-primary"><Icons.Scale /></div>
             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">LAW OFFICE {i+1}</span>
           </div>
         ))}
      </div>

      {/* Premium Header */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 py-4 shrink-0">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-primary p-3 rounded-2xl text-black shadow-xl shadow-primary/30">
              <Icons.Scale />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase leading-none">
                {t.appName}
              </h1>
              <p className="text-[10px] font-black text-primary tracking-[0.3em] mt-1.5 uppercase opacity-90">Legal AI Intelligence</p>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <nav className="hidden lg:flex gap-8 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
              <span className="text-primary flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_15px_#FFD700]"></div>
                ייעוץ ראשוני: ניסים זמין עכשיו
              </span>
            </nav>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-grow flex flex-col items-center justify-center py-10 relative z-10">
        <section className="w-full max-w-5xl px-6 text-center space-y-8 mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-block px-5 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-[11px] font-black tracking-[0.3em] uppercase">
             סיוע משפטי מהיר מבוסס בינה מלאכותית
          </div>
          <h2 className="text-4xl md:text-7xl font-black text-white leading-[1.1] tracking-tighter">
            {lang === 'he' ? (
              <>
                הופכים תסבוכת משפטית <br/>
                <span className="gold-glow">לפעולה פשוטה</span> <span className="diagonal-double-underline gold-glow">ללא עלות.</span>
              </>
            ) : (
              <>
                {t.slogan} <br/> <span className="gold-glow">{t.sloganAccent}</span>
              </>
            )}
          </h2>
          <p className="text-lg md:text-2xl text-slate-400 max-w-3xl mx-auto leading-relaxed font-light px-4">
            ניסים כאן כדי לפשט לך את התהליך ולעזור לך להבין את זכויותיך תוך דקות. 
            <br/> <span className="text-[10px] font-black uppercase text-primary/60 mt-6 block tracking-[0.4em]">סיוע משפטי ראשוני • ללא עלות • ניתוח מסמכים חכם</span>
          </p>
        </section>

        {/* Enhanced Wide Chat Container - 800px width */}
        <section className="w-full flex justify-center px-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
          <div className="bg-white rounded-[3rem] shadow-[0_50px_150px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-500 ease-in-out border-4 border-white/10 flex flex-col w-full max-w-[800px] min-h-[300px] max-h-[800px] group">
            <ChatInterface lang={lang} embedded={true} onClose={() => {}} />
          </div>
        </section>

        {/* Trust Badges below chat */}
        <div className="mt-16 flex flex-wrap justify-center gap-16 opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-700 cursor-default">
           <div className="flex items-center gap-4 text-xs font-black uppercase tracking-widest text-primary">
              <Icons.CheckCircle /> מאובטח SSL 256-bit
           </div>
           <div className="flex items-center gap-4 text-xs font-black uppercase tracking-widest text-primary">
              <Icons.Alert /> הגנת פרטיות מחמירה
           </div>
           <div className="flex items-center gap-4 text-xs font-black uppercase tracking-widest text-primary">
              <Icons.Calendar /> זמינות מלאה 24/7
           </div>
        </div>
      </main>

      {/* Corporate Footer */}
      <footer className="bg-black border-t border-white/5 py-12 px-6 shrink-0 z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-4">
             <div className="text-primary w-10 h-10"><Icons.Scale /></div>
             <span className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-500">
                © {new Date().getFullYear()} Tishma Intelligence Systems
             </span>
          </div>
          <div className="flex gap-10 text-[11px] font-black uppercase tracking-widest text-slate-600">
             <a href="#" className="hover:text-primary transition-colors">Legal Disclaimer</a>
             <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
             <a href="#" className="hover:text-primary transition-colors">Contact Expert</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
