import { useState, useCallback } from "react";
import { Track } from "../lib/core/Track";

export function useTrack(initial: Track) {
    const [track, setTrack] = useState(initial);

    const updateTrack = useCallback(
        (fn: (t: Track) => void) => {
            fn(track);
            // Shallow clone to trigger React re-render
            const next = new Track(track.anchor);
            next.sections = track.sections;
            next.config = track.config;
            setTrack(next);
        },
        [track]
    );

    const replaceTrack = useCallback((newTrack: Track) => {
        setTrack(newTrack);
    }, []);

    return { track, updateTrack, replaceTrack };
}
