import { useState, useEffect, useCallback } from 'react';
import { ApiService } from '../services/api';
import type { Season, Round } from '../services/api';

export const useRounds = () => {
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [selectedSeason, setSelectedSeasonState] = useState<Season | null>(null);
    const [rounds, setRounds] = useState<Round[]>([]);
    const [currentRound, setCurrentRound] = useState<Round | null>(null);
    const [selectedRound, setSelectedRound] = useState<Round | null>(null);
    const [loading, setLoading] = useState(true);

    // Initial load: fetch all seasons + current season data
    useEffect(() => {
        const init = async () => {
            try {
                const [seasonsList, currentData] = await Promise.all([
                    ApiService.getSeasons(),
                    ApiService.getCurrentSeason(),
                ]);
                setSeasons(seasonsList);
                setSelectedSeasonState(currentData.season);
                setRounds(currentData.rounds);
                setCurrentRound(currentData.current_round);
                setSelectedRound(currentData.current_round);
            } catch (err) {
                console.error('Failed to load season data:', err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    // Switch season: load that season's rounds
    const setSelectedSeason = useCallback(async (season: Season) => {
        setSelectedSeasonState(season);
        setSelectedRound(null);
        try {
            const seasonRounds = await ApiService.getSeasonRounds(season.id);
            setRounds(seasonRounds);
            // Auto-select first round of the new season
            if (seasonRounds.length > 0) {
                setSelectedRound(seasonRounds[0]);
            }
        } catch (err) {
            console.error('Failed to load rounds for season:', err);
        }
    }, []);

    return {
        seasons,
        selectedSeason,
        setSelectedSeason,
        rounds,
        currentRound,
        selectedRound,
        setSelectedRound,
        loading,
    };
};
