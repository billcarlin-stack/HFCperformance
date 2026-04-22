/*
  The Nest — Hawk AI Page
  Full-screen BI agent interface powered by KANGA.AI.
  Dark theme matching Hawks IDP design system.
*/

import { Sparkles } from 'lucide-react';
import { DashboardHawkAI } from '../components/HawkChat';

const HawkAiPage = () => {
    return (
        <div className="h-[calc(100vh-12rem)] flex flex-col space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-hawks-gold tracking-tight uppercase" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        HAWKS.AI
                    </h1>
                    <p className="text-gray-500 text-xs font-medium mt-1 tracking-wide" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                        SQUAD PERFORMANCE INTELLIGENCE
                    </p>
                </div>

                <div className="flex items-center gap-2.5 bg-hawks-card px-4 py-2 rounded-lg">
                    <Sparkles size={14} className="text-hawks-gold animate-pulse" />
                    <span className="text-[10px] font-semibold text-hawks-gold/70 uppercase tracking-widest" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                        Powered by Gemini + Data Lake
                    </span>
                </div>
            </div>

            {/* Chat Interface */}
            <div className="flex-1 min-h-0">
                <DashboardHawkAI />
            </div>
        </div>
    );
};

export default HawkAiPage;
