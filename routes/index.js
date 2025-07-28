'use strict';

const express = require('express');
const axios = require('axios');
const tmp = require('tmp-promise');
const fs = require('fs');
const im = require('imagemagick');
const router = express.Router();

router.get('/api/nearby', async function (req, res, next) {
  const {lat, lon, max_distance} = req.query;

  try {
    const response = await axios({
      url: `https://external.transitapp.com/v3/public/nearby_routes?lat=${lat}&lon=${lon}&max_distance=${max_distance}`,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'apiKey': process.env.API_KEY,
      }
    });

    res.send(response.data);
  } catch (err) {
    next(err);
  }
});

router.get('/api/stops', async function (req, res, next) {
  const {lat, lon, query} = req.query;

  try {
    const response = await axios({
      url: `https://external.transitapp.com/v3/public/search_stops?lat=${lat}&lon=${lon}&query=${query}&max_num_results=10`,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'apiKey': process.env.API_KEY,
      }
    });

    res.send(response.data);
  } catch (err) {
    next(err);
  }
});

router.get('/images/:name.svg', function (req, res) {
  const name = req.params.name;
  const filename = name + '-mono.svg';
  const url = 'https://transitapp-data.com/images/svgx/' + filename;

  res.redirect(url);
});


router.get('/', function(req, res) {
    res.render('widget');
});

module.exports = router;


function getRGB(color) {
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);

  return 'rgb(' + r + ', ' + g + ', ' + b + ')';
}
