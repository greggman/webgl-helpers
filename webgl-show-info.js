(function() {
  const enumToStringMap = new Map();
  {
    const api = WebGL2RenderingContext.prototype;
    for (const key of Object.keys(api)) {
      const desc = Object.getOwnPropertyDescriptor(api, key);
      if (desc.writable !== false) {
        continue;
      }
      const value = api[key];
      if (typeof value === 'number') {
        enumToStringMap.set(value, key);
      }
    }
  }
  enumToStringMap.set(WebGL2RenderingContext.prototype.POINTS, 'POINTS'); // because POINTS = 0 >:(
  function enumToString(v) {
    return enumToStringMap.get(v) || '*unknown*';
  }

  // I know ths is not a full check
  function isNumber(v) {
    return typeof v === 'number';
  }

  /* PixelFormat */
  const ALPHA                          = 0x1906;
  const RGB                            = 0x1907;
  const RGBA                           = 0x1908;
  const LUMINANCE                      = 0x1909;
  const LUMINANCE_ALPHA                = 0x190A;
  const DEPTH_COMPONENT                = 0x1902;
  const DEPTH_STENCIL                  = 0x84F9;

 
  /* DataType */
  const BYTE                         = 0x1400;
  const UNSIGNED_BYTE                = 0x1401;
  const SHORT                        = 0x1402;
  const UNSIGNED_SHORT               = 0x1403;
  const INT                          = 0x1404;
  const UNSIGNED_INT                 = 0x1405;
  const FLOAT                        = 0x1406;
  const UNSIGNED_SHORT_4_4_4_4       = 0x8033;
  const UNSIGNED_SHORT_5_5_5_1       = 0x8034;
  const UNSIGNED_SHORT_5_6_5         = 0x8363;
  const HALF_FLOAT                   = 0x140B;
  const HALF_FLOAT_OES               = 0x8D61;  // Thanks Khronos for making this different >:(
  const UNSIGNED_INT_2_10_10_10_REV  = 0x8368;
  const UNSIGNED_INT_10F_11F_11F_REV = 0x8C3B;
  const UNSIGNED_INT_5_9_9_9_REV     = 0x8C3E;
  const FLOAT_32_UNSIGNED_INT_24_8_REV = 0x8DAD;
  const UNSIGNED_INT_24_8            = 0x84FA;

  const RG                           = 0x8227;
  const RG_INTEGER                   = 0x8228;
  const RED                          = 0x1903;
  const RED_INTEGER                  = 0x8D94;
  const RGB_INTEGER                  = 0x8D98;
  const RGBA_INTEGER                 = 0x8D99;

  const ELEMENT_ARRAY_BUFFER         = 0x8893;

  const formatToNumComponentsMap = new Map([
    [ ALPHA           , 1 ],
    [ LUMINANCE       , 1 ],
    [ LUMINANCE_ALPHA , 2 ],
    [ RGB             , 3 ],
    [ RGBA            , 4 ],
    [ RED             , 1 ],
    [ RED_INTEGER     , 1 ],
    [ RG              , 2 ],
    [ RG_INTEGER      , 2 ],
    [ RGB             , 3 ],
    [ RGB_INTEGER     , 3 ],
    [ RGBA            , 4 ],
    [ RGBA_INTEGER    , 4 ],
    [ DEPTH_COMPONENT , 1 ],
    [ DEPTH_STENCIL   , 2 ],
  ]);

  const glTypeToSizeMap = new Map([
    [BYTE           , 1],
    [UNSIGNED_BYTE  , 1],
    [SHORT          , 2],
    [UNSIGNED_SHORT , 2],
    [INT            , 4],
    [UNSIGNED_INT   , 4],
    [FLOAT          , 4],
    [FLOAT          , 4],
    [UNSIGNED_SHORT_4_4_4_4, 0.5],
    [UNSIGNED_SHORT_5_5_5_1, 0.5],
    [UNSIGNED_SHORT_5_6_5,  1/3],
    [HALF_FLOAT     , 2],
    [HALF_FLOAT_OES , 2],
    [UNSIGNED_INT_2_10_10_10_REV, 1],
    [UNSIGNED_INT_10F_11F_11F_REV, 1],
    [UNSIGNED_INT_5_9_9_9_REV,     1],
    [FLOAT_32_UNSIGNED_INT_24_8_REV, 2],
    [UNSIGNED_INT_24_8, 2],
  ]);

  function computeBytesForFormatType(width, height, depth, format, type) {
    const elemSize = glTypeToSizeMap.get(type) * formatToNumComponentsMap.get(format);
    return width * height * depth * elemSize;
  }

  const targetToByteCountMap = new Map();

  const texImage2DArgParsersMap = new Map([
    [9, function([target, level, internalFormat, width, height, , format, type, src]) {
      return {target, level, internalFormat, width, height, format, type, src};
    }, ],
    [6, function([target, level, internalFormat, format, type, texImageSource]) {
      return {target, level, internalFormat, width: texImageSource.width, height: texImageSource.height, format, type, src: true};
    }, ],
    [10, function([target, level, internalFormat, width, height, , format, type]) {
      return {target, level, internalFormat, width, height, format, type, src: true};
    }, ],
  ]);

  const texSubImage2DArgParsersMap = new Map([
    [9, function([target, level, internalFormat, width, height, , format, type, src]) {
      return {target, level, internalFormat, width, height, format, type, src: !isNumber(src)};
    }, ],
    [7, function([target, level, x, y, width, height, format, type, texImageSource]) {
      return {target, level, width: texImageSource.width, height: texImageSource.height, format, type, src: true};
    }, ],
    [10, function([target, level, x, y, width, height, , format, type]) {
      return {target, level, width, height, format, type, src: true};
    }, ],
  ]);

  const texImage3DArgParsersMap = new Map([
    [10, function([target, level, internalFormat, width, height, depth, , format, type, src]) {
      return {target, level, internalFormat, width, height, format, depth, type, src: !isNumber(src)};
    }, ],
    [11, function([target, level, internalFormat, width, height, depth, , format, type, src]) {
      return {target, level, internalFormat, width, height, depth, format, type, src: !isNumber(src)};
    }, ],
  ]);

  const texSubImage3DArgParsersMap = new Map([
    [11, function([target, level, x, y, z, width, height, depth, format, type, src]) {
      return {target, level, width, height, depth, format, type, src: !isNumber(src)};
    }, ],
    [12, function([target, level, x, y, z, width, height, depth, format, type, src]) {
      return {target, level, width, height, depth, format, type, src: !isNumber(src)};
    }, ],
  ]);

  const primTypeToCountMap = new Map();
  function updateVertAndInstCount(primType, vertexCount, instanceCount) {
    const counts = primTypeToCountMap.get(primType) || {vertCount: 0, instCount: 0};
    counts.vertCount += vertexCount * instanceCount;
    counts.instCount += instanceCount;
    primTypeToCountMap.set(primType, counts);
  }

  const handlers = {
    bufferData(gl, funcName, info, args) {
      const [target, src, /* usage */, srcOffset = 0, length = 0] = args;
      if (isNumber(src)) {
        return;
      }
      const isDataView = src instanceof DataView;
      const copyLength = length ? length : isDataView
         ? src.byteLength - srcOffset
         : src.length - srcOffset;
      const elemSize = isDataView ? 1 : src.BYTES_PER_ELEMENT;
      const bufSize = copyLength * elemSize;
      targetToByteCountMap.set(target, (targetToByteCountMap.get(target) || 0) + bufSize);
    },
    // WebGL1
    //   void bufferSubData(GLenum target, GLintptr dstByteOffset, [AllowShared] BufferSource srcData);
    // WebGL2
    //   void bufferSubData(GLenum target, GLintptr dstByteOffset, [AllowShared] ArrayBufferView srcData,
    //                      GLuint srcOffset, optional GLuint length = 0);
    bufferSubData(gl, funcName, info, args) {
      const [target, dstByteOffset, src, srcOffset, length = 0] = args;
      const isDataView = src instanceof DataView;
      const copyLength = length ? length : isDataView
         ? src.byteLength - srcOffset
         : src.length - srcOffset;
      const elemSize = isDataView ? 1 : src.BYTES_PER_ELEMENT;
      const copySize = copyLength * elemSize;
      targetToByteCountMap.set(target, (targetToByteCountMap.get(target) || 0) + copySize);
    },
    texImage2D(gl, funcName, info, args) {
      const parser = texImage2DArgParsersMap.get(args.length);
      const {target, level, internalFormat, width, height, format, type, src} = parser(args);
      if (!src) {
        return;
      }
      const size = computeBytesForFormatType(width, height, 1, format, type);
      targetToByteCountMap.set(target, (targetToByteCountMap.get(target) || 0) + size);
    },
    texSubImage2D(gl, funcName, info, args) {
      const parser = texSubImage2DArgParsersMap.get(args.length);
      const {target, width, height, format, type, src} = parser(args);
      if (!src) {
        return;
      }
      const size = computeBytesForFormatType(width, height, 1, format, type);
      targetToByteCountMap.set(target, (targetToByteCountMap.get(target) || 0) + size);
    },
    texImage3D(gl, funcName, info, args) {
      const parser = texSubImage3DArgParsersMap.get(args.length);
      const {target, width, height, depth, format, type, src} = parser(args);
      if (!src) {
        return;
      }
      const size = computeBytesForFormatType(width, height, depth, format, type);
      targetToByteCountMap.set(target, (targetToByteCountMap.get(target) || 0) + size);
    },
    texSubImage3D(gl, funcName, info, args) {
      const parser = texSubImage3DArgParsersMap.get(args.length);
      const {target, width, height, depth, format, type, src} = parser(args);
      if (!src) {
        return;
      }
      const size = computeBytesForFormatType(width, height, depth, format, type);
      targetToByteCountMap.set(target, (targetToByteCountMap.get(target) || 0) + size);
    },
    drawArrays(gl, funcName, info, args) {
      const [primType, startOffset, vertCount] = args;
      updateVertAndInstCount(primType, vertCount, 1);
    },
    drawElements(gl, funcName, info, args) {
      const [primType, vertCount, indexType, startOffset] = args;
      updateVertAndInstCount(primType, vertCount, 1);
    },
    drawArraysInstanced(gl, funcName, info, args) {
      const [primType, startOffset, vertCount, instances] = args;
      updateVertAndInstCount(primType, vertCount, instances);
    },
    drawElementsInstanced(gl, funcName, info, args) {
      const [primType, vertCount, indexType, startOffset, instances] = args;
      updateVertAndInstCount(primType, vertCount, instances);
    },
    drawArraysInstancedANGLE(gl, funcName, info, args) {
      const [primType, startOffset, vertCount, instances] = args;
      updateVertAndInstCount(primType, vertCount, instacnes);
    },
    drawElementsInstancedANGLE(gl, funcName, info, args) {
      const [primType, vertCount, indexType, startOffset, instances] = args;
      updateVertAndInstCount(primType, vertCount, instances);
    },
    drawRangeElements(gl, funcName, info, args) {
      const [primType, start, end, vertCount, indexType, startOffset] = args;
      updateVertAndInstCount(primType, vertCount, 1);
    },
  };

  const wrappers = {
    bufferData: {category: 'buffer' },
    bufferSubData: {category: 'buffer' },

    drawArrays: {category: 'draw'},
    drawElements: {category: 'draw'},
    drawArraysInstanced: {category: 'draw'},
    drawElementsInstanced: {category: 'draw'},
    drawRangeElements: {category: 'draw'},

    getActiveUniform: {category: 'get'},
    getActiveUniformBlockName: {category: 'get'},
    getActiveUniformBlockParameter: {category: 'get'},
    getActiveUniforms: {category: 'get'},
    getAttachedShaders: {category: 'get'},
    getBufferParameter: {category: 'get'},
    getBufferSubData: {category: 'get'},
    getContextAttributes: {category: 'get'},
    getError: {category: 'getError'},
    getExtension: {category: 'get'},
    getFragDataLocation: {category: 'get'},
    getFramebufferAttachmentParameter: {category: 'get'},
    getIndexedParameter: {category: 'get'},
    getInternalformatParameter: {category: 'get'},
    getParameter: {category: 'get'},
    getProgramInfoLog: {category: 'get'},
    getProgramParameter: {category: 'get'},
    getQuery: {category: 'get'},
    getQueryParameter: {category: 'get'},
    getRenderbufferParameter: {category: 'get'},
    getSamplerParameter: {category: 'get'},
    getShaderInfoLog: {category: 'get'},
    getShaderParameter: {category: 'get'},
    getShaderPrecisionFormat: {category: 'get'},
    getShaderSource: {category: 'get'},
    getSupportedExtensions: {category: 'get'},
    getSyncParameter: {category: 'get'},
    getTexParameter: {category: 'get'},
    getTransformFeedbackVarying: {category: 'get'},
    getUniform: {category: 'get'},
    getUniformBlockIndex: {category: 'get'},
    getUniformIndices: {category: 'get'},
    getVertexAttrib: {category: 'get'},
    getVertexAttribOffset: {category: 'get'},

    getAttribLocation: {category: 'getUniform/Attrib'},
    getUniformLocation: {category: 'getUniform/Attrib'},

    texImage2D: {category: 'texture'},
    texSubImage2D: {category: 'texture'},
    texImage3D: {category: 'texture'},
    texSubImage3D: {category: 'texture'},
    compressedTexImage2D: {category: 'texture'},
    compressedTexSubImage2D: {category: 'texture'},
    compressedTexImage3D: {category: 'texture'},
    compressedTexSubImage3D: {category: 'texture'},

    enableVertexAttribArray: {category: 'attribs'},
    vertexAttribPointer: {category: 'attribs'},
    vertexAttribIPointer: {category: 'attribs'},
    vertexAttribDivisor: {category: 'attribs'},
  };

  const badCategories = {
    'attribs': true,
    'get': true,
    'getError': true,
    'getUniform/Attrib': true,
  };

  const counts = new Map();

  function wrap(api, fnName, origFn, info) {
    const handler = handlers[fnName];
    return function(...args) {
      if (info.track !== false) {
        counts.set(fnName, (counts.get(fnName) || 0) + 1);
      }
      if (handler) {
        handler(this, fnName, info, args)
      }
      return origFn.call(this, ...args);
    }
  }

  const api = WebGL2RenderingContext.prototype;
  for (const [fnName, info] of Object.entries(wrappers)) {
    const origFn = api[fnName];
    if (origFn) {
      api[fnName] = wrap(api, fnName, origFn, info);
    }
  }

  let showDetails = false;
  const elem = document.createElement('div');
  elem.className = 'webgl-show-info';
  elem.style.position = 'fixed';
  //elem.style.left = '0';
  //elem.style.top = '0';
  elem.style.backgroundColor = '#000';
  elem.style.color = '#FFF';
  elem.style.padding = '0.5em';
  window.addEventListener('load', () => {
    document.body.appendChild(elem);
  });
  elem.addEventListener('click', () => {showDetails = !showDetails});

  function getPrimCounts(lines) {
    for (const [primType, counts] of primTypeToCountMap.entries()) {
      lines.push(`${enumToString(primType)}: verts: ${counts.vertCount}, instances: ${counts.instCount}`);
      counts.vertCount = 0;
      counts.instCount = 0;
    }
  }

  function getByteTransferDetails(lines) {
    for (const [target, bytes] of targetToByteCountMap.entries()) {
      const bad = target === ELEMENT_ARRAY_BUFFER && bytes > 0;
      lines.push(`${enumToString(target)}: ${bytes}`, bad);
      targetToByteCountMap.set(target, 0);
    }
  }

  function getDetails(lines) {
    for (const [fnName, count] of counts.entries()) {
      const {category} = wrappers[fnName];
      lines.push(`${fnName}: ${count}`, badCategories[category] && count);
      counts.set(fnName, 0);
    }
  }

  function getOverview(lines) {
    const categories = new Map();
    for (const [fnName, count] of counts.entries()) {
      const {category} = wrappers[fnName];
      categories.set(category, (categories.get(category) || 0) + count)
      counts.set(fnName, 0);
    }
    for (const [category, count] of categories.entries()) {
      lines.push(`${category} calls: ${count}`, badCategories[category] && count);
    }
  }

  class LineManager {
    constructor(rootElem) {
      this.rootElem = rootElem;
      this.lineElements = [];
      this.index = 0;
    }
    _getElem() {
      if (this.index == this.lineElements.length) {
        const elem = document.createElement('pre');
        elem.style.margin = 0;
        this.rootElem.appendChild(elem);
        this.lineElements.push(elem);
      }
      const elem =this.lineElements[this.index++];
      elem.style.display = '';
      return elem;
    }
    push(msg, bad = false) {
      const elem = this._getElem();
      elem.textContent = msg;
      elem.style.color = bad ? 'red' : '';
    }
    finish() {
      for (let i = this.index; i < this.lineElements.length; ++i) {
        this.lineElements[i].style.display = 'none';
      }
      this.index = 0;
    }
  }

  const lines = new LineManager(elem);

  function update() {
    lines.push('--- [ Primitives ] ---');
    getPrimCounts(lines);
    lines.push('\n---[ Data Transfer (in bytes) ] ---');
    getByteTransferDetails(lines);
    lines.push('\n---[ Call Counts ] ---');
    showDetails ? getDetails(lines) : getOverview(lines);
    lines.finish();
    requestAnimationFrame(update);
  }
  requestAnimationFrame(update)
}());