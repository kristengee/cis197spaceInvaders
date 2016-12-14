var _ = require('lodash');

module.exports = function (server, app) {
  var io = require('socket.io')(server);
  io.on('connection', function (socket) {
    var origin = socket.handshake.headers.referer;
    var room = origin.substring(origin.lastIndexOf('/') + 1);
    socket.join(room);

    if (!socket.adapter.rooms[room].readies) {
      socket.adapter.rooms[room].readies = [];
    }

    var ready = socket.adapter.rooms[room].readies;
    var currentSockets = socket.adapter.rooms[room].sockets;
    var currentConnected = _.filter(currentSockets, function (s) {
      return s;
    });

    console.log(currentConnected.length + ' connected to ' + room);
    if (currentConnected.length === 2) {
      socket.emit('ready');
      socket.to(room).emit('ready');
    }

    socket.on('ready', function () {
      ready.push(socket.id);
      if (ready.length === 1) {
        socket.emit('player', 1);
      }
      if (ready.length === 2) {
        socket.emit('player', 2);
        setTimeout(function () {
          socket.emit('start');
          socket.to(room).emit('start');
        }, 5000);
      }
    });

    socket.on('bullet', function (bullet) {
      socket.to(room).emit('bullet', bullet);
    });

    socket.on('invaderdeath', function (invaderData) {
      socket.to(room).emit('invaderdeath', invaderData);
    });

    socket.on('shipmove', function (direction) {
      socket.to(room).emit('shipmove', direction);
    });

    socket.on('disconnect', function () {});
  });
};