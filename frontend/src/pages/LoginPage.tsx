import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Loader2 } from 'lucide-react';
import hfcLogo from '../assets/hfc-logo.png';

// Google "G" Logo SVG
const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
        <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
            <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
            <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
            <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
            <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
        </g>
    </svg>
);

const LoginPage = () => {
    const { loginWithGoogle, loginWithPin, error, loading, firebaseUser } = useAuth();
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [pin, setPin] = useState('');

    const handleGoogleSignIn = async () => {
        setIsSigningIn(true);
        await loginWithGoogle();
        setIsSigningIn(false);
    };

    const handlePinSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pin.trim()) return;
        setIsSigningIn(true);
        await loginWithPin(pin);
        setIsSigningIn(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-hfc-brown via-[#2D1302] to-[#1A0B01] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background ambient glow elements */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-gold-400/10 blur-[120px]" />
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
                <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6">
                    <div className="text-center">
                        <h2 className="text-white font-bold text-xl">Welcome Back</h2>
                        <p className="text-amber-300/50 text-sm font-medium mt-1">
                            {!firebaseUser
                                ? "Sign in with your authorised Google account"
                                : "Enter your PIN or Jumper Number"}
                        </p>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="space-y-3">
                            <div className="flex items-start gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                                <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                                <p className="text-red-300 text-sm font-medium">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Conditional Login Steps */}
                    {!firebaseUser ? (
                        <button
                            onClick={handleGoogleSignIn}
                            disabled={loading || isSigningIn}
                            className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-bold py-4 px-6 rounded-2xl text-sm hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/20 active:scale-95"
                        >
                            {isSigningIn || loading ? (
                                <Loader2 size={20} className="animate-spin text-gray-500" />
                            ) : (
                                <GoogleIcon />
                            )}
                            {isSigningIn || loading ? 'Signing in...' : 'Sign in with Google'}
                        </button>
                    ) : (
                        <form onSubmit={handlePinSignIn} className="space-y-4">
                            <div>
                                <input
                                    type="text"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    placeholder="e.g. 0 (Coach) or 5 (Player)"
                                    className="w-full bg-white/10 border border-white/20 text-white placeholder:text-white/40 px-6 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold-400 font-mono text-center text-xl tracking-widest"
                                    disabled={loading || isSigningIn}
                                    autoFocus
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!pin || loading || isSigningIn}
                                className="w-full flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 text-white font-bold py-4 px-6 rounded-2xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gold-500/20 active:scale-95"
                            >
                                {isSigningIn || loading ? <Loader2 size={20} className="animate-spin" /> : null}
                                {isSigningIn || loading ? 'Verifying...' : 'Access Dashboard'}
                            </button>
                        </form>
                    )}

                    <div className="pt-4 border-t border-white/5 text-center">
                        <p className="text-amber-300/30 text-[10px] font-bold uppercase tracking-widest">
                            Access is restricted to authorised Hawthorn FC accounts
                        </p>
                    </div>
                </div>

                <p className="text-center text-amber-300/20 text-[10px] font-bold uppercase tracking-widest mt-8">
                    Hawthorn Football Club © 2026 · Secured by Google
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
