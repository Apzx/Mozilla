function echoTest() {
	button.hidden = true;

	var remoteStream;
	var peerConnection;
	var dataChannel;
	var offer;

	var key;
	
	var ip = '127.0.0.1:8080';

	var	timeoutAnswer = null,
		timeoutDisconnect = null;

	var flagPing = false;

	var recordingResult = [];
	var param = {empty:true};

	localVideo.src = URL.createObjectURL(localStream);
	localVideo.play();
	localVideo.hidden = false;
	setResult("");

	peerConnection = new mozRTCPeerConnection();
	peerConnection.addStream(localStream);
	peerConnection.onaddstream = playRemoteStream;
	dataChannel = peerConnection.createDataChannel('channel', {});
	dataChannel.binaryType = 'blob';
	dataChannel.onmessage = onDataChannelMessage;

	key = Math.floor(Math.random()*1000000)*10;

	setResult("Creating offer...");
	peerConnection.createOffer(function(tmp2) {
		offer = tmp2;
		setResult("Setting local description...");
		peerConnection.setLocalDescription(offer, function() {
			setResult("Setting up connection to the signaling server...");
			connection = new EventSource("user_connect?key="+key);

			connection.addEventListener("connected", function(event) {
				setResult("Sending offer...");
				$.post('http://'+ip+'/send_offer?key='+key,
					{"type":offer.type,"sdp":offer.sdp});
				setResult("Waiting for answer...");
			});

			connection.addEventListener("updateQueue", function(event) {
				var tmp = JSON.parse(event.data);
				if (tmp.position === 0) {
					setResult("Waiting for answer...<br>"+
							"You are being processed for a connection");
				}
				else {
					setResult("Waiting for answer...<br>"+
						"You are queued "+tmp.position+"/"+tmp.queue+"<br>"+
						"The server can currently host "+tmp.capacity+" connections");
				}
			});

			connection.addEventListener("error", function(event) {
				reset();
				setResult("An error happened while trying to process your call",false);
				button.onclick = echoTest;
			});
			
			connection.addEventListener("answer", function(event) {
				peerConnection.setRemoteDescription(new mozRTCSessionDescription(JSON.parse(event.data)));
				setResult("Setting up peerConnection...");
				connection.close();
			});

			
		}, console.error);
	}, console.error);





	function playRemoteStream(event) {
		setResult("Setting up dataChannel...");
		console.log(event.stream); //Debug marker

		remoteStream = event.stream;
		
		timeoutDisconnect = setTimeout(function() {
			reset();
			setResult("DataChannel could not be etablished",false);
		},10011);
	}	// playRemoteStream



	function onDataChannelMessage (event) {
		console.log(event.data); //Debug marker
		
		if (event.data == "ping") {
			dataChannel.send("pong");

			if (!flagPing) {
				setResult("<font color='red' id='recordChar'>●</font>  Recording...");
				doBlink("recordChar");
				flagPing = true;
				setTimeout(function(){setResult("Setting up replay...");},4000);
			}


			if (timeoutDisconnect !== null) {
				clearTimeout(timeoutDisconnect);
				timeoutDisconnect = setTimeout(function() {
					reset();
					setResult("Connection Timeout",false);
				},5011);
			}
		}

		else if (event.data.match(/^recording_ended:(.+)$/)) { //end of the video recording
			param = JSON.parse(RegExp.$1);
			param.empty = false;
		}

		
		else if (param.empty === true) {

			if (timeoutDisconnect !== null) {
				clearTimeout(timeoutDisconnect);
				timeoutDisconnect = setTimeout(function() {
					reset();
					setResult("Connection Timeout",false);
				},5011);
			}

			recordingResult.push(event.data);
		}

		else if (param.empty !== true) {
			recorddiv.innerHTML += '<font size="0.5">Click on the picture to play the recoding</font><br>';
			var img = document.createElement('img');
			img.width = param.width;
			img.height = param.height;
			img.style = "border: 1px solid black;transform: rotateY(180deg);";
			var sound = document.createElement('audio');
			var randomnumber = Math.floor(Math.random()*1000000)*10+2;
			sound.id = randomnumber;
			img.audiosrc = randomnumber;
			sound.src = event.data;
			sound.preload = 'auto';
			img.videoArray = recordingResult;
			img.src = img.videoArray[0];
			img.onclick = function() {
				document.getElementById(img.audiosrc).play();
				var i = 0;
				var intervalFrame = setInterval(function(){
					img.src = img.videoArray[i];
					i++;
					if (i>=img.videoArray.length) {
						if (i == 1) {
							recorddiv.innerHTML = "<font color='red'>There is no video to display</font>";
							img.style = "";
						}
						clearInterval(intervalFrame);
						img.src = img.videoArray[0];
					}
				},1000/param.FPS);
			};

			
			recorddiv.appendChild(sound);
			recorddiv.appendChild(img);

			img.onclick();


			
			setResult("Test finished",true);
			dataChannel.send("conversationEnded");
			peerConnection.close();
			clearTimeout(timeoutDisconnect);

		}	// play recording

		else {
			console.log("mesage: ",event.data);
		}


	}	// onDataChannelMessage



	function reset() {
		remoteStream = null;
		
		try{dataChannel.send("conversationEnded");}catch(e){}

		if (peerConnection !== null) {peerConnection.close();}
		peerConnection = null;

		if (timeoutAnswer !== null) {clearInterval(timeoutAnswer);}
		timeoutAnswer = null;

		if (timeoutDisconnect !== null) {clearTimeout(timeoutDisconnect);}
		timeoutDisconnect = null;
		

		$.post('http://'+ip+'/reset?key='+key);
		
		key = null;

		recordingResult = [];
	}	// reset
}	// echoTest

function setResult(string, success) {
	step.innerHTML = string;
	if (success === undefined) {
		step.style.color = "";
	}
	else if (success === true) {
		step.style.color = "green";
	}
	else if (success === false) {
		step.style.color = "red";
		
		button.onclick = function(){
			window.location.href = window.location.href;
		};
		button.innerHTML = 'Try again';
		button.hidden = false;
	}
}