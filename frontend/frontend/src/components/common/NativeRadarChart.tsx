import React from 'react';

interface RadarData {
    subject: string;
    [key: string]: number | string;
}

interface NativeRadarChartProps {
    data: RadarData[];
    size: { w: number; h: number };
    categories?: string[];
    colors?: Record<string, { stroke: string; fill: string; opacity: number; dash?: string }>;
}

export const NativeRadarChart: React.FC<NativeRadarChartProps> = ({
    data,
    size,
    categories = ['Coach', 'Self', 'Squad'],
    colors = {
        Coach: { stroke: '#d4a853', fill: '#d4a853', opacity: 0.5 },
        Self: { stroke: '#fbbf24', fill: '#fbbf24', opacity: 0.1 },
        Squad: { stroke: '#6366f1', fill: 'transparent', opacity: 0, dash: '4 4' }
    }
}) => {
    if (!data || data.length === 0) {
        return <div className="flex h-full items-center justify-center text-gray-400 font-medium italic">No rating data available.</div>;
    }

    const padding = 60;
    const centerX = size.w / 2;
    const centerY = size.h / 2;
    const radius = Math.min(centerX, centerY) - padding;
    const angleStep = (Math.PI * 2) / (data.length || 1);

    const getX = (value: number, angle: number, r: number) => centerX + r * (value / 10) * Math.cos(angle - Math.PI / 2);
    const getY = (value: number, angle: number, r: number) => centerY + r * (value / 10) * Math.sin(angle - Math.PI / 2);

    const levels = [2, 4, 6, 8, 10];

    return (
        <svg width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`} className="overflow-visible">
            {/* Grid Levels */}
            {levels.map(level => (
                <polygon
                    key={`level-${level}`}
                    points={data.map((_, i) => `${getX(level, i * angleStep, radius)},${getY(level, i * angleStep, radius)}`).join(' ')}
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="1"
                />
            ))}

            {/* Axis Lines */}
            {data.map((d, i) => {
                const x = getX(10, i * angleStep, radius);
                const y = getY(10, i * angleStep, radius);
                const labelX = getX(11.5, i * angleStep, radius);
                const labelY = getY(11.5, i * angleStep, radius);

                return (
                    <g key={`axis-${i}`}>
                        <line x1={centerX} y1={centerY} x2={x} y2={y} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                        <text
                            x={labelX}
                            y={labelY}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="rgba(255,255,255,0.5)"
                            fontSize="9"
                            fontWeight="800"
                            className="uppercase tracking-tighter"
                        >
                            {d.subject}
                        </text>
                    </g>
                );
            })}

            {/* Data Polygons */}
            {categories.map(cat => {
                const points = data.map((d, i) => `${getX(Number(d[cat] || 0), i * angleStep, radius)},${getY(Number(d[cat] || 0), i * angleStep, radius)}`).join(' ');
                const config = (colors as any)[cat] || { stroke: '#fff', fill: '#fff', opacity: 0.2 };
                return (
                    <polygon
                        key={`poly-${cat}`}
                        points={points}
                        fill={config.fill}
                        fillOpacity={config.opacity}
                        stroke={config.stroke}
                        strokeWidth="2"
                        strokeDasharray={config.dash || ''}
                    />
                );
            })}
        </svg>
    );
};
