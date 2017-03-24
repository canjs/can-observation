var QUnit = require('steal-qunit');
var canSymbol = require('can-symbol');
var callReflections = require("./call");
var getSetReflections = require("../get-set/get-set");

QUnit.module('can-reflect: function reflections');

QUnit.test("call", function(){
	var obj = {};
	var ret = callReflections.call(function(arg1, arg2){
		QUnit.equal(this, obj, "this");
		QUnit.equal(arg1, 1, "arg1");
		QUnit.equal(arg2, 2, "arg2");
		return 3;
	}, obj, 1,2);

	QUnit.equal(ret, 3, "return value");

	var func = {};
	getSetReflections.setKeyValue(func,canSymbol.for("can.apply"),function(context, args){
		QUnit.equal(this, func, "this");
		QUnit.equal(context, obj, "context");
		QUnit.equal(args[0], 1, "arg1");
		QUnit.equal(args[1], 2, "arg2");
		return 3;
	});

	ret = callReflections.call(func, obj, 1,2);
	QUnit.equal(ret, 3, "return value");
});

QUnit.test("apply", function(){
	var obj = {};
	var ret = callReflections.apply(function(arg1, arg2){
		QUnit.equal(this, obj, "this");
		QUnit.equal(arg1, 1, "arg1");
		QUnit.equal(arg2, 2, "arg2");
		return 3;
	}, obj, [1,2]);

	QUnit.equal(ret, 3, "return value");


	var func = {};
	getSetReflections.setKeyValue(func,canSymbol.for("can.apply"),function(context, args){
		QUnit.equal(this, func, "this");
		QUnit.equal(context, obj, "context");
		QUnit.equal(args[0], 1, "arg1");
		QUnit.equal(args[1], 2, "arg2");
		return 3;
	});

	ret = callReflections.apply(func, obj,[1,2]);
	QUnit.equal(ret, 3, "return value");
});

QUnit.test("new", function(){
	var Constructor = function(arg1, arg2){
		QUnit.ok(this instanceof Constructor, "this");
		QUnit.equal(arg1, 1, "arg1");
		QUnit.equal(arg2, 2, "arg2");
		return 3;
	};
	var instance = callReflections["new"](Constructor, 1,2);
	QUnit.ok(instance instanceof Constructor, "this");

	var Func = {};
	getSetReflections.setKeyValue(Func,canSymbol.for("can.new"),function(arg1, arg2){
		QUnit.equal(this, Func, "this");
		QUnit.equal(arg1, 1, "arg1");
		QUnit.equal(arg2, 2, "arg2");
		return 3;
	});

	var ret = callReflections.new(Func,1,2);
	QUnit.equal(ret, 3, "return value");
});
