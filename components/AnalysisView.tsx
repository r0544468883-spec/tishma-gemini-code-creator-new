
import React, { useState } from 'react';
import { LegalAnalysis, UrgencyLevel } from '../types';
import { Icons } from '../constants';
import { Language, translations } from '../translations';
import { generateSpeech, findNearbyLawyers } from '../services/geminiService';

interface AnalysisViewProps {
  analysis: LegalAnalysis;
  lang: Language;
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ analysis, lang }) => {
  const t = translations[lang];
  const [isPlaying, setIsPlaying] = useState(false);
  const [lawyerPlaces, setLawyerPlaces] = useState<{title: string, uri: string}[]>([]);
  const [isSearchingLawyers, setIsSearchingLawyers] = useState(false);

  // Correct implementation of PCM decoding for Gemini TTS raw output
  const handleTTS = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      const base64 = await generateSpeech(analysis.simplifiedHebrew);
      if (!base64) {
        setIsPlaying(false);
        return;
      }
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const dataInt16 = new Int16Array(bytes.buffer);
      const numChannels = 1;
      const sampleRate = 24000;
      const frameCount = dataInt16.length / numChannels;
      const buffer = audioContext.createBuffer(numChannels, frameCount, sampleRate);

      for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
          channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
      }

      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.onended = () => setIsPlaying(false);
      source.start();
    } catch (e) {
      console.error("TTS Error:", e);
      setIsPlaying(false);
    }
  };

  // Fixed setLawyerPlaces usage to match the array returned by findNearbyLawyers
  const handleFindLawyers = async () => {
    setIsSearchingLawyers(true);
    try {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const results = await findNearbyLawyers("Civil Law", pos.coords.latitude, pos.coords.longitude);
        setLawyerPlaces(results);
        setIsSearchingLawyers(false);
      }, async () => {
        const results = await findNearbyLawyers("Civil Law");
        setLawyerPlaces(results);
        setIsSearchingLawyers(false);
      });
    } catch (e) {
      setIsSearchingLawyers(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8">
      <div className="glass-effect rounded-[2rem] p-10 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-white">{t.analysis.resultsTitle}</h2>
          <p className="text-slate-400 font-light">{t.analysis.resultsSub}</p>
        </div>
        <button 
          onClick={handleTTS}
          disabled={isPlaying}
          className="px-6 py-3 bg-primary/10 text-primary border border-primary/30 rounded-xl font-bold flex items-center gap-2"
        >
          {isPlaying ? "Reading..." : "Listen to Summary"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <section className="glass-effect rounded-[2rem] p-10">
            <h3 className="text-2xl font-bold mb-8 text-white">{t.analysis.summaryTitle}</h3>
            <div className="text-lg text-slate-300 font-light">{analysis.simplifiedHebrew}</div>
          </section>

          <section className="glass-effect rounded-[2rem] p-10">
            <h3 className="text-2xl font-bold mb-8 text-white">Recommended Steps</h3>
            <div className="space-y-6">
              {analysis.recommendedActions.map((a, i) => (
                <div key={i} className="p-6 rounded-3xl bg-white/5 border border-white/5 flex gap-6">
                  <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-black font-black">{i+1}</div>
                  <div>
                    <h4 className="font-bold text-white text-xl">{a.title}</h4>
                    <p className="text-slate-400 font-light">{a.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-10">
          <div className="p-8 bg-primary rounded-[2rem] shadow-2xl">
            <h4 className="font-black text-black text-2xl mb-4">{t.analysis.needsRep}</h4>
            <p className="text-black/70 mb-6">{t.analysis.needsRepSub}</p>
            <button 
              onClick={handleFindLawyers}
              disabled={isSearchingLawyers}
              className="w-full py-4 bg-black text-white font-black rounded-2xl hover:scale-105 transition-all"
            >
              {isSearchingLawyers ? "Searching Maps..." : "Find Nearby Lawyers"}
            </button>
            
            {lawyerPlaces.length > 0 && (
              <div className="mt-6 space-y-2">
                {lawyerPlaces.map((p, pi) => (
                  <a key={pi} href={p.uri} target="_blank" className="block p-3 bg-white/10 rounded-xl text-xs font-bold text-black border border-black/10 hover:bg-white/20">
                    📍 {p.title}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisView;
