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

	var key = url_parts.query.key; // sets the request's key

	// router depending on the url
	switch(req.url.split("?")[0]) {
		
		// Bot's request on startup, gives him a key and stores him in bots array for keepalaves and capacity
		// Need refactoring, from polling to SSE
		case '/bot_connect':
			console.log("Bot connection request recieved");
			var botKey = Math.floor(Math.random()*1000000)*10+1;

			bots[botKey] = {
				"timeoutKeepAlive": null,
				"capacity": parseInt(url_parts.query.capacity,10),
			};

			bots[botKey].timeoutKeepAlive = setTimeout(function(){
				delete bots[botKey];
				updateCapacity();
			}, 5000);

			res.writeHead(200, {'Content-Type': 'text/*'});
			res.end('callback("'+botKey+'")');
			updateCapacity();
			break;

		// User's first request, sets up the SSE connection that will last until an answer is returned.
		case "/user_connect":
			console.log("User connection request recieved for key: "+key);
			catalog[key] = new UserLink(req, res, key);
			catalog[key].sendEvent("connected"); // Notify the user he is connected
			catalog[key].req.connection.addListener("close", function () {
				delete catalog[key];
				var tmp = queue.indexOf(key);
				if (tmp != -1) {queue.splice(tmp, 1);}

				console.log("Reset performed on key: "+key);
			});
			break;

		// As soon as the user is connected, he sends his offer, which is stored in a queue for the bots to be processed
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

		// Polling request from the bot, sends an offer if there is one and refreshes the keepalive
		case "/ask_for_offer":
			console.log("Got asked for offer");
			if (typeof bots[key] == 'undefined') { // the server reseted between this request and the connection. The bot reloads
				res.writeHead(200, {'Content-Type': 'text/*'});
				res.end('callback("reset_please")');
			}
			else {
				var keyQ = queue.shift();
				if (keyQ === undefined) {  // no offer is sent
					res.writeHead(200, {'Content-Type': 'text/*'});
					res.end('callback("Nope.avi")');
					console.log("Do not have one");
				}
				else { // an offer is sent, and another polling request is immediately sent from the bot
					res.writeHead(200, {'Content-Type': 'text/*'});

					res.end('callback('+JSON.stringify({"key":keyQ,"offer":catalog[keyQ].offer})+')');
					console.log("Offer sent");
				}

				clearTimeout(bots[key].timeoutKeepAlive); // refresh the keepalive

				bots[key].timeoutKeepAlive = setTimeout(function() {
					delete bots[key];
					updateCapacity();
				}, 5000);
			}
			break;

		// Polling without requesting an offer, refreshes the keepalive
		case '/botKeepalive':
			console.log("Keepalive recieved");
			if (typeof bots[key] == 'undefined') {	// the server reseted between this request and the connection. The bot reloads
				res.writeHead(200, {'Content-Type': 'text/*'});
				res.end('callback("reset_please")');
			}
			else {
				clearTimeout(bots[key].timeoutKeepAlive); // refresh the keepalive

				bots[key].timeoutKeepAlive = setTimeout(function() {
					delete bots[key];
					updateCapacity();
				}, 5000);

				res.writeHead(200, {'Content-Type': 'text/*'});
				res.end('callback("ok")');
			}
			break;

		// A bot finished processing an offer, and returns an answer. Sends the answer to the corresponding user and closes SSE
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
			
		// Reset request
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

		// router to the differents webpages
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

/**
 * Stores a SSE link to the user
 * @param {Object} pReq; The SSE connection request
 * @param {Object} pRes; The SSE connection result
 * @param {String} pKey; User's key
 */
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
	});
}

/**
 * Sends an update about the queue to the user
 */
UserLink.prototype.updateQueue = function() {
	var that = this;
	var tmp = {
		capacity: totalCapacity,
		queue: queue.length,
		position: queue.indexOf(that.key)+1,
	};
	that.sendEvent("updateQueue",JSON.stringify(tmp));
};

/**
 * Sends a custom event
 * @param {String} eventName;  
 * @param {String} eventData; 
 */
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

/**
 * Updates the server's full capacity
 */
function updateCapacity() {
	var tmp = 0;
	for (var i in bots){
		tmp += bots[i].capacity;
	}
	totalCapacity = tmp;
}