(function() {

  if (typeof WebGLRenderingContext !== "undefined") {
    addShaderLogger(WebGLRenderingContext);
  }
  if (typeof WebGL2RenderingContext !== "undefined") {
    addShaderLogger(WebGL2RenderingContext);
  }

  function addShaderLogger(ContextClass) {
    ContextClass.prototype.shaderSource = function(origFn) {
      return function(shader, source) {
        console.log(source);
        return origFn.apply(this, arguments);
      };
    }(ContextClass.prototype.shaderSource);
  }

}());
