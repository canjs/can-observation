var valueReaders = {
	name: "compute",
	// compute value reader
	test: function(value, i, reads, options){

		return value && value.isComputed && !isAt(i, reads);
	},
	read: function(value, i, reads, options, state){
		if(options.readCompute === false && i === reads.length ) {
			return value;
		}

		if (!state.foundObservable && options.foundObservable) {
			options.foundObservable(value, i);
			state.foundObservable = true;
		}
		return value instanceof can.Compute ? value.get() : value();
	}
}
var map = ,
