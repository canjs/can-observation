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

const person = observe( { first: "Ramiya", last: "Meyer" } );

const fullName = new Observation( function() {
	return person.first + " " + person.last;
} );

fullName.value; //-> "Ramiya Meyer";

fullName.on( function( newName ) {
	newName; //-> "Bodhi Meyer"
} );

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
having to explicitly bind.  

## Use

To use `can-observation`, import it and create an observation that
reads from other observables and returns a value.


The following creates a `fullName` observation that derives its values from
the `person` observable.

```js
import Observation from "can-observation";
import observe from "can-observe";

const person = observe( { first: "Ramiya", last: "Meyer" } );

const fullName = new Observation( function() {
	return person.first + " " + person.last;
} );

fullName.value; //-> "Ramiya Meyer";

fullName.on( function( newName ) {
	newName; //-> "Bodhi Meyer"
} );

person.first = "Bodhi";
```

Use [can-observation.prototype.off] to unbind.  

## How it works

- when bound for the 1st time.
  - calls `fn` between can-observation-recorder.start / stop to see what
    observables call OR.add.
  - Binds to those using recorder-dependency-helpers
    - when a change happens, adds itself to the notify queue
      - repeats process
