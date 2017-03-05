var canSymbol = require("can-symbol");

var canOperate = require("../../operator-namespace");

module.exports = function(map, key, callback){
	var onKeyValue = map[canSymbol.for("can.onKeyValue")];
	if(onKeyValue) {
		return onKeyValue.call(map, key, callback);
	} else {

		["addEventListener","on","bind"].some(function(prop){
			if(canOperate["in"](prop, map)) {
				map[prop](key, callback);
				return true;
			}
		});
	}
};
