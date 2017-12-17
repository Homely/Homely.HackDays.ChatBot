//
// This is main file containing code implementing the Express server and functionality for the Express echo bot.
//
'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const path = require('path');
var messengerButton = "<html><head><title>Homely Facebook Messenger Bot</title></head><body><h1>Homely Facebook Messenger Bot</h1>This is a bot based on Messenger Platform QuickStart. For more details, see their <a href=\"https://developers.facebook.com/docs/messenger-platform/guides/quick-start\">docs</a>.<script src=\"https://button.glitch.me/button.js\" data-style=\"glitch\"></script><div class=\"glitchButton\" style=\"position:fixed;top:20px;right:20px;\"></div></body></html>";

// The rest of the code implements the routes for our Express server.
let app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

// Search listings
app.get('/search', function(req, res) {
  var query = req.query;
  // console.log('query', query);
  var mode = query['searchType'] === 'rent' ? 2 : 1;
  var filter = getFilter(req);
  getLocationByLatLong(query.latitude, query.longitude, mode, res, filter);
});

function getInt(item) {
  return item ? parseInt(item, 10) : 0;
}

function getFilter(req) {
  if (!req.query) {
    return {};
  }
  return {
    bathrooms: [getInt(req.query.bathrooms)],
    bedrooms: [getInt(req.query.bedrooms)],
    carSpaces: [getInt(req.query.carspaces)],
    price: {
      minimum: getInt(req.query.minprice || 1),
      maximum: getInt(req.query.maxprice || 1),
    },
  };
}

function getLocationByLatLong(latitude, longitude, mode, res, filter) {
  request({
    uri: `https://api.homely.com.au/location/${latitude}/${longitude}/5`,
    qs: {},
    method: 'GET',
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var parsedBody = JSON.parse(body);
      Object.assign(filter, { mode, locationId: parsedBody.id });
      getListingSearch(filter, res);
    } else {
      console.error("Unable to send message.");
      console.error(response);
      console.error(error);
    }
  });
}

function getListingSearch(filter, res) {
  var url = 'https://api.homely.com.au/listings/location/list?json=';
  var options = { filter, "sort": 5, "paging": { "skip": 0,"take": 5 }};
  // console.log('options', options);
  request({
    uri: url + JSON.stringify(options),
    qs: {},
    method: 'GET',
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var parsedBody = JSON.parse(body);
      var results = formatResults(parsedBody.items);
      res.json(results);
    } else {
      console.error("Unable to send message.");
      console.error(response);
      console.error(error);
    }
  });
}

function formatResults(items) {
  if (!items || !items.length) {
    return {
     "messages": [
       {"text": "Sorry, we don't have any properties matching your criteria :("},
      ]
    };
  }
  var listings = items.map(listing => formatListing(listing));
  var result = {
    "messages": [
      {
        "attachment": {
          "type": "template",
          "payload": {
            "template_type": "generic",
            "elements": listings
          }
        }
      }
    ]
  };
  return result;
}

function formatListing(listing) {
  var listing = {
    "title": `${listing.info.price.longDescription} - ${listing.mainFeatures.bedrooms} beds, ${listing.mainFeatures.bathrooms} baths, ${listing.mainFeatures.carSpaces} cars`,
    "image_url": `https://res-1.cloudinary.com/hd1n2hd4y/image/upload/f_auto,fl_lossy,q_auto,c_fill,w_414,h_277,dpr_2.0/${listing.images[0].identifier}.jpg`,
    "subtitle": `${listing.location.address}, ${listing.location.suburb}`,
    "buttons": [
      {
        "type": "web_url",
        "url": `https://www.homely.com.au/homes/${listing.uri}/${listing.id}`,
        "title": "View Property"
      }
    ]
  };
  return listing;
}

// Display the web page
app.get('/', function(req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write(messengerButton);
  res.end();
});

// Set Express to listen out for HTTP requests
var server = app.listen(process.env.PORT || 3000, function () {
  console.log("Listening on port %s", server.address().port);
});