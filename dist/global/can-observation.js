/*[global-shim-start]*/
(function(exports, global, doEval){ // jshint ignore:line
	var origDefine = global.define;

	var get = function(name){
		var parts = name.split("."),
			cur = global,
			i;
		for(i = 0 ; i < parts.length; i++){
			if(!cur) {
				break;
			}
			cur = cur[parts[i]];
		}
		return cur;
	};
	var set = function(name, val){
		var parts = name.split("."),
			cur = global,
			i, part, next;
		for(i = 0; i < parts.length - 1; i++) {
			part = parts[i];
			next = cur[part];
			if(!next) {
				next = cur[part] = {};
			}
			cur = next;
		}
		part = parts[parts.length - 1];
		cur[part] = val;
	};
	var useDefault = function(mod){
		if(!mod || !mod.__esModule) return false;
		var esProps = { __esModule: true, "default": true };
		for(var p in mod) {
			if(!esProps[p]) return false;
		}
		return true;
	};
	var modules = (global.define && global.define.modules) ||
		(global._define && global._define.modules) || {};
	var ourDefine = global.define = function(moduleName, deps, callback){
		var module;
		if(typeof deps === "function") {
			callback = deps;
			deps = [];
		}
		var args = [],
			i;
		for(i =0; i < deps.length; i++) {
			args.push( exports[deps[i]] ? get(exports[deps[i]]) : ( modules[deps[i]] || get(deps[i]) )  );
		}
		// CJS has no dependencies but 3 callback arguments
		if(!deps.length && callback.length) {
			module = { exports: {} };
			var require = function(name) {
				return exports[name] ? get(exports[name]) : modules[name];
			};
			args.push(require, module.exports, module);
		}
		// Babel uses the exports and module object.
		else if(!args[0] && deps[0] === "exports") {
			module = { exports: {} };
			args[0] = module.exports;
			if(deps[1] === "module") {
				args[1] = module;
			}
		} else if(!args[0] && deps[0] === "module") {
			args[0] = { id: moduleName };
		}

		global.define = origDefine;
		var result = callback ? callback.apply(null, args) : undefined;
		global.define = ourDefine;

		// Favor CJS module.exports over the return value
		result = module && module.exports ? module.exports : result;
		modules[moduleName] = result;

		// Set global exports
		var globalExport = exports[moduleName];
		if(globalExport && !get(globalExport)) {
			if(useDefault(result)) {
				result = result["default"];
			}
			set(globalExport, result);
		}
	};
	global.define.orig = origDefine;
	global.define.modules = modules;
	global.define.amd = true;
	ourDefine("@loader", [], function(){
		// shim for @@global-helpers
		var noop = function(){};
		return {
			get: function(){
				return { prepareGlobal: noop, retrieveGlobal: noop };
			},
			global: global,
			__exec: function(__load){
				doEval(__load.source, global);
			}
		};
	});
}
)({"can-util/namespace":"can"},window,function(__$source__, __$global__) { // jshint ignore:line
	eval("(function() { " + __$source__ + " \n }).call(__$global__);");
}
)
/*can-util@3.0.0-pre.31#dom/events/events*/
define('can-util/dom/events/events', function (require, exports, module) {
    module.exports = {
        addEventListener: function () {
            this.addEventListener.apply(this, arguments);
        },
        removeEventListener: function () {
            this.removeEventListener.apply(this, arguments);
        },
        canAddEventListener: function () {
            return this.nodeName && (this.nodeType === 1 || this.nodeType === 9) || this === window;
        }
    };
});
/*can-util@3.0.0-pre.31#js/cid/cid*/
define('can-util/js/cid/cid', function (require, exports, module) {
    var cid = 0;
    module.exports = function (object, name) {
        if (!object._cid) {
            cid++;
            object._cid = (name || '') + cid;
        }
        return object._cid;
    };
});
/*can-util@3.0.0-pre.31#js/is-empty-object/is-empty-object*/
define('can-util/js/is-empty-object/is-empty-object', function (require, exports, module) {
    module.exports = function (obj) {
        for (var prop in obj) {
            return false;
        }
        return true;
    };
});
/*can-util@3.0.0-pre.31#js/assign/assign*/
define('can-util/js/assign/assign', function (require, exports, module) {
    module.exports = function (d, s) {
        for (var prop in s) {
            d[prop] = s[prop];
        }
        return d;
    };
});
/*can-util@3.0.0-pre.31#js/global/global*/
define('can-util/js/global/global', function (require, exports, module) {
    (function (global) {
        module.exports = function () {
            return typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope ? self : typeof process === 'object' && {}.toString.call(process) === '[object process]' ? global : window;
        };
    }(function () {
        return this;
    }()));
});
/*can-util@3.0.0-pre.31#dom/document/document*/
define('can-util/dom/document/document', function (require, exports, module) {
    (function (global) {
        var global = require('can-util/js/global/global');
        var setDocument;
        module.exports = function (setDoc) {
            if (setDoc) {
                setDocument = setDoc;
            }
            return setDocument || global().document;
        };
    }(function () {
        return this;
    }()));
});
/*can-util@3.0.0-pre.31#dom/dispatch/dispatch*/
define('can-util/dom/dispatch/dispatch', function (require, exports, module) {
    var assign = require('can-util/js/assign/assign');
    var _document = require('can-util/dom/document/document');
    module.exports = function (event, args, bubbles) {
        var doc = _document();
        var ev = doc.createEvent('HTMLEvents');
        var isString = typeof event === 'string';
        ev.initEvent(isString ? event : event.type, bubbles === undefined ? true : bubbles, false);
        if (!isString) {
            assign(ev, event);
        }
        ev.args = args;
        return this.dispatchEvent(ev);
    };
});
/*can-util@3.0.0-pre.31#namespace*/
define('can-util/namespace', function (require, exports, module) {
    module.exports = {};
});
/*can-util@3.0.0-pre.31#dom/data/data*/
define('can-util/dom/data/data', function (require, exports, module) {
    var isEmptyObject = require('can-util/js/is-empty-object/is-empty-object');
    var data = {};
    var expando = 'can' + new Date();
    var uuid = 0;
    var setData = function (name, value) {
        var id = this[expando] || (this[expando] = ++uuid), store = data[id] || (data[id] = {});
        if (name !== undefined) {
            store[name] = value;
        }
        return store;
    };
    module.exports = {
        getCid: function () {
            return this[expando];
        },
        cid: function () {
            return this[expando] || (this[expando] = ++uuid);
        },
        expando: expando,
        clean: function (prop) {
            var id = this[expando];
            delete data[id][prop];
            if (isEmptyObject(data[id])) {
                delete data[id];
            }
        },
        get: function (key) {
            var id = this[expando], store = id && data[id];
            return key === undefined ? store || setData(this) : store && store[key];
        },
        set: setData
    };
});
/*can-util@3.0.0-pre.31#dom/matches/matches*/
define('can-util/dom/matches/matches', function (require, exports, module) {
    var matchesMethod = function (element) {
        return element.matches || element.webkitMatchesSelector || element.webkitMatchesSelector || element.mozMatchesSelector || element.msMatchesSelector || element.oMatchesSelector;
    };
    module.exports = function () {
        var method = matchesMethod(this);
        return method ? method.apply(this, arguments) : false;
    };
});
/*can-util@3.0.0-pre.31#js/is-array-like/is-array-like*/
define('can-util/js/is-array-like/is-array-like', function (require, exports, module) {
    function isArrayLike(obj) {
        var type = typeof obj;
        if (type === 'string') {
            return true;
        }
        var length = obj && type !== 'boolean' && typeof obj !== 'number' && 'length' in obj && obj.length;
        return typeof arr !== 'function' && (length === 0 || typeof length === 'number' && length > 0 && length - 1 in obj);
    }
    module.exports = isArrayLike;
});
/*can-util@3.0.0-pre.31#js/each/each*/
define('can-util/js/each/each', function (require, exports, module) {
    var isArrayLike = require('can-util/js/is-array-like/is-array-like');
    var has = Object.prototype.hasOwnProperty;
    function each(elements, callback, context) {
        var i = 0, key, len, item;
        if (elements) {
            if (isArrayLike(elements)) {
                for (len = elements.length; i < len; i++) {
                    item = elements[i];
                    if (callback.call(context || item, item, i, elements) === false) {
                        break;
                    }
                }
            } else if (typeof elements === 'object') {
                for (key in elements) {
                    if (has.call(elements, key) && callback.call(context || elements[key], elements[key], key, elements) === false) {
                        break;
                    }
                }
            }
        }
        return elements;
    }
    module.exports = each;
});
/*can-util@3.0.0-pre.31#dom/events/delegate/delegate*/
define('can-util/dom/events/delegate/delegate', function (require, exports, module) {
    var domEvents = require('can-util/dom/events/events');
    var domData = require('can-util/dom/data/data');
    var domMatches = require('can-util/dom/matches/matches');
    var each = require('can-util/js/each/each');
    var isEmptyObject = require('can-util/js/is-empty-object/is-empty-object');
    var dataName = 'delegateEvents';
    var handleEvent = function (ev) {
        var events = domData.get.call(this, dataName);
        var eventTypeEvents = events[ev.type];
        var matches = [];
        if (eventTypeEvents) {
            var selectorDelegates = [];
            each(eventTypeEvents, function (delegates) {
                selectorDelegates.push(delegates);
            });
            var cur = ev.target;
            do {
                selectorDelegates.forEach(function (delegates) {
                    if (domMatches.call(cur, delegates[0].selector)) {
                        matches.push({
                            target: cur,
                            delegates: delegates
                        });
                    }
                });
                cur = cur.parentNode;
            } while (cur && cur !== ev.currentTarget);
        }
        var oldStopProp = ev.stopPropagation;
        ev.stopPropagation = function () {
            oldStopProp.apply(this, arguments);
            this.cancelBubble = true;
        };
        for (var i = 0; i < matches.length; i++) {
            var match = matches[i];
            var delegates = match.delegates;
            for (var d = 0, dLen = delegates.length; d < dLen; d++) {
                if (delegates[d].handler.call(match.target, ev) === false) {
                    return false;
                }
                if (ev.cancelBubble) {
                    return;
                }
            }
        }
    };
    domEvents.addDelegateListener = function (eventType, selector, handler) {
        var events = domData.get.call(this, dataName), eventTypeEvents;
        if (!events) {
            domData.set.call(this, dataName, events = {});
        }
        if (!(eventTypeEvents = events[eventType])) {
            eventTypeEvents = events[eventType] = {};
            domEvents.addEventListener.call(this, eventType, handleEvent, false);
        }
        if (!eventTypeEvents[selector]) {
            eventTypeEvents[selector] = [];
        }
        eventTypeEvents[selector].push({
            handler: handler,
            selector: selector
        });
    };
    domEvents.removeDelegateListener = function (eventType, selector, handler) {
        var events = domData.get.call(this, dataName);
        if (events[eventType] && events[eventType][selector]) {
            var eventTypeEvents = events[eventType], delegates = eventTypeEvents[selector], i = 0;
            while (i < delegates.length) {
                if (delegates[i].handler === handler) {
                    delegates.splice(i, 1);
                } else {
                    i++;
                }
            }
            if (delegates.length === 0) {
                delete eventTypeEvents[selector];
                if (isEmptyObject(eventTypeEvents)) {
                    domEvents.removeEventListener.call(this, eventType, handleEvent, false);
                    delete events[eventType];
                    if (isEmptyObject(events)) {
                        domData.clean.call(this, dataName);
                    }
                }
            }
        }
    };
});
/*can-event@3.0.0-pre.5#can-event*/
define('can-event', function (require, exports, module) {
    var domEvents = require('can-util/dom/events/events');
    var CID = require('can-util/js/cid/cid');
    var isEmptyObject = require('can-util/js/is-empty-object/is-empty-object');
    var domDispatch = require('can-util/dom/dispatch/dispatch');
    var namespace = require('can-util/namespace');
    require('can-util/dom/events/delegate/delegate');
    var canEvent = {
        addEventListener: function (event, handler) {
            var allEvents = this.__bindEvents || (this.__bindEvents = {}), eventList = allEvents[event] || (allEvents[event] = []);
            eventList.push({
                handler: handler,
                name: event
            });
            return this;
        },
        removeEventListener: function (event, fn, __validate) {
            if (!this.__bindEvents) {
                return this;
            }
            var events = this.__bindEvents[event] || [], i = 0, ev, isFunction = typeof fn === 'function';
            while (i < events.length) {
                ev = events[i];
                if (__validate ? __validate(ev, event, fn) : isFunction && ev.handler === fn || !isFunction && (ev.cid === fn || !fn)) {
                    events.splice(i, 1);
                } else {
                    i++;
                }
            }
            return this;
        },
        dispatch: function (event, args) {
            var events = this.__bindEvents;
            if (!events) {
                return;
            }
            var eventName;
            if (typeof event === 'string') {
                eventName = event;
                event = { type: event };
            } else {
                eventName = event.type;
            }
            var handlers = events[eventName];
            if (!handlers) {
                return;
            } else {
                handlers = handlers.slice(0);
            }
            var passed = [event];
            if (args) {
                passed.push.apply(passed, args);
            }
            for (var i = 0, len = handlers.length; i < len; i++) {
                handlers[i].handler.apply(this, passed);
            }
            return event;
        },
        on: function (eventName, selector, handler) {
            var method = typeof selector === 'string' ? 'addDelegateListener' : 'addEventListener';
            var listenWithDOM = domEvents.canAddEventListener.call(this);
            var eventBinder = listenWithDOM ? domEvents[method] : this[method] || canEvent[method];
            return eventBinder.apply(this, arguments);
        },
        off: function (eventName, selector, handler) {
            var method = typeof selector === 'string' ? 'removeDelegateListener' : 'removeEventListener';
            var listenWithDOM = domEvents.canAddEventListener.call(this);
            var eventBinder = listenWithDOM ? domEvents[method] : this[method] || canEvent[method];
            return eventBinder.apply(this, arguments);
        },
        trigger: function () {
            var listenWithDOM = domEvents.canAddEventListener.call(this);
            var dispatch = listenWithDOM ? domDispatch : canEvent.dispatch;
            return dispatch.apply(this, arguments);
        },
        one: function (event, handler) {
            var one = function () {
                canEvent.off.call(this, event, one);
                return handler.apply(this, arguments);
            };
            canEvent.on.call(this, event, one);
            return this;
        },
        listenTo: function (other, event, handler) {
            var idedEvents = this.__listenToEvents;
            if (!idedEvents) {
                idedEvents = this.__listenToEvents = {};
            }
            var otherId = CID(other);
            var othersEvents = idedEvents[otherId];
            if (!othersEvents) {
                othersEvents = idedEvents[otherId] = {
                    obj: other,
                    events: {}
                };
            }
            var eventsEvents = othersEvents.events[event];
            if (!eventsEvents) {
                eventsEvents = othersEvents.events[event] = [];
            }
            eventsEvents.push(handler);
            canEvent.on.call(other, event, handler);
        },
        stopListening: function (other, event, handler) {
            var idedEvents = this.__listenToEvents, iterIdedEvents = idedEvents, i = 0;
            if (!idedEvents) {
                return this;
            }
            if (other) {
                var othercid = CID(other);
                (iterIdedEvents = {})[othercid] = idedEvents[othercid];
                if (!idedEvents[othercid]) {
                    return this;
                }
            }
            for (var cid in iterIdedEvents) {
                var othersEvents = iterIdedEvents[cid], eventsEvents;
                other = idedEvents[cid].obj;
                if (!event) {
                    eventsEvents = othersEvents.events;
                } else {
                    (eventsEvents = {})[event] = othersEvents.events[event];
                }
                for (var eventName in eventsEvents) {
                    var handlers = eventsEvents[eventName] || [];
                    i = 0;
                    while (i < handlers.length) {
                        if (handler && handler === handlers[i] || !handler) {
                            canEvent.off.call(other, eventName, handlers[i]);
                            handlers.splice(i, 1);
                        } else {
                            i++;
                        }
                    }
                    if (!handlers.length) {
                        delete othersEvents.events[eventName];
                    }
                }
                if (isEmptyObject(othersEvents.events)) {
                    delete idedEvents[cid];
                }
            }
            return this;
        }
    };
    canEvent.bind = canEvent.addEventListener;
    canEvent.addEvent = canEvent.addEventListener;
    canEvent.unbind = canEvent.removeEventListener;
    canEvent.removeEvent = canEvent.removeEventListener;
    canEvent.delegate = canEvent.on;
    canEvent.undelegate = canEvent.off;
    module.exports = namespace.event = canEvent;
});
/*can-util@3.0.0-pre.31#js/last/last*/
define('can-util/js/last/last', function (require, exports, module) {
    module.exports = function (arr) {
        return arr && arr[arr.length - 1];
    };
});
/*can-event@3.0.0-pre.5#batch/batch*/
define('can-event/batch/batch', function (require, exports, module) {
    var canEvent = require('can-event');
    var last = require('can-util/js/last/last');
    var namespace = require('can-util/namespace');
    var batchNum = 1, transactions = 0, dispatchingBatch = null, collectingBatch = null, batches = [], dispatchingBatches = false;
    var canBatch = {
        start: function (batchStopHandler) {
            transactions++;
            if (transactions === 1) {
                var batch = {
                    events: [],
                    callbacks: [],
                    number: batchNum++
                };
                batches.push(batch);
                if (batchStopHandler) {
                    batch.callbacks.push(batchStopHandler);
                }
                collectingBatch = batch;
            }
        },
        stop: function (force, callStart) {
            if (force) {
                transactions = 0;
            } else {
                transactions--;
            }
            if (transactions === 0) {
                collectingBatch = null;
                var batch;
                if (dispatchingBatches === false) {
                    dispatchingBatches = true;
                    while (batch = batches.shift()) {
                        var events = batch.events;
                        var callbacks = batch.callbacks;
                        dispatchingBatch = batch;
                        canBatch.batchNum = batch.number;
                        var i, len;
                        if (callStart) {
                            canBatch.start();
                        }
                        for (i = 0, len = events.length; i < len; i++) {
                            canEvent.dispatch.apply(events[i][0], events[i][1]);
                        }
                        canBatch._onDispatchedEvents(batch.number);
                        for (i = 0; i < callbacks.length; i++) {
                            callbacks[i]();
                        }
                        dispatchingBatch = null;
                        canBatch.batchNum = undefined;
                    }
                    dispatchingBatches = false;
                }
            }
        },
        _onDispatchedEvents: function () {
        },
        trigger: function (event, args) {
            var item = this;
            if (!item.__inSetup) {
                event = typeof event === 'string' ? { type: event } : event;
                if (collectingBatch) {
                    event.batchNum = collectingBatch.number;
                    collectingBatch.events.push([
                        item,
                        [
                            event,
                            args
                        ]
                    ]);
                } else if (event.batchNum) {
                    canEvent.dispatch.call(item, event, args);
                } else if (batches.length) {
                    canBatch.start();
                    event.batchNum = collectingBatch.number;
                    collectingBatch.events.push([
                        item,
                        [
                            event,
                            args
                        ]
                    ]);
                    canBatch.stop();
                } else {
                    canEvent.dispatch.call(item, event, args);
                }
            }
        },
        afterPreviousEvents: function (handler) {
            var batch = last(batches);
            if (batch) {
                var obj = {};
                canEvent.addEvent.call(obj, 'ready', handler);
                batch.events.push([
                    obj,
                    [
                        { type: 'ready' },
                        []
                    ]
                ]);
            } else {
                handler({});
            }
        },
        after: function (handler) {
            var batch = collectingBatch || dispatchingBatch;
            if (batch) {
                batch.callbacks.push(handler);
            } else {
                handler({});
            }
        }
    };
    module.exports = namespace.batch = canBatch;
});
/*can-observation@3.0.0-pre.5#can-observation*/
define('can-observation', function (require, exports, module) {
    require('can-event');
    var canBatch = require('can-event/batch/batch');
    var assign = require('can-util/js/assign/assign');
    var namespace = require('can-util/namespace');
    function Observation(func, context, compute) {
        this.newObserved = {};
        this.oldObserved = null;
        this.func = func;
        this.context = context;
        this.compute = compute.updater ? compute : { updater: compute };
        this.onDependencyChange = this.onDependencyChange.bind(this);
        this.depth = null;
        this.childDepths = {};
        this.ignore = 0;
        this.inBatch = false;
        this.ready = false;
        this.setReady = this._setReady.bind(this);
    }
    var observationStack = [];
    assign(Observation.prototype, {
        get: function () {
            if (this.bound) {
                var recordingObservation = Observation.isRecording();
                if (recordingObservation && this.getDepth() >= recordingObservation.getDepth()) {
                    Observation.updateUntil(this);
                }
                return this.value;
            } else {
                return this.func.call(this.context);
            }
        },
        getPrimaryDepth: function () {
            return this.compute._primaryDepth || 0;
        },
        _setReady: function () {
            this.ready = true;
        },
        getDepth: function () {
            if (this.depth !== null) {
                return this.depth;
            } else {
                return this.depth = this._getDepth();
            }
        },
        _getDepth: function () {
            var max = 0, childDepths = this.childDepths;
            for (var cid in childDepths) {
                if (childDepths[cid] > max) {
                    max = childDepths[cid];
                }
            }
            return max + 1;
        },
        addEdge: function (objEv) {
            objEv.obj.addEventListener(objEv.event, this.onDependencyChange);
            if (objEv.obj.observation) {
                this.childDepths[objEv.obj._cid] = objEv.obj.observation.getDepth();
                this.depth = null;
            }
        },
        removeEdge: function (objEv) {
            objEv.obj.removeEventListener(objEv.event, this.onDependencyChange);
            if (objEv.obj.observation) {
                delete this.childDepths[objEv.obj._cid];
                this.depth = null;
            }
        },
        dependencyChange: function (ev) {
            if (this.bound && this.ready) {
                if (ev.batchNum !== undefined) {
                    if (ev.batchNum !== this.batchNum) {
                        Observation.registerUpdate(this);
                        this.batchNum = ev.batchNum;
                    }
                } else {
                    this.updateCompute(ev.batchNum);
                }
            }
        },
        onDependencyChange: function (ev, newVal, oldVal) {
            this.dependencyChange(ev, newVal, oldVal);
        },
        updateCompute: function (batchNum) {
            if (this.bound) {
                var oldValue = this.value;
                this.start();
                this.compute.updater(this.value, oldValue, batchNum);
            }
        },
        getValueAndBind: function () {
            console.warn('can-observation: call start instead of getValueAndBind');
            return this.start();
        },
        start: function () {
            this.bound = true;
            this.oldObserved = this.newObserved || {};
            this.ignore = 0;
            this.newObserved = {};
            this.ready = false;
            observationStack.push(this);
            this.value = this.func.call(this.context);
            observationStack.pop();
            this.updateBindings();
            canBatch.afterPreviousEvents(this.setReady);
        },
        updateBindings: function () {
            var newObserved = this.newObserved, oldObserved = this.oldObserved, name, obEv;
            for (name in newObserved) {
                obEv = newObserved[name];
                if (!oldObserved[name]) {
                    this.addEdge(obEv);
                } else {
                    oldObserved[name] = null;
                }
            }
            for (name in oldObserved) {
                obEv = oldObserved[name];
                if (obEv) {
                    this.removeEdge(obEv);
                }
            }
        },
        teardown: function () {
            console.warn('can-observation: call stop instead of teardown');
            return this.stop();
        },
        stop: function () {
            this.bound = false;
            for (var name in this.newObserved) {
                var ob = this.newObserved[name];
                this.removeEdge(ob);
            }
            this.newObserved = {};
        }
    });
    var updateOrder = [], curPrimaryDepth = Infinity, maxPrimaryDepth = 0, currentBatchNum;
    Observation.registerUpdate = function (observation, batchNum) {
        var depth = observation.getDepth() - 1;
        var primaryDepth = observation.getPrimaryDepth();
        curPrimaryDepth = Math.min(primaryDepth, curPrimaryDepth);
        maxPrimaryDepth = Math.max(primaryDepth, maxPrimaryDepth);
        var primary = updateOrder[primaryDepth] || (updateOrder[primaryDepth] = {
            observations: [],
            current: Infinity,
            max: 0
        });
        var objs = primary.observations[depth] || (primary.observations[depth] = []);
        objs.push(observation);
        primary.current = Math.min(depth, primary.current);
        primary.max = Math.max(depth, primary.max);
    };
    Observation.updateUntil = function (observation) {
        var cur;
        while (true) {
            if (curPrimaryDepth <= maxPrimaryDepth) {
                var primary = updateOrder[curPrimaryDepth];
                if (primary && primary.current <= primary.max) {
                    var last = primary.observations[primary.current];
                    if (last && (cur = last.pop())) {
                        cur.updateCompute(currentBatchNum);
                        if (cur === observation) {
                            return;
                        }
                    } else {
                        primary.current++;
                    }
                } else {
                    curPrimaryDepth++;
                }
            } else {
                return;
            }
        }
    };
    Observation.batchEnd = function (batchNum) {
        var cur;
        currentBatchNum = batchNum;
        while (true) {
            if (curPrimaryDepth <= maxPrimaryDepth) {
                var primary = updateOrder[curPrimaryDepth];
                if (primary && primary.current <= primary.max) {
                    var last = primary.observations[primary.current];
                    if (last && (cur = last.pop())) {
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
    Observation.add = function (obj, event) {
        var top = observationStack[observationStack.length - 1];
        if (top && !top.ignore) {
            var evStr = event + '', name = obj._cid + '|' + evStr;
            if (top.traps) {
                top.traps.push({
                    obj: obj,
                    event: evStr,
                    name: name
                });
            } else if (!top.newObserved[name]) {
                top.newObserved[name] = {
                    obj: obj,
                    event: evStr
                };
            }
        }
    };
    Observation.addAll = function (observes) {
        var top = observationStack[observationStack.length - 1];
        if (top) {
            if (top.traps) {
                top.traps.push.apply(top.traps, observes);
            } else {
                for (var i = 0, len = observes.length; i < len; i++) {
                    var trap = observes[i], name = trap.name;
                    if (!top.newObserved[name]) {
                        top.newObserved[name] = trap;
                    }
                }
            }
        }
    };
    Observation.ignore = function (fn) {
        return function () {
            if (observationStack.length) {
                var top = observationStack[observationStack.length - 1];
                top.ignore++;
                var res = fn.apply(this, arguments);
                top.ignore--;
                return res;
            } else {
                return fn.apply(this, arguments);
            }
        };
    };
    Observation.trap = function () {
        if (observationStack.length) {
            var top = observationStack[observationStack.length - 1];
            var oldTraps = top.traps;
            var traps = top.traps = [];
            return function () {
                top.traps = oldTraps;
                return traps;
            };
        } else {
            return function () {
                return [];
            };
        }
    };
    Observation.trapsCount = function () {
        if (observationStack.length) {
            var top = observationStack[observationStack.length - 1];
            return top.traps.length;
        } else {
            return 0;
        }
    };
    Observation.isRecording = function () {
        var len = observationStack.length;
        var last = len && observationStack[len - 1];
        return last && last.ignore === 0 && last;
    };
    canBatch._onDispatchedEvents = Observation.batchEnd;
    module.exports = namespace.Observation = Observation;
});
/*[global-shim-end]*/
(function(){ // jshint ignore:line
	window._define = window.define;
	window.define = window.define.orig;
}
)();