var observeReader = require("./reader");
var QUnit = require('steal-qunit');
var Observation = require('can-observation');
var canEvent = require('can-event');

var assign = require("can-util/js/assign/assign");

QUnit.module('can-observation/reader');



test("can.Compute.read can read a promise (#179)", function(){
	var data = {
		promise: new Promise(function(resolve){
			setTimeout(function(){
				resolve("Something");
			},2);
		})
	};
	var calls = 0;
	var c = new Observation(function(){
		return observeReader.read(data,observeReader.reads("promise.value")).value;
	}, null, {
		updater: function(newVal, oldVal){
			calls++;
			equal(calls, 1, "only one call");
			equal(newVal, "Something", "new value");
			equal(oldVal, undefined, "oldVal");
			start();
		}
	});
	c.start();

	stop();

});

test('can.compute.reads', function(){
	deepEqual( observeReader.reads("@foo"),
		[{key: "foo", at: true}]);

	deepEqual( observeReader.reads("@foo.bar"),
		[{key: "foo", at: true}, {key: "bar", at: false}]);

	deepEqual( observeReader.reads("@foo\\.bar"),
		[{key: "foo.bar", at: true}]);

	deepEqual( observeReader.reads("foo.bar@zed"),
		[{key: "foo", at: false},{key: "bar", at: false},{key: "zed", at: true}]);

});

test('able to read things like can-define', 3, function(){
	var obj = assign({}, canEvent);
	var prop = "PROP";
	Object.defineProperty(obj, "prop",{
		get: function(){
			Observation.add(obj,"prop");
			return prop;
		},
		set: function(val){
			var old = prop;
			prop = val;
			this.dispatch("prop", prop, old);
		}
	});
	var data = {
		obj: obj
	};

	var c = new Observation(function(){
		var value = observeReader.read(data,observeReader.reads("obj.prop"),{
			foundObservable: function(obs, index){
				equal(obs, obj, "got an observable");
				equal(index,1, "got the right index");
			}
		}).value;
		equal(value, "PROP");
	}, null, {
		updater: function(newVal, oldVal){

		}
	});
	c.start();


});

test("foundObservable called with observable object (#7)", function(){
	var map = {
		isSaving: function(){
			Observation.add(this, "_saving");
		},
		addEventListener: function(){}
	};
	// must use an observation to make sure things are listening.
	var c = new Observation(function(){
		observeReader.read(map,observeReader.reads("isSaving"),{
			foundObservable: function(obs){
				QUnit.equal(obs, map);
			}
		});
	}, null,{});
	c.start();

});

test("can read from strings", function(){
	var context = " hi there ";

	var result =  observeReader.read(context,observeReader.reads("trim"),{});
	QUnit.ok(result, context.trim);
});
