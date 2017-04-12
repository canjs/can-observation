var canSymbol = require("can-symbol");

var slice = [].slice;

function makeFallback(symbolName, fallbackName) {
	return function(obj, event, handler){
		var method = obj[canSymbol.for(symbolName)];
		if(method !== undefined) {
			return method.call(obj, event, handler);
		}
		return this[fallbackName].apply(this, arguments);
	};
}

function makeErrorIfMissing(symbolName, errorMessage){
	return function(obj, arg1, arg2){
		var method = obj[canSymbol.for(symbolName)];
		if(method !== undefined) {
			return method.call(obj, arg1, arg2);
		}
		throw new Error(errorMessage);
	};
}

module.exports = {
	// KEY
	onKeyValue: makeFallback("can.onKeyValue", "onEvent"),
	offKeyValue: makeFallback("can.offKeyValue","offEvent"),

	// any key change (diff would normally happen)
	onKeys: makeErrorIfMissing("can.onKeys","can-reflect: can not observe an onKeys event"),
	// keys added at a certain point {key: 1}, index
	onKeysAdded: makeErrorIfMissing("can.onKeysAdded","can-reflect: can not observe an onKeysAdded event"),

	onKeysRemoved: makeErrorIfMissing("can.onKeysRemoved","can-reflect: can not unobserve an onKeysRemoved event"),

	getKeyDependencies: makeErrorIfMissing("can.getKeyDependencies","can-reflect: can not determine dependencies"),

	// TODO: use getKeyDeps once we know what that needs to look like
	keyHasDependencies: makeErrorIfMissing("can.keyHasDependencies","can-reflect: can not determine if this has key dependencies"),

	// VALUE
	onValue: makeErrorIfMissing("can.onValue","can-reflect: can not observe value change"),
	offValue: makeErrorIfMissing("can.offValue","can-reflect: can not unobserve value change"),

	getValueDependencies: makeErrorIfMissing("can.getValueDependencies","can-reflect: can not determine dependencies"),

	// TODO: use getValueDeps once we know what that needs to look like
	valueHasDependencies: makeErrorIfMissing("can.valueHasDependencies","can-reflect: can not determine if value has dependencies"),

	// EVENT
	onEvent: function(obj, eventName, callback){
		if(obj) {
			var onEvent = obj[canSymbol.for("can.onEvent")];
			if(onEvent !== undefined) {
				return onEvent.call(obj, eventName, callback);
			} else if(obj.addEventListener) {
				obj.addEventListener(eventName, callback);
			}
		}
	},
	offEvent: function(obj, eventName, callback){
		if(obj) {
			var offEvent = obj[canSymbol.for("can.offEvent")];
			if(offEvent !== undefined) {
				return offEvent.call(obj, eventName, callback);
			}  else if(obj.removeEventListener) {
				obj.removeEventListener(eventName, callback);
			}
		}

	}
};
