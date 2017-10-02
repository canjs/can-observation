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
require('can-event');

var assign = require('can-util/js/assign/assign');
var isEmptyObject = require('can-util/js/is-empty-object/is-empty-object');
var namespace = require('can-namespace');
var canLog = require('can-util/js/log/log');
var canReflect = require('can-reflect');
var canSymbol = require('can-symbol');
var CID = require("can-cid");
var CIDMap = require("can-util/js/cid-map/cid-map");
var CIDSet = require("can-util/js/cid-set/cid-set");
var queues = require("can-queues");
var KeyTree = require("can-key-tree");

/**
 * @module {constructor} can-observation
 * @parent can-infrastructure
 * @group can-observation.prototype prototype
 * @group can-observation.static static
 * @group can-observation.types types
 * @package ./package.json
 *
 * Provides a mechanism to notify when an observable has been read and a
 * way to observe those reads called within a given function.
 *
 * @signature `new Observation(func, context, compute)`
 *
 * Creates an observation of a given function called with `this` as
 * a given context. Calls back `compute` when the return value of `func` changes.
 *
 * @param {function} func The function whose value is being observed.
 * @param {*} context What `this` should be when `func` is called.
 * @param {function(*,*,Number)|can-compute} updated(newValue, oldValue, batchNum) A function to call when `func`'s return value changes.
 *
 * @body
 *
 * ## Use
 *
 * Instances of `Observation` are rarely created directly.  Instead, use [can-compute]'s more friendly API to
 * observe when a function's value changes. [can-compute] uses `can-observation` internally.
 *
 * `Observation`'s static methods like: [can-observation.add], [can-observation.ignore], and [can-observation.trap]
 * are used more commonly to control which observable events a compute will listen to.
 *
 * To use `can-observation` directly, create something observable (supports `addEventListener`) and
 * calls [can-observation.add] like:
 *
 * ```js
 * var Observation = require("can-observation");
 * var assign = require("can-util/js/assign/assign");
 * var canEvent = require("can-event");
 *
 * var me = assign({}, canEvent);
 *
 * var name = "Justin";
 * Object.defineProperty(me,"name",{
 *   get: function(){
 *     Observation.add(this,"name");
 *     return name;
 *   },
 *   set: function(newVal) {
 *     var oldVal = name;
 *     name = newVal;
 *     this.dispatch("name", newVal, oldVal);
 *   }
 * })
 * ```
 *
 * Next, create an observation instance with a function that reads the observable value:
 *
 * ```js
 * var observation = new Observation(function(){
 *   return "Hello "+me.name;
 * }, null, function(newVal, oldVal, batchNum){
 *   console.log(newVal);
 * })
 * ```
 *
 * Finally, call `observation.start()` to start listening and be notified of changes:
 *
 * ```js
 * observation.start();
 * observation.value   //-> "Hello Justin";
 * me.name = "Ramiya"; // console.logs -> "Hello Ramiya"
 * ```
 */



function Observation(func, context, compute){
	CID(this);
	this.newObserved = {};
	this.oldObserved = null;
	this.func = func;
	this.context = context;
	this.compute = compute && (compute.updater || ("isObservable" in compute)) ? compute : {updater: compute};
	this.isObservable = typeof compute === "object" ? compute.isObservable : true;
	var observation = this;
	this.onDependencyChange = function dependencyChange(value, legacyValue){
		observation.dependencyChange(this, value, legacyValue);
	};

	this.update = this.update.bind(this);
	//!steal-remove-start
	Object.defineProperty(this.onDependencyChange,"name",{
		value: "observation<"+this._cid+">.onDependencyChange"
	});
	Object.defineProperty(this.update,"name",{
		value: "observation<"+this._cid+">.update"
	});
	//!steal-remove-end
	this.ignore = 0;
	this.needsUpdate = false;
	this.handlers = null;
}

// ### observationStack
//
// This is the stack of all `observation` objects that are the result of
// recursive `getValueAndBind` calls.
// `getValueAndBind` can indirectly call itself anytime a compute reads another
// compute.
//
// An `observation` entry looks like:
//
//     {
//       observed: {
//         "map1|first": {obj: map, event: "first"},
//         "map1|last" : {obj: map, event: "last"}
//       },
//       names: "map1|firstmap1|last"
//     }
//
// Where:
// - `observed` is a map of `"cid|event"` to the observable and event.
//   We use keys like `"cid|event"` to quickly identify if we have already observed this observable.
// - `names` is all the keys so we can quickly tell if two observation objects are the same.
var observationStack = [];
// expose the obseravation stack
Observation.observationStack = observationStack;

var remaining = {updates: 0, notifications: 0};
// expose the remaining state
Observation.remaining = remaining;

assign(Observation.prototype,{
	// something is reading the value of this compute
	get: function(){

		// If an external observation is tracking observables and
		// this compute can be listened to by "function" based computes ....
		// This doesn't happen with observations within computes
		if( this.isObservable && Observation.isRecording() ) {


			// ... tell the tracking compute to listen to change on this observation.
			Observation.add(this);
			// ... if we are not bound, we should bind so that
			// we don't have to re-read to get the value of this compute.
			if (!this.bound) {
				Observation.temporarilyBind(this);
			}

		}


		if(this.bound === true) {

			// all computes should be notified and in the derive queue
			// so there's no need to flush anymore
			// canEvent.flush();

			// we've already got a value.  However, it might be possible that
			// something else is going to read this that has a lower "depth".
			// We might be updating, so we want to make sure that before we give
			// the outer compute a value, we've had a change to update.;
			if(queues.deriveQueue.tasksRemainingCount > 0) {
				Observation.updateChildrenAndSelf(this);
			}


			return this.value;
		} else {
			return this.func.call(this.context);
		}
	},
	getPrimaryDepth: function() {
		return this.compute._primaryDepth || 0;
	},
	addEdge: function(objEv){
		if(objEv.event === "undefined") {
			canReflect.onValue(objEv.obj, this.onDependencyChange,"notify");
		} else {
			canReflect.onKeyValue(objEv.obj, objEv.event, this.onDependencyChange,"notify");
		}
	},
	removeEdge: function(objEv){
		if(objEv.event === "undefined") {
			canReflect.offValue(objEv.obj, this.onDependencyChange,"notify");
		} else {
			canReflect.offKeyValue(objEv.obj, objEv.event, this.onDependencyChange,"notify");
		}
	},
	dependencyChange: function(){
		if(this.bound === true) {
			queues.deriveQueue.enqueue(this.update, this, [],{
				priority: this.getPrimaryDepth()
			});
		}
	},
	onDependencyChange: function(value){
		this.dependencyChange(value);
	},
	update: function(batchNum){
		if(this.bound === true) {
			// Keep the old value.
			var oldValue = this.value;
			this.oldValue = null;
			// Get the new value and register this event handler to any new observables.
			this.start();
			if(oldValue !== this.value) {
				this.compute.updater(this.value, oldValue, batchNum);
				return true;
			}
		}
	},
	getValueAndBind: function() {
		canLog.warn("can-observation: call start instead of getValueAndBind");
		return this.start();
	},
	// ## getValueAndBind
	// Calls `func` with "this" as `context` and binds to any observables that
	// `func` reads. When any of those observables change, `onchanged` is called.
	// `oldObservation` is A map of observable / event pairs this function used to be listening to.
	// Returns the `newInfo` set of listeners and the value `func` returned.
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
		this.oldObserved = this.newObserved || {};
		this.ignore = 0;
		this.newObserved = {};

		// Add this function call's observation to the stack,
		// runs the function, pops off the observation, and returns it.

		observationStack.push(this);
		this.value = this.func.call(this.context);
		observationStack.pop();
		this.updateBindings();
	},
	// ### updateBindings
	// Unbinds everything in `oldObserved`.
	updateBindings: function(){
		var newObserved = this.newObserved,
			oldObserved = this.oldObserved,
			name,
			obEv;

		for (name in newObserved) {
			obEv = newObserved[name];
			if(!oldObserved[name]) {
				this.addEdge(obEv);
			} else {
				oldObserved[name] = undefined;
			}
		}
		for (name in oldObserved) {
			obEv = oldObserved[name];
			if(obEv !== undefined) {
				this.removeEdge(obEv);
			}
		}
	},
	teardown: function(){
		canLog.warn("can-observation: call stop instead of teardown");
		return this.stop();
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
		for (var name in this.newObserved) {
			var ob = this.newObserved[name];
			this.removeEdge(ob);
		}
		this.newObserved = {};
	}
	/**
	 * @property {*} can-observation.prototype.value
	 *
	 * The return value of the function once [can-observation.prototype.start] is called.
	 *
	 */
});




// This is going to recursively check if there's any child compute
// that .needsUpdate.
// If there is, we'll update every parent on the way to ourselves.
Observation.updateChildrenAndSelf = function(observation){
	// check if there's children that .needsUpdate
	if( queues.deriveQueue.isEnqueued( observation.update ) === true) {
		// TODO ... probably want to be able to send log information
		// to explain why this needed to be updated
		queues.deriveQueue.flushQueuedTask(observation.update);
		return true;
	}
	var childHasChanged = false;
	for(var prop in observation.newObserved) {
		if(observation.newObserved[prop].obj.observation) {
			if( Observation.updateChildrenAndSelf(observation.newObserved[prop].obj.observation) ) {
				childHasChanged = true;
			}
		}
	}
	if(childHasChanged === true) {
		observation.update();
		return true;
	}
};

Observation.afterUpdateAndNotify = function(callback){
	queues.mutateQueue.enqueue(function afterPreviousEvents(){
        queues.mutateQueue.enqueue(callback);
    });
    queues.flush();
};




/**
 * @function can-observation.add add
 * @parent can-observation.static
 *
 * Signals that an object's property is being observed, so that any functions
 * that are recording observations will see that this object is a dependency.
 *
 * @signature `Observation.add(obj, event)`
 *
 * Signals that an event should be observed. Adds the observable being read to
 * the top of the stack.
 *
 * ```js
 * Observation.add(obj, "prop1");
 * ```
 *
 * @param {Object} obj An observable object which is being observed.
 * @param {String} event The name of the event (or property) that is being observed.
 *
 */
Observation.add = function (obj, event) {
	var top = observationStack[observationStack.length-1];
	if (top !== undefined && !top.ignore) {
		var evStr = event + "",
			name = obj._cid + '|' + evStr;

		if(top.traps !== undefined) {
			top.traps.push({obj: obj, event: evStr, name: name});
		}
		else {
			top.newObserved[name] = {
				obj: obj,
				event: evStr
			};
		}
	}
};

/**
 * @function can-observation.addAll addAll
 * @parent can-observation.static
 * @signature `Observation.addAll(observes)`
 *
 * The same as `Observation.add` but takes an array of [can-observation.observed] objects.
 * This will most often by used in coordination with [can-observation.trap]:
 *
 * ```js
 * var untrap = Observation.trap();
 *
 * Observation.add(obj, "prop3");
 *
 * var traps = untrap();
 * Oservation.addAll(traps);
 * ```
 *
 * @param {Array<can-observation.observed>} observes An array of [can-observation.observed]s.
 */
Observation.addAll = function(observes){
	// a bit more optimized so we don't have to repeat everything in
	// Observation.add
	var top = observationStack[observationStack.length-1];
	if (top !== undefined) {
		if(top.traps !== undefined) {
			top.traps.push.apply(top.traps, observes);
		} else {
			for(var i =0, len = observes.length; i < len; i++) {
				var trap = observes[i],
					name = trap.name;

				if(top.newObserved[name] === undefined) {
					top.newObserved[name] = trap;
				}
			}
		}

	}
};

/**
 * @function can-observation.ignore ignore
 * @parent can-observation.static
 * @signature `Observation.ignore(fn)`
 *
 * Creates a function that, when called, will prevent observations from
 * being applied.
 *
 * ```js
 * var fn = Observation.ignore(function(){
 *   // This will be ignored
 *   Observation.add(obj, "prop1");
 * });
 *
 * fn();
 * Observation.trapCount(); // -> 0
 * ```
 *
 * @param {Function} fn Any function that contains potential calls to
 * [Observation.add].
 *
 * @return {Function} A function that is free of observation side-effects.
 */
Observation.ignore = function(fn){
	return function(){
		if (observationStack.length > 0) {
			var top = observationStack[observationStack.length-1];
			top.ignore++;
			var res = fn.apply(this, arguments);
			top.ignore--;
			return res;
		} else {
			return fn.apply(this, arguments);
		}
	};
};


/**
 * @function can-observation.trap trap
 * @parent can-observation.static
 * @signature `Observation.trap()`
 *
 * Trap all observations until the `untrap` function is called. The state of
 * traps prior to `Observation.trap()` will be restored when `untrap()` is called.
 *
 * ```js
 * var untrap = Observation.trap();
 *
 * Observation.add(obj, "prop1");
 *
 * var traps = untrap();
 * console.log(traps[0].obj === obj); // -> true
 * ```
 *
 * @return {can-observation.getTrapped} A function to get the trapped observations.
 */
Observation.trap = function(){
	if (observationStack.length > 0) {
		var top = observationStack[observationStack.length-1];
		var oldTraps = top.traps;
		var traps = top.traps = [];
		return function(){
			top.traps = oldTraps;
			return traps;
		};
	} else {
		return function(){return [];};
	}
};
/**
 * @typedef {function} can-observation.getTrapped getTrapped
 * @parent can-observation.types
 *
 * @signature `getTrapped()`
 *
 *   Returns the trapped observables captured by [can-observation.trap].
 *
 *   @return {Array<can-observation.observed>}
 */

Observation.trapsCount = function(){
	if (observationStack.length > 0) {
		var top = observationStack[observationStack.length-1];
		return top.traps.length;
	} else {
		return 0;
	}
};
// sets an array of observable notifications on the current top of the observe stack.

/**
 * @function can-observation.isRecording isRecording
 * @parent can-observation.static
 * @signature `Observation.isRecording()`
 *
 * Returns if some function is in the process of recording observes.
 *
 * @return {Boolean} True if a function is in the process of recording observes.
 */
Observation.isRecording = function(){
	var len = observationStack.length;
	var last = len > 0 && observationStack[len-1];
	return last && (last.ignore === 0);
};


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


// can-reflect bindings ===========

function makeMeta(handler, context, args) {
	return {log: [handler.name+" called because observation changed to", args[0]]}
}

var callHandlers = function(newValue){
	queues.enqueueByQueue(this.handlers.getNode([]), this, [newValue], makeMeta);
};

Observation.prototype.hasDependencies = function(){
	return this.bound ? !isEmptyObject(this.newObserved) : undefined;
};

canReflect.assignSymbols(Observation.prototype,{
	"can.onValue": function(handler, queueName){
		if(!this.handlers) {
			this.handlers = new KeyTree([Object, Array]);
			//!steal-remove-start
			if(this.compute.updater) {
				canLog.warn("can-observation bound to with an existing handler");
			}
			//!steal-remove-end
			this.compute.updater = callHandlers.bind(this);
		}

		if(this.handlers.size() === 0) {
			this.start();
		}

		this.handlers.add([queueName || "mutate", handler]);
	},
	"can.offValue": function(handler, queueName){
		if (this.handlers) {
			this.handlers.delete([queueName || "mutate", handler]);
			if(this.handlers.size() === 0) {
				this.stop();
			}
		}
	},
	"can.getValue": Observation.prototype.get,
	"can.isValueLike": true,
	"can.isMapLike": false,
	"can.isListLike": false,
	"can.valueHasDependencies": Observation.prototype.hasDependencies
});


canReflect.set(Observation.prototype, canSymbol.for("can.getValueDependencies"), function() {
	var rets;
	if(this.bound === true) {
		rets = {};
		canReflect.eachKey(this.newObserved || {}, function(dep) {
			if(canReflect.isValueLike(dep.obj)) {
				rets.valueDependencies = rets.valueDependencies || new CIDSet();
				rets.valueDependencies.add(dep.obj);
			} else {
				rets.keyDependencies = rets.keyDependencies || new CIDMap();
				if(rets.keyDependencies.get(dep.obj)) {
					rets.keyDependencies.get(dep.obj).push(dep.event);
				} else {
					rets.keyDependencies.set(dep.obj, [dep.event]);
				}
			}
		});
	}
	return rets;
});

if (namespace.Observation) {
	throw new Error("You can't have two versions of can-observation, check your dependencies");
} else {
	module.exports = namespace.Observation = Observation;
}
