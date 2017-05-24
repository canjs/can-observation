var QUnit = require('steal-qunit');
var canSymbol = require('can-symbol');
var typeReflections = require("./type");
var getSetReflections = require("../get-set/get-set");

QUnit.module('can-reflect: type reflections');

QUnit.test("isConstructorLike", function(){
	var Constructor = function(){};
	Constructor.prototype.method = function(){};

	ok(typeReflections.isConstructorLike(Constructor));
	ok(!typeReflections.isConstructorLike(Constructor.prototype.method));

	var obj = {};
	getSetReflections.setKeyValue(obj,canSymbol.for("can.new"), function(){});


	ok(typeReflections.isConstructorLike(obj));

	ok(!typeReflections.isConstructorLike({}));
});

QUnit.test("isFunctionLike", function(){
	ok(!typeReflections.isFunctionLike({}));
	ok(typeReflections.isFunctionLike(function(){}));
});

QUnit.test("isIteratorLike", function(){
	ok(!typeReflections.isIteratorLike({}));
	ok(typeReflections.isIteratorLike({next: function(){}}));
});

QUnit.test("isListLike", function(){
	ok(typeReflections.isListLike({0: 1, length: 1}));
	ok(typeReflections.isListLike("yes"), "string");
	ok(typeReflections.isListLike({
		length: 0
	}), "object with 0 length");
	var symboled = {};
	getSetReflections.setKeyValue(symboled, canSymbol.for("can.isListLike"), false);
	ok(!typeReflections.isListLike(symboled), "!@@can.isListLike");
	getSetReflections.setKeyValue(symboled, canSymbol.for("can.isListLike"), true);
	ok(typeReflections.isListLike(symboled), "@@can.isListLike");

	if(typeof document !== "undefined") {
		var ul = document.createElement("ul");
		ul.innerHTML = "<li/><li/>";
		ok(typeReflections.isListLike(ul.childNodes), "nodeList");
	}
	if(typeof Set !== "undefined") {
		ok(typeReflections.isListLike(new Set()), "Set");
	}
});

QUnit.test("isMapLike", function(){
	ok(typeReflections.isMapLike({}), "Object");
	ok(typeReflections.isMapLike([]), "Array");
	var symboled = {};
	getSetReflections.setKeyValue(symboled, canSymbol.for("can.isMapLike"), false);
	ok(!typeReflections.isMapLike(symboled), "!@@can.isMapLike");
	getSetReflections.setKeyValue(symboled, canSymbol.for("can.isMapLike"), true);
	ok(typeReflections.isMapLike(symboled), "@@can.isMapLike");

	ok(!typeReflections.isMapLike("String"), "String");
});

QUnit.test("isMoreListLikeThanMapLike", function(){
	QUnit.equal(typeReflections.isMoreListLikeThanMapLike({}), false, "Object");
	QUnit.equal(typeReflections.isMoreListLikeThanMapLike([]), true, "Array");
});

QUnit.test("isObservableLike", function(){
	ok(!typeReflections.isObservableLike({}), "Object");

	var obj = {};
	getSetReflections.setKeyValue(obj,canSymbol.for("can.onValue"), function(){});
	ok(typeReflections.isObservableLike(obj), "Object");
});

QUnit.test("isPrimitive", function(){
	ok(!typeReflections.isPrimitive({}), "Object");
	ok(typeReflections.isPrimitive(null), "null");
	ok(typeReflections.isPrimitive(1), "1");
});

QUnit.test("isValueLike", function(){
	ok(!typeReflections.isValueLike({}), "Object");
	ok(!typeReflections.isValueLike(function(){}), "Function");
	ok(typeReflections.isValueLike("String"), "String");
	var obj = {};
	getSetReflections.setKeyValue(obj,canSymbol.for("can.getValue"), true);
	ok(typeReflections.isValueLike(obj), "symboled");
	var symboled = {};
	getSetReflections.setKeyValue(symboled, canSymbol.for("can.isValueLike"), false);
	ok(!typeReflections.isValueLike(symboled), "!@@can.isValueLike");
	getSetReflections.setKeyValue(symboled, canSymbol.for("can.isValueLike"), true);
	ok(typeReflections.isValueLike(symboled), "@@can.isValueLike");

});

QUnit.test("isSymbolLike", function(){
	if(typeof Symbol !== "undefined") {
		ok(typeReflections.isSymbolLike(Symbol("a symbol")), "Native Symbol");
	}

	ok(typeReflections.isSymbolLike(canSymbol("another Symbol")), "canSymbol Symbol");
});
