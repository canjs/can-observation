# can-reflect

[![Build Status](https://travis-ci.org/canjs/can-reflect.png?branch=master)](https://travis-ci.org/canjs/can-reflect)

Reflect allows you to reflection on unknown data types.

By looking for symbols in [can-symbol], `can-reflect` lets someone act upon
any data type without having to have prior knowledge of it.

The different reflections you can use are grouped by reflection type as follows:

- Type Reflections - Tell you what the value is.
  - `.isConstructorLike `
  - `.isFunctionLike`
  - `.isIteratorLike`
  - `.isListLike`
  - `.isMapLike`
  - `.isMoreListThanMapLike` (lists can often still be maps)
  - `.isObservableLike`
  - `.isValueLike`
  - `.isSymbolLike`
- Shape Reflections - Give you information about the value.
  - _own and enumerable_
    - `.eachIndex`
	- `.eachKey`
	- `.each`
    - `.getOwnEnumerableKeys` (aka `.keys`)
	- `.toArray`
  - _own_
	- `.getOwnKeys`
	- `.getOwnKeyDescriptor`
  - _all_ (pending)
- Getter / Setter Reflections - get or set some value on another value.
  - `.getKeyValue`, `.setKeyValue`, `.deleteKeyValue` - for maps (`get`, `set`, and `delete` are aliases)
  - `.getValue`, `.setValue` - for things like computes
  - `.splice`, `.addKeys(keyValues[,index])`, `.removeKeys(keysOrValues[,index])` (PENDING?)
- Function Reflections - call functions or create instances
  - `.call`
  - `.apply`
  - `.new`
- Observe Reflections - listen to when things change
  - `.onKeyValue`, `.offKeyValue`
  - `.onKeys` - when anything changes
  - `.onKeysAdded`, `.onKeysRemoved`
  - `.getKeyDependencies` - for debugging
  - `.keyHasDependencies`
  - `.onValue`, `.offValue`
  - `.getValueDependencies`
  - `.valueHasDependencies`
  - `.onEvent`, `.offEvent` - listen to an event on something

TODO:

 - `.deleteKeyValue`, `.get` and `.set` aliases
 - `addKeys` / `removeKeys`
 - `isInitializing`
