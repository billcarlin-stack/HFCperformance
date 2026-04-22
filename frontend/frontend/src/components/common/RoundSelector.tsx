import type { Season, Round } from '../../services/api';

interface Props {
    seasons: Season[];
    selectedSeason: Season | null;
    onSeasonChange: (season: Season) => void;
    rounds: Round[];
    selectedRound: Round | null;
    onRoundChange: (round: Round) => void;
}

export const RoundSelector = ({
    seasons,
    selectedSeason,
    onSeasonChange,
    rounds,
    selectedRound,
    onRoundChange,
}: Props) => (
    <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
            <label
                className="text-[10px] font-bold text-gray-500 uppercase tracking-widest"
                style={{ fontFamily: 'Work Sans, sans-serif' }}
            >
                Season
            </label>
            <select
                value={selectedSeason?.id ?? ''}
                onChange={e => {
                    const season = seasons.find(s => s.id === Number(e.target.value));
                    if (season) onSeasonChange(season);
                }}
                className="bg-hawks-card border border-white/10 rounded-lg px-3 py-2 text-sm text-hawks-gold font-bold focus:outline-none focus:border-hawks-gold/30"
            >
                {seasons.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                ))}
            </select>
        </div>

        <div className="flex items-center gap-1.5">
            <label
                className="text-[10px] font-bold text-gray-500 uppercase tracking-widest"
                style={{ fontFamily: 'Work Sans, sans-serif' }}
            >
                Round
            </label>
            <select
                value={selectedRound?.id ?? ''}
                onChange={e => {
                    const round = rounds.find(r => r.id === Number(e.target.value));
                    if (round) onRoundChange(round);
                }}
                className="bg-hawks-card border border-white/10 rounded-lg px-3 py-2 text-sm text-hawks-gold font-bold focus:outline-none focus:border-hawks-gold/30"
            >
                {rounds.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                ))}
            </select>
        </div>
    </div>
);
