# WebGL Helpers

Some tiny scripts that might come in handle.

```
<script src="https://cdn.jsdelivr.net/npm/webgl-helpers@1.0.0/webgl-log-shaders.js"></script>
<script src="https://cdn.jsdelivr.net/npm/webgl-helpers@1.0.0/webgl2-disable.js"></script>
<script src="https://cdn.jsdelivr.net/npm/webgl-helpers@1.0.0/webgl-force-preservedrawingbuffer.js"></script>
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

## webgl-disable2.js

Disables WebGL2. Useful to force something to use WebGL1 assuming it can handle both

## webgl-force-preservedrawingbuffer.js

Forces `preserveDrawingBuffer: true`.

Example:

* [without script](https://greggman.github.io/webgl-helpers/examples/2d-lines.html)
* [with script](https://greggman.github.io/webgl-helpers/examples/2d-lines-force-preservedrawingbuffer.html)

<img src="https://greggman.github.io/webgl-helpers/images/preservedrawingbuffer.png" />

# Why?

You can paste them in a iiddle/pen/sandbox/s.o. just for testing or when doing other experiments.
Also as a way to document solutions.

