var canSymbol = require("can-symbol");
var typeReflections = require("../type/type");

var setKeyValueSymbol = canSymbol.for("can.setKeyValue"),
	getKeyValueSymbol = canSymbol.for("can.getKeyValue"),
	getValueSymbol = canSymbol.for("can.getValue"),
	setValueSymbol = canSymbol.for("can.setValue");

var reflections = {
	setKeyValue: function(obj, key, value){
		if(typeof key === "symbol") {
			obj[key] = value;
			return;
		}
		var setKeyValue = obj[setKeyValueSymbol];
		if(setKeyValue) {
			return setKeyValue.call(obj, key, value);
		} else if( typeof key !== "symbol" && typeReflections.isSymbolLike(key) ) {
			Object.defineProperty(obj, key, {
				enumerable: false,
				configurable: true,
				value: value,
				writable: true
			});
		} else {
			obj[key] = value;
		}

	},
	getKeyValue: function(obj, key) {
		var getKeyValue = obj[getKeyValueSymbol];
		if(getKeyValue) {
			return getKeyValue.call(obj, key);
		}
		return obj[key];
	},
	deleteKeyValue: function(obj, key) {
		var deleteKeyValue = obj[canSymbol.for("can.deleteKeyValue")];
		if(deleteKeyValue) {
			return deleteKeyValue.call(obj, key);
		}
		delete obj[key];
	},
	getValue: function(value){
		if(typeReflections.isPrimitive(value)) {
			return value;
		}
		var getValue = value[getValueSymbol];
		if(getValue) {
			return getValue.call(value);
		}
		return value;
	},
	setValue: function(item, value){
		var setValue = item && item[setValueSymbol];
		if(setValue) {
			return setValue.call(item, value);
		} else {
			throw new Error("can-reflect.setValue - Can not set value.");
		}
	}
};
reflections.get = reflections.getKeyValue;
reflections.set = reflections.setKeyValue;
reflections.delete = reflections.deleteKeyValue;

module.exports = reflections;
