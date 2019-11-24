(function() {

  if (typeof HTMLCanvasElement !== "undefined") {
    disableWebGL2(HTMLCanvasElement);
  }
  if (typeof OffscreenCanvas !== "undefined") {
    disableWebGL2(OffscreenCanvas);
  }

  function disableWebGL2(ContextClass) {
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
