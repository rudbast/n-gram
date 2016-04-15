var express = require('express');
var app     = express();
var Trie    = require(__dirname + '/../util/Trie.js');

var vocabulary = new Trie();

/** Index page. */
app.get('/', function (request, response) {
    response.send('home');
});

/** Route: get data object. */
app.get('/data', function (request, response) {
    response.send(JSON.stringify(vocabulary.getData()));
});

/** Route: insert word to dictionary. */
app.get('/insert/:word', function (request, response) {
    vocabulary.insert(request.params.word);
    response.send('success');
});

/** Route: check word validity. */
app.get('/check/:word', function (request, response) {
    var message = vocabulary.has(request.params.word) ? 'valid' : 'invalid';
    response.send(message);
});

/** Start listening for request. */
var server = app.listen(3000, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log('App listening at http://%s:%s', host, port);
});
