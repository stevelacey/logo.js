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

        var logo = preStylesheetScrape(html, imgs, inlines);

        if(logo == undefined) {
          // Try background-images
          var stylesheet = getStylesheet(html, stylesheets);

          if(stylesheet != undefined) {
            console.log(url.resolve(uri, stylesheet));
            request({uri:url.resolve(uri, stylesheet)}, function (error, response, css) {
              if(!error && response.statusCode == 200) {
                logo = getImageFromStylesheet(css, divs);

                if(logo != undefined) {
                  // Found image in stylesheet

                  // The image path might be relational to the stylesheet location, redefine uri.
                  uri = getStylesheetBaseDirectory(stylesheet);

                  respond(webresponse, logo);
                } else {
                  respond(webresponse);
                }
              }
            })
          } else {
            logo = postStylesheetScrape(html);

            if(logo != undefined) {
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

function preStylesheetScrape(html, imgs, inlines) {
  var logo;
  
  for(var i = 1; logo == undefined && i <= 4; i++) {
    switch(i) {
      case 1: logo = getImage(html, imgs); break;
      case 2: logo = getImageFromInlineStyle(html, inlines); break;
      case 3: logo = getImageFromTitle(html); break;
      case 4: logo = getImageFromDomain(html); break;
    }
  }
  
  return logo;
}

function postStylesheetScrape() {
  var logo;
  
  for(i = 1; logo == undefined && i <= 2; i++) {
    switch(i) {
      case 1: logo = getOpenGraphImage(html); break;
      case 2: logo = getMobileImage(html); break;
    }
  }
  
  return logo;
}

function getImage(html, selectors) {
  return $(selectors.join(','), html).attr('src');
}

function getImageFromInlineStyle(html, selectors) {
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
  var domain = url.parse(uri).hostname;

  if(domain !== undefined) {
    var hostname = domain.replace('www.', '');
    var str = hostname.substring(0,(hostname.indexOf('.')));
    return $('img[src$="' + str + '.png"], img[src$="' + str + '.jpg"], img[src$="' + str + '.jpeg"], img[src$="' + str + '.gif"]', html).attr('src');
  } else {
    return undefined;
  }
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

function getImageFromStylesheet(css, divs) {
  for(var i in divs) {
    var matches = css.match(new RegExp(divs[i] + "\\s*{[^}]*background[^:]*:\\s*url\\s*\\(\\s*[\"|\']*([^\"&^\'&^)&^}]+)"));
    if(matches !== null) {
      return matches[1];
    }
  }

  return undefined;
}

function getStylesheetBaseDirectory(stylesheet) {
  stylesheet = stylesheet.substring(0,(stylesheet.lastIndexOf('/')) + 1);

  if(stylesheet.substr(0,4) == 'http') {
    return stylesheet;
  } else {
    return url.resolve(uri, stylesheet);
  }
}

function getOpenGraphImage(html) {
  // Check for an OpenGraph image
  return $('meta[property="og:image"]', html).attr('content');
}

function getMobileImage(html) {
  // Check for an iOS icon
  return $('link[rel="apple-touch-icon-precomposed"], link[rel="apple-touch-icon"]', html).attr('href');
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