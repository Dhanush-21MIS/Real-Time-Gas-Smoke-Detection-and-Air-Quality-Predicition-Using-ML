const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const twilio = require('twilio'); // ✅ Added Twilio

const app = express();
const PORT = 5000;

// ===== Middleware =====
app.use(express.json());
app.use(cors());

// ===== Twilio Setup =====


// ===== Connect to MongoDB =====
const mongoURI = "mongodb+srv://dhanush:dhanush@cluster0.veks4zw.mongodb.net/myDatabase?retryWrites=true&w=majority";

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.log('❌ MongoDB connection error:', err));

// ===== Schema =====
const sensorSchema = new mongoose.Schema({
    temperature: Number,
    humidity: Number,
    mq135: { type: Number, default: null },
    mq2: { type: Number, default: null },
    timestamp: { type: String, required: true }
});

const SensorData = mongoose.model('SensorData', sensorSchema);

// ===== Routes =====

// Test Server
app.get('/', (req, res) => {
    res.send('Server is running 🚀');
});

// ✅ Save sensor data + Send SMS Alert
app.post('/api/sensor', async (req, res) => {
    try {
        let { mq135, mq2, temperature, humidity, timestamp } = req.body;

        if (mq135 === 0) mq135 = null;

        const data = new SensorData({ mq135, mq2, temperature, humidity, timestamp });
        const saved = await data.save();

        // 🚨 ALERT CONDITIONS
        const GAS_DANGER = 50;   // MQ2 gas threshold
        const AIR_DANGER = 30;   // MQ135 air quality threshold

        if (mq2 > GAS_DANGER || mq135 > AIR_DANGER) {
            const message = `⚠️ EMERGENCY ALERT!
Gas Level (MQ2): ${mq2} ppm
Air Quality (MQ135): ${mq135} ppm
Time: ${timestamp}
Immediate Action Required!`;

            // ✅ Send SMS
            client.messages
                .create({
                    body: message,
                    from: TWILIO_PHONE,
                    to: ALERT_PHONE
                })
                .then(() => console.log("📲 SMS Alert Sent"))
                .catch(err => console.log("❌ SMS Error:", err.message));
        }

        res.status(201).json(saved);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ Get ALL sensor data (Newest First)
app.get('/api/sensor', async (req, res) => {
    try {
        const all = await SensorData.find().sort({ _id: -1 });
        res.json(all);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ Get the Latest sensor record
app.get('/api/sensor/latest', async (req, res) => {
    try {
        const latest = await SensorData.findOne().sort({ _id: -1 });
        if (!latest) return res.status(404).json({ error: "No data found" });
        res.json(latest);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ List Available Dates for History
app.get('/api/dates', async (req, res) => {
    try {
        const dates = await SensorData.aggregate([
            {
                $project: {
                    dateOnly: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: { $toDate: "$timestamp" }
                        }
                    }
                }
            },
            { $group: { _id: "$dateOnly" } },
            { $sort: { _id: 1 } }
        ]);

        res.json(dates.map(d => d._id));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ Hourly Averages for History Page
app.get('/api/history/:date', async (req, res) => {
    try {
        const { date } = req.params;

        const result = await SensorData.aggregate([
            {
                $match: {
                    timestamp: { $regex: `^${date}` }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d %H:00:00",
                            date: { $toDate: "$timestamp" }
                        }
                    },
                    temperature: { $avg: "$temperature" },
                    humidity: { $avg: "$humidity" },
                    mq135: { $avg: "$mq135" },
                    mq2: { $avg: "$mq2" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json(result);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== Start Server =====
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});

// http://localhost:5000/api/sensor/latest
// http://localhost:5000/api/sensor
// http://localhost:5000/api/history/:date