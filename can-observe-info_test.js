require("./reader/reader_test");

var ObserveInfo = require('can-observe-info');
var QUnit = require('steal-qunit');
var CID = require('can-util/js/cid/cid')

var assign = require("can-util/js/assign/assign");
var canEvent = require('can-event');

QUnit.module('can-observe-info');

QUnit.test('nested traps are reset onto parent traps', function() {
    var obs1 = assign({}, canEvent);
    CID(obs1);
    var obs2 = assign({}, canEvent);
    CID(obs2);

	var oi = new ObserveInfo(function() {

		var getObserves1 = ObserveInfo.trap();

        ObserveInfo.observe(obs1, "prop1");

        var getObserves2 = ObserveInfo.trap();
        ObserveInfo.observe(obs2, "prop2");

        var observes2 = getObserves2();

        ObserveInfo.observes(observes2);

        var observes1 = getObserves1();

        equal(observes1.length, 2, "two items");
        equal(observes1[0].obj, obs1);
        equal(observes1[1].obj, obs2);
	}, null, function() {

	});


    oi.getValueAndBind();
});
