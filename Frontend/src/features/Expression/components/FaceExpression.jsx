import { useEffect, useRef, useState } from "react";
import { detect, init } from "../utils/utils";
import { Smile, Frown, Meh, AlertCircle, Camera } from "lucide-react";
import EmotionSphere from "./EmotionSphere";

const EMOTION_META = {
    happy: { label: "Happy", icon: Smile, color: "#FACC15", shadow: "rgba(250, 204, 21, 0.4)" },
    sad: { label: "Sad", icon: Frown, color: "#00E5FF", shadow: "rgba(0, 229, 255, 0.4)" },
    surprised: { label: "Surprised", icon: Meh, color: "#7C3AED", shadow: "rgba(124, 58, 237, 0.4)" },
    neutral: { label: "Neutral", icon: Meh, color: "var(--text-primary)", shadow: "var(--card-border)" },
    Neutral: { label: "Neutral", icon: Meh, color: "var(--text-primary)", shadow: "var(--card-border)" },
    angry: { label: "Angry", icon: Frown, color: "#FF4D6D", shadow: "rgba(255, 77, 109, 0.4)" }
};

function getMostFrequent(arr) {
    if (arr.length === 0) return { mostFrequent: null, count: 0 };
    const counts = {};
    let maxCount = 0;
    let mostFrequent = arr[0];
    for (const val of arr) {
        counts[val] = (counts[val] || 0) + 1;
        if (counts[val] > maxCount) {
            maxCount = counts[val];
            mostFrequent = val;
        }
    }
    return { mostFrequent, count: maxCount };
}

export default function FaceExpression({ onClick = () => { } }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const landmarkerRef = useRef(null);
    const streamRef = useRef(null);
    const requestRef = useRef(null);
    const lastExpressionRef = useRef("Neutral");
    const historyRef = useRef([]);
    const confirmedConfidenceRef = useRef(100);
    const onClickRef = useRef(onClick);
    const stabilizingEmotionRef = useRef(null);
    const stabilizingStartTimeRef = useRef(0);

    const [isCameraActive, setIsCameraActive] = useState(false);
    const [expression, setExpression] = useState("Neutral");
    const [confidence, setConfidence] = useState(100);
    const [isDetecting, setIsDetecting] = useState(true);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState(null);

    // Keep onClick ref up-to-date to prevent re-running loop effect on recreation
    useEffect(() => {
        onClickRef.current = onClick;
    }, [onClick]);

    // Scan sweep line position
    const scanYRef = useRef(0);
    const scanDirRef = useRef(1);

    // Setup camera stream when active
    useEffect(() => {
        if (!isCameraActive) return;

        let active = true;
        setIsReady(false);
        setError(null);

        async function setup() {
            try {
                await init({ landmarkerRef, videoRef, streamRef });
                if (active) {
                    setIsReady(true);
                }
            } catch (err) {
                console.error("Camera/MediaPipe Init Error:", err);
                if (active) {
                    setError("Failed to open camera or load face detection files. Please allow webcam permissions.");
                }
            }
        }

        setup();

        return () => {
            active = false;
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
            if (landmarkerRef.current) {
                landmarkerRef.current.close();
                landmarkerRef.current = null;
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }
            setIsReady(false);
        };
    }, [isCameraActive]);

    // Frame loops
    useEffect(() => {
        if (!isReady || !isDetecting || !isCameraActive) {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
            // Clear canvas when not detecting
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext("2d");
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            return;
        }

        const loop = () => {
            if (!isDetecting || !isCameraActive) return;

            const result = detect({ landmarkerRef, videoRef });
            const canvas = canvasRef.current;
            const video = videoRef.current;

            if (canvas && video) {
                const ctx = canvas.getContext("2d");
                
                // Align canvas size with video size
                if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                }

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                if (result && result.landmarks && result.landmarks.length > 0) {
                    const { expression: currentExp, confidence: confVal, landmarks } = result;

                    // Push to history
                    const history = historyRef.current;
                    history.push(currentExp);
                    if (history.length > 25) {
                        history.shift(); // keep last 25 frames
                    }

                    // Get most frequent emotion in history
                    const { mostFrequent, count } = getMostFrequent(history);

                    // Only switch and trigger song changes if candidate has a solid majority (>= 15 out of 25 frames)
                    if (mostFrequent && count >= 15) {
                        const normalizedMostFrequent = mostFrequent.toLowerCase();
                        
                        if (normalizedMostFrequent !== lastExpressionRef.current.toLowerCase()) {
                            if (stabilizingEmotionRef.current !== normalizedMostFrequent) {
                                stabilizingEmotionRef.current = normalizedMostFrequent;
                                stabilizingStartTimeRef.current = Date.now();
                            } else {
                                const elapsed = Date.now() - stabilizingStartTimeRef.current;
                                if (elapsed >= 3000) {
                                    lastExpressionRef.current = mostFrequent;
                                    setExpression(mostFrequent);
                                    if (onClickRef.current) {
                                        onClickRef.current(mostFrequent, confirmedConfidenceRef.current);
                                    }
                                    stabilizingEmotionRef.current = null;
                                    stabilizingStartTimeRef.current = 0;
                                }
                            }
                        } else {
                            stabilizingEmotionRef.current = null;
                            stabilizingStartTimeRef.current = 0;
                        }
                    } else {
                        stabilizingEmotionRef.current = null;
                        stabilizingStartTimeRef.current = 0;
                    }

                    // Throttle confidence score updates (only update state when value changes by > 3%)
                    if (Math.abs(confVal - confirmedConfidenceRef.current) > 3) {
                        confirmedConfidenceRef.current = confVal;
                        setConfidence(confVal);
                    }

                    // Calculate face bounding box in video coordinates
                    let minX = 1.0, maxX = 0.0, minY = 1.0, maxY = 0.0;
                    landmarks.forEach(lm => {
                        if (lm.x < minX) minX = lm.x;
                        if (lm.x > maxX) maxX = lm.x;
                        if (lm.y < minY) minY = lm.y;
                        if (lm.y > maxY) maxY = lm.y;
                    });

                    const boxX = minX * video.videoWidth;
                    const boxY = minY * video.videoHeight;
                    const boxW = (maxX - minX) * video.videoWidth;
                    const boxH = (maxY - minY) * video.videoHeight;

                    // Add padding to face crop (auto face zoom)
                    const padX = boxW * 0.35;
                    const padY = boxH * 0.45;
                    const cropX = Math.max(0, boxX - padX);
                    const cropY = Math.max(0, boxY - padY);
                    const cropW = Math.min(video.videoWidth - cropX, boxW + padX * 2);
                    const cropH = Math.min(video.videoHeight - cropY, boxH + padY * 2);

                    // Draw cropped face region on canvas
                    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);

                    // Transform landmarks to canvas coordinates
                    const points = landmarks.map(lm => {
                        const cx = ((lm.x * video.videoWidth) - cropX) / cropW * canvas.width;
                        const cy = ((lm.y * video.videoHeight) - cropY) / cropH * canvas.height;
                        return { x: cx, y: cy };
                    });

                    // Calculate zoomed guide box coordinates
                    const canvasBoxX = (boxX - cropX) / cropW * canvas.width;
                    const canvasBoxY = (boxY - cropY) / cropH * canvas.height;
                    const canvasBoxW = boxW / cropW * canvas.width;
                    const canvasBoxH = boxH / cropH * canvas.height;

                    // Draw mesh & corner guides
                    drawFaceMesh(ctx, points, canvas.width, canvas.height, currentExp, canvasBoxX, canvasBoxY, canvasBoxW, canvasBoxH);
                } else {
                    // No face detected, draw full video frame with scanning target overlay
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    drawScanningTarget(ctx, canvas.width, canvas.height);
                }

                // Draw scan sweep line
                drawScanLine(ctx, canvas.width, canvas.height);
            }

            requestRef.current = requestAnimationFrame(loop);
        };

        requestRef.current = requestAnimationFrame(loop);

        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [isReady, isDetecting, isCameraActive]);

    function drawScanningTarget(ctx, width, height) {
        ctx.strokeStyle = "rgba(124, 58, 237, 0.4)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);

        const cx = width / 2;
        const cy = height / 2;
        const r = Math.min(width, height) * 0.3;

        // Draw circle
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.stroke();

        ctx.setLineDash([]); // Reset line dash

        // Draw center guide text
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.font = "bold 13px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.shadowBlur = 4;
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.fillText("POSITION FACE IN SCANNER", cx, cy + r + 24);
        
        ctx.shadowBlur = 0; // Reset shadow
    }

    // Draw connection loops using canvas-mapped coordinates
    function drawFaceMesh(ctx, points, width, height, currentExp, bx, by, bw, bh) {
        const meta = EMOTION_META[currentExp.toLowerCase()] || EMOTION_META.neutral;
        const color = meta.color;

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;

        // Draw neon box corners
        const len = Math.min(bw, bh) * 0.2;
        
        // Top Left
        ctx.beginPath();
        ctx.moveTo(bx + len, by);
        ctx.lineTo(bx, by);
        ctx.lineTo(bx, by + len);
        ctx.stroke();

        // Top Right
        ctx.beginPath();
        ctx.moveTo(bx + bw - len, by);
        ctx.lineTo(bx + bw, by);
        ctx.lineTo(bx + bw, by + len);
        ctx.stroke();

        // Bottom Left
        ctx.beginPath();
        ctx.moveTo(bx, by + bh - len);
        ctx.lineTo(bx, by + bh);
        ctx.lineTo(bx + len, by + bh);
        ctx.stroke();

        // Bottom Right
        ctx.beginPath();
        ctx.moveTo(bx + bw - len, by + bh);
        ctx.lineTo(bx + bw, by + bh);
        ctx.lineTo(bx + bw, by + bh - len);
        ctx.stroke();
    }

    function drawScanLine(ctx, width, height) {
        // Increment scan position
        let y = scanYRef.current;
        y += 3 * scanDirRef.current;
        if (y > height) {
            y = height;
            scanDirRef.current = -1;
        } else if (y < 0) {
            y = 0;
            scanDirRef.current = 1;
        }
        scanYRef.current = y;

        // Draw laser scanning line
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        
        const grad = ctx.createLinearGradient(0, y - 4, 0, y + 4);
        grad.addColorStop(0, "rgba(124, 58, 237, 0)");
        grad.addColorStop(0.5, "rgba(124, 58, 237, 0.85)");
        grad.addColorStop(1, "rgba(124, 58, 237, 0)");

        ctx.strokeStyle = grad;
        ctx.lineWidth = 4;
        ctx.shadowColor = "#7C3AED";
        ctx.shadowBlur = 12;
        ctx.stroke();
    }

    const currentMeta = EMOTION_META[expression.toLowerCase()] || EMOTION_META.neutral;
    const EmotionIcon = currentMeta.icon;

    return (
        <div className="glass-panel glow-purple" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px", width: "100%", height: "100%" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: isReady && isDetecting ? "#10B981" : "#EF4444", boxShadow: isReady && isDetecting ? "0 0 10px #10B981" : "none" }}></div>
                    <h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", letterSpacing: "0.5px" }}>Live Camera</h3>
                </div>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "4px" }}><Camera size={14} /> AI Face Crop</span>
            </div>

            {error ? (
                <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "12px", padding: "20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", flex: 1, justifyContent: "center" }}>
                    <AlertCircle color="#EF4444" size={36} />
                    <p style={{ color: "#EF4444", fontSize: "14px" }}>{error}</p>
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "20px", flex: 1, minHeight: 0 }}>
                    
                    {/* Camera Scanner Column */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px", height: "100%" }}>
                        
                        {/* Camera view container */}
                        <div style={{ position: "relative", borderRadius: "12px", overflow: "hidden", background: "#000", border: "1px solid var(--card-border)", display: "flex", alignItems: "center", justifyContent: "center", flex: 1, minHeight: "260px" }}>
                            {!isCameraActive ? (
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", padding: "24px", textAlign: "center", zIndex: 10 }}>
                                    <div style={{
                                        width: "56px",
                                        height: "56px",
                                        borderRadius: "50%",
                                        background: "rgba(124, 58, 237, 0.1)",
                                        border: "1px solid rgba(124, 58, 237, 0.2)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "var(--primary)",
                                        boxShadow: "0 0 15px rgba(124, 58, 237, 0.2)"
                                    }}>
                                        <Camera size={24} />
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: "600" }}>Webcam is Offline</h4>
                                        <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px", maxWidth: "250px", lineHeight: "1.4" }}>
                                            Enable your camera to analyze facial expressions and recommend music dynamically.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setIsCameraActive(true)}
                                        style={{
                                            background: "linear-gradient(135deg, var(--primary) 0%, #A78BFA 100%)",
                                            border: "none",
                                            color: "#FFF",
                                            padding: "8px 24px",
                                            borderRadius: "30px",
                                            fontSize: "13px",
                                            fontWeight: "600",
                                            cursor: "pointer",
                                            boxShadow: "0 4px 15px var(--primary-glow)",
                                            transition: "all 0.2s"
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = "none"}
                                    >
                                        Open Camera
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {!isReady && (
                                        <div style={{ position: "absolute", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                                            <div style={{ border: "4px solid rgba(255, 255, 255, 0.1)", borderLeftColor: "var(--primary)", width: "36px", height: "36px", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                                            <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Initializing camera...</span>
                                        </div>
                                    )}
                                    {/* Video is hidden, drawing raw input to canvas instead */}
                                    <video
                                        ref={videoRef}
                                        style={{ position: "absolute", width: "1px", height: "1px", opacity: 0, pointerEvents: "none" }}
                                        playsInline
                                        muted
                                    />
                                    <canvas
                                        ref={canvasRef}
                                        style={{ width: "100%", height: "100%", minHeight: "260px", transform: "scaleX(-1)", zIndex: 5, background: "#000" }}
                                    />
                                </>
                            )}
                        </div>

                        {/* Controls below camera feed */}
                        {isCameraActive && isReady && (
                            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                                <button 
                                    onClick={() => setIsDetecting(!isDetecting)}
                                    style={{
                                        background: "var(--card-bg)",
                                        border: "1px solid var(--card-border)",
                                        backdropFilter: "blur(8px)",
                                        color: "var(--text-primary)",
                                        padding: "8px 20px",
                                        borderRadius: "30px",
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        transition: "all 0.2s ease",
                                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)"
                                    }}
                                >
                                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: isDetecting ? "#EF4444" : "#10B981" }} />
                                    {isDetecting ? "Stop Detection" : "Start Detection"}
                                </button>
                                <button 
                                    onClick={() => setIsCameraActive(false)}
                                    style={{
                                        background: "rgba(239, 68, 68, 0.2)",
                                        border: "1px solid rgba(239, 68, 68, 0.4)",
                                        backdropFilter: "blur(8px)",
                                        color: "#FFF",
                                        padding: "8px 20px",
                                        borderRadius: "30px",
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                                        transition: "all 0.2s"
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.3)"}
                                    onMouseLeave={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)"}
                                >
                                    Close Camera
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Emotion Details box */}
                    <div className="glass-panel" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "20px", textAlign: "center" }}>
                        <span style={{ fontSize: "12px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "16px" }}>Emotion Detected</span>
                        
                        <div style={{ position: "relative", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <div style={{
                                position: "absolute",
                                width: "90px",
                                height: "90px",
                                borderRadius: "50%",
                                background: currentMeta.shadow,
                                filter: "blur(20px)",
                                zIndex: 1
                            }}></div>
                            <div style={{
                                width: "70px",
                                height: "70px",
                                borderRadius: "50%",
                                border: `2px solid ${currentMeta.color}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                zIndex: 2,
                                background: "var(--bg-dark)",
                                boxShadow: `0 0 15px ${currentMeta.shadow}`,
                                overflow: "hidden"
                            }}>
                                <EmotionSphere emotion={expression} />
                            </div>
                        </div>

                        <h2 style={{ fontSize: "28px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "20px", textTransform: "capitalize" }}>{currentMeta.label}</h2>
                        
                        <div style={{ width: "100%", padding: "0 10px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                                <span>Confidence</span>
                                <span style={{ color: currentMeta.color, fontWeight: "600" }}>{confidence}%</span>
                            </div>
                            <div style={{ width: "100%", height: "6px", background: "var(--card-border)", borderRadius: "10px", overflow: "hidden" }}>
                                <div style={{
                                    width: `${confidence}%`,
                                    height: "100%",
                                    background: `linear-gradient(90deg, var(--primary) 0%, ${currentMeta.color} 100%)`,
                                    borderRadius: "10px",
                                    transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                                }}></div>
                            </div>
                        </div>
                    </div>

                </div>
            )}
            
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}