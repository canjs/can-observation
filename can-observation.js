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

var canEvent = require('can-event');
var canBatch = require('can-event/batch/batch');
var assign = require('can-util/js/assign/assign');
var namespace = require('can-util/namespace');

/**
 * @module {constructor} can-observation
 * @parent can-infrastructure
 * @group can-observation.prototype prototype
 * @group can-observation.static static
 * @group can-observation.types types
 *
 * Provides a machanism to notify when an observable has been read and a
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
	this.newObserved = {};
	this.oldObserved = null;
	this.func = func;
	this.context = context;
	this.compute = compute.updater ? compute : {updater: compute};
	this.onDependencyChange = this.onDependencyChange.bind(this);
	this.depth = null;
	this.childDepths = {};
	this.ignore = 0;
	this.inBatch = false;
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

assign(Observation.prototype,{
	// something is reading the value of this compute
	get: function(){
		if(this.bound) {
			// Flush events so this compute should have been notified.
			// But we want not only update
			canEvent.flush();
			// we've already got a value.  However, it might be possible that
			// something else is going to read this that has a lower "depth".
			// We might be updating, so we want to make sure that before we give
			// the outer compute a value, we've had a change to update.
			//var recordingObservation = Observation.isRecording();
			//if(recordingObservation && this.getDepth() >= recordingObservation.getDepth()) {
			Observation.update(this);
			//}

			return this.value;
		} else {
			return this.func.call(this.context);
		}
	},
	getPrimaryDepth: function() {
		return this.compute._primaryDepth || 0;
	},
	getDepth: function(){
		if(this.depth !== null) {
			return this.depth;
		} else {
			return (this.depth = this._getDepth());
		}
	},
	_getDepth: function(){
		var max = 0,
			childDepths = this.childDepths;
		for(var cid in childDepths) {
			if(childDepths[cid] > max) {
				max = childDepths[cid];
			}
		}
		return max + 1;
	},
	addEdge: function(objEv){
		objEv.obj.addEventListener(objEv.event, this.onDependencyChange);
		if(objEv.obj.observation) {
			this.childDepths[objEv.obj._cid] = objEv.obj.observation.getDepth();
			this.depth = null;
		}
	},
	removeEdge: function(objEv){
		objEv.obj.removeEventListener(objEv.event, this.onDependencyChange);
		if(objEv.obj.observation) {
			delete this.childDepths[objEv.obj._cid];
			this.depth = null;
		}
	},
	dependencyChange: function(ev){
		if(this.bound) {
			// Only need to register once per batchNum
			if(ev.batchNum !== this.batchNum) {
				Observation.registerUpdate(this, ev.batchNum);
				this.batchNum = ev.batchNum;
			}
		}
	},
	onDependencyChange: function(ev, newVal, oldVal){
		this.dependencyChange(ev, newVal, oldVal);
	},
	update: function(batchNum){
		if(this.bound) {
			// Keep the old value.
			this.oldValue = this.value;
			// Get the new value and register this event handler to any new observables.
			this.start();
		}
	},
	notify: function(batchNum){
		var oldValue = this.oldValue;
		this.oldValue = null;
		this.compute.updater(this.value, oldValue, batchNum);
	},
	getValueAndBind: function() {
		console.warn("can-observation: call start instead of getValueAndBind");
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
				oldObserved[name] = null;
			}
		}
		for (name in oldObserved) {
			obEv = oldObserved[name];
			if(obEv) {
				this.removeEdge(obEv);
			}
		}
	},
	teardown: function(){
		console.warn("can-observation: call stop instead of teardown");
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

/**
 * @typedef {{}} can-observation.observed Observed
 * @parent can-observation.types
 *
 * @description
 *
 * An object representing an observation.
 *
 * ```js
 * { "obj": map, "event": "prop1" }
 * ```
 *
 * @option {Object} obj The observable object
 * @option {String} event The event, or more likely property, that is being observed.
 */

// An array of arrays of observations that need to be updated.
// The primary sorting is with primaryDepth.  The secondary sorting is depth.
// [
//    {
//      primaryDepth: 0,
//      current: 0,
//      max: 19,
//      observations: [[depth0Observation, depth0Observation], [depth1Observation], [depth19Observation]]
//    },
//    {
//      primaryDepth: 1,
//      observations: [[depth0Observation, depth0Observation], [depth1Observation], [depth19Observation]]
//    }
// ]
//
var updateOrder = [],
	// the min registered primary depth, this is also the next to be executed.
	curPrimaryDepth = Infinity,
	// the max registered primary depth
	maxPrimaryDepth = 0,
	currentBatchNum;
var isUpdating;


// could get a registerUpdate from a 5 while a 1 is going on
// because the 5 listens to the 1
Observation.registerUpdate = function(observation, batchNum){

	var depth = observation.getDepth()-1;
	var primaryDepth = observation.getPrimaryDepth();

	curPrimaryDepth = Math.min(primaryDepth, curPrimaryDepth);
	maxPrimaryDepth = Math.max(primaryDepth, maxPrimaryDepth);

	var primary = updateOrder[primaryDepth] ||
		(updateOrder[primaryDepth] = {
			observations: [],
			current: Infinity,
			max: 0
		});
	var objs = primary.observations[depth] || (primary.observations[depth] = {updates: [], notifications: []});

	objs.updates.push(observation);

	primary.current = Math.min(depth, primary.current);
	primary.max = Math.max(depth, primary.max);
};

// This picks the observation with the smallest "depth" and
// calls update on it (`currentObservation`).
// If the `currentObservation` reads another observation with a higher depth (`deeperObservation`),
// the `deeperObservation` will be updated (via `updateUntil`).
// If the `currentObservation` reads another observation with a higher primary depth (`deeperPrimaryObservation`),
// the `deeperPrimaryObservation` will be updated, but not have its callback called
var afterCallbacks = [];
/* jshint maxdepth:7*/
Observation.updateAndNotify = function(ev, batchNum){
	currentBatchNum = batchNum;
	if(isUpdating){
		// only allow access at one time to this method.
		// This is because when calling .update ... that compute should be only able
		// to cause updates to other computes it directly reads.  It's possible that
		// reading other computes could call `updateAndNotify` again.
		// If we didn't return, it's possible that other computes could update unrelated to the
		// execution flow of the current compute being updated.  This would be very unexpected.
		return;
	}
	isUpdating = true;
	while(true) {
		if( curPrimaryDepth <= maxPrimaryDepth ) {
			var primary = updateOrder[curPrimaryDepth];

			if(primary && primary.current <= primary.max) {
				var last = primary.observations[primary.current];
				if(last) {
					var lastUpdate = last.updates.pop();
					if(lastUpdate) {
						last.notifications.push(lastUpdate);
						lastUpdate.update(currentBatchNum);
					} else {
						var lastNotify = last.notifications.pop();
						if(lastNotify) {
							//CURRENT_UPDATE_PRIMARY = primary;
							lastNotify.notify(currentBatchNum);
						} else {
							primary.current++;
						}
					}

				} else {
					primary.current++;
				}
				/*if(last && (cur = last.pop())) {
					CURRENT_UPDATE_PRIMARY = primary;
					cur.updateAndNotify(currentBatchNum);
				} else {
					primary.current++;
				}*/
			} else {
				curPrimaryDepth++;
			}
		} else {
			updateOrder = [];
			curPrimaryDepth = Infinity;
			maxPrimaryDepth = 0;
			isUpdating = false;
			var afterCB = afterCallbacks.slice(0);
			afterCallbacks = [];
			afterCB.forEach(function(cb){
				cb();
			});
			return;
		}
	}
};

Observation.afterUpdateAndNotify = function(callback){
	canBatch.after(function(){
		// here we know that the events have been fired, everything should
		// be notified. Now we have to wait until all computes have
		// finished firing.
		if(isUpdating) {
			afterCallbacks.push(callback);
		} else {
			callback();
		}
	});
};
canEvent.addEventListener.call(canBatch,"batchEnd", Observation.updateAndNotify);



// the problem with updateTo(observation)
// is that that the read might never change
// but the reader might be changing, and wont update itself, but something
// else will
Observation.update = function(observation){
	var primaryDepth = observation.getPrimaryDepth();
	var depth = observation.getDepth() - 1;
	var primary = updateOrder[primaryDepth];
	if(primary) {
		var observations = primary.observations[depth];
		if(observations) {
			var updates = observations.updates;
			var index = updates.indexOf(observation);
			if(index !== -1) {
				updates.splice(index,1);
				observation.update(currentBatchNum);
				observations.notifications.push(observation);
			}
		}
	}
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
	if (top && !top.ignore) {
		var evStr = event + "",
			name = obj._cid + '|' + evStr;

		if(top.traps) {
			top.traps.push({obj: obj, event: evStr, name: name});
		}
		else if(!top.newObserved[name]) {
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
	if (top) {
		if(top.traps) {
			top.traps.push.apply(top.traps, observes);
		} else {
			for(var i =0, len = observes.length; i < len; i++) {
				var trap = observes[i],
					name = trap.name;

				if(!top.newObserved[name]) {
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
		if (observationStack.length) {
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
	if (observationStack.length) {
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
	if (observationStack.length) {
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
	var last = len && observationStack[len-1];
	return last && (last.ignore === 0) && last;
};



module.exports = namespace.Observation = Observation;
