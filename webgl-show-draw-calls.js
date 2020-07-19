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
    origFn = p[fn];
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

  if (typeof WebGL2RenderingContext !== 'undefined') {
    wrapFnP(WebGL2RenderingContext, 'drawArrays');
    wrapFnP(WebGL2RenderingContext, 'drawElements');
    wrapFnP(WebGL2RenderingContext, 'drawArraysInstanced');
    wrapFnP(WebGL2RenderingContext, 'drawElementsInstanced');
    wrapFnP(WebGL2RenderingContext, 'drawRangeElements');
  }

  const ext = document.createElement("canvas").getContext("webgl").getExtension('ANGLE_instanced_arrays');
  if (ext) {
    wrapFn(ext.__proto__, 'drawArraysInstancedANGLE');
    wrapFn(ext.__proto__, 'drawElementsInstancedANGLE');
  }
}())
