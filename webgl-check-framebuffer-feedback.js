/**
 * Note: This code is could be faster if we cached
 * a ton of stuff but it would make it far more complicated
 * and you should only be using this occasionally to help
 * find your error.
 */
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

  function isBuiltIn(name) {
    return name.startsWith("gl_") || name.startsWith("webgl_");
  }

  function isWebGL2(gl) {
    // a proxy for if this is webgl
    return !!gl.texImage3D;
  }

  const extensionToContext = new Map();
  function rememberExtensionContext(gl, ext) {
    extensionToContext.set(ext, gl);
  }

  const SAMPLER_2D                    = 0x8B5E;
  const SAMPLER_CUBE                  = 0x8B60;
  const SAMPLER_3D                    = 0x8B5F;
  const SAMPLER_2D_SHADOW             = 0x8B62;
  const SAMPLER_2D_ARRAY              = 0x8DC1;
  const SAMPLER_2D_ARRAY_SHADOW       = 0x8DC4;
  const SAMPLER_CUBE_SHADOW           = 0x8DC5;
  const samplers = new Set([
    SAMPLER_2D,
    SAMPLER_CUBE,
    SAMPLER_3D,
    SAMPLER_2D_SHADOW,
    SAMPLER_2D_ARRAY,
    SAMPLER_2D_ARRAY_SHADOW,
    SAMPLER_CUBE_SHADOW,
  ]);

  function isSampler(type) {
    return samplers.has(type);
  }

  const TEXTURE_BINDING_2D            = 0x8069;
  const TEXTURE_BINDING_CUBE_MAP      = 0x8514;
  const TEXTURE_BINDING_3D            = 0x806A;
  const TEXTURE_BINDING_2D_ARRAY      = 0x8C1D;

  const samplerTypeToBinding = new Map();
  samplerTypeToBinding.set(SAMPLER_2D, TEXTURE_BINDING_2D);
  samplerTypeToBinding.set(SAMPLER_2D_SHADOW, TEXTURE_BINDING_2D);
  samplerTypeToBinding.set(SAMPLER_3D, TEXTURE_BINDING_3D);
  samplerTypeToBinding.set(SAMPLER_2D_ARRAY, TEXTURE_BINDING_2D_ARRAY);
  samplerTypeToBinding.set(SAMPLER_2D_ARRAY_SHADOW, TEXTURE_BINDING_2D_ARRAY);
  samplerTypeToBinding.set(SAMPLER_CUBE, TEXTURE_BINDING_CUBE_MAP);
  samplerTypeToBinding.set(SAMPLER_CUBE_SHADOW, TEXTURE_BINDING_CUBE_MAP);

  function getTextureForUnit(gl, unit, type) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    const binding = samplerTypeToBinding.get(type);
    return gl.getParameter(binding);
  }

  /**
   * slow non-cached version
   * @param {WebGLRenderingContext} gl
   * @param {number} attachment
   * @param {Map<WebGLTexture, [number]>} textureAttachments
   */
  function addTextureAttachment(gl, attachment, textureAttachments) {
    const type = gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER, attachment, gl.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE);
    if (type === gl.NONE) {
      return;
    }
    const obj = gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER, attachment, gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME);
    if (obj instanceof WebGLTexture) {
      if (!textureAttachments.has(obj)) {
        textureAttachments.set(obj, []);
      }
      textureAttachments.get(obj).push(attachment);
    }
  }

  const MAX_COLOR_ATTACHMENTS = 0x8CDF;

  function getMaxColorAttachments(gl) {
    if (!isWebGL2(gl)) {
      const ext = gl.getExtension('WEBGL_draw_buffers');
      if (!ext) {
        return 1;
      }
    }
    return gl.getParameter(MAX_COLOR_ATTACHMENTS);
  }

  /**
   * slow non-cached version
   * @param {WebGLRenderingContext} gl
   */
  function checkFramebufferFeedback(gl) {
    const framebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    if (!framebuffer) {
      // drawing to canvas
      return;
    }

    // get framebuffer texture attachments
    const maxColorAttachments = getMaxColorAttachments(gl)
    const textureAttachments = new Map();
    for (let i = 0; i < maxColorAttachments; ++i) {
      addTextureAttachment(gl, gl.COLOR_ATTACHMENT0 + i, textureAttachments);
    }
    addTextureAttachment(gl, gl.DEPTH_ATTACHMENT, textureAttachments);
    addTextureAttachment(gl, gl.STENCIL_ATTACHMENT, textureAttachments);

    if (!isWebGL2(gl)) {
      addTextureAttachment(gl, gl.DEPTH_STENCIL_ATTACHMENT, textureAttachments);
    }

    const oldActiveTexture = gl.getParameter(gl.ACTIVE_TEXTURE);
    const program = gl.getParameter(gl.CURRENT_PROGRAM);
    // get the texture units used by the current program
    const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    const errors = [];
    for (let ii = 0; ii < numUniforms; ++ii) {
      const {name, type, size} = gl.getActiveUniform(program, ii);
      if (isBuiltIn(name) || !isSampler(type)) {
        continue;
      }

      if (size > 1) {
        let baseName = (name.substr(-3) === "[0]")
            ? name.substr(0, name.length - 3)
            : name;
        for (let t = 0; t < uniformInfo.size; ++t) {
          errors.push(...checkTextureUsage(gl, textureAttachments, program, `${baseName}[${t}]`, type));
        }
      } else {
        errors.push(...checkTextureUsage(gl, textureAttachments, program, name, type));
      }
    }
    gl.activeTexture(oldActiveTexture);

    if (errors.length) {
      throw new Error(`WebGL feedback loop: ${errors.join('\n')}`);
    }
  }

  function checkFramebufferFeedbackExt(ext) {
    checkFramebufferFeedback(extensionToContext.get(ext));
  }

  function checkTextureUsage(gl, textureAttachments, program, uniformName, uniformType) {
    const location = gl.getUniformLocation(program, uniformName);
    const textureUnit = gl.getUniform(program, location);
    const texture = getTextureForUnit(gl, textureUnit, uniformType);
    const attachments = textureAttachments.get(texture);
    return attachments
       ? [`texture on uniform: ${uniformName} bound to texture unit ${textureUnit} is also attached to current framebuffer on attachment: ${attachments.map(a => glEnumToString(gl, a)).join(', ')}`]
       : [];
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
  wrapFnP(WebGLRenderingContext, 'drawArrays', checkFramebufferFeedback);
  wrapFnP(WebGLRenderingContext, 'drawElements', checkFramebufferFeedback);

  if (typeof WebGL2RenderingContext !== 'undefined') {
    wrapFnP(WebGL2RenderingContext, 'getExtension', rememberExtensionContext);
    wrapFnP(WebGL2RenderingContext, 'drawArrays', checkFramebufferFeedback);
    wrapFnP(WebGL2RenderingContext, 'drawElements', checkFramebufferFeedback);
    wrapFnP(WebGL2RenderingContext, 'drawArraysInstanced', checkFramebufferFeedback);
    wrapFnP(WebGL2RenderingContext, 'drawElementsInstanced', checkFramebufferFeedback);
    wrapFnP(WebGL2RenderingContext, 'drawRangeElements', checkFramebufferFeedback);
  }

  const ext = document.createElement("canvas").getContext("webgl").getExtension('ANGLE_instanced_arrays');
  if (ext) {
    wrapFn(ext.__proto__, 'drawArraysInstancedANGLE', checkFramebufferFeedbackExt);
    wrapFn(ext.__proto__, 'drawElementsInstancedANGLE', checkFramebufferFeedbackExt);
  }
}())
