const { request } = require('http');

var app = require('express')();
var cookieParser = require('cookie-parser');
var bodyParser = require("body-parser");
const { nextTick } = require('process');
var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.use(cookieParser());
app.use(bodyParser.json());

let userCounter = 0;
let messageLog = [];
let users = { 'userList': [] };
let socketDictionary = new Object();
let latestUserConnection = null;

app.get('/', (req, res) =>
{
   if (req.query.user)
   {

   }
   else
   {
      if (req.cookies['user'])
      {
         latestUserConnection = req.cookies['user'];
         res.sendFile(__dirname + '/index.html');
      }
      else
      {
         latestUserConnection = null;
         res.sendFile(__dirname + '/index.html');
      }
   }
});
app.post('/user', (req, res, next) =>
{
   if (!req.body)
   {
      return;
   }
   res.clearCookie('user');
   // res.cookie('user', req.body.user, { maxAge: 60 * 60 * 1000 });

   next();

});
app.get('/styles.css', function (req, res)
{
   res.sendFile(__dirname + "/" + "styles.css");
});
app.get('/script.js', function (req, res)
{
   res.sendFile(__dirname + "/" + "script.js");
});

io.on('connection', (socket) =>
{
   socket.emit('server command', "clear");
   let socketObject = {};
   let username = "user" + userCounter++;
   if (latestUserConnection != null)
   {
      username = latestUserConnection;
   }
   socketObject["username"] = changeUsername(socket, users, username);
   socketObject["color"] = "f0ffff";
   socketDictionary[socket.id] = socketObject;
   socket.on('chat message', (msg) =>
   {
      if (msg.message.substring(0, 6) == "/name ")
      {
         socketDictionary[socket.id].username = changeUsername(socket, users, msg.message.substring(6), msg.username);
         sendUserList(io, users);
      }
      else if (msg.message.substring(0, 7) == "/color ")
      {
         if (isColor(msg.message.substring(7)))
         {
            socketDictionary[socket.id].color = msg.message.substring(7);

            messageLog.forEach(function (value, index, array)
            {
               if (value.username == msg.username)
               {
                  array[index].color = socketDictionary[socket.id].color;
               }
            });

            io.emit('user color change', { username: msg.username, color: socketDictionary[socket.id].color });
         }
      }
      else
      {
         msg.timestamp = formattedDate(new Date());
         msg.color = socketDictionary[socket.id].color;

         messageLog.push(msg);
         if (messageLog.length > 200)
         {
            messageLog.shift();
         }

         io.emit('chat message', msg);
      }
   });

   sendPreviousMessages(socket, messageLog);
   sendUserList(io, users);

   socket.on('disconnect', () =>
   {
      let username = socketDictionary[socket.id].username;
      removeUser(users, username);
      sendUserList(io, users);
   });
});

http.listen(3000, () =>
{
   console.log('listening on *:3000');
});

function changeUsername(socket, users, username, prevUsername = "n/a")
{
   if (users.userList.filter(function (value) { return username == value; }).length == 0)
   {
      removeUser(users, prevUsername);
      users.userList.push(username);
      socket.emit('username', { 'username': username });
      socket.emit('server message', { 'message': "Username updated: " + username });
      return username;
   }
   else
   {
      if (prevUsername == "n/a")
      {
         let randomUsername = "user" + users.length;
         users.userList.push(randomUsername);
         socket.emit('username', { 'username': randomUsername });
         socket.emit('server message', { 'message': "Username updated: " + randomUsername });
         return randomUsername;
      }
      socket.emit('server message', {
         'message': "Username taken! Please try a different one."
      });
   }
   return prevUsername;
}

function formattedDate(date)
{
   let months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
   return months[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear() + " " + date.getHours() + ":" + date.getMinutes();
}

function sendPreviousMessages(socket, messageLog)
{
   messageLog.forEach(function (value)
   {
      socket.emit('chat message', value);
   })
}

function sendUserList(io, users)
{
   console.log("Sending User list:");
   let message = { 'users': users.userList };
   console.log(message);
   io.emit('active user list', message);
}

function removeUser(users, user)
{
   users.userList = users.userList.filter(function (value) { return value != user });
}

const isColor = (strColor) =>
{
   return strColor.length == 6;
}