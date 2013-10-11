describe('localTest.js', function() {


  it("should call every function once", function(done) {
    
    navigator.mozGetUserMedia({fake:true,audio:true,video:true}, function(stream) {
      var spy1 = sinon.spy(window, "testBrowser");
      var spy2 = sinon.spy(window, "checkStunTurn");
      var spy3 = sinon.spy(window, "testTracks");

      localTestEnd = function() {
        chai.expect(testBrowser.calledOnce).to.be.true;
        chai.expect(checkStunTurn.calledOnce).to.be.true;
        chai.expect(testTracks.calledOnce).to.be.true;
        
        testBrowser.restore();
        checkStunTurn.restore();
        testTracks.restore();

        done();
      };

      localTest(stream);
    },console.error);
  });
    
  describe('testBrowser()', function() {
  
    it("should return an error string if the parameter is not a Firefox user agent, or if the version is too old", function() {
      chai.expect(testBrowser("Chrome/Opera/Whatever")).to.be.a("String");
      chai.expect(testBrowser("blah blah blah Firefox/19")).to.a("String");
      chai.expect(testBrowser("blah blah blah Firefox/24")).to.be.false;
    });
  
  
  });

  
  describe('checkStunTurn()', function() {
  
    it("should return an error string if the sdp doesnt comports STUN candidates", function() {
      var desc = {};
      desc.type = "whatever";
      desc.sdp = "blah blah 127.0.0.1:80 host\r\n";
      chai.expect(checkStunTurn(desc)).to.be.a("String");

      desc.sdp += "blah blah 127.0.0.1:80 srflx\r\n";
      chai.expect(checkStunTurn(desc)).to.be.false;
    });


  });
  
  describe('testTracks()', function() {


    it("should return an error string if there is a missing track", function(done) {
      navigator.mozGetUserMedia({fake:true,video:true}, function(stream) {
        chai.expect(testTracks(stream)).to.be.a("String");
        done();
      },console.error);
    });


    it("should return an error string if there is no video track", function(done) {
      navigator.mozGetUserMedia({fake:true,audio:true}, function(stream) {
        chai.expect(testTracks(stream)).to.be.a("String");
        done();
      },console.error);
    });


    it("should not return an error string if there are both tracks", function(done) {
      navigator.mozGetUserMedia({fake:true,audio:true,video:true}, function(stream) {
        chai.expect(testTracks(stream)).to.be.false;
        done();
      },console.error);
    });
  });
});


// Dupes of the function for the testing
function setResult(string, success) {}
function handleError(err) {}