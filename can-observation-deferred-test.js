var Observation = require('can-observation');
var QUnit = require('steal-qunit');
var CID = require('can-cid');
var assign = require("can-util/js/assign/assign");
var canEvent = require('can-event');
var canBatch = require("can-event/batch/batch");

QUnit.module('can-observation deferred');

// a simple observable to test
var simpleObservable = function(value) {
	var observable = {
		get: function() {
			Observation.add(this, "value");
			return this.value;
		},
		set: function(value) {
			var old = this.value;
			this.value = value;
			canEvent.dispatch.call(this, "value", [ value, old ]);
		},
		value: value
	};

	assign(observable, canEvent);
	CID(observable);
	return observable;
};

function prepareObservationTests(expected, asynchronous) {
	QUnit.expect(expected);

	var found = 0;
	function updater() {
		QUnit.ok(found++ < expected);

		if (asynchronous && found === expected) {
			QUnit.start();
		}
	}

	return new Observation(function() {}, null, { updater: updater });
}

QUnit.test('basics', function() {
	var observable = simpleObservable('0');

	var observation = prepareObservationTests(1);
	observation.makeDeferred();

	observation.startDeferred();
	observable.get();
	observation.stopDeferred();

	observable.set('1');
});

QUnit.asyncTest('asynchronous', function() {
	var observable = simpleObservable('0');

	var observation = prepareObservationTests(2, true);
	observation.makeDeferred();

	observation.startDeferred();
	setTimeout(function() {
		observable.get();

		setTimeout(function() {
			observation.stopDeferred();

			setTimeout(function() {
				observable.set('1');
				observable.set('2');
			}, 0);
		}, 0);
	}, 0);
});

QUnit.test('batched', function() {
	var observableA = simpleObservable('0');
	var observableB = simpleObservable('0');

	var observation = prepareObservationTests(2);
	observation.makeDeferred();

	observation.startDeferred();
	observableA.get();
	observableB.get();
	observation.stopDeferred();

	observableA.set('1');

	canBatch.start();
	observableA.set('2');
	observableB.set('2');
	canBatch.stop();
});

QUnit.test('multiple watches', function() {
	var observableA = simpleObservable('0');
	var observableB = simpleObservable('0');
	var observableC = simpleObservable('0');

	var observation = prepareObservationTests(4);
	observation.makeDeferred();

	observation.startDeferred();
	observableA.get();
	observation.stopDeferred();

	observableA.set('1');
	observableB.set('1');
	observableC.set('1');

	observation.startDeferred();
	observableA.get();
	observableB.get();
	observation.stopDeferred();

	observableA.set('2');
	observableB.set('2');
	observableC.set('2');

	observation.startDeferred();
	observableC.get();
	observation.stopDeferred();

	observableA.set('3');
	observableB.set('3');
	observableC.set('3');
});
