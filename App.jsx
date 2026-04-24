import React, { useState, useEffect } from 'react';
import { Play, Volume2, User, MessageSquare, Download, Loader2, Sparkles, Award, ShieldCheck } from 'lucide-react';

const App = () => {
  const [text,https://gemini.google.com/share/5a04692e9e17 setText] = useState('Estimado cliente, es un placer saludarle. Mi nombre es David. Estoy aquí para ofrecerle una experiencia de comunicación de la más alta calidad y elegancia.');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [selectedVoice, setSelectedVoice] = useState('Fenrir'); // Fenrir es la base para David por ser grave
  const [professionalLevel, setProfessionalLevel] = useState('máxima');
  const [error, setError] = useState(null);

  const apiKey = ""; 
  const MAX_CHARS = 5000;

  const voices = [
    { id: 'Fenrir', name: 'David (Premium)', gender: 'Masculino', desc: 'Grave, elegante y profesional', icon: <Award className="w-4 h-4" /> },
    { id: 'Charon', name: 'Charon', gender: 'Masculino', desc: 'Profundo y serio', icon: <User className="w-4 h-4" /> },
    { id: 'Kore', name: 'Kore', gender: 'Femenino', desc: 'Clara y ejecutiva', icon: <User className="w-4 h-4" /> }
  ];

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
    setIsGenerating(true);
    setError(null);

    // Instrucción personalizada para forzar el estilo de David
    const systemInstruction = selectedVoice === 'Fenrir' 
      ? `Actúa como David. Tu voz es muy grave, extremadamente elegante, sofisticada y profesional. Habla con calma y distinción. `
      : `Habla de forma profesional. `;
    
    const fullPrompt = `${systemInstruction} Texto: ${text}`;

    const payload = {
      model: "models/gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: selectedVoice
            }
          }
        }
      }
    };

    let delay = 1000;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Error de red');
        const result = await response.json();
        const audioPart = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        
        if (audioPart) {
          const base64Data = audioPart.inlineData.data;
          const mimeType = audioPart.inlineData.mimeType;
          const sampleRate = parseInt(mimeType.match(/sample_rate=(\d+)/)?.[1] || "24000");
          const binaryString = atob(base64Data);
          const pcmData = new Int16Array(binaryString.length / 2);
          for (let i = 0; i < pcmData.length; i++) {
            pcmData[i] = binaryString.charCodeAt(i * 2) | (binaryString.charCodeAt(i * 2 + 1) << 8);
          }
          const wavBlob = pcmToWav(pcmData, sampleRate);
          setAudioUrl(URL.createObjectURL(wavBlob));
          setIsGenerating(false);
          return;
        }
      } catch (err) {
        if (attempt === 4) {
          setError("No se pudo conectar con el servidor de David. Intenta de nuevo.");
          setIsGenerating(false);
        } else {
          await new Promise(r => setTimeout(r, delay));
          delay *= 2;
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 p-4 md:p-12 font-serif">
      <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-2xl overflow-hidden border border-neutral-300">
        {/* Header Elegante */}
        <div className="bg-neutral-900 p-10 text-center border-b-4 border-amber-600">
          <div className="flex justify-center mb-4">
            <ShieldCheck className="w-12 h-12 text-amber-500" />
          </div>
          <h1 className="text-4xl font-light tracking-widest text-white uppercase">Voz Executive: David</h1>
          <p className="text-neutral-400 mt-2 italic text-lg">La distinción de una voz grave y profesional</p>
        </div>

        <div className="p-8 md:p-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Panel Lateral */}
          <div className="lg:col-span-4 space-y-8">
            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-4 flex items-center gap-2">
                <User className="w-4 h-4" /> Perfil de Voz
              </h2>
              <div className="space-y-3">
                {voices.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVoice(v.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-md border transition-all ${
                      selectedVoice === v.id 
                        ? 'border-amber-600 bg-amber-50 shadow-md' 
                        : 'border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    <div className={`${selectedVoice === v.id ? 'text-amber-600' : 'text-neutral-400'}`}>
                      {v.icon}
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-neutral-800">{v.name}</div>
                      <div className="text-xs text-neutral-500">{v.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="p-5 bg-neutral-50 border border-neutral-200 rounded-md">
              <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-4">Ajustes de David</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-neutral-600 block mb-2">Elegancia</label>
                  <div className="h-2 w-full bg-neutral-200 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-600 w-full"></div>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-neutral-600 block mb-2">Tono Grave</label>
                  <div className="h-2 w-full bg-neutral-200 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-600 w-[90%]"></div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Área de Texto Principal */}
          <div className="lg:col-span-8 space-y-6">
            <div className="relative">
              <div className="flex justify-between items-end mb-2">
                <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Guion de Locución
                </label>
                <span className="text-[10px] text-neutral-400">
                  {text.length} / {MAX_CHARS} CARACTERES
                </span>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full h-64 p-6 rounded-md border border-neutral-300 focus:ring-1 focus:ring-amber-600 focus:outline-none text-xl leading-relaxed text-neutral-800 bg-neutral-50 shadow-inner font-serif"
                placeholder="Escriba el discurso para David..."
              />
            </div>

            <button
              onClick={generateSpeech}
              disabled={isGenerating || !text.trim()}
              className={`w-full py-5 rounded-md font-bold uppercase tracking-widest text-white transition-all shadow-xl ${
                isGenerating ? 'bg-neutral-400 cursor-not-allowed' : 'bg-neutral-900 hover:bg-black active:scale-[0.98]'
              }`}
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-3">
                  <Loader2 className="animate-spin" /> Sintetizando Voz Executive...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-3">
                  <Play className="fill-current" /> Generar Audio de David
                </span>
              )}
            </button>

            {audioUrl && !isGenerating && (
              <div className="p-8 bg-neutral-900 text-white rounded-md border-l-4 border-amber-600 animate-in slide-in-from-top-4">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <Volume2 className="text-amber-500" />
                    <span className="text-sm font-bold uppercase tracking-tighter">Locución Finalizada</span>
                  </div>
                  <a href={audioUrl} download="David_Professional_Voice.wav" className="text-amber-500 hover:text-amber-400 transition-colors">
                    <Download className="w-6 h-6" />
                  </a>
                </div>
                <audio controls src={audioUrl} className="w-full brightness-90 contrast-125" autoPlay />
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="text-center mt-8 text-neutral-400 text-sm italic">
        Diseñado para presentaciones corporativas, audiolibros premium y narración técnica.
      </p>
    </div>
  );
};

export default App;
