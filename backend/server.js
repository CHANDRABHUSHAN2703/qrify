// backend/server.js
const express = require('express');
require('dotenv').config();

const app = express();

const cors = require('cors');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const multer = require('multer');
const QRCode = require('qrcode');
const Jimp = require('jimp');
const jsQR = require('jsqr');
const db = require('./db'); 


app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5500',
  credentials: true
}));

app.use(cookieParser());
app.use(bodyParser.json());

// In-memory file upload
const upload = multer({ storage: multer.memoryStorage() });

// Session ID assignment middleware
app.use((req, res, next) => {
  let sid = req.cookies.sessionId;
  if (!sid) {
    sid = Date.now().toString(36) + Math.random().toString(36).substring(2);
    res.cookie('sessionId', sid, { maxAge: 30 * 24 * 60 * 60 * 1000 }); // 30 days
  }
  req.sessionId = sid;
  next();
});

// Generate QR code
app.post('/api/generate', async (req, res) => {
  const { url, color, size } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    const svgString = await QRCode.toString(url, {
      type: 'svg',
      color: { dark: color, light: '#ffffff' }
    });
    const pngDataUrl = await QRCode.toDataURL(url, {
      color: { dark: color, light: '#ffffff' },
      width: size
    });

    await db.execute(
      'INSERT INTO history (session_id, action, input_text, output_text, color, size) VALUES (?, ?, ?, ?, ?, ?)',
      [req.sessionId, 'Generate', url, '', color, size]
    );

    res.json({ png: pngDataUrl, svg: svgString });
  } catch (err) {
    console.error('Error generating QR:', err);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});


app.post('/api/decode', upload.single('qrfile'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const image = await Jimp.read(req.file.buffer);
    const { data, width, height } = image.bitmap;
    const code = jsQR(new Uint8ClampedArray(data), width, height);

    if (!code) return res.status(400).json({ error: 'QR code not found in image' });

    const text = code.data;
    await db.execute(
      'INSERT INTO history (session_id, action, input_text, output_text, color, size) VALUES (?, ?, ?, ?, ?, ?)',
      [req.sessionId, 'Decode', req.file.originalname, text, null, null]
    );

    res.json({ text });
  } catch (err) {
    console.error('Error decoding QR:', err);
    res.status(500).json({ error: 'Failed to decode QR code' });
  }
});

// History fetch
app.get('/api/history', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT action, input_text, output_text, color, size, created_at FROM history WHERE session_id = ? ORDER BY created_at DESC LIMIT 10',
      [req.sessionId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching history:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
