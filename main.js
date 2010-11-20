var sys     = require("sys"),
    request = require("request"),
    jsdom   = require("jsdom"),
    uri     = 'http://www.stevelacey.net';

request({uri:uri}, function (error, response, body) {
  if (!error && response.statusCode == 200) {
    var window  = jsdom.jsdom(body).createWindow();
    jsdom.jQueryify(window, "http://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.js", function() {
      sys.puts(uri + "/" + window.jQuery("#logo img").attr("src"));
    });
  }
});