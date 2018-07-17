const Watcher = require('./models').Watcher;
const File = require('./models').File;
const {
    WatcherUseThisRoomError,
    WatcherUseAnotherRoomError
} = require('./managers');

function setupEvents(io, socket, roomManager) {

    socket.on('user join room', (req) => {
        let user = req.user;
        let room = req.room;

        let file = new File(req.file.name, req.file.size);
        let watcher = new Watcher(socket.id, user.name, file);

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
                },
                file: {
                    name: file.name,
                    size: file.size
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
                    },
                    file: {
                        name: file.name,
                        size: file.size
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

                roomManager.moveWatcher(watcher, previousRoom.name);

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
                    },
                    file: {
                        name: file.name,
                        size: file.size
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
        let watcher = roomManager.findWatcherById(socket.id);
        if (!watcher) {
            return;
        }

        let room = roomManager.findWatcherRoom(watcher);

        roomManager.removeWatcher(watcher);

        socket.leave(room.getName());

        socket.emit('you left room', {});

        socket.to(room.getName()).emit('user left room', {
            user: {
                id: watcher.getId(),
                name: watcher.getName()
            }
        });
    });

    socket.on('user updates file information', (req) => {

    });

    socket.on('user change play state to play', (req) => {
        let room = req.room;
        socket.to(room.name).emit('user changed play state to play', {});
    });

    socket.on('user change play state to pause', (req) => {
        let room = req.room;
        socket.to(room.name).emit('user changed play state to pause', {});
    });

    socket.on('user change play state to stop', (req) => {
        let room = req.room;
        socket.to(room.name).emit('user changed play state to stop', {});
    });

    socket.on('disconnect', () => {
        let watcher = roomManager.findWatcherById(socket.id);
        if (!watcher) {
            return;
        }

        let room = roomManager.findWatcherRoom(watcher);

        roomManager.removeWatcher(watcher);

        socket.leave(room.getName());

        socket.emit('you left room', {});

        socket.to(room.getName()).emit('user left room', {
            user: {
                id: watcher.getId(),
                name: watcher.getName()
            }
        });
    });

}

module.exports = (io, roomManager) => {

    io.on('connection', (socket) => {
        setupEvents(io, socket, roomManager);
    });

};