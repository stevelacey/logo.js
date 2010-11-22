var sys     = require("sys"),
    http    = require("http"),
    port    = 8080,
    request = require("request"),
    url     = require("url"),
    $       = require("jquery"),
    uri;

function respond(response, logo) {
  if(logo !== undefined) {
    response.writeHead(302, {'Location': url.resolve(uri, logo)});
    console.log(url.resolve(uri, logo) + '\n');
  } else {
    response.writeHead(404, {"Content-Type": "text/plain"});
    console.log('Fail :(\n')
  }
  response.end();
}

http.createServer(function(webrequest, webresponse) {

uri = webrequest.url.replace(/^\/*/, '');

if (uri == '') {
  webresponse.writeHead(200, {'Content-Type': 'text/html'});
  webresponse.end('<h1>Node.JS Logo Scraper</h1><p>Try <a href="http://logo.stevelacey.net/http://www.google.com">http://logo.stevelacey.net/http://www.google.com</a></p><h2>Documentation</h2><p>Returns a 302 to the image found or a 404.</p><h2>Contribute</h2><p>Code available at: <a href="https://github.com/stevelacey/node.js-logo-scraper">https://github.com/stevelacey/node.js-logo-scraper</a></p>.');
} else if(uri == 'favicon.ico') {
  webresponse.writeHead(301, {'Location': 'http://www.stevelacey.net/favicon.ico'});
} else if(uri == 'robots.txt') {
  respond(webresponse);
} else {

  console.log(uri);

  request({uri:uri}, function (error, response, context) {
    if(!error && response.statusCode == 200) {
      var imgs = ['#header img:first', '.header img:first', '#logo img', 'h1 img', '.logo img', 'img#logo', 'img.logo', '#banner img:first']; // css
      var divs = ['[#|.]header [#|.]logo', '[#|.]logo', '[#|.][^\\s]*logo[^\\s&^{]*', '[#|.]header', 'h1']; // regex
      var stylesheets = ['main', 'style', 'screen', 'global']; // filenames

      // Try imgs
      var logo = $(imgs.join(','), context).attr('src');

      if(logo === undefined) {
        // Check for an OpenGraph image
        var logo = $('meta[property="og:image"]', context).attr('content');
      }

      if(logo === undefined) {
        // Check for an iOS icon
        var logo = $('link[rel="apple-touch-icon-precomposed"], link[rel="apple-touch-icon"]', context).attr('href');
      }

      if(logo === undefined) {
        // Try background-images
        for(var i in stylesheets) {
          stylesheets[i] = 'link[rel="stylesheet"][href*="' + stylesheets[i] + '.css"]';
        }

        var stylesheet = $(stylesheets.join(','), context).attr('href');

        if(stylesheet !== undefined) {
          console.log(url.resolve(uri, stylesheet));
          request({uri:url.resolve(uri, stylesheet)}, function (error, response, css) {
            if(!error && response.statusCode == 200) {
              for(var i in divs) {
                var regex = new RegExp(divs[i] + "\\s*{[^}]*background[^:]*:\\s*url\\s*\\(\\s*[\"|\']*([^\"&^\'&^)&^}]+)");
                var matches = css.match(regex);
                if(matches !== null) {
                  var logo = matches[1];
                  break;
                }
              }

              if(logo !== undefined) {
                respond(webresponse, logo);
              } else {
                respond(webresponse);
              }
            }
          })
        } else {
          respond(webresponse);
        }
      } else {
        respond(webresponse, logo);
      }
    } else {
      respond(webresponse);
    }
  })

}

}).listen(port);

console.log('Server listening on port ' + port);
