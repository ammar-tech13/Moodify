const fs = require("fs");
const path = require("path");
const songModel = require("../models/song.model");
const storageService = require("../services/storage.service");
const id3 = require("node-id3");

async function saveSongToDB({ songBuffer, originalname, mood }) {
    const tags = id3.read(songBuffer);

    const cleanFileName = originalname.replace(".mp3", "");
    const title = tags.title || cleanFileName;

    const songFile = await storageService.uploadFile({
        buffer: songBuffer,
        filename: title + ".mp3",
        folder: "/cohort-2/moodify/songs"
    });

    let posterUrl = "https://via.placeholder.com/300x300.png?text=Music";

    if (tags.image && tags.image.imageBuffer) {
        const posterFile = await storageService.uploadFile({
            buffer: tags.image.imageBuffer,
            filename: title + ".jpeg",
            folder: "/cohort-2/moodify/posters"
        });

        posterUrl = posterFile.url;
    }

    const song = await songModel.create({
        title,
        url: songFile.url,
        posterUrl,
        mood
    });

    return song;
}

async function uploadSong(req, res) {
    try {
        const songBuffer = req.file.buffer;
        const { mood } = req.body;

        const song = await saveSongToDB({
            songBuffer,
            originalname: req.file.originalname,
            mood
        });

        res.status(201).json({
            message: "song created successfully",
            song
        });
    } catch (error) {
        console.error("Upload song error:", error);
        res.status(500).json({
            message: "Failed to upload song",
            error: error.message
        });
    }
}

async function bulkUploadSongs(req, res) {
    try {
        const moods = ["happy", "sad", "neutral"];
        const uploadedSongs = [];
        const failedSongs = [];

        for (const mood of moods) {
            const folderPath = path.join(process.cwd(), "uploads", mood);

            if (!fs.existsSync(folderPath)) {
                console.log(`Folder not found: ${folderPath}`);
                continue;
            }

            const files = fs
                .readdirSync(folderPath)
                .filter((file) => file.toLowerCase().endsWith(".mp3"));

            for (const file of files) {
                try {
                    const filePath = path.join(folderPath, file);
                    const songBuffer = fs.readFileSync(filePath);

                    const cleanTitle = file.replace(".mp3", "");

                    const alreadyExists = await songModel.findOne({
                        title: cleanTitle,
                        mood
                    });

                    if (alreadyExists) {
                        console.log(`Skipped duplicate: ${file}`);
                        continue;
                    }

                    const song = await saveSongToDB({
                        songBuffer,
                        originalname: file,
                        mood
                    });

                    uploadedSongs.push(song);
                    console.log(`Uploaded: ${file} as ${mood}`);
                } catch (error) {
                    failedSongs.push({
                        file,
                        mood,
                        error: error.message
                    });

                    console.error(`Failed: ${file}`, error.message);
                }
            }
        }

        res.status(201).json({
            message: "Bulk upload completed",
            uploadedCount: uploadedSongs.length,
            failedCount: failedSongs.length,
            uploadedSongs,
            failedSongs
        });
    } catch (error) {
        console.error("Bulk upload error:", error);

        res.status(500).json({
            message: "Bulk upload failed",
            error: error.message
        });
    }
}

async function getSong(req, res) {
    try {
        const { mood } = req.query;

        const songs = await songModel.aggregate([
            { $match: { mood } },
            { $sample: { size: 1 } }
        ]);

        const song = songs[0] || null;

        res.status(200).json({
            message: "song fetched successfully.",
            song
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch song",
            error: error.message
        });
    }
}

async function getSongsByMood(req, res) {
    try {
        const { mood } = req.query;

        const songs = await songModel.find({ mood });

        res.status(200).json({
            message: "songs fetched successfully",
            count: songs.length,
            songs
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch songs",
            error: error.message
        });
    }
}

module.exports = {
    uploadSong,
    getSong,
    bulkUploadSongs,
    getSongsByMood
};