var QUnit = require('steal-qunit');
var canSymbol = require('can-symbol');
var shapeReflections = require("../shape/shape");
var getSetReflections = require("./get-set");

QUnit.module('can-reflect: get-set reflections: key');

QUnit.test("getKeyValue", function(){
	QUnit.equal( getSetReflections.getKeyValue({foo: "bar"},"foo"), "bar", "POJO");

	QUnit.equal( getSetReflections.getKeyValue([1],"length"), 1, "Array length");

	QUnit.equal( getSetReflections.getKeyValue([2],0), 2, "Array index");

	var obj = {};
	getSetReflections.setKeyValue(obj,canSymbol.for("can.getKeyValue"),function(key){
		return ({foo: "bar"})[key];
	});
	QUnit.equal( getSetReflections.getKeyValue(obj, "foo"), "bar");
});

QUnit.test("get / set alias", function(){
	QUnit.equal(getSetReflections.get, getSetReflections.getKeyValue);
	QUnit.equal(getSetReflections.set, getSetReflections.setKeyValue);
});

QUnit.test("setKeyValue", function(){
	// check symbol set
	var obj ={};
	var mysymbol = canSymbol("some symbol");
	if(typeof mysymbol === "string") {

		getSetReflections.setKeyValue(obj,mysymbol,"VALUE");
		QUnit.deepEqual( Object.getOwnPropertyDescriptor(obj, mysymbol), {
			enumerable: false,
			writable: true,
			configurable: true,
			value: "VALUE"
		});
	}
	// basic object set
	obj = {};
	getSetReflections.setKeyValue(obj,"prop","VALUE");
	QUnit.equal(obj.prop, "VALUE");

	getSetReflections.setKeyValue(obj,canSymbol.for("can.setKeyValue"),function(prop, value){
		QUnit.equal(prop, "someProp","can.setKeyValue");
		QUnit.equal(value, "someValue","can.setKeyValue");
	});

	getSetReflections.setKeyValue( obj, "someProp", "someValue");
});

QUnit.test("deleteKeyValue", function(){
	var obj = {prop: "Value"};

	getSetReflections.deleteKeyValue(obj,"prop");
	QUnit.equal(obj.prop, undefined, "deleted");
});

QUnit.module('can-reflect: get-set reflections: value');

QUnit.test("getValue", function(){
	[true,1,null, undefined,{}].forEach(function(value){
		QUnit.equal( getSetReflections.getValue(value), value, value);
	});

	var obj = {value: 0};
	getSetReflections.setKeyValue(obj,canSymbol.for("can.getValue"), function(){
		return this.value;
	});

	QUnit.equal( getSetReflections.getValue(obj), 0);

});

QUnit.test("setValue", function(){
	try {
		getSetReflections.setValue({},{});
		QUnit.ok(false, "set POJO");
	} catch(e) {
		QUnit.ok(true, "set POJO errors");
	}
	var obj = {value: 0};
	getSetReflections.setKeyValue(obj,canSymbol.for("can.setValue"), function(value){
		this.value = value;
	});

	getSetReflections.setValue(obj, 2);

	QUnit.deepEqual(obj, {value: 2}, "can.setValue");
});
