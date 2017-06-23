var Observation = require('can-observation');
var CID = require('can-cid');

var assign = require("can-util/js/assign/assign");
var canEvent = require('can-event');
var canBatch = require('can-event/batch/batch');
var eventLifecycle = require("can-event/lifecycle/lifecycle");

var canReflect = require("can-reflect");
var canSymbol = require("can-symbol");

// a simple observable and compute to test
// behaviors that require nesting of Observations
var simpleObservable = function(value){
	var obs = {
		get: function(){
			Observation.add(this, "value");
			return this.value;
		},
		set: function(value){
			var old = this.value;
			this.value = value;
			canEvent.dispatch.call(this, "value",[value, old]);
		},
		value: value
	};
	assign(obs, canEvent);
	CID(obs);
	return obs;
};

var simpleCompute = function(getter, name, primaryDepth){
	var observation, fn;

	fn = function(){
		Observation.add(fn,"change");
		return observation.get();
	};
	CID(fn, name);
	fn.updater = function(newVal, oldVal, batchNum){
		canEvent.dispatch.call(fn, {type: "change", batchNum: batchNum},[newVal, oldVal]);
	};
	fn._primaryDepth = primaryDepth || 0;

	observation = new Observation(getter, null, fn);

	fn.observation = observation;

	assign(fn, canEvent);
	fn.addEventListener = eventLifecycle.addAndSetup;
	fn.removeEventListener = eventLifecycle.removeAndTeardown;

	fn._eventSetup = function(){
		fn.bound = true;
		observation.start();
	};
	fn._eventTeardown = function(){
		fn.bound = false;
		observation.stop();
	};
	return fn;
};

var reflectiveCompute = function(getter, name){
	var observation,
		fn,
		handlers = [];

	fn = function(){
		Observation.add(fn);
		return observation.get();
	};
	CID(fn, name);

	observation = new Observation(getter);

	canReflect.set(fn, canSymbol.for("can.onValue"), function(handler){
		canReflect.onValue( observation, handler );
	});
	canReflect.set(fn, canSymbol.for("can.offValue"), function(handler){
		canReflect.offValue( observation, handler );
	});
	//canReflect.set(fn, Symbol.for("can.getValue"), observation.get.bind(observation));

	return fn;
};
var reflectiveValue = function(value){
	var handlers = [];

	var fn = function(newValue){
		if(arguments.length) {
			value = newValue;
			handlers.forEach(function(handler){
				canBatch.queue([handler, fn, [newValue]]);
			}, this);
		} else {
			Observation.add(fn);
			return value;
		}
	};
	CID(fn);
	canReflect.set(fn, canSymbol.for("can.onValue"), function(handler){
		handlers.push(handler);
	});
	canReflect.set(fn, canSymbol.for("can.offValue"), function(handler){
		var index = handlers.indexOf(handler);
		handlers.splice(index, 1);
	});
	return fn;
};

var reflectiveObservable = function(value){
	var obs = {
		get: function(){
			Observation.add(this, "value");
			return this.value;
		},
		set: function(value){
			this.value = value;
			this.handlers.value.forEach(function(handler){
				canBatch.queue([handler, this, [value]]);
			}, this);
		},
		value: value,
		handlers: {value: []}
	};
	canReflect.set(obs, canSymbol.for("can.onKeyValue"), function(eventName, handler){
		this.handlers[eventName].push(handler);
	});
	canReflect.set(obs, canSymbol.for("can.offKeyValue"), function(eventName, handler){
		var index = this.handlers.value.indexOf(handler);
		this.handlers[eventName].splice(index, 1);
	});

	CID(obs);
	return obs;
};

module.exports = {
	compute: simpleCompute,
	observable: simpleObservable,
	reflectiveCompute: reflectiveCompute,
	reflectiveValue: reflectiveValue,
	reflectiveObservable: reflectiveObservable
};
