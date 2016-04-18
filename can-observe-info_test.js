var ObserveInfo = require('can-observe-info');
var QUnit = require('steal-qunit');


QUnit.module('can-observe-info');

QUnit.test('Initialized the plugin', function(){
  QUnit.equal(typeof ObserveInfo, 'function');
});
