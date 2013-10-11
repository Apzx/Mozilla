var MAX_NUMBER_OF_SIMULTANEOUS_CONNECTIONS = 1;
var ip = '127.0.0.1:8080';

var recordLength = 4; // in seconds
var recordFPS = 10;
var recordHeight = 120;
var recordWidth = 160;


describe('bot_side.main.js', function() {

	it("should work", function() {
		chai.expect(true).to.be.true;
	});
		
	describe('Connection', function() {
	
		it("should have the correct attributes at initiation with a fake sdp", function(done) {
			navigator.mozGetUserMedia({fake:true,video:true,audio:true}, function(stream) {
				window.localStream = stream;
				navigator.mozGetUserMedia({fake:true,video:true,audio:true}, function(stream) {
					var data = {};
					data.offer = {type: "offer", sdp: "\r\n"};
					data.key = 1337;
					var that = new Connection(data);
					console.log(that); //Debug marker

					chai.expect(that).to.be.an("object");
					chai.expect(that).to.have.keys(["canvasVideo", "contextVideo", "dataChannel", "flagping", "key", "notif", "peerConnection", "pingInterval", "remoteStream", "remoteVideo", "timeoutDisconnect"]);

					chai.expect(that.canvasVideo).to.be.an("object");
					chai.expect(that.canvasVideo+"").to.match(/HTMLCanvasElement/);

					chai.expect(that.contextVideo).to.be.an("object");
					chai.expect(that.contextVideo+"").to.match(/CanvasRenderingContext2D/);

					chai.expect(that.dataChannel).to.be.null;

					chai.expect(that.flagping).to.be.a("boolean");

					chai.expect(that.key).to.be.a("number");
					chai.expect(that.key).to.equal(1337);

					chai.expect(that.notif).to.be.an("object");
					chai.expect(that.notif+"").to.match(/HTMLDivElement/);

					chai.expect(that.peerConnection).to.be.an("object");
					chai.expect(that.peerConnection+"").to.match(/mozRTCPeerConnection/);

					chai.expect(that.pingInterval).to.be.null;

					chai.expect(that.remoteStream).to.be.null;

					chai.expect(that.remoteVideo).to.be.an("object");
					chai.expect(that.remoteVideo+"").to.match(/HTMLVideoElement/);

					chai.expect(that.timeoutDisconnect).to.be.null;

					delete that;
					delete window.localStream;
					done();

				},console.error);
			},console.error);
		});
	
	});

});