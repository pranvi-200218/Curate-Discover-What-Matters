require('dotenv').config();

const express = require('express');
const cors = require('cors');

// fetch fix (important)
const fetch = (...args) =>
    import ('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();

app.use(cors());

// test route
app.get('/', (req, res) => {
    res.send('Backend running 🚀');
});


app.get('/youtube', async(req, res) => {
    const q = req.query.q;

    if (!q) return res.status(400).json({ error: 'Query required' });

    try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=10&key=${process.env.YT_API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));