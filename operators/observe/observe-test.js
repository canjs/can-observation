var QUnit = require('steal-qunit');
var canSymbol = require('can-symbol');
var observeOperators = require("./observe");
var getSetOperators = require("../get-set/get-set");

QUnit.module('can-operate: observe operators: key');

QUnit.test("onKeyValue / offKeyValue", function(){
	var obj = {callbacks: {foo: []}};
	getSetOperators.setKeyValue(obj,canSymbol.for("can.onKeyValue"),function(key, callback){
		this.callbacks[key].push(callback);
	});

	var callback = function(ev, value){
		QUnit.equal(value, "bar");
	};
	observeOperators.onKeyValue(obj,"foo", callback);
	obj.callbacks.foo[0]({}, "bar");

	getSetOperators.setKeyValue(obj,canSymbol.for("can.offKeyValue"),function(key, callback){
		var index = this.callbacks[key].indexOf(callback);
		this.callbacks[key].splice(index, 1);
	});

	observeOperators.offKeyValue(obj,"foo", callback);
	QUnit.equal(obj.callbacks.foo.length, 0, "no event handlers");
});

QUnit.test("onKeys", function(){
	try{
		observeOperators.onKeys({}, function(){});
		QUnit.ok(false, "should throw error");
	} catch(e) {
		QUnit.ok(true, "threw error");
	}

});

QUnit.test("onKeysAdded / onKeysRemoved", function(){
	try{
		observeOperators.onKeysAdded({}, function(){});
		QUnit.ok(false, "should throw error");
	} catch(e) {
		QUnit.ok(true, "threw error");
	}

	try{
		observeOperators.onKeysRemoved({}, function(){});
		QUnit.ok(false, "should throw error");
	} catch(e) {
		QUnit.ok(true, "threw error");
	}
});

QUnit.test("getKeyDependencies", function(){
	try{
		observeOperators.getKeyDependencies({});
		QUnit.ok(false, "should throw error");
	} catch(e) {
		QUnit.ok(true, "threw error");
	}
});

QUnit.module('can-operate: observe operators: value');

QUnit.test("onValue / offValue", function(){
	var obj = {callbacks:[]};
	getSetOperators.setKeyValue(obj,canSymbol.for("can.onValue"),function(callback){
		this.callbacks.push(callback);
	});

	var callback = function(ev, value){
		QUnit.equal(value, "bar");
	};
	observeOperators.onValue(obj, callback);
	obj.callbacks[0]({}, "bar");

	getSetOperators.setKeyValue(obj,canSymbol.for("can.offValue"),function(callback){
		var index = this.callbacks.indexOf(callback);
		this.callbacks.splice(index, 1);
	});

	observeOperators.offValue(obj, callback);
	QUnit.equal(obj.callbacks.length, 0, "no event handlers");
});


QUnit.test("getValueDependencies", function(){
	try{
		observeOperators.getValueDependencies({});
		QUnit.ok(false, "should throw error");
	} catch(e) {
		QUnit.ok(true, "threw error");
	}
});

QUnit.module('can-operate: observe operators: event');

QUnit.test("onEvent / offEvent", function(){
	var cb = function(){};
	var obj = {
		addEventListener: function(arg1, arg2){
			QUnit.equal(this, obj);

			QUnit.equal(arg2, cb);
			QUnit.equal(arg1, "click", "eventName");
		},
		removeEventListener: function(arg1, arg2){
			QUnit.equal(this, obj);
			QUnit.equal(arg1, "click", "event name");
			QUnit.equal(arg2, cb);
		}
	};

	observeOperators.onEvent(obj, "click", cb);
	observeOperators.offEvent(obj, "click", cb);
});
