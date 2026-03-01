const socketIo = require('socket.io');

let io;

exports.init = (server) => {
    io = socketIo(server, {
        cors: {
            origin: '*', // Allow all origins for development
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });

        socket.on('subscribe', (ticker) => {
            console.log(`Client ${socket.id} subscribed to ${ticker}`);
            socket.join(ticker);
        });

        socket.on('unsubscribe', (ticker) => {
            console.log(`Client ${socket.id} unsubscribed from ${ticker}`);
            socket.leave(ticker);
        });
    });

    return io;
};

exports.getIo = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};
