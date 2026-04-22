import { motion } from 'framer-motion';

interface PlayerCardProps {
    id: number;
    number: number;
    name: string;
    position: string;
    age: number;
    games: number;
    status: 'green' | 'amber' | 'red';
    onClick?: () => void;
}

const PlayerCard = ({ number, name, position, age, games, status, onClick }: PlayerCardProps) => {
    const getStatusColor = (s: string) => {
        switch (s) {
            case 'green': return 'bg-hfc-success';
            case 'amber': return 'bg-hfc-warning';
            case 'red': return 'bg-hfc-danger';
            default: return 'bg-gray-400';
        }
    };

    // Improved avatar URL for sharper quality
    const initials = name.split(' ').map(n => n[0]).join('+');
    const avatarUrl = `https://ui-avatars.com/api/?name=${initials}&background=0057B8&color=fff&size=256&bold=true`;

    return (
        <motion.div
            whileHover={{ y: -6, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)' }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            onClick={onClick}
            className="bg-hawks-card rounded-2xl shadow-card cursor-pointer flex flex-col items-center p-8 relative group border border-white/5 hover:border-hawks-gold/20"
        >
            {/* Status Dot with Glow */}
            <div className="absolute top-5 right-5 flex items-center justify-center">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(status)} ring-4 ring-opacity-20 ${status === 'green' ? 'ring-green-500/20' : status === 'amber' ? 'ring-amber-500/20' : 'ring-red-500/20'}`} title={`Status: ${status}`} />
            </div>

            {/* Avatar Circle with Brown Blue Ring & Shadow */}
            <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-hfc-brown to-amber-500 mb-6 relative shadow-md">
                <div className="w-full h-full rounded-full border-4 border-hawks-card overflow-hidden bg-hawks-base">
                    <img
                        src={avatarUrl}
                        alt={name}
                        className="w-full h-full object-cover"
                    />
                </div>
                {/* Jumper Number Badge (Brown) - Slightly larger */}
                <div className="absolute -bottom-1 -right-1 bg-hfc-brown text-white font-bold w-9 h-9 flex items-center justify-center rounded-full border-[3px] border-hawks-card text-sm shadow-sm z-10">
                    {number}
                </div>
            </div>

            {/* Info - Clean, Centered, Hierarchical */}
            <div className="text-center w-full">
                <h3 className="font-bold text-hawks-gold text-xl tracking-tight mb-1 truncate">{name}</h3>
                <p className="text-gray-400 font-medium text-xs uppercase tracking-widest mb-6">{position}</p>

                {/* Divider */}
                <div className="w-full h-px bg-white/5 mb-5"></div>

                {/* Stats Row */}
                <div className="flex justify-center items-center space-x-8 text-gray-400">
                    <div className="flex flex-col items-center group-hover:text-hawks-gold transition-colors">
                        <span className="font-bold text-gray-100 text-lg leading-none mb-1 group-hover:text-hawks-gold">{age}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Years</span>
                    </div>
                    <div className="w-px h-8 bg-white/5"></div>
                    <div className="flex flex-col items-center group-hover:text-hawks-gold transition-colors">
                        <span className="font-bold text-gray-100 text-lg leading-none mb-1 group-hover:text-hawks-gold">{games}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Games</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default PlayerCard;
