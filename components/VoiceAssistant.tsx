import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
// FIX: Added file extensions to import paths.
import { MicIcon, SparkleIcon } from './icons/Icons.tsx';
import { TranscriptionPart } from '../types.ts';

// Helper functions for audio processing
const encode = (bytes: Uint8Array): string => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const decode = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const VoiceAssistant: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Clique no microfone para começar');
    const [transcription, setTranscription] = useState<TranscriptionPart[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    
    type GeminiLiveSession = {
        close: () => Promise<void> | void;
        sendRealtimeInput: (payload: { media: Blob }) => Promise<void> | void;
    };

    const sessionPromiseRef = useRef<Promise<GeminiLiveSession> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef<number>(0);
    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

     useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcription]);


    const stopConversation = useCallback(() => {
        setIsRecording(false);
        setStatusMessage('Conversa encerrada. Clique para começar de novo.');

        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close());
            sessionPromiseRef.current = null;
        }

        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }

        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }
        
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }

        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close().catch(console.error);
            inputAudioContextRef.current = null;
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close().catch(console.error);
            outputAudioContextRef.current = null;
        }
    }, []);

    const startConversation = useCallback(async () => {
        setIsRecording(true);
        setStatusMessage('Conectando...');
        setTranscription([]);
        currentInputTranscriptionRef.current = '';
        currentOutputTranscriptionRef.current = '';

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            inputAudioContextRef.current = new (window.AudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext)({ sampleRate: 24000 });
            nextStartTimeRef.current = 0;

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setStatusMessage('Conectado! Pode falar.');
                        const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                        mediaStreamSourceRef.current = source;

                        const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob: Blob = {
                                data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                       if (message.serverContent?.outputTranscription) {
                           const text = message.serverContent.outputTranscription.text;
                           currentOutputTranscriptionRef.current += text;
                           setStatusMessage('IA está respondendo...');
                       } else if (message.serverContent?.inputTranscription) {
                           const text = message.serverContent.inputTranscription.text;
                           currentInputTranscriptionRef.current += text;
                           setTranscription(prev => [...prev, { text, type: 'interim', timestamp: Date.now() }]);
                           setStatusMessage('Ouvindo...');
                       }

                       if (message.serverContent?.turnComplete) {
                           const fullInput = currentInputTranscriptionRef.current;
                           const fullOutput = currentOutputTranscriptionRef.current;
                           setTranscription(prev => [
                               ...prev.filter(p => p.type !== 'interim'),
                               { text: fullInput, type: 'input', timestamp: Date.now() - 1 },
                               { text: fullOutput, type: 'output', timestamp: Date.now() }
                           ]);
                           currentInputTranscriptionRef.current = '';
                           currentOutputTranscriptionRef.current = '';
                           setStatusMessage('Conectado! Pode falar.');
                       }

                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                        if (base64Audio) {
                            const outputCtx = outputAudioContextRef.current!;
                            // FIX: Completed incomplete line from snippet and use ref.current
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                            const source = outputCtx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputCtx.destination);
                            source.addEventListener('ended', () => {
                                outputSourcesRef.current.delete(source);
                            });
                            // FIX: Use ref.current for start time
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            outputSourcesRef.current.add(source);
                        }

                        if (message.serverContent?.interrupted) {
                            outputSourcesRef.current.forEach(source => {
                                source.stop();
                            });
                            outputSourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live session error:', e);
                        setStatusMessage(`Erro: ${e.message}. Tente novamente.`);
                        stopConversation();
                    },
                    onclose: () => {
                        setStatusMessage('Conexão fechada.');
                        stopConversation();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    outputAudioTranscription: {},
                    inputAudioTranscription: {},
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                    systemInstruction: 'Você é um assistente de IA para um CRM de contabilidade.',
                }
            });
        } catch (error) {
            console.error('Failed to start conversation:', error);
            setStatusMessage('Falha ao iniciar. Verifique as permissões do microfone.');
            setIsRecording(false);
        }
    }, [stopConversation]);
    
    const handleMicClick = () => {
        if (isRecording) {
            stopConversation();
        } else {
            setIsOpen(true);
            startConversation();
        }
    };

    const handleClose = () => {
        if(isRecording) stopConversation();
        setIsOpen(false);
    }
    
    // FIX: Added return statement with JSX to fix component type error.
    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-24 bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-500 transition-transform transform hover:scale-110 z-50"
                aria-label="Open voice assistant"
            >
                <MicIcon className="w-8 h-8" />
            </button>
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-96 h-[60vh] bg-gray-800/80 backdrop-blur-md border border-gray-700 rounded-2xl shadow-2xl flex flex-col z-50">
                    <div className="flex items-center justify-between p-4 border-b border-gray-700">
                         <div className="flex items-center gap-2">
                            <SparkleIcon className="w-6 h-6 text-purple-400"/>
                            <h3 className="text-lg font-bold text-white">Assistente de Voz</h3>
                        </div>
                        <button onClick={handleClose} className="text-gray-400 hover:text-white">&times;</button>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto space-y-4">
                        {transcription.filter(t => t.type !== 'interim').map(t => (
                            <div key={t.timestamp} className={`flex ${t.type === 'input' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-xs px-4 py-2 rounded-2xl ${t.type === 'input' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
                                    <p className="text-sm">{t.text}</p>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 border-t border-gray-700 flex flex-col items-center justify-center gap-3">
                        <button
                            onClick={handleMicClick}
                            aria-label={isRecording ? 'Parar gravação' : 'Iniciar gravação'}
                            aria-pressed={isRecording ? 'true' : 'false'}
                            className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-purple-600 hover:bg-purple-500'}`}>
                            <MicIcon className="w-10 h-10 text-white" />
                        </button>
                        <p className="text-sm text-gray-400 text-center h-4">{statusMessage}</p>
                    </div>
                </div>
            )}
        </>
    );
};

export default VoiceAssistant;
