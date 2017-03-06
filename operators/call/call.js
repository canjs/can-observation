var canSymbol = require("can-symbol");
var typeOperators = require("../type/type");

module.exports = {
	call: function(func, context){
		var args = [].slice.call(arguments, 2);
		var apply = func[canSymbol.for("can.apply")];
		if(apply) {
			return apply.call(func, context, args);
		} else {
			return func.apply(context, args);
		}
	},
	apply: function(func, context, args){
		var apply = func[canSymbol.for("can.apply")];
		if(apply) {
			return apply.call(func, context, args);
		} else {
			return func.apply(context, args);
		}
	},
	"new": function(func){
		var args = [].slice.call(arguments, 1);
		var makeNew = func[canSymbol.for("can.new")];
		if(makeNew) {
			return makeNew.apply(func, args);
		} else {
			var context = Object.create(func.prototype);
			var ret = func.apply(context, args);
			if(typeOperators.isPrimitive(ret)) {
				return context;
			} else {
				return ret;
			}
		}
	}
};
