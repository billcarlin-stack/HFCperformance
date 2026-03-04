import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, ArrowRight, AlertCircle } from 'lucide-react';
import hfcLogo from '../assets/hfc-logo.png';

const LoginPage = () => {
    const { login, error, loading } = useAuth();
    const [pin, setPin] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pin.trim()) return;
        await login(pin.trim());
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-hfc-brown via-[#2D1302] to-[#1A0B01] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-hfc-brown/10 blur-[120px]" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-gold-400/5 blur-[100px]" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                {/* Logo + Title */}
                <div className="text-center mb-10">
                    <div className="inline-flex bg-white rounded-3xl p-3 shadow-2xl shadow-black/40 mb-6">
                        <img src={hfcLogo} alt="HFC" className="h-16 w-auto" />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight font-outfit uppercase">
                        The <span className="text-gold-400">Nest</span>
                    </h1>
                    <p className="text-amber-300/50 text-sm font-medium mt-2 tracking-wide">
                        High Performance Analytics Portal
                    </p>
                </div>

                {/* Login Card */}
                <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-10 w-10 rounded-xl bg-gold-400/10 border border-gold-400/20 flex items-center justify-center">
                            <Lock size={18} className="text-gold-400" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-lg">Enter Your PIN</h2>
                            <p className="text-amber-300/40 text-xs font-medium">Coaches & players access</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <input
                                type="password"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                placeholder="Enter PIN..."
                                autoFocus
                                className="w-full bg-white/5 border border-white/15 rounded-2xl py-4 px-5 text-center text-2xl font-black text-white tracking-[0.3em] placeholder:text-amber-300/20 placeholder:tracking-normal placeholder:text-base placeholder:font-medium focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400/30 transition-all"
                            />
                        </div>

                        {error && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                                    <AlertCircle size={14} className="text-red-400 shrink-0" />
                                    <p className="text-red-300 text-sm font-medium">{error}</p>
                                </div>
                                {error.toLowerCase().includes('seed') && (
                                    <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/20">
                                        <p className="text-amber-200 text-xs font-medium leading-relaxed">
                                            Tip: It looks like the database needs to be initialized.
                                            Refresh the <a href="https://the-nest-api-114675580879.australia-southeast1.run.app/api/admin/seed" target="_blank" className="underline font-black text-gold-400">Admin Seed URL</a> and wait 30 seconds.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !pin.trim()}
                            className="w-full bg-gradient-to-r from-gold-400 to-amber-500 text-hfc-brown font-black py-4 rounded-2xl text-sm uppercase tracking-widest hover:from-gold-300 hover:to-amber-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-gold-400/20"
                        >
                            {loading ? (
                                <div className="h-5 w-5 border-2 border-hfc-brown/30 border-t-hfc-brown rounded-full animate-spin" />
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-5 border-t border-white/5 text-center">
                        <p className="text-amber-300/30 text-[10px] font-bold uppercase tracking-widest">
                            Coach PIN: 0 · Player PIN: Jersey Number
                        </p>
                    </div>
                </div>

                <p className="text-center text-amber-300/20 text-[10px] font-bold uppercase tracking-widest mt-8">
                    Hawthorn Football Club © 2026
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
