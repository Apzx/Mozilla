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
			chai.expect(testBrowser("Chrome/Opera/Whatever")).to.be.not.true;
			chai.expect(testBrowser("blah blah blah Firefox/19")).to.be.not.true;
			chai.expect(testBrowser("blah blah blah Firefox/24")).to.be.true;
		});
	
	
	});

	
	describe('checkStunTurn()', function() {
	
		it("should return an error string if the sdp doesnt comports STUN candidates", function() {
			var desc = {};
			desc.type = "whatever";
			desc.sdp = "blah blah 127.0.0.1:80 host\r\n";
			chai.expect(checkStunTurn(desc)).to.be.not.true;

			desc.sdp += "blah blah 127.0.0.1:80 srflx\r\n";
			chai.expect(checkStunTurn(desc)).to.be.true;
		});


	});
	
	describe('testTracks()', function() {


		it("should return an error string if there is a missing track", function(done) {
			navigator.mozGetUserMedia({fake:true,video:true}, function(stream) {
				chai.expect(testTracks(stream)).to.be.not.true;
				done();
			},console.error);
		});


		it("should return an error string if there is no video track", function(done) {
			navigator.mozGetUserMedia({fake:true,audio:true}, function(stream) {
				chai.expect(testTracks(stream)).to.be.not.true;
				done();
			},console.error);
		});


		it("should not return an error string if there are both tracks", function(done) {
			navigator.mozGetUserMedia({fake:true,audio:true,video:true}, function(stream) {
				chai.expect(testTracks(stream)).to.be.true;
				done();
			},console.error);
		});
	});



	describe('setResult()', function() {


		it("should display the correct message", function() {
			setResult("test test 123123");
			chai.expect(step.innerHTML).to.equal("test test 123123");

			var str = Math.floor(Math.random()*1000000000000000).toString(36);
			setResult(str);
			chai.expect(step.innerHTML).to.equal(str);
		});


		it("should display the text in the correct color", function() {
			setResult("Test");
			chai.expect(step.style.color).to.equal("");

			setResult("Test",true);
			chai.expect(step.style.color).to.equal("green");

			setResult("Test",false);
			chai.expect(step.style.color).to.equal("red");
		});


		it("should display the \"try again\" on the button if an error message is sent", function() {
			button.innerHTML = "placeholder";
			setResult("Test");
			chai.expect(button.innerHTML).to.not.match(/Try again/);

			button.innerHTML = "placeholder";
			setResult("Test",true);
			chai.expect(button.innerHTML).to.not.match(/Try again/);

			button.innerHTML = "placeholder";
			setResult("Test",false);
			chai.expect(button.innerHTML).to.match(/Try again/);
		});
	

		// describe('handleError()', function() {

		// 	it("should stop Javascript execution if the parameter isnt \"true\"", function() {
		// 		chai.expect(handleError).to.be.a("function");
		// 		chai.expect(handleError(true)).to.not.throw(Error);
		// 		chai.expect(handleError("anything else")).to.throw(Error);
		// 	});
	});
});