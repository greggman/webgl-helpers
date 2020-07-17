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
   * Info about functions based on the number of arguments to the function.
   * 
   * enums specifies which arguments are enums
   * 
   *    'texImage2D': {
   *       9: { enums: [0, 2, 6, 7 ] },
   *       6: { enums: [0, 2, 3, 4 ] },
   *    },
   *
   * means if there are 9 arguments then 6 and 7 are enums, if there are 6
   * arguments 3 and 4 are enums. You can provide a function instead in
   * which case you should use object format. For example
   * 
   *     `clear`: {
   *       1: { enums: { 0: convertClearBitsToString }},
   *     },
   *
   * numbers specifies which arguments are numbers, if an argument is negative that
   * argument might not be a number so we can check only check for NaN 
   * arrays specifies which arguments are arrays
   * 
   * @type {!Object.<number, (!Object.<number, string>|function)}
   */
  const glFunctionInfos = {
    // Generic setters and getters

    'enable': {1: { enums: [0] }},
    'disable': {1: { enums: [0] }},
    'getParameter': {1: { enums: [0] }},

    // Rendering

    'drawArrays': {3:{ enums: [0], numbers: [1, 2] }},
    'drawElements': {4:{ enums: [0, 2], numbers: [1, 3] }},
    'drawArraysInstanced': {4: { enums: [0], numbers: [1, 2, 3] }},
    'drawElementsInstanced': {5: { enums: [0, 2], numbers: [1, 3, 4] }},
    'drawRangeElements': {6: { enums: [0, 4], numbers: [1, 2, 3, 5] }},

    // Shaders

    'createShader': {1: { enums: [0] }},
    'getActiveAttrib': {2: { numbers: [1] }},
    'getActiveUniform': {2: { numbers: [1] }},
    'getShaderParameter': {2: { enums: [1] }},
    'getProgramParameter': {2: { enums: [1] }},
    'getShaderPrecisionFormat': {2: { enums: [0, 1] }},
    'bindAttribLocation': {3: {numbers: [1]}},

    // Vertex attributes

    'getVertexAttrib': {2: { enums: [1], numbers: [0] }},
    'vertexAttribPointer': {6: { enums: [2], numbers: [0, 1, 4, 5] }},
    'vertexAttribIPointer': {5: { enums: [2], numbers: [0, 1, 3, 4] }},  // WebGL2
    'vertexAttribDivisor': {2: { numbers: [0, 1] }}, // WebGL2
    'disableVertexAttribArray': {1: {numbers: [0] }},
    'enableVertexAttribArray': {1: {numbers: [0] }},

    // Textures

    'bindTexture': {2: { enums: [0] }},
    'activeTexture': {1: { enums: [0, 1] }},
    'getTexParameter': {2: { enums: [0, 1] }},
    'texParameterf': {3: { enums: [0, 1] }},
    'texParameteri': {3: { enums: [0, 1, 2] }},
    'texImage2D': {
      9: { enums: [0, 2, 6, 7], numbers: [1, 3, 4, 5] },
      6: { enums: [0, 2, 3, 4] },
      10: { enums: [0, 2, 6, 7], numbers: [1, 3, 4, 5, 9] }, // WebGL2
    },
    'texImage3D': {
      10: { enums: [0, 2, 7, 8], numbers: [1, 3, 4, 5] },  // WebGL2
      11: { enums: [0, 2, 7, 8], numbers: [1, 3, 4, 5, 10] },  // WebGL2
    },
    'texSubImage2D': {
      9: { enums: [0, 6, 7], numbers: [1, 2, 3, 4, 5] },
      7: { enums: [0, 4, 5], numbers: [1, 2, 3] },
      10: { enums: [0, 6, 7], numbers: [1, 2, 3, 4, 5, 9] },  // WebGL2
    },
    'texSubImage3D': {
      11: { enums: [0, 8, 9], numbers: [1, 2, 3, 4, 5, 6, 7] },  // WebGL2
      12: { enums: [0, 8, 9], numbers: [1, 2, 3, 4, 5, 6, 7, 11] },  // WebGL2
    },
    'texStorage2D': { 5: { enums: [0, 2], numbers: [1, 3, 4] }},  // WebGL2
    'texStorage3D': { 6: { enums: [0, 2], numbers: [1, 3, 4, 6] }},  // WebGL2
    'copyTexImage2D': {8: { enums: [0, 2], numbers: [1, 3, 4, 5, 6, 7] }},
    'copyTexSubImage2D': {8: { enums: [0], numbers: [1, 2, 3, 4, 5, 6, 7]}},
    'copyTexSubImage3D': {9: { enums: [0], numbers: [1, 2, 3, 4, 5, 6, 7, 8] }},  // WebGL2
    'generateMipmap': {1: { enums: [0] }},
    'compressedTexImage2D': {
      7: { enums: [0, 2], numbers: [1, 3, 4, 5] },
      8: { enums: [0, 2], numbers: [1, 3, 4, 5, 7] },  // WebGL2
    },
    'compressedTexSubImage2D': {
      8: { enums: [0, 6], numbers: [1, 2, 3, 4, 5] },
      9: { enums: [0, 6], numbers: [1, 2, 3, 4, 5, 8] },  // WebGL2
    },
    'compressedTexImage3D': {
      8: { enums: [0, 2], numbers: [1, 3, 4, 5, 6] },  // WebGL2
      9: { enums: [0, 2], numbers: [1, 3, 4, 5, 6, -7, 8] },  // WebGL2
      10: { enums: [0, 2], numbers: [1, 3, 4, 5, 6, 8, 9] },  // WebGL2
    },
    'compressedTexSubImage3D': {
      12: { enums: [0, 8], numbers: [1, 2, 3, 4, 5, 6, 7, 8, 10, 11] },  // WebGL2
      11: { enums: [0, 8], numbers: [1, 2, 3, 4, 5, 6, 7, 8, -9, 10] },  // WebGL2
      10: { enums: [0, 8], numbers: [1, 2, 3, 4, 5, 6, 7, 8] },  // WebGL2
    },

    // Buffer objects

    'bindBuffer': {2: { enums: [0] }},
    'bufferData': {
      3: { enums: [0, 2], numbers: [-1] },
      4: { enums: [0, 2], numbers: [-1, 3] },  // WebGL2
      5: { enums: [0, 2], numbers: [-1, 3, 4] },  // WebGL2
    },
    'bufferSubData': {
      3: { enums: [0], numbers: [1] },
      4: { enums: [0], numbers: [1, 3] },  // WebGL2
      5: { enums: [0], numbers: [1, 3, 4] },  // WebGL2
    },
    'copyBufferSubData': {
      5: { enums: [0], numbers: [2, 3, 4] },  // WeBGL2
    },
    'getBufferParameter': {2: { enums: [0, 1] }},
    'getBufferSubData': {
      3: { enums: [0], numbers: [1] },  // WebGL2
      4: { enums: [0], numbers: [1, 3] },  // WebGL2
      5: { enums: [0], numbers: [1, 3, 4] },  // WebGL2
    },

    // Renderbuffers and framebuffers

    'pixelStorei': {2: { enums: [0, 1], numbers: [1] }},
    'readPixels': {
      7: { enums: [4, 5], numbers: [0, 1, 2, 3, -6] },
      8: { enums: [4, 5], numbers: [0, 1, 2, 3, 7] },  // WebGL2
    },
    'bindRenderbuffer': {2: { enums: [0] }},
    'bindFramebuffer': {2: { enums: [0] }},
    'blitFramebuffer': {10: { enums: { 8: destBufferBitFieldToString, 9:true }, numbers: [0, 1, 2, 3, 4, 5, 6, 7]}},  // WebGL2
    'checkFramebufferStatus': {1: { enums: [0] }},
    'framebufferRenderbuffer': {4: { enums: [0, 1, 2], }},
    'framebufferTexture2D': {5: { enums: [0, 1, 2], numbers: [4] }},
    'framebufferTextureLayer': {5: { enums: [0, 1], numbers: [3, 4] }},  // WebGL2
    'getFramebufferAttachmentParameter': {3: { enums: [0, 1, 2] }},
    'getInternalformatParameter': {3: { enums: [0, 1, 2] }},  // WebGL2
    'getRenderbufferParameter': {2: { enums: [0, 1] }},
    'invalidateFramebuffer': {2: { enums: { 0: true, 1: enumArrayToString, } }},  // WebGL2
    'invalidateSubFramebuffer': {6: { enums: { 0: true, 1: enumArrayToString, }, numbers: [2, 3, 4, 5] }},  // WebGL2
    'readBuffer': {1: { enums: [0] }},  // WebGL2
    'renderbufferStorage': {4: { enums: [0, 1], numbers: [2, 3] }},
    'renderbufferStorageMultisample': {5: { enums: [0, 2], numbers: [1, 3, 4] }},  // WebGL2

    // Frame buffer operations (clear, blend, depth test, stencil)

    'lineWidth': {1: {numbers: [0]}},
    'polygonOffset': {2: {numbers: [0, 1]}},
    'scissor': {4: { numbers: [0, 1, 2, 3]}},
    'viewport': {4: { numbers: [0, 1, 2, 3]}},
    'clear': {1: { enums: { 0: destBufferBitFieldToString } }},
    'clearColor': {4: { numbers: [0, 1, 2, 3]}},
    'clearDepth': {1: { numbers: [0]}},
    'clearStencil': {1: { numbers: [0]}},
    'depthFunc': {1: { enums: [0] }},
    'depthRange': {2: { numbers: [0, 1]}},
    'blendColor': {4: { numbers: [0, 1, 2, 3]}},
    'blendFunc': {2: { enums: [0, 1] }},
    'blendFuncSeparate': {4: { enums: [0, 1, 2, 3] }},
    'blendEquation': {1: { enums: [0] }},
    'blendEquationSeparate': {2: { enums: [0, 1] }},
    'stencilFunc': {3: { enums: [0], numbers: [1, 2] }},
    'stencilFuncSeparate': {4: { enums: [0, 1], numberS: [2, 3] }},
    'stencilMask': {1: { numbers: [0] }},
    'stencilMaskSeparate': {2: { enums: [0], numbers: [1] }},
    'stencilOp': {3: { enums: [0, 1, 2] }},
    'stencilOpSeparate': {4: { enums: [0, 1, 2, 3] }},

    // Culling

    'cullFace': {1: { enums: [0] }},
    'frontFace': {1: { enums: [0] }},

    // ANGLE_instanced_arrays extension

    'drawArraysInstancedANGLE': {4: { enums: [0], numbers: [1, 2, 3] }},
    'drawElementsInstancedANGLE': {5: { enums: [0, 2], numbers: [1, 3, 4] }},

    // EXT_blend_minmax extension

    'blendEquationEXT': {1: { enums: [0] }},

    // Multiple Render Targets

    'drawBuffersWebGL': {1: { enums: { 0: enumArrayToString, }, arrays: [0] }},  // WEBGL_draw_buffers
    'drawBuffers': {1: { enums: { 0: enumArrayToString, }, arrays: [0] }},  // WebGL2
    'clearBufferfv': {
      3: { enums: [0], numbers: [1], arrays: [2] },  // WebGL2
      4: { enums: [0], numbers: [1, 2], arrays: [2] },  // WebGL2
    },
    'clearBufferiv': {
      3: { enums: [0], numbers: [1], arrays: [2] },  // WebGL2
      4: { enums: [0], numbers: [1, 2], arrays: [2] },  // WebGL2
    },
    'clearBufferuiv': {
      3: { enums: [0], numbers: [1], arrays: [2] },  // WebGL2
      4: { enums: [0], numbers: [1, 2], arrays: [2] },  // WebGL2
    },
    'clearBufferfi': { 4: { enums: [0], numbers: [1, 2, 3] }},  // WebGL2

    // uniform value setters
    'uniform1f': { 2: {numbers: [1]} },
    'uniform2f': { 3: {numbers: [1, 2]} },
    'uniform3f': { 4: {numbers: [1, 2, 3]} },
    'uniform4f': { 5: {numbers: [1, 2, 3, 4]} },

    'uniform1i': { 2: {numbers: [1]} },
    'uniform2i': { 3: {numbers: [1, 2]} },
    'uniform3i': { 4: {numbers: [1, 2, 3]} },
    'uniform4i': { 5: {numbers: [1, 2, 3, 4]} },

    'uniform1fv': {
      2: {arrays: [1]},
      3: {arrays: [1], numbers: [2]},
      4: {arrays: [1], numbers: [2, 3]},
    },
    'uniform2fv': {
      2: {arrays: [1]},
      3: {arrays: [1], numbers: [2]},
      4: {arrays: [1], numbers: [2, 3]},
    },
    'uniform3fv': {
      2: {arrays: [1]},
      3: {arrays: [1], numbers: [2]},
      4: {arrays: [1], numbers: [2, 3]},
    },
    'uniform4fv': {
      2: {arrays: [1]},
      3: {arrays: [1], numbers: [2]},
      4: {arrays: [1], numbers: [2, 3]},
    },

    'uniform1iv': {
      2: {arrays: [1]},
      3: {arrays: [1], numbers: [2]},
      4: {arrays: [1], numbers: [2, 3]},
    },
    'uniform2iv': {
      2: {arrays: [1]},
      3: {arrays: [1], numbers: [2]},
      4: {arrays: [1], numbers: [2, 3]},
    },
    'uniform3iv': {
      2: {arrays: [1]},
      3: {arrays: [1], numbers: [2]},
      4: {arrays: [1], numbers: [2, 3]},
    },
    'uniform4iv': {
      2: {arrays: [1]},
      3: {arrays: [1], numbers: [2]},
      4: {arrays: [1], numbers: [2, 3]},
    },

    'uniformMatrix2fv': {
      3: {arrays: [2]},
      4: {arrays: [2], numbers: [3]},
      5: {arrays: [2], numbers: [3, 4]},
    },
    'uniformMatrix3fv': {
      3: {arrays: [2]},
      4: {arrays: [2], numbers: [3]},
      5: {arrays: [2], numbers: [3, 4]},
    },
    'uniformMatrix4fv': {
      3: {arrays: [2]},
      4: {arrays: [2], numbers: [3]},
      5: {arrays: [2], numbers: [3, 4]},
    },

    'uniform1ui': { 2: {numbers: [1]} },  // WebGL2
    'uniform2ui': { 3: {numbers: [1, 2]} },  // WebGL2
    'uniform3ui': { 4: {numbers: [1, 2, 3]} },  // WebGL2
    'uniform4ui': { 5: {numbers: [1, 2, 3, 4]} },  // WebGL2

    'uniform1uiv': {  // WebGL2
      2: { arrays: [1], },
      3: { arrays: [1], numbers: [2] },
      4: { arrays: [1], numbers: [2, 3] },
    },
    'uniform2uiv': {  // WebGL2
      2: { arrays: [1], },
      3: { arrays: [1], numbers: [2] },
      4: { arrays: [1], numbers: [2, 3] },
    },
    'uniform3uiv': {  // WebGL2
      2: { arrays: [1], },
      3: { arrays: [1], numbers: [2] },
      4: { arrays: [1], numbers: [2, 3] },
    },
    'uniform4uiv': {  // WebGL2
      2: { arrays: [1], },
      3: { arrays: [1], numbers: [2] },
      4: { arrays: [1], numbers: [2, 3] },
    },
    'uniformMatrix3x2fv': {  // WebGL2
      3: { arrays: [2], },
      4: { arrays: [3], numbers: [3] },
      5: { arrays: [4], numbers: [3, 4] },
    },
    'uniformMatrix4x2fv': {  // WebGL2
      3: { arrays: [2], },
      4: { arrays: [3], numbers: [3] },
      5: { arrays: [4], numbers: [3, 4] },
    },

    'uniformMatrix2x3fv': {  // WebGL2
      3: { arrays: [2], },
      4: { arrays: [3], numbers: [3] },
      5: { arrays: [4], numbers: [3, 4] },
    },
    'uniformMatrix4x3fv': {  // WebGL2
      3: { arrays: [2], },
      4: { arrays: [3], numbers: [3] },
      5: { arrays: [4], numbers: [3, 4] },
    },

    'uniformMatrix2x4fv': {  // WebGL2
      3: { arrays: [2], },
      4: { arrays: [3], numbers: [3] },
      5: { arrays: [4], numbers: [3, 4] },
    },
    'uniformMatrix3x4fv': {  // WebGL2
      3: { arrays: [2], },
      4: { arrays: [3], numbers: [3] },
      5: { arrays: [4], numbers: [3, 4] },
    },

    // attribute value setters
    'vertexAttrib1f': { 2: {numbers: [0, 1]}},
    'vertexAttrib2f': { 3: {numbers: [0, 1, 2]}},
    'vertexAttrib3f': { 4: {numbers: [0, 1, 2, 3]}},
    'vertexAttrib4f': { 5: {numbers: [0, 1, 2, 3, 4]}},

    'vertexAttrib1fv': { 2: {numbers: [0], arrays: [1]}},
    'vertexAttrib2fv': { 2: {numbers: [0], arrays: [1]}},
    'vertexAttrib3fv': { 2: {numbers: [0], arrays: [1]}},
    'vertexAttrib4fv': { 2: {numbers: [0], arrays: [1]}},

    'vertexAttribI4i': { 5: {numbers: [0, 1, 2, 3, 4]}},  // WebGL2
    'vertexAttribI4iv': {2: {numbers: [0], arrays: [1]}},  // WebGL2
    'vertexAttribI4ui': {5: {numbers: [0, 1, 2, 3, 4]}},  // WebGL2
    'vertexAttribI4uiv': {2: {numbers: [0], arrays: [1]}},  // WebGL2

    // QueryObjects

    'beginQuery': { 2: { enums: [0] }},  // WebGL2
    'endQuery': { 1: { enums: [0] }},  // WebGL2
    'getQuery': { 2: { enums: [0, 1] }},  // WebGL2
    'getQueryParameter': { 2: { enums: [1] }},  // WebGL2

    //  Sampler Objects

    'samplerParameteri': { 3: { enums: [1] }},  // WebGL2
    'samplerParameterf': { 3: { enums: [1] }},  // WebGL2
    'getSamplerParameter': { 2: { enums: [1] }},  // WebGL2

    //  Sync objects

    'clientWaitSync': { 3: { enums: { 1: makeBitFieldToStringFunc(['SYNC_FLUSH_COMMANDS_BIT']) }, numbers: [2] }},  // WebGL2
    'fenceSync': { 2: { enums: [0] }},  // WebGL2
    'getSyncParameter': { 2: { enums: [1] }},  // WebGL2

    //  Transform Feedback

    'bindTransformFeedback': { 2: { enums: [0] }},  // WebGL2
    'beginTransformFeedback': { 1: { enums: [0] }},  // WebGL2

    // Uniform Buffer Objects and Transform Feedback Buffers
    'bindBufferBase': { 3: { enums: [0] }, numbers: [1]},  // WebGL2
    'bindBufferRange': { 5: { enums: [0] }, numbers: [1, 3, 4]},  // WebGL2
    'getIndexedParameter': { 2: { enums: [0], numbers: [1] }},  // WebGL2
    'getActiveUniforms': { 3: { enums: [2] }, arrays: [1]},  // WebGL2
    'getActiveUniformBlockParameter': { 3: { enums: [2], numbers: [1] }},  // WebGL2
    'getActiveUniformBlockName': { 2: {numbers: [1]}}, // WebGL2
    'uniformBlockBinding': { 3: { numbers: [1, 2]}}, // WebGL2
  };
  for (const fnInfos of Object.values(glFunctionInfos)) {
    for (const fnInfo of Object.values(fnInfos)) {
      convertToObjectIfArray(fnInfo, 'enums');
      convertToObjectIfArray(fnInfo, 'numbers');
      convertToObjectIfArray(fnInfo, 'arrays');
    }
  }

  function convertToObjectIfArray(obj, key) {
    if (Array.isArray(obj[key])) {
      obj[key] = Object.fromEntries(obj[key].map(ndx => [Math.abs(ndx), ndx]));
    }
  }

  function isTypedArray(v) {
    return v.buffer && v.buffer instanceof ArrayBuffer;
  }

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
    const matches = [];
    for (let key in gl) {
      if (gl[key] === value) {
        matches.push(key);
      }
    }
    return matches.length
        ? matches.map(v => `${v}`).join(' | ')
        : `/*UNKNOWN WebGL ENUM*/ ${typeof value === 'number' ? `0x${value.toString(16)}` : value}`;
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
    const funcInfos = glFunctionInfos[functionName];
    if (funcInfos !== undefined) {
      const funcInfo = funcInfos[numArgs];
      if (funcInfo !== undefined) {
        const argTypes = funcInfo.enums;
        if (argTypes) {
          const argType = argTypes[argumentIndex];
          if (argType !== undefined) {
            if (typeof argType === 'function') {
              return argType(gl, value);
            } else {
              return glEnumToString(gl, value);
            }
          }
        }
      }
    }
    if (value === null) {
      return 'null';
    } else if (value === undefined) {
      return 'undefined';
    } else if (Array.isArray(value) || isTypedArray(value)) {
      return `[${Array.from(value.slice(0, 32)).join(', ')}]`;
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
  function glFunctionArgsToString(ctx, funcName, args) {
    const numArgs = args.length;
    const stringifiedArgs = args.map(function(arg, ndx) {
      let str = glFunctionArgToString(ctx, funcName, numArgs, ndx, arg);
      // shorten because of long arrays
      if (str.length > 200) {
        str = str.substring(0, 200) + '...';
      }
      return str;
    });
    return stringifiedArgs.join(', ');
  }

  /**
   * Given a WebGL context replaces all the functions with wrapped functions
   * that call gl.getError after every command and calls a function if the
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
  function augmentWebGLContext(ctx, nameOfClass, options = {}) {
    const origGLErrorFn = options.origGLErrorFn || ctx.getError;
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
    const origFuncs = {};

    function removeChecks() {
      for (const {ctx, origFuncs} of Object.values(sharedState.wrappers)) {
        Object.assign(ctx, origFuncs);
      }
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
        if (target !== gl.ELEMENT_ARRAY_BUFFER) {
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

    function reportFunctionError(ctx, funcName, args, msg) {
      const stringifiedArgs = glFunctionArgsToString(ctx, funcName, args);
      const errorMsg = `error in ${funcName}(${stringifiedArgs}): ${msg}`;
      reportError(errorMsg);
    }

    // Makes a function that calls a WebGL function and then calls getError.
    function makeErrorWrapper(ctx, functionName) {
      const origFn = ctx[functionName];
      const check = functionName.startsWith('draw') ? checkMaxDrawCallsAndZeroCount : (specials[functionName] || noop);
      ctx[functionName] = function(...args) {
        if (onFunc) {
          onFunc(functionName, args);
        }

        const functionInfos = glFunctionInfos[functionName];
        if (functionInfos) {
          const {numbers = {}, arrays = {}} = functionInfos[args.length];
          for (let ndx = 0; ndx < args.length; ++ndx) {
            const arg = args[ndx];
            // check the no arguments are undefined
            if (arg === undefined) {
              reportFunctionError(ctx, functionName, args, `argument ${ndx} is undefined`);
            }
            if (numbers[ndx] !== undefined) {
              if (numbers[ndx] >= 0)  {
                // check that argument that is number (positive) is a number
                if ((typeof arg !== 'number' && !(arg instanceof Number) && arg !== false && arg !== true) || isNaN(arg)) {
                  reportFunctionError(ctx, functionName, args, `argument ${ndx} is not a number`);
                }
              } else {
                // check that argument that maybe is a number (negative) is not NaN
                if (!arg instanceof Object && isNaN(arg)) {
                  reportFunctionError(ctx, functionName, args, `argument ${ndx} is NaN`);
                }
              }
            }
            // check that an argument that is supposed to be an array of numbers is an array and has no NaNs in the array and no undefined
            if (arrays[ndx] !== undefined) {
              if (!Array.isArray(arg) && !isTypedArray(arg)) {
                reportFunctionError(ctx, functionName, args, `argument ${ndx} is not a array or typedarray`);
              }
              for (let i = 0; i < arg.length; ++i) {
                if (arg[i] === undefined) {
                  reportFunctionError(ctx, functionName, args, `element ${i} of argument ${ndx} is undefined`);
                }
                if (isNaN(arg[i])) {
                  reportFunctionError(ctx, functionName, args, `element ${i} of argument ${ndx} is NaN`);
                }
              }
            }
          }
        }

        const result = origFn.call(ctx, ...args);
        const err = origGLErrorFn.call(ctx);
        if (err !== 0) {
          glErrorShadow[err] = true;
          errorFunc(err, functionName, args);
        }
        check(ctx, functionName, ...args);
        return result;
      };
    }

    function makeGetExtensionWrapper(ctx, propertyName, origGLErrorFn) {
      const origFn = ctx[propertyName];
      ctx[propertyName] = function(...args) {
        const extensionName = args[0];
        let ext = sharedState.wrappers[extensionName];
        if (!ext) {
          ext = origFn.call(ctx, ...args);
          if (ext) {
            augmentWebGLContext(ext, {...options, origGLErrorFn});
            addEnumsForContext(ext, extensionName);
          }
        }
        return ext;
      };
    }

    // Wrap each function
    for (const propertyName in ctx) {
      if (typeof ctx[propertyName] === 'function') {
        origFuncs[propertyName] = ctx[propertyName];
        if (propertyName !== 'getExtension') {
          makeErrorWrapper(ctx, propertyName);
        } else {
          makeErrorWrapper(ctx, propertyName);
          makeGetExtensionWrapper(ctx, propertyName, origGLErrorFn);
        }
      }
    }

    // Override the getError function with one that returns our saved results.
    if (ctx.getError) {
      ctx.getError = function() {
        for (const err of Object.keys(glErrorShadow)) {
          if (glErrorShadow[err]) {
            glErrorShadow[err] = false;
            return err;
          }
        }
        return ctx.NO_ERROR;
      };
    }

    sharedState.wrappers[nameOfClass] = { ctx, origFuncs };
    if (ctx.bindBuffer) {
      addEnumsForContext(ctx, ctx.bindBufferBase ? 'WebGL2' : 'WebGL');
    }
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

  
  function wrapGetContext(Ctor) {
    const oldFn = Ctor.prototype.getContext;
    Ctor.prototype.getContext = function(type, ...args) {
      let ctx = oldFn.call(this, type, ...args);
      // Using bindTexture to see if it's WebGL. Could check for instanceof WebGLRenderingContext
      // but that might fail if wrapped by debugging extension
      if (ctx && ctx.bindTexture) {
        augmentWebGLContext(ctx, type.toLowerCase(), {
          maxDrawCalls: 1000,
          errorFunc: function(err, funcName, args) {
            const stringifiedArgs = glFunctionArgsToString(ctx, funcName, args);
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
            const errorMsg = `WebGL error ${glEnumToString(ctx, err)} in ${funcName}(${stringifiedArgs})${msgs.length ? `\n${msgs.join('\n')}` : ''}`;
            reportError(errorMsg);
          },
        });
      }
      return ctx;
    };
  };

  if (typeof HTMLCanvasElement !== "undefined") {
    wrapGetContext(HTMLCanvasElement);
  }
  if (typeof OffscreenCanvas !== "undefined") {
    wrapGetContext(OffscreenCanvas);
  }

})();

