var functionReflections = require("./reflections/call/call");
var getSet = require("./relections/get-set/get-set");
var observe = require("./relections/observe/observe");
var shape = require("./relections/shape/shape");
var type = require("./relections/type/type");

var reflect = {};
[functionReflections,getSet,observe,shape,type].forEach(function(reflections){
	for(var prop in reflections) {
		reflect[prop] = reflections[prop];
	}
});



module.exports = reflect;
