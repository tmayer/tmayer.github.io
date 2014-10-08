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
var families;
var langByValue;
var langByGenFamily;
var codeByLang;
var featureByName = {};
var selLanguages = [];
var catSelection = [];
var allLanguages = [];
var zoompan = false;
var radius;
var fam;
var featureSet = {};
var groupScale;
var startFeature = ["n"];
var scaleType = "nominal";
var currfeature;
var changeScale = true;
var uniquevalues;
var featurenames;
var fam2macro = {};	
var phonFreq = {};
var lang2phonemes = {};
var feature = startFeature;
var phonfeatures = [];
var segmentByFeatures = {};
var sunburstwidth = parseInt(d3.select('#sunburst').style('width'));
var languagedata;
var rellanguages;
var featuresBySegment;

//############### projection settings ###############
var margin = {top: 10, left: 10, bottom: 80, right: 10}
  , width = parseInt(d3.select('#map').style('width'));

if(width > 580){ width = 580;}

var width = width - margin.left - margin.right
  , mapRatio = .6
  , height = width * mapRatio - margin.bottom;


var projection = d3.geo.equirectangular() // gall peters
	.scale(width/7)
    .translate([width / 2 , height / 2])
	.center([0,20])
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

//############# family to macro area #####
d3.tsv("data/familiescontinents.txt",function(macdata){
	//console.log(macdata);
	macdata.forEach(function(f){
		fam2macro[f.family] = f.continent;
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
	sunburst(selLanguages);
	languagedata = selLanguages;
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
	  sunburst(selLanguages);
	  languagedata = selLanguages;
  }

}

//############### get information about features for widget ###################
d3.tsv('data/phoible-segments-features.tsv').get(function (err, results){
	phonfeatures = results;
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

	phonfeatures.forEach(function(a){
		segmentByFeatures[a.segment] = a;
		/*
		currentfeatstring = "";
		featurenames.forEach(function(k){
			if(a[k] == "+"){
				currentfeatstring += "+";
			}
			else{
				currentfeatstring += "-";
			}
		});
		if(currentfeatstring in featuresBySegment){
			featuresBySegment[currentfeatstring].push(a.segment);
		}
		else{
			featuresBySegment[currentfeatstring] = [a.segment];
		}
		*/
		featurenames.forEach(function(k){
			if(a[k] == "+"){
				if(k in featuresBySegment){
					featuresBySegment[k].push(a.segment);
				}
				else{
					featuresBySegment[k] = [a.segment];
				}
			}
		});
	});

});


//############### get information about segments for drowdown menu ###############
d3.tsv('data/phoible-phonemes.tsv').get(function (err, results){


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

  	$('.selectpickerScale').selectpicker({
      style: 'btn-default btn-xs',
      size: 20,
      width: 200//'auto'
  	});
	
}); /* end load phoneme data */


//############### load data ###############
function loaddata(feature){


	var nodeCircles = g.append('g').attr('class','nodeCircles');
	langByValue = {};
	codeByLang = {};
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
				$("#" + k).prop('checked', true);;
			}
			else{
				$("#" + k).prop('checked', false);;
			}
		}
	}



	/* get language information from aggregated file */
	d3.tsv('data/phoible-aggregated.tsv').get(function (err, langdata) {


		/*
		allLanguages = langdata.filter(function(a){
			return lang2phonemes[a.LanguageCode].indexOf(feature) != -1;
		});
		*/
		allLanguages = langdata;
		catSelection = allLanguages;

		//rellanguages = allLanguages.filter(function(a){ return lang2phonemes[a.LanguageCode].indexOf(feature) != -1; });
		rellanguages = [];
		allLanguages.forEach(function(a){
			feature.forEach(function(f){
				if(lang2phonemes[a.LanguageCode].indexOf(f) != -1){
					rellanguages.push(a.LanguageCode);
				}
			});
		});


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
		sunburst(selLanguages);
		languagedata = selLanguages;

	});



}; /* end loading language data */

overall.append("g").attr("class","brush").call(brush);

/* Sunburst creation */
function sunburst(languagedata){

		//############### construct genealogy ###############
		families = {};
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
	sunburst(languagedata);
});

/* make sunburst bigger */
d3.select("#biggersunburst").on('click',function(a){
	sunburstwidth += 100;
	d3.select(".sunburstsvg").remove();
	sunburst(languagedata);
});

/* update feature combination */
d3.select('#featuresubmit').on("click",function(a){
	/*
	currentfeatstring = "";
	featurenames.forEach(function(a){
		if($("#"+a).prop("checked") == true){
			//console.log(a);
			currentfeatstring += "+";
		}
		else{
			currentfeatstring += "-";
		}
	});
	console.log(currentfeatstring,featuresBySegment[currentfeatstring]);
	feature = featuresBySegment[currentfeatstring];
	*/


	document.getElementById("featureselect").selectedIndex = "0";
	$('.selectpicker').selectpicker('refresh');

	var relsegments = [];
	var pluscount = 0;

	featurenames.forEach(function(a){
		if($("#"+a).prop("checked") == true){
			//console.log(a);
			pluscount += 1;
			var currfeatsegments = featuresBySegment[a];
			currfeatsegments.forEach(function(c){
				relsegments.push(c);
			})
			
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
	//console.log(relobj);
	
	feature = [];

	for(var k in relobj){
		if(relobj[k] == pluscount){
			feature.push(k);
		}
	}

	if(feature == undefined){
		$("#featurenotice").text("No segments match these feature combinations");
	}
	else{

		$("#featurenotice").text(" "); //Matching segments: " + feature.join(", "));
		d3.select('.nodeCircles').remove();
		d3.select('#legend svg').remove();
		d3.select('#sunburst svg').remove();
		loaddata(feature);
	}
});
