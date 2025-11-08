
import React, { useState, useEffect, useRef } from 'react';
// FIX: Corrected import to use the new @google/genai SDK
import { GoogleGenAI, Chat, GenerateContentResponse } from '@google/genai';
import { MessageSquareIcon, SparkleIcon } from './icons/Icons.tsx';
import { ChatMessage } from '../types.ts';

const Chatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    // FIX: Updated state to use the 'Chat' type from the new SDK
    const [chatSession, setChatSession] = useState<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const initChat = () => {
            try {
                // FIX: Instantiated GoogleGenAI with a named apiKey parameter
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                // FIX: Created a chat session using the new ai.chats.create method
                const session = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: {
                      systemInstruction: "Você é o 'Conttador', um assistente de IA especialista em contabilidade e negócios, integrado ao Contta CRM. Seja conciso, amigável e focado em ajudar o usuário com dúvidas sobre prospecção, gestão e contabilidade.",
                    },
                });
                setChatSession(session);
                setMessages([{
                    id: 'init',
                    text: "Olá, eu sou o Conttador! Como posso ajudar você hoje?",
                    sender: 'bot'
                }]);
            } catch (error) {
                console.error("Failed to initialize chat session:", error);
                setMessages([{
                    id: 'error',
                    text: "Desculpe, não consegui iniciar o assistente. Verifique sua configuração.",
                    sender: 'bot'
                }]);
            }
        };
        initChat();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isLoading || !chatSession) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            text: userInput,
            sender: 'user',
        };
        setMessages(prev => [...prev, userMessage]);
        setUserInput('');
        setIsLoading(true);

        try {
            // FIX: Used the new sendMessage method and accessed the response text directly
            const response: GenerateContentResponse = await chatSession.sendMessage({ message: userInput });
            const botMessage: ChatMessage = {
                id: Date.now().toString() + 'b',
                text: response.text,
                sender: 'bot',
            };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error("Error sending message:", error);
            const errorMessage: ChatMessage = {
                id: Date.now().toString() + 'e',
                text: "Desculpe, ocorreu um erro. Tente novamente.",
                sender: 'bot',
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-500 transition-transform transform hover:scale-110 z-50"
                aria-label="Open chat"
            >
                <MessageSquareIcon className="w-8 h-8" />
            </button>

            {isOpen && (
                <div className="fixed bottom-24 right-6 w-96 h-[60vh] bg-gray-800/80 backdrop-blur-md border border-gray-700 rounded-2xl shadow-2xl flex flex-col z-50">
                    <div className="flex items-center justify-between p-4 border-b border-gray-700">
                        <div className="flex items-center gap-2">
                            <SparkleIcon className="w-6 h-6 text-indigo-400"/>
                            <h3 className="text-lg font-bold text-white">Conttador AI</h3>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">&times;</button>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto space-y-4">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-xs px-4 py-2 rounded-2xl ${msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
                                    <p className="text-sm">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="max-w-xs px-4 py-3 rounded-2xl bg-gray-700 text-gray-200 rounded-bl-none flex items-center gap-2">
                                   <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
                                   <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse delay-150"></div>
                                   <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse delay-300"></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700">
                        <div className="relative">
                            <input
                                type="text"
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder="Pergunte algo..."
                                className="w-full bg-gray-700 text-white rounded-full py-2 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                disabled={isLoading}
                            />
                            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 p-1.5 rounded-full hover:bg-indigo-500 disabled:bg-indigo-800" disabled={isLoading || !userInput.trim()}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
};

export default Chatbot;
