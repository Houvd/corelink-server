//V3.0.0.0

//Setup ----
var IPSource = ''; // the ip used to run this listener (if there is a nat proxy, the ip of the nat), leave empty for autodetect
var IPControl  = '128.122.215.23'; // the ip of the sync server to connect to
var TCPControl = 20000; // the control port that is used on the server
var sendport = 20001; // the sendport should actually be determined by the server, so this has to change
var username = "Testuser"; //username to connect as
var password = "Testpassword"; //password to coinnect with
// End Setup ---

var os = require('os');
var ifaces = os.networkInterfaces();

// pick the first local ip to set as source IP address
Object.keys(ifaces).forEach(function (ifname) {
  ifaces[ifname].forEach(function (iface) {
    if ('IPv4' !== iface.family || iface.internal !== false || ifname.indexOf('docker') > -1 || IPSource != '')
      return;
    IPSource = iface.address;
  });
});

//check if we got a source ip
if(IPSource=='') {
    console.log('Did not find proper IP address.');
    process.exit();
}




var net = require('net');

var client = new net.Socket();

var streams = [];
var token = '';

var lastfunction = '';
var running = false;
var laststart = 0;

var info = [];
var lastinfo = '';

var timeout = 6000;
// Tests
var tests = [];

var streamid = '';

udpPort = 0;

var dgram = require('dgram');
var setup = Buffer.from('{"mode":"sender","type":"3d"}');
var udpDataServer = dgram.createSocket('udp4');

function pRound(number, precision) {
  var factor = Math.pow(10, precision);
  return Math.round(number * factor) / factor;
}

function sendData() {
  pings[num] = Date.now();
  if(num==0) message = setup;
  else message = num.toString();
  udpDataServer.send(message, PORT, IP, (err) => {
    if (err) {
      console.log('socket error', err);
    }
  });
  console.log(`sent: ${message} to ${IP}:${PORT}`);
  num++;
  setTimeout(sendData, 1000);
}

udpDataServer.on('message', (message, info) => {
  received++;
  if(pings[parseInt(message.toString())] != undefined) {
    var diff = Date.now() - pings[parseInt(message.toString())];
    if(diff>max) max = diff;
    if(diff<min) min = diff;
    sum += diff;
    console.log(`reply: ${message} from ${info.address}:${info.port}, sent: ${num}, received: ${received}, latency: ${diff}ms / min ${min} / max - ${max} / average - ${pRound(sum/received,4)}`);
  } else
    console.log(`got message: ${message} from ${info.address}:${info.port}, sent: ${num}, received: ${received}, this message was not an echo.`);
});

tests['auth'] = new Object({
	start: function() {
		var request = '{"function":"auth","username":"'+username+'","password":"'+password+'"}';
		client.write(request);
	},
	process: function(message){
		if('token' in message) {
			token = message['token'];
			var ip = message['ip'];
			console.log('  Authentication successful. Token: '+token+', IP: '+ip);
		} else
			console.log('  Request produced wrong result');
		return('continue');
	}
});

tests['functionlist'] = new Object({
	start: function() {
		var request = '{"function":"functionlist","token":"'+token+'"}';
		client.write(request);
	},
	process: function(message){
		if('functions' in message) {
			var functiontext = 'The following functions are available: ';
			for(func in message['functions']) {
				info[message['functions'][func]] = [];
				functiontext += message['functions'][func] + ', ';
			}
			console.log('  '+functiontext);
		} else
			console.log('  Request produced wrong result');
		return('continue');
	}
});

tests['getinfo'] = new Object({
	start: function() {
		if(lastinfo == '') {
			if(typeof info['info']=='undefined') {
				runTests(lastfunction);
				return;
			}
			lastinfo = Object.keys(info)[0];
			var request = '{"function":"info","functionname":"'+lastinfo+'","token":"'+token+'"}';
			client.write(request);
		}
	},
	process: function(message){
		if('info' in message) {
			info[lastinfo] = message['info'];
			console.log('  Found: '+message['info']['name'])
			var key =  null;
			var keys = Object.keys(info);
			for (var i = 0; i < keys.length; i++)
				if (keys[i] === lastinfo) {
					key = keys[i + 1];
					break;
				}
			if(key != null) { 
				lastinfo = key;
				var request = '{"function":"info","functionname":"'+key+'","token":"'+token+'"}';
				client.write(request);
				return;
			}
		} else
			console.log('  Request produced wrong result');
		lastinfo = '';
		return('continue');
	}
});

function createRequest(name) {
	var request = {};
	for(i in info[name]['arguments']) {
		switch(i) {
			case 'token':
				request[i] = token;
				break;
			case 'streamid':
				if(info[name]['arguments'][i]['type'] == 'array')
					request[i] = [streamid];
				else
					request[i] = streamid;
				break;
			case 'ip':
				request[i] = IPSource;
				break;
			case 'port':
				//get empty port address
				request[i] = sendport;
				break;
			default:
				if(typeof info[name]['arguments'][i]['optional'] == 'undefined')
					request[i] = info[name]['arguments'][i]['sample'];
		}
	}
	console.log('  Query function: '+request['function']);
//	console.log('  Request: '+JSON.stringify(request));
	return(request);
}

//deep check of the responses	
function checkResponse(name, message) {
	switch(name) {
		case 'sender':
			streamid = message['streamid'];




			break;
		default:
	}
}

tests['autotest'] = new Object({
	start: function() {
		if(lastinfo == '') {
			if(typeof info['info']=='undefined') {
				runTests(lastfunction);
				return;
			}
			lastinfo = Object.keys(info)[1];
			
			var request = JSON.stringify(createRequest(lastinfo));
			client.write(request);
		}
	},
	process: function(message){
		checkResponse(lastinfo,message);
		console.log('  Result: '+JSON.stringify(message))
		var key =  null;
		var keys = Object.keys(info);
		for (var i = 0; i < keys.length; i++)
			if (keys[i] === lastinfo) {
				key = keys[i + 1];
				break;
			}
		if(key != null) { 
			lastinfo = key;
			var request = JSON.stringify(createRequest(key));
			client.write(request);
			return;
		}
		return('continue');
	}
});
// At this point we could have an automated string test function for all further components


client.on('data', function(data) {
	try {
		message = JSON.parse(data);
	} catch (e) {
		console.log('Received message not a proper JSON:'+data.toString());
		return;
	}
	if('function' in message) {
// processing function send by server for instance to change or close the connection
		console.log('checking for correct function');
		return;
	}
	if('statuscode' in message) {
		if(message['statuscode']!=0) {
			console.log('  Function result was an error.');
			if('message' in message) {
				console.log('  '+message['message']);
			}
			runTests(lastfunction);
			return;
		}
// processing result of a request from server
		if(tests[lastfunction].process(message)=='continue') {
			console.log('  Test '+lastfunction+' ran for '+(Date.now() - laststart) + 'ms.');
			running= false;
			runTests(lastfunction);
		}
		return;

	}
	console.log('Message not understood: ' + data.toString());
});


client.on('close', function() {
	console.log('Connection closed');
});

client.connect(TCPControl, IPControl, function() {
	console.log('Connected');
	console.log('Starting tests');
	runTests();
});

var next = function(db, key) {
	var keys = Object.keys(db);
	if(key==null)
		return keys[0];
	else
		for (var i = 0; i < keys.length; i++)
			if (keys[i] === key)
				return keys[i + 1];
};

function runTests(func = null) {
	var i = next(tests,func);
	if(typeof i != "undefined") {
		console.log('testing > ' + i);
		lastfunction = i;
		running = true;
		laststart = Date.now();
		tests[i].start();
	}else {
		console.log('Finished tests');
		client.destroy();
	}
}

//	client.destroy(); // kill client after server's response
