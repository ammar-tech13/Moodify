import { createContext } from "react";
import { useState } from "react";

export const SongContext = createContext();

export const SongContextProvider = ({ children }) => {
 const [song, setSong] = useState({
  id: "6a282224ca6113bc72cfbb2b",
  title: "Telisiney Na Nuvvey :: SenSongsMp3.Co",
  artist: "Moodify AI",
  mood: "sad",
  url: "https://ik.imagekit.io/ammar123/cohort-2/moodify/songs/Telisiney_Na_Nuvvey____SenSongsMp3.Co_kjc5H-9SH.mp3",
  posterUrl: "https://ik.imagekit.io/ammar123/cohort-2/moodify/posters/Telisiney_Na_Nuvvey____SenSongsMp3.Co_PMnj1Dfeh.jpeg",
  duration: "3:30"
});

  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [playlist, setPlaylist] = useState([]);

  const toggleFavorite = (track) => {
    if (!track) return;

    setFavorites((prev) => {
      const exists = prev.find(
        (t) => t.title.toLowerCase() === track.title.toLowerCase()
      );

      if (exists) {
        return prev.filter(
          (t) => t.title.toLowerCase() !== track.title.toLowerCase()
        );
      } else {
        return [...prev, track];
      }
    });
  };

  return (
    <SongContext.Provider
      value={{
        loading,
        setLoading,
        song,
        setSong,
        favorites,
        toggleFavorite,
        playlist,
        setPlaylist,
      }}
    >
      {children}
    </SongContext.Provider>
  );
};