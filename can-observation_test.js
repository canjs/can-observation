"esversion: 6";

require("./reader/reader_test");

var Observation = require('can-observation');
var QUnit = require('steal-qunit');
var CID = require('can-util/js/cid/cid');

var assign = require("can-util/js/assign/assign");
var canEvent = require('can-event');
var eventLifecycle = require("can-event/lifecycle/lifecycle");


QUnit.module('can-observation');

QUnit.test('nested traps are reset onto parent traps', function() {
    var obs1 = assign({}, canEvent);
    CID(obs1);
    var obs2 = assign({}, canEvent);
    CID(obs2);

	var oi = new Observation(function() {

		var getObserves1 = Observation.trap();

		Observation.add(obs1, "prop1");

		var getObserves2 = Observation.trap();
		Observation.add(obs2, "prop2");

		var observes2 = getObserves2();

		Observation.addAll(observes2);

		var observes1 = getObserves1();

		equal(observes1.length, 2, "two items");
		equal(observes1[0].obj, obs1);
		equal(observes1[1].obj, obs2);
	}, null, function() {

	});

	oi.start();
});

var simpleObservable = function(value){
	var obs = {
		get: function(){
			Observation.add(this, "value");
			return this.value;
		},
		set: function(value){
			var old = this.value;
			this.value = value;
			this.dispatch("value",[value, old]);
		},
		value: value
	};
	assign(obs, canEvent);
	CID(obs);
	return obs;
};

var simpleCompute = function(getter){
	var fn = function(){
		return observation.value;
	};

	var observation = new Observation(getter, null, function(newVal, oldVal){
		fn.dispatch("change", [newVal, oldVal]);
	});
	fn.observedInfo = observation;
	fn.addEventListener = eventLifecycle.addAndSetup;
	fn.removeEventListener = eventLifecycle.removeAndTeardown;
	assign(fn, canEvent);
	fn._eventSetup = function(){
		fn.bound = true;
		observation.start();
	};
	fn._eventTeardown = function(){
		fn.bound = false;
		observation.stop();
	};
};

test("Change propagation in a batch with late bindings (#2412)", function(){
	console.clear();

	var rootA = simpleObservable('a');
	var rootB = simpleObservable('b');

	var childA = new Observation(function() {
	  console.log('rootA - start eval');
	  return "childA"+rootA.get();
  	}, null, function(){});

	var grandChild = new Observation(function() {
	  console.log('grandChild - start eval');

	  var b = rootB.get();
	  console.log(`grandChild - rootB: ${b}`);
	  if (b === "b") {
	    return "grandChild->b";
	  }

	  var a = childA();
	  console.log(`grandChild - childA: ${a}`);
	  return "grandChild->"+a;
	});

	console.log("rootA",rootA.computeInstance._cid);
	console.log("rootB",rootB.computeInstance._cid);
	console.log("childA",childA.computeInstance._cid);
	console.log("grandChild",grandChild.computeInstance._cid);

	childA.bind('change', function(ev, newVal, oldVal) {
	  console.log(`childA change: ${newVal}`);
	});

	grandChild.bind('change', function(ev, newVal, oldVal) {
	  equal(newVal, "grandChild->childAA");
	});

	console.log("GRANCHILD = "+grandChild()); // false

	console.log("\nBATCH START\n");
	can.batch.start();
	rootA('A');
	rootB('B');
	can.batch.stop();

});
