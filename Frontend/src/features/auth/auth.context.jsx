import { createContext, useState, useEffect } from "react";
import { getMe } from "./services/auth.api";

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {

    const [ user, setUser ] = useState(null)
    const [ loading, setLoading ] = useState(true)

    useEffect(() => {
        async function fetchMe() {
            try {
                const data = await getMe();
                setUser(data.user);
            } catch (err) {
                console.error("Initial auth fetch error:", err);
                setUser(null);
            } finally {
                setLoading(false);
            }
        }
        fetchMe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, setUser, loading, setLoading }} >
            {children}
        </AuthContext.Provider>
    )

}