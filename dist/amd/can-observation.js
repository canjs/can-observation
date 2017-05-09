/*can-observation@3.2.0-pre.6#can-observation*/
define(function (require, exports, module) {
    require('can-event');
    var canEvent = require('can-event');
    var canBatch = require('can-event/batch');
    var assign = require('can-util/js/assign');
    var isEmptyObject = require('can-util/js/is-empty-object');
    var namespace = require('can-namespace');
    var canLog = require('can-util/js/log');
    var canReflect = require('can-reflect');
    var canSymbol = require('can-symbol');
    var CID = require('can-cid');
    function Observation(func, context, compute) {
        this.newObserved = {};
        this.oldObserved = null;
        this.func = func;
        this.context = context;
        this.compute = compute && (compute.updater || 'isObservable' in compute) ? compute : { updater: compute };
        this.isObservable = typeof compute === 'object' ? compute.isObservable : true;
        var observation = this;
        this.onDependencyChange = function (value, legacyValue) {
            observation.dependencyChange(this, value, legacyValue);
        };
        this.ignore = 0;
        this.needsUpdate = false;
        this.handlers = null;
        CID(this);
    }
    var observationStack = [];
    Observation.observationStack = observationStack;
    var remaining = {
        updates: 0,
        notifications: 0
    };
    Observation.remaining = remaining;
    assign(Observation.prototype, {
        get: function () {
            if (this.isObservable && Observation.isRecording()) {
                Observation.add(this);
                if (!this.bound) {
                    Observation.temporarilyBind(this);
                }
            }
            if (this.bound) {
                canEvent.flush();
                if (remaining.updates) {
                    Observation.updateChildrenAndSelf(this);
                }
                return this.value;
            } else {
                return this.func.call(this.context);
            }
        },
        getPrimaryDepth: function () {
            return this.compute._primaryDepth || 0;
        },
        addEdge: function (objEv) {
            if (objEv.event === 'undefined') {
                canReflect.onValue(objEv.obj, this.onDependencyChange);
            } else {
                canReflect.onKeyValue(objEv.obj, objEv.event, this.onDependencyChange);
            }
        },
        removeEdge: function (objEv) {
            if (objEv.event === 'undefined') {
                canReflect.offValue(objEv.obj, this.onDependencyChange);
            } else {
                canReflect.offKeyValue(objEv.obj, objEv.event, this.onDependencyChange);
            }
        },
        dependencyChange: function () {
            if (this.bound) {
                if (canBatch.batchNum !== this.batchNum) {
                    Observation.registerUpdate(this, canBatch.batchNum);
                    this.batchNum = canBatch.batchNum;
                }
            }
        },
        onDependencyChange: function (value) {
            this.dependencyChange(value);
        },
        update: function (batchNum) {
            if (this.needsUpdate) {
                remaining.updates--;
            }
            this.needsUpdate = false;
            if (this.bound) {
                var oldValue = this.value;
                this.oldValue = null;
                this.start();
                if (oldValue !== this.value) {
                    this.compute.updater(this.value, oldValue, batchNum);
                    return true;
                }
            }
        },
        getValueAndBind: function () {
            canLog.warn('can-observation: call start instead of getValueAndBind');
            return this.start();
        },
        start: function () {
            this.bound = true;
            this.oldObserved = this.newObserved || {};
            this.ignore = 0;
            this.newObserved = {};
            observationStack.push(this);
            this.value = this.func.call(this.context);
            observationStack.pop();
            this.updateBindings();
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
            canLog.warn('can-observation: call stop instead of teardown');
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
    var updateOrder = [], curPrimaryDepth = Infinity, maxPrimaryDepth = 0, currentBatchNum, isUpdating = false;
    var updateUpdateOrder = function (observation) {
        var primaryDepth = observation.getPrimaryDepth();
        if (primaryDepth < curPrimaryDepth) {
            curPrimaryDepth = primaryDepth;
        }
        if (primaryDepth > maxPrimaryDepth) {
            maxPrimaryDepth = primaryDepth;
        }
        var primary = updateOrder[primaryDepth] || (updateOrder[primaryDepth] = []);
        return primary;
    };
    Observation.registerUpdate = function (observation, batchNum) {
        if (observation.needsUpdate) {
            return;
        }
        remaining.updates++;
        observation.needsUpdate = true;
        var objs = updateUpdateOrder(observation);
        objs.push(observation);
    };
    var afterCallbacks = [];
    Observation.updateAndNotify = function (ev, batchNum) {
        currentBatchNum = batchNum;
        if (isUpdating) {
            return;
        }
        isUpdating = true;
        while (true) {
            if (curPrimaryDepth <= maxPrimaryDepth) {
                var primary = updateOrder[curPrimaryDepth];
                var lastUpdate = primary && primary.pop();
                if (lastUpdate) {
                    lastUpdate.update(currentBatchNum);
                } else {
                    curPrimaryDepth++;
                }
            } else {
                updateOrder = [];
                curPrimaryDepth = Infinity;
                maxPrimaryDepth = 0;
                isUpdating = false;
                var afterCB = afterCallbacks;
                afterCallbacks = [];
                afterCB.forEach(function (cb) {
                    cb();
                });
                return;
            }
        }
    };
    canEvent.addEventListener.call(canBatch, 'batchEnd', Observation.updateAndNotify);
    Observation.afterUpdateAndNotify = function (callback) {
        canBatch.after(function () {
            if (isUpdating) {
                afterCallbacks.push(callback);
            } else {
                callback();
            }
        });
    };
    Observation.updateChildrenAndSelf = function (observation) {
        if (observation.needsUpdate) {
            return Observation.unregisterAndUpdate(observation);
        }
        var childHasChanged;
        for (var prop in observation.newObserved) {
            if (observation.newObserved[prop].obj.observation) {
                if (Observation.updateChildrenAndSelf(observation.newObserved[prop].obj.observation)) {
                    childHasChanged = true;
                }
            }
        }
        if (childHasChanged) {
            return observation.update(currentBatchNum);
        }
    };
    Observation.unregisterAndUpdate = function (observation) {
        var primaryDepth = observation.getPrimaryDepth();
        var primary = updateOrder[primaryDepth];
        if (primary) {
            var index = primary.indexOf(observation);
            if (index !== -1) {
                primary.splice(index, 1);
            }
        }
        return observation.update(currentBatchNum);
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
            } else {
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
    var noop = function () {
    };
    var observables;
    var unbindComputes = function () {
        for (var i = 0, len = observables.length; i < len; i++) {
            canReflect.offValue(observables[i], noop);
        }
        observables = null;
    };
    Observation.temporarilyBind = function (compute) {
        var computeInstance = compute.computeInstance || compute;
        canReflect.onValue(computeInstance, noop);
        if (!observables) {
            observables = [];
            setTimeout(unbindComputes, 10);
        }
        observables.push(computeInstance);
    };
    var callHandlers = function (newValue) {
        this.handlers.forEach(function (handler) {
            canBatch.queue([
                handler,
                this.compute,
                [newValue]
            ]);
        }, this);
    };
    canReflect.set(Observation.prototype, canSymbol.for('can.onValue'), function (handler) {
        if (!this.handlers) {
            this.handlers = [];
            if (this.compute.updater) {
                console.warn('can-observation bound to with an existing handler');
            }
            this.compute.updater = callHandlers.bind(this);
            this.start();
        }
        this.handlers.push(handler);
    });
    canReflect.set(Observation.prototype, canSymbol.for('can.offValue'), function (handler) {
        var index = this.handlers.indexOf(handler);
        this.handlers.splice(index, 1);
        if (this.handlers.length === 0) {
            this.stop();
        }
    });
    canReflect.set(Observation.prototype, canSymbol.for('can.getValue'), Observation.prototype.get);
    Observation.prototype.hasDependencies = function () {
        return !isEmptyObject(this.newObserved);
    };
    canReflect.set(Observation.prototype, canSymbol.for('can.valueHasDependencies'), Observation.prototype.hasDependencies);
    if (namespace.Observation) {
        throw new Error('You can\'t have two versions of can-observation, check your dependencies');
    } else {
        module.exports = namespace.Observation = Observation;
    }
});