var canSymbol = require("can-symbol");

var slice = [].slice;

function makeFallback(symbolName, fallbackName) {
	return function(obj){
		var method = obj[canSymbol.for(symbolName)];
		if(method !== undefined) {
			return method.apply(obj, slice.call(arguments, 1));
		}
		return this[fallbackName].apply(this, arguments);
	};
}

function makeErrorIfMissing(symbolName, errorMessage){
	return function(obj){
		var method = obj[canSymbol.for(symbolName)];
		if(method !== undefined) {
			return method.apply(obj, slice.call(arguments, 1));
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

	getKeyDependencies: makeErrorIfMissing("can.getKeyDependencies","can-reflect: can get dependencies for key"),

	// VALUE
	onValue: makeErrorIfMissing("can.onValue","can-reflect: can not observe value change"),
	offValue: makeErrorIfMissing("can.offValue","can-reflect: can not unobserve value change"),

	getValueDependencies: makeErrorIfMissing("can.getKeyDependencies","can-reflect: can get dependencies for value"),

	// EVENT
	onEvent: function(obj, eventName, callback){
		if(obj) {
			var onEvent = obj[canSymbol.for("can.onEvent")];
			if(onEvent !== undefined) {
				return onEvent.apply(obj, slice.call(arguments, 1));
			} else if(obj.addEventListener) {
				obj.addEventListener(eventName, callback);
			}
		}
	},
	offEvent: function(obj, eventName, callback){
		if(obj) {
			var offEvent = obj[canSymbol.for("can.offEvent")];
			if(offEvent !== undefined) {
				return offEvent.apply(obj, slice.call(arguments, 1));
			}  else if(obj.removeEventListener) {
				obj.removeEventListener(eventName, callback);
			}
		}

	}
};
