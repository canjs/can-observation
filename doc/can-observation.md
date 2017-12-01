@module {constructor} can-observation
@parent can-observables
@collection can-infrastructure
@group can-observation.prototype prototype
@package ../package.json

Create observable values that derive their value from other observable
values.


@signature `new Observation( fn [, context][, options] )`

Creates an observable value from the return value of the given function called with `this` as the `context`.

The following creates a `fullName` observation that derives its values from
the `person` observable.

```js
import Observation from "can-observation";
import observe from "can-observe";

var person = observe({first: "Ramiya", last: "Meyer"});

var fullName = new Observation(function(){
    return person.first + " " + person.last;
});

fullName.get() //-> "Ramiya Meyer";

fullName.on(function( newName ){
    newName //-> "Bodhi Meyer"
});

person.first = "Bodhi";
```

@param {function} fn The function whose value is being observed.
@param {Object} [context] What `this` should be when `fn` is called.
@param {Object} [options] An object that can configure the behavior of the
  observation with the following properties:

  - __priority__ `{Number}` - The priority this observation will be updated
    within [can-queues].
  - __isObservable__ `{Boolean}` - If reading this observable should call
    [can-observation-recorder.add].  


@body

## Use Cases

`can-observation` is used to derive values from other values without
having to explicitly bind.   This is used many places within CanJS:

- [can-define] `getters` that cache their value.
- [can-stache]'s live binding.

## Use

To use `can-observation`, import it and create an observation that
reads from other observables and returns a value.


The following creates a `fullName` observation that derives its values from
the `person` observable.

```js
import Observation from "can-observation";
import observe from "can-observe";

var person = observe({first: "Ramiya", last: "Meyer"});

var fullName = new Observation(function fullName(){
    return person.first + " " + person.last;
});

fullName.get() //-> "Ramiya Meyer";

fullName.on(function( newName ){
    newName //-> "Bodhi Meyer"
});

person.first = "Bodhi";
```

Use [can-observation.prototype.off] to unbind.  

## Debugging


#### Naming Functions

Observations [can-observation.prototype.can.getName name themselves] using the name of the
function passed to them. If you are using a `can-observation` directly, you should make sure the
function has a meaningful name.  

This can be done by using [function declarations](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function) like:

```js
var fullName = new Observation(function fullName(){
    return person.first + " " + person.last;
});
```

Instead of:

```js
var fullName = new Observation(function(){
    return person.first + " " + person.last;
});
```

You can also name functions as follows:

```js
//!steal-remove-start
var fn = function(){ ... };
Object.defineProperty(fn, "name", {
    value: "some meaningful name",
});
//!steal-remove-end
```

#### can-queues

If you use [can-queues] to debug, it's likely you'll see something like:

<pre>
NOTIFY running  : Observation&lt;fullName&gt;.onDependencyChange &#x25B6; { ... }
DERIVE running  : Observation&lt;fullName&gt;.update &#x25B6; { ... }
</pre>

These tasks are when an observation noticed a dependency has changed and when it began to update
its value. If you expand the task object (<code>&#x25B6; { ... }</code>), you should be able to see
exactly which dependency caused the observation to update.


## How it works

`can-observation` uses [can-event-queue/value/value] to implement its `.on`, `.off` methods and
call its internal `.onBound` and `.onUnbound` methods.

When bound for the first time, an observation calls its function between [can-observation-recorder]'s
[can-observation-recorder.start] and [can-observation-recorder.stop] to see what dependencies have been
bound.  It then binds those dependencies to 

- when bound for the 1st time.
  - calls `fn` between can-observation-recorder.onBound / stop to see what
    observables call OR.add.
  - Binds to those using recorder-dependency-helpers
    - when a change happens, adds itself to the notify queue
      - repeats process
