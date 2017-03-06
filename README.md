# can-operate

[![Build Status](https://travis-ci.org/canjs/can-operate.png?branch=master)](https://travis-ci.org/canjs/can-operate)

Operate on unknown data types.

By looking for symbols in [can-symbol], `can-operate` lets someone act upon
any data type without having to have prior knowledge of it.

The different operators you can use are grouped by operation type as follows:

- Type Operators - Tell you what the value is.
  - `.isConstructorLike `
  - `.isFunctionLike`
  - `.isIteratorLike`
  - `.isListLike`
  - `.isMapLike`
  - `.isMoreListThanMapLike` (lists can often still be maps)
  - `.isObservableLike`
  - `.isValueLike`
  - `.isSymbolLike`
- Shape Operators - Give you information about the value.
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
- Getter / Setter Operators - get or set some value on another value.
  - `.getKeyValue`, `.setKeyValue` - for maps
  - `.getValue`, `.setValue` - for things like computes
  - `.splice`, `.addKeys(keyValues[,index])`, `.removeKeys(keys[,index])` (PENDING?)
- Function Operators - call functions or create instances
  - `.call`
  - `.apply`
  - `.new`
- Observe Operators - listen to when things change
  - `.onKeyValue`, `.offKeyValue`
  - `.onKeys` - when anything changes
  - `.onKeysAdded`, `.onKeysRemoved`
  - `.getKeyDependencies` - for debugging
  - `.onValue`, `.offValue`
  - `.getValueDependencies`
  - `.onEvent`, `.offEvent` - listen to an event on something
