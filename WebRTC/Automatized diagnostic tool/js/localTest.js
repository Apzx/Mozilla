
/**
 * Checks if the provided stream has an audio and video track
 * @param {Object} stream; The stream we want to test
 * @return {String}; Error string, or false if no error
 */
function testTracks(stream) {
	if (stream.getAudioTracks().length === 0) {return "AUDIO_ERROR";}
	if (stream.getVideoTracks().length === 0) {return "VIDEO_ERROR";}
	return false;
}

/**
 * Checks if the provided userAgent is not Firefox's, or if the version is too old.
 * @param {String} userAgent; The userAgent we want to test
 * @return {String}; Error string, or false if no error
 */
function testBrowser(userAgent) {
	if (userAgent.match(/Firefox/)) {
		if (userAgent.match(/Firefox\/([0-9]+)/)[1] < 23) {
			return "MOZ_TOO_OLD";
		}
		return false;
	}
	return "NOT_MOZ";
}

/**
 * Checks if the provided description does not comprt any STUN candidate
 * @param {Object} desc; The description we want to test
 * @return {String}; Error string, or false if no error
 */
function checkStunTurn(desc) {
	if (!desc.sdp.match(/srflx/)) {return "STUN_ERROR";}
	return false;
}

/**
 * Called when localTest() ends
 */
function localTestEnd() {
	if (typeof echoTest !== 'undefined') {
		button.onclick = echoTest;
		setResult("The first test is a sucess<br>Please execute the second test", true);
		button.hidden = false;
		button.innerHTML = "Execute test";
	}
	else {
		setResult("The first test is a sucess<br>The second test coudn't be loaded", true);
	}
}

/**
 * Local test function
 */
function localTest(){
	var pc1;
	var pc2;
	var ok1 = false;
	var ok2 = false;

	handleError(testBrowser(navigator.userAgent));
	
	setResult("Setting up fake stream...");
	navigator.mozGetUserMedia({video: true, audio: true, fake: true},function(fakeStream1) {
		navigator.mozGetUserMedia({video: true, audio: true, fake: true},function(fakeStream2) {
			
			setResult("Testing audio/video tracks...");
			handleError(testTracks(fakeStream1));
		
			setResult("Setting pc1...");
			pc1 = new mozRTCPeerConnection();
			pc1.addStream(fakeStream1);
			pc1.onaddstream = function() {
				if (ok2 === true) {localTestEnd();}
				else {
					ok1 = true;
					setResult("Success on view 1. Waiting for view 2...");
				}
			};
		
			
			setResult("Setting pc2...");
			pc2 = new mozRTCPeerConnection();
			pc2.addStream(fakeStream2);
			pc2.onaddstream = function() {
				if (ok1 === true) {localTestEnd();}
				else {
					ok2 = true;
					setResult("Success on view 2. Waiting for view 1...");
				}
			};
					
			setResult("Creating offer...");
			pc1.createOffer(function(descO) {
				setResult("Checking connection to STUN/TURN servers...");
				checkStunTurn(descO);
				setResult("Setting pc1 localDescription...");
				pc1.setLocalDescription(descO);
				setResult("Setting pc2 remoteDescription...");
				pc2.setRemoteDescription(new mozRTCSessionDescription(descO));
				setResult("Creating answer...");
				pc2.createAnswer(function(descA) {
					setResult("Setting pc2 localDescription...");
					pc2.setLocalDescription(descA);
					setResult("Setting pc1 remoteDescription...");
					pc1.setRemoteDescription(new mozRTCSessionDescription(descA));
				},handleError);
			},handleError);
		},handleError);
	},handleError);
}	// localTest

/**
 * Sets the information displayed to the user
 * @param {String} string; The string to display
 * @param {Boolean} success; Whether th emessage is an error message, a success message, or niether
 */
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

/**
 * Sets the information displayed to the user
 * @param {String} err; The passed string error, or false;
 * @exception; Interrupt the JS code
 */
function handleError(err) {
	if (err === false) {
		return;
	}
	switch (err) {
		case "NOT_MOZ":
			setResult("This test is engineered to be used on Firefox",false);
			break;
	
		case "MOZ_TOO_OLD":
			setResult("Your version of Firefox is not up to date<br>"+
				"Please update Firefox in <code>Help -> About Firefox</code>",false);
			break;
	
		case "AUDIO_ERROR":
			setResult("No sound is captured<ul>"+
				"<li>Check if your microphone is properly connected or muted</li>"+
				"</ul>",false);
			break;
	
		case "VIDEO_ERROR":
			setResult("No video is captured<ul>"+
				"<li>Check if your webcam is properly connected or disabled</li>"+
				"</ul>",false);
			break;
	
		case "PERMISSION_DENIED":
			setResult("The acess to the imput devices has been denied<br><ul>"+
				"<li>Check if there is any program that might block the use of the webcam</li>"+
				"</ul>",false);
			break;
	
		case "HARDWARE_UNAVAILABLE":
			setResult("Your input device(s) is/are alerady in use<br><ul>"+
				"<li>Close any other application that could use your webcam or microphone</li>"+
				"</ul>",false);
			break;
	
		case "NO_DEVICES_FOUND":
			setResult("Ther are no input devices detected<br><ul>"+
				"<li>Verify that your webcam and microphone are properly plugged</li>"+
				"<li>Make sure that the devices are not deactivated (Control pannel in Windows)</li>"+
				"</ul>",false);
			break;
	
		case "CONNECTION_ERROR":
			setResult("Could not connect to internet, check your connection",false);
			break;
	
		case "STUN_ERROR":
			setResult("Could not connect to the stun server",false);
			break;
	
		case "TURN_ERROR":
			setResult("Could not connect to the turn server",false);
			break;
			
	
		default:
			setResult("The following error occured:<br>"+err,false);
	}
	throw new Error("This is not an error: Stop js execution");
	
}	// handleError

