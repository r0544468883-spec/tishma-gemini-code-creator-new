
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ChatMessage } from '../types';
import { Icons } from '../constants';
import { Language, translations } from '../translations';
import { transcribeMicrophoneInput, analyzeLegalDocument } from '../services/geminiService';

interface ChatInterfaceProps {
  onClose: () => void;
  lang: Language;
  embedded?: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ lang, onClose }) => {
  const t = translations[lang];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [sessionTerminated, setSessionTerminated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const MESSAGE_LIMIT = 4;
  const isRtl = lang === 'he';

  useEffect(() => {
    if (messages.length === 0) {
      const intro = lang === 'he' 
        ? `שלום, אני ניסים, המומחה בינה משפטית האישי שלך :-) ✨

אני כאן כדי להעניק לך עזרה משפטית ראשונית, לפשט עבורך מסמכים מורכבים ולעזור לך להבין בדיוק מה הצעד הבא שלך.

איך אני יכול לעזור לך היום? 😊

⚠️ **שימו לב:** אני עוזר בינה מלאכותית ולא עורך דין אנושי. כדי לשמור על ביטחון המידע, כל השיחות נמחקה לצמיתות לאחר 4 הודעות.` 
        : `Hello, I'm Nissim, your personal Legal AI expert :-) ✨

I'm here to provide initial legal help and simplify complex documents. How can I help you today? 😊

⚠️ **Note:** I am an AI, not a lawyer. Conversations are deleted after 4 messages.`;

      setMessages([{
        role: 'model',
        content: intro,
        timestamp: new Date().toISOString(),
        quickReplies: [
          t.legalFields.labor,
          t.legalFields.realestate,
          t.legalFields.family,
          t.legalFields.tort
        ]
      }]);
    }
  }, [lang]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const triggerLeadForm = () => {
    setSessionTerminated(true);
  };

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(lang === 'he' ? "הפרטים התקבלו! עורך דין מומחה יחזור אליך בקרוב מאוד. 😊" : "Details received! A specialist lawyer will contact you shortly. 😊");
    setMessages([]);
    setSessionTerminated(false);
    setUserMessageCount(0);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || userMessageCount >= MESSAGE_LIMIT) return;

    // Detect if user wants to talk to a lawyer or leave details
    const contactKeywords = ['עורך דין', 'פרטים', 'ליצור קשר', 'טלפון', 'lawyer', 'details', 'contact', 'phone', 'ייעוץ', 'סיוע'];
    const contactTrigger = contactKeywords.some(kw => text.toLowerCase().includes(kw));
    
    if (contactTrigger && userMessageCount > 0) {
      triggerLeadForm();
      return;
    }

    const newCount = userMessageCount + 1;
    setUserMessageCount(newCount);
    
    setMessages(prev => [...prev, { role: 'user', content: text, timestamp: new Date().toISOString() }]);
    setInputText('');
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const remaining = MESSAGE_LIMIT - newCount;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [
          { 
            role: 'user', 
            parts: [{ text: `Previous conversation summary: ${JSON.stringify(messages.slice(-3))}\n\nUser current message: ${text}` }] 
          }
        ],
        config: {
          systemInstruction: `You are Nissim (ניסים), Legal AI at Tishma.
CRITICAL RULES:
1. NO INTRODUCTIONS: Do not introduce yourself or say "Hello" again. Dive straight into the legal answer.
2. TONE: Warm, professional, and helpful. Use emojis like ⚖️, ✨, 😊.
3. REMINDER: You MUST append the following text to every response: "נשארו לנו עוד ${remaining} הודעות לשיחה זו 😊" (translate to language if needed).
4. QUICK REPLIES: Generate 3 short, interactive buttons that represent the best follow-up actions for the user.
5. LANGUAGE: ${lang}.
6. OUTPUT: Return strictly in JSON format.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              content: { type: Type.STRING },
              suggestedReplies: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              }
            },
            required: ["content", "suggestedReplies"]
          },
          tools: [{ googleSearch: {} }]
        }
      });

      const result = JSON.parse(response.text || '{}');
      
      setMessages(prev => [...prev, { 
        role: 'model', 
        content: result.content, 
        timestamp: new Date().toISOString(),
        quickReplies: [
          ...result.suggestedReplies,
          lang === 'he' ? "⚖️ ייעוץ מעורך דין" : "⚖️ Talk to a Lawyer"
        ]
      }]);

      if (newCount >= MESSAGE_LIMIT) {
        setTimeout(() => triggerLeadForm(), 5000);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', content: 'מצטער, הייתה לי שגיאה קטנה בחיבור. נסה שוב? 😊', timestamp: new Date().toISOString() }]);
    } finally {
      setIsTyping(false);
    }
  };

  const toggleRecording = async () => {
    if (userMessageCount >= MESSAGE_LIMIT) return;
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        chunksRef.current = [];
        recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
        recorder.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
          const reader = new FileReader();
          reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1];
            setIsTyping(true);
            try {
              const text = await transcribeMicrophoneInput(base64, lang);
              if (text) setInputText(text);
            } catch (e) { console.error(e); }
            finally { setIsTyping(false); }
          };
          reader.readAsDataURL(blob);
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch (err) { alert("Microphone access denied."); }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (userMessageCount >= MESSAGE_LIMIT) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const newCount = userMessageCount + 1;
    setUserMessageCount(newCount);
    setMessages(prev => [...prev, { role: 'user', content: lang === 'he' ? `צירפתי מסמך: ${file.name}` : `Uploaded: ${file.name}`, timestamp: new Date().toISOString() }]);

    setIsTyping(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const analysis = await analyzeLegalDocument(file.name, reader.result as string, lang);
        const remaining = MESSAGE_LIMIT - newCount;
        setMessages(prev => [...prev, {
          role: 'model',
          content: `${analysis.summary}\n\nנשארו לנו עוד ${remaining} הודעות לשיחה זו 😊\n\nתרצה שאחבר אותך לעורך דין מומחה שיעבור על המסמך?`,
          timestamp: new Date().toISOString(),
          quickReplies: [
            lang === 'he' ? "כן, אשמח לעורך דין" : "Yes, get a lawyer",
            lang === 'he' ? "מה הסיכויים שלי?" : "What are my chances?",
            lang === 'he' ? "מה השלב הבא?" : "Next steps?"
          ]
        }]);
        if (newCount >= MESSAGE_LIMIT) setTimeout(() => triggerLeadForm(), 5000);
      } catch (error) {
        setMessages(prev => [...prev, { role: 'model', content: "שגיאה בניתוח המסמך. נסה שוב? 😊", timestamp: new Date().toISOString() }]);
      } finally { setIsTyping(false); }
    };
    reader.readAsDataURL(file);
  };

  if (sessionTerminated) {
    return (
      <div className="flex flex-col w-full h-full bg-slate-950 text-white p-6 md:p-10 justify-center items-center text-center space-y-8 animate-in fade-in duration-700">
        <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center text-black shadow-2xl">
          <Icons.CheckCircle />
        </div>
        <div className="space-y-4 max-w-md">
          <h3 className="text-3xl font-black text-primary leading-tight">ביטחון המידע שלך הוא מעל הכל ✨</h3>
          <p className="text-lg text-slate-300 font-medium">כדי להגן על פרטיותך, השיחה הסתיימה וכל תוכנה נמחק לצמיתות.</p>
          <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
            <p className="text-md font-bold text-white">השאר פרטים ונציג אנושי (עורך דין) יחזור אליך עם הייעוץ המלא:</p>
          </div>
        </div>
        <form onSubmit={handleLeadSubmit} className="w-full max-w-xs space-y-4">
          <input required type="text" placeholder="שם מלא" className="w-full p-4 rounded-2xl bg-white/10 border-2 border-white/10 outline-none focus:border-primary text-lg" />
          <input required type="tel" placeholder="מספר טלפון" className="w-full p-4 rounded-2xl bg-white/10 border-2 border-white/10 outline-none focus:border-primary text-lg" />
          <button type="submit" className="w-full py-5 bg-primary text-black rounded-3xl font-black text-xl shadow-xl hover:scale-105 active:scale-95 transition-all">שלח וקבל סיוע עכשיו</button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full bg-white relative">
      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center shrink-0 z-20">
         <div className={`flex items-center gap-3 ${!isRtl && 'flex-row-reverse'}`}>
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
               <Icons.Scale />
            </div>
            <div className="overflow-hidden">
               <h3 className="font-black text-slate-800 text-[16px] leading-tight truncate">ניסים - סיוע משפטי</h3>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  {userMessageCount}/{MESSAGE_LIMIT} הודעות • מאובטח
               </span>
            </div>
         </div>
         <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
         </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-grow overflow-y-auto p-4 md:p-8 space-y-8 bg-white/50 pb-32">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-300`}>
            <div className={`max-w-[92%] p-5 md:p-8 rounded-[2.5rem] shadow-xl border-2 ${
              msg.role === 'user' 
                ? 'bg-primary text-black font-bold border-primary rounded-tr-none' 
                : 'bg-slate-50 text-slate-900 border-slate-100 rounded-tl-none'
            }`}>
              <div className="text-[17px] md:text-[20px] leading-relaxed font-medium whitespace-pre-wrap">
                {msg.content}
              </div>
              
              {msg.quickReplies && (
                <div className={`mt-6 flex flex-wrap gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  {msg.quickReplies.map((qr, i) => (
                    <button 
                      key={i} 
                      onClick={() => sendMessage(qr)} 
                      className={`px-6 py-3 rounded-2xl text-[14px] font-black border-2 transition-all active:scale-95 shadow-md flex-1 min-w-[120px] text-center ${
                        qr.includes('עורך דין') || qr.includes('Lawyer')
                        ? 'bg-primary border-primary text-black'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-primary'
                      }`}
                    >
                      {qr}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className={`flex ${isRtl ? 'justify-end' : 'justify-start'}`}>
            <div className="bg-slate-50 border-2 border-slate-100 p-4 rounded-3xl flex gap-3 items-center shadow-sm">
              <span className="text-[12px] font-black text-primary animate-pulse">ניסים חושב עבורך...</span>
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area - Mobile Optimized */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent pt-10">
        <form 
          onSubmit={(e) => { e.preventDefault(); sendMessage(inputText); }} 
          className={`flex items-center gap-2 bg-slate-50 rounded-[2.5rem] border-2 border-slate-200 focus-within:border-primary focus-within:bg-white transition-all p-2 shadow-2xl ${!isRtl && 'flex-row-reverse'}`}
        >
          <div className="flex gap-1">
             <label className="w-12 h-12 rounded-full flex items-center justify-center text-slate-400 hover:text-primary cursor-pointer transition-all">
                <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
                <Icons.Upload />
             </label>
             <button type="button" onClick={toggleRecording} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-primary'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
             </button>
          </div>
          <input 
            type="text" 
            value={inputText} 
            onChange={(e) => setInputText(e.target.value)} 
            placeholder={lang === 'he' ? "כתוב לניסים כאן..." : "Ask Nissim..."} 
            className="flex-grow bg-transparent px-3 outline-none text-slate-900 text-lg font-medium h-12 placeholder-slate-300" 
          />
          <button type="submit" disabled={!inputText.trim() || isTyping} className="w-12 h-12 bg-primary text-black rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all disabled:opacity-30">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className={`${!isRtl ? 'rotate-180' : ''}`}><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4Z"/></svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
