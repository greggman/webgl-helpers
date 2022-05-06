(function() {

  if (typeof WebGLRenderingContext !== "undefined") {
    addShaderLogger(WebGLRenderingContext);
    addProgramLogger(WebGLRenderingContext);
  }
  if (typeof WebGL2RenderingContext !== "undefined") {
    addShaderLogger(WebGL2RenderingContext);
    addProgramLogger(WebGL2RenderingContext);
  }

  function addShaderLogger(ContextClass) {
    ContextClass.prototype.compileShader = function(origFn) {
      return function(shader) {
        origFn.apply(this, arguments);
        const result = this.getShaderParameter(shader, this.COMPILE_STATUS);
        if (!result) {
          console.error(`bad shader:\n${this.getShaderSource(shader)}`);
        }
      };
    }(ContextClass.prototype.compileShader);
  }

  function addProgramLogger(ContextClass) {
    ContextClass.prototype.linkProgram = function(origFn) {
      return function(program) {
        origFn.apply(this, arguments);
        const result = this.getProgramParameter(program, this.LINK_STATUS);
        if (!result) {
          console.error(`bad link:\n${this.getAttachedShaders(program).map(shader => this.getShaderSource(shader)).join('\n')}`);
        }
      };
    }(ContextClass.prototype.linkProgram);
  }

}());
