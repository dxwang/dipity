angular.module('serendipity', ['ionic'])

.controller('serendipityCtrl', function($scope, $ionicModal, $ionicActionSheet){
    
    var initializeMap = function(){
        $scope.map = new google.maps.Map(document.querySelector('#map'), {center: new google.maps.LatLng(-33.8668283734, 151.2064891821),
        zoom: 15});
        $scope.places = new google.maps.places.PlacesService($scope.map);
        $scope.distances = new google.maps.DistanceMatrixService();
        $scope.direction = new google.maps.DirectionsService();
        $scope.mapRender = new google.maps.DirectionsRenderer();
        $scope.mapRender.setMap($scope.map);
    }

    google.maps.event.addDomListener(window, 'load', initializeMap);

    $scope.startLocation = '';
    $scope.thaplace = null;
    $scope.input = 'Food';
    $scope.isLoading = false;
    $scope.date = new Date();

    if ($scope.date.getHours() >= 7 && $scope.date.getHours() <= 19){
        document.body.style.backgroundImage = 'url(img/bg_day.jpg)';
    } else {
        document.body.style.backgroundImage = 'url(img/bg.jpg)';
    }
    
    $scope.getSunriseSunset = function(location){
        var xhReq = new XMLHttpRequest();
        var reqObj = {
            url: 'http://www.earthtools.org/sun/',
            latitude: location.latitude + '/',
            longitude: location.longitude + '/',
            date: $scope.date.getDate() + '/',
            month: $scope.date.getMonth() + '/',
            offset: $scope.date.getTimezoneOffset() + '/'
        }
        var reqArray = []
        for (var key in reqObj) {
            reqArray.push(reqObj[key]);
        }
        reqArray.push('true/');
        xhReq.open("GET", reqArray.join(''), false);
        xhReq.send(null);
        console.log(xhReq.responseText);

    }

    $scope.calcScore = function(placeObj, weights){
        weights = weights || {
            distance: 0.65,
            rating: 0.29,
            price: 0.01,
            xfactor: 0.05
        };
        var scores = {
            distance: 1 / (placeObj.distance * 4 + 1),
            rating: 1 / Math.pow((6 - placeObj.rating), 2),
            price: (3 - placeObj.price) / 2,
            xfactor: Math.random()
        };
        var totalScore = 0;
        for (var key in scores){
            totalScore += scores[key] * weights[key];
        }
        return totalScore;
    };

    $scope.getDirections = function(){
        var routeReq = {
            origin: $scope.startLocation.latitude + ',' + $scope.startLocation.longitude,
            destination: $scope.thaplace.location,
            travelMode: google.maps.TravelMode.WALKING
        }
        var routeCallback = function(result, status){
            if (status == google.maps.DirectionsStatus.OK) {
                $scope.mapRender.setDirections(result);
            }
            $scope.isLoading = false;
            $scope.$apply();
            document.querySelector('body').setAttribute('class', 'body-wrapper');
            google.maps.event.trigger($scope.map, "resize");
            $scope.map.setCenter($scope.thaplace.location);
            
        };
        $scope.direction.route(routeReq, routeCallback);
        console.log($scope.thaplace);
    };

    $scope.parseGoogleResponse = function(results){
        var locations = [];
        for (var i=0;i<results.length;i++){
        	locations.push(results[i].geometry.location);
        }
        var distanceReq = {
            origins: [$scope.startLocation.latitude + ',' + $scope.startLocation.longitude],
            destinations: locations,
            travelMode: google.maps.TravelMode.WALKING,
            unitSystem: google.maps.UnitSystem.METRIC
        };

        var distanceCallback = function(distanceResults, status){
        	if (status == google.maps.DistanceMatrixStatus.OK){
        		for (var i=0;i<results.length;i++){
        			var placeObj = {
        				name: results[i].name,
        				rating: results[i].rating || 3.5,
        				price: results[i].price_level || 4,
        				distance: distanceResults.rows[0].elements[i].distance.value,
                        duration: distanceResults.rows[0].elements[i].duration.value,
                        location: results[i].geometry.location
        			}
           			placeObj['score'] = $scope.calcScore(placeObj);
        			if ($scope.thaplace === null || placeObj['score'] > $scope.thaplace.score){
            			$scope.thaplace = placeObj;
            		} 
        		}
                $scope.getDirections();
	        } else {
	        	console.warn('Error with distanceMatrix');
	        }
        }
        $scope.distances.getDistanceMatrix(distanceReq, distanceCallback);
        
    };

    $scope.restart = function(){
        document.querySelector('body').setAttribute('class', '');
        $scope.thaplace = null;
    }

    $scope.searchQuery = function(searchText){
    	$scope.thaplace = null;
        $scope.isLoading = true;
        var searchReq = {
            query: searchText,
            radius: 5000,
            openNow: true
        };

        var searchCallback = function(results, status){
        	if (status == google.maps.places.PlacesServiceStatus.OK){
        		$scope.parseGoogleResponse(results);
            } else {
                console.warn("Uh Oh Spaghettios!");
                $scope.isLoading = false;
                $scope.$apply();
            }
        };

        var locationOptions = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        };

        var locationSuccess = function(pos) {
            var coords = pos.coords;
            searchReq['location'] = new google.maps.LatLng(coords.latitude, coords.longitude);
            $scope.startLocation = coords;
            $scope.places.textSearch(searchReq, searchCallback);
        };

        var locationError = function(err) {
            console.warn('ERROR(' + err.code + '): ' + err.message);
            $scope.isLoading = false;
            $scope.$apply();
        };
        navigator.geolocation.getCurrentPosition(locationSuccess, locationError, locationOptions);
    };
});