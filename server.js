require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const port = process.env.PORT || 3001;

// --- CONFIGURACIÓN MONGODB ---
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_CLUSTER}/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let dbClient;

async function connectDB() {
    if (dbClient) return dbClient;
    try {
        await client.connect();
        console.log("Successfully connected to MongoDB!");
        dbClient = client;
        return dbClient;
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1);
    }
}

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// --- RUTAS ---
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/api/stats', async (req, res) => {
    try {
        const dbClient = await connectDB();
        const db = dbClient.db("psicosofiaDB");
        const collection = db.collection("psicosofia");
        const stats = await collection.findOne({ type: "server_stats" });
        res.status(200).json(stats || {});
    } catch (error) {
        console.error("Error fetching stats:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post('/api/update-stats', async (req, res) => {
    try {
        const { guildName, totalMembers, humanCount, botCount, onlineHumans, boostLevel, boostCount } = req.body;
        const dbClient = await connectDB();
        const db = dbClient.db("psicosofiaDB");
        const collection = db.collection("psicosofia");

        const result = await collection.updateOne(
            { type: "server_stats" },
            {
                $set: {
                    serverName: guildName || "Unknown Server",
                    totalMembers: totalMembers || 0,
                    totalHumans: humanCount || 0,
                    totalBots: botCount || 0,
                    onlineHumans: onlineHumans || 0,
                    boostLevel: boostLevel || 0,
                    boostCount: boostCount || 0,
                    lastUpdate: new Date()
                }
            },
            { upsert: true }
        );
        res.status(200).json({ message: "Stats updated successfully", result });
    } catch (error) {
        console.error("Error updating stats:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// --- INICIO DEL SERVIDOR ---
app.listen(port, async () => {
    console.log(`Server running at http://localhost:${port}`);
    try {
        const { default: open } = await import('open');
        await open(`http://localhost:${port}`);
    } catch (e) {
        console.log("No se pudo abrir el navegador automáticamente.");
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});
