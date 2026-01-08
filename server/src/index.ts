import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import chatRoutes from './routes/chatRoutes';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());

app.use('/api', chatRoutes);

app.get('/', (req, res) => {
    res.send('Chatbot Server is running');
});

import { initDb } from './db';

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
    initDb();
    // Keep the process alive explicitly if needed (debug)
    setInterval(() => { }, 1000 * 60 * 60);
});
