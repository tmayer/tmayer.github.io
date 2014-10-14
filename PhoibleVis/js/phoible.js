//############### check for window width #########

if (window.innerWidth < 1000)  {
        $("#warningbox").css("display","block");
};

window.onresize = function(event) {

	if (window.innerWidth < 1000)  {
	        $("#warningbox").css("display","block");
	}
	else{
		$("#warningbox").css("display","none");
	}

}



//############### global variables ###############

var radSmall = 1.5;
var radFocus = 6;
var scaleFactor = 1;
var ew = 0, ns = 0;
var selLanguages = [];
var allLanguages = [];
var zoompan = false;
var radius;
var startFeature = ["n"];
var scaleType = "nominal";
var currfeature;
var changeScale = true;
var featurenames;
var lang2phonemes = {};
var feature = startFeature;
var segmentByFeatures = {};
var sunburstwidth = parseInt(d3.select('#sunburst').style('width'));
var languagedata;
var rellanguages;
var featuresBySegment;

//############### map projection settings ###############
var margin = {top: 10, left: 10, bottom: 80, right: 10}
  , width = parseInt(d3.select('#map').style('width'));

if(width > 580){ width = 580;}

var width = width - margin.left - margin.right
  , mapRatio = .8
  , height = width * mapRatio - margin.bottom;


var projection = //d3.geo.equirectangular() 
	// gall peters
	d3.geo.cylindricalEqualArea()
    .parallel(45)
	.scale(width/5)
    .translate([width / 2 , height / 2])
	.center([0,0])
	//.rotate([-140,0])
	.rotate([-153,0])
	;


$('#mapcontainer').css("height",function(){return height + 110;});

//############### make basic plot ###############
var svg = d3.select("#map").append("svg")
	.attr("width", width)
	.attr("height", height)
	.style('cursor',"crosshair")
	;
var g = svg.append("g");
var mapPoly = g.append('g').attr('class','mapPoly')
var macroAreas = g.append('g').attr('class','macroAreas');
var edgeArcs = g.append('g').attr('class','edgeArcs');
var overall = g.append('g').attr('class','overAll');

// define scales and projections
var path = d3.geo.path()
	.projection(projection);
var weightScale = d3.scale.linear()
	.domain([0,2,4,6,8])
	.range(['blue','green','yellow','orange','red']);

// load and display the World
d3.json("world-110m.json", function(error, topology) {
	var countrydata = topojson.object(topology,topology.objects.countries).geometries;
	mapPoly.selectAll("path")
		.data(topojson.object(topology, topology.objects.countries)
		.geometries)
		.enter()
		.append("path")
		.attr("d", path)
		.style("fill",function(d){
			return "#f0f0f0";
		 })
		.style('stroke','#ccc')
		.style('stroke-width',function(d){
			return 1/scaleFactor;
		})
		;
});


//############## Macro Areas ############

macroAreaFiles = [
["australiaNewGuinea.csv","blue"],
["africa.csv","red"],
["eurasia.csv","yellow"],
["northAmerica.csv","green"],
["southAmerica.csv","orange"],
["southEastAsia.csv","purple"],
["northAmerica2.csv","green"]
];

// go through all polygon files to draw them
macroAreaFiles.forEach(function(marea){

	d3.csv("data/" + marea[0],function(ausdata){
		var australiaNewGuinea = [];
		ausdata.forEach(function(a){
			australiaNewGuinea.push(projection([a.lat,a.lon]));
		});

	    // draw the polygon
	    macroAreas.selectAll('polygon2')
	        .data([australiaNewGuinea])
	        .enter()
	        .append("polygon")
	        .attr("points",function(d,i) {
	            //console.log(d);
	            return d.map(function(m){
	                return [m[0],m[1]].join(',');
	            }).join(" ");
	        })
	        .attr('fill',marea[1])
	        .attr('opacity',0.2)
	        .attr("stroke","black")
	        .attr("stroke-width",0.2)
	        ;
	});

});


//############### brushing ###############

var x = d3.scale.linear()
 .range([0, width])
 //.domain([-180,180])
 .domain([0, width])
 ;

var y = d3.scale.linear()
	.range([height, 0])
	//.domain([-90,90])
	.domain([height, 0])
	;

var brush = d3.svg.brush()
	.x(x)
	.y(y)
	.on("brush", brushed)
	;

function brushed2(){
		if(brush.empty()){
			selLanguages = allLanguages;
		}
		else{

			var e = brush.extent();

			  selLanguages = [];
			  d3.selectAll(".location").classed('brushhidden',function(d){
					//console.log(d);
					//return false;
					if( e[0][0] > projection([d.Longitude.replace(':','.'),d.Latitude.replace(':','.')])[0]
								|| projection([d.Longitude.replace(':','.'),d.Latitude.replace(':','.')])[0] > e[1][0]
						|| e[0][1] > projection([d.Longitude.replace(':','.'),d.Latitude.replace(':','.')])[1]
								|| projection([d.Longitude.replace(':','.'),d.Latitude.replace(':','.')])[1] > e[1][1]){

						return true;
					}
					else{
						selLanguages.push(d);
						return false;
					}
			  });
		}
}

function brushed(p) {
  //console.log(brush.extent());

  var e = brush.extent();
  if(brush.empty()){
	d3.selectAll(".location").classed('brushhidden', false);
	selLanguages = allLanguages;
	d3.select('#sunburst svg').remove();
	languagedata = selLanguages;
	sunburst();
  }
  else{
	  selLanguages = [];
	  d3.selectAll(".location").classed('brushhidden',function(d){
			//console.log(d);
			//return false;
			if( e[0][0] > projection([d.Longitude.replace(':','.'),d.Latitude.replace(':','.')])[0]
						|| projection([d.Longitude.replace(':','.'),d.Latitude.replace(':','.')])[0] > e[1][0]
				|| e[0][1] > projection([d.Longitude.replace(':','.'),d.Latitude.replace(':','.')])[1]
						|| projection([d.Longitude.replace(':','.'),d.Latitude.replace(':','.')])[1] > e[1][1]){

				return true;
			}
			else{
				selLanguages.push(d);
				return false;
			}
	  });
	  d3.select('#sunburst svg').remove();
	  languagedata = selLanguages;
	  sunburst();
  }

}

//############### get information about features for widget ###################
d3.tsv('data/phoible-segments-features.tsv').get(function (err, results){
	var phonfeatures = results;
	/* now manually in index.html
	var feattablecount = 0;
	for(var k in phonfeatures[0]){
		feattablecount += 1;
		if(feattablecount % 2 == 1){ $("#featureset").append("<div style='display: table-row'>");}
		$("#featureset").append("<div style='display: table-cell; width: 250px;'><input type='checkbox' name='" + k + "' id='" + k + "'> " + k + " </div>");
		if(feattablecount % 2 == 0){ $("#featureset").append("</div>");}
	}
	*/

	featurenames = [];
	for(var k in phonfeatures[0]){
		featurenames.push(k);
	}

	featuresBySegment = {};
	negFeaturesBySegment = {};

	phonfeatures.forEach(function(a){
		segmentByFeatures[a.segment] = a;

		featurenames.forEach(function(k){
			if(a[k] == "+"){
				if(k in featuresBySegment){
					featuresBySegment[k].push(a.segment);
				}
				else{
					featuresBySegment[k] = [a.segment];
				}
			}
			if(a[k] == "-"){
				if(k in negFeaturesBySegment){
					negFeaturesBySegment[k].push(a.segment);
				}
				else{
					negFeaturesBySegment[k] = [a.segment];
				}
			}
		});
	});

});


//############### get information about segments for drowdown menu ###############
d3.tsv('data/phoible-phonemes.tsv').get(function (err, results){

	var phonFreq = {};

	/* get the most frequent phonemes for the dropdown menu */
	results.forEach(function(a){
		if(a.Phoneme in phonFreq){
			phonFreq[a.Phoneme] += 1;
		}
		else{
			phonFreq[a.Phoneme] = 1;
		}

		// get language information
		if(a.Trump == 1){
			if(a.LanguageCode in lang2phonemes){
				lang2phonemes[a.LanguageCode].push(a.Phoneme);
			}
			else{
				lang2phonemes[a.LanguageCode] = [];
				lang2phonemes[a.LanguageCode].push(a.Phoneme);
			}
		}
	});

	freqPhonemes = [];
	for(var p in phonFreq){
		if(phonFreq[p] > 200){
			freqPhonemes.push(p);
		}
	}

	freqPhonemes = freqPhonemes.sort();

	
	/* feed the dropdown with the most frequent phonemes */
	var select = document.getElementById("featureselect");

	// add extra element for customized feature combination
	var el = document.createElement("option");
	el.textContent = "Feature combination";
	el.value = "combination";
	select.appendChild(el);

	freqPhonemes.forEach(function(a){
			var el = document.createElement("option");
			el.textContent = a;
			el.value = a;
			if(a == startFeature){el.selected = true;}
			select.appendChild(el);
		
	});

	

	loaddata(startFeature);

	// enable select picker
	$('.selectpicker').selectpicker({
      style: 'btn-default btn-sm',
      size: 20,
      width: 170//'auto'
  	});

	/*
  	$('.selectpickerFeatures').selectpicker({
      style: 'btn-primary btn-xs',
      size: 3,
      width: 40//'auto'
  	});
	*/
	
}); /* end load phoneme data */


//############### load data ###############
function loaddata(feature){


	var nodeCircles = g.append('g').attr('class','nodeCircles');
	walsByInfo = {};

	d3.selection.prototype.moveToFront = function() {
	  return this.each(function(){
	  this.parentNode.appendChild(this);
	  });
	};



	/* select respective features in the feature table */
	if(feature.length == 1){
		var currsegment = segmentByFeatures[feature[0]];
		for(var k in currsegment){
			//console.log(k);
			if(currsegment[k] == "+"){
				//$("#" + k).prop('checked', true);
				document.getElementById(k).selectedIndex = "1";
				d3.select("#" + k + "Label").classed("plus",true);
			}
			else if(currsegment[k] == "-"){
				document.getElementById(k).selectedIndex = "2";
				d3.select("#" + k + "Label").classed("minus",true);
			}
		}
	}

	d3.select("#segmentshow").html("Segment(s) showing this feature combination: <br>" + feature.join(", "));



	/* get language information from aggregated file */
	d3.tsv('data/phoible-aggregated.tsv').get(function (err, langdata) {


		allLanguages = langdata.filter(function(a){return a.Trump == 1; });

		//rellanguages = allLanguages.filter(function(a){ return lang2phonemes[a.LanguageCode].indexOf(feature) != -1; });
		rellanguagesdict = {};
		allLanguages.forEach(function(a){
			feature.forEach(function(f){
				if(lang2phonemes[a.LanguageCode].indexOf(f) != -1){
					rellanguagesdict[a.LanguageCode] = 1;
				}
			});
		});

		rellanguages = [];
		for(var k in rellanguagesdict){
			rellanguages.push(k);
		}

		$("#featurenotice").text(rellanguages.length + " out of " + allLanguages.length + " languages show this feature combination");

		//############### plot locations ###############
		nodeCircles.selectAll("path")
			.data(allLanguages)
			.enter()
			.append("circle")
			.attr('class',function(d){
				walsByInfo[d['LanguageCode']] = d['LanguageName'] + " [" + d['LanguageCode'] + "] "
					+ d['LanguageFamilyGenus']
					+ ", " + d['Country'] + "";
				return 'location loc_' + d['LanguageCode'] + " loc_fam_" + d["LanguageFamilyRoot"].replace(/[-\s]/g,'_') + 
					" loc_gen_" + d['LanguageFamilyGenus'].replace(/[-\s]/g,'_') + 
					" loc_con_" + d.Area.replace(/[-\s]/g,'_');
			})
			.attr('cx',function(d){
				//console.log(d.Longitude,d.Latitude)
				return projection([d.Longitude.replace(':','.'), d.Latitude.replace(':','.')])[0];
			})
			.attr('cy', function(d){
				return projection([d.Longitude.replace(':','.'), d.Latitude.replace(':','.')])[1];
			})
			.attr('r', function(d){
				return radSmall/scaleFactor;
			})
			.style("fill", function(d){
				if(rellanguages.indexOf(d.LanguageCode) != -1){
					return "steelblue";
				}
				else{
					return "Orange";
				}
			})
			.style("stroke","black")
			.style("stroke-width", function(){ return 0.1/scaleFactor;})
			.style("cursor","pointer")
			.on("mouseover",function(d){


				d3.selectAll(".iteminfo").text(walsByInfo[d['LanguageCode']]);

				$(".infoicon").css("color",function(){
					return rellanguages.indexOf(d.LanguageCode) != -1 ? "steelblue" : "Orange";
				})
				.css("display","inline")
				;


				// sunburst interaction
				dname = d.LanguageCode;
				if(dname in langByFam){
					d3.selectAll('.sun_fam_' + langByFam[dname].replace(/[-\s]/g,'_'))
							.style('fill','#444')
						;
				}
				if(dname in langByGen){
					d3.selectAll('.sun_gen_' + langByGen[dname].replace(/[-\s]/g,'_'))
							.style('fill','#444')
						;
				}
				if(dname in langByCont){
					d3.selectAll(".sun_con_" + langByCont[dname].replace(/[-\s]/g,'_'))
						.style("fill","#444")
					;
				}
				if(dname.length == 3){
					d3.selectAll('.sun_' + dname)
						.style("fill",'#444');
				}




			})
			.on("mouseout",function(d){


				d3.selectAll(".iteminfo").html('&nbsp;');

				d3.selectAll('.sun')
					.style('fill',function(e){
						return e.children ? '#ccc' : rellanguages.indexOf(e.name) != -1 ? "steelblue" : "Orange";
					})
				;

				$(".infoicon").css("display","none");
			})
			;

		// get selection from brush

		brushed2();

		/* call sunburst generation */
		languagedata = selLanguages;
		sunburst();

	});



}; /* end loading language data */

overall.append("g").attr("class","brush").call(brush);

/* Sunburst creation */
function sunburst(){

		//############### construct genealogy ###############
		langByFam = {};
		langByGen = {};
		genByFam = {};
		upperByLower = {};
		fam = {};		
		continents = {};
		contByFam = {};
		langByCont = {};
		famByCont = {};
		genByCont = {};

		languagedata.forEach(function(d){
			d.family in upperByLower ? upperByLower[d.LanguageFamilyRoot].push(d.LanguageFamilyGenus) : upperByLower[d.LanguageFamilyRoot] = [d.LanguageFamilyGenus];
			d.genus in upperByLower ? upperByLower[d.LanguageFamilyGenus].push(d['LanguageCode']) : upperByLower[d.LanguageFamilyGenus] = [d['LanguageCode']];
			var currcont = d.Area;
			contByFam[currcont] = d.LanguageFamilyGenus;

			langByCont[d['LanguageCode']] = currcont;
			langByGen[d['LanguageCode']] = d.LanguageFamilyGenus;
			langByFam[d['LanguageCode']] = d.LanguageFamilyRoot;
			genByFam[d.LanguageFamilyGenus] = d.LanguageFamilyRoot;
			famByCont[d.LanguageFamilyRoot] = currcont;
			genByCont[d.LanguageFamilyGenus] = currcont;

			if(continents[currcont]){
				if(continents[currcont][d.LanguageFamilyRoot]){
					if(continents[currcont][d.LanguageFamilyRoot][d.LanguageFamilyGenus]){
						continents[currcont][d.LanguageFamilyRoot][d.LanguageFamilyGenus].push(d['LanguageCode']);
					}
					else{ // genus not in family yet
						continents[currcont][d.LanguageFamilyRoot][d.LanguageFamilyGenus] = [];
						continents[currcont][d.LanguageFamilyRoot][d.LanguageFamilyGenus].push(d['LanguageCode']);
					}
				}
				else{ // family not in continent yet
					continents[currcont][d.LanguageFamilyRoot] = {};
					continents[currcont][d.LanguageFamilyRoot][d.LanguageFamilyGenus] = [];
					continents[currcont][d.LanguageFamilyRoot][d.LanguageFamilyGenus].push(d['LanguageCode']);
				}

			}
			else{ // continent not yet available
				continents[currcont] = {};
				continents[currcont][d.LanguageFamilyRoot] = {};
				continents[currcont][d.LanguageFamilyRoot][d.LanguageFamilyGenus] = [];
				continents[currcont][d.LanguageFamilyRoot][d.LanguageFamilyGenus].push(d['LanguageCode']);
			}


		});

		/* construct hierarchy */
		fam['name'] = 'root'
		fam['children'] = [];

		for(var contkey in continents){
			var newCont = {};
			newCont['name'] = "con_" + contkey;
			newCont['children'] = [];
			for(var famkey in continents[contkey]){
				var newFam = {};
				newFam['name'] = 'fam_' + famkey;
				newFam['children'] = [];
				for(var genkey in continents[contkey][famkey]){
					var newGen = {};
					newGen['name'] = 'gen_' + genkey;
					var childrenGen = [];
					for(var i=0;i<continents[contkey][famkey][genkey].length;i++){
						var newLang = {};
						newLang['name'] = continents[contkey][famkey][genkey][i];
						newLang['size'] = 1;
						childrenGen.push(newLang);
					}
					newGen['children'] = childrenGen;
					newFam['children'].push(newGen);
				}
				newCont['children'].push(newFam);
			}
			fam['children'].push(newCont);
		}


		//############# CONSTRUCT SUNBURST #############

		//var width = 550,
		//sunburstwidth = parseInt(d3.select('#sunburst').style('width'));
	    sunburstheight = sunburstwidth,
	    radius = Math.min(sunburstwidth-30, sunburstheight-30) / 2;

	    $('#sunburstcontainer').css("height",function(){return sunburstheight + 130;});

		var xscale = d3.scale.linear()
		    .range([0, 2 * Math.PI]);

		var yscale = d3.scale.sqrt()
		    .range([0, radius]);

		var color = d3.scale.category20c();

		var svg = d3.select("#sunburst").append("svg")
			.attr('class',"sunburstsvg")
		    .attr("width", sunburstwidth)
		    .attr("height", sunburstheight)
		  	.append("g")
		    .attr("transform", "translate(" + sunburstwidth / 2 + "," + (sunburstheight / 2 + 10) + ")");

		var partition = d3.layout.partition()
		    .value(function(d) { return 1; });


		var arc = d3.svg.arc()
		    .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, xscale(d.x))); })
		    .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, xscale(d.x + d.dx))); })
		    .innerRadius(function(d) { return Math.max(0, yscale(d.y)); })
		    .outerRadius(function(d) { return Math.max(0, yscale(d.y + d.dy)); });


		  var g = svg.datum(fam).selectAll("path")
		      .data(partition.nodes)
		    .enter().append("g");

		    var path = g.append("path")
		      .attr("d", arc)
			  .attr('class',function(d){
				  //console.log(d);
					return "sun sun_" + d.name.replace(/[-\s]/g,'_');

			  })
		      .style("cursor","pointer")
			  .style("stroke", "#fff")
		      .style("fill", function(d) {
		      	//return color((d.children ? d : d.parent).name);
		      	//console.log(d);
		      	return d.children ? '#ccc' : rellanguages.indexOf(d.name) != -1 ? "steelblue" : "Orange";
		      })
			  .style("fill-rule", "evenodd")
			  .on('mouseover',function(d){
				//console.log(d);

				d3.selectAll('.location').classed('hidden',true);

				d3.selectAll(".loc_" + d.name)
					.attr('r',function(){
						return radSmall/scaleFactor;
					})
					.style("stroke-width",function(){
						return 0.2/scaleFactor;
					})
					.classed('hidden',false)
					;

				var sel = d3.select(".loc_" + d.name);
				sel.moveToFront();


				if(d.name.length == 3){
					outname = walsByInfo[d.name];
				}
				else{
					outname = d.name.substring(4);
				}


				d3.selectAll('.sun_' + d.name.replace(/[-\s]/g,'_'))
					.style('fill',function(d){
						return d.children ? '#444' : rellanguages.indexOf(d.name) != -1 ? "steelblue" : "Orange";
					})
					;

				//console.log(d.name,langByFam[d.name],langByGen[d.name],genByFam[d.name]);
				if(d.name in langByCont){
					d3.selectAll('.sun_con_' + langByCont[d.name].replace(/[-\s]/g,'_'))
						.style('fill','#444')
					;
				}
				if(d.name in langByFam){
					d3.selectAll('.sun_fam_' + langByFam[d.name].replace(/[-\s]/g,'_'))
							.style('fill','#444')
						;
				}
				if(d.name in langByGen){
					d3.selectAll('.sun_gen_' + langByGen[d.name].replace(/[-\s]/g,'_'))
							.style('fill','#444')
						;
				}
				if(outname in genByFam){
					d3.selectAll('.sun_fam_' + genByFam[outname].replace(/[-\s]/g,'_'))
							.style('fill','#444')
						;
				}
				if(outname in famByCont){
					d3.selectAll('.sun_con_' + famByCont[outname].replace(/[-\s]/g,'_'))
						.style("fill","#444")
					;
				}
				if(outname in genByCont){
					d3.selectAll(".sun_con_" + genByCont[outname].replace(/[-\s]/g,'_'))
						.style("fill","#444")
					;
				}


				// sunburst info box

				d3.selectAll(".iteminfo")
					.text(outname)
					;

				if(outname != ""){

					$(".infoicon")
						.css("color",function(){
							return d.children ? "#444" : rellanguages.indexOf(d.name) != -1 ? "steelblue" : "Orange";
						})
						.css("display","inline")
						;

				}
				var iconcolor = d.children ? "#444" : rellanguages.indexOf(d.name) != -1 ? "steelblue" : "Orange";
				tooltip.show('<i class="fa fa-square" style="color: ' + iconcolor + '"></i><span style="text-transform: capitalize;"> ' + outname + "</span>");



			  })
			  .on('mouseout',function(d){
				d3.selectAll(".location")
					.attr('r',function(){
						return radSmall/scaleFactor;
					})
					.style("stroke-width",function(){
						return 0.2/scaleFactor;
					})
					;

				d3.selectAll('.location').classed('hidden',false);



				d3.selectAll('.sun')
					.style('fill',function(d){
						return d.name == "root" ? "#999" : d.children ? "#ccc" : rellanguages.indexOf(d.name) != -1 ? "steelblue" : "Orange";
					})
				;

				d3.selectAll(".iteminfo")
					.html("&nbsp;");

				$(".infoicon").css("display","none");

				tooltip.hide();

			  })
		      .on("click", click)
		      ;




		  function click(d) {
		    var pathtr = path.transition()
		      .duration(750)
		      .attrTween("d", arcTween(d));


		  }



		// Interpolate the scales!
		function arcTween(d) {
		  var xd = d3.interpolate(xscale.domain(), [d.x, d.x + d.dx]),
		      yd = d3.interpolate(yscale.domain(), [d.y, 1]),
		      yr = d3.interpolate(yscale.range(), [d.y ? 20 : 0, radius]);
		  return function(d, i) {
		    return i
		        ? function(t) { return arc(d); }
		        : function(t) { xscale.domain(xd(t)); yscale.domain(yd(t)).range(yr(t)); return arc(d); };
		  };
		}



};



//############### listener to feature selection ###############
//d3.select('#features').on('change',function(){
	$('.selectpicker').on('change',function(){
	feature = [this.value];
	d3.select('.nodeCircles').remove();
	d3.select('#legend svg').remove();
	d3.select('#sunburst svg').remove();
	loaddata(feature);
})
;



function redrawMap(){
	g.transition()
		.duration(750)
		.attr("transform","translate(" + ew + "," + ns + ")scale("+scaleFactor+")");


    g.selectAll("circle")
        .attr("d", path.projection(projection))
        .attr("r",function(d){
            return radSmall/scaleFactor;
        })
        .style('stroke-width',function(d){
            return 0.2/scaleFactor;
        })
    ;

    g.selectAll("path")
        .attr("d", path.projection(projection))
        .style('stroke-width',function(d){
            return 1/scaleFactor;
        });

}

function resizeMap(){
	g.transition()
		.duration(750)
		.attr("transform","translate(0,0)scale("+scaleFactor+")");


    g.selectAll("circle")
        .attr("d", path.projection(projection))
        .attr("r",function(d){
            return radSmall/scaleFactor;
        })
        .style('stroke-width',function(d){
            return 0.2/scaleFactor;
        })
    ;

    g.selectAll("path")
        .attr("d", path.projection(projection))
        .style('stroke-width',function(d){
            return 1/scaleFactor;
        });
}

 d3.select("#bigger").on('click',function(){
 	scaleFactor <= 4.9 ? scaleFactor += 0.8 : scaleFactor = 5;
 			ew -= 200/scaleFactor;
 			ns -= 200/scaleFactor;
	            redrawMap();

 })
 ;

  d3.select("#smaller").on('click',function(){
  	if(scaleFactor != 1){
 		scaleFactor >= 1.1 ? scaleFactor -= 0.8 : scaleFactor = 1;

 			ew += 100*scaleFactor;
 			ns += 100*scaleFactor;

	            redrawMap();
	}

 })
 ;

  d3.select("#west").on('click',function(){
  		ew += 100;
 		redrawMap();
 })
 ;

   d3.select("#east").on('click',function(){
 		ew -= 100;
 		redrawMap();
 })
 ;

   d3.select("#north").on('click',function(){
 		ns += 100;
 		redrawMap();
 })
 ;

   d3.select("#south").on('click',function(){
 		ns -= 100;
 		redrawMap();
 })
 ;

    d3.select("#biggerDots").on('click',function(){
 		radSmall += 0.5;
 		redrawMap();
 })
 ;

     d3.select("#smallerDots").on('click',function(){
 		radSmall -= 0.5;
 		redrawMap();
 })
 ;


 d3.select("#zoomtofit").on("click",function(d){
 	  var bounds = brush.extent();

 	  //console.log(bounds);
  var dx = bounds[1][0] - bounds[0][0],
      dy = bounds[1][1] - bounds[0][1],
      x = (bounds[0][0] + bounds[1][0]) / 2,
      y = (bounds[0][1] + bounds[1][1]) / 2,
      scale = .9 / Math.max(dx / width, dy / height),
      translate = [width / 2 - scale * x, height / 2 - scale * y - 50];

  g.transition()
      .duration(750)
      .style("stroke-width", 1.5 / scale + "px")
      .attr("transform", "translate(" + translate + ")scale(" + scale + ")");


	 scaleFactor = scale;
	 ew = translate[0];
	 ns = translate[1];
	  g.selectAll("circle")
	                 .attr("d", path.projection(projection))
	                 .attr("r",function(d){
	                     return radSmall/scaleFactor;
	                 })
	                 .style('stroke-width',function(d){
	                     return 0.2/scaleFactor;
	                 })
	             ;
	 g.selectAll("path")
	     .attr("d", path.projection(projection))
	     .style('stroke-width',function(d){
	         return 1/scaleFactor;
	     });

});

d3.select('#resetmap').on('click',function(a){
 g.transition()
 .duration(750)
 .attr('transform','translate(0,0)');
 scaleFactor = 1;
 ew = 0, ns = 0;
 g.selectAll("circle")
                 .attr("d", path.projection(projection))
                 .attr("r",function(d){
                     return radSmall/scaleFactor;
                 })
                 .style('stroke-width',function(d){
                     return 0.1/scaleFactor;
                 })
             ;
 g.selectAll("path")
     .attr("d", path.projection(projection))
     .style('stroke-width',function(d){
         return 1/scaleFactor;
     });

});



d3.select('#showmacroareas').on('click',function(a){
	if($(".macroAreas").css("visibility") == "hidden"){
		$(".macroAreas").css("visibility","visible");
		$("#showmacroareas").attr("class","btn btn-danger btn-xs");
	}
	else{
		$(".macroAreas").css("visibility","hidden");
		$("#showmacroareas").attr("class","btn btn-primary btn-xs");
	}
});

/* make sunburst smaller */
d3.select("#smallersunburst").on('click',function(a){
	sunburstwidth -= 100;
	d3.select(".sunburstsvg").remove();
	sunburst();
});

/* make sunburst bigger */
d3.select("#biggersunburst").on('click',function(a){
	sunburstwidth += 100;
	d3.select(".sunburstsvg").remove();
	sunburst();
});

/* update feature combination */
d3.select('#featuresubmit').on("click",function(a){


	document.getElementById("featureselect").selectedIndex = "0";
	$('.selectpicker').selectpicker('refresh');

	var relsegments = [];
	var pluscount = 0;
	var minuscount = 0;

	featurenames.forEach(function(a){
		if(a != "segment" && document.getElementById(a).selectedIndex == "1"){
			pluscount += 1;
			var currfeatsegments = featuresBySegment[a];
			if(currfeatsegments){
				currfeatsegments.forEach(function(c){
					relsegments.push(c);
				});	
			}		
		}
		if(a != "segment" && document.getElementById(a).selectedIndex == "2"){
			minuscount += 1;
			var currfeatsegments = negFeaturesBySegment[a];
			if(currfeatsegments){
				currfeatsegments.forEach(function(c){
					relsegments.push(c);
				});
			}
		}
	});

	var relobj = { };
	for (var i = 0; i < relsegments.length; i++) {
	   if (relobj[relsegments[i]]) {
	      relobj[relsegments[i]]++;
	   }
	   else {
	      relobj[relsegments[i]] = 1;
	   } 
	}
	
	feature = [];

	for(var k in relobj){
		if(relobj[k] == pluscount + minuscount){
			feature.push(k);
		}
	}
	
	d3.select('.nodeCircles').remove();
	d3.select('#legend svg').remove();
	d3.select('#sunburst svg').remove();
	loaddata(feature);

});

/* uncheck all checkbox buttons */
d3.select("#uncheckall").on('click',function(a){
	//$('#featureset input:checkbox').prop('checked',false);
	featurenames.forEach(function(a){
		if(a != "segment"){
			document.getElementById(a).selectedIndex = "0";
			d3.select("#" + a + "Label").classed("plus",false).classed("minus",false);
		}
	});
	d3.select("#segmentshow").text("");
});

d3.selectAll(".selectpickerFeatures").on('change',function(a){
	//console.log(this.id);
	//d3.select("#" + a + )
	d3.select("#" + this.id + "Label").classed("plus",false).classed("minus",false);
	if(this.selectedIndex == "1"){
		d3.select("#" + this.id + "Label").classed("plus",true);
	}
	else if(this.selectedIndex == "2"){
		d3.select("#" + this.id + "Label").classed("minus",true);
	}
});

/* segment show */
d3.select("#showsegments").on("click",function(a){
	if($("#segmentshow").css("display") == "block"){
		$("#segmentshow").css('display',"none");
	}
	else{
		$("#segmentshow").css('display',"block");
	}
});

// tooltip taken from http://philmap.000space.com/gmap-api/poly-hov.html

var tooltip=function(){
var id = 'tt';
var top = 3;
var left = 3;
var maxw = 400;
var speed = 10;
var timer = 20;
var endalpha = 95;
var alpha = 0;
var tt,t,c,b,h;
var ie = document.all ? true : false;
tt = document.getElementById("tt");
return{
show:function(v,w){
  if(tt == null){
    tt = document.createElement('div');
    tt.setAttribute('id',id);
    t = document.createElement('div');
    t.setAttribute('id',id + 'top');
    c = document.createElement('div');
    c.setAttribute('id',id + 'cont');
    b = document.createElement('div');
    b.setAttribute('id',id + 'bot');
    tt.appendChild(t);
    tt.appendChild(c);
    tt.appendChild(b);
    document.body.appendChild(tt);
    tt.style.opacity = 0;
    tt.style.filter = 'alpha(opacity=0)';
    document.onmousemove = this.pos;
  }
  tt.style.display = 'block';
  c.innerHTML = v;
  tt.style.width = w ? w + 'px' : 'auto';
  if(!w && ie){
    t.style.display = 'none';
    b.style.display = 'none';
    tt.style.width = tt.offsetWidth;
    t.style.display = 'block';
    b.style.display = 'block';
  }
  if(tt.offsetWidth > maxw){tt.style.width = maxw + 'px'}
  h = parseInt(tt.offsetHeight) + top;
  clearInterval(tt.timer);
  tt.timer = setInterval(function(){tooltip.fade(1)},timer);
},
pos:function(e){
  var u = ie ? event.clientY + document.documentElement.scrollTop : e.pageY;
  var l = ie ? event.clientX + document.documentElement.scrollLeft : e.pageX;
  tt.style.top = (u - h) + 'px';
  tt.style.left = (l + left) + 'px';
},
fade:function(d){
  var a = alpha;
  if((a != endalpha && d == 1) || (a != 0 && d == -1)){
    var i = speed;
    if(endalpha - a < speed && d == 1){
      i = endalpha - a;
    }else if(alpha < speed && d == -1){
      i = a;
    }
    alpha = a + (i * d);
    tt.style.opacity = alpha * .01;
    tt.style.filter = 'alpha(opacity=' + alpha + ')';
  }else{
    clearInterval(tt.timer);
    if(d == -1){tt.style.display = 'none'}
  }
},
hide:function(){
  clearInterval(tt.timer);
  tt.timer = setInterval(function(){tooltip.fade(-1)},timer);
}
};
}();   
