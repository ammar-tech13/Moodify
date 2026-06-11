import { login, register, getMe, logout, loginWithGoogle } from "../services/auth.api";
import { useContext } from "react";
import { AuthContext } from "../auth.context";
import { useEffect } from "react";


export const useAuth = () => {
    const context = useContext(AuthContext)
    const { user, setUser, loading, setLoading } = context

    async function handleRegister({ username, email, password }) {
        try {
            setLoading(true)
            const data = await register({ username, email, password })
            setUser(data.user)
        } catch (err) {
            console.error("Registration error:", err)
        } finally {
            setLoading(false)
        }
        
    }

    async function handleLogin({ username, email, password }) {
        try {
            setLoading(true)
            const data = await login({ username, email, password })
            setUser(data.user)
        } catch (err) {
            console.error("Login error:", err)
        } finally {
            setLoading(false)
        }
    }

    async function handleGetMe() {
        try {
            setLoading(true)
            const data = await getMe()
            setUser(data.user)
        } catch (err) {
            console.error("GetMe error:", err)
            setUser(null)
        } finally {
            setLoading(false)
        }
    }

    async function handleLogout() {
        try {
            setLoading(true)
            const data = await logout()
            setUser(null)
        } catch (err) {
            console.error("Logout error:", err)
        } finally {
            setLoading(false)
        }
    }

    async function handleGoogleLogin({ email, displayName, photoURL, uid }) {
        try {
            setLoading(true)
            const data = await loginWithGoogle({ email, displayName, photoURL, uid })
            setUser(data.user)
            return data.user
        } catch (err) {
            console.error("Google login hook error:", err)
            throw err
        } finally {
            setLoading(false)
        }
    }

    return ({
        user, loading, handleRegister, handleLogin, handleLogout, handleGetMe, handleGoogleLogin
    })
}