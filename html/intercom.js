/*
 *
 */
function localtime(epoch)
{
	return new Date(epoch * 1000).toTimeString().substr(0,8);
}
function roundfunc(digits)
{
	return (x) => parseFloat(x).toFixed(digits);
}

let weather_svg = null;
function weather_plot(el,topic,message)
{
	//el.deleteChildren();
	if (weather_svg)
		weather_svg.remove();

	let height = 200;
	let width = 800;
	let margin = { bottom: 50, left: 20 };

	let forecasts = message.list;
	let data = [];

	for(let f of forecasts)
	{
		let snow = 0;
		let rain = 0;
		
		if ("snow" in f)
			snow = f.snow["3h"];
		if ("rain" in f)
			rain = f.rain["3h"];

		data.push({
			time: f.dt * 1000,
			temp: f.main.temp,
			rain: rain,
			snow: snow,
		});
	}

	const x = d3.scaleTime(
		d3.extent(data, d => d.time),
		[margin.left,width],
	);

	// temperature y scale
	const y_temp = d3.scaleLinear(
		d3.extent(data, d => d.temp),
		[height - margin.bottom, 0],
	);

	// rain y scale
	const y_rain = d3.scaleLinear(
		[0, 10],
		[height - margin.bottom, 0],
	);
	const y_snow = d3.scaleLinear(
		[0, 1],
		[height - margin.bottom, 0],
	);

	weather_svg = d3.create("svg")
		.attr("width", width)
		.attr("height", height)
		;

	// if the temp passes zero, put a line for it
/*
	if (y.temp.domain()[0] < 0)
		weather_svg.append("line")
			.attr("d", d3.line(
				(i) 
	weather_svg.append("g")
		.attr("class", "grid")
		.attr("transform", "translate(" + margin.left + ",0)")
		.attr("stroke", "#111")
		.call(d3.axisLeft(y_temp)
			.tickSize(-width)
			.tickFormat("")
		);
*/


	// snow
	weather_svg.append("path")
		.datum(data)
		.attr("fill", "#fff4")
		.attr("stroke", "#fff8")
		.attr("stroke-width", 1)
		.attr("d", d3.area(
			(i) => x(i.time),
			y_snow(0),
			(i) => y_snow(i.snow),
		));
	//rain
	weather_svg.append("path")
		.datum(data)
		.attr("fill", "#00f4")
		.attr("stroke", "#00f8")
		.attr("stroke-width", 1)
		.attr("d", d3.area(
			(i) => x(i.time),
			y_rain(0),
			(i) => y_rain(i.rain),
		));

	// temperatures on top
	weather_svg.append("path")
		.datum(data)
		.attr("stroke", "#fff")
		.attr("stroke-width", 2.5)
		.attr("fill", "none")
		.attr("d", d3.line(
			(i) => x(i.time),
			(i) => y_temp(i.temp),
		));

	// scales
	weather_svg.append("g")
		.attr("transform", "translate(0,"+(height-margin.bottom)+")")
		.call(d3.axisBottom(x))
		;

	let y_axis = weather_svg.append("g")
		.call(d3.axisLeft(y_temp).tickSize(-width))
		.attr("class", "y_axis")
		.attr("transform", "translate(" + margin.left + ",0)");

	y_axis.selectAll(".domain").remove();
	y_axis.selectAll(".tick line")
		.attr("opacity", 0.3)
		.attr("stroke", "#fff")
		.attr("stroke-width", 1)
	;


	
//new Date(forecasts[0].dt*1000), new Date(forecasts[num_forecasts-1].dt*1000)])
	el.appendChild(weather_svg.node());

}

var page_show_timeout = null;
function page_show(name)
{
	console.log("showing", name);
	for(let page of document.querySelectorAll(".page"))
	{
		if (page.id == name)
			page.style.display = "block";
		else
			page.style.display = "none";
	}

	window.clearTimeout(page_show_timeout);
		
	// return to the clock after a while at idle
	if (name != "clock")
		page_show_timeout = window.setTimeout(() => page_show("clock"), 10e3);
}


function brightness_update(when)
{
	// should use the sunrise/sunset data, but that's harder
	// midnight is dark red
	// 7 AM is full white
	// 6 PM is full white
	// 10 PM is yellow
	// midnight is dark red
	let color = document.body.style.color;
	let sleep_time = 5;
	let wakeup_time = 7;
	let fade_time = 19;
	let evening_time = 22;
	let rgb1, rgb2;
	let midnight = [64,0,0];
	let wakeup = [255,255,255];
	let evening = [200,200,0];
	let video_brightness = 1;
	
	if (when < sleep_time)
	{
		rgb1 = midnight;
		rgb2 = midnight;
		scale = 1;
		video_brightness = 0.3;
	} else
	if (when < wakeup_time)
	{
		rgb1 = midnight;
		rgb2 = wakeup;
		scale = (when - sleep_time) / (wakeup_time - sleep_time);
		video_brightness = 0.3 + 0.7 * scale;
	} else
	if (when < fade_time)
	{
		// wakeup colors all day
		rgb1 = wakeup;
		rgb2 = wakeup;
		scale = 1;
	} else
	if (when < evening_time)
	{
		rgb1 = wakeup
		rgb2 = evening
		scale = (when - fade_time) / (evening_time - fade_time);
		video_brightness = 0.6 + 0.4 * (1 - scale);
	} else
	{
		rgb1 = evening;
		rgb2 = midnight;
		scale = (when - evening_time) / (24 - evening_time);
		video_brightness = 0.3 + 0.3 * (1 - scale);
	}

	let r = rgb2[0] * scale + rgb1[0] * (1 - scale);
	let g = rgb2[1] * scale + rgb1[1] * (1 - scale);
	let b = rgb2[2] * scale + rgb1[2] * (1 - scale);
	document.documentElement.style.setProperty("--text-color", "rgb("+r+","+g+","+b+")");

	// apply this as a filter to the video too
	document.getElementById("video").style.filter = "brightness(" + video_brightness + ")";
}

function time_update()
{
	const now = new Date();
	document.getElementById("time").innerText = now.toTimeString().substr(0,5);
	document.getElementById("date").innerText = now.toISOString().substr(0,10);
	brightness_update(now.getHours() + now.getMinutes()/60);

	window.setTimeout(time_update, 10000);

	// update the font color based on the time of day
}
time_update();
	

let lights = document.getElementById("lights");

for(let light of [
	["light-1-spheres","Table" ],
	["light-1-kitchen", "Kitchen"],
	["light-1-dining", "Dining"],
	["light-0-entry", "Entry"],
/*
	["light-2-office", "Office"],
	["light-2-craftroom", "Craft room"],
	["light-3-bedroom", "Bedroom"],
	["light-3-closet", "Closet"],
	["light-3-shower", "Shower"],
	["light-3-bathroom", "WC"],
*/
])
{
	mqtt_create_light(lights, light[0], light[1]);
}

for(let outlet of ["outlet-3-amps"])
{
	mqtt_create_outlet(lights, outlet, outlet);
}


let macros = document.getElementById("macros");
for(let scene of [
	["guests", "Entryway"],
	["alloff", "All Off"],
	["intermission", "Intermission"],
	["movietime", "Movie Time"],
	["dining", "Dinner"],
	["breakfats", "Breakfast"],
])
{
	mqtt_create_button(macros, scene[0], scene[1]);
}

mqtt_bind()


// toggle between a small and large video feed
let video_fullscreen = false;
let video_timeout = null;
let flvPlayer = null;

function video_resize()
{
	let video = document.getElementById("video");
	let video_page = document.getElementById("video_page");
	let video_button = document.getElementById("video_button");

	window.clearTimeout(video_timeout);
	window.clearTimeout(page_show_timeout);

	if (video_fullscreen)
	{
		console.log("shrinking");
		video_page.style.display = "none";
		video_button.appendChild(video);
		video_fullscreen = false;
	} else {
		//video.requestFullscreen();
		console.log("full screen");
		video_page.style.display = "block";
		video_page.appendChild(video);
		video_fullscreen = true;


		//video_timeout = window.setTimeout(video_resize, 30e3);
	}
}


let last_time = 0;
function video_keepalive(videoElement)
{
	let now = flvPlayer ? flvPlayer.currentTime : 0;
	if (now == 0 || now == last_time)
	{
		console.log("RESTARTING VIDEO", now);
		video_restart(videoElement);
		return
	}

	last_time = now;
	window.setTimeout(() => video_keepalive(videoElement), 1000);
}

function video_restart(videoElement)
{
	if (flvPlayer)
	{
		console.log("destroying player");
		flvPlayer.unload();
		flvPlayer.destroy();
		flvPlayer = null;
	}

	flvPlayer = mpegts.createPlayer({
		type: 'flv',
		isLive: true,
		liveSync: true,
		autoCleanupSourceBuffer: true,
		url: 'http://kremvax:9999/flv',
        });
	console.log("created player", flvPlayer, videoElement);

	flvPlayer.on('error', (x) => {
		console.log("flv player failed, will try again in 5 seconds");
	})
	
	flvPlayer.attachMediaElement(videoElement);
	flvPlayer.muted = true; // to avoid autoplay restrictions
        flvPlayer.load();
        flvPlayer.play().catch((e) => {
		console.log("playback failed for some reason");
	});
}

//if (flvjs.isSupported())
if (mpegts.getFeatureList().mseLivePlayback)
{
	video.addEventListener('ended', (x) => {
		console.log("VIDEO ENDED", x);
	})

	// they hang every so often, so add a timer to restart
	video_keepalive(video);
}