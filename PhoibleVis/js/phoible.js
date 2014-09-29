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

var radSmall = 2.5;
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
var startFeature = "n";
var scaleType = "nominal";
var currfeature;
var changeScale = true;
var uniquevalues;
var featurenames;
var fam2macro = {};	
var phonFreq = {};
var lang2phonemes = {};

//############### projection settings ###############
var margin = {top: 10, left: 10, bottom: 80, right: 10}
  , width = parseInt(d3.select('#map').style('width'));

if(width > 580){ width = 580;}

var width = width - margin.left - margin.right
  , mapRatio = .9
  , height = width * mapRatio - margin.bottom;


var projection = d3.geo.mercator()
	.scale(width/8)
    .translate([width / 2 , height / 2])
	.center([0,50])
	//.rotate([-140,0])
	.rotate([-153,0])
	;


$('#mapcontainer').css("height",function(){return height + 120;});

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
			selLanguages = catSelection;
		}
		else{

			var e = brush.extent();

			  selLanguages = [];
			  d3.selectAll(".location").classed('brushhidden',function(d){
					//console.log(d);
					//return false;
					if( e[0][0] > projection([d.longitude,d.latitude])[0]
								|| projection([d.longitude,d.latitude])[0] > e[1][0]
						|| e[0][1] > projection([d.longitude,d.latitude])[1]
								|| projection([d.longitude,d.latitude])[1] > e[1][1]){

						return true;
					}
					else{
						if(featureSet[d.value.split(',')[0]] == 1){
							selLanguages.push(d);
						}
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
	selLanguages = catSelection;
	d3.select('#sunburst svg').remove();
	sunburst(selLanguages);
  }
  else{
	  selLanguages = [];
	  d3.selectAll(".location").classed('brushhidden',function(d){
			//console.log(d);
			//return false;
			if( e[0][0] > projection([d.longitude,d.latitude])[0]
						|| projection([d.longitude,d.latitude])[0] > e[1][0]
				|| e[0][1] > projection([d.longitude,d.latitude])[1]
						|| projection([d.longitude,d.latitude])[1] > e[1][1]){

				return true;
			}
			else{
				if(featureSet[d.value.split(',')[0]] == 1){
					selLanguages.push(d);
				}
				return false;
			}
	  });
	  d3.select('#sunburst svg').remove();
	  sunburst(selLanguages);
  }

}


//############### get information about features for drowdown menu ###############
d3.tsv('https://rawgithub.com/phoible/phoible/master/phoible-phonemes.tsv').get(function (err, results){


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

	

	var select = document.getElementById("features");
	freqPhonemes.forEach(function(a){
			//featureByName[a.PhonemeID] = a.Phoneme;
			var el = document.createElement("option");
			el.textContent = a;
			el.value = a;
			if(a == startFeature){el.selected = true;}
			select.appendChild(el);
		
	});
	loaddata(startFeature);
	//console.log(featureByName);

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
	
});


//############### load data ###############
function loaddata(feature){
// load data
	//console.log(url);
	currfeature = feature;

	d3.select("#legendname").text(feature);
	d3.select("#legendlink").attr('href',"http://wals.info/feature/" + feature);

	var nodeCircles = g.append('g').attr('class','nodeCircles');
	langByValue = {};
	codeByLang = {};
	walsByInfo = {};

	d3.selection.prototype.moveToFront = function() {
	  return this.each(function(){
	  this.parentNode.appendChild(this);
	  });
	};

	// get feature values from feature file
	d3.tsv('https://rawgithub.com/phoible/phoible/master/phoible-aggregated.tsv').get(function (err, langdata) {


		/*
		allLanguages = langdata.filter(function(a){
			return lang2phonemes[a.LanguageCode].indexOf(feature) != -1;
		});
		*/
		allLanguages = langdata;
		catSelection = allLanguages;

		

		//############### plot locations ###############
		nodeCircles.selectAll("path")
			.data(allLanguages)
			.enter()
			.append("circle")
			.attr('class',function(d){
				walsByInfo[d['LanguageCode']] = d['LanguageName'] + " [" + d['LanguageCode'] + "] "
					+ d['LanguageFamilyGenus']
					+ ", " + d['Country'] + "";
				return 'location loc_' + d['LanguageCode'] +
					" loc_gen_" + d['LanguageFamilyGenus'].replace(/[-\s]/g,'_') + 
					" loc_con_" + fam2macro[d.Area.replace(/[-\s]/g,'_')];
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
				if(lang2phonemes[d.LanguageCode].indexOf(feature) != -1){
					return "DarkGreen";
				}
				else{
					return "FireBrick";
				}
			})
			.style("stroke","black")
			.style("stroke-width", function(){ return 0.2/scaleFactor;})
			.style("cursor","pointer")
			.on("mouseover",function(d){


				d3.selectAll(".iteminfo").text(walsByInfo[d['LanguageCode']]);

				$(".infoicon").css("color",function(){
					return lang2phonemes[d.LanguageCode].indexOf(feature) != -1 ? "DarkGreen" : "FireBrick";
				})
				.css("display","inline")
				;


				// sunburst interaction
				dname = d['LanguageCode'];
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
						return e.children ? '#ccc' : groupScale(langByValue[e.name]);
					})
				;

				$(".infoicon").css("display","none");
			})
			;

		// get selection from brush

		brushed2();


		


		sunburst(selLanguages);

	});



};

overall.append("g").attr("class","brush").call(brush);

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
			//console.log(d);
			//langByGenFamily[d['wals code']] = [d.family,d.genus];
			d.family in upperByLower ? upperByLower[d.LanguageFamilyGenus].push(d.LanguageFamilyGenus) : upperByLower[d.LanguageFamilyGenus] = [d.LanguageFamilyGenus];
			d.genus in upperByLower ? upperByLower[d.LanguageFamilyGenus].push(d['LanguageCode']) : upperByLower[d.LanguageFamilyGenus] = [d['LanguageCode']];
			var currcont = fam2macro[d.Area];
			contByFam[currcont] = d.LanguageFamilyGenus;

			langByCont[d['LanguageCode']] = currcont;
			langByGen[d['LanguageCode']] = d.LanguageFamilyGenus;
			langByFam[d['LanguageCode']] = d.LanguageFamilyGenus;
			genByFam[d.LanguageFamilyGenus] = d.LanguageFamilyGenus;
			famByCont[d.LanguageFamilyGenus] = currcont;
			genByCont[d.LanguageFamilyGenus] = currcont;

			if(continents[currcont]){
				if(continents[currcont][d.LanguageFamilyGenus]){
					if(continents[currcont][d.LanguageFamilyGenus][d.LanguageFamilyGenus]){
						continents[currcont][d.LanguageFamilyGenus][d.LanguageFamilyGenus].push(d['LanguageCode']);
					}
					else{ // genus not in family yet
						continents[currcont][d.LanguageFamilyGenus][d.LanguageFamilyGenus] = [];
						continents[currcont][d.LanguageFamilyGenus][d.LanguageFamilyGenus].push(d['LanguageCode']);
					}
				}
				else{ // family not in continent yet
					continents[currcont][d.LanguageFamilyGenus] = {};
					continents[currcont][d.LanguageFamilyGenus][d.LanguageFamilyGenus] = [];
					continents[currcont][d.LanguageFamilyGenus][d.LanguageFamilyGenus].push(d['LanguageCode']);
				}

			}
			else{ // continent not yet available
				continents[currcont] = {};
				continents[currcont][d.LanguageFamilyGenus] = {};
				continents[currcont][d.LanguageFamilyGenus][d.LanguageFamilyGenus] = [];
				continents[currcont][d.LanguageFamilyGenus][d.LanguageFamilyGenus].push(d['LanguageCode']);
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
	    height = width,
	    radius = Math.min(width-30, height-30) / 2;

	    $('#sunburstcontainer').css("height",function(){return height + 130;});

		var xscale = d3.scale.linear()
		    .range([0, 2 * Math.PI]);

		var yscale = d3.scale.sqrt()
		    .range([0, radius]);

		var color = d3.scale.category20c();

		var svg = d3.select("#sunburst").append("svg")
		    .attr("width", width)
		    .attr("height", height)
		  	.append("g")
		    .attr("transform", "translate(" + width / 2 + "," + (height / 2 + 10) + ")");

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
		      	return d.name == "root" ? "#999" : d.children ? "#ccc" : "FireBrick";
		      })
			  .style("fill-rule", "evenodd")
			  .on('mouseover',function(d){
				//console.log(d);
				d3.selectAll('.location').classed('hidden',true);

				d3.selectAll(".loc_" + d.LanguageCode)
					.attr('r',function(){
						return radSmall/scaleFactor;
					})
					.style("stroke-width",function(){
						return 0.2/scaleFactor;
					})
					.classed('hidden',false)
					;

				var sel = d3.select(".loc_" + d.LanguageCode);
				sel.moveToFront();


				if(d.name.length == 3){
					outname = walsByInfo[d.LanguageCode];
				}
				else{
					outname = d.LanguageCode.substring(4);
				}


				d3.selectAll('.sun_' + d.name.replace(/[-\s]/g,'_'))
					.style('fill',function(d){
						return d.children ? '#444' : "FireBrick";
					})
					;

				//console.log(d.name,langByFam[d.name],langByGen[d.name],genByFam[d.name]);
				if(d.name in langByCont){
					d3.selectAll('.sun_con_' + langByCont[d.LanguageCode].replace(/[-\s]/g,'_'))
						.style('fill','#444')
					;
				}
				if(d.name in langByFam){
					d3.selectAll('.sun_fam_' + langByFam[d.LanguageCode].replace(/[-\s]/g,'_'))
							.style('fill','#444')
						;
				}
				if(d.name in langByGen){
					d3.selectAll('.sun_gen_' + langByGen[d.LanguageCode].replace(/[-\s]/g,'_'))
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
							return d.children ? "#444" : "FireBrick";
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
						return d.name == "root" ? "#999" : d.children ? "#ccc" : "FireBrick";
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
	feature = this.value;
	d3.select('.nodeCircles').remove();
	d3.select('#legend svg').remove();
	d3.select('#sunburst svg').remove();
	loaddata(feature);
})
;

//############### listener to scale selection ###############
//d3.select('#features').on('change',function(){
$('.selectpickerScale').on('change',function(){
	scaleType = this.value;

	if(scaleType == "ordinal" && featurenames.length < 10 && featurenames.length > 2){
		groupScale = d3.scale.ordinal()
				.range(colorbrewer.OrRd[featurenames.length]);
		document.getElementById("ScaleTypeSelect").selectedIndex = "1";
		$('.selectpickerScale').selectpicker('refresh');
	}
	else{
		groupScale = uniquevalues.length > 10 ? d3.scale.category20() : d3.scale.category10();
		document.getElementById("ScaleTypeSelect").selectedIndex = "0";
		$('.selectpickerScale').selectpicker('refresh');
	}
	// map points
	d3.selectAll('.location')
		.transition().duration(1000)
		.style('fill',function(d){
			langByValue[d['wals code']] = d.value;
			return groupScale(d.value);
		});

	// sunburst segments
	d3.selectAll('.sun')
		.transition().duration(1000)
		.style('fill',function(d){
			return d.name == "root" ? "#999" : d.children ? "#ccc" : groupScale(langByValue[d.name]);
		});

	// legend dots
	d3.selectAll('.legendCircle')
		.transition().duration(1000)
		.style('fill',function(d){
			currfeat = d.split(',')[0];
			if(featureSet[currfeat]){
				return groupScale(d.split(',')[0]);
			}
			else{
				return "white";
			}
		})
		.style("stroke",function(d){
			currfeat = d.split(',')[0];
			if(featureSet[currfeat]){
				return "black";
			}
			else{
				return groupScale(d.split(',')[0]);
			}
		})
		.style("stroke-width",function(d){
			currfeat = d.split(',')[0];
			if(featureSet[currfeat]){
				return 0.5;
			}
			else{
				return 1;
			}
		});
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
	radSmall = 2.5;
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
                     return 0.2/scaleFactor;
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
