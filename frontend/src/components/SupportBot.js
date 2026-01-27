import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const BRAND = {
    primary: '#0F9D78', // Emerald green from StudHome
    primaryDark: '#0B7A5E',
    white: '#FFFFFF',
    text: '#1F2937', // Gray-800
    lightGray: '#F3F4F6', // Gray-100
    accent: '#34D399' // Lighter emerald for hover
};

const BOT_NAME = "Campus Assistant";

// Role-based command options
const COMMANDS_STUDENT = [
    { label: "Check Attendance", value: "How is my attendance?" },
    { label: "LMS Materials", value: "Where are my LMS notes?" },
    { label: "Exam Updates", value: "Any exam updates?" },
    { label: "Contact Support", value: "Contact support" }
];

const COMMANDS_PROFESSOR = [
    { label: "Review Attendance", value: "Review student attendance" },
    { label: "Manage Permissions", value: "Manage attendance permissions" },
    { label: "Upload Material", value: "Upload lecture materials" },
    { label: "Attendance Register", value: "View attendance register" }
];

export default function SupportBot() {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
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

    const generateBotResponse = (userInput) => {
        const lowerInput = userInput.trim().toLowerCase();
        let responseText = "";
        let options = [];

        const currentCommands = isProfessor ? COMMANDS_PROFESSOR : COMMANDS_STUDENT;
        const menuOption = [{ label: "Back to Menu", value: "/start" }];

        if (lowerInput === '/start' || lowerInput === 'help') {
            responseText = `Here are the available actions for ${isProfessor ? 'Professors' : 'Students'}:`;
            options = currentCommands;
        }

        // --- PROFESSOR COMMANDS ---
        else if (isProfessor && (lowerInput.includes('review') || lowerInput.includes('check pending'))) {
            responseText = "You can review pending student submissions in the 'Review Attendance' page.";
            options = [{ label: "Go to Review", value: "NAV:/professor/review-attendance" }, ...menuOption];
        } else if (isProfessor && (lowerInput.includes('permission') || lowerInput.includes('open attendance'))) {
            responseText = "You can set attendance windows and locations in 'Manage Permissions'.";
            options = [{ label: "Go to Permissions", value: "NAV:/professor/permissions" }, ...menuOption];
        } else if (isProfessor && (lowerInput.includes('upload') || lowerInput.includes('material'))) {
            responseText = "Upload your lecture notes, PPTs, and resources in the 'Lecture Materials' section.";
            options = [{ label: "Go to Uploads", value: "NAV:/professor/lecture-materials" }, ...menuOption];
        } else if (isProfessor && (lowerInput.includes('register') || lowerInput.includes('record'))) {
            responseText = "View the consolidated attendance records in the 'Attendance Register'.";
            options = [{ label: "Go to Register", value: "NAV:/professor/attendance-register" }, ...menuOption];
        }

        // --- STUDENT COMMANDS ---
        else if (!isProfessor && lowerInput.includes('attendance')) {
            responseText = "Your attendance summary is available on your Dashboard. Keep it above 75%!";
            options = menuOption;
        } else if (!isProfessor && (lowerInput.includes('lms') || lowerInput.includes('notes'))) {
            responseText = "LMS materials are found under the 'LMS' tab. Files are organized by your academic year and branch.";
            options = menuOption;
        } else if (!isProfessor && lowerInput.includes('exam')) {
            responseText = "Check the 'Notices' section for the latest exam schedules and circulars.";
            options = menuOption;
        } else if (lowerInput.includes('contact') || lowerInput.includes('support')) {
            responseText = "You can reach the administration at admin@college.edu or visit Block A, Room 101.";
            options = menuOption;
        }

        // --- FALLBACK ---
        else {
            responseText = "I'm not sure about that. Try one of the options below.";
            options = currentCommands;
        }

        return { text: responseText, options };
    };

    const handleSend = (textOverride) => {
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

        // Bot Response simulation
        setTimeout(() => {
            const { text, options } = generateBotResponse(textToSend);
            setMessages(prev => [
                ...prev,
                { id: Date.now() + 1, text, sender: 'bot', options }
            ]);
        }, 600);
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
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                        {messages.map((msg) => (
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
                                    {msg.text}
                                </div>

                                {/* Render Options (Chips) if available */}
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
                        ))}
                        <div ref={messagesEndRef} />
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
