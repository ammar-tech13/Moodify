import React from 'react'
import { useAuth } from '../hooks/useAuth'
import { Navigate, useNavigate } from 'react-router'
import { useEffect } from 'react'

const Protected = ({ children }) => {

    const {
        user, loading
    } = useAuth()
    const navigate = useNavigate()

    if (loading) {
        return (
            <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: "100vw",
                height: "100vh",
                backgroundColor: "#0B1026",
                color: "#FFFFFF",
                position: "fixed",
                top: 0,
                left: 0,
                zIndex: 9999
            }}>
                <div style={{
                    width: "48px",
                    height: "48px",
                    border: "3px solid rgba(124, 58, 237, 0.2)",
                    borderTop: "3px solid #7C3AED",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    marginBottom: "16px",
                    boxShadow: "0 0 15px rgba(124, 58, 237, 0.5)"
                }} />
                <span style={{ fontSize: "13px", color: "#9CA3AF", letterSpacing: "1.5px", fontWeight: "600" }}>TUNING FREQUENCIES...</span>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }
    
    if (!user) {
        return <Navigate to="/login" />
    }

    return children
}

export default Protected