
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
    
      var pcViagenieArgs = {iceServers:
        [{
          url: "turn:66.228.45.110:3478", // numb.viagenie.ca
          username: "benjamin.mousseau@gmail.com",
          credential: "webrtc"
        }]
      };

      setResult("Setting pc1...");
      pc1 = new mozRTCPeerConnection(pcViagenieArgs);
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
        setResult("Setting pc1 localDescription...");
        pc1.setLocalDescription(descO,function() {
          setResult("Setting pc2 remoteDescription...");
          pc2.setRemoteDescription(new mozRTCSessionDescription(descO),function() {
            setResult("Creating answer...");
            pc2.createAnswer(function(descA) {
              setResult("Checking connection to STUN/TURN servers...");
              handleError(checkStunTurn(descA));
              setResult("Setting pc2 localDescription...");
              pc2.setLocalDescription(descA,function() {
                setResult("Setting pc1 remoteDescription...");
                pc1.setRemoteDescription(new mozRTCSessionDescription(descA),function(){},handleError);


                console.log("Viagenie:            "+
                              occurrences(descO.sdp,"typ host")+
                              " host candidates and "+
                              occurrences(descO.sdp,"typ srflx")+
                              " srflx candidates");

                console.log("Default STUN server: "+
                              occurrences(descA.sdp,"typ host")+
                              " host candidates and "+
                              occurrences(descA.sdp,"typ srflx")+
                              " srflx candidates");

              },handleError);
            },handleError);
          },handleError);
        },handleError);
      },handleError);
    },handleError);
  },handleError);
}   // localTest


/** Function count the occurrences of substring in a string;
 * @param {String} string   Required. The string;
 * @param {String} subString    Required. The string to search for;
 * @param {Boolean} allowOverlapping    Optional. Default: false;
 */
function occurrences(string, subString){

  string+=""; subString+="";
  if(subString.length<=0) return string.length+1;

  var n=0, pos=0;
  var len = subString.length;
  while(true){
    pos=string.indexOf(subString,pos);
    if(pos>=0){ n++; pos+= len; } else break;
  }
  return(n);
}
