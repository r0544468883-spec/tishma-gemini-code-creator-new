
import React, { useState, useRef } from 'react';
import { Icons } from '../constants';
import { CaseFormData } from '../types';
import { Language, translations } from '../translations';
import { transcribeMicrophoneInput, generateCaseVisualization } from '../services/geminiService';

interface CaseFormProps {
  onSubmit: (data: CaseFormData) => void;
  isLoading: boolean;
  lang: Language;
}

const CaseForm: React.FC<CaseFormProps> = ({ onSubmit, isLoading, lang }) => {
  const t = translations[lang];
  const [currentStep, setCurrentStep] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [isVideoGenerating, setIsVideoGenerating] = useState(false);
  const [videoAspect, setVideoAspect] = useState<'16:9' | '9:16'>('16:9');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [formData, setFormData] = useState<CaseFormData>({
    fullName: '',
    email: '',
    phone: '',
    legalField: '',
    hasDeadline: false,
    narrative: '',
    filePreview: null,
    selectedFile: null,
    generatedVideoUrl: undefined
  });

  const steps = [
    { id: 1, title: t.step1 },
    { id: 2, title: t.step2 },
    { id: 3, title: t.step3 },
    { id: 4, title: t.step4 }
  ];

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = (reader.result as string).split(',')[1];
          const text = await transcribeMicrophoneInput(base64, lang);
          setFormData(p => ({ ...p, narrative: p.narrative + " " + text }));
        };
        reader.readAsDataURL(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    }
  };

  // Improved handleVeoGenerate with mandatory API key selection logic
  const handleVeoGenerate = async () => {
    if (!formData.narrative) return;
    
    // As per guidelines, check if an API key has been selected before using Veo models
    if (!(await (window as any).aistudio.hasSelectedApiKey())) {
      await (window as any).aistudio.openSelectKey();
      // Assume success after triggering the dialog to avoid race conditions
    }

    setIsVideoGenerating(true);
    try {
      const url = await generateCaseVisualization(formData.narrative, videoAspect);
      setFormData(p => ({ ...p, generatedVideoUrl: url }));
    } catch (e: any) {
      // Re-prompt for API key if entity is not found (often indicates billing/key issues)
      if (e.message?.includes("Requested entity was not found.")) {
        await (window as any).aistudio.openSelectKey();
      }
      alert("Veo Generation Failed. Please ensure you have selected a valid paid API key.");
    } finally {
      setIsVideoGenerating(false);
    }
  };

  const isStepValid = () => {
    if (currentStep === 1) return !!formData.fullName && !!formData.email;
    if (currentStep === 2) return !!formData.legalField;
    if (currentStep === 3) return !!formData.narrative && formData.narrative.length > 5;
    return true;
  };

  const isRtl = lang === 'he';

  return (
    <div className="glass-effect-strong rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
      {/* Progress Header */}
      <div className="bg-white/5 border-b border-white/10 px-10 py-10 flex justify-between items-center relative">
        {steps.map((step) => (
          <div key={step.id} className="flex flex-col items-center flex-1 relative z-10">
            <div className={`w-14 h-14 rounded-3xl flex items-center justify-center font-black text-lg transition-all ${
              currentStep >= step.id ? 'bg-primary text-black' : 'bg-white/10 text-slate-500'
            }`}>
              {currentStep > step.id ? <Icons.CheckCircle /> : step.id}
            </div>
            <span className={`text-[10px] mt-4 font-black uppercase tracking-[0.2em] ${currentStep >= step.id ? 'text-primary' : 'text-slate-600'}`}>
              {step.title}
            </span>
          </div>
        ))}
        <div className="absolute top-[4.2rem] left-20 right-20 h-0.5 bg-white/5 -z-0" />
      </div>

      <div className="p-10 md:p-16">
        {currentStep === 1 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-left-6">
             <div className="space-y-4 text-center sm:text-right">
                <h3 className="text-4xl font-black">{t.form.introTitle}</h3>
                <p className="text-slate-400 text-lg font-light">{t.form.introSub}</p>
             </div>
             <div className="space-y-6">
                <input 
                  className="w-full p-6 rounded-[2rem] bg-white/5 border border-white/10 text-xl font-light focus:border-primary transition-all outline-none" 
                  placeholder={t.form.fullName}
                  value={formData.fullName}
                  onChange={e => setFormData(p => ({ ...p, fullName: e.target.value }))}
                />
                <input 
                  className="w-full p-6 rounded-[2rem] bg-white/5 border border-white/10 text-xl font-light focus:border-primary transition-all outline-none" 
                  placeholder={t.form.email}
                  value={formData.email}
                  onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                />
             </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-left-6">
             <div className="flex justify-between items-end">
                <div className="space-y-2">
                   <h3 className="text-4xl font-black">{t.form.narrativeTitle}</h3>
                   <p className="text-slate-500">{t.form.narrativeSub}</p>
                </div>
                <button 
                  onClick={toggleRecording}
                  className={`px-8 py-3 rounded-2xl font-black uppercase text-xs transition-all flex items-center gap-3 ${
                    isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-primary text-black'
                  }`}
                >
                  <Icons.Calendar />
                  {isRecording ? 'Listening...' : 'Dictate'}
                </button>
             </div>
             <textarea 
               className="w-full min-h-[300px] p-8 rounded-[2.5rem] bg-white/5 border border-white/10 text-xl font-light leading-relaxed focus:border-primary transition-all outline-none resize-none"
               placeholder="..."
               value={formData.narrative}
               onChange={e => setFormData(p => ({ ...p, narrative: e.target.value }))}
             />
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-12 animate-in fade-in slide-in-from-left-6">
             <div className="text-center space-y-4">
                <h3 className="text-4xl font-black">{t.form.uploadTitle}</h3>
                <p className="text-slate-400">{t.form.uploadSub}</p>
             </div>
             
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upload Section */}
                <div className="relative group h-72 border-2 border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center bg-white/[0.02] hover:border-primary/50 transition-all overflow-hidden cursor-pointer">
                   {formData.filePreview ? (
                      <img src={formData.filePreview} className="absolute inset-0 w-full h-full object-cover opacity-30" />
                   ) : (
                      <div className="text-primary p-6 bg-primary/5 rounded-3xl"><Icons.Upload /></div>
                   )}
                   <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const r = new FileReader();
                        r.onload = () => setFormData(p => ({ ...p, filePreview: r.result as string, selectedFile: f }));
                        r.readAsDataURL(f);
                      }
                    }}
                   />
                   <span className="mt-4 font-black text-xs uppercase tracking-widest">{t.form.uploadBtn}</span>
                </div>

                {/* Veo Generation Section */}
                <div className="h-72 glass-effect border border-white/10 rounded-[2.5rem] p-8 flex flex-col items-center justify-center gap-6 relative overflow-hidden">
                   {formData.generatedVideoUrl ? (
                      <video src={formData.generatedVideoUrl} controls className="absolute inset-0 w-full h-full object-contain" />
                   ) : (
                      <>
                        <div className="flex gap-4">
                           <button onClick={() => setVideoAspect('16:9')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${videoAspect === '16:9' ? 'bg-primary text-black border-primary' : 'text-slate-500 border-white/10'}`}>16:9</button>
                           <button onClick={() => setVideoAspect('9:16')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${videoAspect === '9:16' ? 'bg-primary text-black border-primary' : 'text-slate-500 border-white/10'}`}>9:16</button>
                        </div>
                        <button 
                          onClick={handleVeoGenerate}
                          disabled={isVideoGenerating || !formData.narrative}
                          className="px-8 py-4 bg-white/5 border border-white/10 text-white hover:text-primary hover:border-primary rounded-2xl font-black text-sm uppercase transition-all flex items-center gap-4"
                        >
                          {isVideoGenerating ? (
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Icons.Scale />
                          )}
                          {isVideoGenerating ? 'Veo Creating...' : 'Visualize Case (Veo)'}
                        </button>
                        <p className="text-[10px] text-slate-600 font-bold tracking-widest uppercase">Video Understanding Ready</p>
                      </>
                   )}
                </div>
             </div>
          </div>
        )}

        {/* Navigation Footer */}
        <div className="flex justify-between items-center mt-20 pt-10 border-t border-white/5">
           <button 
            onClick={() => setCurrentStep(p => Math.max(1, p-1))} 
            className={`px-10 py-4 font-black text-slate-500 hover:text-white transition-all uppercase text-xs tracking-widest ${currentStep === 1 && 'opacity-0 pointer-events-none'}`}
           >
              {t.form.back}
           </button>
           
           {currentStep < 4 ? (
             <button 
              onClick={() => setCurrentStep(p => p+1)} 
              disabled={!isStepValid()}
              className="px-12 py-5 bg-white text-black rounded-3xl font-black text-lg hover:bg-primary transition-all disabled:opacity-20 uppercase tracking-tighter"
             >
                {t.form.next}
             </button>
           ) : (
             <button 
              onClick={() => onSubmit(formData)} 
              disabled={isLoading}
              className="px-16 py-6 bg-primary text-black rounded-[2rem] font-black text-2xl shadow-2xl hover:bg-white hover:scale-105 active:scale-95 transition-all flex items-center gap-4 uppercase"
             >
                {isLoading ? 'Thinking...' : t.form.submit}
             </button>
           )}
        </div>
      </div>
    </div>
  );
};

export default CaseForm;
