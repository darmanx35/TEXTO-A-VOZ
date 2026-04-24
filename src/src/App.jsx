import React, { useState } from 'react';
import { Play, Volume2, Languages, User, MessageSquare, Download, Loader2, Sparkles, FastForward, Settings2, Wand2, Globe2, FileText, Clipboard } from 'lucide-react';

const App = () => {
  const [text, setText] = useState('Hola, soy David. Ahora cuento con inteligencia artificial avanzada para ayudarte a mejorar tus guiones antes de que yo los narre.');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [selectedVoice, setSelectedVoice] = useState('Fenrir'); 
  const [language, setLanguage] = useState('es'); 
  const [speakingRate, setSpeakingRate] = useState('fast'); 
  const [tone, setTone] = useState('elegante');
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const apiKey = ""; 
  const MAX_CHARS = 5000;

  const voices = [
    { id: 'Fenrir', name: 'David', gender: 'M', desc: 'Grave y Ejecutivo' },
    { id: 'Charon', name: 'Charon', gender: 'M', desc: 'Profundo' },
    { id: 'Kore', name: 'Kore', gender: 'F', desc: 'Ejecutiva' },
    { id: 'Puck', name: 'Puck', gender: 'F', desc: 'Jovial' }
  ];

  // --- FUNCIONES DE COPIADO ---
  const copyToClipboard = () => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Error al copiar', err);
    }
    document.body.removeChild(textArea);
  };

  // --- FUNCIONES DE GEMINI API (LLM) ---
  
  const callGemini = async (prompt) => {
    setIsAiProcessing(true);
    setError(null);
    
    let delay = 1000;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });

        if (!response.ok) throw new Error();
        const data = await response.json();
        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (resultText) {
          setText(resultText.trim());
          setIsAiProcessing(false);
          return;
        }
      } catch (err) {
        if (attempt === 4) {
          setError("Error al conectar con la inteligencia de Gemini.");
          setIsAiProcessing(false);
        } else {
          await new Promise(r => setTimeout(r, delay));
          delay *= 2;
        }
      }
    }
  };

  const handleAiRefine = () => {
    const prompt = `Mejora el siguiente texto para que suene más profesional, elegante y fluido cuando sea narrado por una voz masculina grave. Mantén el idioma original: "${text}"`;
    callGemini(prompt);
  };

  const handleAiTranslate = () => {
    const targetLang = language === 'es' ? 'inglés' : 'español';
    const prompt = `Traduce el siguiente texto al ${targetLang} de forma profesional y natural para locución: "${text}"`;
    setLanguage(language === 'es' ? 'en' : 'es');
    callGemini(prompt);
  };

  const handleAiSummarize = () => {
    const prompt = `Resume el siguiente texto de forma que sea conciso pero mantenga los puntos clave para una narración: "${text}"`;
    callGemini(prompt);
  };

  // --- FUNCIONES DE AUDIO ---

  const pcmToWav = (pcmData, sampleRate) => {
    const buffer = new ArrayBuffer(44 + pcmData.length * 2);
    const view = new DataView(buffer);
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 32 + pcmData.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, pcmData.length * 2, true);
    let offset = 44;
    for (let i = 0; i < pcmData.length; i++, offset += 2) view.setInt16(offset, pcmData[i], true);
    return new Blob([buffer], { type: 'audio/wav' });
  };

  const generateSpeech = async () => {
    if (!text.trim()) return;
    setIsGenerating(true);
    setError(null);

    const rateDesc = {
      'slow': 'slowly and calmly',
      'normal': 'at a normal pace',
      'fast': 'at a fast, fluent, and energetic pace without pauses'
    };

    const langNote = language === 'es' ? 'Speak in Spanish.' : 'Speak in English.';
    const toneNote = `Tone: ${tone}, very professional.`;
    const speedNote = `Speed: ${rateDesc[speakingRate]}.`;
    const davidPersona = selectedVoice === 'Fenrir' ? "Act as David, an elegant male narrator with a deep voice." : "";

    const fullPrompt = `${davidPersona} ${langNote} ${toneNote} ${speedNote} Text: ${text}`;

    const payload = {
      model: "models/gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: selectedVoice }
          }
        }
      }
    };

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error();
      const result = await response.json();
      const audioPart = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      
      if (audioPart) {
        const base64Data = audioPart.inlineData.data;
        const sampleRate = parseInt(audioPart.inlineData.mimeType.match(/sample_rate=(\d+)/)?.[1] || "24000");
        const binaryString = atob(base64Data);
        const pcmData = new Int16Array(binaryString.length / 2);
        for (let i = 0; i < pcmData.length; i++) {
          pcmData[i] = binaryString.charCodeAt(i * 2) | (binaryString.charCodeAt(i * 2 + 1) << 8);
        }
        setAudioUrl(URL.createObjectURL(pcmToWav(pcmData, sampleRate)));
      }
    } catch (err) {
      setError("Error al generar audio. Intenta de nuevo.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-800 to-indigo-900 p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-blue-300" />
              <h1 className="text-3xl font-bold tracking-tight">Estudio David AI ✨</h1>
            </div>
            <div className="flex items-center gap-2 bg-blue-700/50 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-blue-400/30">
              Gemini 2.5 Intelligence
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Panel Lateral: Configuración */}
          <div className="space-y-6">
            <section>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">Voz</label>
              <div className="space-y-2">
                {voices.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVoice(v.id)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                      selectedVoice === v.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-100 hover:border-slate-200 bg-white'
                    }`}
                  >
                    <div className="font-bold text-slate-800 text-sm">{v.name}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{v.desc}</div>
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Idioma</label>
                <div className="flex p-1 bg-slate-200 rounded-lg">
                  <button onClick={() => setLanguage('es')} className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${language === 'es' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>ES</button>
                  <button onClick={() => setLanguage('en')} className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${language === 'en' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>EN</button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Ritmo</label>
                <select value={speakingRate} onChange={(e) => setSpeakingRate(e.target.value)} className="w-full bg-white p-2 rounded-lg border border-slate-200 text-xs font-bold outline-none">
                  <option value="slow">Pausado</option>
                  <option value="normal">Normal</option>
                  <option value="fast">Fluido / Ágil</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Personalidad</label>
                <select value={tone} onChange={(e) => setTone(e.target.value)} className="w-full bg-white p-2 rounded-lg border border-slate-200 text-xs font-bold outline-none">
                  <option value="elegante">Elegante</option>
                  <option value="energico">Enérgico</option>
                  <option value="serio">Serio</option>
                </select>
              </div>
            </section>
          </div>

          {/* Área Principal */}
          <div className="lg:col-span-3 space-y-4">
            <div className="relative">
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" /> Contenido del Guion
                </label>
                
                {/* BOTONES ✨ GEMINI */}
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={handleAiRefine}
                    disabled={isAiProcessing || !text.trim()}
                    className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-bold hover:bg-amber-100 transition-colors disabled:opacity-50"
                  >
                    <Wand2 className="w-3 h-3" /> ✨ Pulir
                  </button>
                  <button 
                    onClick={handleAiTranslate}
                    disabled={isAiProcessing || !text.trim()}
                    className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-[10px] font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50"
                  >
                    <Globe2 className="w-3 h-3" /> ✨ Traducir
                  </button>
                  <button 
                    onClick={handleAiSummarize}
                    disabled={isAiProcessing || !text.trim()}
                    className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold hover:bg-emerald-100 transition-colors disabled:opacity-50"
                  >
                    <FileText className="w-3 h-3" /> ✨ Resumir
                  </button>
                  <button 
                    onClick={copyToClipboard}
                    className={`flex items-center gap-1.5 px-3 py-1 border rounded-full text-[10px] font-bold transition-all ${copySuccess ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                  >
                    <Clipboard className="w-3 h-3" /> {copySuccess ? '¡Copiado!' : 'Copiar Texto'}
                  </button>
                </div>
              </div>

              <div className="relative group">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className={`w-full h-80 p-6 rounded-3xl border-2 border-slate-100 focus:border-blue-500 focus:outline-none text-lg leading-relaxed bg-slate-50 shadow-inner transition-all ${isAiProcessing ? 'opacity-50 grayscale' : ''}`}
                  placeholder="Escribe el texto aquí..."
                />
                {isAiProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-sm rounded-3xl">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest animate-pulse">Gemini procesando...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={generateSpeech}
              disabled={isGenerating || isAiProcessing || !text.trim()}
              className={`w-full py-5 rounded-2xl font-black text-white uppercase tracking-[0.2em] text-sm shadow-xl transition-all ${
                isGenerating ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99] hover:shadow-blue-200 shadow-lg'
              }`}
            >
              {isGenerating ? <Loader2 className="animate-spin mx-auto w-6 h-6" /> : (
                <span className="flex items-center justify-center gap-3">
                  <Play className="w-5 h-5 fill-white" /> Generar Audio de David
                </span>
              )}
            </button>

            {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100 animate-in fade-in">{error}</div>}

            {audioUrl && !isGenerating && !isAiProcessing && (
              <div className="p-8 bg-slate-900 text-white rounded-3xl flex flex-col items-center gap-5 animate-in slide-in-from-bottom-4 shadow-2xl border border-slate-700">
                <div className="flex items-center justify-between w-full border-b border-slate-700 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-lg">
                      <Volume2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Resultado Final</div>
                      <div className="text-sm font-bold">Locución de {selectedVoice}</div>
                    </div>
                  </div>
                  <a href={audioUrl} download="audio_gemini_david.wav" className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
                    <Download className="w-6 h-6" />
                  </a>
                </div>
                <audio controls src={audioUrl} className="w-full h-12 invert brightness-110 contrast-125" autoPlay />
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="text-center mt-6 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
        Optimizado con Google Gemini Flash 2.5 • Voces de Alta Fidelidad
      </p>
    </div>
  );
};

export default App;
