/*
 * Copyright 2012, Gregg Tavares.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Gregg Tavares. nor the names of his
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/* global define */

(function() {
  'use strict';  // eslint-disable-line

  function isBuiltIn(name) {
    return name.startsWith("gl_") || name.startsWith("webgl_");
  }

  function isWebGL2(gl) {
    // a proxy for if this is webgl
    return !!gl.texImage3D;
  }

  // ---------------------------------
  const FLOAT                         = 0x1406;
  const FLOAT_VEC2                    = 0x8B50;
  const FLOAT_VEC3                    = 0x8B51;
  const FLOAT_VEC4                    = 0x8B52;
  const INT                           = 0x1404;
  const INT_VEC2                      = 0x8B53;
  const INT_VEC3                      = 0x8B54;
  const INT_VEC4                      = 0x8B55;
  const BOOL                          = 0x8B56;
  const BOOL_VEC2                     = 0x8B57;
  const BOOL_VEC3                     = 0x8B58;
  const BOOL_VEC4                     = 0x8B59;
  const FLOAT_MAT2                    = 0x8B5A;
  const FLOAT_MAT3                    = 0x8B5B;
  const FLOAT_MAT4                    = 0x8B5C;
  const UNSIGNED_INT                  = 0x1405;
  const UNSIGNED_INT_VEC2             = 0x8DC6;
  const UNSIGNED_INT_VEC3             = 0x8DC7;
  const UNSIGNED_INT_VEC4             = 0x8DC8;

  const attrTypeMap = {};
  attrTypeMap[FLOAT]             = { size:  4, };
  attrTypeMap[FLOAT_VEC2]        = { size:  8, };
  attrTypeMap[FLOAT_VEC3]        = { size: 12, };
  attrTypeMap[FLOAT_VEC4]        = { size: 16, };
  attrTypeMap[INT]               = { size:  4, };
  attrTypeMap[INT_VEC2]          = { size:  8, };
  attrTypeMap[INT_VEC3]          = { size: 12, };
  attrTypeMap[INT_VEC4]          = { size: 16, };
  attrTypeMap[UNSIGNED_INT]      = { size:  4, };
  attrTypeMap[UNSIGNED_INT_VEC2] = { size:  8, };
  attrTypeMap[UNSIGNED_INT_VEC3] = { size: 12, };
  attrTypeMap[UNSIGNED_INT_VEC4] = { size: 16, };
  attrTypeMap[BOOL]              = { size:  4, };
  attrTypeMap[BOOL_VEC2]         = { size:  8, };
  attrTypeMap[BOOL_VEC3]         = { size: 12, };
  attrTypeMap[BOOL_VEC4]         = { size: 16, };
  attrTypeMap[FLOAT_MAT2]        = { size:  4, count: 2, };
  attrTypeMap[FLOAT_MAT3]        = { size:  9, count: 3, };
  attrTypeMap[FLOAT_MAT4]        = { size: 16, count: 4, };

  const BYTE                         = 0x1400;
  const UNSIGNED_BYTE                = 0x1401;
  const SHORT                        = 0x1402;
  const UNSIGNED_SHORT               = 0x1403;

  function getBytesPerValueForGLType(type) {
    if (type === BYTE)           return 1;  // eslint-disable-line
    if (type === UNSIGNED_BYTE)  return 1;  // eslint-disable-line
    if (type === SHORT)          return 2;  // eslint-disable-line
    if (type === UNSIGNED_SHORT) return 2;  // eslint-disable-line
    if (type === INT)            return 4;  // eslint-disable-line
    if (type === UNSIGNED_INT)   return 4;  // eslint-disable-line
    if (type === FLOAT)          return 4;  // eslint-disable-line
    return 0;
  }

  const funcsToArgs = {
    drawArrays(primType, startOffset, vertCount) { return {startOffset, vertCount, instances: 1}; },
    drawElements(primType, vertCount, indexType, startOffset) { return {startOffset, vertCount, instances: 1, indexType}; },
    drawArraysInstanced(primType, startOffset, vertCount, instances) { return {startOffset, vertCount, instances}; },
    drawElementsInstanced(primType, vertCount, indexType, startOffset, instances) { return {startOffset, vertCount, instances, indexType}; },
    drawArraysInstancedANGLE(primType, startOffset, vertCount, instances) { return {startOffset, vertCount, instances}; },
    drawElementsInstancedANGLE(primType, vertCount, indexType, startOffset, instances) { return {startOffset, vertCount, instances, indexType}; },
    drawRangeElements(primType, start, end, vertCount, indexType, startOffset) { return {startOffset, vertCount, instances: 1, indexType}; },
  };

  const glTypeToTypedArray = {}
  glTypeToTypedArray[UNSIGNED_BYTE] = Uint8Array;
  glTypeToTypedArray[UNSIGNED_SHORT] = Uint16Array;
  glTypeToTypedArray[UNSIGNED_INT] = Uint32Array;

  const bufferToIndices = new Map();

  function computeLastUseIndexForDrawArrays(startOffset, vertCount, instances, errors) {
    return startOffset + vertCount - 1;
  }

  function getLastUsedIndexForDrawElements(gl, funcName, startOffset, vertCount, instances, indexType, errors) {
    const elementBuffer = gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING);
    if (!elementBuffer) {
      errors.push('No ELEMENT_ARRAY_BUFFER bound');
      return;
    }
    const bytesPerIndex = getBytesPerValueForGLType(indexType);
    const bufferSize = gl.getBufferParameter(gl.ELEMENT_ARRAY_BUFFER, gl.BUFFER_SIZE);
    const sizeNeeded = startOffset + vertCount * bytesPerIndex;
    if (sizeNeeded > bufferSize) {
      errors.push(`offset: ${startOffset} and count: ${vertCount} with index type: ${glEnumToString(gl, indexType)} passed to ${funcName} are out of range for current ELEMENT_ARRAY_BUFFER.
Those parameters require ${sizeNeeded} bytes but the current ELEMENT_ARRAY_BUFFER only has ${bufferSize} bytes`);
      return;
    }
    const buffer = bufferToIndices.get(elementBuffer);
    const Type = glTypeToTypedArray[indexType];
    const view = new Type(buffer, startOffset);
    let maxIndex = view[0];
    for (let i = 1; i < vertCount; ++i) {
      maxIndex = Math.max(maxIndex, view[i]);
    }
    return maxIndex;
  }

  const VERTEX_ATTRIB_ARRAY_DIVISOR = 0x88FE;

  function checkAttributes(gl, funcName, args) {
    const {vertCount, startOffset, indexType, instances} = funcsToArgs[funcName](...args);
    if (vertCount <=0 || instances <= 0) {
      return [];
    }
    const program = gl.getParameter(gl.CURRENT_PROGRAM);
    const errors = [];
    const nonInstancedLastIndex = indexType
        ? getLastUsedIndexForDrawElements(gl, funcName, startOffset, vertCount, instances, indexType, errors) 
        : computeLastUseIndexForDrawArrays(startOffset, vertCount, instances, errors);
    if (errors.length) {
      return errors;
    }

    const hasDivisor = isWebGL2(gl) || gl.getExtension('ANGLE_instanced_arrays');

    // get the attributes used by the current program
    const numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    const oldArrayBuffer = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
    for (let ii = 0; ii < numAttributes; ++ii) {
      const {name, type} = gl.getActiveAttrib(program, ii);
      if (isBuiltIn(name)) {
        continue;
      }
      const index = gl.getAttribLocation(program, name);
      const {size, count} = {count: 1, ...attrTypeMap[type]};
      for (let jj = 0; jj < count; ++jj) {
        const ndx = index + jj;
        const enabled = gl.getVertexAttrib(ndx, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
        if (!enabled) {
          continue;
        }
        const buffer = gl.getVertexAttrib(ndx, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING);
        if (!buffer) {
          errors.push(`no buffer bound to attribute (${name}) location: ${i}`);
          continue;
        }
        const numComponents = gl.getVertexAttrib(ndx, gl.VERTEX_ATTRIB_ARRAY_SIZE);
        const type = gl.getVertexAttrib(ndx, gl.VERTEX_ATTRIB_ARRAY_TYPE);
        const bytesPerElement = getBytesPerValueForGLType(type) * numComponents;
        const offset = gl.getVertexAttribOffset(ndx, gl.VERTEX_ATTRIB_ARRAY_POINTER);
        const specifiedStride = gl.getVertexAttrib(ndx, gl.VERTEX_ATTRIB_ARRAY_STRIDE);
        const stride = specifiedStride ? specifiedStride : bytesPerElement;
        const divisor = hasDivisor
            ? gl.getVertexAttrib(ndx, VERTEX_ATTRIB_ARRAY_DIVISOR)
            : 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        const bufferSize = gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE);
        const effectiveLastIndex = divisor > 0
            ? ((instances + divisor - 1) / divisor | 0) - 1
            : nonInstancedLastIndex;
        const sizeNeeded = offset + effectiveLastIndex * stride + bytesPerElement;
        if (sizeNeeded > bufferSize) {
          errors.push(`buffer assigned to attribute ${ndx} used as '${name}' in current program is too small for draw parameters.
index of highest vertex accessed: ${effectiveLastIndex}
attribute size: ${numComponents}, type: ${glEnumToString(gl, type)}, stride: ${specifiedStride}, offset: ${offset}, divisor: ${divisor}
needs ${sizeNeeded} bytes for draw but buffer bound to attribute is only ${bufferSize} bytes`);
        }
      }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, oldArrayBuffer);
    return errors;
  }

  // ---------------------------------

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
      return [];
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
        for (let t = 0; t < size; ++t) {
          errors.push(...checkTextureUsage(gl, textureAttachments, program, `${baseName}[${t}]`, type));
        }
      } else {
        errors.push(...checkTextureUsage(gl, textureAttachments, program, name, type));
      }
    }
    gl.activeTexture(oldActiveTexture);

    return errors;
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

  //------------ [ from https://github.com/KhronosGroup/WebGLDeveloperTools ]

  /*
  ** Copyright (c) 2012 The Khronos Group Inc.
  **
  ** Permission is hereby granted, free of charge, to any person obtaining a
  ** copy of this software and/or associated documentation files (the
  ** "Materials"), to deal in the Materials without restriction, including
  ** without limitation the rights to use, copy, modify, merge, publish,
  ** distribute, sublicense, and/or sell copies of the Materials, and to
  ** permit persons to whom the Materials are furnished to do so, subject to
  ** the following conditions:
  **
  ** The above copyright notice and this permission notice shall be included
  ** in all copies or substantial portions of the Materials.
  **
  ** THE MATERIALS ARE PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  ** EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  ** MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
  ** IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
  ** CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
  ** TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
  ** MATERIALS OR THE USE OR OTHER DEALINGS IN THE MATERIALS.
  */

  /**
   * Types of contexts we have added to map
   */
  const mappedContextTypes = {};

  /**
   * Map of numbers to names.
   * @type {Object}
   */
  const glEnums = {};

  /**
   * Map of names to numbers.
   * @type {Object}
   */
  const enumStringToValue = {};

  /**
   * Initializes this module. Safe to call more than once.
   * @param {!WebGLRenderingContext} ctx A WebGL context. If
   *    you have more than one context it doesn't matter which one
   *    you pass in, it is only used to pull out constants.
   */
  function addEnumsForContext(ctx, type) {
    if (!mappedContextTypes[type]) {
      mappedContextTypes[type] = true;
      for (const propertyName in ctx) {
        if (typeof ctx[propertyName] === 'number') {
          glEnums[ctx[propertyName]] = propertyName;
          enumStringToValue[propertyName] = ctx[propertyName];
        }
      }
    }
  }

  function enumArrayToString(gl, enums) {
    const enumStrings = [];
    if (enums.length) {
      for (let i = 0; i < enums.length; ++i) {
        enums.push(glEnumToString(gl, enums[i]));  // eslint-disable-line
      }
      return '[' + enumStrings.join(', ') + ']';
    }
    return enumStrings.toString();
  }

  function makeBitFieldToStringFunc(enums) {
    return function(gl, value) {
      let orResult = 0;
      const orEnums = [];
      for (let i = 0; i < enums.length; ++i) {
        const enumValue = enumStringToValue[enums[i]];
        if ((value & enumValue) !== 0) {
          orResult |= enumValue;
          orEnums.push(glEnumToString(gl, enumValue));  // eslint-disable-line
        }
      }
      if (orResult === value) {
        return orEnums.join(' | ');
      } else {
        return glEnumToString(gl, value);  // eslint-disable-line
      }
    };
  }

  const destBufferBitFieldToString = makeBitFieldToStringFunc([
    'COLOR_BUFFER_BIT',
    'DEPTH_BUFFER_BIT',
    'STENCIL_BUFFER_BIT',
  ]);

  /**
   * Which arguments are enums based on the number of arguments to the function.
   * So
   *    'texImage2D': {
   *       9: { 0:true, 2:true, 6:true, 7:true },
   *       6: { 0:true, 2:true, 3:true, 4:true },
   *    },
   *
   * means if there are 9 arguments then 6 and 7 are enums, if there are 6
   * arguments 3 and 4 are enums. Maybe a function as well in which case
   * value is passed to function and returns a string
   *
   * @type {!Object.<number, (!Object.<number, string>|function)}
   */
  const glValidEnumContexts = {
    // Generic setters and getters

    'enable': {1: { 0:true }},
    'disable': {1: { 0:true }},
    'getParameter': {1: { 0:true }},

    // Rendering

    'drawArrays': {3:{ 0:true }},
    'drawElements': {4:{ 0:true, 2:true }},
    'drawArraysInstanced': {4: { 0:true }},
    'drawElementsInstanced': {5: {0:true, 2: true }},
    'drawRangeElements': {6: {0:true, 4: true }},

    // Shaders

    'createShader': {1: { 0:true }},
    'getShaderParameter': {2: { 1:true }},
    'getProgramParameter': {2: { 1:true }},
    'getShaderPrecisionFormat': {2: { 0: true, 1:true }},

    // Vertex attributes

    'getVertexAttrib': {2: { 1:true }},
    'vertexAttribPointer': {6: { 2:true }},
    'vertexAttribIPointer': {5: { 2:true }},  // WebGL2

    // Textures

    'bindTexture': {2: { 0:true }},
    'activeTexture': {1: { 0:true }},
    'getTexParameter': {2: { 0:true, 1:true }},
    'texParameterf': {3: { 0:true, 1:true }},
    'texParameteri': {3: { 0:true, 1:true, 2:true }},
    'texImage2D': {
      9: { 0:true, 2:true, 6:true, 7:true },
      6: { 0:true, 2:true, 3:true, 4:true },
      10: { 0:true, 2:true, 6:true, 7:true },  // WebGL2
    },
    'texImage3D': {
      10: { 0:true, 2:true, 7:true, 8:true },  // WebGL2
      11: { 0:true, 2:true, 7:true, 8:true },  // WebGL2
    },
    'texSubImage2D': {
      9: { 0:true, 6:true, 7:true },
      7: { 0:true, 4:true, 5:true },
      10: { 0:true, 6:true, 7:true },  // WebGL2
    },
    'texSubImage3D': {
      11: { 0:true, 8:true, 9:true },  // WebGL2
      12: { 0:true, 8:true, 9:true },  // WebGL2
    },
    'texStorage2D': { 5: { 0:true, 2:true }},  // WebGL2
    'texStorage3D': { 6: { 0:true, 2:true }},  // WebGL2
    'copyTexImage2D': {8: { 0:true, 2:true }},
    'copyTexSubImage2D': {8: { 0:true }},
    'copyTexSubImage3D': {9: { 0:true }},  // WebGL2
    'generateMipmap': {1: { 0:true }},
    'compressedTexImage2D': {
      7: { 0: true, 2:true },
      8: { 0: true, 2:true },  // WebGL2
    },
    'compressedTexSubImage2D': {
      8: { 0: true, 6:true },
      9: { 0: true, 6:true },  // WebGL2
    },
    'compressedTexImage3D': {
      8: { 0: true, 2: true, },  // WebGL2
      9: { 0: true, 2: true, },  // WebGL2
    },
    'compressedTexSubImage3D': {
      9: { 0: true, 8: true, },  // WebGL2
      10: { 0: true, 8: true, },  // WebGL2
    },

    // Buffer objects

    'bindBuffer': {2: { 0:true }},
    'bufferData': {
      3: { 0:true, 2:true },
      4: { 0:true, 2:true },  // WebGL2
      5: { 0:true, 2:true },  // WebGL2
    },
    'bufferSubData': {
      3: { 0:true },
      4: { 0:true },  // WebGL2
      5: { 0:true },  // WebGL2
    },
    'copyBufferSubData': {
      5: { 0:true },  // WeBGL2
    },
    'getBufferParameter': {2: { 0:true, 1:true }},
    'getBufferSubData': {
      3: { 0: true, },  // WebGL2
      4: { 0: true, },  // WebGL2
      5: { 0: true, },  // WebGL2
    },

    // Renderbuffers and framebuffers

    'pixelStorei': {2: { 0:true, 1:true }},
    'readPixels': {
      7: { 4:true, 5:true },
      8: { 4:true, 5:true },  // WebGL2
    },
    'bindRenderbuffer': {2: { 0:true }},
    'bindFramebuffer': {2: { 0:true }},
    'blitFramebuffer': {10: { 8: destBufferBitFieldToString, 9:true }},  // WebGL2
    'checkFramebufferStatus': {1: { 0:true }},
    'framebufferRenderbuffer': {4: { 0:true, 1:true, 2:true }},
    'framebufferTexture2D': {5: { 0:true, 1:true, 2:true }},
    'framebufferTextureLayer': {5: {0:true, 1:true }},  // WebGL2
    'getFramebufferAttachmentParameter': {3: { 0:true, 1:true, 2:true }},
    'getInternalformatParameter': {3: {0:true, 1:true, 2:true }},  // WebGL2
    'getRenderbufferParameter': {2: { 0:true, 1:true }},
    'invalidateFramebuffer': {2: { 0:true, 1: enumArrayToString, }},  // WebGL2
    'invalidateSubFramebuffer': {6: {0: true, 1: enumArrayToString, }},  // WebGL2
    'readBuffer': {1: {0: true}},  // WebGL2
    'renderbufferStorage': {4: { 0:true, 1:true }},
    'renderbufferStorageMultisample': {5: { 0: true, 2: true }},  // WebGL2

    // Frame buffer operations (clear, blend, depth test, stencil)

    'clear': {1: { 0: destBufferBitFieldToString }},
    'depthFunc': {1: { 0:true }},
    'blendFunc': {2: { 0:true, 1:true }},
    'blendFuncSeparate': {4: { 0:true, 1:true, 2:true, 3:true }},
    'blendEquation': {1: { 0:true }},
    'blendEquationSeparate': {2: { 0:true, 1:true }},
    'stencilFunc': {3: { 0:true }},
    'stencilFuncSeparate': {4: { 0:true, 1:true }},
    'stencilMaskSeparate': {2: { 0:true }},
    'stencilOp': {3: { 0:true, 1:true, 2:true }},
    'stencilOpSeparate': {4: { 0:true, 1:true, 2:true, 3:true }},

    // Culling

    'cullFace': {1: { 0:true }},
    'frontFace': {1: { 0:true }},

    // ANGLE_instanced_arrays extension

    'drawArraysInstancedANGLE': {4: { 0:true }},
    'drawElementsInstancedANGLE': {5: { 0:true, 2:true }},

    // EXT_blend_minmax extension

    'blendEquationEXT': {1: { 0:true }},

    // Multiple Render Targets

    'drawBuffersWebGL': {1: {0: enumArrayToString, }},  // WEBGL_draw_bufers
    'drawBuffers': {1: {0: enumArrayToString, }},  // WebGL2
    'clearBufferfv': {
      4: {0: true },  // WebGL2
      5: {0: true },  // WebGL2
    },
    'clearBufferiv': {
      4: {0: true },  // WebGL2
      5: {0: true },  // WebGL2
    },
    'clearBufferuiv': {
      4: {0: true },  // WebGL2
      5: {0: true },  // WebGL2
    },
    'clearBufferfi': { 4: {0: true}},  // WebGL2

    // QueryObjects

    'beginQuery': { 2: { 0: true }},  // WebGL2
    'endQuery': { 1: { 0: true }},  // WebGL2
    'getQuery': { 2: { 0: true, 1: true }},  // WebGL2
    'getQueryParameter': { 2: { 1: true }},  // WebGL2

    //  Sampler Objects

    'samplerParameteri': { 3: { 1: true }},  // WebGL2
    'samplerParameterf': { 3: { 1: true }},  // WebGL2
    'getSamplerParameter': { 2: { 1: true }},  // WebGL2

    //  Sync objects

    'clientWaitSync': { 3: { 1: makeBitFieldToStringFunc(['SYNC_FLUSH_COMMANDS_BIT']) }},  // WebGL2
    'fenceSync': { 2: { 0: true }},  // WebGL2
    'getSyncParameter': { 2: { 1: true }},  // WebGL2

    //  Transform Feedback

    'bindTransformFeedback': { 2: { 0: true }},  // WebGL2
    'beginTransformFeedback': { 1: { 0: true }},  // WebGL2

    // Uniform Buffer Objects and Transform Feedback Buffers
    'bindBufferBase': { 3: { 0: true }},  // WebGL2
    'bindBufferRange': { 5: { 0: true }},  // WebGL2
    'getIndexedParameter': { 2: { 0: true }},  // WebGL2
    'getActiveUniforms': { 3: { 2: true }},  // WebGL2
    'getActiveUniformBlockParameter': { 3: { 2: true }},  // WebGL2
  };

  /**
   * Gets an string version of an WebGL enum.
   *
   * Example:
   *   var str = WebGLDebugUtil.glEnumToString(ctx.getError());
   *
   * @param {number} value Value to return an enum for
   * @return {string} The string version of the enum.
   */
  function glEnumToString(gl, value) {
    const strs = [];
    for (let key in gl) {
      if (gl[key] === value) {
        strs.push(key);
      }
    }
    return strs.length
        ? strs.map(v => `${v}`).join(' | ')
        : `/*UNKNOWN WebGL ENUM*/ ${typeof value === 'number' ? `0xvalue.toString(16)` : value}`;
  }

  /**
   * Returns the string version of a WebGL argument.
   * Attempts to convert enum arguments to strings.
   * @param {string} functionName the name of the WebGL function.
   * @param {number} numArgs the number of arguments passed to the function.
   * @param {number} argumentIndx the index of the argument.
   * @param {*} value The value of the argument.
   * @return {string} The value as a string.
   */
  function glFunctionArgToString(gl, functionName, numArgs, argumentIndex, value) {
    const funcInfos = glValidEnumContexts[functionName];
    if (funcInfos !== undefined) {
      const funcInfo = funcInfos[numArgs];
      if (funcInfo !== undefined) {
        const argType = funcInfo[argumentIndex];
        if (argType) {
          if (typeof argType === 'function') {
            return argType(gl, value);
          } else {
            return glEnumToString(gl, value);
          }
        }
      }
    }
    if (value === null) {
      return 'null';
    } else if (value === undefined) {
      return 'undefined';
    } else {
      return value.toString();
    }
  }

  /**
   * Converts the arguments of a WebGL function to a string.
   * Attempts to convert enum arguments to strings.
   *
   * @param {string} functionName the name of the WebGL function.
   * @param {number} args The arguments.
   * @return {string} The arguments as a string.
   */
  function glFunctionArgsToString(gl, functionName, args) {
    // apparently we can't do args.join(",");
    const argStrs = [];
    const numArgs = args.length;
    for (let ii = 0; ii < numArgs; ++ii) {
      argStrs.push(glFunctionArgToString(gl, functionName, numArgs, ii, args[ii]));
    }
    return argStrs.join(', ');
  }

  function makePropertyWrapper(wrapper, original, propertyName) {
    wrapper.__defineGetter__(propertyName, function() {  // eslint-disable-line
      return original[propertyName];
    });
    // TODO(gmane): this needs to handle properties that take more than
    // one value?
    wrapper.__defineSetter__(propertyName, function(value) {  // eslint-disable-line
      original[propertyName] = value;
    });
  }

  /**
   * Given a WebGL context returns a wrapped context that calls
   * gl.getError after every command and calls a function if the
   * result is not gl.NO_ERROR.
   *
   * @param {!WebGLRenderingContext} ctx The webgl context to
   *        wrap.
   * @param {!function(err, funcName, args): void} opt_onErrorFunc
   *        The function to call when gl.getError returns an
   *        error. If not specified the default function calls
   *        console.log with a message.
   * @param {!function(funcName, args): void} opt_onFunc The
   *        function to call when each webgl function is called.
   *        You can use this to log all calls for example.
   * @param {!WebGLRenderingContext} opt_err_ctx The webgl context
   *        to call getError on if different than ctx.
   */
  function makeDebugContext(ctx, options) {
    options = options || {};
    const errCtx = options.errCtx || ctx;
    const onFunc = options.funcFunc;
    const sharedState = options.sharedState || {
      numDrawCallsRemaining: options.maxDrawCalls || -1,
      wrappers: {},
    };
    options.sharedState = sharedState;
    const errorFunc = options.errorFunc;

    // Holds booleans for each GL error so after we get the error ourselves
    // we can still return it to the client app.
    const glErrorShadow = { };
    const wrapper = {};

    function removeChecks() {
      Object.keys(sharedState.wrappers).forEach(function(name) {
        const pair = sharedState.wrappers[name];
        const wrapper = pair.wrapper;
        const orig = pair.orig;
        for (const propertyName in wrapper) {
          if (typeof wrapper[propertyName] === 'function') {
            wrapper[propertyName] = orig[propertyName].bind(orig);
          }
        }
      });
    }

    function checkMaxDrawCallsAndZeroCount(gl, funcName, ...args) {
      const {vertCount, instances} = funcsToArgs[funcName](...args);
      if (vertCount === 0) {
        console.warn(`count for ${funcName} is 0!`);
      }

      if (instances === 0) {
        console.warn(`instanceCount for ${funcName} is 0!`);
      }

      if (sharedState.numDrawCallsRemaining === 0) {
        removeChecks();
      }
      --sharedState.numDrawCallsRemaining;
    }

    function noop() {
    }

    // I know ths is not a full check
    function isNumber(v) {
      return typeof v === 'number';
    }

    const specials = {
      // WebGL1
      //   void bufferData(GLenum target, GLsizeiptr size, GLenum usage);
      //   void bufferData(GLenum target, [AllowShared] BufferSource? srcData, GLenum usage);
      // WebGL2:
      //   void bufferData(GLenum target, [AllowShared] ArrayBufferView srcData, GLenum usage, GLuint srcOffset,
      //                   optional GLuint length = 0);
      bufferData(gl, funcName, target, src, usage, srcOffset = 0, length = 0) {
        if (target !== gl.ELEMENT_ARRAY_BUFFER) {
          return;
        }
        const buffer = gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING);
        if (isNumber(src)) {
          bufferToIndices.set(buffer, new ArrayBuffer(src));
        } else {
          const isDataView = src instanceof DataView;
          const copyLength = length ? length : isDataView
             ? src.byteLength - srcOffset
             : src.length - srcOffset;
          const elemSize = isDataView ? 1 : src.BYTES_PER_ELEMENT;
          const bufSize = copyLength * elemSize;
          bufferToIndices.set(buffer, src.buffer.slice(srcOffset * elemSize, bufSize));
        }
      },
      // WebGL1
      //   void bufferSubData(GLenum target, GLintptr dstByteOffset, [AllowShared] BufferSource srcData);
      // WebGL2
      //   void bufferSubData(GLenum target, GLintptr dstByteOffset, [AllowShared] ArrayBufferView srcData,
      //                      GLuint srcOffset, optional GLuint length = 0);
      bufferSubData(gl, funcName, target, dstByteOffset, src, srcOffset, length = 0) {
        if (target !== ELEMENT_ARRAY_BUFFER) {
          return;
        }
        const buffer = gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING);
        const data = bufferToIndices.get(buffer);
        const view = new Uint8Array(data);
        const isDataView = src instanceof DataView;
        const copyLength = length ? length : isDataView
           ? src.byteLength - srcOffset
           : src.length - srcOffset;
        const elemSize = isDataView ? 1 : src.BYTES_PER_ELEMENT;
        const copySize = copyLength * elemSize;
        const newView = new Uint8Array(src.buffer, srcOffset * elemSize, copySize);
        view.set(newView, dstByteOffset);
      }
    }

    // Makes a function that calls a WebGL function and then calls getError.
    function makeErrorWrapper(ctx, functionName) {
      const check = functionName.startsWith('draw') ? checkMaxDrawCallsAndZeroCount : (specials[functionName] || noop);
      return function(...args) {
        if (onFunc) {
          onFunc(functionName, args);
        }
        const result = ctx[functionName].call(ctx, ...args);
        const err = errCtx.getError();
        if (err !== 0) {
          glErrorShadow[err] = true;
          errorFunc(err, functionName, args);
        }
        check(ctx, functionName, ...args);
        return result;
      };
    }

    function makeGetExtensionWrapper(ctx, wrapped) {
      return function(...args) {
        const extensionName = args[0];
        let ext = sharedState.wrappers[extensionName];
        if (!ext) {
          ext = wrapped.call(ctx, ...args);
          if (ext) {
            const origExt = ext;
            ext = makeDebugContext(ext, Object.assign({}, options, {errCtx: ctx}));
            sharedState.wrappers[extensionName] = { wrapper: ext, orig: origExt };
            addEnumsForContext(origExt, extensionName);
          }
        }
        return ext;
      };
    }

    // Make a an object that has a copy of every property of the WebGL context
    // but wraps all functions.
    for (const propertyName in ctx) {
      if (typeof ctx[propertyName] === 'function') {
        if (propertyName !== 'getExtension') {
          wrapper[propertyName] = makeErrorWrapper(ctx, propertyName);
        } else {
          const wrapped = makeErrorWrapper(ctx, propertyName);
          wrapper[propertyName] = makeGetExtensionWrapper(ctx, wrapped);
        }
      } else {
        makePropertyWrapper(wrapper, ctx, propertyName);
      }
    }

    // Override the getError function with one that returns our saved results.
    if (wrapper.getError) {
      wrapper.getError = function() {
        for (const err of Object.keys(glErrorShadow)) {
          if (glErrorShadow[err]) {
            glErrorShadow[err] = false;
            return err;
          }
        }
        return ctx.NO_ERROR;
      };
    }

    if (wrapper.bindBuffer) {
      sharedState.wrappers['webgl'] = { wrapper: wrapper, orig: ctx };
      addEnumsForContext(ctx, ctx.bindBufferBase ? 'WebGL2' : 'WebGL');
    }

    return wrapper;
  }

  // adapted from http://stackoverflow.com/a/2401861/128511
  function getBrowser() {
    const userAgent = navigator.userAgent;
    let m = userAgent.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    if (/trident/i.test(m[1])) {
      m = /\brv[ :]+(\d+)/g.exec(userAgent) || [];
      return {
        name: 'IE',
        version: m[1],
      };
    }
    if (m[1] === 'Chrome') {
      const temp = userAgent.match(/\b(OPR|Edge)\/(\d+)/);
      if (temp) {
        return {
          name: temp[1].replace('OPR', 'Opera'),
          version: temp[2],
        };
      }
    }
    m = m[2] ? [m[1], m[2]] : [navigator.appName, navigator.appVersion, '-?'];
    const version = userAgent.match(/version\/(\d+)/i);
    if (version) {
      m.splice(1, 1, version[1]);
    }
    return {
      name: m[0],
      version: m[1],
    };
  }

  function reportJSError(url, lineNo, colNo, msg) {
    throw new Error(`${url}:${lineNo}: ${msg}`);
  }

  /**
   * @typedef {Object} StackInfo
   * @property {string} url Url of line
   * @property {number} lineNo line number of error
   * @property {number} colNo column number of error
   * @property {string} [funcName] name of function
   */

  /**
   * @parameter {string} stack A stack string as in `(new Error()).stack`
   * @returns {StackInfo}
   */
  const parseStack = function() {
    const browser = getBrowser();
    let lineNdx;
    let matcher;
    if ((/chrome|opera/i).test(browser.name)) {
      lineNdx = 3;
      matcher = function(line) {
        const m = /at ([^(]+)*\(*(.*?):(\d+):(\d+)/.exec(line);
        if (m) {
          let userFnName = m[1];
          let url = m[2];
          const lineNo = parseInt(m[3]);
          const colNo = parseInt(m[4]);
          if (url === '') {
            url = userFnName;
            userFnName = '';
          }
          return {
            url: url,
            lineNo: lineNo,
            colNo: colNo,
            funcName: userFnName,
          };
        }
        return undefined;
      };
    } else if ((/firefox|safari/i).test(browser.name)) {
      lineNdx = 2;
      matcher = function(line) {
        const m = /@(.*?):(\d+):(\d+)/.exec(line);
        if (m) {
          const url = m[1];
          const lineNo = parseInt(m[2]);
          const colNo = parseInt(m[3]);
          return {
            url: url,
            lineNo: lineNo,
            colNo: colNo,
          };
        }
        return undefined;
      };
    }

    return function stackParser(stack) {
      if (matcher) {
        try {
          const lines = stack.split('\n');
          // window.fooLines = lines;
          // lines.forEach(function(line, ndx) {
          //   origConsole.log("#", ndx, line);
          // });
          return matcher(lines[lineNdx]);
        } catch (e) {
          // do nothing
        }
      }
      return undefined;
    };
  }();

  function reportError(errorMsg) {
    const errorInfo = parseStack((new Error()).stack);
    if (errorInfo) {
      reportJSError(errorInfo.url, errorInfo.lineNo, errorInfo.colNo, errorMsg);
    } else {
      throw new Error(errorMsg)
    }
  }

  HTMLCanvasElement.prototype.getContext = (function(oldFn) {
    return function(...args) {
      let ctx = oldFn.call(this, ...args);
      // Using bindTexture to see if it's WebGL. Could check for instanceof WebGLRenderingContext
      // but that might fail if wrapped by debugging extension
      if (ctx && ctx.bindTexture) {
        ctx = makeDebugContext(ctx, {
          maxDrawCalls: 1000,
          errorFunc: function(err, funcName, args) {
            const numArgs = args.length;
            const enumedArgs = [].map.call(args, function(arg, ndx) {
              let str = glFunctionArgToString(ctx, funcName, numArgs, ndx, arg);
              // shorten because of long arrays
              if (str.length > 200) {
                str = str.substring(0, 200) + '...';
              }
              return str;
            });
            const msgs = [];
            if (funcName.startsWith('draw')) {
              const program = ctx.getParameter(ctx.CURRENT_PROGRAM);
              if (!program) {
                msgs.push('no shader program in use!');
              } else {
                msgs.push(...checkFramebufferFeedback(ctx));
                msgs.push(...checkAttributes(ctx, funcName, args));
              }
            }
            const errorMsg = `WebGL error ${glEnumToString(ctx, err)} in ${funcName}(${enumedArgs.join(', ')})${msgs.length ? `\n${msgs.join('\n')}` : ''}`;
            reportError(errorMsg);
          },
        });
      }
      return ctx;
    };
  }(HTMLCanvasElement.prototype.getContext));

})();

