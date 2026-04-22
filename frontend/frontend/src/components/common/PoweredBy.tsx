import { clsx } from 'clsx';

interface PoweredByProps {
    className?: string;
    lightTheme?: boolean;
}

export const PoweredBy = ({ className, lightTheme = false }: PoweredByProps) => {
    return (
        <div className={clsx("flex flex-col items-center justify-center", className)}>
            <span className={clsx(
                "text-[9px] font-black tracking-[0.2em] mb-2 uppercase",
                lightTheme ? "text-slate-400" : "text-amber-300/50"
            )}>
                Powered By
            </span>
            <div className="flex items-center gap-1">
                {/* Intelia Logo Approximation */}
                <svg viewBox="0 0 120 40" className="h-6 w-auto" xmlns="http://www.w3.org/2000/svg">
                    <g className="intelia-circles" fill="#00A97E">
                        <circle cx="20" cy="20" r="12" />
                        <circle cx="36" cy="12" r="8" opacity="0.9" />
                        <circle cx="44" cy="26" r="6" opacity="0.9" />
                        <circle cx="10" cy="28" r="4" opacity="0.9" />
                    </g>
                    <text
                        x="56"
                        y="26"
                        fontFamily="Arial, sans-serif"
                        fontWeight="900"
                        fontSize="22"
                        fill={lightTheme ? "#334155" : "#FFFFFF"}
                        letterSpacing="-0.5"
                    >
                        intelia
                    </text>
                </svg>
            </div>
        </div>
    );
};
