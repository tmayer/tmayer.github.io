//'use strict';

var bibApp = angular.module('tutorialApp', ['ngRoute','ngSanitize']);

var xliffdata = "";
var globalsegments = [];
var globalfilename = "";
var metadata = [];


bibApp.config(function($routeProvider) {
        $routeProvider.
          when('/', {
            templateUrl: 'templates/droparea.html',
            controller: 'DropCtrl'
          }).
          when('/list', {
            templateUrl: 'templates/list.html',
            controller: 'ArticlesCtrl'
          }).
          when('/info', {
            templateUrl: 'templates/info.html',
            controller: 'InfoCtrl'
          }).
          when('/:segmentid', {
            templateUrl: 'templates/detail.html',
            controller: 'ArticleCtrl'
          }).
          otherwise({
            redirectTo: '/'
          });
      });



bibApp.factory('segments', function($http){

var cachedData;

function getData(callback){
    /*
      if(xliffdata) {

        callback(xliffdata);
      } else {
      */
        //$http.get('CW50_ConveyorBelt AH_de-en_post_editing_part_3_1.xlf').success(function(data){
          data = xliffdata;          
          var lines = data.split('\n');
          verses = [];
          metadata = [];
          lines.forEach(function(line){
              // ignore comments
              if(line.indexOf('#') != 0){
                  // check whether line contains a TAB
                  if(line.indexOf('\t') > -1){
                      linesplit = line.split('\t',2);
                      var entry = {"ID": linesplit[0],"TEXT": linesplit[1]};
                      verses.push(entry);
                  }

              }
              else{
                metadata.push(line);
              }
          });

          segments = verses;
          cachedData = segments;
          globalsegments = verses;
          metadata = metadata;
          //console.log(cachedData);
          callback(segments);
        //});
      //}
    }

return {
  list: getData,
  find: function(id, callback){
    getData(function(data) {
      var segment = data.filter(function(entry){
        return entry.ID === id;
      })[0];
      //console.log(article);
      callback(segment);
    });
  }
};
});

bibApp.controller('ArticlesCtrl', function ($scope, segments){

    $scope.reverse = true;
    $scope.totalDisplayed = 20;
    $scope.currentPage = 1;
    $scope.pageSize = 10;

    $scope.loadMore = function () {
      $scope.totalDisplayed += 20;  
    };
    segments.list(function(segments) {
      $scope.segments = segments;
    });

    document.getElementById("nrsegments").innerHTML = globalsegments.length;
    document.getElementById("filenamebox").innerHTML = globalfilename;
});

bibApp.controller('ArticleCtrl', function ($scope, $routeParams, segments){
    $scope.segmentid = $routeParams.segmentid;
    segments.find($routeParams.segmentid, function(segment) {
      $scope.segment = segment;
    });
});

bibApp.controller('InfoCtrl', function ($scope, $routeParams, segments, $sce){
  $scope.info = metadata; //metadata;
  var fields = [];
  metadata.forEach(function(metaline){
    var cols = metaline.split(": ");
    fields.push([cols[0].substring(2),cols[1]]);
  });
  $scope.fields = fields;
  $scope.filename = filename;
});

bibApp.controller('DropCtrl', function ($scope, $window){

    // DRAG DROP FUNCTIONALITY
  function handleFileSelect(evt)
  {
    evt.stopPropagation();
    evt.preventDefault();

    
    var files = evt.dataTransfer.files;
    var file = files[0];
    var reader = new FileReader({async:false});
    var textarea = document.getElementById('dropzone');
    var readerres = "";
    var json;
    reader.onload = function(e){
      readerres = reader.result; 
      xliffdata = readerres;
      filename = file.name;
      globalfilename = filename
      $window.location.href = '#/list';
    };
    reader.readAsText(file);
    // redirect to list
    //$location.path("#/list");
  }

  function handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
  }

  var dropZone = document.getElementById('dropzone');
  dropZone.addEventListener('dragover',handleDragOver,false);
  dropZone.addEventListener('drop',handleFileSelect,false);


  // Note that I took the event string to bind to out of the jQuery.ui.js file.
  $('#dropzone').bind('mousedown.ui-disableSelection selectstart.ui-disableSelection', function(event) {
        event.stopImmediatePropagation();
  })



});

