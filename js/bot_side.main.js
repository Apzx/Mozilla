function initializeBot() {
  $.ajax({
    url: 'http://'+IP+'/bot_connect?capacity='+MAX_NUMBER_OF_SIMULTANEOUS_CONNECTIONS,
    dataType: "jsonp",
    jsonpCallback: "callback",
    success: function(data) {
      botKey = data+'';
      body.innerHTML = "<b>Connected to signaling server with id: <code>"+botKey+"</code><b><br>";
      navigator.mozGetUserMedia({video: true, audio: true, fake: true},function(stream) {
        localStream = stream;
        askOffer();
      },console.error);
    }
  });
}

function askOffer() {
  if (body.getElementsByTagName('div').length < MAX_NUMBER_OF_SIMULTANEOUS_CONNECTIONS) {
    $.ajax({
      url: 'http://'+IP+'/ask_for_offer?key='+botKey,
      dataType: "jsonp",
      jsonpCallback: "callback",
      success: function(data) {
        if (data == "Nope.avi") {
          timeoutOffer = setTimeout(askOffer,2501);
        }
        else if (data == "reset_please") {
          window.location.href = window.location.href;
        }
        else {
          new Connection(data);
          askOffer();
        }
      }
    });
  }
  else {
    $.ajax({
      url: 'http://'+IP+'/botKeepalive?key='+botKey,
      dataType: "jsonp",
      jsonpCallback: "callback",
      success: function(data) {
        if (data == "reset_please") {
          window.location.href = window.location.href;
        }
        else {
          timeoutOffer = setTimeout(askOffer,2501);
        }
      }
    });
  }
} // askOffer


function Connection(data) {
  var that = this;

  that.key = data["key"];


  that.remoteVideo = null;
  that.remoteStream = null;
  that.peerConnection = null;
  that.dataChannel = null;

  that.pingInterval = null;
  that.timeoutDisconnect = null;

  that.canvasVideo = null;
  that.contextVideo = null;

  that.notif = null;

  that.flagping = false;


  that.remoteVideo = document.createElement('video');
  that.remoteVideo.hidden = true;
  that.remoteVideo.muted = true;
  body.appendChild(that.remoteVideo);

  that.notif = document.createElement('div');
  that.notif.innerHTML = "\""+that.key+"\" connected";
  body.appendChild(that.notif);

  that.canvasVideo = document.createElement('canvas');
  that.canvasVideo.width = RECORD_WIDTH;
  that.canvasVideo.height = RECORD_HEIGHT;

  that.contextVideo = that.canvasVideo.getContext('2d');


  that.peerConnection = new mozRTCPeerConnection();
  that.peerConnection.addStream(localStream);
  that.peerConnection.parentReference = that;

  that.peerConnection.onaddstream = function(event) {
    that.remoteStream = event.stream;
    that.remoteVideo.src = URL.createObjectURL(that.remoteStream);
    that.remoteVideo.play();
    that.pingInterval = setInterval(function(){
      try{that.peerConnection.dataChannel.send("ping");}catch(e){}
    },1002);

    that.timeoutDisconnect = setTimeout(function() {
      that.reset();
    },10007);
  };  // onaddstream
  
  that.peerConnection.ondatachannel = function (event) {
    that.peerConnection.dataChannel = event.channel;
    that.peerConnection.dataChannel.binaryType = 'blob';
    that.peerConnection.dataChannel.onmessage = function(event) {

      if (event.data == "pong") {
        clearTimeout(that.timeoutDisconnect);
        that.timeoutDisconnect = setTimeout(function() {
          that.reset();
        },5007);


        if (!that.flagping) {
          that.recordVideo();
          that.flagping = true;
        }
      }

      else if (event.data == "conversationEnded") {
        that.reset();
      }
    };  // onDataChannelMessage

  };

  that.peerConnection.setRemoteDescription(new mozRTCSessionDescription(data["offer"]));
  
  that.peerConnection.createAnswer(function(localDesc) {
    that.peerConnection.setLocalDescription(localDesc);
    $.post('http://'+IP+'/send_answer?key='+that.key, {"type":localDesc.type,"sdp":localDesc.sdp});
  },console.error,{});
}

Connection.prototype.recordVideo = function() {
  var that = this;
  var audioRecorder = new window.MediaRecorder(that.remoteStream);
  var audioResult;

  that.peerConnection.dataChannel.send("param:"+JSON.stringify({
    height: RECORD_HEIGHT,
    width: RECORD_WIDTH,
    length: RECORD_LENGTH,
    FPS: RECORD_FPS,
  }));

  audioRecorder.onerror = function() {
    throw "recorder_error";
  };
  audioRecorder.ondataavailable = function(event) {
    if (audioRecorder.state == 'recording') {
      var reader = new FileReader();
      reader.onload = function(e) {
        that.peerConnection.dataChannel.send(e.target.result);
      };
      if (that.intervalVideoRecord !== null) {
        clearInterval(that.intervalVideoRecord);
        that.intervalVideoRecord = null;
      }
      reader.readAsDataURL(event.data);
      audioRecorder.stop();
    }
  };  // audioRecorder.ondataavailable


  that.intervalVideoRecord = setInterval(function(){
    that.contextVideo.drawImage(that.remoteVideo, 0, 0, that.canvasVideo.width, that.canvasVideo.height);
    var tmp = that.canvasVideo.toDataURL();
    that.peerConnection.dataChannel.send(tmp);
  },1000/RECORD_FPS);

  audioRecorder.start(1000*RECORD_LENGTH);

  that.timeoutVideoRecord = setTimeout(function(){
    if (that.intervalVideoRecord !== null) {
      clearInterval(that.intervalVideoRecord);
      that.intervalVideoRecord = null;
    }
  },1000*RECORD_LENGTH);
};  // revordVideo

Connection.prototype.reset = function() {
  var that = this;
      
  that.remoteVideo.parentNode.removeChild(that.remoteVideo);
  that.notif.parentNode.removeChild(that.notif);

  that.peerConnection.close();

  if (that.pingInterval !== null) {
    clearInterval(that.pingInterval);
    that.pingInterval = null;
  }
  if (that.timeoutDisconnect !== null) {
    clearTimeout(that.timeoutDisconnect);
    that.timeoutDisconnect = null;
  }
  if (that.intervalVideoRecord !== null) {
    clearInterval(that.intervalVideoRecord);
    that.intervalVideoRecord = null;
  }
  if (that.timeoutVideoRecord !== null) {
    clearTimeout(that.timeoutVideoRecord);
    that.timeoutVideoRecord = null;
  }

  delete that;
};  // reset