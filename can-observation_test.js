require("./reader/reader_test");

var Observation = require('can-observation');
var QUnit = require('steal-qunit');
var CID = require('can-util/js/cid/cid');

var assign = require("can-util/js/assign/assign");
var canEvent = require('can-event');

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
