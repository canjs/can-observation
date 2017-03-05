var canSymbol = require("can-symbol");
var getSetOperators = require("../get-set/get-set");
var typeOperators = require("../type/type");

var shapeOperators = {
	each: function(obj, callback, context){

		// if something is more "list like" .. use eachIndex
		if(typeOperators.isIteratorLike(obj) || typeOperators.isMoreListLikeThanMapLike(obj) ) {
			return this.eachIndex(obj,callback,context);
		} else {
			return this.eachKey(obj,callback,context);
		}
	},

	// each index in something list-like. Uses iterator if it has it.
	eachIndex: function(list, callback, context){
		var iter;
		if(Array.isArray(list)) {
			// do nothing
		} else if(typeOperators.isIteratorLike(list)) {
			// we are looping through an interator
			iter = list;
		} else {
			var iterator = list[canSymbol.iterator];
			iter = iterator.call(list);
		}
		// fast-path arrays
		if(iter) {
			var res, index = 0;

			while(!(res = iter.next()).done) {
				if( callback.call(context || list, res.value, index++, list) === false ){
					break;
				}
			}
		} else {
			for (var i  = 0, len = list.length; i < len; i++) {
				var item = list[i];
				if (callback.call(context || item, item, i, list) === false) {
					break;
				}
			}
		}
		return list;
	},
	toArray: function(obj){
		var arr = [];
		this.each(obj, function(value){
			arr.push(value);
		});
		return arr;
	},
	// each key in something map like
	// eachOwnEnumerableKey
	eachKey: function(obj, callback, context){
		var enumerableKeys = this.getOwnEnumerableKeys(obj);
		return this.eachIndex(enumerableKeys, function(key){
			var value = getSetOperators.getKeyValue(obj, key);
			return callback.call(context || obj, value, key, obj);
		});
	},
	// if a key or index
	// like has own property
	"hasOwnKey": function(obj, key){
		var hasOwnKey = obj[canSymbol.for("can.hasOwnKey")];
		if(hasOwnKey) {
			return hasOwnKey.call(obj, key);
		}
		var getOwnKeys = obj[canSymbol.for("can.getOwnKeys")];
		if( getOwnKeys ) {
			var found = false;
			this.eachIndex(getOwnKeys.call(obj), function(objKey){
				if(objKey === key) {
					found = true;
					return false;
				}
			});
			return found;
		}
		return obj.hasOwnProperty(key);
	},

	// own enumerable keys (aliased as keys)
	getOwnEnumerableKeys: function(obj){
		var getOwnEnumerableKeys = obj[canSymbol.for("can.getOwnEnumerableKeys")];
		if(getOwnEnumerableKeys) {
			return getOwnEnumerableKeys.call(obj);
		}
		if( obj[canSymbol.for("can.getOwnKeys")] && obj[canSymbol.for("can.getOwnKeyDescriptor")] ) {
			var keys = [];
			this.eachIndex(this.getOwnKeys(obj), function(key){
				var descriptor =  this.getOwnKeyDescriptor(obj, key);
				if(descriptor.enumerable) {
					keys.push(key);
				}
			}, this);

			return keys;
		} /*else if(obj[canSymbol.iterator]){
			var iter = obj[canSymbol.iterator](obj);
			var index = 0;
			var keys;
			return {
				next: function(){
					var res = iter.next();
					if(index++)
				}
			}
			while(!().done) {

				if( callback.call(context || list, res.value, index++, list) === false ){
					break;
				}
			}
		}*/ else {
			return Object.keys(obj);
		}
	},
	// own enumerable&non-enumerable keys (Object.getOwnPropertyNames)
	getOwnKeys: function(obj){
		var getOwnKeys = obj[canSymbol.for("can.getOwnKeys")];
		if(getOwnKeys) {
			return getOwnKeys.call(obj);
		} else {
			return Object.getOwnPropertyNames(obj);
		}
	},
	getOwnKeyDescriptor: function(obj, key){
		var getOwnKeyDescriptor = obj[canSymbol.for("can.getOwnKeyDescriptor")];
		if(getOwnKeyDescriptor) {
			return getOwnKeyDescriptor.call(obj, key);
		} else {
			return Object.getOwnPropertyDescriptor(obj, key);
		}
	},


	// walks up the whole property chain
	"in": function(){},
	getAllEnumerableKeys: function(){},
	getAllKeys: function(){}
};
shapeOperators.keys = shapeOperators.getOwnEnumerableKeys;
module.exports = shapeOperators;
