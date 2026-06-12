import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import { errorHandler } from './middleware/error';
import authRoutes from './routes/auth';
import styleRoutes from './routes/style';
import workRoutes from './routes/work';
import messageRoutes from './routes/message';
import adminRoutes from './routes/admin';
import uploadRoutes from './routes/upload';
import settingsRoutes from './routes/settings';
import commentRoutes from './routes/comment';
import collectionRoutes from './routes/collection';
import friendLinkRoutes from './routes/friendLink';
import bannerRoutes from './routes/banner';
import announcementRoutes from './routes/announcement';
import userRoutes from './routes/user';
import { startScheduledPublisher, stopScheduledPublisher } from './scheduler/scheduledPublisher';
import { startRecycleBinCleaner, stopRecycleBinCleaner } from './scheduler/recycleBinCleaner';

dotenv.config();

const app = express();
const port = process.env.PORT || 8063;

app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/styles', styleRoutes);
app.use('/api/works', workRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/friend-links', friendLinkRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
    res.send('API is running successfully!');
});

// Global error handler
app.use(errorHandler as express.ErrorRequestHandler);

const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    startScheduledPublisher();
    startRecycleBinCleaner();
});

const gracefulShutdown = (signal: string) => {
    console.log(`${signal} received, shutting down gracefully...`);
    stopScheduledPublisher();
    stopRecycleBinCleaner();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
    setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
