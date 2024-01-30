/*
 * Subscribe to any mqtt related topics and update the DOM.
 */
"use strict";
let mqtt_client = null;
let topics = null;

var thingy = null;

function mqtt_process(topic,buf)
{
	var message = buf.toString();

	// we should have a reason we subscribed to this
	if (!topics[topic])
		return;

	// try to parse json
	if (message[0] == '{')
		message = JSON.parse(message);

	for(let [el,selector] of topics[topic])
	{
		let handler = el.handler;
		thingy = message;
		if (selector)
		{
			try {
				thingy = eval("thingy." + selector);
			} catch(error) {
				if (el.getAttribute('optional') != 0)
					console.log(error);
				thingy = el.getAttribute('default');
			}
		}

		if (handler)
		{
			handler(topic, thingy);
			continue;
		}

		handler = el.getAttribute("format");
		if (handler)
		{
			el.innerText = eval(handler)(thingy);
			continue;
		}

		handler = el.getAttribute("update");
		if (handler)
		{
			eval(handler)(el,topic,thingy);
			continue;
		}

		// defaults
		if (el.type == "range")
			el.value = thingy;
		else
		if (el.type == "checkbox")
			el.checked = thingy == "ON" ? true : false;
		else
			el.innerText = thingy;
	}
}

function mqtt_bind()
{
	if (mqtt_client)
		mqtt.disconnect();

	mqtt_client = mqtt.connect("mqtt://dashboard:9001");
	topics = {};

	for(let el of document.querySelectorAll(".mqtt"))
	{
		let el_topic = el.getAttribute("topic");
		el.mqtt = mqtt;

		for(let topic_str of el_topic.split(" "))
		{
			if (topic_str == "")
				continue;
			let [topic,selector] = topic_str.split("#");

			if (!topics[topic])
			{
				mqtt_client.subscribe(topic);
				topics[topic] = [];
			}

			topics[topic].push([el, selector]);
		}

		let el_send_topic = el.getAttribute("sendtopic");
		if (el_send_topic && !el.onchange)
			el.onchange = (x) => {
				let value = el.value;
				if (el.send_handler)
					value = el.send_handler(el);
				console.log(el_send_topic, value);
				mqtt_client.publish(el_send_topic, value);
			}
	}

	mqtt_client.on('message', mqtt_process);
}

function mqtt_create_light(container, topic, label_text, color_temp=false)
{
	let div = document.createElement("div");
	div.className = "light-slider";
	container.appendChild(div);
	
	let label = document.createElement("label");
	label.setAttribute("for", topic);
	label.innerText = label_text;
	div.appendChild(label);
	div.appendChild(document.createElement("br"));

	let input = document.createElement("input");
	input.id = topic;
	input.type = "range";
	input.className = "mqtt";
	input.min = 0;
	input.max = 255;
	input.setAttribute("list","markers");
	input.setAttribute("topic", "zigbee/" + topic);
	input.setAttribute("sendtopic", "zigbee/" + topic + "/set/brightness");
	input.handler = (topic,msg) => {
		console.log(topic, msg);
		input.value = (msg.state == "OFF" ? 0 : msg.brightness);
	}
	div.appendChild(input);

	if (!color_temp)
		return;

	// add a color temp slider below the main one
	let input2 = document.createElement("input");
	input2.id = topic;
	input2.type = "range";
	input2.className = "mqtt";
	input2.min = 250; // low numbers == blue, more bright
	input2.max = 454; // high numbers == yellow, less bright
	input2.style.direction = "rtl"; // invert the scale
	input2.style.marginTop = "5vh";
	input2.style.accentColor = "#ccc"; // no bar
	input2.setAttribute("list","markers-colortemp");
	input2.setAttribute("topic", "zigbee/" + topic);
	input2.setAttribute("sendtopic", "zigbee/" + topic + "/set/color_temp");
	input2.handler = (topic,msg) => input2.value = msg.color_temp;
	div.appendChild(input2);
}

function mqtt_create_radiator(container, topic, label_text)
{
	let div = document.createElement("div");
	div.className = "light-slider";
	container.appendChild(div);
	
	let label = document.createElement("label");
	label.setAttribute("for", topic);
	label.innerText = label_text;
	div.appendChild(label);
	div.appendChild(document.createElement("br"));

	// create a current temperature slider that will sit above
	// the input widget
	let ind = document.createElement("div");
	ind.classList.add("radiator-temp");
	ind.innerHTML = "&#9650;"; // upward triangle
	ind.style.top = "55px";

	let ind_demand = document.createElement("span");
	//ind_demand.classList.add("radiator-temp");
	//ind_demand.innerHTML = "&#9660;"; // downard triangle
	//ind_demand.style.top = "30px";
	ind_demand.style.color = "green";
	ind_demand.style.fontSize = "22px";

	// 
	let input = document.createElement("input");
	input.id = topic;
	input.type = "range";
	input.className = "mqtt";
	input.min = 10;
	input.max = 30;
	input.setAttribute("list","markers-temp");
	input.setAttribute("topic", "zigbee/" + topic);
	input.setAttribute("sendtopic", "zigbee/" + topic + "/set/occupied_heating_setpoint");
	input.handler = (topic,msg) => {
		console.log(topic, msg);
		input.value = msg.occupied_heating_setpoint;
		ind.style.left = ((msg.local_temperature - input.min) / (input.max - input.min) * 100) + "%";

		// make right pointing triangles based on the heating
		// demand from the radiator
		ind_demand.innerHTML = "&#9654;".repeat(msg.pi_heating_demand / 20);
		//ind_demand.style.left = (msg.pi_heating_demand) + "%";
		if (msg.pi_heating_demand < 10)
			ind_demand.style.color = "blue";
		else
			ind_demand.style.color = "red";
	}

	div.appendChild(ind);
	div.appendChild(input);
	ind.appendChild(ind_demand);

}

function mqtt_create_blinds(container, topic, label_text)
{
	let div = document.createElement("div");
	div.className = "light-slider";
	container.appendChild(div);
	
	let label = document.createElement("label");
	label.setAttribute("for", topic);
	label.innerText = label_text;
	div.appendChild(label);
	div.appendChild(document.createElement("br"));

	let input = document.createElement("input");
	input.id = topic;
	input.type = "range";
	input.className = "mqtt";
	input.min = 0;
	input.max = 100;
	input.setAttribute("list","markers-percent");
	input.setAttribute("topic", "zigbee/" + topic);
	input.setAttribute("sendtopic", "zigbee/" + topic + "/set/position");
	input.handler = (topic,msg) => input.value = msg.position;

	div.appendChild(input);
}

/*
<label class="switch">
  <input type="checkbox" class="mqtt" topic="outlet" sendtopic="outlet/set" />
  <span class="slider round"></span>
</label>
*/

function mqtt_create_outlet(container, topic, label)
{
	let el = document.createElement("label");
	el.className = "switch";

	let input = document.createElement("input");
	input.id = topic;
	input.type = "checkbox";
	input.className = "mqtt";
	input.setAttribute("topic", "zigbee/" + topic + "#state");
	input.setAttribute("sendtopic", "zigbee/" + topic + "/set/state");
	//input.handler = (topic,msg) => input.checked = (msg.state == "ON");
	input.send_handler = () => input.checked ? "ON" : "OFF";

	el.appendChild(input);

	let span = document.createElement("span");
	span.className = "slider round";
	el.appendChild(span);

	container.appendChild(el);

	el = document.createElement("label");
	el.setAttribute("for", topic);
	el.innerText = label;
	container.appendChild(el);
}

function mqtt_create_button(container, topic, label, msg = '{}')
{
	let button = document.createElement("button");
	let sub_topic = "zigbee/" + topic;
	let send_topic = sub_topic + "/set";

	// explicit message? (ie, not a zigbee one)
	if (topic[0] == '/')
		send_topic = sub_topic = topic.substr(1)

	button.id = topic;
	button.innerText = label;
	button.className = "mqtt scene-button";
	button.setAttribute("topic", ""); // do't actually subscribe sub_topic);
	button.setAttribute("sendtopic", send_topic);
	button.send_handler = () => { console.log("button", send_topic); return msg };
	button.addEventListener('click', () => button.onchange());
	container.appendChild(button);
}

//function alloff() { client.publish("zigbee/scene-alloff/set", "{}") }
//function intermission() { client.publish("zigbee/scene-intermission/set", "{}"); }
//function movietime() { client.publish("zigbee/scene-movietime/set", "{}"); }

