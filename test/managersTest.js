const {assert, expect} = require('chai');

const {
    RoomManager,
    WatcherUseThisRoomError,
    WatcherUseAnotherRoomError
} = require('../managers');

const {RoomsFactory, WatchersFactory} = require('./factories');

describe('Room manager test', () => {

    beforeEach(() => {
        const rooms = RoomsFactory.makeRooms(2);
        const watchers = WatchersFactory.makeWatchers(2);

        rooms.get('#1').setWatchers(watchers);

        this.roomManager = new RoomManager();
        this.roomManager.setRooms(rooms);
    });

    describe('#addWatcher()', () => {
        it('when watcher use provided room should throw error', () => {
            const room = this.roomManager.getRooms().get('#1');
            const watcher = room.getWatchers().get('ID:1');

            expect(() => {this.roomManager.addWatcher(watcher, room.getName())})
                .to
                .throw(WatcherUseThisRoomError);
        });

        it('when watcher use another room should throw error', () => {
            const room = this.roomManager.getRooms().get('#2');
            const watcher = this.roomManager.getRooms().get('#1').getWatchers().get('ID:1');

            expect(() => {this.roomManager.addWatcher(watcher, room.getName())})
                .to
                .throw(WatcherUseAnotherRoomError);
        });

        it('when watcher not use any rooms and provided room exists should add watcher to existing room', () => {
            const room = this.roomManager.getRooms().get('#2');
            const watcher = WatchersFactory.makeWatcher('123', 'Some name');

            assert.equal(false, room.getWatchers().has(watcher.getId()));

            this.roomManager.addWatcher(watcher, room.getName());

            assert.equal(true, room.getWatchers().has(watcher.getId()));
        });

        it('when watcher not use any rooms and provided room not exist should add room and watcher', () => {
            let room = RoomsFactory.makeRoom('Some room');
            let watcher = WatchersFactory.makeWatcher('123', 'Some name');

            assert.equal(false, this.roomManager.getRooms().has(room.getName()));

            this.roomManager.addWatcher(watcher, room.getName());

            assert.equal(true, this.roomManager.getRooms().has(room.getName()));

            room = this.roomManager.getRooms().get(room.getName());

            assert.equal(true, room.getWatchers().has(watcher.getId()));
        });
    });

    describe('#removeWatcher()', () => {
        it('when watcher use room should remove watcher', () => {
            const room = this.roomManager.getRooms().get('#1');
            const watcher = room.getWatchers().get('ID:1');

            assert.equal(true, room.getWatchers().has(watcher.getId()));

            this.roomManager.removeWatcher(watcher);

            assert.equal(false, room.getWatchers().has(watcher.getId()));
        });

        it('when watcher not use any rooms should not do any changes', () => {
            const watcher = WatchersFactory.makeWatcher('123', 'Some name');
            // TODO: Improve checking?
            this.roomManager.removeWatcher(watcher);
        });
    });

    describe('#findWatcherRoom()', () => {
        it('when watcher use room should return room', () => {
            const room = this.roomManager.getRooms().get('#1');
            const watcher = room.getWatchers().get('ID:1');

            assert.equal(room, this.roomManager.findWatcherRoom(watcher));
        });

        it('when watcher not use room should return null', () => {
            const watcher = WatchersFactory.makeWatcher('123', 'Some name');
            assert.isNull(this.roomManager.findWatcherRoom(watcher));
        });
    });

});