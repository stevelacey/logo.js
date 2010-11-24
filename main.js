var sys     = require("sys"),
    http    = require("http"),
    port    = 8080,
    request = require("request"),
    fs      = require("fs"),
    url     = require("url"),
    $       = require("jquery"),
    uri;

http.createServer(function(webrequest, webresponse) {

uri = webrequest.url.replace(/^\/*/, '');

if (uri == '') {
  fs.readFile('index.html', 'binary', function(err, file) {
    webresponse.writeHead(200, {'Content-Type': 'text/html'});
    webresponse.end(file);
  });
} else if(uri == 'favicon.ico') {
  webresponse.writeHead(301, {'Location': 'http://www.stevelacey.net/favicon.ico'});
} else if(uri == 'robots.txt') {
  respond(webresponse);
} else {
  if(uri.substr(0,4) != 'http') {
    uri = 'http://' + uri;
  }

  console.log(uri);

  request({uri:uri}, function (error, response, html) {
    if(!error && response.statusCode == 200) {
      var imgs = ['#header img:first', '.header img:first', '#logo img', 'h1 img', '.logo img', 'img#logo', 'img.logo', '#banner img:first']; // css
      var inlines = ['#header', '.header', '#logo', '.logo', '#p-logo a', 'h1']; // css
      var divs = ['[#|.]header [#|.]logo', '[#|.][^\\s]*logo[^\\s&^{]*', 'h1', '#title']; // regex
      var stylesheets = ['main', 'style', 'screen', 'global']; // filenames

      // Try imgs
      var logo = getImage(html, imgs);

      if(logo === undefined) {
        logo = getInlineStyleImage(html, inlines);
      }

      if(logo === undefined) {
        logo = getImageFromTitle(html);
      }

      if(logo === undefined && url.parse(uri).hostname !== undefined) {
        logo = getImageFromDomain(html);
      }

      if(logo === undefined) {
        // Try background-images
        var stylesheet = getStylesheet(html, stylesheets);

        if(stylesheet !== undefined) {
          console.log(url.resolve(uri, stylesheet));
          request({uri:url.resolve(uri, stylesheet)}, function (error, response, css) {
            if(!error && response.statusCode == 200) {
              for(var i in divs) {
                var matches = css.match(new RegExp(divs[i] + "\\s*{[^}]*background[^:]*:\\s*url\\s*\\(\\s*[\"|\']*([^\"&^\'&^)&^}]+)"));
                if(matches !== null) {
                  logo = matches[1];
                  break;
                }
              }
              
              if(logo !== undefined) {
                // Found image in stylesheet
                stylesheet = stylesheet.substring(0,(stylesheet.lastIndexOf('/')) + 1);

                if(stylesheet.substr(0,4) == 'http') {
                  uri = stylesheet;
                } else {
                  uri = url.resolve(uri, stylesheet);
                }

                respond(webresponse, logo);
              } else {
                respond(webresponse);
              }
            }
          })
        } else {
          // Check for an OpenGraph image
          logo = $('meta[property="og:image"]', html).attr('content');

          if(logo === undefined) {
            // Check for an iOS icon
            logo = $('link[rel="apple-touch-icon-precomposed"], link[rel="apple-touch-icon"]', html).attr('href');
          }
          
          if(logo !== undefined) {
            respond(webresponse, logo);
          } else {
            respond(webresponse);
          }
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


function getImage(html, selectors) {
  return $(selectors.join(','), html).attr('src');
}

function getInlineStyleImage(html, selectors) {
  // Check for inline styles
  for(var i in selectors) {
    selectors[i] += '[style]"]';
  }

  var inline = $(selectors, html).attr('style');

  if(inline !== undefined) {
    var matches = inline.match(new RegExp("background[^:]*:\\s*url\\s*\\(\\s*[\"|\']*([^\"&^\'&^)]+)"));
  }

  return matches != null && matches != undefined ? matches[1] : undefined;
}

function getImageFromTitle(html) {
  // Check for an image filename similar to the title tag slugified
  var title =  $('title', html).text().toLowerCase().replace(/\s+/g,'-');
  return $('img[src$="' + title + '.png"], img[src$="' + title + '.jpg"], img[src$="' + title + '.jpeg"], img[src$="' + title + '.gif"]', html).attr('src');
}

function getImageFromDomain(html) {
  // Check for an image filename similar to the domain
  var hostname = url.parse(uri).hostname.replace('www.', '');
  var domain = hostname.substring(0,(hostname.indexOf('.')));
  return $('img[src$="' + domain + '.png"], img[src$="' + domain + '.jpg"], img[src$="' + domain + '.jpeg"], img[src$="' + domain + '.gif"]', html).attr('src');
}

function getStylesheet(html, selectors) {
  if($('link[rel="stylesheet"]', html).length == 1) {
    // If there's only one stylesheet assume it as master
    return $('link[rel="stylesheet"]', html).attr('href');
  } else {
    // Check for commonly used main stylesheet names
    for(var i in selectors) {
      selectors[i] = 'link[rel="stylesheet"][href*="' + selectors[i] + '.css"]';
    }

    return $(selectors.join(','), html).attr('href');
  }
}

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