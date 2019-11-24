(function() {

  if (typeof HTMLCanvasElement !== "undefined") {
    forcePreserveDrawingBuffer(HTMLCanvasElement);
  }
  if (typeof OffscreenCanvas !== "undefined") {
    forcePreserveDrawingBuffer(OffscreenCanvas);
  }

  function forcePreserveDrawingBuffer(ContextClass) {
    const isWebGL = /webgl/i;

    ContextClass.prototype.getContext = function(origFn) {
      return function(type, attributes) {
        if (isWebGL.test(type)) {
          attributes = Object.assign({}, attributes || {}, {preserveDrawingBuffer: true});
        }
        return origFn.call(this, type, attributes);
      };
    }(ContextClass.prototype.getContext);
  }

}());
