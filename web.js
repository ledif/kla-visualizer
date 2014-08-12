var express = require("express"),
    morgan  = require('morgan')

var app = express();

app.use(morgan('dev'));
app.use(express.static(__dirname + '/public'))

var port = Number(process.env.PORT || 8080);

app.listen(port, function() {
  console.log("Listening on " + port);
});

module.exports.app = app;
