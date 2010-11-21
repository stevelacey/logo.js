var sys     = require("sys"),
    request = require("request"),
    url     = require("url"),
    $       = require("jquery"),
    uri     = 'http://' + process.argv[2] + '/';

function pathToLogo(logo) {
  console.log(logo !== undefined ? url.resolve(uri, logo) : false);
}

request({uri:uri}, function (error, response, context) {
  if(!error && response.statusCode == 200) {
    var imgs = ['#header img:first', '.header img:first', '#logo img', 'h1 img', '.logo img'];
    var divs = ['#header', '.header', '.logo', '.header .logo', 'h1'];
    var stylesheets = ['main', 'style', 'screen', 'global'];
    
    // Try imgs
    var logo = $(imgs.join(','), context).attr('src');
    
    if(logo === undefined) {
      // Try background-images
      for(var i in stylesheets) {
        stylesheets[i] = 'link[rel="stylesheet"][href*="' + stylesheets[i] + '"]';
      }

      var stylesheet = $(stylesheets.join(','), context).attr('href');
      
      if(stylesheet !== undefined) {
        request({uri:url.resolve(uri, stylesheet)}, function (error, response, css) {
          if(!error && response.statusCode == 200) {
            for(var i in divs) {
              var regex = new RegExp(divs[i] + "\\s*{[^}]*background-image:\\s*url\\s*\\(\\s*[\"|\']*([^\"&^\'&^)&^}]+)");
              var matches = css.match(regex);
              
              if(matches !== null) {
                pathToLogo(matches[1]);
                break;
              }
            }
          }
        })
      }
    } else {
      pathToLogo(logo);
    }
  }
})
