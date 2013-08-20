var http = require('http'),
	url = require('url'),
	qs = require("querystring"),
	catalog = {},
	line = [];

http.createServer(function (req, res) {
	console.log("");
	console.log("");
	console.log("");
	console.log('Request received from url:',req.url);
	var url_parts = url.parse(req.url, true);

	var key = url_parts.query.key;
	switch(req.url.split("?")[0]) {
		case '/send_offer':
			console.log("Offer received");
			var body = '';
			req.on('data', function (data) {
				body += data;
			});
			req.on('end', function () {
				var POST = qs.parse(body);
				console.log(POST)
				catalog[POST["key"]] = {};
				catalog[POST["key"]].offer = {};
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
			if (offer != undefined) {
				console.log("Sending pendingOffer...");
				res.writeHead(200, {'Content-Type': 'text/*'});

				res.end('callback('+JSON.stringify(offer)+')');
				console.log("PendingOffer sent");
				
			}
			else {
				res.writeHead(200, {'Content-Type': 'text/*'});
				res.end('callback("Nope.avi")');
				console.log("Asked for offer, do not have one");
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
				catalog[POST["key"]].answer = {};
				catalog[POST["key"]].answer.type = POST["answer[type]"];
				catalog[POST["key"]].answer.sdp = POST["answer[sdp]"];
				res.writeHead(200, {'Content-Type': 'text/*'});
				res.end('ok');
			});
			break;



		case "/ask_for_answer":
			console.log("Got asked for answer on key: "+key)
			if (catalog[key].answer != null) {
				console.log("Sending pendingAnswer...");
				res.writeHead(200, {'Content-Type': 'text/*'});
				res.end('callback(\''+JSON.stringify(catalog[key].answer)+'\')');
				console.log("pendingAnswer sent");
			}
			else {
				res.writeHead(200, {'Content-Type': 'text/*'});
				res.end('callback("Nope.avi")');
				console.log("Asked for answer, do not have one");
			}
			break;



		case "/reset":
			catalog[key] = null;
			console.log("Reset performed on key: "+key);

			res.writeHead(200, {'Content-Type': 'text/*'});
			res.end('ok');
			break;

		default:
			res.end(req.url);
	}
	
}).listen(8080);

