var sys     = require("sys"),
    http    = require("http"),
    port    = 80,
    get     = require("request"),
    url     = require("url"),
    path    = require("path"),
    fs      = require("fs"),
    $       = require("jquery"),
    uri;

http.createServer(function(request, response) {
  uri = request.url.replace(/^\/*/, '');

  if (uri == '') {
    fs.readFile('index.html', 'binary', function(err, file) {
      response.writeHead(200, {'Content-Type': 'text/html'});
      response.end(file);
    });
  } else {
    var filename = path.join(process.cwd(), url.parse(request.url).pathname);

    path.exists(filename, function(exists) {
      if(!exists) {
        uri = getUri();
        console.log(uri);

        get({uri: uri}, function (error, r, html) {
          if(!error && r.statusCode == 200) {
            var imgs = ['header img:first', '#header img:first', '.header img:first', '#logo img', 'h1 img', '.logo img', 'img#logo', 'img.logo', '#banner img:first']; // css
            var inlines = ['header', '#header', '.header', '#logo', '.logo', '#p-logo a', 'h1']; // css
            var divs = ['[#|.]*header [#|.]logo', '[#|.][^\\s]*logo[^\\s&^{]*', '[#|.]*header', 'h1 a', 'h1', '#title']; // regex
            var stylesheets = ['main', 'style', 'screen', 'global']; // filenames

            var logo = preStylesheetScrape(html, imgs, inlines);

            if(uri == '') {
              uri = 'http://logo.no.de';
            }

            if(logo == undefined) {
              // Try background-images
              var stylesheet = getStylesheet(html, stylesheets);

              if(stylesheet != undefined) {
                console.log(url.resolve(uri, stylesheet));
                get({uri:url.resolve(uri, stylesheet)}, function (error, r, css) {
                  if(!error && r.statusCode == 200) {
                    logo = getImageFromStylesheet(css, divs);

                    if(logo != undefined) {
                      // The image path might be relational to the stylesheet location, redefine uri.
                      uri = getStylesheetBaseDirectory(stylesheet);
                      redirect(response, logo);
                    } else {
                      logo = postStylesheetScrape(html);
                      respond(response, logo);
                    }
                  } else {
                    logo = postStylesheetScrape(html);
                    respond(response, logo);
                  }
                })
              } else {
                logo = postStylesheetScrape(html);
                respond(response, logo);
              }
            } else {
              redirect(response, logo);
            }
          } else {
            fail(response);
          }
        })

      } else {
        fs.readFile(filename, "binary", function(err, file) {
          if(!err) {
            response.writeHead(200);
            response.write(file, "binary");
          } else {
            response.writeHead(500, {"Content-Type": "text/plain"});
            response.write(err + "\n");
          }

          response.end();
        });
      }
    });
  }
}).listen(port);

console.log('Server listening on port ' + port);

function getUri() {
  return uri.substr(0,4) != 'http' ? 'http://' + uri : uri;
}

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

function postStylesheetScrape(html) {
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
  if(logo != undefined) {
    redirect(response, logo);
  } else {
    fail(response);
  }
}

function redirect(response, logo) {
  response.writeHead(302, {'Location': url.resolve(uri, logo)});
  console.log(url.resolve(uri, logo) + '\n');
  response.end();
}

function fail(response) {
  response.writeHead(404, {"Content-Type": "text/plain"});
  console.log('Fail :(\n')
  response.end();
}
