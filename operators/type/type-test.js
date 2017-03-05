var QUnit = require('steal-qunit');
var canSymbol = require('can-symbol');
var typeOperators = require("./type");
var getSetOperators = require("../get-set/get-set");

QUnit.module('can-operate: type operators');

QUnit.test("isConstructorLike", function(){
	var Constructor = function(){};
	Constructor.prototype.method = function(){};

	ok(typeOperators.isConstructorLike(Constructor));
	ok(!typeOperators.isConstructorLike(Constructor.prototype.method));

	var obj = {};
	getSetOperators.setKeyValue(obj,canSymbol.for("can.new"), function(){});


	ok(typeOperators.isConstructorLike(obj));

	ok(!typeOperators.isConstructorLike({}));
});

QUnit.test("isFunctionLike", function(){
	ok(!typeOperators.isFunctionLike({}));
	ok(typeOperators.isFunctionLike(function(){}));
});

QUnit.test("isIteratorLike", function(){
	ok(!typeOperators.isIteratorLike({}));
	ok(typeOperators.isIteratorLike({next: function(){}}));
});

QUnit.test("isListLike", function(){
	ok(typeOperators.isListLike({0: 1, length: 1}));
	ok(typeOperators.isListLike("yes"), "string");
	ok(typeOperators.isListLike({
		length: 0
	}), "object with 0 length");


	if(typeof document !== "undefined") {
		var ul = document.createElement("ul");
		ul.innerHTML = "<li/><li/>";
		ok(typeOperators.isListLike(ul.childNodes), "nodeList");
	}
	if(typeof Set !== "undefined") {
		ok(typeOperators.isListLike(new Set()), "Set");
	}
});

QUnit.test("isMapLike", function(){
	ok(typeOperators.isMapLike({}), "Object");
	ok(typeOperators.isMapLike([]), "Array");

	ok(!typeOperators.isMapLike("String"), "String");
});

QUnit.test("isMoreListLikeThanMapLike", function(){
	QUnit.equal(typeOperators.isMoreListLikeThanMapLike({}), false, "Object");
	QUnit.equal(typeOperators.isMoreListLikeThanMapLike([]), true, "Array");
});

QUnit.test("isObservableLike", function(){
	ok(!typeOperators.isObservableLike({}), "Object");

	var obj = {};
	getSetOperators.setKeyValue(obj,canSymbol.for("can.onValue"), function(){});
	ok(typeOperators.isObservableLike(obj), "Object");
});

QUnit.test("isPrimitive", function(){
	ok(!typeOperators.isPrimitive({}), "Object");
	ok(typeOperators.isPrimitive(null), "null");
	ok(typeOperators.isPrimitive(1), "1");
});

QUnit.test("isValueLike", function(){
	ok(!typeOperators.isValueLike({}), "Object");
	ok(!typeOperators.isValueLike(function(){}), "Function");
	ok(typeOperators.isValueLike("String"), "String");
	var obj = {};
	getSetOperators.setKeyValue(obj,canSymbol.for("can.getValue"), true);
	ok(typeOperators.isValueLike(obj), "symboled");
});

QUnit.test("isSymbolLike", function(){
	if(typeof Symbol !== "undefined") {
		ok(typeOperators.isSymbolLike(Symbol("a symbol")), "Native Symbol");
	}

	ok(typeOperators.isSymbolLike(canSymbol("another Symbol")), "canSymbol Symbol");
});
