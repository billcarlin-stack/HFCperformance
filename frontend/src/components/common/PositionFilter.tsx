/*
  PositionFilter — Reusable position filter pill bar.

  Used on PlayersList, PlayerReview (RatingComparison), TeamBuilder, Analytics.
  Players' `position` string is classified into one of four groups: Fwd, Mid, Back, Ruck.
*/

import { clsx } from 'clsx';

export type PositionGroup = 'ALL' | 'FWD' | 'MID' | 'BACK' | 'RUCK';

export const POSITION_OPTIONS: { key: PositionGroup; label: string }[] = [
    { key: 'ALL',  label: 'All' },
    { key: 'FWD',  label: 'Fwd' },
    { key: 'MID',  label: 'Mid' },
    { key: 'BACK', label: 'Back' },
    { key: 'RUCK', label: 'Ruck' },
];

/**
 * Classify a free-text position (e.g. "Forward", "Half-Back Flanker", "Midfielder",
 * "Ruck", "Hybrid", "Key Forward") into a PositionGroup.
 */
export const classifyPosition = (position?: string | null): Exclude<PositionGroup, 'ALL'> | null => {
    if (!position) return null;
    const p = position.toLowerCase();
    if (p.includes('ruck')) return 'RUCK';
    if (p.includes('back') || p.includes('defender') || p === 'def' || p.includes('defence')) return 'BACK';
    if (p.includes('mid') || p.includes('onball') || p.includes('wing') || p.includes('centre')) return 'MID';
    if (p.includes('forward') || p.includes('fwd') || p.includes('goal')) return 'FWD';
    // Hybrid and anything else — don't assume, leave unclassified
    return null;
};

export const matchesPositionFilter = (position: string | undefined | null, filter: PositionGroup): boolean => {
    if (filter === 'ALL') return true;
    return classifyPosition(position) === filter;
};

interface Props {
    value: PositionGroup;
    onChange: (v: PositionGroup) => void;
    compact?: boolean;
    className?: string;
}

export const PositionFilter = ({ value, onChange, compact = false, className }: Props) => (
    <div className={clsx(
        "flex gap-1 bg-hawks-hover rounded-xl p-1",
        compact ? "p-0.5" : "p-1",
        className
    )}>
        {POSITION_OPTIONS.map(opt => (
            <button
                key={opt.key}
                onClick={() => onChange(opt.key)}
                className={clsx(
                    "font-black uppercase tracking-widest transition-all rounded-lg",
                    compact ? "px-2 py-1 text-[9px]" : "px-3 py-1.5 text-[10px]",
                    value === opt.key
                        ? "bg-hfc-brown text-white shadow-lg"
                        : "text-gray-400 hover:text-gray-100 hover:bg-hawks-card"
                )}
                style={{ fontFamily: 'Work Sans, sans-serif' }}
            >
                {opt.label}
            </button>
        ))}
    </div>
);
