var mapbox = require('mapbox-gl');
var secrets = require('./secrets.json');
var Mapbox = require('mapbox-gl');
var Map = require('mapbox-gl/js/ui/Map');

Mapbox.accessToken = secrets.MAPBOX_ACCESS_TOKEN;

var map = new Map({
  container: 'map',
  zoom: 12.5,
  center: [38.888, -77.01866], // Washington, DC
  style: 'https://www.mapbox.com/mapbox-gl-styles/styles/bright-v7.json',
  hash: true,
  preserveDrawingBuffer: true
});

setTimeout(function() {
	var dataURL = map.getCanvas().toDataURL();
	window.open(dataURL,'_blank');
}, 5000);