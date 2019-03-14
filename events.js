const validate = require("validate.js");

const {User, File} = require('./models');
const {
    UserSerializer,
    UserShortSerializer,
    RoomSerializer,
    PlayStateSerializer
} = require('./serializers');
const {
    UserInThisRoomError,
    UserInAnotherRoomError
} = require('./managers');

const {
    CONNECTION,
    DISCONNECT,
    JOIN_USER_TO_ROOM,
    YOU_JOINED_ROOM,
    USER_JOINED_ROOM,
    YOU_RECONNECTED_TO_ROOM,
    USER_RECONNECTED_TO_ROOM,
    ERROR_OF_JOINING_USER_TO_ROOM,
    LEAVE_USER_FROM_ROOM,
    YOU_LEFT_ROOM,
    USER_LEFT_ROOM,
    ERROR_OF_LEAVING_USER_FROM_ROOM,
    CHANGE_PLAY_STATE,
    CHANGED_PLAY_STATE,
    ERROR_OF_CHANGING_PLAY_STATE,
    SEND_MESSAGE_TO_ROOM,
    SENT_MESSAGE_TO_ROOM,
    ERROR_OF_SENDING_MESSAGE_TO_ROOM
} = require('./constants').events;

const {
    PLAY_STATE_PLAYING,
    PLAY_STATE_PAUSE,
    PLAY_STATE_STOP
} = require('./constants').playStates;

const userSerializer = new UserSerializer();
const userShortSerializer = new UserShortSerializer();
const roomSerializer = new RoomSerializer();
const playStateSerializer = new PlayStateSerializer();

async function joinUserToRoom(req, socket, roomManager) {
    const constraints = {
        'user': {
            presence: true,
            type: 'object'
        },
        'user.name': {
            presence: true,
            type: 'string',
            length: {
                minimum: 2,
                maximum: 20
            }
        },
        'user.file': {
            presence: true,
            type: 'object'
        },
        'user.file.name': {
            presence: true,
            type: 'string',
            length: {
                minimum: 3,
                maximum: 100
            }
        },
        'user.file.size': {
            presence: true,
            type: 'number',
            numericality: {
                onlyInteger: true
            }
        },
        'room': {
            presence: true,
            type: 'object'
        },
        'room.name': {
            presence: true,
            type: 'string',
            length: {
                minimum: 2,
                maximum: 20
            }
        }
    };

    try {
        await validate.async(req, constraints);
    } catch (error) {
        return socket.emit(ERROR_OF_JOINING_USER_TO_ROOM, {
            message: 'Validation error',
            fields: error
        });
    }

    const file = new File(req.user.file.name, req.user.file.size);
    const user = new User(socket.id, req.user.name, file);

    try {
        const room = roomManager.addUser(user, req.room.name);

        socket.join(room.name);

        socket.emit(YOU_JOINED_ROOM, {
            user: await userSerializer.serialize(user),
            room: await roomSerializer.serialize(room)
        });

        return socket.to(room.name).emit(USER_JOINED_ROOM, {
            user: await userSerializer.serialize(user)
        });
    } catch (error) {
        if (error instanceof UserInThisRoomError) {
            const room = roomManager.findRoomByUser(user);

            socket.emit(YOU_RECONNECTED_TO_ROOM, {
                user: await userSerializer.serialize(user),
                room: await roomSerializer.serialize(room)
            });

            socket.join(room.name);

            return socket.to(room.name).emit(USER_RECONNECTED_TO_ROOM, {
                user: await userSerializer.serialize(user),
            });
        }
        if (error instanceof UserInAnotherRoomError) {
            const previousRoom = roomManager.findRoomByUser(user);

            const currentRoom = roomManager.moveUser(user, req.room.name);

            socket.leave(previousRoom.name);

            socket.to(previousRoom.name).emit(USER_LEFT_ROOM, {
                user: await userShortSerializer.serialize(user)
            });

            socket.join(currentRoom.name);

            socket.emit(YOU_JOINED_ROOM, {
                user: await userSerializer.serialize(user),
                room: await roomSerializer.serialize(currentRoom)
            });

            return socket.to(currentRoom.name).emit(USER_JOINED_ROOM, {
                user: await userSerializer.serialize(user)
            });
        }

        return socket.emit(ERROR_OF_JOINING_USER_TO_ROOM, {message: 'Internal server error'});
    }
}

async function leaveUserFromRoom(req, socket, roomManager) {
    const user = roomManager.findUserById(socket.id);
    if (!user) {
        return socket.emit(ERROR_OF_LEAVING_USER_FROM_ROOM, {message: 'You are not in any of the rooms'});
    }

    const room = roomManager.findRoomByUser(user);

    roomManager.removeUser(user);

    socket.leave(room.name);

    socket.emit(YOU_LEFT_ROOM, {});

    return socket.to(room.name).emit(USER_LEFT_ROOM, {
        user: await userShortSerializer.serialize(user)
    });
}

async function changePlayState(req, socket, roomManager) {
    const constraints = {
        'playState': {
            presence: true,
            type: 'string',
            inclusion: [PLAY_STATE_PLAYING, PLAY_STATE_PAUSE, PLAY_STATE_STOP]
        },
        'currentTime': {
            presence: true,
            type: 'number'
        },
        'seek': {
            presence: false,
            type: 'boolean'
        }
    };

    try {
        await validate.async(req, constraints);
    } catch (error) {
        return socket.emit(ERROR_OF_CHANGING_PLAY_STATE, {
            message: 'Validation error',
            fields: error
        });
    }

    const user = roomManager.findUserById(socket.id);
    if (!user) {
        return socket.emit(ERROR_OF_CHANGING_PLAY_STATE, {message: 'You are not in any of the rooms'});
    }

    const room = roomManager.updatePlayState(req.playState, req.currentTime, user);

    if (req.sync) {
        return;
    }

    return socket.to(room.name).emit(CHANGED_PLAY_STATE, await playStateSerializer.serialize(room, req.seek));
}

async function sendMessageToRoom(req, socket, roomManager) {
    const constraints = {
        'message': {
            presence: true,
            type: 'string',
            length: {
                minimum: 1,
                maximum: 200
            }
        }
    };

    try {
        await validate.async(req, constraints);
    } catch (error) {
        return socket.emit(ERROR_OF_SENDING_MESSAGE_TO_ROOM, {
            message: 'Validation error',
            fields: error
        });
    }

    const user = roomManager.findUserById(socket.id);
    if (!user) {
        return socket.emit(ERROR_OF_SENDING_MESSAGE_TO_ROOM, {message: 'You are not in any of the rooms'});
    }

    const room = roomManager.findRoomByUser(user);

    return socket.to(room.name).emit(SENT_MESSAGE_TO_ROOM, {
        message: req.message,
        sender: await userShortSerializer.serialize(user)
    });
}

async function disconnect(socket, roomManager) {
    const user = roomManager.findUserById(socket.id);
    if (!user) {
        return;
    }

    const room = roomManager.findRoomByUser(user);

    roomManager.removeUser(user);

    socket.leave(room.name);

    return socket.to(room.name).emit(USER_LEFT_ROOM, {
        user: await userShortSerializer.serialize(user)
    });
}

module.exports = (io, roomManager) => {
    io.on(CONNECTION, (socket) => {
        socket.on(JOIN_USER_TO_ROOM, req => (joinUserToRoom(req, socket, roomManager)));
        socket.on(LEAVE_USER_FROM_ROOM, req => (leaveUserFromRoom(req, socket, roomManager)));
        socket.on(CHANGE_PLAY_STATE, req => (changePlayState(req, socket, roomManager)));
        socket.on(SEND_MESSAGE_TO_ROOM, req => (sendMessageToRoom(req, socket, roomManager)));
        socket.on(DISCONNECT, () => (disconnect(socket, roomManager)));
    });
};