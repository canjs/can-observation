# can-operate

[![Build Status](https://travis-ci.org/canjs/can-operate.png?branch=master)](https://travis-ci.org/canjs/can-operate)

operate on unknown data types

## Usage

### ES6 use

With StealJS, you can import this module directly in a template that is autorendered:

```js
import plugin from 'can-operate';
```

### CommonJS use

Use `require` to load `can-operate` and everything else
needed to create a template that uses `can-operate`:

```js
var plugin = require("can-operate");
```

## AMD use

Configure the `can` and `jquery` paths and the `can-operate` package:

```html
<script src="require.js"></script>
<script>
	require.config({
	    paths: {
	        "jquery": "node_modules/jquery/dist/jquery",
	        "can": "node_modules/canjs/dist/amd/can"
	    },
	    packages: [{
		    	name: 'can-operate',
		    	location: 'node_modules/can-operate/dist/amd',
		    	main: 'lib/can-operate'
	    }]
	});
	require(["main-amd"], function(){});
</script>
```

### Standalone use

Load the `global` version of the plugin:

```html
<script src='./node_modules/can-operate/dist/global/can-operate.js'></script>
```
