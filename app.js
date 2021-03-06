const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const handlebars = require('express-handlebars');
const {revManifest} = require('./middlewares');
const RoomManager = require('./managers').RoomManager;

// Create room manager instance
const roomManager = new RoomManager();

// Set template engine
app.engine('handlebars', handlebars());
app.set('view engine', 'handlebars');

// Set static route
app.use(require('express').static(__dirname + '/public'));

// Set assets manifest
app.use(revManifest(__dirname + '/public/manifest.json'));

// Setup controllers
require('./controllers')(app);

// Setup events
require('./events')(io, roomManager);

server.listen(process.env.PORT || 8000, () => {
    console.log('Server has been started');
});