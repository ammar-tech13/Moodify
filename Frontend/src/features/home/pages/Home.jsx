import React, { useState, useContext, useCallback, useEffect } from 'react';
import FaceExpression from '../../Expression/components/FaceExpression';
import Player from '../components/Player';
import MoodAnalytics from '../components/MoodAnalytics';
import { useSong } from '../hooks/useSong';
import { SongContext } from '../song.context';
import { useAuth } from '../../auth/hooks/useAuth';
import { 
    Home as HomeIcon, Camera, Library, Music, History, Heart, 
    Settings, LogOut, Sun, Moon, Compass, Headphones, Search
} from "lucide-react";
import { useNavigate } from 'react-router';
import { ThemeContext } from '../../shared/theme.context';
import './home.scss';

import { EMOTION_META } from '../constants/playlists';

const Home = ({ activeTab = "Home" }) => {
    const { song, handleGetSong } = useSong();
    const { setSong, favorites, playlist, setPlaylist } = useContext(SongContext);
    const { user, handleLogout } = useAuth();

    const navigate = useNavigate();
    const { theme, toggleTheme } = useContext(ThemeContext);

    const [activeNav, setActiveNav] = useState(activeTab);

    useEffect(() => {
        setActiveNav(activeTab);
    }, [activeTab]);

    const handleNavClick = (tabName) => {
        const routeMap = {
            "Home": "/dashboard",
            "Camera": "/camera",
            "Music Library": "/music-library",
            "Playlists": "/playlists",
            "Mood History": "/mood-history",
            "Favorites": "/favorites",
            "Settings": "/settings"
        };
        navigate(routeMap[tabName] || "/dashboard");
    };

    const handleLogoutClick = async () => {
        await handleLogout();
        navigate("/login");
    };
    const [moodHistory, setMoodHistory] = useState([]);
    
    // Settings configuration
    const [scanSpeed, setScanSpeed] = useState("Medium (5 FPS)");
    const [minConfidence, setMinConfidence] = useState(70);
    const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
    
    // Search query for Music Library
    const [searchQuery, setSearchQuery] = useState("");

    // State for library songs
    const [librarySongs, setLibrarySongs] = useState([]);

    // Retrieve active mood (normalized to lowercase)
    const activeMood = (song?.mood || "neutral").toLowerCase();
    
    // Get playlist for active mood
    const currentPlaylist = playlist || [];

    // Fetch playlist from the backend
    const fetchPlaylist = useCallback(async (mood) => {
        try {
            const res = await fetch(
                `https://moodify-backend-3eni.onrender.com/api/songs/list?mood=${mood}`
            );

            if (!res.ok) throw new Error("Failed to fetch playlist");

            const data = await res.json();

            const mapped = (data.songs || []).map(track => ({
                id: track._id,
                title: track.title,
                artist: "Moodify AI",
                mood: track.mood,
                url: track.url,
                posterUrl: track.posterUrl,
                duration: "3:30"
            }));

            setPlaylist(mapped);
        } catch (error) {
            console.error("Error fetching playlist:", error);
            setPlaylist([]);
        }
    }, [setPlaylist]);

    // Fetch all library songs on mount
    useEffect(() => {
        const fetchAllSongs = async () => {
            try {
                const res = await fetch("https://moodify-backend-3eni.onrender.com/api/songs/list");

                if (res.ok) {
                    const data = await res.json();

                    const mapped = (data.songs || []).map(track => ({
                        id: track._id,
                        title: track.title,
                        artist: "Moodify AI",
                        mood: track.mood,
                        url: track.url,
                        posterUrl: track.posterUrl,
                        duration: "3:30"
                    }));

                    setLibrarySongs(mapped);
                }
            } catch (error) {
                console.error("Error fetching library songs:", error);
            }
        };

        fetchAllSongs();
    }, []);

    // Fetch playlist when mood or language filter changes
    useEffect(() => {
        fetchPlaylist(activeMood);
    }, [activeMood, fetchPlaylist]);

    const handleSongSelect = (selectedSong) => {
        setSong(selectedSong);
    };

   const handleMoodChange = useCallback(async (detectedMood, confidence = 95) => {

    // Convert unwanted emotions to neutral
    if (
        detectedMood.toLowerCase() === "angry" ||
        detectedMood.toLowerCase() === "surprised"
    ) {
        detectedMood = "neutral";
    }

    const normalized = detectedMood.toLowerCase();
    const dateStr = new Date().toLocaleDateString();
    const timeStr = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

    let recommendedSongText = "None";

    if (confidence >= minConfidence) {
        try {
            const res = await fetch(
                `https://moodify-backend-3eni.onrender.com/api/songs?mood=${normalized}`
            );

            const data = await res.json();

            if (data && data.song) {
                const recommendedSongObj = {
                    id: data.song._id,
                    title: data.song.title,
                    artist: "Moodify AI",
                    mood: data.song.mood,
                    url: data.song.url,
                    posterUrl: data.song.posterUrl,
                    duration: "3:30"
                };

                recommendedSongText = recommendedSongObj.title;

                if (autoPlayEnabled) {
                    setSong(recommendedSongObj);
                }
            } else {
                recommendedSongText = `No ${normalized} song found`;
            }
        } catch (error) {
            console.error("Error fetching song:", error);
            recommendedSongText = "Error fetching song";
        }
    }

    setMoodHistory(prev => [
        {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            timestamp: timeStr,
            date: dateStr,
            mood: detectedMood.charAt(0).toUpperCase() + detectedMood.slice(1).toLowerCase(),
            confidence: confidence,
            song: recommendedSongText
        },
        ...prev
    ].slice(0, 50));
}, [setSong, minConfidence, autoPlayEnabled]);

 
    const filteredSongs = librarySongs.filter(track => {
        return track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
            track.mood.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Conditional rendering based on active view tab selection
    const renderContent = () => {
        switch (activeNav) {
            case "Home":
                return (
                    <div className="dashboard-grid">
                        
                        {/* Center Deck */}
                        <div className="center-deck">
                            <FaceExpression onClick={handleMoodChange} />
                            
                            {/* Playlist Banner */}
                            <div className="playlist-banner glass-panel" style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                padding: "12px 20px",
                                borderRadius: "12px",
                                border: "1px solid var(--card-border)",
                                background: "var(--card-bg)",
                                width: "100%",
                                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.15)"
                            }}>
                                <Music size={16} color="var(--primary)" />
                                <span style={{
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    color: "var(--text-primary)",
                                    textTransform: "capitalize",
                                    letterSpacing: "0.5px"
                                }}>
                                    🎵 Playing {activeMood} Playlist
                                </span>
                            </div>

                            {/* Portal target for the central player card */}
                            <div id="central-player-card-portal" style={{ width: "100%" }}></div>
 
                            {/* Manual Mood controls */}
                            <div className="mood-manual">
                                <h4 className="mood-manual__title">Detect Emotion manually</h4>
                                <div className="mood-manual__buttons">
                                    {[
                                        { name: "happy", label: "Happy", cls: "happy" },
                                        { name: "sad", label: "Sad", cls: "sad" },
                                        { name: "neutral", label: "Neutral", cls: "neutral" },
                                        
                                    ].map((m) => (
                                        <button
                                            key={m.name}
                                            onClick={() => handleMoodChange(m.name, 100)}
                                            className={`mood-manual__btn mood-manual__btn--${m.cls} ${activeMood === (m.name === "surprised" ? "surprise" : m.name) ? 'active' : ''}`}
                                        >
                                            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "currentColor" }} />
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
 
                            <MoodAnalytics />
                        </div>
 
                        {/* Right playlist panel */}
                        <div className="playlist-deck">
                            <div className="playlist-deck__header">
                                <div className="playlist-deck__title">
                                    <Music size={16} color="var(--primary)" />
                                    <span style={{ textTransform: "capitalize" }}>{activeMood} Playlist</span>
                                </div>
                                <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{currentPlaylist.length} songs</span>
                            </div>
 
                            <div className="playlist-deck__list">
                                {currentPlaylist.length > 0 ? (
                                    currentPlaylist.map((track) => {
                                        const isActive = track.title.toLowerCase() === (song?.title || "").toLowerCase();
                                        return (
                                            <div 
                                                key={track.title}
                                                className={`playlist-deck__item ${isActive ? 'active' : ''}`}
                                                onClick={() => handleSongSelect(track)}
                                            >
                                                <div className="playlist-deck__song-info">
                                                    <img
                                                        className="playlist-deck__song-poster"
                                                        src={track.posterUrl}
                                                        alt={track.title}
                                                    />
                                                    <div className="playlist-deck__song-meta">
                                                        <span className="playlist-deck__song-title">{track.title}</span>
                                                        <span className="playlist-deck__song-artist">{track.artist}</span>
                                                    </div>
                                                </div>
 
                                                <div className="playlist-deck__song-right">
                                                    {isActive ? (
                                                        <div className="eq-animation">
                                                            <span></span>
                                                            <span></span>
                                                            <span></span>
                                                        </div>
                                                    ) : (
                                                        <span className="playlist-deck__song-duration">{track.duration}</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="playlist-empty-state" style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-secondary)" }}>
                                        <Music size={24} style={{ marginBottom: "8px", opacity: 0.5, display: "block", margin: "0 auto 8px auto" }} />
                                        <p style={{ fontSize: "13px" }}>No songs available.</p>
                                    </div>
                                )}
                            </div>

                            <button className="playlist-deck__footer-btn" onClick={() => setActiveNav("Playlists")}>
                                View Full Playlists
                            </button>
                        </div>

                    </div>
                );
            
            case "Camera":
                return (
                    <div className="camera-focused-view">
                        <div className="camera-focused-card">
                            <FaceExpression onClick={handleMoodChange} />
                        </div>
                        <div className="camera-info-card glass-panel">
                            <h3 style={{ fontSize: "16px", color: "var(--text-primary)", fontWeight: "600", marginBottom: "12px" }}>Expression Analysis Engine</h3>
                            <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.6", marginBottom: "16px" }}>
                                The webcam analyzer tracks key coordinates on your eyebrows, lips, eyes, and jawline using MediaPipe Face Mesh. When a constant emotion is maintained for 15 frames (~500ms), a playlist transition is scheduled.
                            </p>
                            <div style={{ display: "flex", gap: "12px" }}>
                                <button className="mood-manual__btn active" onClick={() => setActiveNav("Home")}>Return to Dashboard</button>
                                <button className="mood-manual__btn" onClick={() => setActiveNav("Settings")}>Adjust Sensitivity</button>
                            </div>
                        </div>
                    </div>
                );

            case "Music Library":
                return (
                    <div className="library-view glass-panel">
                        <div className="library-view__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                            <div>
                                <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>All Mood Tracks</h2>
                                <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Browse the complete catalog of emotion-matching tracks</p>
                            </div>

                            <div className="library-view__search">
                                <Search size={16} color="var(--text-secondary)" />
                                <input 
                                    type="text" 
                                    placeholder="Search song, artist, mood..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="library-view__search-input"
                                />
                            </div>
                        </div>

                        <div className="library-view__grid">
                            {filteredSongs.length > 0 ? (
                                filteredSongs.map((track) => {
                                    const isActive = track.title.toLowerCase() === (song?.title || "").toLowerCase();
                                    return (
                                        <div 
                                            key={track.title} 
                                            className={`library-song-card ${isActive ? 'active' : ''}`}
                                            onClick={() => handleSongSelect(track)}
                                        >
                                            <div className="library-song-card__image-container">
                                                <img src={track.posterUrl} alt={track.title} className="library-song-card__img" />
                                                <div className="library-song-card__overlay">
                                                    <div className="library-song-card__play-btn">
                                                        <Headphones size={18} color="#FFF" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="library-song-card__info">
                                                <h4 className="library-song-card__title">{track.title}</h4>
                                                <span className="library-song-card__artist">{track.artist}</span>
                                                <span className={`library-song-card__badge library-song-card__badge--${track.mood.toLowerCase()}`}>
                                                    {track.mood}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="empty-state" style={{ gridColumn: "1 / -1", padding: "60px 20px" }}>
                                    <Search size={32} color="var(--text-secondary)" style={{ marginBottom: "12px", opacity: 0.5 }} />
                                    <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>No tracks match your search queries.</p>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case "Playlists":
                return (
                    <div className="playlists-view">
                        <div className="playlists-view__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                            <div>
                                <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>Mood Playlists</h2>
                                <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Listen to music custom tailored for specific states of mind</p>
                            </div>
                        </div>
                        <div className="playlists-view__grid">
                            {[
                                { mood: "happy", title: "Happy Beats", desc: "Upbeat melodies and punchy rhythms to keep the smile wide.", color: "#FACC15", shadow: "rgba(250, 204, 21, 0.2)" },
                                { mood: "sad", title: "Sad Symphony", desc: "Melancholic harmonies to help sit back, reflect, and unwind.", color: "#00E5FF", shadow: "rgba(0, 229, 255, 0.2)" },
                                { mood: "neutral", title: "Sunset Chill", desc: "Ambient beats and acoustic tunes for focus and relaxation.", color: "#FFFFFF", shadow: "rgba(255, 255, 255, 0.15)" },
                                { mood: "angry", title: "Fury of Metal", desc: "Energetic distortion and hard-hitting drums to release power.", color: "#FF4D6D", shadow: "rgba(255, 77, 109, 0.2)" },
                                { mood: "surprised", title: "Surprised Echoes", desc: "Dynamic tempos and unexpected chord changes for a curious mind.", color: "#7C3AED", shadow: "rgba(124, 58, 237, 0.2)" }
                            ].map((playlistMeta) => {
                                const moodKey = playlistMeta.mood === "surprised" ? "surprise" : playlistMeta.mood;
                                const tracks = librarySongs.filter(s => 
                                    s.mood.toLowerCase() === moodKey.toLowerCase()
                                );
                                const isActivePlaylist = activeMood === moodKey;
                                return (
                                    <div 
                                        key={playlistMeta.mood} 
                                        className={`playlist-card-large ${isActivePlaylist ? 'active' : ''}`}
                                        style={{ 
                                            '--playlist-theme-color': playlistMeta.color,
                                            '--playlist-shadow-color': playlistMeta.shadow
                                        }}
                                    >
                                        <div className="playlist-card-large__accent" />
                                        <div className="playlist-card-large__content">
                                            <div className="playlist-card-large__header-icon">
                                                <Music size={24} color={playlistMeta.color} />
                                                <span className="playlist-card-large__count">{tracks.length} Songs</span>
                                            </div>
                                            <h3 className="playlist-card-large__title">{playlistMeta.title}</h3>
                                            <p className="playlist-card-large__desc">{playlistMeta.desc}</p>
                                            
                                            <button 
                                                className="playlist-card-large__play-btn"
                                                onClick={() => {
                                                    handleMoodChange(playlistMeta.mood, 100);
                                                    setActiveNav("Home");
                                                }}
                                            >
                                                Listen Now
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );

            case "Mood History":
                return (
                    <div className="history-view glass-panel">
                        <div className="history-view__header">
                            <div>
                                <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>Mood Scan Log</h2>
                                <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>A running list of face scans and manual emotion changes</p>
                            </div>
                            {moodHistory.length > 0 && (
                                <button 
                                    className="mood-manual__btn" 
                                    style={{ color: "#FF4D6D", borderColor: "rgba(255, 77, 109, 0.3)" }}
                                    onClick={() => setMoodHistory([])}
                                >
                                    Clear History
                                </button>
                            )}
                        </div>

                        {moodHistory.length > 0 ? (
                            <div className="history-view__table-wrap">
                                <table className="history-table">
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Date</th>
                                            <th>Emotion</th>
                                            <th>Confidence</th>
                                            <th>Recommended Song</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {moodHistory.map((item) => {
                                            const emotionColor = (EMOTION_META[item.mood.toLowerCase()] || EMOTION_META.neutral).color;
                                            return (
                                                <tr key={item.id}>
                                                    <td style={{ color: "var(--text-primary)", fontWeight: "500" }}>{item.timestamp}</td>
                                                    <td>{item.date}</td>
                                                    <td>
                                                        <span className="history-table__mood-pill" style={{ '--mood-pill-color': emotionColor }}>
                                                            {item.mood}
                                                        </span>
                                                    </td>
                                                    <td style={{ color: emotionColor, fontWeight: "600" }}>{item.confidence}%</td>
                                                    <td style={{ color: "var(--text-primary)" }}>{item.song}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty-state" style={{ padding: "60px 20px" }}>
                                <History size={48} color="var(--text-secondary)" style={{ marginBottom: "16px", opacity: 0.5 }} />
                                <h3 style={{ color: "var(--text-primary)", fontSize: "16px", fontWeight: "600" }}>No Scan Records Found</h3>
                                <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "4px", maxWidth: "300px", lineHeight: "1.5" }}>
                                    Open your camera or select manual emotions to generate your first mood-analysis timestamps.
                                </p>
                                <button className="mood-manual__btn active" style={{ marginTop: "16px" }} onClick={() => setActiveNav("Home")}>
                                    Go to Scanner
                                </button>
                            </div>
                        )}
                    </div>
                );

            case "Favorites":
                return (
                    <div className="favorites-view glass-panel">
                        <div className="favorites-view__header">
                            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>Favorite Songs</h2>
                            <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Your personal collection of liked mood recommendations</p>
                        </div>

                        {favorites.length > 0 ? (
                            <div className="favorites-view__grid">
                                {favorites.map((track) => {
                                    const isActive = track.title.toLowerCase() === (song?.title || "").toLowerCase();
                                    return (
                                        <div 
                                            key={track.title} 
                                            className={`library-song-card ${isActive ? 'active' : ''}`}
                                            onClick={() => handleSongSelect(track)}
                                        >
                                            <div className="library-song-card__image-container">
                                                <img src={track.posterUrl} alt={track.title} className="library-song-card__img" />
                                                <div className="library-song-card__overlay">
                                                    <div className="library-song-card__play-btn">
                                                        <Headphones size={18} color="#FFF" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="library-song-card__info">
                                                <h4 className="library-song-card__title">{track.title}</h4>
                                                <span className="library-song-card__artist">{track.artist}</span>
                                                <span className={`library-song-card__badge library-song-card__badge--${track.mood.toLowerCase()}`}>
                                                    {track.mood}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="empty-state" style={{ padding: "60px 20px" }}>
                                <Heart size={48} color="#FF4D6D" style={{ marginBottom: "16px", opacity: 0.5 }} />
                                <h3 style={{ color: "var(--text-primary)", fontSize: "16px", fontWeight: "600" }}>Your Library is Empty</h3>
                                <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "4px", maxWidth: "320px", lineHeight: "1.5" }}>
                                    Save your favorite recommendations by clicking the heart button in the player panel.
                                </p>
                                <button className="mood-manual__btn active" style={{ marginTop: "16px" }} onClick={() => setActiveNav("Home")}>
                                    Browse Recommendations
                                </button>
                            </div>
                        )}
                    </div>
                );

            case "Settings":
                return (
                    <div className="settings-view glass-panel">
                        <div className="settings-view__header">
                            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>Settings & Preferences</h2>
                            <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Manage camera polling rates and threshold sensitivity</p>
                        </div>

                        <div className="settings-view__body">
                            
                            {/* Profile Card */}
                            <div className="settings-section glass-panel" style={{ display: "flex", alignItems: "center", gap: "20px", background: "rgba(255, 255, 255, 0.01)" }}>
                                <img 
                                    className="settings-view__avatar"
                                    src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.username || 'Adithya'}`}
                                    alt="Avatar"
                                    style={{ width: "64px", height: "64px", borderRadius: "50%", border: "2px solid var(--primary)", objectFit: "cover" }}
                                />
                                <div>
                                    <h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)" }}>{user?.username || 'Adithya'}</h3>
                                    <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>Registered Moodify User</p>
                                    <span className="library-song-card__badge library-song-card__badge--neutral" style={{ marginTop: "8px", display: "inline-block" }}>Premium Account</span>
                                </div>
                            </div>

                            {/* Sensitivity Sliders */}
                            <div className="settings-section">
                                <h3 className="settings-section__title">AI Emotion Detection</h3>
                                
                                <div className="setting-control">
                                    <div className="setting-control__label-wrap" style={{ display: "flex", justifyContent: "space-between", color: "var(--text-primary)", fontSize: "13px" }}>
                                        <label>Confidence Threshold</label>
                                        <span>{minConfidence}%</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="50" 
                                        max="95" 
                                        step="5"
                                        value={minConfidence}
                                        onChange={(e) => setMinConfidence(parseInt(e.target.value))}
                                        className="player-card__volume-slider"
                                        style={{ width: "100%", margin: "8px 0" }}
                                    />
                                    <p className="setting-control__help" style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>Expressions with confidence below this threshold will not update the active playlist.</p>
                                </div>

                                <div className="setting-control" style={{ marginTop: "20px" }}>
                                    <div className="setting-control__label-wrap" style={{ display: "flex", justifyContent: "space-between", color: "var(--text-primary)", fontSize: "13px" }}>
                                        <label>Webcam Scan Rate</label>
                                        <span style={{ color: "var(--primary)", fontWeight: "600" }}>{scanSpeed}</span>
                                    </div>
                                    <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                                        {["Slow (2 FPS)", "Medium (5 FPS)", "Fast (10 FPS)"].map((opt) => (
                                            <button 
                                                key={opt}
                                                className={`mood-manual__btn ${scanSpeed === opt ? 'active' : ''}`}
                                                onClick={() => setScanSpeed(opt)}
                                                style={{ flex: 1, padding: "8px", fontSize: "11px", justifyContent: "center" }}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="setting-control__help" style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>Adjust refresh frequencies to optimize CPU/GPU rendering load.</p>
                                </div>
                            </div>

                            {/* Autoplay toggle */}
                            <div className="settings-section">
                                <h3 className="settings-section__title">Playback Preferences</h3>
                                
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0" }}>
                                    <div>
                                        <h4 style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: "500" }}>Autoplay on Scan</h4>
                                        <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>Immediately start recommendation songs when emotion changes.</p>
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        checked={autoPlayEnabled}
                                        onChange={(e) => setAutoPlayEnabled(e.target.checked)}
                                        style={{ width: "18px", height: "18px", accentColor: "var(--primary)", cursor: "pointer" }}
                                    />
                                </div>
                            </div>

                            {/* Reset App */}
                            <div className="settings-section" style={{ borderBottom: "none" }}>
                                <h3 className="settings-section__title" style={{ color: "#FF4D6D" }}>Dangerous Zone</h3>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                                    <div>
                                        <h4 style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: "500" }}>Clear Local Cache</h4>
                                        <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>Deletes scan histories, favorites, and resets credentials.</p>
                                    </div>
                                    <button 
                                        className="mood-manual__btn"
                                        style={{ color: "#FF4D6D", borderColor: "rgba(255, 77, 109, 0.4)", background: "rgba(255, 77, 109, 0.05)", padding: "8px 16px" }}
                                        onClick={() => {
                                            setMoodHistory([]);
                                            alert("Application state cleared successfully.");
                                        }}
                                    >
                                        Reset State
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="dashboard-container">
            
            {/* Sidebar Navigation */}
            <aside className="sidebar">
                <div className="sidebar__brand">
                    <Headphones size={22} color="var(--primary)" />
                    <span>Moodify</span>
                </div>

                <nav className="sidebar__nav">
                    {[
                        { name: "Home", icon: HomeIcon },
                        { name: "Camera", icon: Camera },
                        { name: "Music Library", icon: Library },
                        { name: "Playlists", icon: Music },
                        { name: "Mood History", icon: History },
                        { name: "Favorites", icon: Heart },
                        { name: "Settings", icon: Settings }
                    ].map((item) => {
                        const IconComponent = item.icon;
                        return (
                            <div 
                                key={item.name}
                                className={`sidebar__nav-item ${activeNav === item.name ? 'active' : ''}`}
                                onClick={() => handleNavClick(item.name)}
                            >
                                <IconComponent size={18} />
                                <span>{item.name}</span>
                            </div>
                        );
                    })}
                </nav>

                {/* Glass headphones card at bottom of sidebar */}
                <div className="sidebar__headphones-card">
                    <div className="sidebar__headphones-glow">
                        <Headphones size={24} color="var(--primary)" />
                    </div>
                    <div style={{ zIndex: 2 }}>
                        <p style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-primary)", marginTop: "4px" }}>Visualizer Active</p>
                        <p style={{ fontSize: "9px", color: "var(--text-secondary)", marginTop: "2px" }}>Listening to camera feed</p>
                    </div>
                    <div className="sidebar__headphones-bars">
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>

                {/* Logout Button */}
                <div 
                    className="sidebar__nav-item" 
                    onClick={handleLogoutClick}
                    style={{ marginTop: "16px", color: "#FF4D6D" }}
                >
                    <LogOut size={18} />
                    <span>Log Out</span>
                </div>
            </aside>

            {/* Main Area */}
            <main className="main-content">
                
                {/* Header */}
                <header className="header">
                    <div className="header__brand-meta">
                        <h1>Welcome back, {user?.fullName || user?.username || 'Ammar'} 👋</h1>
                        <p>Moodify AI Emotion Music Player</p>
                    </div>

                    <div className="header__actions">
                        {/* Sun/Moon Toggle */}
                        <div 
                            className={`header__theme-toggle ${theme}`}
                            onClick={toggleTheme}
                            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            <Sun size={12} className="toggle-icon-sun" />
                            <Moon size={12} className="toggle-icon-moon" />
                            <div className="header__theme-thumb">
                                {theme === "dark" ? <Moon size={10} color="#050816" fill="#050816" /> : <Sun size={10} color="#FACC15" fill="#FACC15" />}
                            </div>
                        </div>

                        {/* User profile */}
                        <div className="header__profile" onClick={() => handleNavClick("Settings")}>
                            <span className="header__profile-name">{user?.fullName || user?.username || 'AMMAR'}</span>
                        </div>
                    </div>
                </header>

                {/* Switchable content */}
                {renderContent()}

                {/* Global Bottom Sticky Player */}
                <Player />

            </main>

        </div>
    );
};

export default Home;