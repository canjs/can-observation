var QUnit = require('steal-qunit');
var canSymbol = require('can-symbol');
var shapeOperators = require("../shape/shape");
var getSetOperators = require("./get-set");

QUnit.module('can-operate: get-set operators: key');

QUnit.test("getKeyValue", function(){
	QUnit.equal( getSetOperators.getKeyValue({foo: "bar"},"foo"), "bar", "POJO");

	QUnit.equal( getSetOperators.getKeyValue([1],"length"), 1, "Array length");

	QUnit.equal( getSetOperators.getKeyValue([2],0), 2, "Array index");

	var obj = {};
	getSetOperators.setKeyValue(obj,canSymbol.for("can.getKeyValue"),function(key){
		return ({foo: "bar"})[key];
	});
	QUnit.equal( getSetOperators.getKeyValue(obj, "foo"), "bar");
});

QUnit.test("setKeyValue", function(){
	// check symbol set
	var obj ={};
	var mysymbol = canSymbol("some symbol");
	if(typeof mysymbol === "string") {

		getSetOperators.setKeyValue(obj,mysymbol,"VALUE");
		QUnit.deepEqual( Object.getOwnPropertyDescriptor(obj, mysymbol), {
			enumerable: false,
			writable: true,
			configurable: true,
			value: "VALUE"
		});
	}
	// basic object set
	obj = {};
	getSetOperators.setKeyValue(obj,"prop","VALUE");
	QUnit.equal(obj.prop, "VALUE");

	getSetOperators.setKeyValue(obj,canSymbol.for("can.setKeyValue"),function(prop, value){
		QUnit.equal(prop, "someProp","can.setKeyValue");
		QUnit.equal(value, "someValue","can.setKeyValue");
	});

	getSetOperators.setKeyValue( obj, "someProp", "someValue");
});

QUnit.module('can-operate: get-set operators: value');

QUnit.test("getValue", function(){
	[true,1,null, undefined,{}].forEach(function(value){
		QUnit.equal( getSetOperators.getValue(value), value, value);
	});

	var obj = {value: 0};
	getSetOperators.setKeyValue(obj,canSymbol.for("can.getValue"), function(){
		return this.value;
	});

	QUnit.equal( getSetOperators.getValue(obj), 0);

});

QUnit.test("setValue", function(){
	try {
		getSetOperators.setValue({},{});
		QUnit.ok(false, "set POJO");
	} catch(e) {
		QUnit.ok(true, "set POJO errors");
	}
	var obj = {value: 0};
	getSetOperators.setKeyValue(obj,canSymbol.for("can.setValue"), function(value){
		this.value = value;
	});

	getSetOperators.setValue(obj, 2);

	QUnit.deepEqual(obj, {value: 2}, "can.setValue");
});
