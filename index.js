var fs = require('fs'), fileStream;

var emailjs	= require("./node_modules/emailjs/email");

var Imap = require('imap'),
    inspect = require('util').inspect;

var statements = ''
var cred = {}

fs.readFile('statements.txt', 'utf8', function(err, data) {  
  if (err) throw err;
  statements = data;
});

fs.readFile('credentials.txt', 'utf8', function(err, data) {  
  if (err) throw err;
  cred = JSON.parse(data);
  run();
});

function run() {

  var imap = new Imap({
    user: cred.user,
    password: cred.password,
    host: cred.host,
    port: 993,
    tls: true
  });
  
  function openInbox(cb) {
    imap.openBox('INBOX', true, cb);
  }
  
  imap.once('ready', function() {
    openInbox(function(err, box) {
      if (err) throw err;
      imap.search(['!SEEN', [ 'SUBJECT', 'PublicStatements' ]], function(err, results) {
        console.log(results)
        if (err) throw err;
        var f = imap.fetch(results, { bodies: '' });
        f.on('message', function(msg, seqno) {
          msg.on('body', function(stream, info) {
            var buffer = '';
            stream.on('data', function(chunk) {
              buffer += chunk.toString('utf8');
            });
            stream.once('end', function() {
              console.log('header: ', inspect(Imap.parseHeader(buffer).from), inspect(Imap.parseHeader(buffer).subject));
              sendStatements(Imap.parseHeader(buffer).from[0])
              /*imap.delFlags('27:27','UNSEEN', function(err) {
                if(err) console.log('del flag error: ' + err);
              })*/
            });
          });
        });
        f.once('error', function(err) {
          console.log('Fetch error: ' + err);
        });
        f.once('end', function() {
          console.log('Done fetching all messages!');
          imap.end();
        });
      });
    });
  });
  
  imap.once('error', function(err) {
    console.log(err);
  });
  
  imap.connect();
  
  var server 	= emailjs.server.connect({
    user: cred.user,
    password: cred.password,
    host: cred.host,
    ssl:     true
  });
  
  function sendStatements(address){
    server.send({
      text:    statements, 
      from:    cred.user, 
      to:      address,
      subject: "Re: PublicStatements"
   }, function(err, message) { console.log(err || message); });
  }
  
}


 