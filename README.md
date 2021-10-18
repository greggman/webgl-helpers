# WebGL Helpers

Some tiny scripts and debugger snippets that might come in handy.

## glEnumToString

A simple one but incomplete

```
function glEnumToString(value) {
  const keys = [];
  for (const key in WebGL2RenderingContext) {
    if (WebGL2RenderingContext[key] === value) {
      keys.push(key);
    }
  }
  return keys.length ? keys.join(' | ') : `0x${value.toString(16)}`;
}
```

The issue with it being incomplete it some enums are specified on extensions. 
One that covered all enums is a little too involved. Also, GL unforuntately
chose `0` for 4 different values. `NONE`, `POINTS`, `FALSE`, `NO_ERROR` which
is why the `join` above. Otherwise you'd need to know the function the value
is going to be used with in order to return the correct string.

## Show the available extensions

```
document.createElement("canvas").getContext("webgl").getSupportedExtensions().join('\n');
document.createElement("canvas").getContext("webgl2").getSupportedExtensions().join('\n');
```

## Spy on draw calls

Copy and paste this into the JavaScript console

```
(()=>{const s = document.createElement('script');s.src='https://greggman.github.io/webgl-helpers/webgl-show-draw-calls.js';document.firstElementChild.appendChild(s)})();
```

or copy and pasted [the entire file](https://raw.githubusercontent.com/greggman/webgl-helpers/master/webgl-show-draw-calls.js) into the JavaScript console.

Example, select the correct context, then copy and paste

<img src="https://greggman.github.io/webgl-helpers/images/log-draw-calls-jsconsole.gif" />

Or use 

```
<script src="https://greggman.github.io/webgl-helpers/webgl-show-draw-calls.js"></script>
```

# scripts to use when your including a 3rd party WebGL lib (Unity, three.js, etc...)

## webgl-log-shaders.js

Want to dump shaders, add this script at the top of your HTML file

```
<script src="https://greggman.github.io/webgl-helpers/webgl-log-shaders.js"></script>
```

For example [here's a Unity example with the script above added to the top of the HTML file](https://greggman.github.io/webgl-helpers/examples/unity/index-log-shaders.html).

<img src="https://greggman.github.io/webgl-helpers/images/unity-log-shaders.png" />

And here's [the same with three.js](https://greggman.github.io/webgl-helpers/examples/threejs/).

<img src="https://greggman.github.io/webgl-helpers/images/threejs-log-shaders.png" />

## webgl-dump-shaders.js

Same as above except you can possibly copy and paste this contents into the JS console.

```
(()=>{const s = document.createElement('script');s.src='https://greggman.github.io/webgl-helpers/webgl-dump-shaders.js';document.firstElementChild.appendChild(s)})();
```

For example Google Maps

<img src="https://greggman.github.io/webgl-helpers/images/dump-shaders-google-maps.png" />

## webgl-disable2.js

Disables WebGL2. Useful to force something to use WebGL1 assuming it can handle both

```
<script src="https://greggman.github.io/webgl-helpers/webgl2-disable.js"></script>
```

## webgl-force-preservedrawingbuffer.js

Forces `preserveDrawingBuffer: true`.

Maybe you want to take a screenshot of some canvas that another script is controlling.

```
<script src="https://greggman.github.io/webgl-helpers/webgl-force-preservedrawingbuffer.js"></script>
```

Example:

* [without script](https://greggman.github.io/webgl-helpers/examples/2d-lines.html)
* [with script](https://greggman.github.io/webgl-helpers/examples/2d-lines-force-preservedrawingbuffer.html)

<img src="https://greggman.github.io/webgl-helpers/images/preservedrawingbuffer.png" />

## webgl-force-alpha-true.js
## webgl-force-alpha-false.js

Forces `alpha: true` or `alpha: false`

Could be useful if you can't figure out how to get a certain library to
be one or the other. For example the myriad of poorly documented ways
that emscripten creates a canvas.

```
<script src="https://greggman.github.io/webgl-helpers/webgl-force-alpha-true.js"></script>
```

```
<script src="https://greggman.github.io/webgl-helpers/webgl-force-alpha-false.js"></script>
```

## webgl-force-premultipliedalpha-true.js
## webgl-force-premultipliedalpha-false.js

Forces `premultipliedAlpha: true` or `premultipliedAlpha: false`

Could be useful if you can't figure out how to get a certain library to
be one or the other. For example the myriad of poorly documented ways
that emscripten creates a canvas.

```
<script src="https://greggman.github.io/webgl-helpers/webgl-force-premultipliedalpha-true.js"></script>
```

```
<script src="https://greggman.github.io/webgl-helpers/webgl-force-premultipliedalpha-false.js"></script>
```

## webgl-force-powerpreference-low-power.js
## webgl-force-powerpreference-high-performance.js

Forces the powerPreference setting.

Could be useful if the library you're using has no way to set this
and you want it to be something other than the default.

```
<script src="https://greggman.github.io/webgl-helpers/webgl-powerpreference-low-power.js"></script>
```

```
<script src="https://greggman.github.io/webgl-helpers/webgl-powerpreference-high-performance.js"></script>
```

## webgl-gl-error-check.js

This script has moved to [https://github.com/greggman/webgl-lint](https://github.com/greggman/webgl-lint)
