// # can-observation
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

var canBatch = require('can-event/batch/');
var assign = require('can-util/js/assign/');
var namespace = require('can-util/namespace');

/**
 * @module {constructor} can-observation
 * @parent can-infrastructure
 *
 * @signature `new Observation(func, context, compute)`
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
	this.ready = false;
	compute.observedInfo = this;
	this.setReady = this._setReady.bind(this);
}

// ### observationStack
//
// This is the stack of all `observedInfo` objects that are the result of
// recursive `getValueAndBind` calls.
// `getValueAndBind` can indirectly call itself anytime a compute reads another
// compute.
//
// An `observedInfo` entry looks like:
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
// - `names` is all the keys so we can quickly tell if two observedInfo objects are the same.
var observationStack = [];

assign(Observation.prototype,{
	getPrimaryDepth: function() {
		return this.compute._primaryDepth || 0;
	},
	_setReady: function(){
		this.ready = true;
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
		if(objEv.obj.observedInfo) {
			this.childDepths[objEv.obj._cid] = objEv.obj.observedInfo.getDepth();
			this.depth = null;
		}
	},
	removeEdge: function(objEv){
		objEv.obj.removeEventListener(objEv.event, this.onDependencyChange);
		if(objEv.obj.observedInfo) {
			delete this.childDepths[objEv.obj._cid];
			this.depth = null;
		}
	},
	dependencyChange: function(ev){
		if(this.bound && this.ready) {
			if(ev.batchNum !== undefined) {
				// Only need to register once per batchNum
				if(ev.batchNum !== this.batchNum) {
					Observation.registerUpdate(this);
					this.batchNum = ev.batchNum;
				}
			} else {
				this.updateCompute(ev.batchNum);
			}
		}
	},
	onDependencyChange: function(ev, newVal, oldVal){
		this.dependencyChange(ev, newVal, oldVal);
	},
	updateCompute: function(batchNum){
		// It's possible this became unbound since it was registered to update
		// Only actually update if something didn't come in and unbind it. (#2188).
		if(this.bound) {
			// Keep the old value.
			var oldValue = this.value;
			// Get the new value and register this event handler to any new observables.
			this.getValueAndBind();
			// Update the compute with the new value.
			this.compute.updater(this.value, oldValue, batchNum);
		}
	},
	// ## getValueAndBind
	// Calls `func` with "this" as `context` and binds to any observables that
	// `func` reads. When any of those observables change, `onchanged` is called.
	// `oldObservation` is A map of observable / event pairs this function used to be listening to.
	// Returns the `newInfo` set of listeners and the value `func` returned.
	getValueAndBind: function() {
		this.bound = true;
		this.oldObserved = this.newObserved || {};
		this.ignore = 0;
		this.newObserved = {};
		this.ready = false;

		// Add this function call's observedInfo to the stack,
		// runs the function, pops off the observedInfo, and returns it.

		observationStack.push(this);
		this.value = this.func.call(this.context);
		observationStack.pop();
		this.updateBindings();
		canBatch.afterPreviousEvents(this.setReady);
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
		// track this because events can be in the queue.
		this.bound = false;
		for (var name in this.newObserved) {
			var ob = this.newObserved[name];
			this.removeEdge(ob);
		}
		this.newObserved = {};
	}
});

/**
 * @typedef {{}} observed observed
 * @parent can-observation
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


var updateOrder = [],
	curPrimaryDepth = Infinity,
	maxPrimaryDepth = 0;

// could get a registerUpdate from a 5 while a 1 is going on because the 5 listens to the 1
Observation.registerUpdate = function(observeInfo, batchNum){
	var depth = observeInfo.getDepth()-1;
	var primaryDepth = observeInfo.getPrimaryDepth();

	curPrimaryDepth = Math.min(primaryDepth, curPrimaryDepth);
	maxPrimaryDepth = Math.max(primaryDepth, maxPrimaryDepth);

	var primary = updateOrder[primaryDepth] ||
		(updateOrder[primaryDepth] = {
			observeInfos: [],
			current: Infinity,
			max: 0
		});
	var objs = primary.observeInfos[depth] || (primary.observeInfos[depth] = []);

	objs.push(observeInfo);

	primary.current = Math.min(depth, primary.current);
	primary.max = Math.max(depth, primary.max);
};

Observation.batchEnd = function(batchNum){
	var cur;

	while(true) {
		if(curPrimaryDepth <= maxPrimaryDepth) {
			var primary = updateOrder[curPrimaryDepth];

			if(primary && primary.current <= primary.max) {
				var last = primary.observeInfos[primary.current];
				if(last && (cur = last.pop())) {
					cur.updateCompute(batchNum);
				} else {
					primary.current++;
				}
			} else {
				curPrimaryDepth++;
			}
		} else {
			updateOrder = [];
			curPrimaryDepth = Infinity;
			maxPrimaryDepth = 0;
			return;
		}
	}
};

/**
 * @function Observation.add add
 * @parent can-observation
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
 * @body
 *
 * Signals that an object's property is being observed, so that any functions that are recording observations will see that this object is a dependency.
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
 * @function Observation.addAll addAll
 * @parent can-observation
 * @signature `Observation.addAll(observes)`
 *
 * The same as `Observation.add` but takes an array of [observed] objects.
 * This will most often by used in coordination with [Observation.trap]:
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
 * @param {Array<observed>} observes An array of [observed]s.
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
 * @function Observation.ignore ignore
 * @parent can-observation
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
 * @function Observation.trap trap
 * @parent can-observation
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
 * @return {Function} A function to untrap the current observations.
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
 * @function Observation.isRecording isRecording
 * @parent can-observation
 * @signature `Observation.isRecording()`
 *
 * Returns if some function is in the process of recording observes.
 *
 * @return {Boolean} True if a function is in the process of recording observes.
 */
Observation.isRecording = function(){
	var len = observationStack.length;
	return len && (observationStack[len-1].ignore === 0);
};

canBatch._onDispatchedEvents = Observation.batchEnd;

module.exports = namespace.Observation = Observation;
