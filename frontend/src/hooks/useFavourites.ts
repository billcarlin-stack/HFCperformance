/*
  The Hawk Hub — Favourite Players hook

  Simple localStorage-backed favourites list (jumper numbers).
  Coaches "pin" a couple players to focus on and they surface at the top
  of the squad list and on the dashboard.
*/

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'hfc.favouritePlayers';
const EVENT_NAME = 'hfc-favourites-changed';

function readFavs(): number[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((x: any) => typeof x === 'number') : [];
    } catch {
        return [];
    }
}

function writeFavs(list: number[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(EVENT_NAME));
}

export function useFavourites() {
    const [favs, setFavs] = useState<number[]>(() => readFavs());

    useEffect(() => {
        const handler = () => setFavs(readFavs());
        window.addEventListener(EVENT_NAME, handler);
        window.addEventListener('storage', handler);
        return () => {
            window.removeEventListener(EVENT_NAME, handler);
            window.removeEventListener('storage', handler);
        };
    }, []);

    const toggle = useCallback((jumperNo: number) => {
        const current = readFavs();
        const next = current.includes(jumperNo)
            ? current.filter(x => x !== jumperNo)
            : [...current, jumperNo];
        writeFavs(next);
    }, []);

    const isFavourite = useCallback((jumperNo: number) => favs.includes(jumperNo), [favs]);

    const clear = useCallback(() => writeFavs([]), []);

    return { favourites: favs, toggle, isFavourite, clear };
}
