var canReflect = require("can-reflect");

var stack = [];

// Helpers
function removeEdge(event) {
    canReflect.offKeyValue(this.observable, event, this.onDependencyChange,"notify");
}
function removeEdges(oldEventSet, observable){
    oldEventSet.forEach(removeEdge, {onDependencyChange: this.onDependencyChange, observable: observable});
}
function addEdgeIfNotInOldSet(event) {
    // if we haven't already bound this
    if(!this.oldEventSet || !this.oldEventSet["delete"](event)) {
        canReflect.onKeyValue(this.observable, event, this.onDependencyChange,"notify");
    }
}
function addEdges(eventSet, observable){
    eventSet.forEach(addEdgeIfNotInOldSet, {
        onDependencyChange: this.onDependencyChange,
        observable: observable,
        oldEventSet: this.oldDependencies.keyDependencies.get(observable)
    });
}
function addValueDependencies(observable) {
    if(!this.oldDependencies.valueDependencies.delete(observable)) {
        canReflect.onValue(observable, this.onDependencyChange,"notify");
    }
}
function removeValueDependencies(observable) {
    canReflect.offValue(observable, this.onDependencyChange,"notify");
}



module.exports = {
    makeDependenciesRecorder: function(){
        return {
            traps: null,
            keyDependencies: new Map(),
            valueDependencies: new Set(),
            ignore: 0
        };
    },
    stack: stack,
    start: function(){
        stack.push({
            traps: null,
            keyDependencies: new Map(),
            valueDependencies: new Set(),
            ignore: 0
        });
    },
    stop: function() {
        return stack.pop();
    },
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
    observe: function(obj, event) {
        var top = stack[stack.length-1];
    	if (top && top.ignore === 0) {

    		if(top.traps) {
    			top.traps.push([obj, event]);
    		}
    		else {
                if(event === undefined) {
                    top.valueDependencies.add(obj);
                } else {
                    var eventSet = top.keyDependencies.get(obj);
        			if(!eventSet) {
        				eventSet = new Set();
        				top.keyDependencies.set(obj, eventSet);
        			}
        			eventSet.add(event);
                }
    		}
    	}
    },
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
    observeMany: function(observes){
        var top = stack[stack.length-1];
    	if (top) {
    		if(top.traps) {
    			top.traps.push.apply(top.traps, observes);
    		} else {
    			for(var i =0, len = observes.length; i < len; i++) {
                    this.observe(observes[i][0],observes[i][1]);
    			}
    		}
    	}
    },
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
    ignore: function(fn){
    	return function(){
    		if (stack.length) {
    			var top = stack[stack.length-1];
    			top.ignore++;
    			var res = fn.apply(this, arguments);
    			top.ignore--;
    			return res;
    		} else {
    			return fn.apply(this, arguments);
    		}
    	};
    },
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
    trap: function(){
    	if (stack.length) {
    		var top = stack[stack.length-1];
    		var oldTraps = top.traps;
    		var traps = top.traps = [];
    		return function(){
    			top.traps = oldTraps;
    			return traps;
    		};
    	} else {
    		return function(){return [];};
    	}
    },
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
    trapsCount: function(){
    	if (stack.length) {
    		var top = stack[stack.length-1];
    		return top.traps.length;
    	} else {
    		return 0;
    	}
    },
    /**
     * @function can-observation.isRecording isRecording
     * @parent can-observation.static
     * @signature `Observation.isRecording()`
     *
     * Returns if some function is in the process of recording observes.
     *
     * @return {Boolean} True if a function is in the process of recording observes.
     */
    isObserving: function(){
    	var len = stack.length;
    	var last = len && stack[len-1];
    	return last && (last.ignore === 0) && last;
    },
    // a helper that can update
    // observationData -> {newDependencies, oldDependencies, onDependencyChange}
    updateObservations: function(observationData){
        observationData.newDependencies.keyDependencies.forEach(addEdges, observationData);
        observationData.oldDependencies.keyDependencies.forEach(removeEdges, observationData);
        observationData.newDependencies.valueDependencies.forEach(addValueDependencies, observationData);
        observationData.oldDependencies.valueDependencies.forEach(removeValueDependencies, observationData);
    },
    stopObserving: function(observationReciever, onDependencyChange){
        observationReciever.keyDependencies.forEach(removeEdges, {onDependencyChange: onDependencyChange});
        observationReciever.valueDependencies.forEach(removeValueDependencies, {onDependencyChange: onDependencyChange});
    }
};
