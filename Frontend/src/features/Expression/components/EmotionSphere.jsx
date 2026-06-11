import React, { useRef, useState, useEffect, Component } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, Sphere } from "@react-three/drei";

const EMOTION_COLORS = {
    happy: { color: "#FACC15", shadow: "rgba(250, 204, 21, 0.5)" },
    sad: { color: "#00E5FF", shadow: "rgba(0, 229, 255, 0.5)" },
    neutral: { color: "#E5E7EB", shadow: "rgba(229, 231, 235, 0.3)" },
    surprised: { color: "#7C3AED", shadow: "rgba(124, 58, 237, 0.5)" },
    angry: { color: "#FF4D6D", shadow: "rgba(255, 77, 109, 0.5)" }
};

// 3D Sphere Mesh using React Three Fiber
function ThreeSphere({ color }) {
    const meshRef = useRef();
    
    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        if (meshRef.current) {
            meshRef.current.rotation.x = time * 0.3;
            meshRef.current.rotation.y = time * 0.4;
            meshRef.current.position.y = Math.sin(time * 1.5) * 0.1;
        }
    });

    return (
        <Sphere ref={meshRef} args={[1.3, 64, 64]} scale={1.0}>
            <MeshDistortMaterial
                color={color}
                distort={0.3}
                speed={2.5}
                roughness={0.2}
                metalness={0.15}
                clearcoat={1}
                clearcoatRoughness={0.1}
            />
        </Sphere>
    );
}

// Error Boundary to handle WebGL missing environments gracefully
class WebGLErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.warn("WebGL not supported. Falling back to CSS Glass Sphere.", error);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback;
        }
        return this.props.children;
    }
}

// High-fidelity CSS Glass Sphere Fallback
function CssSphere({ color, shadow }) {
    return (
        <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: `radial-gradient(circle at 30% 30%, #fff 0%, ${color} 45%, #000 100%)`,
            boxShadow: `0 0 25px ${shadow}, inset -6px -6px 15px rgba(0,0,0,0.6), inset 6px 6px 15px rgba(255,255,255,0.4)`,
            animation: "pulseFloat 4s ease-in-out infinite",
            border: "1px solid rgba(255, 255, 255, 0.12)"
        }}>
            <style>{`
                @keyframes pulseFloat {
                    0% { transform: translateY(0px) scale(1); }
                    50% { transform: translateY(-5px) scale(1.04); }
                    100% { transform: translateY(0px) scale(1); }
                }
            `}</style>
        </div>
    );
}

export default function EmotionSphere({ emotion = "neutral" }) {
    const key = emotion.toLowerCase();
    const meta = EMOTION_COLORS[key] || EMOTION_COLORS.neutral;

    const fallback = <CssSphere color={meta.color} shadow={meta.shadow} />;

    return (
        <div style={{ width: "70px", height: "70px", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <WebGLErrorBoundary fallback={fallback}>
                <div style={{ width: "95px", height: "95px", position: "absolute", zIndex: 5 }}>
                    <Canvas camera={{ position: [0, 0, 3], fov: 60 }} gl={{ antialias: true, alpha: true }}>
                        <ambientLight intensity={0.6} />
                        <directionalLight position={[5, 5, 2]} intensity={1.5} />
                        <pointLight position={[-5, -5, -2]} intensity={0.5} />
                        <ThreeSphere color={meta.color} />
                    </Canvas>
                </div>
            </WebGLErrorBoundary>
        </div>
    );
}
