const emojiMap = {
   joy: "&#x1f602",
   shades: "&#x1f60e",
   happy: "&#x1f600",
}
const regExpression = /:([^:]*):/g;
const emojiIt = (re, text) =>
{
   while (result = re.exec(text))
   {
      text = text.replace(result[0], emojiMap[result[1]]);
   }
   return text
}

$(function ()
{
   var socket = io();
   let username = "";
   let months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
   $('form').submit(function (e)
   {
      e.preventDefault(); // prevents page reloading
      socket.emit('chat message', { 'message': $('#m').val(), 'username': username });
      $('#m').val('');
      return false;
   });
   socket.on('chat message', function (msg)
   {
      let convertedMessageText = emojiIt(regExpression, msg.message);
      let messageText = "<li data-user='" + msg.username + "' class='user-messages' style='color:#" + msg.color + "'>" + msg.timestamp + " <b>" + msg.username + "</b>: " + convertedMessageText + "</li>";
      if (msg.username == username)
      {
         messageText = "<li data-user='" + msg.username + "' class='personal-messages' style='color:#" + msg.color + "'>" + msg.timestamp + " <b>" + msg.username + ": " + convertedMessageText + "</b></li>";
      }
      $('#messages').prepend(messageText);
      $("#messages").scrollTop($("#messages")[0].scrollHeight);
   });
   socket.on('server message', function (msg)
   {
      $('#messages').prepend("<li class='server-messages' style='color:#" + msg.color + "'><i>" + msg.message + "</i></li>");
   });
   socket.on('server command', function (msg)
   {
      if (msg == "clear")
      {
         $('#messages').empty();
      }
   });
   socket.on('username', function (msg)
   {
      username = msg.username;
      $('#username').text(msg.username);
      getCookieAsync(username);
   });
   socket.on('active user list', function (msg)
   {
      $('#activeUserList').empty();
      $('#activeUserList').append("<li>" + username + " (Me) </li>");
      msg.users.forEach(function (value)
      {
         if (value != username)
         {
            $('#activeUserList').append("<li>" + value + "</li>");
         }
      });
   });
   socket.on('user color change', function (msg)
   {
      $('#messages li').each(function (i)
      {
         if ($(this).data('user') == msg.username)
         {
            $(this).css('color', "#" + msg.color);
         }
      });
   });
});

function getCookieAsync(username)
{
   let data = { user: username };
   let jsonData = JSON.stringify(data);

   $.ajax({
      url: "/user",
      data: jsonData,
      dataType: 'json',
      type: "POST",
      contentType: 'application/json'
   })
}