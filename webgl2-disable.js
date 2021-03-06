(function() {

  if (typeof HTMLCanvasElement !== "undefined") {
    wrapGetContext(HTMLCanvasElement);
  }
  if (typeof OffscreenCanvas !== "undefined") {
    wrapGetContext(OffscreenCanvas);
  }

  function wrapGetContext(ContextClass) {
    ContextClass.prototype.getContext = function(origFn) {
      return function(type, attributes) {
        if (type === 'webgl2') {
          return null;
        }
        return origFn.apply(this, arguments);
      };
    }(ContextClass.prototype.getContext);
  }

}());
