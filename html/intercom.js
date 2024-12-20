/*
 *
 */
var noSleep = new NoSleep();
function fullscreen()
{
	document.getElementById("time").innerHTML = noSleep;
	document.documentElement.requestFullscreen();
	noSleep.enable();
}

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

	if (name != "default-page")
	{
		// hide the clock and buttons
		document.getElementById("clock").style.display = "none";
		document.getElementById("buttons").style.display = "none";

		// schedule to return to the clock after a while at idle
		page_show_timeout = window.setTimeout(() => page_show("default-page"), 10e3);
	} else {
		document.getElementById("clock").style.display = "flex";
		document.getElementById("buttons").style.display = "block";
	}
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
	let midnight = [128,0,0];
	let wakeup = [255,255,255];
	let evening = [200,200,0];
	let video_opacity = 0;
	
	if (when < sleep_time)
	{
		rgb1 = midnight;
		rgb2 = midnight;
		scale = 1;
		video_opacity = 0.75;
	} else
	if (when < wakeup_time)
	{
		rgb1 = midnight;
		rgb2 = wakeup;
		scale = (when - sleep_time) / (wakeup_time - sleep_time);
		video_opacity = 0.75 * (1 - scale);
	} else
	if (when < fade_time)
	{
		// wakeup colors all day
		rgb1 = wakeup;
		rgb2 = wakeup;
		video_opacity = 0;
		scale = 1;
	} else
	if (when < evening_time)
	{
		rgb1 = wakeup
		rgb2 = evening
		scale = (when - fade_time) / (evening_time - fade_time);
		video_opacity = 0.0 + 0.45 * scale;
	} else
	{
		rgb1 = evening;
		rgb2 = midnight;
		scale = (when - evening_time) / (24 - evening_time);
		video_opacity = 0.45 + 0.3 * scale;
	}

	let r = rgb2[0] * scale + rgb1[0] * (1 - scale);
	let g = rgb2[1] * scale + rgb1[1] * (1 - scale);
	let b = rgb2[2] * scale + rgb1[2] * (1 - scale);
	document.documentElement.style.setProperty("--text-color", "rgb("+r+","+g+","+b+")");

	// add a shade effect in front of the video to make it more
	// night vision compatible
	document.getElementById("shade").style.opacity = video_opacity;
}

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
window.setInterval(() => {
	const now = new Date();
	document.getElementById("time").innerText = now.toTimeString().substr(0,5);
	document.getElementById("date").innerHTML = now.toISOString().substr(0,10) + "<br/>" + days[now.getDay()];

	// update the font color based on the time of day
	brightness_update(now.getHours() + now.getMinutes()/60);

}, 10e3);

let buttons = document.getElementById("buttons");
let pages = document.getElementById("top");
let config = panel_configs[document.location.hash];
if (!config) {
	console.log("no config, using defaults!");
	config = {
		"Scenes": [
			[ "scene-alloff", "All off", "button" ],
		],
	};
}

let y_offset = 32;
for(let button_label in config)
{
	// create a top level button for this button
	let button = document.createElement("div");
	button.innerText = button_label;
	button.classList.add("overlay");
	button.classList.add("page-selector");
	button.style.left = "0%";
	button.style.top = y_offset + "%";
	button.onclick = () => page_show(button_label);
	buttons.appendChild(button);
	y_offset += 16;

	let page = document.createElement("div");
	page.classList.add("page");
	page.style.display = "none";
	page.id = button_label;
	pages.appendChild(page);

	let details = config[button_label];
	if (typeof(details) == 'string')
	{
		// make the click send the topic instead
		button.onclick = () => mqtt_client.publish(details, "{}");
	} else {
		// add the back button for holly
		let back = document.createElement("div");
		back.classList.add("overlay");
		back.style = "bottom: 0px; right: 0px; width: 25%; height: 10%;";
		back.onclick = () => page_show("default-page");
		back.innerText = "Back";
		page.appendChild(back);
	for(let item of config[button_label])
	{
		let topic = item[0];
		let label = item[1];
		let type = item[2];
		let msg = item[3];
		if (!type)
			type = "light";

		if (type == "light")
		{
			mqtt_create_light(page, topic, label, false);
		} else
		if (type == "colortemp")
		{
			mqtt_create_light(page, topic, label, true);
		} else
		if (type == "radiator")
		{
			mqtt_create_radiator(page, topic, label);
		} else
		if (type == "blinds")
		{
			mqtt_create_blinds(page, topic, label);
		} else
		if (type == "outlet")
		{
			mqtt_create_outlet(page, topic, label);
		} else
		if (type == "button")
		{
			mqtt_create_button(page, topic, label, msg);
		} else {
			console.log("unknown macro type", type);
		}
	}
	}
}
/*
let lights = document.getElementById("lights");

for(let light of [
	["light-1-spheres","Table" ],
	["light-1-kitchen", "Kitchen"],
	["light-1-dining", "Dining"],
	["light-0-entry", "Entry"],
])
{
	mqtt_create_light(lights, light[0], light[1]);
}

for(let outlet of ["outlet-3-amps"])
{
	mqtt_create_outlet(lights, outlet, outlet);
}


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
*/


mqtt_bind()


// keep the video going, even if it times out
let flvPlayer = null;
let last_time = 0;
function video_keepalive(videoElement)
{
	let now = flvPlayer ? flvPlayer.currentTime : 0;
	if (flvPlayer && now != last_time)
	{
		// everything good, keep watching
		last_time = now;
		//window.setTimeout(() => video_keepalive(videoElement), 1000);
		return;
	}

	// not good, restart it.
	console.log("RESTARTING VIDEO", now);
	video_restart(videoElement);

	// give it a few seconds to restart
	//window.setTimeout(() => video_keepalive(videoElement), 5000);
}

let retry_count = 0;

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
		enableStashBuffer: false,
		url: 'http://kremvax:9999/flv?' + retry_count,
        });

	console.log("created player", flvPlayer, videoElement);
	retry_count++;

	flvPlayer.on('error', (x) => {
		console.log("flv player failed, will try again in 5 seconds");
		if (flvPlayer)
			flvPlayer.destroy();
		flvPlayer = null;
	})
	
	flvPlayer.attachMediaElement(videoElement);
	flvPlayer.muted = true; // to avoid autoplay restrictions
        flvPlayer.load();
        flvPlayer.play().catch((e) => {
		console.log("playback failed for some reason");
		if (flvPlayer)
			flvPlayer.destroy();
		flvPlayer = null;
	});
}

/*
//if (flvjs.isSupported())
if (mpegts.getFeatureList().mseLivePlayback)
{
	video.addEventListener('ended', (x) => {
		console.log("VIDEO ENDED", x);
	})

	// they hang every so often, so add a timer to restart
	window.setInterval(video_keepalive, 2000, video);
}
*/

/* Replace the 'rs=...' part of the URL with the current time */
const rs_re = /&rs=[^&]+/;
function reload_image(img)
{
	var d = new Date;
	img.src = img.src.replace(rs_re, '&rs='+d.toISOString())
}

window.setInterval(reload_image, 1000, document.getElementById('garage'));
window.setInterval(reload_image, 1000, document.getElementById('frontdoor'));
