/**
 * Starts the echo test
 */
function echoTest() {
  button.hidden = true;

  var remoteStream;
  var peerConnection;
  var dataChannel;

  var key;
  
  var IP = window.location.host;

  var timeoutAnswer = null;
  var timeoutDisconnect = null;

  var flagPing = false;

  var recordingResult = [];
  var param = {};

  // Setting the self view up
  localVideo.src = URL.createObjectURL(localStream);
  localVideo.play();
  localVideo.hidden = false;
  setResult("");

  // Setting the pc and dc up
  peerConnection = new mozRTCPeerConnection();
  peerConnection.addStream(localStream);
  peerConnection.onaddstream = playRemoteStream;
  dataChannel = peerConnection.createDataChannel('channel', {});
  dataChannel.binaryType = 'blob';
  dataChannel.onmessage = onDataChannelMessage;

  // Assigning a random key (note that a user key ends by 0 and a bot key ends by 1)
  key = Math.floor(Math.random()*1000000)*10;

  // Classic WebRTC call
  setResult("Creating offer...");
  peerConnection.createOffer(function(descO) {
    setResult("Setting local description...");
    peerConnection.setLocalDescription(descO, function() {

      // Initializing the EventSource connection with the server
      setResult("Setting up connection to the signaling server...");
      connection = new EventSource("user_connect?key="+key);

      // Connected event will fire once, when the connection is established,
      // and it sends the offer to the server
      connection.addEventListener("connected", function(event) {
        setResult("Sending offer...");
        $.post('http://'+IP+'/send_offer?key='+key,
          {"type":descO.type,"sdp":descO.sdp});
        setResult("Waiting for answer...");
      });

      // Event fired by the server when the position in the queue needs to be updated
      connection.addEventListener("updateQueue", function(event) {
        var tmp = JSON.parse(event.data);

        // Not in the queue anymore, the offer is beeing processed by a bot
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
      
      // Sends the answer to the user and close the EventSource connection
      connection.addEventListener("answer", function(event) {
        peerConnection.setRemoteDescription(new mozRTCSessionDescription(JSON.parse(event.data)));
        setResult("Setting up peerConnection...");
        connection.close();
      });

      connection.addEventListener("error", function(event) {
        reset();
        setResult("An error happened while trying to process your call",false);
        button.onclick = echoTest;
      });

      
    }, handleError);
  }, handleError);




  /**
   * Sets the recieved remote stream, and starts the timeout for the connection error
   * @param {Object} event;
   */
  function playRemoteStream(event) {
    setResult("Setting up dataChannel...");

    remoteStream = event.stream;
    
    timeoutDisconnect = setTimeout(function() {
      reset();
      setResult("DataChannel could not be etablished",false);
    },10011);
  } // playRemoteStream


  /**
   * Handles the recieved message by the data channel
   * @param {Object} event;
   */
  function onDataChannelMessage (event) {
    
    // A message is a proof of connection: reinitialize the connection timeout
    if (timeoutDisconnect !== null) {
      clearTimeout(timeoutDisconnect);
      timeoutDisconnect = setTimeout(function() {
        reset();
        setResult("Connection Timeout",false);
      },5011);
    }


    // Keepalive
    if (event.data == "ping") {
      dataChannel.send("pong");

      // This is the first ping, the recording has started
      if (!flagPing) {
        setResult("<font color='red' id='recordChar'>●</font>  Recording...");
        (function doBlink() {
          $("#recordChar").fadeTo(500, 0);
          setTimeout(function () {
            $("#recordChar").fadeTo(500, 1);
            setTimeout(doBlink, 750);
          }, 500);
        })();
        flagPing = true;
      }

      return;
    }


    // Parameters of the recordings
    if (event.data.match(/^param:(.+)$/)) {
      param = JSON.parse(RegExp.$1);
      setTimeout(setResult, param.length*1000, "Setting up replay...");
      return;
    }


    // Frame recieved
    if (event.data.match(/^data:image/)) {
      recordingResult.push(event.data);
      return;
    }


    // Recieved the audio part, recording ended, setting the replay up
    // Need a rework as there will be only one recording possible per page load (low priority)
    if (event.data.match(/^data:audio/)) {
      recorddiv.innerHTML += '<font size="0.5">Click on the picture to play the recoding</font><br>';

      // Creating the replay element
      var img = document.createElement('img');
      img.width = param.width;
      img.height = param.height;
      img.style = "border: 1px solid black; transform: rotateY(180deg);";
      img.videoArray = recordingResult;
      img.src = img.videoArray[0];

      // Creating the audio Element
      var sound = document.createElement('audio');
      sound.preload = 'auto';
      sound.src = event.data;

      // Binding the replay lement and the audio element together
      var randomnumber = Math.floor(Math.random()*1000000)*10+2;
      sound.id = randomnumber;
      img.audiosrc = randomnumber;

      // Setting the onClick event for the replayability
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
      return;
    } // play recording


    // Unexpected message
    console.log("unexpected mesage: ",event.data);



  } // onDataChannelMessage



  function reset() {
    remoteStream = null;
    
    try{dataChannel.send("conversationEnded");}catch(e){}

    if (peerConnection !== null) {peerConnection.close();}
    peerConnection = null;

    if (timeoutAnswer !== null) {clearInterval(timeoutAnswer);}
    timeoutAnswer = null;

    if (timeoutDisconnect !== null) {clearTimeout(timeoutDisconnect);}
    timeoutDisconnect = null;
    

    $.post('http://'+IP+'/reset?key='+key);
    
    key = null;

    recordingResult = [];
  } // reset
} // echoTest