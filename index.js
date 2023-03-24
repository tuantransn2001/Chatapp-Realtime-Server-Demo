const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const cors = require("cors");

const { addUser, removeUser, getUser, getUsersInRoom } = require("./users");

const router = require("./router");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(cors());
app.use(router);

io.on("connect", (socket) => {
  // ? Create event join
  socket.on("join", ({ name, room }, callback) => {
    // ? Get user name,room from client

    // ==========================================

    // ? Each new connection is assigned a random 20-characters identifier.
    // ? This identifier is synced with the value on the client-side.
    // ?  => Socket.id
    const { error, user } = addUser({ id: socket.id, name, room });

    if (error) return callback(error);

    // ? Add new user into room
    socket.join(user.room);

    // ? Create event message -> get name from client -> send hello
    socket.emit("message", {
      user: "admin",
      text: `${user.name}, welcome to room ${user.room}.`,
    });

    socket.broadcast
      .to(user.room)
      .emit("message", { user: "admin", text: `${user.name} has joined!` });

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    callback();
  });

  // ? Create event sendMessage
  socket.on(
    "sendMessage",
    (
      message,
      // ? message get from client when user hit send message button
      callback
    ) => {
      // ? Whenever sendMessage is listen -> Get current id by function getUser
      const user = getUser(socket.id);

      // ? send message data  to all user in room
      io.to(user.room).emit("message", {
        user: user.name,
        text: message,
      });
      callback();
    }
  );

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit("message", {
        user: "Admin",
        text: `${user.name} has left.`,
      });
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

server.listen(5000, () => console.log(`Server has started.`));
