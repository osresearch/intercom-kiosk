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

function mqtt_create_light(container, topic, label_text)
{
	let div = document.createElement("div");
	div.className = "light-slider";
	
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
	input.handler = (topic,msg) => input.value = msg.brightness;
	div.appendChild(input);

	container.appendChild(div);
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

function mqtt_create_button(container, topic, label)
{
	let button = document.createElement("button");
	button.id = topic;
	button.innerText = label;
	button.className = "mqtt scene-button";
	button.setAttribute("topic", "zigbee/" + topic);
	button.setAttribute("sendtopic", "zigbee/" + topic + "/set");
	button.send_handler = () => "{}";

	container.appendChild(button);
}

//function alloff() { client.publish("zigbee/scene-alloff/set", "{}") }
//function intermission() { client.publish("zigbee/scene-intermission/set", "{}"); }
//function movietime() { client.publish("zigbee/scene-movietime/set", "{}"); }

