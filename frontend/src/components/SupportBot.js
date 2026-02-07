import React, { useState, useRef, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { BACKEND_URL } from '../config';

const BRAND = {
    primary: '#0F9D78', // Emerald green from StudHome
    primaryDark: '#0B7A5E',
    white: '#FFFFFF',
    text: '#1F2937', // Gray-800
    lightGray: '#F3F4F6', // Gray-100
    accent: '#34D399' // Lighter emerald for hover
};

const BOT_NAME = "Campus Assistant";

export default function SupportBot() {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const isProfessor = location.pathname.includes('/professor');

    const [messages, setMessages] = useState([
        {
            id: 1,
            text: `Hello! I'm your Campus Assistant for ${isProfessor ? 'Faculty' : 'Students'}. Type '/start' or 'help' to see what I can do.`,
            sender: 'bot',
            options: []
        }
    ]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    // Reset greeting when role changes (though unlikely without reload, good for safety)
    useEffect(() => {
        setMessages([
            {
                id: 1,
                text: `Hello! I'm your Campus Assistant for ${isProfessor ? 'Faculty' : 'Students'}. Type '/start' or 'help' to see what I can do.`,
                sender: 'bot',
                options: []
            }
        ]);
    }, [isProfessor]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async (textOverride) => {
        const textToSend = typeof textOverride === 'string' ? textOverride : input;

        // Handle Navigation Commands
        if (textToSend.startsWith("NAV:")) {
            navigate(textToSend.split("NAV:")[1]);
            return;
        }

        if (!textToSend.trim()) return;

        // User Message
        const userMsg = { id: Date.now(), text: textToSend, sender: 'user' };
        setMessages(prev => [...prev, userMsg]);
        setInput('');

        try {
            let token = '';
            if (user) {
                token = await user.getIdToken();
            } else {
                console.warn("SupportBot: No logged-in user found.");
            }

            const response = await fetch(`${BACKEND_URL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: textToSend,
                    role: isProfessor ? 'Professor' : 'Student'
                })
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error("Chat API Error:", response.status, errorBody);
                if (response.status === 401) throw new Error("Unauthorized: Please log in.");
                throw new Error(`API Error (${response.status}): ${errorBody}`);
            }

            const data = await response.json();

            setMessages(prev => [
                ...prev,
                { id: Date.now() + 1, text: data.text, sender: 'bot', options: data.options || [] }
            ]);
        } catch (error) {
            console.error("Bot Error:", error);
            setMessages(prev => [
                ...prev,
                { id: Date.now() + 1, text: `Connection issue: ${error.message}. Please refresh and try again.`, sender: 'bot', options: [] }
            ]);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        handleSend();
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
            {/* Chat Window */}
            {isOpen && (
                <div
                    className="mb-4 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col transition-all duration-300 ease-in-out pointer-events-auto animate-in fade-in slide-in-from-bottom-10"
                    style={{ height: '500px' }}
                >
                    {/* Header */}
                    <div
                        className="p-4 flex justify-between items-center shadow-sm"
                        style={{ backgroundColor: BRAND.primary, color: BRAND.white }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <i className="bi bi-robot text-xl"></i>
                            </div>
                            <div>
                                <h3 className="font-bold tracking-wide text-sm">{BOT_NAME}</h3>
                                <p className="text-xs text-emerald-100 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse"></span>
                                    {isProfessor ? 'Professor Support' : 'Student Support'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-full transition-all"
                        >
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="p-4 bg-gray-50 flex-1 overflow-y-auto flex flex-col gap-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                        {messages.map((msg) => {
                            // Parse for [CHART: ...]
                            const chartMatch = msg.text.match(/\[CHART:\s*({.*?})\]/);
                            let chartData = null;
                            let displayText = msg.text;

                            if (chartMatch) {
                                try {
                                    chartData = JSON.parse(chartMatch[1]);
                                    displayText = msg.text.replace(chartMatch[0], '').trim();
                                } catch (e) {
                                    console.error("Chart parsing error", e);
                                }
                            }

                            return (
                                <div
                                    key={msg.id}
                                    className={`flex flex-col max-w-[90%] ${msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'}`}
                                >
                                    <div
                                        className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.sender === 'user'
                                            ? 'bg-gray-800 text-white rounded-br-none'
                                            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                                            }`}
                                    >
                                        <div className="whitespace-pre-wrap">{displayText}</div>

                                        {/* CSS Bar Chart Rendering */}
                                        {chartData && chartData.type === 'bar' && (
                                            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">{chartData.title || 'Data Overview'}</h4>
                                                <div className="flex flex-col gap-2">
                                                    {chartData.data.map((item, idx) => (
                                                        <div key={idx} className="flex items-center gap-2">
                                                            <div className="w-20 text-xs font-medium text-gray-600 truncate text-right">{item.label}</div>
                                                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full rounded-full transition-all duration-500 ease-out"
                                                                    style={{
                                                                        width: `${Math.min(item.value > 0 ? (item.value / Math.max(...chartData.data.map(d => d.value))) * 100 : 0, 100)}%`,
                                                                        backgroundColor: item.color || BRAND.primary
                                                                    }}
                                                                ></div>
                                                            </div>
                                                            <div className="w-6 text-xs font-bold text-gray-700 text-right">{item.value}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Render Options (Chips) */}
                                    {msg.sender === 'bot' && msg.options && msg.options.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {msg.options.map((opt, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleSend(opt.value)}
                                                    className="text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 transition-colors shadow-sm"
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Actions Bar */}
                    <div className="p-2 bg-white border-t border-gray-100 flex gap-2 overflow-x-auto scrollbar-hide">
                        {isProfessor ? (
                            <>
                                <button
                                    onClick={() => handleSend("Review attendance")}
                                    className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                                >
                                    🔍 Review
                                </button>
                                <button
                                    onClick={() => handleSend("Give me a report for today")}
                                    className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors"
                                >
                                    📊 Daily Report
                                </button>
                                <button
                                    onClick={() => handleSend("Do I have any pending approvals?")}
                                    className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors"
                                >
                                    ⏳ Pending Approvals
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => handleSend("Show me my timetable")} className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors">📅 Timetable</button>
                                <button onClick={() => handleSend("How is my attendance?")} className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors">✅ Attendance</button>
                                <button onClick={() => handleSend("Open LMS Portal")} className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors">📚 LMS</button>
                            </>
                        )}
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-gray-100 flex gap-2 items-center">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type /start or ask..."
                            className="flex-1 bg-gray-100 text-gray-800 text-sm rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all border border-transparent focus:bg-white focus:border-emerald-200"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim()}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-md"
                            style={{ backgroundColor: BRAND.primary }}
                        >
                            <i className="bi bi-send-fill text-sm pl-0.5"></i>
                        </button>
                    </form>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="h-14 w-14 rounded-full shadow-lg flex items-center justify-center text-white text-2xl transition-transform hover:scale-110 active:scale-95 pointer-events-auto"
                style={{ backgroundColor: BRAND.primary }}
            >
                {isOpen ? (
                    <i className="bi bi-chevron-down"></i>
                ) : (
                    <i className="bi bi-chat-dots-fill"></i>
                )}
            </button>
        </div>
    );
}
