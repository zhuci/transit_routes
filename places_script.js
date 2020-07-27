
// This example requires the Places library. Include the libraries=places
// parameter when you first load the API. For example:
// <script
// src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places">

function initMap() {
  var map = new google.maps.Map(document.getElementById("map"), {
  mapTypeControl: false,
  center: { lat: 40.7305,
  lng: -73.9091 },
  zoom: 13
  });

  new AutocompleteDirectionsHandler(map);
}

/**
* @constructor
*/
function AutocompleteDirectionsHandler(map) {
  this.map = map;
  this.originPlaceId = null;
  this.destinationPlaceId = null;
  this.travelMode = 'TRANSIT';
  this.directionsService = new google.maps.DirectionsService;
  this.directionsRenderer = new google.maps.DirectionsRenderer;
  this.directionsRenderer.setMap(map);
  this.directionsRenderer.setPanel(document.getElementById("right-panel"));

  //this.directionsResult = new google.maps.DirectionsResult;

  var originInput = document.getElementById('origin-input');
  var destinationInput = document.getElementById('destination-input');
  var modeSelector = document.getElementById('mode-selector');

  var originAutocomplete = new google.maps.places.Autocomplete(originInput);
  // Specify just the place data fields that you need.
  originAutocomplete.setFields(['place_id']);

  var destinationAutocomplete =
    new google.maps.places.Autocomplete(destinationInput);
  // Specify just the place data fields that you need.
  destinationAutocomplete.setFields(['place_id']);

  this.setupClickListener('changemode-walking', 'WALKING');
  this.setupClickListener('changemode-transit', 'TRANSIT');
  this.setupClickListener('changemode-driving', 'DRIVING');

  this.setupPlaceChangedListener(originAutocomplete, 'ORIG');
  this.setupPlaceChangedListener(destinationAutocomplete, 'DEST');

  this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(originInput);
  this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(
    destinationInput);
  this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(modeSelector);
}

// Sets a listener on a radio button to change the filter type on Places
// Autocomplete.
AutocompleteDirectionsHandler.prototype.setupClickListener = function(
id, mode) {
  var radioButton = document.getElementById(id);
  var me = this;

  radioButton.addEventListener('click', function() {
  me.travelMode = mode;
  me.route();
  loopAllRoutes();
});
};

AutocompleteDirectionsHandler.prototype.setupPlaceChangedListener = function(
autocomplete, mode) {
  var me = this;
  autocomplete.bindTo('bounds', this.map);

  autocomplete.addListener('place_changed', function() {
  var place = autocomplete.getPlace();

  if (!place.place_id) {
    window.alert('Please select an option from the dropdown list.');
    return;
  }
  if (mode === 'ORIG') {
    me.originPlaceId = place.place_id;
  } else {
    me.destinationPlaceId = place.place_id;
  }
  me.route();
  loopAllRoutes();
});
};

/*
// subway as transit priority
let transitOpt = 'transitOptions: {
modes: ['SUBWAY'],
}'
console.log(transitOpt)
//  routingPreference: 'FEWER_TRANSFERS'
*/
let all_route_data = [];

AutocompleteDirectionsHandler.prototype.route = function() {
  if (!this.originPlaceId || !this.destinationPlaceId) {
    return;
  }
  var me = this;

  if(this.travelMode == 'TRANSIT')
  {
  this.directionsService.route(
      {
        origin: {'placeId': this.originPlaceId},
        destination: {'placeId': this.destinationPlaceId},
        travelMode: this.travelMode,
        transitOptions: {
          modes: ['SUBWAY'],
          routingPreference: 'FEWER_TRANSFERS'
        },
        provideRouteAlternatives: true
      },
      function(response, status) {
        if (status === 'OK') {
          me.directionsRenderer.setDirections(response);
          //exportToJsonFile(response.routes)
          //console.log(me.directionsRenderer.getDirections())

          all_route_data = response.routes
          loopAllRoutes();
          //console.log(all_route_data)
          //console.log(all_route_data[0].legs[0].steps[1].transit.arrival_stop.location.lat);
        } else {
          window.alert('Directions request failed due to ' + status);
        }
      });
  } else {
    this.directionsService.route(
        {
          origin: {'placeId': this.originPlaceId},
          destination: {'placeId': this.destinationPlaceId},
          travelMode: this.travelMode,
          provideRouteAlternatives: true
        },
        function(response, status) {
          if (status === 'OK') {
            me.directionsRenderer.setDirections(response);
            //exportToJsonFile(response.routes)
            //console.log(me.directionsRenderer.getDirections())
            //console.log(response.routes)
          } else {
            window.alert('Directions request failed due to ' + status);
          }
        });
  }
};



/*
function exportToJsonFile(jsonData) {
  let dataStr = JSON.stringify(jsonData);
  let dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

  let exportFileDefaultName = 'data.json';

  let linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
} */

function loopAllRoutes() { //find risk for all routes in a request
  route_risk = [];
  for (let i =0; i < all_route_data.length; i ++) {
    console.log(loopAllRoutes);
    let curRoute = all_route_data[i];
    let curRisk = calcRouteRisk(curRoute.legs[0].steps);
    route_risk.push(curRisk)
  }
  console.log(route_risk)
  return route_risk;

}



function calcRouteRisk(routeSteps) {
  let step_risk = []; //only for transit steps based on departure and arrival stations
  for (let i = 0; i <  routeSteps.length; i ++) //routeSteps = all_route_data[i].legs[0].steps
  {
    if(routeSteps[i].travel_mode == 'TRANSIT')
    {
      console.log("calc_route_risk called")
      let departure_lng = routeSteps[i].transit.departure_stop.location.lat();
      let departure_lat = routeSteps[i].transit.departure_stop.location.lat();
      let arrival_lng = routeSteps[i].transit.arrival_stop.location.lng();
      let arrival_lat = routeSteps[i].transit.arrival_stop.location.lat();

      let departure_unit = findStationUnit(departure_lng, departure_lat);
      let arrival_unit = findStationUnit(arrival_lng, arrival_lat);

      let departure_risk = findStationRisk(departure_unit)
      let arrival_risk = findStationRisk(arrival_unit)

      let this_step_risk = departure_risk + arrival_risk;
      step_risk.push(this_step_risk)
    }

  }
  let total_route_risk = step_risk.reduce(function(a, b){
        return a + b;
    }, 0);
  console.log('total route risk:' + total_route_risk)
  return total_route_risk;
}


function haversine_distance(lng1, lat1, lng2, lat2) { //dist btw 2 lng lat
    var R = 3958.8; // Radius of the Earth in miles
    var rlat1 = lat1 * (Math.PI/180); // Convert degrees to radians
    var rlat2 =  lat2 * (Math.PI/180); // Convert degrees to radians
    var difflat = rlat2-rlat1; // Radian difference (latitudes)
    var difflon = (lng2 - lng1) * (Math.PI/180); // Radian difference (longitudes)

    var d = 2 * R * Math.asin(Math.sqrt(Math.sin(difflat/2)*Math.sin(difflat/2)+Math.cos(rlat1)*Math.cos(rlat2)*Math.sin(difflon/2)*Math.sin(difflon/2)));
    return d;
  }

function indexOfSmallest(a) {
   var lowest = 0;
   for (var i = 1; i < a.length; i++) {
    if (a[i] < a[lowest]) lowest = i;
   }
   return lowest;
  }

function findStationUnit(lng,lat) {
  //let processed_stat = station.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, '').toUpperCase();
  //processed_stat = processed_stat.replace("STATION","").replace("SUBWAY","" ).replace("CIRCLE","").replace("STREET","ST").replace("SQUARE","SQ");
  //processed_stat = processed_stat.replace("OF","").replace("NATURAL","").replace("HISTORY","");

  let unit = "";
  let all_distances = [];
  let min_dist_index = 0;
  // reading csv with unit -> station name data
  d3.csv("mta_station_info.csv").then(function(data) {
    //console.log("this mta_station_info.csv");
    let unit_data = [];
    data.forEach(function(i){
      unit_data.push({remote:String(i.Unit),
        station:String(i.Station),
        lng:Number(i.Station_Long),
        lat:Number(i.Station_Lat)
      });
      //console.log("test lng" + unit_data[0].lng)
    });


    for(let i = 0; i < unit_data.length; i ++) //unit_data.length
    {
      //let temp_stat = unit_data[i].station;
      //let temp_pro_stat = temp_stat.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, '').toUpperCase();
      //temp_pro_stat = temp_pro_stat.replace("STATION","").replace("SUBWAY","" ).replace("CIRCLE","").replace("STREET","ST").replace("SQUARE","SQ");
      //temp_pro_stat = temp_pro_stat.replace("OF","").replace("NATURAL","").replace("HISTORY","");
      let dist = haversine_distance(unit_data[i].lng, unit_data[i].lat, lng, lat);
      //console.log("calc dist " +dist);
      all_distances.push(dist);
    }
    min_dist_index = indexOfSmallest(all_distances);
    unit = unit_data[min_dist_index].remote;
    //match_units = [...new Set(match_units)];
    console.log("min dist ind " + min_dist_index + " " + unit);
    console.log(unit);
    return(unit);
  });

}


let test_unit = findStationUnit(-73.990688, 40.707222)
let test_risk = findStationRisk(test_unit);

console.log(test_unit ,  test_risk)

function findStationRisk(unit) {
  //let unitArr = findStationUnit("CANAL ST");
  let daysOfWeek = ['Sun','Mon','Tues','Wed','Thurs','Fri','Sat'];
  var d = new Date();
  var n = d.getDay()
  let day = daysOfWeek[n];
  //let unit_risks = [];
  let risk = 0.0;

  d3.csv("normalized_pres_week.csv").then(function(data) {
    let norm_data = [];
    data.forEach(function(i){
      norm_data.push({
        remote:String(i.Unit),
        Sun:Number(i.Sun_Norm),
        Mon:Number(i.Mon_Norm),
        Tues:Number(i.Tues_Norm),
        Wed:Number(i.Wed_Norm),
        Thurs:Number(i.Thurs_Norm),
        Fri:Number(i.Fri_Norm),
        Sat:Number(i.Sat_Norm)
      });

    });

    //for(let i = 0; i < norm_data.length; i ++) //unit_data.length
    //{
      for(let j = 0; j < norm_data.length; j ++) {
        //console.log(unit == norm_data[j].remote)
        //console.log(risk);
        if(unit == norm_data[j].remote) {
          if (day=="Sun") {
            risk = norm_data[j].Sun;
          }
          else if(day=="Mon") {
            risk = norm_data[j].Mon;
          }
          else if (day=="Tues") {
            risk = norm_data[j].Tues;
          }
          else if (day=="Wed") {
            risk = norm_data[j].Wed;
          }
          else if (day=="Thurs") {
            risk = norm_data[j].Thurs;
          }
          else if (day=="Fri") {
            risk = norm_data[j].Fri;
          }
          else if (day=="Sat") {
            risk = norm_data[j].Sat;
          }
        }
      }
    //}
    //console.log(unitArr);
    //console.log(unit_risks);

    /*
    if(unit_risks.length > 1) {
      let sum = unit_risks.reduce(function(a, b){
            return a + b;
        }, 0);
      risk = sum / unit_risks.length
    } else {
      risk = unit_risks[0];
    } */
    //console.log(risk);
    console.log('station risk:' + risk)
    return(risk);
  });

}
