(function() {

  if (typeof HTMLCanvasElement !== "undefined") {
    wrapGetContext(HTMLCanvasElement);
  }
  if (typeof OffscreenCanvas !== "undefined") {
    wrapGetContext(OffscreenCanvas);
  }

  function wrapGetContext(ContextClass) {
    const isWebGL = /webgl/i;

    ContextClass.prototype.getContext = function(origFn) {
      return function(type, attributes) {
        if (isWebGL.test(type)) {
          attributes = Object.assign({}, attributes || {}, {alpha: true});
        }
        return origFn.call(this, type, attributes);
      };
    }(ContextClass.prototype.getContext);
  }

}());
