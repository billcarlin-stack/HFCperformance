/*
  The Nest — Players List Page

  Displays grid of player cards with readiness status.
  Includes search filtering and navigation to detail view.
*/

import { useEffect, useState } from 'react';
import { ApiService, formatPlayerImage } from '../services/api';
import type { Player } from '../services/api';
import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PositionFilter, matchesPositionFilter } from '../components/common/PositionFilter';
import type { PositionGroup } from '../components/common/PositionFilter';

const PlayerCard = ({ player }: { player: Player }) => {
    const statusColors = {
        Green: 'ring-green-500 shadow-green-500/20',
        Amber: 'ring-amber-500 shadow-amber-500/20',
        Red: 'ring-red-500 shadow-red-500/20',
    };

    const statusText = {
        Green: 'bg-green-500/10 text-green-400',
        Amber: 'bg-amber-500/10 text-amber-400',
        Red: 'bg-red-500/10 text-red-400',
    };

    return (
        <Link
            to={`/players/${player.jumper_no}`}
            className={`group relative bg-hawks-card rounded-2xl p-6 hover:shadow-card transition-all duration-300 flex flex-col items-center text-center border border-white/5 hover:-translate-y-1 block
        ring-1 ring-transparent hover:ring-offset-2 hover:ring-offset-hawks-base ${statusColors[player.status]}
      `}
        >
            {/* Status Badge */}
            <div className={`absolute top-4 right-4 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusText[player.status]}`}>
                {player.status}
            </div>

            {/* Jumper Badge */}
            <div className="absolute top-4 left-4 w-6 h-6 rounded-full bg-hfc-brown text-white flex items-center justify-center text-xs font-bold font-mono">
                {player.jumper_no}
            </div>

            {/* Image */}
            <div className={`relative w-24 h-24 rounded-full p-1 ring-2 ring-offset-2 ring-offset-hawks-card mb-4 group-hover:scale-105 transition-transform ${statusColors[player.status].split(' ')[0]}`}>
                <img
                    src={formatPlayerImage(player.jumper_no, player.photo_url, player.name)}
                    alt={player.name}
                    className="w-full h-full object-cover rounded-full bg-hawks-hover"
                    loading="lazy"
                    onError={(e) => {
                        // Fallback to HFC initials avatar if AFL CDN fails
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=4D2004&color=F6B000&size=200&length=2&font-size=0.4`;
                    }}
                />
            </div>

            {/* Info */}
            <h3 className="font-bold text-gray-100 text-lg leading-tight mb-1">{player.name}</h3>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-3" style={{ fontFamily: 'Work Sans, sans-serif' }}>{player.position}</p>

            {/* Stats Row */}
            <div className="flex items-center gap-3 text-sm text-gray-400 border-t border-white/5 pt-3 w-full justify-center">
                <div className="flex flex-col">
                    <span className="font-bold text-gray-100">{player.age}</span>
                    <span className="text-[10px] text-gray-500 uppercase">Yrs</span>
                </div>
                <div className="w-px h-6 bg-white/10"></div>
                <div className="flex flex-col">
                    <span className="font-bold text-gray-100">{player.games}</span>
                    <span className="text-[10px] text-gray-500 uppercase">Gms</span>
                </div>
                {player.readiness && (
                    <>
                        <div className="w-px h-6 bg-white/10"></div>
                        <div className="flex flex-col">
                            <span className={`font-bold ${player.readiness.score > 8 ? 'text-green-400' : 'text-amber-400'}`}>
                                {player.readiness.score.toFixed(1)}
                            </span>
                            <span className="text-[10px] text-gray-500 uppercase">Rdy</span>
                        </div>
                    </>
                )}
            </div>
        </Link>
    );
};

export const PlayersList = () => {
    const [players, setPlayers] = useState<Player[]>([]);
    const [search, setSearch] = useState('');
    const [posFilter, setPosFilter] = useState<PositionGroup>('ALL');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        ApiService.getPlayers()
            .then(setPlayers)
            .finally(() => setLoading(false));
    }, []);

    const filtered = players.filter(p => {
        const matchesSearch =
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.jumper_no.toString().includes(search);
        return matchesSearch && matchesPositionFilter(p.position, posFilter);
    });

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-100" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Playing List</h1>
                    <p className="text-gray-400">Squad overview and readiness status.</p>
                </div>

                <div className="flex items-center gap-3">
                    <PositionFilter value={posFilter} onChange={setPosFilter} />
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search player..."
                            className="pl-10 pr-4 py-2 bg-hawks-card border border-white/10 rounded-lg w-64 focus:ring-2 focus:ring-hawks-gold/30 focus:border-transparent outline-none text-gray-100 placeholder-gray-500"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {loading ? (
                    // Skeleton Loader
                    [...Array(8)].map((_, i) => (
                        <div key={i} className="bg-hawks-card rounded-2xl p-6 border border-white/5 flex flex-col items-center animate-pulse">
                            <div className="w-24 h-24 rounded-full bg-hawks-hover mb-4"></div>
                            <div className="h-4 bg-hawks-hover w-32 rounded mb-2"></div>
                            <div className="h-3 bg-hawks-hover w-20 rounded mb-4"></div>
                            <div className="h-8 bg-hawks-base w-full rounded"></div>
                        </div>
                    ))
                ) : filtered.length > 0 ? (
                    filtered.map(player => (
                        <PlayerCard key={player.jumper_no} player={player} />
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center text-gray-500">
                        No players found matching "{search}"
                    </div>
                )}
            </div>
        </div>
    );
};
