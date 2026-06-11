import React, { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

const MOOD_STATS = [
    { name: "Happy", value: 25, color: "#10B981", gradient: "url(#grad-happy)", darkColor: "#065F46" },
    { name: "Sad", value: 50, color: "#00E5FF", gradient: "url(#grad-sad)", darkColor: "#0891B2" },
    { name: "Neutral", value: 15, color: "#FACC15", gradient: "url(#grad-neutral)", darkColor: "#854D0E" },
    { name: "Angry", value: 5, color: "#FF4D6D", gradient: "url(#grad-angry)", darkColor: "#991B1B" },
    { name: "Surprised", value: 5, color: "#7C3AED", gradient: "url(#grad-surprised)", darkColor: "#4C1D95" }
];

export default function MoodAnalytics() {
    const [animatedValues, setAnimatedValues] = useState(MOOD_STATS.map(s => 0));

    useEffect(() => {
        const timer = setTimeout(() => {
            setAnimatedValues(MOOD_STATS.map(s => s.value));
        }, 300);
        return () => clearTimeout(timer);
    }, []);

    // SVG donut math
    const radius = 50;
    const strokeWidth = 18;
    const center = 100;
    const circ = 2 * Math.PI * radius; // ~314.16

    // Cumulative progress tracking for stacking strokes
    let accumulatedPercent = 0;

    return (
        <div className="glass-panel glow-purple" style={{ padding: "20px", width: "100%", display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", letterSpacing: "0.5px" }}>Mood Analytics</h3>
                
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid var(--card-border)",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    cursor: "pointer"
                }}>
                    <span>Today</span>
                    <ChevronDown size={14} />
                </div>
            </div>

            {/* Layout content */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", alignItems: "center", gap: "20px" }}>
                
                {/* 3D-Shaded Donut Chart */}
                <div style={{ display: "flex", justifyContent: "center", position: "relative" }}>
                    <svg width="150" height="150" viewBox="0 0 200 200" style={{ transform: "rotate(-90deg)", filter: "drop-shadow(0px 10px 15px rgba(0,0,0,0.4))" }}>
                        <defs>
                            {/* Gradients */}
                            <linearGradient id="grad-happy" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#10B981" />
                                <stop offset="100%" stopColor="#059669" />
                            </linearGradient>
                            <linearGradient id="grad-sad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#00E5FF" />
                                <stop offset="100%" stopColor="#3B82F6" />
                            </linearGradient>
                            <linearGradient id="grad-neutral" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#FACC15" />
                                <stop offset="100%" stopColor="#D97706" />
                            </linearGradient>
                            <linearGradient id="grad-angry" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#FF4D6D" />
                                <stop offset="100%" stopColor="#EF4444" />
                            </linearGradient>
                            <linearGradient id="grad-surprised" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#7C3AED" />
                                <stop offset="100%" stopColor="#4F46E5" />
                            </linearGradient>

                            {/* Inner Shadow mask for 3D look */}
                            <filter id="shadow">
                                <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.5"/>
                            </filter>
                        </defs>

                        {/* 1. Draw Depth Extrusion (Offset circles with darker shade to create 3D base depth) */}
                        {MOOD_STATS.map((stat, i) => {
                            const val = animatedValues[i];
                            const strokeLength = (val / 100) * circ;
                            const strokeOffset = circ - (accumulatedPercent / 100) * circ;
                            accumulatedPercent += stat.value;

                            return (
                                <circle
                                    key={`depth-${stat.name}`}
                                    cx={center}
                                    cy={center + 6} // Shifted down in Y for 3D depth
                                    r={radius}
                                    fill="transparent"
                                    stroke={stat.darkColor}
                                    strokeWidth={strokeWidth}
                                    strokeDasharray={`${strokeLength} ${circ - strokeLength}`}
                                    strokeDashoffset={strokeOffset}
                                    strokeLinecap="round"
                                    style={{ transition: "stroke-dasharray 0.8s ease" }}
                                />
                            );
                        })}

                        {/* Reset accumulated tracker for main top layer */}
                        {(() => { accumulatedPercent = 0; return null; })()}

                        {/* 2. Draw Top Segment Layer (Bright gradients) */}
                        {MOOD_STATS.map((stat, i) => {
                            const val = animatedValues[i];
                            const strokeLength = (val / 100) * circ;
                            const strokeOffset = circ - (accumulatedPercent / 100) * circ;
                            accumulatedPercent += stat.value;

                            return (
                                <circle
                                    key={`top-${stat.name}`}
                                    cx={center}
                                    cy={center}
                                    r={radius}
                                    fill="transparent"
                                    stroke={stat.gradient}
                                    strokeWidth={strokeWidth}
                                    strokeDasharray={`${strokeLength} ${circ - strokeLength}`}
                                    strokeDashoffset={strokeOffset}
                                    strokeLinecap="round"
                                    style={{ transition: "stroke-dasharray 0.8s ease" }}
                                />
                            );
                        })}

                        {/* 3. Draw Specular Gloss Highlight Overlay (glass effect) */}
                        <circle
                            cx={center}
                            cy={center}
                            r={radius}
                            fill="transparent"
                            stroke="rgba(255, 255, 255, 0.12)"
                            strokeWidth={strokeWidth - 10}
                            style={{ pointerEvents: "none" }}
                        />
                    </svg>

                    {/* Center cutout label */}
                    <div style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        textAlign: "center",
                        display: "flex",
                        flexDirection: "column"
                    }}>
                        <span style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>100%</span>
                        <span style={{ fontSize: "10px", color: "var(--text-secondary)", textTransform: "uppercase" }}>Total</span>
                    </div>
                </div>

                {/* Legend list with progress */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {MOOD_STATS.map((stat, i) => (
                        <div key={stat.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "13px" }}>
                            
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <div style={{
                                    width: "8px",
                                    height: "8px",
                                    borderRadius: "50%",
                                    background: stat.color,
                                    boxShadow: `0 0 8px ${stat.color}`
                                }}></div>
                                <span style={{ color: "var(--text-primary)", fontWeight: "500" }}>{stat.name}</span>
                            </div>
                            
                            <span style={{ color: "var(--text-secondary)", fontWeight: "600", transition: "color 0.3s" }}>
                                {animatedValues[i]}%
                            </span>
                        </div>
                    ))}
                </div>

            </div>

        </div>
    );
}
