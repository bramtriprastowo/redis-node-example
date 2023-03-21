const express = require("express")
const axios = require("axios")
const cors = require("cors")
require("dotenv").config()
const { createClient } = require("redis")

const app = express()
app.use(cors())

const client = createClient();
const DEFAULT_EXPIRATION = 3600;

client.on('error', err => console.log('Redis Client Error', err));
client.connect();

app.get("/photos", async (req, res) => {
    try {
        const { albumId } = req.query;
        const redisAlbumId = albumId ? albumId : "none";
        const photos = await getOrSetCache(`photos:${redisAlbumId}`, async () => {
            const { data } = await axios.get(`${process.env.BASE_URL}/photos`,
                { params: { albumId } }
            );
            return data
        })
        return res.status(200).json(photos);
    } catch (error) {
        console.error(error);
        return res.status(500).json(error);
    }
})

app.get("/photos/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const photo = await getOrSetCache(`photo:${id}`, async () => {
            const { data } = await axios.get(`${process.env.BASE_URL}/photos/${id}`);
            return data
        })
        return res.status(200).json(photo); 
    } catch (error) {
        console.error(error);
        return res.status(500).json(error);
    }
})

const getOrSetCache = async (key, callback) => {
    const existingData = await client.get(key)
    if (existingData) {
        return JSON.parse(existingData);
    }
    const newData = await callback();
    client.setEx(key, DEFAULT_EXPIRATION, JSON.stringify(newData));
    return newData;
}

app.listen(3000, () => {
    console.log("Connected at http://localhost:3000")
})