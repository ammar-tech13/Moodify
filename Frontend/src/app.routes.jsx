import { createBrowserRouter, Navigate } from "react-router"
import Register from "./features/auth/pages/Register"
import Login from "./features/auth/pages/Login"
import Protected from "./features/auth/components/Protected"
import Home from "./features/home/pages/Home"

export const router = createBrowserRouter([
    {
        path: "/",
        element: <Navigate to="/dashboard" replace />
    },
    {
        path: "/dashboard",
        element: <Protected><Home activeTab="Home" /></Protected>
    },
    {
        path: "/camera",
        element: <Protected><Home activeTab="Camera" /></Protected>
    },
    {
        path: "/music-library",
        element: <Protected><Home activeTab="Music Library" /></Protected>
    },
    {
        path: "/playlists",
        element: <Protected><Home activeTab="Playlists" /></Protected>
    },
    {
        path: "/mood-history",
        element: <Protected><Home activeTab="Mood History" /></Protected>
    },
    {
        path: "/favorites",
        element: <Protected><Home activeTab="Favorites" /></Protected>
    },
    {
        path: "/settings",
        element: <Protected><Home activeTab="Settings" /></Protected>
    },
    {
        path: "/register",
        element: <Register />
    },
    {
        path: "/login",
        element: <Login />
    }
])