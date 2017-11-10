@module {constructor} can-observation
@parent can-observables
@collection can-infrastructure
@group can-observation.prototype prototype
@group can-observation.static static
@group can-observation.types types
@package ../package.json

Provides a mechanism to notify when an observable has been read and a
way to observe those reads called within a given function.

@signature `new Observation(func, context, compute)`

Creates an observation of a given function called with `this` as
a given context. Calls back `compute` when the return value of `func` changes.

@param {function} func The function whose value is being observed.
@param {Object} context What `this` should be when `func` is called.
@param {function(*,*,Number)|can-compute} updated(newValue, oldValue, batchNum) A function to call when `func`'s return value changes.

@body

## Use

Instances of `Observation` are rarely created directly.  Instead, use [can-compute]'s more friendly API to
observe when a function's value changes. [can-compute] uses `can-observation` internally.

`Observation`'s static methods like: [can-observation.add], [can-observation.ignore], and [can-observation.trap]
are used more commonly to control which observable events a compute will listen to.

To use `can-observation` directly, create something observable (supports `addEventListener`) and
calls [can-observation.add] like:

```js
var Observation = require("can-observation");
var assign = require("can-util/js/assign/assign");
var canEvent = require("can-event");

var me = assign({}, canEvent);

var name = "Justin";
Object.defineProperty(me,"name",{
  get: function(){
    Observation.add(this,"name");
    return name;
  },
  set: function(newVal) {
    var oldVal = name;
    name = newVal;
    this.dispatch("name", newVal, oldVal);
  }
})
```

Next, create an observation instance with a function that reads the observable value:

```js
var observation = new Observation(function(){
  return "Hello "+me.name;
}, null, function(newVal, oldVal, batchNum){
  console.log(newVal);
})
```

Finally, call `observation.start()` to start listening and be notified of changes:

```js
observation.start();
observation.value   //-> "Hello Justin";
me.name = "Ramiya"; // console.logs -> "Hello Ramiya"
```
 */
