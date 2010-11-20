var sys     = require("sys"),
    request = require("request"),
    $  = require("jquery"),
    uri     = 'http://www.stevelacey.net';

request({uri:uri}, function (error, response, context) {
  if (!error && response.statusCode == 200) {
    console.log($("#logo img", context).attr('src'))
  }
})