/* global setTimeout, require */
// # can-observation - nice
//
// This module:
//
// Exports a function that calls an arbitrary function and binds to any observables that
// function reads. When any of those observables change, a callback function is called.
//
// And ...
//
// Adds two main methods to can:
//
// - can.__observe - All other observes call this method to be visible to computed functions.
// - can.__notObserve - Returns a function that can not be observed.

var assign = require('can-util/js/assign/assign');
var isEmptyObject = require('can-util/js/is-empty-object/is-empty-object');
var namespace = require('can-namespace');
var canReflect = require('can-reflect');
var queues = require("can-queues");
var KeyTree = require("can-key-tree");
var ObservationStack = require("./observation-stack");
var canSymbol = require("can-symbol");


function makeMeta(handler, context, args) {
	return {log: [handler.name+" called because observation changed to", args[0]]};
}

function Observation(func, context, options){
	this.func = func;
	this.context = context;
	this.options = options || {priority: 0, isObservable: true};

	// These properties will manage what our new and old dependencies are.
	this.newDependencies = ObservationStack.makeDependenciesRecorder();
	this.oldDependencies = null;


	// The event handlers on this observation.
	this.handlers = new KeyTree([Object, Array],{
		// On the first handler, start the dependency observation.
		onFirst: this.start.bind(this),
		// When we have no handlers, stop dependency observation.
		onEmpty: this.stop.bind(this)
	});

	// Just a flag if we are bound or not
	this.bound = false;


	// Make functions we need to pass around w/o passing context
	this.onDependencyChange = this.onDependencyChange.bind(this);
	this.update = this.update.bind(this);

	//!steal-remove-start
	Object.defineProperty(this.onDependencyChange,"name",{
		value: "observation<"+this._cid+">.onDependencyChange"
	});
	Object.defineProperty(this.update,"name",{
		value: "observation<"+this._cid+">.update"
	});
	//!steal-remove-end

}


assign(Observation.prototype,{
	// something is reading the value of this compute
	get: function(){

		// If an external observation is tracking observables and
		// this compute can be listened to by "function" based computes ....
		// This doesn't happen with observations within computes
		if( this.options.isObservable && Observation.isRecording() ) {


			// ... tell the tracking compute to listen to change on this observation.
			ObservationStack.observe(this);
			// ... if we are not bound, we should bind so that
			// we don't have to re-read to get the value of this compute.
			if (!this.bound) {
				Observation.temporarilyBind(this);
			}

		}


		if(this.bound === true) {

			// we've already got a value.  However, it might be possible that
			// something else is going to read this that has a lower "depth".
			// We might be updating, so we want to make sure that before we give
			// the outer compute a value, we've had a change to update.;
			if(queues.deriveQueue.tasksRemainingCount() > 0) {
				Observation.updateChildrenAndSelf(this);
			}


			return this.value;
		} else {
			return this.func.call(this.context);
		}
	},

	// TODO: remove maybe when we get to scope?
	onDependencyChange: function(value){
		this.dependencyChange(value);
	},
	// This is called by one of the dependency observables
	// It will queue up an update to be run after all source observables have had time to change.
	dependencyChange: function(){
		if(this.bound === true) {
			// No need to flush b/c something in the queue caused this to change
			queues.deriveQueue.enqueue(this.update, this, [],{
				priority: this.options.priority
			});
		}
	},
	// Called to update its value as part of the `derive` queue.
	update: function(){
		if(this.bound === true) {
			// Keep the old value.
			var oldValue = this.value;
			this.oldValue = null;
			// Get the new value and register this event handler to any new observables.
			this.start();
			if(oldValue !== this.value) {
				// Call handlers for this observation
				queues.enqueueByQueue(this.handlers.getNode([]), this, [this.value, oldValue], makeMeta);
				return true;
			}
		}
	},
	/**
	 * @function can-observation.prototype.start start
	 * @parent can-observation.prototype prototype
	 *
	 * @signature `observation.start()`
	 *
	 * Starts observing changes and adds event listeners. [can-observation.prototype.value] will
	 * be available.
	 *
	 */
	start: function(){
		this.bound = true;
		// Store the old dependencies
		this.oldDependencies = this.newDependencies;

		// Immediately start recording dependencies.
		ObservationStack.start();
		// Call the observation's function.
		this.value = this.func.call(this.context);
		// Get the dependencies
		this.newDependencies = ObservationStack.stop();
		// Update the bindings
		ObservationStack.updateObservations(this);
	},

	/**
	 * @function can-observation.prototype.stop stop
	 * @parent can-observation.prototype prototype
	 *
	 * @signature `observation.stop()`
	 *
	 * Stops observing changes and removes all event listeners.
	 *
	 */
	stop: function(){
		// track this because events can be in the queue.
		this.bound = false;
		ObservationStack.stopObserving(this.newDependencies, this.onDependencyChange);
		this.newDependencies = ObservationStack.makeDependenciesRecorder();
	}
});

canReflect.assignSymbols(Observation.prototype,{
	"can.onValue": function(handler, queueName){
		this.handlers.add([queueName || "mutate", handler]);
	},
	"can.offValue": function(handler, queueName){
		this.handlers.delete([queueName || "mutate", handler]);
	},
	"can.getValue": Observation.prototype.get,
	"can.isValueLike": true,
	"can.isMapLike": false,
	"can.isListLike": false,
	"can.valueHasDependencies": function(){
		return this.bound ? !isEmptyObject(this.newDependencies) : undefined;
	},
	"can.getValueDependencies": function(){
		if(this.bound === true) {
			return this.newDependencies;
		}
		return undefined;
	}
});


var getValueDependenciesSymbol = canSymbol.for("can.getValueDependencies");

// This recursively checks if an observation's dependencies might be in the `derive` queue.
// If it is, we need to run it again.
// This can happen when we read an observation that updates deeply from something that changed
// In the batch.
// Alternatively, we could bring back `depth` and just re-compute
Observation.updateChildrenAndSelf = function(observation){
	if(observation.update && queues.deriveQueue.isEnqueued( observation.update ) === true) {
		// TODO ... probably want to be able to send log information
		// to explain why this needed to be updated
		queues.deriveQueue.flushQueuedTask(observation.update);
		return true;
	}

	if(observation[getValueDependenciesSymbol]) {
		var childHasChanged = false;
		var valueDependencies = observation[getValueDependenciesSymbol]().valueDependencies || [];
		valueDependencies.forEach(function(observable){
			if( Observation.updateChildrenAndSelf( observable ) ) {
				childHasChanged = true;
			}
		});
		return childHasChanged;
	} else {
		return false;
	}
};


Observation.add = ObservationStack.observe;
Observation.addAll = ObservationStack.observeMany;
Observation.ignore = ObservationStack.ignore;
Observation.trap = ObservationStack.trap;
Observation.trapsCount = ObservationStack.trapsCount;
Observation.isRecording = ObservationStack.isObserving;

// temporarily bind

var noop = function(){};
// A list of temporarily bound computes
var observables;
// Unbinds all temporarily bound computes.
var unbindComputes = function () {
	for (var i = 0, len = observables.length; i < len; i++) {
		canReflect.offValue(observables[i], noop);
	}
	observables = null;
};

// ### temporarilyBind
// Binds computes for a moment to cache their value and prevent re-calculating it.
Observation.temporarilyBind = function (compute) {
	var computeInstance = compute.computeInstance || compute;
	canReflect.onValue(computeInstance, noop);
	if (!observables) {
		observables = [];
		setTimeout(unbindComputes, 10);
	}
	observables.push(computeInstance);
};



if (namespace.Observation) {
	throw new Error("You can't have two versions of can-observation, check your dependencies");
} else {
	module.exports = namespace.Observation = Observation;
}
