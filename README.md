# WebGL Helpers

Some tiny scripts and debugger snippets that might come in handy.

## glEnumToString

```
function glEnumToString(gl, value) {
  const keys = [];
  for (const key in gl) {
    if (gl[key] === value) {
      keys.push(key);
    }
  }
  return keys.length ? keys.join(' | ') : `0x${value.toString(16)}`;
}
```

## Show the available extensions

```
document.createElement("canvas").getContext("webgl").getSupportedExtensions().join('\n');
document.createElement("canvas").getContext("webgl2").getSupportedExtensions().join('\n');
```

## Spy on draw calls

Copy and paste this into the JavaScript console

```
(function() {
function glEnumToString(gl, value) {
  const keys = [];
  for (const key in gl) {
    if (gl[key] === value) {
      keys.push(key);
    }
  }
  return keys.length ? keys.join(' | ') : `0x${value.toString(16)}`;
}

function wrapFn(p, fn) {
  const origFn = p[fn];
  p[fn] = function(...args) {
    console.log(fn, glEnumToString(this, args[0]));
    return origFn.call(this, ...args);
  };
}

function wrapFnP(p, fn) {
  wrapFn(p.prototype, fn);
}

wrapFnP(WebGLRenderingContext, 'drawArrays');
wrapFnP(WebGLRenderingContext, 'drawElements');
wrapFnP(WebGL2RenderingContext, 'drawArrays');
wrapFnP(WebGL2RenderingContext, 'drawElements');
wrapFnP(WebGL2RenderingContext, 'drawArraysInstanced');
wrapFnP(WebGL2RenderingContext, 'drawElementsInstanced');
wrapFnP(WebGL2RenderingContext, 'drawRangeElements');

ext = document.createElement("canvas").getContext("webgl").getExtension('ANGLE_instanced_arrays');
wrapFn(ext.__proto__, 'drawArraysInstancedANGLE');
wrapFn(ext.__proto__, 'drawElementsInstancedANGLE');
}())
```

Example, select the correct context, then copy and paste

<img src="https://greggman.github.io/webgl-helpers/images/log-draw-calls-jsconsole.gif" />

Or use 

```
<script src="https:///greggman.github.io/webgl-helpers/webgl-show-draw-calls.js"></script>
```

## scripts to use when your including a 3rd party WebGL lib (Unity, three.js, etc...)

```
<script src="https:///greggman.github.io/webgl-helpers/webgl-check-framebuffer-feedback.js"></script>
<script src="https://greggman.github.io/webgl-helpers/webgl2-disable.js"></script>
<script src="https://greggman.github.io/webgl-helpers/webgl-log-shaders.js"></script>
<script src="https://greggman.github.io/webgl-helpers/webgl-force-preservedrawingbuffer.js"></script>
<script src="https://greggman.github.io/webgl-helpers/webgl-force-alpha-true.js"></script>
<script src="https://greggman.github.io/webgl-helpers/webgl-force-alpha-false.js"></script>
<script src="https://greggman.github.io/webgl-helpers/webgl-powerpreference-low-power.js"></script>
<script src="https://greggman.github.io/webgl-helpers/webgl-powerpreference-high-performance.js"></script>
<script src="https://greggman.github.io/webgl-helpers/webgl-force-premultipliedalpha-true.js"></script>
<script src="https://greggman.github.io/webgl-helpers/webgl-force-premultipliedalpha-false.js"></script>
```

## webgl-log-shaders.js

Want to dump shaders, add this script at the top of your HTML file

```
<script src="webgl-log-shaders.js"></script>
```

For example [here's a Unity example with the script above added to the top of the HTML file](https://greggman.github.io/webgl-helpers/examples/unity/index-log-shaders.html).

<img src="https://greggman.github.io/webgl-helpers/images/unity-log-shaders.png" />

And here's [the same with three.js](https://greggman.github.io/webgl-helpers/examples/threejs/).

<img src="https://greggman.github.io/webgl-helpers/images/threejs-log-shaders.png" />

## webgl-check-framebuffer-feedback.js

Browsers will tell you that you have a framebuffer feedback error,
that you're reading from a texture that is also being written to,
but they won't give you any more details. This script will check
for that error and throw and tell you which uniform, texture unit,
and framebuffer attachment are the issue.

## webgl-disable2.js

Disables WebGL2. Useful to force something to use WebGL1 assuming it can handle both

## webgl-force-preservedrawingbuffer.js

Forces `preserveDrawingBuffer: true`.

Maybe you want to take a screenshot of some canvas that another script is controlling.

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

## webgl-force-premultipliedalpha-true.js
## webgl-force-premultipliedalpha-false.js

Forces `premultipliedAlpha: true` or `premultipliedAlpha: false`

Could be useful if you can't figure out how to get a certain library to
be one or the other. For example the myriad of poorly documented ways
that emscripten creates a canvas.

## webgl-force-powerpreference-low-power.js
## webgl-force-powerpreference-high-performance.js

Forces the powerPreference setting.

Could be useful if the library you're using has no way to set this
and you want it to be something other than the default.

## webgl-debug-helper.js

Calls `getError` after every function and reports if there was an error.

* [without script](https://greggman.github.io/webgl-helpers/examples/error-without-helper.html)
* [with script](https://greggman.github.io/webgl-helpers/examples/error-with-helper.html)


# Why?

You can paste them in a iiddle/pen/sandbox/s.o. just for testing or when doing other experiments.
Also as a way to document solutions.

