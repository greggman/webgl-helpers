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

Calls `getError` after every function and throws if there was an error. It checks that
no arguments to any functions are `undefined`. Pass `0` or `false` where you mean `0` or `false`.
It checks that no numbers or values in arrays of numbers are `NaN`. If there is a WebGL error
it tries to provide more info about why, for example framebuffer feedback issues, 
access out of range issues, ...

* [without script](https://greggman.github.io/webgl-helpers/examples/error-without-helper.html)
* [with script](https://greggman.github.io/webgl-helpers/examples/error-with-helper.html)

```
<script src="https://greggman.github.io/webgl-helpers/webgl-gl-error-check.js"></script>
```

or 

```
import 'https://greggman.github.io/webgl-helpers/webgl-gl-error-check.js';
```

The script `throw`s a JavaScript exception when there is an issue so
if you are using `try`/`catch` to catch errors you might need to print the exceptions inside your catch block.
You can also turn on "pause on exception" on your JavaScript debugger.

Throwing seemed more a appropriate than just printing an error because if you get an error you should fix it! I tried
the script out with all the [three.js examples](https://threejs.org/examples). It found one real bug and 3 half bugs. By half bugs I mean there were 3 examples that functioned but were actually passing
`NaN` or `null` in the wrong places for a few frames. Arguably it's
better to fix those so that you can continue to use the helper to
find real errors. In any case the 360 of 364 examples ran without
error so you can do it too! 😉

Note: that it stops checking after the first 1000 draw calls. This
is so hopefully there is no perf it after a few seconds. If you want it to check more or less then copy it locally and edit.

### Naming your WebGL objects (buffers, textures, programs, etc..)

The script above adds a special extension `GMAN_debug_helper` with 1 function, `tagObject`. 
This lets you associate a name with an object. For example

```js
const ext = gl.getExtension('GMAN_debug_helper');
const tex = gl.createTexture();
ext.tagObject(tex, 'background-tex');
```

Now if you get an error related to `tex` you might get an told it's related to 'background-tex'
instead of just that you got an error.

4 suggestions for using naming

1.  make some helpers

    ```js
    const ext = gl.getExtension('GMAN_debug_helper');
    const tagObject = ext ? ext.tagObject.bind(ext) : () => ();
    ```

    now you can just unconditionally tag things and if the extension does
    not exist it will just be a no-op.

    ```js
    const tex = gl.createTexture();
    tagObject(tex);
    ```
  
2.  wrap the creations functions

    ```js
    const ext = gl.getExtension('GMAN_debug_helper');
    if (ext) {
      ['Texture', 
       'Buffer',
       'Framebuffer',
       'Renderbuffer',
       'Shader',
       'Program',
       'Query',
       'Sampler',
       'Sync',
       'TransformFeedback',
       'VertexArray',
      ].forEach(suffix => {
         const name = `create${suffix}`;
         const origFn = gl[name];
         if (origFn) {
           gl[name] = function(...args) {
             const obj = origFn.call(this, ...args);
             if (obj) {
               ext.tagObject(obj, args[args.length - 1] || '*unknown*');
             }
             return obj;
           }
         }
      });
    }
    ```

    Which you use like this

    ```js
    const shader = gl.createShader(gl.VERTEX_SHADER, 'phongVertexShader');
    const tex = gl.createTexture('tree-texture');
    ```

    and they'll still work in normal WebGL is it will ignore
    the extra parameter.

3. Same as above but not wrapped

    ```js
    const ext = gl.getExtension('GMAN_debug_helper');
    const api = {};
    ['Texture', 
     'Buffer',
     'Framebuffer',
     'Renderbuffer',
     'Shader',
     'Program',
     'Query',
     'Sampler',
     'Sync',
     'TransformFeedback',
     'VertexArray',
    ].forEach(suffix => {
       const name = `create${suffix}`;
       api[name] = (ext && gl[name])
           ? function(...args) {
               const obj = origFn.call(this, ...args);
               if (obj) {
                 ext.tagObject(obj, args[args.length - 1] || '*unknown*');
               }
               return obj;
             }
           : function(...args) {
             return gl[name].call(this, ...args);
           };
    });
    ```

    Which you use like this

    ```js
    const shader = api.createShader(gl.VERTEX_SHADER, 'phongVertexShader');
    const tex = api.createTexture('tree-texture');
    ```

    If you're allergic to hacking native APIs this is better but you have to
    remember to use `api.createXXX` instead of `gl.createXXX`

4.  Use your own API.

    Lots of people have wrapped WebGL themselves with things like `class Texture` and
    `class Framebuffer` or what other functions.

As a simple example, naming buffers after the attributes they'll
be used with (eg. 'position', 'normal'), naming textures by the URL of the img where they
get their data. Naming vertex array objects by the model ('tree', 'car', 'house'), naming
framebuffers by their usage ('shadow-depth', 'post-processing'), naming programs by what they do ('phong-shading', 'skybox')...

# Why?

You can paste them in a fiddle/pen/sandbox/s.o. just for testing or when doing other experiments.
Also as a way to document solutions.

