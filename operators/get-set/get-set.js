var canSymbol = require("can-symbol");
var typeOperators = require("../type/type");

module.exports = {
	setKeyValue: function(obj, key, value){
		var setKeyValue = obj[canSymbol.for("can.setKeyValue")];
		if(setKeyValue) {
			return setKeyValue.call(obj, key, value);
		}
		if(typeOperators.isSymbolLike(key) && typeof key !== "symbol") {
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
		var getKeyValue = obj[canSymbol.for("can.getKeyValue")];
		if(getKeyValue) {
			return getKeyValue.call(obj, key);
		}
		return obj[key];
	},
	getValue: function(value){
		if(typeOperators.isPrimitive(value)) {
			return value;
		}
		var getValue = value[canSymbol.for("can.getValue")];
		if(getValue) {
			return getValue.call(value);
		}
		return value;
	},
	setValue: function(item, value){
		var setValue = item && item[canSymbol.for("can.setValue")];
		if(setValue) {
			return setValue.call(item, value);
		} else {
			throw new Error("can-operate.setValue - Can not set value.");
		}
	}
};
