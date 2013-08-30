var http = require('http'),
	url = require('url'),
	qs = require("querystring"),
	catalog = {},
	line = [];
	bots = {
		"placeholder": {
			id: null,
			timeoutKeepAlive: null,
		}

	};

http.createServer(function (req, res) {
	console.log("");
	var url_parts = url.parse(req.url, true);

	var key = url_parts.query.key;
	switch(req.url.split("?")[0]) {
		/*case '/connect':
			console.log("Connection request recieved");
			var botKey = Math.floor(Math.random()*1000000)+1000000;
			break;*/



		case '/send_offer':
			console.log("Offer received");
			var body = '';
			req.on('data', function (data) {
				body += data;
			});
			req.on('end', function () {
				var POST = qs.parse(body);
				catalog[POST["key"]] = {};
				catalog[POST["key"]].offer = {};
				catalog[POST["key"]].answer = {};
				catalog[POST["key"]].offer.type = POST["offer[type]"];
				catalog[POST["key"]].offer.sdp = POST["offer[sdp]"];

				line.push({"key": POST["key"], "offer": catalog[POST["key"]].offer})
				
				res.writeHead(200, {'Content-Type': 'text/*'});
				res.end('ok');			
			});
			break;



		case "/ask_for_offer":
			console.log("Got asked for offer");
			var offer = line.shift();
			if (offer === undefined) {
				res.writeHead(200, {'Content-Type': 'text/*'});
				res.end('callback("Nope.avi")');
				console.log("Do not have one");
			}
			else {
				console.log("Sending pendingOffer...");
				res.writeHead(200, {'Content-Type': 'text/*'});

				res.end('callback('+JSON.stringify(offer)+')');
				console.log("PendingOffer sent");
			}
		 
			break;



		case "/send_answer":
			console.log("Answer received");
			var body = '';
			req.on('data', function (data) {
				body += data;
			});
			req.on('end', function () {
				var POST = qs.parse(body);
				if (typeof catalog[POST["key"]].answer == 'undefined') {
					res.writeHead(200, {'Content-Type': 'text/*'});
					res.end('error');
				}
					else {
					catalog[POST["key"]].answer.type = POST["answer[type]"];
					catalog[POST["key"]].answer.sdp = POST["answer[sdp]"];
					res.writeHead(200, {'Content-Type': 'text/*'});
					res.end('ok');
				}
			});
			break;



		case "/ask_for_answer":
			console.log("Got asked for answer on key: "+key)
			if (typeof catalog[key] == 'undefined') {
				res.writeHead(200, {'Content-Type': 'text/*'});
				res.end('callback("reset_please")');
			}
			else {
				if (isEmpty(catalog[key].answer)) {
					res.writeHead(200, {'Content-Type': 'text/*'});
					res.end('callback("Nope.avi")');
					console.log("Asked for answer, do not have one");
				}
				else {
					console.log("Sending pendingAnswer...");
					res.writeHead(200, {'Content-Type': 'text/*'});
					res.end('callback(\''+JSON.stringify(catalog[key].answer)+'\')');
					console.log("pendingAnswer sent");
					delete catalog[key];
				}
			}
			break;



		case "/reset":
			delete catalog[key];
			console.log("Reset performed on key: "+key);

			res.writeHead(200, {'Content-Type': 'text/*'});
			res.end('ok');
			break;

		default:
			console.log('Request received from url:',req.url);
			res.writeHead(200, {'Content-Type': 'text/*'});
			res.end("You are not supposed to be here.<br>"+req.url);
			break;
	}
	
}).listen(8080);



function isEmpty(obj) {
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop))
            return false;
    }
    return true;
}