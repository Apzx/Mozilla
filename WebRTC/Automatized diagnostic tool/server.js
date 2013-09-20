var http = require('http'),
	url = require('url'),
	qs = require("querystring"),
	fs = require("fs"),
	catalog = {},
	queue = [],
	bots = {
		"placeholder": {
			timeoutKeepAlive: null,
			capacity: 0,
		}
	},
	totalCapacity = 0;
	console.log("Server set up");

http.createServer(function (req, res) {
	console.log("");
	var url_parts = url.parse(req.url, true);

	var key = url_parts.query.key;
	switch(req.url.split("?")[0]) {
		

		case '/bot_connect':

			console.log("Bot connection request recieved");
			var botKey = Math.floor(Math.random()*1000000)*10+1;

			bots[botKey] = {
				"timeoutKeepAlive": null,
				"capacity": parseInt(url_parts.query.capacity)
			};

			bots[botKey].timeoutKeepAlive = setTimeout(function(){
				delete bots[botKey];
				updateCapacity();
			}, 5000);

			res.writeHead(200, {'Content-Type': 'text/*'});
			res.end('callback("'+botKey+'")');
			updateCapacity();
			break;

		case "/user_connect":
			console.log("User connection request recieved");
			catalog[key] = new UserLink(req, res, key);
			catalog[key].sendEvent("connected");
			catalog[key].req.connection.addListener("close", function () {
				delete catalog[key];
				var tmp = queue.indexOf(key);
				if (tmp != -1) {queue.splice(tmp, 1);}

				console.log("Reset performed on key: "+key);
			}, false);
			break;


		case "/send_offer":
			console.log("Offer received and sent to key: "+key);

			var bodyOffer = '';
			req.on('data', function (data) {
				bodyOffer += data;
			});
			req.on('end', function () {
				var POST = qs.parse(bodyOffer);

				res.writeHead(200, {'Content-Type': 'text/*'});
				res.end('ok');

				catalog[key].offer = POST;
				queue.push(key);

				for (var i in catalog) {
					catalog[i].updateQueue();
				}
			});
			break;


		case "/ask_for_offer":
			console.log("Got asked for offer");
			if (typeof bots[key] == 'undefined') {
				res.writeHead(200, {'Content-Type': 'text/*'});
				res.end('callback("reset_please")');
			}
			else {
				var keyQ = queue.shift();
				if (keyQ === undefined) {
					res.writeHead(200, {'Content-Type': 'text/*'});
					res.end('callback("Nope.avi")');
					console.log("Do not have one");
				}
				else {
					res.writeHead(200, {'Content-Type': 'text/*'});

					res.end('callback('+JSON.stringify({"key":keyQ,"offer":catalog[keyQ].offer})+')');
					console.log("Offer sent");
				}

				clearTimeout(bots[key].timeoutKeepAlive);

				bots[key].timeoutKeepAlive = setTimeout(function() {
					delete bots[key];
					updateCapacity();
				}, 5000);
			}
			break;


		case '/botKeepalive':
			console.log("Keepalive recieved");
			if (typeof bots[key] == 'undefined') {
				res.writeHead(200, {'Content-Type': 'text/*'});
				res.end('callback("reset_please")');
			}
			else {
				clearTimeout(bots[key].timeoutKeepAlive);

				bots[key].timeoutKeepAlive = setTimeout(function() {
					delete bots[key];
					updateCapacity();
				}, 5000);

				res.writeHead(200, {'Content-Type': 'text/*'});
				res.end('callback("ok")');
			}
			break;


		case "/send_answer":
			console.log("Answer received for key: "+key);
			var bodyAnswer = '';
			req.on('data', function (data) {
				bodyAnswer += data;
			});
			req.on('end', function () {
				var POST = qs.parse(bodyAnswer);
				
				var tmp = POST;
				catalog[key].sendEvent("answer",JSON.stringify(tmp));

				res.writeHead(200, {'Content-Type': 'text/*'});
				res.end('ok');
			});
			break;
			

		case "/reset":
			delete catalog[key];
			var tmp = queue.indexOf(key);
			if (tmp != -1) {queue.splice(tmp, 1);}

			console.log("Reset performed on key: "+key);

			res.writeHead(200, {'Content-Type': 'text/*'});
			res.end('ok');
			break;

		case "/":
			console.log("Home requested");
			res.writeHead(200, {"Content-Type":"text/html"});
			res.end("Hey, kid, do you want some candy?");
			break;

		default:
			var file = req.url.replace("/","");
			console.log(file," requested");
			fs.exists(file, function(exists) {
				if (exists) {
					fs.readFile(file, function(error, content) {
						if (error) {
							res.writeHead(500);
							res.end();
						} else {
							res.writeHead(200, {"Content-Type":"text/html"});
							res.end(content, "utf-8");
						}
					});
				} else {
					res.writeHead(404);
					res.end("Oh noes, 404!");
				}
			});
	}
	
}).listen(8080);


function UserLink(pReq,pRes,pKey) {
	var that = this;

	that.key = pKey;
	that.offer = {};
	that.req = pReq;
	that.res = pRes;

	that.res.writeHead(200, {"Content-Type":"text/event-stream", "Cache-Control":"no-cache", "Connection":"keep-alive"});
	that.res.write("retry: 10000\n");

	that.req.connection.addListener("close", function () {
		delete that;
	}, false);
}

UserLink.prototype.updateQueue = function() {
	var that = this;
	var tmp = {
		capacity: totalCapacity,
		queue: queue.length,
		position: queue.indexOf(that.key)+1,
	};
	that.sendEvent("updateQueue",JSON.stringify(tmp));
};

UserLink.prototype.sendEvent = function(eventName, eventData) {
	var that = this;
	that.res.write("event: "+eventName+"\n");
	that.res.write("data: "+eventData+"\n\n");
};


function isEmpty(obj) {
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop))
            return false;
    }
    return true;
}

function updateCapacity() {
	var tmp = 0;
	for (var i in bots){
		tmp += bots[i].capacity;
	}
	totalCapacity = tmp;
}