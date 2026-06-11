import React, { useRef, useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { SongContext } from '../song.context';
import { useSong } from '../hooks/useSong';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, 
    Volume2, VolumeX, ListMusic, Laptop, Heart, Sparkles, X, Tv, Smartphone
} from "lucide-react";
// Dynamic playlist loaded from context
import { ThemeContext } from '../../shared/theme.context';
import './player.scss';

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const LYRICS_DATA = {
    "sunset chill": [
        { time: 0, text: "🌅 Watching the sun go down..." },
        { time: 5, text: "The ocean breeze starts to blow" },
        { time: 10, text: "All the worries of today" },
        { time: 15, text: "Just letting them drift away" },
        { time: 20, text: "Here in the sunset chill" },
        { time: 25, text: "Time is standing still..." },
        { time: 30, text: "Feel the warmth of the fading light" },
        { time: 35, text: "As we ease into the night" }
    ],
    "happy vibe": [
        { time: 0, text: "☀️ Wake up to a brand new day!" },
        { time: 5, text: "Nothing's gonna stand in my way" },
        { time: 10, text: "Put a smile upon your face" },
        { time: 15, text: "Running at a happy pace" },
        { time: 20, text: "Feel the beat, let it move your feet" },
        { time: 25, text: "Dancing down this sunny street" }
    ],
    "sad melody": [
        { time: 0, text: "🌧️ Raindrops falling on the window pane" },
        { time: 5, text: "Trying to wash away the quiet pain" },
        { time: 10, text: "The echoes of a song we used to know" },
        { time: 15, text: "How did we let the music go?" },
        { time: 20, text: "In the shadow of the night" },
        { time: 25, text: "Waiting for the morning light..." }
    ]
};

const getLyricsForSong = (currentSong) => {
    if (!currentSong) return [];
    const key = currentSong.title.toLowerCase();
    if (LYRICS_DATA[key]) return LYRICS_DATA[key];
    // Dynamic fallback lyrics
    return [
        { time: 0, text: `🎵 Listening to ${currentSong.title}` },
        { time: 4, text: `An emotional journey by ${currentSong.artist || 'Unknown Artist'}` },
        { time: 8, text: `Tailored for your ${currentSong.mood || 'neutral'} mood` },
        { time: 12, text: "Close your eyes and feel the music" },
        { time: 16, text: "Letting the frequencies align..." },
        { time: 20, text: "A melody that speaks to the soul" },
        { time: 24, text: "Harmony floating through the air" },
        { time: 28, text: "Lost in the rhythm of the moment" },
        { time: 32, text: "Pure frequencies connecting everything..." }
    ];
};

const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

const Player = () => {
    const { song } = useSong();
    const { favorites, toggleFavorite, setSong, playlist } = useContext(SongContext);
    const { theme } = useContext(ThemeContext);

    const audioRef = useRef(null);
    const progressRef = useRef(null);
    const canvasRef = useRef(null);
    const bottomCanvasRef = useRef(null);
    const animationRef = useRef(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [speed, setSpeed] = useState(1);
    const [volume, setVolume] = useState(0.8);
    const [showSpeed, setShowSpeed] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isShuffle, setIsShuffle] = useState(false);
    const [isRepeat, setIsRepeat] = useState(false);

    // Drawers states
    const [showQueue, setShowQueue] = useState(false);
    const [showLyrics, setShowLyrics] = useState(false);
    const [showDevices, setShowDevices] = useState(false);

    const isLiked = song ? favorites.some(t => t.title.toLowerCase() === song.title.toLowerCase()) : false;

    // Web Audio API refs
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const sourceRef = useRef(null);
    const isAudioConnected = useRef(false);

    const isInitialMount = useRef(true);

    // Retrieve active playlist elements from shared context
    const currentPlaylist = playlist || [];
    const currentIdx = song ? currentPlaylist.findIndex(t => t.title.toLowerCase() === song.title.toLowerCase()) : -1;

    const lyrics = song ? getLyricsForSong(song) : [];

    useEffect(() => {
        const timer = setTimeout(() => {
            isInitialMount.current = false;
            console.log("Initial load gate lifted");
        }, 800);
        return () => clearTimeout(timer);
    }, []);

    // Reset player when song changes
    useEffect(() => {
        console.log("Player.jsx useEffect ran, song.url:", song?.url, "isInitialMount:", isInitialMount.current);
        if (audioRef.current && song?.url) {
            if (song.url.startsWith("https://moodify-backend-3eni.onrender.com")) {
                audioRef.current.setAttribute("crossorigin", "anonymous");
            } else {
                audioRef.current.removeAttribute("crossorigin");
            }
            audioRef.current.load();
            setCurrentTime(0);

            // Skip autoplay during initial load gate
            if (isInitialMount.current) {
                console.log("Skipping autoplay during initial load gate");
                setIsPlaying(false);
                return;
            }

            console.log("Autoplay song:", song.title);
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    setIsPlaying(true);
                    setupWebAudio();
                }).catch(err => {
                    console.log("Auto-play prevented:", err.message);
                    setIsPlaying(false);
                });
            }
        }
    }, [song?.url]);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;
        
        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            setupWebAudio();
            audio.play().then(() => {
                setIsPlaying(true);
            }).catch(err => {
                console.warn("Playback failed:", err);
            });
        }
    };

    const setupWebAudio = () => {
        if (isAudioConnected.current || !audioRef.current) return;

        const isLocal = song?.url?.startsWith("http://localhost") || song?.url?.startsWith("http://127.0.0.1") || song?.url?.startsWith("/");
        if (!isLocal) {
            console.log("External song detected, using visualizer simulation mode to prevent CORS issues.");
            return;
        }

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioContext();
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 128;

            const source = ctx.createMediaElementSource(audioRef.current);
            source.connect(analyser);
            analyser.connect(ctx.destination);

            audioContextRef.current = ctx;
            analyserRef.current = analyser;
            sourceRef.current = source;
            isAudioConnected.current = true;
        } catch (err) {
            console.log("Web Audio API not connected, using visualizer simulation mode. Info:", err.message);
        }
    };

    const skipSeconds = (secs) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = Math.min(Math.max(audio.currentTime + secs, 0), duration);
    };

    const playNext = () => {
        if (!currentPlaylist.length) return;
        let nextIdx = 0;
        if (isShuffle) {
            nextIdx = Math.floor(Math.random() * currentPlaylist.length);
        } else {
            nextIdx = currentIdx + 1;
            if (nextIdx >= currentPlaylist.length) {
                nextIdx = 0;
            }
        }
        setSong(currentPlaylist[nextIdx]);
    };

    const playPrev = () => {
        if (!currentPlaylist.length) return;
        let prevIdx = 0;
        if (isShuffle) {
            prevIdx = Math.floor(Math.random() * currentPlaylist.length);
        } else {
            prevIdx = currentIdx - 1;
            if (prevIdx < 0) {
                prevIdx = currentPlaylist.length - 1;
            }
        }
        setSong(currentPlaylist[prevIdx]);
    };

    const handleTimeUpdate = () => {
        setCurrentTime(audioRef.current.currentTime);
    };

    const handleLoadedMetadata = () => {
        setDuration(audioRef.current.duration);
    };

    const handleProgressClick = (e) => {
        const bar = progressRef.current;
        if (!bar) return;
        const rect = bar.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        const newTime = ratio * duration;
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const handleSpeedChange = (s) => {
        setSpeed(s);
        audioRef.current.playbackRate = s;
        setShowSpeed(false);
    };

    const handleVolume = (e) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        audioRef.current.volume = val;
        setIsMuted(val === 0);
    };

    const toggleMute = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (isMuted) {
            audio.volume = volume || 0.8;
            setIsMuted(false);
        } else {
            audio.volume = 0;
            setIsMuted(true);
        }
    };

    const handleSongEnd = () => {
        if (isRepeat) {
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().then(() => {
                    setIsPlaying(true);
                }).catch(err => console.log("Loop play failed:", err));
            }
        } else {
            playNext();
        }
    };

    // Waveform rendering loop
    useEffect(() => {
        const canvas1 = canvasRef.current;
        const canvas2 = bottomCanvasRef.current;
        
        let frame = 0;
        const numBars = 45;
        const barWidth = 4;
        const barGap = 3;
        const barHeights = Array(numBars).fill(4);
        const barHeightsBottom = Array(numBars).fill(4);

        const drawCanvas = (canvas, ctx, heights) => {
            if (!canvas || !ctx) return;
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
            }

            ctx.clearRect(0, 0, width, height);

            let dataArray = null;
            if (isAudioConnected.current && analyserRef.current && isPlaying) {
                const bufferLength = analyserRef.current.frequencyBinCount;
                dataArray = new Uint8Array(bufferLength);
                analyserRef.current.getByteFrequencyData(dataArray);
            }

            const centerY = height / 2;

            for (let i = 0; i < numBars; i++) {
                let targetHeight = 4;

                if (isPlaying) {
                    if (dataArray) {
                        const dataIdx = Math.floor((i / numBars) * dataArray.length);
                        targetHeight = (dataArray[dataIdx] / 255) * (height - 8);
                    } else {
                        // Falling simulated sine waves
                        const speedFactor = 0.15;
                        const wave1 = Math.sin(i * 0.2 + frame * speedFactor) * (height * 0.35);
                        const wave2 = Math.cos(i * 0.4 - frame * 0.08) * (height * 0.2);
                        const noise = Math.random() * 5;
                        targetHeight = Math.max(4, Math.abs(wave1 + wave2) + noise + 2);
                    }
                }

                heights[i] += (targetHeight - heights[i]) * 0.2;
                const h = Math.max(4, heights[i]);

                const x = (i * (barWidth + barGap)) + (width - (numBars * (barWidth + barGap))) / 2;
                const y = centerY - h / 2;

                const gradient = ctx.createLinearGradient(x, y, x, y + h);
                if (theme === 'light') {
                    gradient.addColorStop(0, '#4F46E5'); // Indigo
                    gradient.addColorStop(1, '#8B5CF6'); // Purple
                } else {
                    gradient.addColorStop(0, '#7C3AED'); // Neon purple
                    gradient.addColorStop(1, '#00E5FF'); // Neon cyan
                }

                ctx.fillStyle = gradient;
                
                ctx.beginPath();
                ctx.roundRect(x, y, barWidth, h, 2);
                ctx.fill();
            }
        };

        const drawLoop = () => {
            frame++;
            if (canvas1) {
                const ctx1 = canvas1.getContext('2d');
                if (ctx1) drawCanvas(canvas1, ctx1, barHeights);
            }
            if (canvas2) {
                const ctx2 = canvas2.getContext('2d');
                if (ctx2) drawCanvas(canvas2, ctx2, barHeightsBottom);
            }
            animationRef.current = requestAnimationFrame(drawLoop);
        };

        drawLoop();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isPlaying, song?.url]);

    const progress = duration ? (currentTime / duration) * 100 : 0;

    const portalTarget = typeof document !== 'undefined' ? document.getElementById("central-player-card-portal") : null;

    return (
        <>
            {/* HTML5 Audio */}
            <audio
                ref={audioRef}
                src={song.url}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleSongEnd}
            />

            {/* Central Now Playing Player Card */}
            {portalTarget ? createPortal(
                <div className="player-card">
                    
                    <div className="player-card__header">
                        <span>Now Playing</span>
                        <button 
                            onClick={() => toggleFavorite(song)} 
                            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
                        >
                            <Heart size={16} fill={isLiked ? "#FF4D6D" : "none"} color={isLiked ? "#FF4D6D" : "#9CA3AF"} />
                        </button>
                    </div>

                    {/* Album Art & Title Meta */}
                    <div className="player-card__body">
                        <img
                            className="player-card__poster"
                            src={song.posterUrl}
                            alt={song.title}
                        />
                        <div className="player-card__meta">
                            <h4 className="player-card__title">{song.title}</h4>
                            <span className="player-card__artist">{song.artist}</span>
                            <div className="player-card__mood-badge">
                                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#00E5FF", boxShadow: "0 0 6px #00E5FF" }} />
                                {song.mood}
                            </div>
                        </div>
                    </div>

                    {/* Waveform Visualizer */}
                    <div className="player-card__visualizer-container">
                        <canvas ref={canvasRef} className="player-card__visualizer" />
                    </div>

                    {/* Timeline Progress Wrap */}
                    <div className="player-card__progress-wrap">
                        <span className="player-card__time">{formatTime(currentTime)}</span>
                        <div
                            className="player-card__progress"
                            ref={progressRef}
                            onClick={handleProgressClick}
                        >
                            <div className="player-card__progress-fill" style={{ width: `${progress}%` }} />
                            <div className="player-card__progress-thumb" style={{ left: `${progress}%` }} />
                        </div>
                        <span className="player-card__time">{formatTime(duration)}</span>
                    </div>

                    {/* Control Buttons row */}
                    <div className="player-card__controls-row">
                        
                        {/* Speed selection */}
                        <div className="player-card__speed-wrap">
                            <button
                                className="player-card__speed-btn"
                                onClick={() => setShowSpeed(!showSpeed)}
                                title="Playback Speed"
                            >
                                {speed}×
                            </button>
                            {showSpeed && (
                                <div className="player-card__speed-menu">
                                    {SPEED_OPTIONS.map((s) => (
                                        <button
                                            key={s}
                                            className={`player-card__speed-option ${s === speed ? 'active' : ''}`}
                                            onClick={() => handleSpeedChange(s)}
                                        >
                                            {s}×
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Media Actions */}
                        <div className="player-card__controls-group">
                            <button 
                                className={`player-card__btn ${isShuffle ? 'active' : ''}`} 
                                onClick={() => setIsShuffle(!isShuffle)} 
                                title="Shuffle"
                            >
                                <Shuffle size={18} />
                            </button>

                            <button className="player-card__btn" onClick={() => skipSeconds(-5)} title="Back 5s">
                                <SkipBack size={18} />
                            </button>

                            <button 
                                className="player-card__btn player-card__btn--play" 
                                onClick={togglePlay} 
                                title={isPlaying ? 'Pause' : 'Play'}
                            >
                                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" style={{ marginLeft: "3px" }} />}
                            </button>

                            <button className="player-card__btn" onClick={() => skipSeconds(5)} title="Forward 5s">
                                <SkipForward size={18} />
                            </button>

                            <button 
                                className={`player-card__btn ${isRepeat ? 'active' : ''}`} 
                                onClick={() => setIsRepeat(!isRepeat)} 
                                title="Repeat"
                            >
                                <Repeat size={18} />
                            </button>
                        </div>

                        {/* Volume control */}
                        <div className="player-card__volume">
                            <button className="player-card__btn" onClick={toggleMute} title={isMuted ? "Unmute" : "Mute"}>
                                {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            </button>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={isMuted ? 0 : volume}
                                onChange={handleVolume}
                                className="player-card__volume-slider"
                            />
                        </div>

                    </div>

                </div>,
                portalTarget
            ) : null}

            {/* Slide-out Panels (AnimatePresence) */}
            <AnimatePresence>
                {showQueue && (
                    <motion.div 
                        initial={{ opacity: 0, y: 80, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 80, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 260, damping: 26 }}
                        className="player-drawer queue-drawer glass-panel"
                    >
                        <div className="player-drawer__header">
                            <h3>Play Queue</h3>
                            <button className="player-drawer__close-btn" onClick={() => setShowQueue(false)}><X size={18} /></button>
                        </div>
                        <div className="player-drawer__content queue-content">
                            <span className="queue-section-title">Now Playing</span>
                            <div className="queue-item active">
                                <img src={song.posterUrl} alt={song.title} />
                                <div className="queue-item-info">
                                    <span className="queue-title">{song.title}</span>
                                    <span className="queue-artist">{song.artist} • <span style={{ textTransform: "capitalize" }}>{song.mood}</span></span>
                                </div>
                                <div className="playing-pulse" />
                            </div>
                            
                            <span className="queue-section-title">Tracks in Playlist ({currentPlaylist.length})</span>
                            <div className="queue-list">
                                {currentPlaylist.map((track, idx) => {
                                    const isCurrent = track.title.toLowerCase() === song.title.toLowerCase();
                                    return (
                                        <div 
                                            key={idx} 
                                            className={`queue-item ${isCurrent ? 'current' : ''}`}
                                            onClick={() => setSong(track)}
                                        >
                                            <img src={track.posterUrl} alt={track.title} />
                                            <div className="queue-item-info">
                                                <span className="queue-title">{track.title}</span>
                                                <span className="queue-artist">{track.artist}</span>
                                            </div>
                                            <span className="queue-duration">{track.duration}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}

                {showLyrics && (
                    <motion.div 
                        initial={{ opacity: 0, y: 80, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 80, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 260, damping: 26 }}
                        className="player-drawer lyrics-drawer glass-panel"
                    >
                        <div className="player-drawer__header">
                            <h3>Lyrics (Synced)</h3>
                            <button className="player-drawer__close-btn" onClick={() => setShowLyrics(false)}><X size={18} /></button>
                        </div>
                        <div className="player-drawer__content lyrics-content">
                            {lyrics.map((line, idx) => {
                                const isActive = currentTime >= line.time && (idx === lyrics.length - 1 || currentTime < lyrics[idx + 1].time);
                                return (
                                    <p 
                                        key={idx} 
                                        className={`lyric-line ${isActive ? 'active' : ''}`}
                                    >
                                        {line.text}
                                    </p>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {showDevices && (
                    <motion.div 
                        initial={{ opacity: 0, y: 80, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 80, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 260, damping: 26 }}
                        className="player-drawer devices-drawer glass-panel"
                    >
                        <div className="player-drawer__header">
                            <h3>Connect to Device</h3>
                            <button className="player-drawer__close-btn" onClick={() => setShowDevices(false)}><X size={18} /></button>
                        </div>
                        <div className="player-drawer__content devices-content">
                            {[
                                { name: "Web Browser (This Device)", icon: Laptop, active: true },
                                { name: "Living Room Speakers", icon: Tv, active: false },
                                { name: "Adithya's iPhone", icon: Smartphone, active: false },
                            ].map((dev, idx) => {
                                const Icon = dev.icon;
                                return (
                                    <div key={idx} className={`device-item ${dev.active ? 'active' : ''}`}>
                                        <Icon size={18} className="device-icon" />
                                        <div className="device-info">
                                            <span className="device-name">{dev.name}</span>
                                            <span className="device-status">{dev.active ? 'Active' : 'Available'}</span>
                                        </div>
                                        {dev.active && <div className="device-active-dot" />}
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom Premium Sticky Player Bar */}
            <div className="bottom-player glass-panel">
                
                {/* Left: Artwork, Title, Artist, Emotion & Liked Action */}
                <div className="bottom-player__left">
                    <motion.div 
                        className="bottom-player__poster-wrap"
                        animate={isPlaying ? { rotate: 360 } : {}}
                        transition={isPlaying ? { repeat: Infinity, duration: 20, ease: "linear" } : {}}
                    >
                        <img
                            className="bottom-player__poster"
                            src={song.posterUrl}
                            alt={song.title}
                        />
                    </motion.div>
                    <div className="bottom-player__meta">
                        <span className="bottom-player__title" title={song.title}>{song.title}</span>
                        <span className="bottom-player__artist-mood">
                            {song.artist} • <span className={`bottom-player__mood-pill bottom-player__mood-pill--${song.mood.toLowerCase()}`}>{song.mood}</span>
                        </span>
                    </div>

                    <motion.button 
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.85 }}
                        className="bottom-player__like-btn"
                        onClick={() => toggleFavorite(song)}
                        title={isLiked ? "Remove from Favorites" : "Add to Favorites"}
                    >
                        <Heart size={18} fill={isLiked ? "#FF4D6D" : "none"} color={isLiked ? "#FF4D6D" : "#9CA3AF"} />
                    </motion.button>
                </div>

                {/* Center: Play controls, wave animation, seek bar */}
                <div className="bottom-player__center">
                    
                    {/* Media Actions */}
                    <div className="bottom-player__controls">
                        <motion.button 
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.85 }}
                            className={`bottom-player__btn ${isShuffle ? 'active' : ''}`} 
                            onClick={() => setIsShuffle(!isShuffle)} 
                            title="Shuffle"
                        >
                            <Shuffle size={18} />
                        </motion.button>

                        <motion.button 
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.85 }}
                            className="bottom-player__btn" 
                            onClick={playPrev} 
                            title="Previous"
                        >
                            <SkipBack size={18} fill="currentColor" />
                        </motion.button>

                        <motion.button 
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.92 }}
                            animate={isPlaying ? { boxShadow: "0 0 20px var(--primary-glow)" } : { boxShadow: "0 0 10px var(--card-border)" }}
                            className="bottom-player__btn bottom-player__btn--play" 
                            onClick={togglePlay}
                            title={isPlaying ? 'Pause' : 'Play'}
                        >
                            {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" style={{ marginLeft: "4px" }} />}
                        </motion.button>

                        <motion.button 
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.85 }}
                            className="bottom-player__btn" 
                            onClick={playNext} 
                            title="Next"
                        >
                            <SkipForward size={18} fill="currentColor" />
                        </motion.button>

                        <motion.button 
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.85 }}
                            className={`bottom-player__btn ${isRepeat ? 'active' : ''}`} 
                            onClick={() => setIsRepeat(!isRepeat)} 
                            title="Repeat"
                        >
                            <Repeat size={18} />
                        </motion.button>
                    </div>

                    {/* Integrated waveform visualizer canvas */}
                    <div className="bottom-player__waveform-container">
                        <canvas ref={bottomCanvasRef} className="bottom-player__waveform" />
                    </div>

                    {/* Draggable Progress timeline */}
                    <div className="bottom-player__timeline">
                        <span className="bottom-player__time">{formatTime(currentTime)}</span>
                        <div className="bottom-player__slider-wrap">
                            <input
                                type="range"
                                min="0"
                                max={duration || 100}
                                value={currentTime}
                                onChange={(e) => {
                                    const newTime = parseFloat(e.target.value);
                                    setCurrentTime(newTime);
                                    if (audioRef.current) {
                                        audioRef.current.currentTime = newTime;
                                    }
                                }}
                                className="bottom-player__slider"
                            />
                            <div className="bottom-player__slider-fill" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="bottom-player__time">{formatTime(duration)}</span>
                    </div>

                </div>

                {/* Right: Drawer Triggers & Volume controls */}
                <div className="bottom-player__right">
                    <motion.button 
                        whileHover={{ scale: 1.12 }}
                        whileTap={{ scale: 0.88 }}
                        className={`bottom-player__btn ${showQueue ? 'active' : ''}`}
                        onClick={() => {
                            setShowQueue(!showQueue);
                            setShowLyrics(false);
                            setShowDevices(false);
                        }}
                        title="Queue"
                    >
                        <ListMusic size={19} />
                    </motion.button>

                    <motion.button 
                        whileHover={{ scale: 1.12 }}
                        whileTap={{ scale: 0.88 }}
                        className={`bottom-player__btn ${showLyrics ? 'active' : ''}`}
                        onClick={() => {
                            setShowLyrics(!showLyrics);
                            setShowQueue(false);
                            setShowDevices(false);
                        }}
                        title="Lyrics"
                    >
                        <Sparkles size={19} />
                    </motion.button>

                    <motion.button 
                        whileHover={{ scale: 1.12 }}
                        whileTap={{ scale: 0.88 }}
                        className={`bottom-player__btn ${showDevices ? 'active' : ''}`}
                        onClick={() => {
                            setShowDevices(!showDevices);
                            setShowQueue(false);
                            setShowLyrics(false);
                        }}
                        title="Devices"
                    >
                        <Laptop size={19} />
                    </motion.button>

                    {/* Mute and Slider */}
                    <div className="bottom-player__volume">
                        <motion.button 
                            whileHover={{ scale: 1.12 }}
                            whileTap={{ scale: 0.88 }}
                            className="bottom-player__btn" 
                            onClick={toggleMute} 
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </motion.button>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={isMuted ? 0 : volume}
                            onChange={handleVolume}
                            className="bottom-player__volume-slider"
                        />
                    </div>
                </div>

            </div>
        </>
    );
};

export default Player;