const Watcher = require('./models').Watcher;
const {
    WatcherUseThisRoomError,
    WatcherUseAnotherRoomError
} = require('./managers');

function setupEvents(io, socket, roomManager) {

    socket.on('user join room', (req) => {
        let user = req.user;
        let room = req.room;

        let watcher = new Watcher(socket.id, user.name);

        try {
            roomManager.addWatcher(watcher, room.name);

            socket.join(room.name);

            socket.emit('you joined to room', {
                user: {
                    id: watcher.getId(),
                    name: watcher.getName()
                },
                room: {
                    name: roomManager.findWatcherRoom(watcher).getName()
                }
            });

            socket.to(room.name).emit('user joined to room', {
                user: {
                    id: watcher.getId(),
                    name: watcher.getName()
                }
            });
        } catch (e) {
            if (e instanceof WatcherUseThisRoomError) {
                socket.emit('you re-connected to room', {
                    user: {
                        id: watcher.getId(),
                        name: watcher.getName()
                    },
                    room: {
                        name: roomManager.findWatcherRoom(watcher).getName()
                    }
                });

                socket.join(room.name);

                socket.to(room.name).emit('user re-connected to room', {
                    user: {
                        id: watcher.getId(),
                        name: watcher.getName()
                    }
                });
            } else if (e instanceof WatcherUseAnotherRoomError) {
                let previousRoom = roomManager.findWatcherRoom(watcher);

                socket.leave(previousRoom.getName());

                socket.to(previousRoom.name).emit('user left room', {
                    user: {
                        id: watcher.getId(),
                        name: watcher.getName()
                    }
                });

                socket.join(room.name);

                socket.emit('you joined to room', {
                    user: {
                        id: watcher.getId(),
                        name: watcher.getName()
                    },
                    room: {
                        name: roomManager.findWatcherRoom(watcher).getName()
                    }
                });

                socket.to(room.name).emit('user joined to room', {
                    user: {
                        id: watcher.getId(),
                        name: watcher.getName()
                    }
                });
            } else {
                console.error(e);
            }
        }
    });

    socket.on('user leave room', (req) => {
        let user = req.user;

        let watcher = new Watcher(socket.id, user.name);

        roomManager.removeWatcher(watcher);

        socket.emit('you left room', {});
        // TODO: Implement group emit
        socket.to('').emit('user left room', {});
    });

    socket.on('user updates file information', (req) => {

    });

    socket.on('user change play state to play', (req) => {

    });

    socket.on('user change play state to pause', (req) => {

    });

    socket.on('user change play state to stop', (req) => {

    });

}

module.exports = (io, roomManager) => {

    io.on('connection', (socket) => {
        setupEvents(io, socket, roomManager);
    });

};