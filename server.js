require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const { Resend } = require('resend');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || '*'
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const resend = new Resend(process.env.RESEND_API_KEY);

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.get('/api/health', (req, res) => {
  res.status(200).send('API is working');
});

app.post('/api/contact', async (req, res) => {
  const { email, message } = req.body;

  if (!email || !message) {
    return res.status(400).json({ error: 'Email and message are required.' });
  }

  const sql = 'INSERT INTO contact_messages (email, message) VALUES (?, ?)';
  
  db.query(sql, [email, message], async (err, result) => {
    if (err) {
      console.error('Database Error:', err);
      return res.status(500).json({ error: 'Failed to save message in database.' });
    }

    try {
      await resend.emails.send({
        from: 'Contact Form <onboarding@resend.dev>',
        to: process.env.NOTIFICATION_EMAIL,
        subject: 'New DsBRIDGE Contact Form Submission',
        html: `
          <h3>New Message Received from DsBRIDGE Website</h3>
          <p><strong>Sender Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
        `
      });

      return res.status(201).json({
        success: true,
        message: 'Saved to database and email sent!'
      });
    } catch (emailErr) {
      console.error('Email Error:', emailErr);
      return res.status(201).json({
        success: true,
        message: 'Saved to database, but email notification failed.'
      });
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server running on port ${PORT}');
});