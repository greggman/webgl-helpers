(function() {
  const extensionToContext = new Map();
  function rememberExtensionContext(gl, ext) {
    extensionToContext.set(ext, gl);
  }
  
  const dumped = new Set();

  /**
   * @param {WebGLRenderingContext} gl
   * @param {WebGLProgram} program
   */
  function invalidate(gl, program) {
    dumped.delete(program);
  }

  /**
   * @param {WebGLRenderingContext} gl
   */
  function dumpShaders(gl) {
    const program = gl.getParameter(gl.CURRENT_PROGRAM);
    if (!program || dumped.has(program)) {
      return;
    }

    dumped.add(program);

    const shaders = gl.getAttachedShaders(program);
    for (const shader of shaders) {
      console.log(gl.getShaderSource(shader));
    }
  }

  function dumpShadersExt(ext) {
    const gl = extensionToContext.get(ext);
    if (gl) {
      dumpShaders(gl);
    }
  }

  function checkForExtension(gl) {
    const ext = gl.getExtension('ANGLE_instanced_arrays');
    extensionToContext.set(ext, gl);
  }

  function wrapFn(p, fn, wrapperFn) {
    const origFn = p[fn];
    p[fn] = function(...args) {
      const result = origFn.call(this, ...args);
      wrapperFn(this, result, ...args);
      return result;
    };
  }

  function wrapFnP(p, fn, wrapperFn) {
    wrapFn(p.prototype, fn, wrapperFn);
  }

  wrapFnP(WebGLRenderingContext, 'getExtension', rememberExtensionContext);
  wrapFnP(WebGLRenderingContext, 'linkProgram', invalidate);
  wrapFnP(WebGLRenderingContext, 'useProgram', checkForExtension);
  wrapFnP(WebGLRenderingContext, 'drawArrays', dumpShaders);
  wrapFnP(WebGLRenderingContext, 'drawElements', dumpShaders);

  if (typeof WebGL2RenderingContext !== 'undefined') {
    wrapFnP(WebGL2RenderingContext, 'getExtension', rememberExtensionContext);
    wrapFnP(WebGL2RenderingContext, 'linkProgram', invalidate);
    wrapFnP(WebGL2RenderingContext, 'drawArrays', dumpShaders);
    wrapFnP(WebGL2RenderingContext, 'drawElements', dumpShaders);
    wrapFnP(WebGL2RenderingContext, 'drawArraysInstanced', dumpShaders);
    wrapFnP(WebGL2RenderingContext, 'drawElementsInstanced', dumpShaders);
    wrapFnP(WebGL2RenderingContext, 'drawRangeElements', dumpShaders);
  }

  const ext = document.createElement("canvas").getContext("webgl").getExtension('ANGLE_instanced_arrays');
  if (ext) {
    wrapFn(ext.__proto__, 'drawArraysInstancedANGLE', dumpShadersExt);
    wrapFn(ext.__proto__, 'drawElementsInstancedANGLE', dumpShadersExt);
  }

}());
