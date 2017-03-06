var canSymbol = require("can-symbol");

var check = function(symbols, obj) {
	for(var i = 0, len = symbols.length ; i< len;i++) {
		var value = obj[canSymbol.for(symbols[i])];
		if(value !== undefined) {
			return value;
		}
	}
};

function isConstructorLike(func){
	/* jshint unused: false */
	// if you can new it ... it's a constructor
	var value = func[canSymbol.for("can.new")];
	if(value !== undefined) {
		return value;
	}
	if(typeof func !== "function") {
		return false;
	}
	// if there are any properties on the prototype, assume it's a constructor
	for(var prop  in func.prototype) {
		return true;
	}
	// We could also check if something is returned, if it is, probably not a constructor.
	return false;
}

function isFunctionLike(obj){
	var result = check(["can.new","can.call"], obj);
	if(result !== undefined) {
		return !!result;
	}
	return typeof obj === "function";
}

function isPrimitive(obj){
	var type = typeof obj;
	if(obj == null || (type !== "function" && type !== "object") ) {
		return true;
	} else {
		return false;
	}
}

function isValueLike(obj) {
	if(isPrimitive(obj)) {
		return true;
	}
	var value = obj[canSymbol.for("can.getValue")];
	if(value !== undefined) {
		return !!value;
	}
}

function isMapLike(obj) {
	if(isPrimitive(obj)) {
		return false;
	}
	var value = obj[canSymbol.for("can.getKeyValue")];
	if(value !== undefined) {
		return !!value;
	}
	// everything else in JS is MapLike
	return true;
}

function isObservableLike( obj ) {
	if(isPrimitive(obj)) {
		return false;
	}
	var result = check(["can.onValue","can.onKeyValue","can.onKeys","can.onKeysAdded"], obj);
	if(result !== undefined) {
		return !!result;
	}
}

function isListLike( list ) {
	var type = typeof list;
	if(type === "string") {
		return true;
	}
	if( isPrimitive(list) ) {
		return false;
	}
	var value = list[canSymbol.iterator];
	if(value !== undefined) {
		return !!value;
	}
	if(Array.isArray(list)) {
		return true;
	}

	// The `in` check is from jQuery’s fix for an iOS 8 64-bit JIT object length bug:
	// https://github.com/jquery/jquery/pull/2185
	var length = list && type !== 'boolean' &&
		typeof list !== 'number' &&
		"length" in list && list.length;

	// var length = "length" in obj && obj.length;
	return typeof list !== "function" &&
		( length === 0 || typeof length === "number" && length > 0 && ( length - 1 ) in list );
}
var symbolStart = "@@symbol";
function isSymbolLike( symbol ) {
	if(typeof symbol === "symbol") {
		return true;
	} else {
		return symbol.toString().substr(0, symbolStart.length) === symbolStart;
	}
}

module.exports = {
	isConstructorLike: isConstructorLike,
	isFunctionLike: isFunctionLike,
	isListLike: isListLike,
	isMapLike: isMapLike,
	isObservableLike: isObservableLike,
	isPrimitive: isPrimitive,
	isValueLike: isValueLike,
	isSymbolLike: isSymbolLike,
	isMoreListLikeThanMapLike: function(obj){
		if(Array.isArray(obj)) {
			return true;
		}
		var value = obj[canSymbol.for("can.isMoreListLikeThanMapLike")];
		if(value !== undefined) {
			return value;
		}
		var isListLike = this.isListLike(obj),
			isMapLike = this.isMapLike(obj);
		if(isListLike && !isMapLike) {
			return true;
		} else if(!isListLike && isMapLike) {
			return false;
		}
	},
	isIteratorLike: function(obj){
		return obj &&
			typeof obj === "object" &&
			typeof obj.next === "function" &&
			obj.next.length === 0;
	}
};
