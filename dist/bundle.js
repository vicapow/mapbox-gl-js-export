(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var mapbox = require('mapbox-gl');
var secrets = require('./secrets.json');
var Mapbox = require('mapbox-gl');
var Map = require('mapbox-gl/js/ui/Map');

Mapbox.accessToken = secrets.MAPBOX_ACCESS_TOKEN;

var map = new Map({
  container: 'map',
  zoom: 12.5,
  center: [38.888, -77.01866], // Washington, DC
  style: 'https://www.mapbox.com/mapbox-gl-styles/styles/bright-v7.json',
  hash: true,
  preserveDrawingBuffer: true
});

setTimeout(function() {
	var dataURL = map.getCanvas().toDataURL();
	window.open(dataURL,'_blank');
}, 5000);
},{"./secrets.json":132,"mapbox-gl":32,"mapbox-gl/js/ui/Map":84}],2:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],3:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],4:[function(require,module,exports){
(function (global){
/*! http://mths.be/punycode v1.2.4 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports;
	var freeModule = typeof module == 'object' && module &&
		module.exports == freeExports && module;
	var freeGlobal = typeof global == 'object' && global;
	if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^ -~]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /\x2E|\u3002|\uFF0E|\uFF61/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		while (length--) {
			array[length] = fn(array[length]);
		}
		return array;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings.
	 * @private
	 * @param {String} domain The domain name.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		return map(string.split(regexSeparators), fn).join('.');
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <http://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * http://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols to a Punycode string of ASCII-only
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name to Unicode. Only the
	 * Punycoded parts of the domain name will be converted, i.e. it doesn't
	 * matter if you call it on a string that has already been converted to
	 * Unicode.
	 * @memberOf punycode
	 * @param {String} domain The Punycode domain name to convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(domain) {
		return mapDomain(domain, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name to Punycode. Only the
	 * non-ASCII parts of the domain name will be converted, i.e. it doesn't
	 * matter if you call it with a domain that's already in ASCII.
	 * @memberOf punycode
	 * @param {String} domain The domain name to convert, as a Unicode string.
	 * @returns {String} The Punycode representation of the given domain name.
	 */
	function toASCII(domain) {
		return mapDomain(domain, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.2.4',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <http://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && !freeExports.nodeType) {
		if (freeModule) { // in Node.js or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else { // in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else { // in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],5:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],6:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],7:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":5,"./encode":6}],8:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var punycode = require('punycode');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1)
      hostEnd = rest.length;

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a puny coded representation of "domain".
      // It only converts the part of the domain name that
      // has non ASCII characters. I.e. it dosent matter if
      // you call it with a domain that already is in ASCII.
      var domainArray = this.hostname.split('.');
      var newOut = [];
      for (var i = 0; i < domainArray.length; ++i) {
        var s = domainArray[i];
        newOut.push(s.match(/[^A-Za-z0-9_-]/) ?
            'xn--' + punycode.encode(s) : s);
      }
      this.hostname = newOut.join('.');
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) this.pathname = rest;
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  //to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (isString(obj)) obj = urlParse(obj);
  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
  return obj.format();
}

Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query &&
      isObject(this.query) &&
      Object.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) return relative;
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
  if (isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  Object.keys(this).forEach(function(k) {
    result[k] = this[k];
  }, this);

  // hash is always overridden, no matter what.
  // even href="" will remove it.
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    Object.keys(relative).forEach(function(k) {
      if (k !== 'protocol')
        result[k] = relative[k];
    });

    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
      result.path = result.pathname = '/';
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      Object.keys(relative).forEach(function(k) {
        result[k] = relative[k];
      });
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // result.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') srcPath[0] = result.host;
      else srcPath.unshift(result.host);
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = (relative.host || relative.host === '') ?
                  relative.host : result.host;
    result.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (!isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especialy happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                       result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    //to support http.request
    if (!isNull(result.pathname) || !isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    result.pathname = null;
    //to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (result.host || relative.host) && (last === '.' || last === '..') ||
      last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last == '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especialy happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (!srcPath.length) {
    result.pathname = null;
    result.path = null;
  } else {
    result.pathname = srcPath.join('/');
  }

  //to support request.http
  if (!isNull(result.pathname) || !isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) this.hostname = host;
};

function isString(arg) {
  return typeof arg === "string";
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isNull(arg) {
  return arg === null;
}
function isNullOrUndefined(arg) {
  return  arg == null;
}

},{"punycode":4,"querystring":7}],9:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],10:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":9,"_process":3,"inherits":2}],11:[function(require,module,exports){
'use strict';

// a simple wrapper around a single arraybuffer

module.exports = Buffer;

function Buffer(buffer) {
    if (!buffer) {
        this.array = new ArrayBuffer(this.defaultLength);
        this.length = this.defaultLength;
        this.setupViews();

    } else {
        // we only recreate buffers after receiving them from workers for binding to gl,
        // so we only need these 2 properties
        this.array = buffer.array;
        this.pos = buffer.pos;
    }
}

Buffer.prototype = {
    pos: 0,
    itemSize: 4, // bytes in one item
    defaultLength: 8192, // initial buffer size
    arrayType: 'ARRAY_BUFFER', // gl buffer type

    get index() {
        return this.pos / this.itemSize;
    },

    setupViews: function() {
        // set up views for each type to add data of different types to the same buffer
        this.ubytes = new Uint8Array(this.array);
        this.bytes = new Int8Array(this.array);
        this.ushorts = new Uint16Array(this.array);
        this.shorts = new Int16Array(this.array);
    },

    // binds the buffer to a webgl context
    bind: function(gl) {
        var type = gl[this.arrayType];
        if (!this.buffer) {
            this.buffer = gl.createBuffer();
            gl.bindBuffer(type, this.buffer);
            gl.bufferData(type, this.array.slice(0, this.pos), gl.STATIC_DRAW);

            // dump array buffer once it's bound to gl
            this.array = null;
        } else {
            gl.bindBuffer(type, this.buffer);
        }
    },

    destroy: function(gl) {
        if (this.buffer) {
            gl.deleteBuffer(this.buffer);
        }
    },

    // increase the buffer size by 50% if a new item doesn't fit
    resize: function() {
        if (this.length < this.pos + this.itemSize) {

            while (this.length < this.pos + this.itemSize) {
                // increase the length by 50% but keep it even
                this.length = Math.round(this.length * 1.5 / 2) * 2;
            }

            // array buffers can't be resized, so we create a new one and reset all bytes there
            this.array = new ArrayBuffer(this.length);

            var ubytes = new Uint8Array(this.array);
            ubytes.set(this.ubytes);

            this.setupViews();
        }
    }
};

},{}],12:[function(require,module,exports){
'use strict';

var LineVertexBuffer = require('./line_vertex_buffer');
var LineElementBuffer = require('./line_element_buffer');
var FillVertexBuffer = require('./fill_vertex_buffer');
var FillElementBuffer = require('./triangle_element_buffer');
var OutlineElementBuffer = require('./outline_elements_buffer');
var GlyphVertexBuffer = require('./glyph_vertex_buffer');
var GlyphElementBuffer = require('./triangle_element_buffer');
var IconVertexBuffer = require('./icon_vertex_buffer');
var IconElementBuffer = require('./triangle_element_buffer');
var CollisionBoxVertexBuffer = require('./collision_box_vertex_buffer');

module.exports = function(bufferset) {
    bufferset = bufferset || {};
    return {
        glyphVertex: new GlyphVertexBuffer(bufferset.glyphVertex),
        glyphElement: new GlyphElementBuffer(bufferset.glyphElement),
        iconVertex: new IconVertexBuffer(bufferset.iconVertex),
        iconElement: new IconElementBuffer(bufferset.iconElement),
        fillVertex: new FillVertexBuffer(bufferset.fillVertex),
        fillElement: new FillElementBuffer(bufferset.fillElement),
        outlineElement: new OutlineElementBuffer(bufferset.outlineElement),
        lineVertex: new LineVertexBuffer(bufferset.lineVertex),
        lineElement: new LineElementBuffer(bufferset.lineElement),
        collisionBoxVertex: new CollisionBoxVertexBuffer(bufferset.collisionBoxVertex)
    };
};

},{"./collision_box_vertex_buffer":13,"./fill_vertex_buffer":14,"./glyph_vertex_buffer":15,"./icon_vertex_buffer":16,"./line_element_buffer":17,"./line_vertex_buffer":18,"./outline_elements_buffer":19,"./triangle_element_buffer":20}],13:[function(require,module,exports){
'use strict';

var util = require('../../util/util');
var Buffer = require('./buffer');

module.exports = CollisionBoxVertexBuffer;

function CollisionBoxVertexBuffer(buffer) {
    Buffer.call(this, buffer);
}

CollisionBoxVertexBuffer.prototype = util.inherit(Buffer, {
    itemSize: 12, // bytes per vertex (2 * short + 1 * short + 2 * byte = 8 bytes)
    defaultLength: 32768,

    // add a vertex to this buffer;
    // x, y - vertex position
    // ex, ey - extrude normal
    add: function(point, extrude, maxZoom, placementZoom) {
        var pos = this.pos,
            pos2 = pos / 2,
            index = this.index;

        this.resize();

        this.shorts[pos2 + 0] = point.x;
        this.shorts[pos2 + 1] = point.y;

        this.shorts[pos2 + 2] = Math.round(extrude.x);
        this.shorts[pos2 + 3] = Math.round(extrude.y);
        this.ubytes[pos + 8] = Math.floor(maxZoom * 10);
        this.ubytes[pos + 9] = Math.floor(placementZoom * 10);

        this.pos += this.itemSize;
        return index;
    }
});

},{"../../util/util":107,"./buffer":11}],14:[function(require,module,exports){
'use strict';

var util = require('../../util/util');
var Buffer = require('./buffer');

module.exports = FillVertexBuffer;

function FillVertexBuffer(buffer) {
    Buffer.call(this, buffer);
}

FillVertexBuffer.prototype = util.inherit(Buffer, {
    itemSize: 4, // bytes per vertex (2 * short == 4 bytes)

    add: function(x, y) {
        var pos2 = this.pos / 2;

        this.resize();

        this.shorts[pos2 + 0] = x;
        this.shorts[pos2 + 1] = y;

        this.pos += this.itemSize;
    }
});

},{"../../util/util":107,"./buffer":11}],15:[function(require,module,exports){
'use strict';

var util = require('../../util/util');
var Buffer = require('./buffer');

module.exports = GlyphVertexBuffer;

function GlyphVertexBuffer(buffer) {
    Buffer.call(this, buffer);
}


GlyphVertexBuffer.prototype = util.inherit(Buffer, {
    defaultLength: 2048 * 16,
    itemSize: 16,

    add: function(x, y, ox, oy, tx, ty, minzoom, maxzoom, labelminzoom) {
        var pos = this.pos,
            pos2 = pos / 2;

        this.resize();

        this.shorts[pos2 + 0] = x;
        this.shorts[pos2 + 1] = y;
        this.shorts[pos2 + 2] = Math.round(ox * 64); // use 1/64 pixels for placement
        this.shorts[pos2 + 3] = Math.round(oy * 64);

        // a_data1
        this.ubytes[pos + 8] /* tex */ = Math.floor(tx / 4);
        this.ubytes[pos + 9] /* tex */ = Math.floor(ty / 4);
        this.ubytes[pos + 10] /* labelminzoom */ = Math.floor((labelminzoom) * 10);

        // a_data2
        this.ubytes[pos + 12] /* minzoom */ = Math.floor((minzoom) * 10); // 1/10 zoom levels: z16 == 160.
        this.ubytes[pos + 13] /* maxzoom */ = Math.floor(Math.min(maxzoom, 25) * 10); // 1/10 zoom levels: z16 == 160.

        this.pos += this.itemSize;
    },

    bind: function(gl, shader, offset) {
        Buffer.prototype.bind.call(this, gl);

        var stride = this.itemSize;

        gl.vertexAttribPointer(shader.a_pos, 2, gl.SHORT, false, stride, offset + 0);
        gl.vertexAttribPointer(shader.a_offset, 2, gl.SHORT, false, stride, offset + 4);

        gl.vertexAttribPointer(shader.a_data1, 4, gl.UNSIGNED_BYTE, false, stride, offset + 8);
        gl.vertexAttribPointer(shader.a_data2, 2, gl.UNSIGNED_BYTE, false, stride, offset + 12);
    }
});

},{"../../util/util":107,"./buffer":11}],16:[function(require,module,exports){
'use strict';

var util = require('../../util/util');
var Buffer = require('./buffer');

module.exports = GlyphVertexBuffer;

function GlyphVertexBuffer(buffer) {
    Buffer.call(this, buffer);
}

GlyphVertexBuffer.prototype = util.inherit(Buffer, {
    defaultLength: 2048 * 16,
    itemSize: 16,

    add: function(x, y, ox, oy, tx, ty, minzoom, maxzoom, labelminzoom) {
        var pos = this.pos,
            pos2 = pos / 2;

        this.resize();

        this.shorts[pos2 + 0] = x;
        this.shorts[pos2 + 1] = y;
        this.shorts[pos2 + 2] = Math.round(ox * 64); // use 1/64 pixels for placement
        this.shorts[pos2 + 3] = Math.round(oy * 64);

        // a_data1
        this.ubytes[pos + 8] /* tex */ = tx / 4;
        this.ubytes[pos + 9] /* tex */ = ty / 4;
        this.ubytes[pos + 10] /* labelminzoom */ = Math.floor((labelminzoom || 0) * 10);

        // a_data2
        this.ubytes[pos + 12] /* minzoom */ = Math.floor((minzoom || 0) * 10); // 1/10 zoom levels: z16 == 160.
        this.ubytes[pos + 13] /* maxzoom */ = Math.floor(Math.min(maxzoom || 25, 25) * 10); // 1/10 zoom levels: z16 == 160.

        this.pos += this.itemSize;
    },

    bind: function(gl, shader, offset) {
        Buffer.prototype.bind.call(this, gl);

        var stride = this.itemSize;

        gl.vertexAttribPointer(shader.a_pos, 2, gl.SHORT, false, stride, offset + 0);
        gl.vertexAttribPointer(shader.a_offset, 2, gl.SHORT, false, stride, offset + 4);
        gl.vertexAttribPointer(shader.a_data1, 4, gl.UNSIGNED_BYTE, false, stride, offset + 8);
        gl.vertexAttribPointer(shader.a_data2, 2, gl.UNSIGNED_BYTE, false, stride, offset + 12);
    }
});

},{"../../util/util":107,"./buffer":11}],17:[function(require,module,exports){
'use strict';

var util = require('../../util/util');
var Buffer = require('./buffer');

module.exports = LineElementBuffer;

function LineElementBuffer(buffer) {
    Buffer.call(this, buffer);
}

LineElementBuffer.prototype = util.inherit(Buffer, {
    itemSize: 6, // bytes per triangle (3 * unsigned short == 6 bytes)
    arrayType: 'ELEMENT_ARRAY_BUFFER',

    add: function(a, b, c) {
        var pos2 = this.pos / 2;

        this.resize();

        this.ushorts[pos2 + 0] = a;
        this.ushorts[pos2 + 1] = b;
        this.ushorts[pos2 + 2] = c;

        this.pos += this.itemSize;
    }
});

},{"../../util/util":107,"./buffer":11}],18:[function(require,module,exports){
'use strict';

var util = require('../../util/util');
var Buffer = require('./buffer');

module.exports = LineVertexBuffer;

function LineVertexBuffer(buffer) {
    Buffer.call(this, buffer);
}

// scale the extrusion vector so that the normal length is this value.
// contains the "texture" normals (-1..1). this is distinct from the extrude
// normals for line joins, because the x-value remains 0 for the texture
// normal array, while the extrude normal actually moves the vertex to create
// the acute/bevelled line join.
LineVertexBuffer.extrudeScale = 63;

LineVertexBuffer.prototype = util.inherit(Buffer, {
    itemSize: 8, // bytes per vertex (2 * short + 1 * short + 2 * byte = 8 bytes)
    defaultLength: 32768,

    // add a vertex to this buffer;
    // x, y - vertex position
    // ex, ey - extrude normal
    // tx, ty - texture normal
    add: function(point, extrude, tx, ty, linesofar) {
        var pos = this.pos,
            pos2 = pos / 2,
            index = this.index,
            extrudeScale = LineVertexBuffer.extrudeScale;

        this.resize();

        this.shorts[pos2 + 0] = (Math.floor(point.x) * 2) | tx;
        this.shorts[pos2 + 1] = (Math.floor(point.y) * 2) | ty;

        this.bytes[pos + 4] = Math.round(extrudeScale * extrude.x);
        this.bytes[pos + 5] = Math.round(extrudeScale * extrude.y);
        this.bytes[pos + 6] = (linesofar || 0) / 128;
        this.bytes[pos + 7] = (linesofar || 0) % 128;

        this.pos += this.itemSize;
        return index;
    }
});

},{"../../util/util":107,"./buffer":11}],19:[function(require,module,exports){
'use strict';

var util = require('../../util/util');
var Buffer = require('./buffer');

module.exports = OutlineElementsBuffer;

function OutlineElementsBuffer(buffer) {
    Buffer.call(this, buffer);
}

OutlineElementsBuffer.prototype = util.inherit(Buffer, {
    itemSize: 4, // bytes per line (2 * unsigned short == 4 bytes)
    arrayType: 'ELEMENT_ARRAY_BUFFER',

    add: function(a, b) {
        var pos2 = this.pos / 2;

        this.resize();

        this.ushorts[pos2 + 0] = a;
        this.ushorts[pos2 + 1] = b;

        this.pos += this.itemSize;
    }
});

},{"../../util/util":107,"./buffer":11}],20:[function(require,module,exports){
'use strict';

var util = require('../../util/util');
var Buffer = require('./buffer');

module.exports = TriangleElementsBuffer;

function TriangleElementsBuffer(buffer) {
    Buffer.call(this, buffer);
}

TriangleElementsBuffer.prototype = util.inherit(Buffer, {
    itemSize: 6, // bytes per triangle (3 * unsigned short == 6 bytes)
    arrayType: 'ELEMENT_ARRAY_BUFFER',

    add: function(a, b, c) {
        var pos2 = this.pos / 2;

        this.resize();

        this.ushorts[pos2 + 0] = a;
        this.ushorts[pos2 + 1] = b;
        this.ushorts[pos2 + 2] = c;

        this.pos += this.itemSize;
    }
});

},{"../../util/util":107,"./buffer":11}],21:[function(require,module,exports){
'use strict';

module.exports = createBucket;

var LineBucket = require('./line_bucket');
var FillBucket = require('./fill_bucket');
var SymbolBucket = require('./symbol_bucket');
var LayoutProperties = require('../style/layout_properties');
var featureFilter = require('feature-filter');
var StyleDeclarationSet = require('../style/style_declaration_set');

function createBucket(layer, buffers, collision, z, overscaling, collisionDebug) {
    var values = new StyleDeclarationSet('layout', layer.type, layer.layout, {}).values(),
        fakeZoomHistory = { lastIntegerZoom: Infinity, lastIntegerZoomTime: 0, lastZoom: 0 },
        layout = {};

    for (var k in values) {
        layout[k] = values[k].calculate(z, fakeZoomHistory);
    }

    var BucketClass =
        layer.type === 'line' ? LineBucket :
        layer.type === 'fill' ? FillBucket :
        layer.type === 'symbol' ? SymbolBucket : null;

    var bucket = new BucketClass(buffers, new LayoutProperties[layer.type](layout), collision, overscaling, collisionDebug);

    bucket.id = layer.id;
    bucket.type = layer.type;
    bucket['source-layer'] = layer['source-layer'];
    bucket.interactive = layer.interactive;
    bucket.minZoom = layer.minzoom;
    bucket.maxZoom = layer.maxzoom;
    bucket.filter = featureFilter(layer.filter);
    bucket.features = [];

    return bucket;
}

},{"../style/layout_properties":59,"../style/style_declaration_set":65,"./fill_bucket":24,"./line_bucket":25,"./symbol_bucket":26,"feature-filter":109}],22:[function(require,module,exports){
'use strict';

module.exports = ElementGroups;

function ElementGroups(vertexBuffer, elementBuffer, secondElementBuffer) {

    this.vertexBuffer = vertexBuffer;
    this.elementBuffer = elementBuffer;
    this.secondElementBuffer = secondElementBuffer;
    this.groups = [];
}

ElementGroups.prototype.makeRoomFor = function(numVertices) {
    if (!this.current || this.current.vertexLength + numVertices > 65535) {
        this.current = new ElementGroup(this.vertexBuffer.index,
                this.elementBuffer && this.elementBuffer.index,
                this.secondElementBuffer && this.secondElementBuffer.index);
        this.groups.push(this.current);
    }
};

function ElementGroup(vertexStartIndex, elementStartIndex, secondElementStartIndex) {
    // the offset into the vertex buffer of the first vertex in this group
    this.vertexStartIndex = vertexStartIndex;
    this.elementStartIndex = elementStartIndex;
    this.secondElementStartIndex = secondElementStartIndex;
    this.elementLength = 0;
    this.vertexLength = 0;
    this.secondElementLength = 0;
}

},{}],23:[function(require,module,exports){
'use strict';

var rbush = require('rbush');
var Point = require('point-geometry');
var vt = require('vector-tile');
var util = require('../util/util');

module.exports = FeatureTree;

function FeatureTree(coord, overscaling) {
    this.x = coord.x;
    this.y = coord.y;
    this.z = coord.z - Math.log(overscaling) / Math.LN2;
    this.rtree = rbush(9);
    this.toBeInserted = [];
}

FeatureTree.prototype.insert = function(bbox, layers, feature) {
    bbox.layers = layers;
    bbox.feature = feature;
    this.toBeInserted.push(bbox);
};

// bulk insert into tree
FeatureTree.prototype._load = function() {
    this.rtree.load(this.toBeInserted);
    this.toBeInserted = [];
};

// Finds features in this tile at a particular position.
FeatureTree.prototype.query = function(args, callback) {
    if (this.toBeInserted.length) this._load();

    var params = args.params || {},
        radius = (params.radius || 0) * 4096 / args.scale,
        x = args.x,
        y = args.y,
        result = [];

    var matching = this.rtree.search([ x - radius, y - radius, x + radius, y + radius ]);
    for (var i = 0; i < matching.length; i++) {
        var feature = matching[i].feature,
            layers = matching[i].layers,
            type = vt.VectorTileFeature.types[feature.type];

        if (params.$type && type !== params.$type)
            continue;
        if (!geometryContainsPoint(feature.loadGeometry(), type, new Point(x, y), radius))
            continue;

        var geoJSON = feature.toGeoJSON(this.x, this.y, this.z);
        for (var l = 0; l < layers.length; l++) {
            var layer = layers[l];

            if (params.layer && layer !== params.layer.id)
                continue;

            result.push(util.extend({layer: layer}, geoJSON));
        }
    }

    callback(null, result);
};

function geometryContainsPoint(rings, type, p, radius) {
    return type === 'Point' ? pointContainsPoint(rings, p, radius) :
           type === 'LineString' ? lineContainsPoint(rings, p, radius) :
           type === 'Polygon' ? polyContainsPoint(rings, p) || lineContainsPoint(rings, p, radius) : false;
}

// Code from http://stackoverflow.com/a/1501725/331379.
function distToSegmentSquared(p, v, w) {
    var l2 = v.distSqr(w);
    if (l2 === 0) return p.distSqr(v);
    var t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    if (t < 0) return p.distSqr(v);
    if (t > 1) return p.distSqr(w);
    return p.distSqr(w.sub(v)._mult(t)._add(v));
}

function lineContainsPoint(rings, p, radius) {
    var r = radius * radius;

    for (var i = 0; i < rings.length; i++) {
        var ring = rings[i];
        for (var j = 1; j < ring.length; j++) {
            // Find line segments that have a distance <= radius^2 to p
            // In that case, we treat the line as "containing point p".
            var v = ring[j - 1], w = ring[j];
            if (distToSegmentSquared(p, v, w) < r) return true;
        }
    }
    return false;
}

// point in polygon ray casting algorithm
function polyContainsPoint(rings, p) {
    var c = false,
        ring, p1, p2;

    for (var k = 0; k < rings.length; k++) {
        ring = rings[k];
        for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            p1 = ring[i];
            p2 = ring[j];
            if (((p1.y > p.y) !== (p2.y > p.y)) && (p.x < (p2.x - p1.x) * (p.y - p1.y) / (p2.y - p1.y) + p1.x)) {
                c = !c;
            }
        }
    }
    return c;
}

function pointContainsPoint(rings, p, radius) {
    var r = radius * radius;

    for (var i = 0; i < rings.length; i++) {
        var ring = rings[i];
        for (var j = 0; j < ring.length; j++) {
            if (ring[j].distSqr(p) <= r) return true;
        }
    }
    return false;
}

},{"../util/util":107,"point-geometry":124,"rbush":125,"vector-tile":127}],24:[function(require,module,exports){
'use strict';

var ElementGroups = require('./element_groups');

module.exports = FillBucket;

function FillBucket(buffers) {
    this.buffers = buffers;
    this.elementGroups = new ElementGroups(buffers.fillVertex, buffers.fillElement, buffers.outlineElement);
}

FillBucket.prototype.addFeatures = function() {
    var features = this.features;
    for (var i = 0; i < features.length; i++) {
        var feature = features[i];
        this.addFeature(feature.loadGeometry());
    }
};

FillBucket.prototype.addFeature = function(lines) {
    for (var i = 0; i < lines.length; i++) {
        this.addFill(lines[i]);
    }
};

FillBucket.prototype.addFill = function(vertices) {
    if (vertices.length < 3) {
        //console.warn('a fill must have at least three vertices');
        return;
    }

    // Calculate the total number of vertices we're going to produce so that we
    // can resize the buffer beforehand, or detect whether the current line
    // won't fit into the buffer anymore.
    // In order to be able to use the vertex buffer for drawing the antialiased
    // outlines, we separate all polygon vertices with a degenerate (out-of-
    // viewplane) vertex.

    var len = vertices.length;

    // Check whether this geometry buffer can hold all the required vertices.
    this.elementGroups.makeRoomFor(len + 1);
    var elementGroup = this.elementGroups.current;

    var fillVertex = this.buffers.fillVertex;
    var fillElement = this.buffers.fillElement;
    var outlineElement = this.buffers.outlineElement;

    // We're generating triangle fans, so we always start with the first coordinate in this polygon.
    var firstIndex = fillVertex.index - elementGroup.vertexStartIndex,
        prevIndex, currentIndex, currentVertex;

    for (var i = 0; i < vertices.length; i++) {
        currentIndex = fillVertex.index - elementGroup.vertexStartIndex;
        currentVertex = vertices[i];

        fillVertex.add(currentVertex.x, currentVertex.y);
        elementGroup.vertexLength++;

        // Only add triangles that have distinct vertices.
        if (i >= 2 && (currentVertex.x !== vertices[0].x || currentVertex.y !== vertices[0].y)) {
            fillElement.add(firstIndex, prevIndex, currentIndex);
            elementGroup.elementLength++;
        }

        if (i >= 1) {
            outlineElement.add(prevIndex, currentIndex);
            elementGroup.secondElementLength++;
        }

        prevIndex = currentIndex;
    }
};

},{"./element_groups":22}],25:[function(require,module,exports){
'use strict';

var ElementGroups = require('./element_groups');

module.exports = LineBucket;

function LineBucket(buffers, layoutProperties) {
    this.buffers = buffers;
    this.elementGroups = new ElementGroups(buffers.lineVertex, buffers.lineElement);
    this.layoutProperties = layoutProperties;
}

LineBucket.prototype.addFeatures = function() {
    var features = this.features;
    for (var i = 0; i < features.length; i++) {
        var feature = features[i];
        this.addFeature(feature.loadGeometry());
    }
};

LineBucket.prototype.addFeature = function(lines) {
    var layoutProperties = this.layoutProperties;
    for (var i = 0; i < lines.length; i++) {
        this.addLine(lines[i],
            layoutProperties['line-join'],
            layoutProperties['line-cap'],
            layoutProperties['line-miter-limit'],
            layoutProperties['line-round-limit']);
    }
};

LineBucket.prototype.addLine = function(vertices, join, cap, miterLimit, roundLimit) {

    var len = vertices.length;
    // If the line has duplicate vertices at the end, adjust length to remove them.
    while (len > 2 && vertices[len - 1].equals(vertices[len - 2])) {
        len--;
    }

    if (vertices.length < 2) {
        //console.warn('a line must have at least two vertices');
        return;
    }

    if (join === 'bevel') miterLimit = 1.05;

    var firstVertex = vertices[0],
        lastVertex = vertices[len - 1],
        closed = firstVertex.equals(lastVertex);

    // we could be more precise, but it would only save a negligible amount of space
    this.elementGroups.makeRoomFor(len * 4);

    if (len === 2 && closed) {
        // console.warn('a line may not have coincident points');
        return;
    }

    var beginCap = cap,
        endCap = closed ? 'butt' : cap,
        flip = 1,
        distance = 0,
        startOfLine = true,
        currentVertex, prevVertex, nextVertex, prevNormal, nextNormal, offsetA, offsetB;

    // the last three vertices added
    this.e1 = this.e2 = this.e3 = -1;

    if (closed) {
        currentVertex = vertices[len - 2];
        nextNormal = firstVertex.sub(currentVertex)._unit()._perp();
    }

    for (var i = 0; i < len; i++) {

        nextVertex = closed && i === len - 1 ?
            vertices[1] : // if the line is closed, we treat the last vertex like the first
            vertices[i + 1]; // just the next vertex

        // if two consecutive vertices exist, skip the current one
        if (nextVertex && vertices[i].equals(nextVertex)) continue;

        if (nextNormal) prevNormal = nextNormal;
        if (currentVertex) prevVertex = currentVertex;

        currentVertex = vertices[i];

        // Calculate how far along the line the currentVertex is
        if (prevVertex) distance += currentVertex.dist(prevVertex);

        // Calculate the normal towards the next vertex in this line. In case
        // there is no next vertex, pretend that the line is continuing straight,
        // meaning that we are just using the previous normal.
        nextNormal = nextVertex ? nextVertex.sub(currentVertex)._unit()._perp() : prevNormal;

        // If we still don't have a previous normal, this is the beginning of a
        // non-closed line, so we're doing a straight "join".
        prevNormal = prevNormal || nextNormal;

        // Determine the normal of the join extrusion. It is the angle bisector
        // of the segments between the previous line and the next line.
        var joinNormal = prevNormal.add(nextNormal)._unit();

        /*  joinNormal     prevNormal
         *             ↖      ↑
         *                .________. prevVertex
         *                |
         * nextNormal  ←  |  currentVertex
         *                |
         *     nextVertex !
         *
         */

        // Calculate the length of the miter (the ratio of the miter to the width).
        // Find the cosine of the angle between the next and join normals
        // using dot product. The inverse of that is the miter length.
        var cosHalfAngle = joinNormal.x * nextNormal.x + joinNormal.y * nextNormal.y;
        var miterLength = 1 / cosHalfAngle;

        // The join if a middle vertex, otherwise the cap.
        var middleVertex = prevVertex && nextVertex;
        var currentJoin = middleVertex ? join : nextVertex ? beginCap : endCap;

        if (middleVertex && currentJoin === 'round' && miterLength < roundLimit) {
            currentJoin = 'miter';
        }

        if (currentJoin === 'miter' && miterLength > miterLimit) {
            currentJoin = 'bevel';
        }

        if (currentJoin === 'bevel') {
            // The maximum extrude length is 128 / 63 = 2 times the width of the line
            // so if miterLength >= 2 we need to draw a different type of bevel where.
            if (miterLength > 2) currentJoin = 'flipbevel';

            // If the miterLength is really small and the line bevel wouldn't be visible,
            // just draw a miter join to save a triangle.
            if (miterLength < miterLimit) currentJoin = 'miter';
        }

        if (currentJoin === 'miter') {
            joinNormal._mult(miterLength);
            this.addCurrentVertex(currentVertex, flip, distance, joinNormal, 0, 0, false);

        } else if (currentJoin === 'flipbevel') {
            // miter is too big, flip the direction to make a beveled join

            if (miterLength > 100) {
                // Almost parallel lines
                joinNormal = nextNormal.clone();

            } else {
                var direction = prevNormal.x * nextNormal.y - prevNormal.y * nextNormal.x > 0 ? -1 : 1;
                var bevelLength = miterLength * prevNormal.add(nextNormal).mag() / prevNormal.sub(nextNormal).mag();
                joinNormal._perp()._mult(bevelLength * direction);
            }
            this.addCurrentVertex(currentVertex, flip, distance, joinNormal, 0, 0, false);
            flip = -flip;

        } else if (currentJoin === 'bevel') {
            var dir = prevNormal.x * nextNormal.y - prevNormal.y * nextNormal.x;
            var offset = -Math.sqrt(miterLength * miterLength - 1);
            if (flip * dir > 0) {
                offsetB = 0;
                offsetA = offset;
            } else {
                offsetA = 0;
                offsetB = offset;
            }

            // Close previous segment with a bevel
            if (!startOfLine) {
                this.addCurrentVertex(currentVertex, flip, distance, prevNormal, offsetA, offsetB, false);
            }

            // Start next segment
            if (nextVertex) {
                this.addCurrentVertex(currentVertex, flip, distance, nextNormal, -offsetA, -offsetB, false);
            }

        } else if (currentJoin === 'butt') {
            if (!startOfLine) {
                // Close previous segment with a butt
                this.addCurrentVertex(currentVertex, flip, distance, prevNormal, 0, 0, false);
            }

            // Start next segment with a butt
            if (nextVertex) {
                this.addCurrentVertex(currentVertex, flip, distance, nextNormal, 0, 0, false);
            }

        } else if (currentJoin === 'square') {

            if (!startOfLine) {
                // Close previous segment with a square cap
                this.addCurrentVertex(currentVertex, flip, distance, prevNormal, 1, 1, false);

                // The segment is done. Unset vertices to disconnect segments.
                this.e1 = this.e2 = -1;
                flip = 1;
            }

            // Start next segment
            if (nextVertex) {
                this.addCurrentVertex(currentVertex, flip, distance, nextNormal, -1, -1, false);
            }

        } else if (currentJoin === 'round') {

            if (!startOfLine) {
                // Close previous segment with butt
                this.addCurrentVertex(currentVertex, flip, distance, prevNormal, 0, 0, false);

                // Add round cap or linejoin at end of segment
                this.addCurrentVertex(currentVertex, flip, distance, prevNormal, 1, 1, true);

                // The segment is done. Unset vertices to disconnect segments.
                this.e1 = this.e2 = -1;
                flip = 1;

            } else if (beginCap === 'round') {
                // Add round cap before first segment
                this.addCurrentVertex(currentVertex, flip, distance, nextNormal, -1, -1, true);
            }

            // Start next segment with a butt
            if (nextVertex) {
                this.addCurrentVertex(currentVertex, flip, distance, nextNormal, 0, 0, false);
            }
        }

        startOfLine = false;
    }


};

/**
 * Add two vertices to the buffers.
 *
 * @param {Object} currentVertex the line vertex to add buffer vertices for
 * @param {Number} flip -1 if the vertices should be flipped, 1 otherwise
 * @param {Number} distance the distance from the beggining of the line to the vertex
 * @param {Number} endLeft extrude to shift the left vertex along the line
 * @param {Number} endRight extrude to shift the left vertex along the line
 * @param {Boolean} round whether this is a round cap
 */
LineBucket.prototype.addCurrentVertex = function(currentVertex, flip, distance, normal, endLeft, endRight, round) {
    var tx = round ? 1 : 0;
    var extrude;

    var lineVertex = this.buffers.lineVertex;
    var lineElement = this.buffers.lineElement;
    var elementGroup = this.elementGroups.current;
    var vertexStartIndex = this.elementGroups.current.vertexStartIndex;

    extrude = normal.mult(flip);
    if (endLeft) extrude._sub(normal.perp()._mult(endLeft));
    this.e3 = lineVertex.add(currentVertex, extrude, tx, 0, distance) - vertexStartIndex;
    if (this.e1 >= 0 && this.e2 >= 0) {
        lineElement.add(this.e1, this.e2, this.e3);
        elementGroup.elementLength++;
    }
    this.e1 = this.e2;
    this.e2 = this.e3;

    extrude = normal.mult(-flip);
    if (endRight) extrude._sub(normal.perp()._mult(endRight));
    this.e3 = lineVertex.add(currentVertex, extrude, tx, 1, distance) - vertexStartIndex;
    if (this.e1 >= 0 && this.e2 >= 0) {
        lineElement.add(this.e1, this.e2, this.e3);
        elementGroup.elementLength++;
    }
    this.e1 = this.e2;
    this.e2 = this.e3;

    elementGroup.vertexLength += 2;
};

},{"./element_groups":22}],26:[function(require,module,exports){
'use strict';

var ElementGroups = require('./element_groups');
var Anchor = require('../symbol/anchor');
var getAnchors = require('../symbol/get_anchors');
var resolveTokens = require('../util/token');
var Quads = require('../symbol/quads');
var Shaping = require('../symbol/shaping');
var resolveText = require('../symbol/resolve_text');
var resolveIcons = require('../symbol/resolve_icons');
var mergeLines = require('../symbol/mergelines');
var shapeText = Shaping.shapeText;
var shapeIcon = Shaping.shapeIcon;
var getGlyphQuads = Quads.getGlyphQuads;
var getIconQuads = Quads.getIconQuads;
var clipLine = require('../symbol/clip_line');
var Point = require('point-geometry');

var CollisionFeature = require('../symbol/collision_feature');

module.exports = SymbolBucket;

function SymbolBucket(buffers, layoutProperties, collision, overscaling, collisionDebug) {
    this.buffers = buffers;
    this.layoutProperties = layoutProperties;
    this.collision = collision;
    this.overscaling = overscaling;
    this.collisionDebug = collisionDebug;

    this.symbolInstances = [];

}

SymbolBucket.prototype.addFeatures = function() {
    var layout = this.layoutProperties;
    var features = this.features;
    var textFeatures = this.textFeatures;

    var horizontalAlign = 0.5,
        verticalAlign = 0.5;

    switch (layout['text-anchor']) {
        case 'right':
        case 'top-right':
        case 'bottom-right':
            horizontalAlign = 1;
            break;
        case 'left':
        case 'top-left':
        case 'bottom-left':
            horizontalAlign = 0;
            break;
    }

    switch (layout['text-anchor']) {
        case 'bottom':
        case 'bottom-right':
        case 'bottom-left':
            verticalAlign = 1;
            break;
        case 'top':
        case 'top-right':
        case 'top-left':
            verticalAlign = 0;
            break;
    }

    var justify = layout['text-justify'] === 'right' ? 1 :
        layout['text-justify'] === 'left' ? 0 :
        0.5;

    var oneEm = 24;
    var lineHeight = layout['text-line-height'] * oneEm;
    var maxWidth = layout['symbol-placement'] !== 'line' ? layout['text-max-width'] * oneEm : 0;
    var spacing = layout['text-letter-spacing'] * oneEm;
    var textOffset = [layout['text-offset'][0] * oneEm, layout['text-offset'][1] * oneEm];
    var fontstack = layout['text-font'];

    var geometries = [];
    for (var g = 0; g < features.length; g++) {
        geometries.push(features[g].loadGeometry());
    }

    if (layout['symbol-placement'] === 'line') {
        // Merge adjacent lines with the same text to improve labelling.
        // It's better to place labels on one long line than on many short segments.
        var merged = mergeLines(features, textFeatures, geometries);

        geometries = merged.geometries;
        features = merged.features;
        textFeatures = merged.textFeatures;
    }

    var shapedText, shapedIcon;

    for (var k = 0; k < features.length; k++) {
        if (!geometries[k]) continue;

        if (textFeatures[k]) {
            shapedText = shapeText(textFeatures[k], this.stacks[fontstack], maxWidth,
                    lineHeight, horizontalAlign, verticalAlign, justify, spacing, textOffset);
        } else {
            shapedText = null;
        }

        if (layout['icon-image']) {
            var iconName = resolveTokens(features[k].properties, layout['icon-image']);
            var image = this.icons[iconName];
            shapedIcon = shapeIcon(image, layout);

            if (image) {
                if (this.sdfIcons === undefined) {
                    this.sdfIcons = image.sdf;
                } else if (this.sdfIcons !== image.sdf) {
                    console.warn('Style sheet warning: Cannot mix SDF and non-SDF icons in one bucket');
                }
            }
        } else {
            shapedIcon = null;
        }

        if (shapedText || shapedIcon) {
            this.addFeature(geometries[k], shapedText, shapedIcon);
        }
    }

    this.placeFeatures(this.buffers, this.collisionDebug);
};

SymbolBucket.prototype.addFeature = function(lines, shapedText, shapedIcon) {
    var layout = this.layoutProperties;
    var collision = this.collision;

    var glyphSize = 24;

    var fontScale = layout['text-max-size'] / glyphSize,
        textBoxScale = collision.tilePixelRatio * fontScale,
        iconBoxScale = collision.tilePixelRatio * layout['icon-max-size'],
        symbolMinDistance = collision.tilePixelRatio * layout['symbol-min-distance'],
        avoidEdges = layout['symbol-avoid-edges'],
        textPadding = layout['text-padding'] * collision.tilePixelRatio,
        iconPadding = layout['icon-padding'] * collision.tilePixelRatio,
        textMaxAngle = layout['text-max-angle'] / 180 * Math.PI,
        textAlongLine = layout['text-rotation-alignment'] === 'map' && layout['symbol-placement'] === 'line',
        iconAlongLine = layout['icon-rotation-alignment'] === 'map' && layout['symbol-placement'] === 'line',
        mayOverlap = layout['text-allow-overlap'] || layout['icon-allow-overlap'] ||
            layout['text-ignore-placement'] || layout['icon-ignore-placement'];

    if (layout['symbol-placement'] === 'line') {
        lines = clipLine(lines, 0, 0, 4096, 4096);
    }

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];

        // Calculate the anchor points around which you want to place labels
        var anchors = layout['symbol-placement'] === 'line' ?
            getAnchors(line, symbolMinDistance, textMaxAngle, shapedText, glyphSize, textBoxScale, this.overscaling) :
            [ new Anchor(line[0].x, line[0].y, 0) ];

        // For each potential label, create the placement features used to check for collisions, and the quads use for rendering.
        for (var j = 0, len = anchors.length; j < len; j++) {
            var anchor = anchors[j];

            var inside = !(anchor.x < 0 || anchor.x > 4096 || anchor.y < 0 || anchor.y > 4096);

            if (avoidEdges && !inside) continue;

            // Normally symbol layers are drawn across tile boundaries. Only symbols
            // with their anchors within the tile boundaries are added to the buffers
            // to prevent symbols from being drawn twice.
            //
            // Symbols in layers with overlap are sorted in the y direction so that
            // symbols lower on the canvas are drawn on top of symbols near the top.
            // To preserve this order across tile boundaries these symbols can't
            // be drawn across tile boundaries. Instead they need to be included in
            // the buffers for both tiles and clipped to tile boundaries at draw time.
            var addToBuffers = inside || mayOverlap;

            this.symbolInstances.push(new SymbolInstance(anchor, line, shapedText, shapedIcon, layout, addToBuffers,
                        textBoxScale, textPadding, textAlongLine,
                        iconBoxScale, iconPadding, iconAlongLine));
        }
    }
};

SymbolBucket.prototype.placeFeatures = function(buffers, collisionDebug) {

    // Calculate which labels can be shown and when they can be shown and
    // create the bufers used for rendering.

    this.buffers = buffers;

    var elementGroups = this.elementGroups = {
        text: new ElementGroups(buffers.glyphVertex, buffers.glyphElement),
        icon: new ElementGroups(buffers.iconVertex, buffers.iconElement),
        sdfIcons: this.sdfIcons
    };

    var layout = this.layoutProperties;
    var collision = this.collision;
    var maxScale = this.collision.maxScale;

    var textAlongLine = layout['text-rotation-alignment'] === 'map' && layout['symbol-placement'] === 'line';
    var iconAlongLine = layout['icon-rotation-alignment'] === 'map' && layout['symbol-placement'] === 'line';

    var mayOverlap = layout['text-allow-overlap'] || layout['icon-allow-overlap'] ||
        layout['text-ignore-placement'] || layout['icon-ignore-placement'];

    // Sort symbols by their y position on the canvas so that they lower symbols
    // are drawn on top of higher symbols.
    // Don't sort symbols that won't overlap because it isn't necessary and
    // because it causes more labels to pop in and out when rotating.
    if (mayOverlap) {
        var angle = this.collision.angle;
        var sin = Math.sin(angle),
            cos = Math.cos(angle);

        this.symbolInstances.sort(function(a, b) {
            var aRotated = sin * a.x + cos * a.y;
            var bRotated = sin * b.x + cos * b.y;
            return bRotated - aRotated;
        });
    }

    for (var p = 0; p < this.symbolInstances.length; p++) {
        var symbolInstance = this.symbolInstances[p];
        var hasText = symbolInstance.hasText;
        var hasIcon = symbolInstance.hasIcon;

        var iconWithoutText = layout['text-optional'] || !hasText,
            textWithoutIcon = layout['icon-optional'] || !hasIcon;


        // Calculate the scales at which the text and icon can be placed without collision.

        var glyphScale = hasText && !layout['text-allow-overlap'] ?
            collision.placeFeature(symbolInstance.textCollisionFeature) : collision.minScale;

        var iconScale = hasIcon && !layout['icon-allow-overlap'] ?
            collision.placeFeature(symbolInstance.iconCollisionFeature) : collision.minScale;


        // Combine the scales for icons and text.

        if (!iconWithoutText && !textWithoutIcon) {
            iconScale = glyphScale = Math.max(iconScale, glyphScale);
        } else if (!textWithoutIcon && glyphScale) {
            glyphScale = Math.max(iconScale, glyphScale);
        } else if (!iconWithoutText && iconScale) {
            iconScale = Math.max(iconScale, glyphScale);
        }


        // Insert final placement into collision tree and add glyphs/icons to buffers

        if (hasText) {
            if (!layout['text-ignore-placement']) {
                collision.insertFeature(symbolInstance.textCollisionFeature, glyphScale);
            }
            if (glyphScale <= maxScale) {
                this.addSymbols(buffers.glyphVertex, buffers.glyphElement, elementGroups.text,
                        symbolInstance.glyphQuads, glyphScale, layout['text-keep-upright'], textAlongLine);
            }
        }

        if (hasIcon) {
            if (!layout['icon-ignore-placement']) {
                collision.insertFeature(symbolInstance.iconCollisionFeature, iconScale);
            }
            if (iconScale <= maxScale) {
                this.addSymbols(buffers.iconVertex, buffers.iconElement, elementGroups.icon,
                        symbolInstance.iconQuads, iconScale, layout['icon-keep-upright'], iconAlongLine);
            }
        }

    }

    if (collisionDebug) this.addToDebugBuffers();
};

SymbolBucket.prototype.addSymbols = function(vertex, element, elementGroups, quads, scale, keepUpright, alongLine) {

    elementGroups.makeRoomFor(4 * quads.length);
    var elementGroup = elementGroups.current;

    var zoom = this.collision.zoom;
    var placementZoom = Math.max(Math.log(scale) / Math.LN2 + zoom, 0);
    var placementAngle = this.collision.angle + Math.PI;

    for (var k = 0; k < quads.length; k++) {

        var symbol = quads[k],
            angle = symbol.angle;

        // drop upside down versions of glyphs
        var a = (angle + placementAngle) % (Math.PI * 2);
        if (keepUpright && alongLine && (a <= Math.PI / 2 || a > Math.PI * 3 / 2)) continue;

        var tl = symbol.tl,
            tr = symbol.tr,
            bl = symbol.bl,
            br = symbol.br,
            tex = symbol.tex,
            anchor = symbol.anchor,

            minZoom = Math.max(zoom + Math.log(symbol.minScale) / Math.LN2, placementZoom),
            maxZoom = Math.min(zoom + Math.log(symbol.maxScale) / Math.LN2, 25);

        if (maxZoom <= minZoom) continue;

        // Lower min zoom so that while fading out the label it can be shown outside of collision-free zoom levels
        if (minZoom === placementZoom) minZoom = 0;

        var triangleIndex = vertex.index - elementGroup.vertexStartIndex;

        vertex.add(anchor.x, anchor.y, tl.x, tl.y, tex.x, tex.y, minZoom, maxZoom, placementZoom);
        vertex.add(anchor.x, anchor.y, tr.x, tr.y, tex.x + tex.w, tex.y, minZoom, maxZoom, placementZoom);
        vertex.add(anchor.x, anchor.y, bl.x, bl.y, tex.x, tex.y + tex.h, minZoom, maxZoom, placementZoom);
        vertex.add(anchor.x, anchor.y, br.x, br.y, tex.x + tex.w, tex.y + tex.h, minZoom, maxZoom, placementZoom);
        elementGroup.vertexLength += 4;

        element.add(triangleIndex, triangleIndex + 1, triangleIndex + 2);
        element.add(triangleIndex + 1, triangleIndex + 2, triangleIndex + 3);
        elementGroup.elementLength += 2;
    }

};

SymbolBucket.prototype.getDependencies = function(tile, actor, callback) {
    var firstdone = false;
    this.getTextDependencies(tile, actor, done);
    this.getIconDependencies(tile, actor, done);
    function done(err) {
        if (err || firstdone) return callback(err);
        firstdone = true;
    }
};

SymbolBucket.prototype.getIconDependencies = function(tile, actor, callback) {
    if (this.layoutProperties['icon-image']) {
        var features = this.features;
        var icons = resolveIcons(features, this.layoutProperties);

        if (icons.length) {
            actor.send('get icons', { icons: icons }, setIcons.bind(this));
        } else {
            callback();
        }
    } else {
        callback();
    }

    function setIcons(err, newicons) {
        if (err) return callback(err);
        this.icons = newicons;
        callback();
    }
};

SymbolBucket.prototype.getTextDependencies = function(tile, actor, callback) {
    var features = this.features;
    var fontstack = this.layoutProperties['text-font'];

    var stacks = this.stacks = tile.stacks;
    if (stacks[fontstack] === undefined) {
        stacks[fontstack] = {};
    }
    var stack = stacks[fontstack];

    var data = resolveText(features, this.layoutProperties, stack);
    this.textFeatures = data.textFeatures;

    actor.send('get glyphs', {
        uid: tile.uid,
        fontstack: fontstack,
        codepoints: data.codepoints
    }, function(err, newstack) {
        if (err) return callback(err);

        for (var codepoint in newstack) {
            stack[codepoint] = newstack[codepoint];
        }

        callback();
    });
};

SymbolBucket.prototype.addToDebugBuffers = function() {

    this.elementGroups.collisionBox = new ElementGroups(this.buffers.collisionBoxVertex);
    this.elementGroups.collisionBox.makeRoomFor(0);
    var buffer = this.buffers.collisionBoxVertex;
    var angle = -this.collision.angle;
    var yStretch = this.collision.yStretch;

    for (var j = 0; j < this.symbolInstances.length; j++) {
        for (var i = 0; i < 2; i++) {
            var feature = this.symbolInstances[j][i === 0 ? 'textCollisionFeature' : 'iconCollisionFeature'];
            if (!feature) continue;
            var boxes = feature.boxes;

            for (var b = 0; b < boxes.length; b++) {
                var box = boxes[b];
                var anchor = box.anchor;

                var tl = new Point(box.x1, box.y1 * yStretch)._rotate(angle);
                var tr = new Point(box.x2, box.y1 * yStretch)._rotate(angle);
                var bl = new Point(box.x1, box.y2 * yStretch)._rotate(angle);
                var br = new Point(box.x2, box.y2 * yStretch)._rotate(angle);

                var maxZoom = Math.max(0, Math.min(25, this.collision.zoom + Math.log(box.maxScale) / Math.LN2));
                var placementZoom = Math.max(0, Math.min(25, this.collision.zoom + Math.log(box.placementScale) / Math.LN2));

                buffer.add(anchor, tl, maxZoom, placementZoom);
                buffer.add(anchor, tr, maxZoom, placementZoom);
                buffer.add(anchor, tr, maxZoom, placementZoom);
                buffer.add(anchor, br, maxZoom, placementZoom);
                buffer.add(anchor, br, maxZoom, placementZoom);
                buffer.add(anchor, bl, maxZoom, placementZoom);
                buffer.add(anchor, bl, maxZoom, placementZoom);
                buffer.add(anchor, tl, maxZoom, placementZoom);

                this.elementGroups.collisionBox.current.vertexLength += 8;
            }
        }
    }
};

function SymbolInstance(anchor, line, shapedText, shapedIcon, layout, addToBuffers,
                        textBoxScale, textPadding, textAlongLine,
                        iconBoxScale, iconPadding, iconAlongLine) {

    this.x = anchor.x;
    this.y = anchor.y;
    this.hasText = !!shapedText;
    this.hasIcon = !!shapedIcon;

    if (this.hasText) {
        this.glyphQuads = addToBuffers ? getGlyphQuads(anchor, shapedText, textBoxScale, line, layout, textAlongLine) : [];
        this.textCollisionFeature = new CollisionFeature(line, anchor, shapedText, textBoxScale, textPadding, textAlongLine);
    }

    if (this.hasIcon) {
        this.iconQuads = addToBuffers ? getIconQuads(anchor, shapedIcon, iconBoxScale, line, layout, iconAlongLine) : [];
        this.iconCollisionFeature = new CollisionFeature(line, anchor, shapedIcon, iconBoxScale, iconPadding, iconAlongLine);
    }
}

},{"../symbol/anchor":68,"../symbol/clip_line":71,"../symbol/collision_feature":73,"../symbol/get_anchors":75,"../symbol/mergelines":78,"../symbol/quads":79,"../symbol/resolve_icons":80,"../symbol/resolve_text":81,"../symbol/shaping":82,"../util/token":106,"./element_groups":22,"point-geometry":124}],27:[function(require,module,exports){
'use strict';

module.exports = Coordinate;

/**
 * A coordinate is a column, row, zoom combination, often used
 * as the data component of a tile.
 *
 * @param {Number} column
 * @param {Number} row
 * @param {Number} zoom
 * @private
 */
function Coordinate(column, row, zoom) {
    this.column = column;
    this.row = row;
    this.zoom = zoom;
}

Coordinate.prototype = {

    /**
     * Create a clone of this coordinate that can be mutated without
     * changing the original coordinate
     *
     * @returns {Coordinate} clone
     * @private
     * var coord = new Coordinate(0, 0, 0);
     * var c2 = coord.clone();
     * // since coord is cloned, modifying a property of c2 does
     * // not modify it.
     * c2.zoom = 2;
     */
    clone: function() {
        return new Coordinate(this.column, this.row, this.zoom);
    },

    /**
     * Zoom this coordinate to a given zoom level. This returns a new
     * coordinate object, not mutating the old one.
     *
     * @param {Number} zoom
     * @returns {Coordinate} zoomed coordinate
     * @private
     * @example
     * var coord = new Coordinate(0, 0, 0);
     * var c2 = coord.zoomTo(1);
     * c2 // equals new Coordinate(0, 0, 1);
     */
    zoomTo: function(zoom) { return this.clone()._zoomTo(zoom); },

    /**
     * Subtract the column and row values of this coordinate from those
     * of another coordinate. The other coordinat will be zoomed to the
     * same level as `this` before the subtraction occurs
     *
     * @param {Coordinate} c other coordinate
     * @returns {Coordinate} result
     * @private
     */
    sub: function(c) { return this.clone()._sub(c); },

    _zoomTo: function(zoom) {
        var scale = Math.pow(2, zoom - this.zoom);
        this.column *= scale;
        this.row *= scale;
        this.zoom = zoom;
        return this;
    },

    _sub: function(c) {
        c = c.zoomTo(this.zoom);
        this.column -= c.column;
        this.row -= c.row;
        return this;
    }
};

},{}],28:[function(require,module,exports){
'use strict';

module.exports = LatLng;

var wrap = require('../util/util').wrap;

/**
 * Create a latitude, longitude object from a given latitude and longitude pair in degrees.
 *
 * @class LatLng
 * @classdesc A representation of a latitude and longitude point, in degrees.
 * @param {number} lat latitude
 * @param {number} lng longitude
 * @example
 * var latlng = new mapboxgl.LatLng(37.76, -122.44);
 */
function LatLng(lat, lng) {
    if (isNaN(lat) || isNaN(lng)) {
        throw new Error('Invalid LatLng object: (' + lat + ', ' + lng + ')');
    }
    this.lat = +lat;
    this.lng = +lng;
}

/**
 * Return a new `LatLng` object whose longitude is wrapped to the range (-180, 180).
 *
 * @returns {LatLng} wrapped LatLng object
 * @example
 * var point = mapboxgl.LatLng(0, 200);
 * var wrapped = point.wrap();
 * wrapped.lng; // = -160
 */
LatLng.prototype.wrap = function () {
    return new LatLng(this.lat, wrap(this.lng, -180, 180));
};

/**
 * Convert an array to a `LatLng` object, or return an existing `LatLng` object
 * unchanged.
 *
 * @param {Array<number>|LatLng} input `input` to convert
 * @returns {LatLng} LatLng object or original input
 * @example
 * var ll = mapboxgl.LatLng.convert([10, 10]);
 * var ll2 = new mapboxgl.LatLng(10, 10);
 * ll // = ll2
 */
LatLng.convert = function (input) {
    if (input instanceof LatLng) {
        return input;
    }
    if (Array.isArray(input)) {
        return new LatLng(input[0], input[1]);
    }
    return input;
};

},{"../util/util":107}],29:[function(require,module,exports){
'use strict';

module.exports = LatLngBounds;

var LatLng = require('./lat_lng');

/**
 * Creates a bounding box from the given pair of points. If parameteres are omitted, a `null` bounding box is created.
 *
 * @class LatLngBounds
 * @classdesc A representation of rectangular box on the earth, defined by its southwest and northeast points in latitude and longitude.
 * @param {LatLng} sw southwest
 * @param {LatLng} ne northeast
 * @example
 * var sw = new mapboxgl.LatLng(0, 0);
 * var ne = new mapboxgl.LatLng(10, -10);
 * var bounds = new mapboxgl.LatLngBounds(sw, ne);
 *
 */
function LatLngBounds(sw, ne) {
    if (!sw) return;

    var latlngs = ne ? [sw, ne] : sw;

    for (var i = 0, len = latlngs.length; i < len; i++) {
        this.extend(latlngs[i]);
    }
}

LatLngBounds.prototype = {

    /**
     * Extend the bounds to include a given LatLng or LatLngBounds.
     *
     * @param {LatLng|LatLngBounds} obj object to extend to
     * @returns {LatLngBounds} `this`
     */
    extend: function(obj) {
        var sw = this._sw,
            ne = this._ne,
            sw2, ne2;

        if (obj instanceof LatLng) {
            sw2 = obj;
            ne2 = obj;

        } else if (obj instanceof LatLngBounds) {
            sw2 = obj._sw;
            ne2 = obj._ne;

            if (!sw2 || !ne2) return this;

        } else {
            return obj ? this.extend(LatLng.convert(obj) || LatLngBounds.convert(obj)) : this;
        }

        if (!sw && !ne) {
            this._sw = new LatLng(sw2.lat, sw2.lng);
            this._ne = new LatLng(ne2.lat, ne2.lng);

        } else {
            sw.lat = Math.min(sw2.lat, sw.lat);
            sw.lng = Math.min(sw2.lng, sw.lng);
            ne.lat = Math.max(ne2.lat, ne.lat);
            ne.lng = Math.max(ne2.lng, ne.lng);
        }

        return this;
    },

    /**
     * Get the point equidistant from this box's corners
     * @returns {LatLng} centerpoint
     * @example
     * var bounds = new mapboxgl.LatLngBounds(
     *   new mapboxgl.LatLng(10, 10),
     *   new mapboxgl.LatLng(-10, -10);
     * bounds.getCenter(); // equals mapboxgl.LatLng(0, 0)
     */
    getCenter: function() {
        return new LatLng((this._sw.lat + this._ne.lat) / 2, (this._sw.lng + this._ne.lng) / 2);
    },

    /**
     * Get southwest corner
     * @returns {LatLng} southwest
     */
    getSouthWest: function() { return this._sw; },

    /**
     * Get northeast corner
     * @returns {LatLng} northeast
     */
    getNorthEast: function() { return this._ne; },

    /**
     * Get northwest corner
     * @returns {LatLng} northwest
     */
    getNorthWest: function() { return new LatLng(this.getNorth(), this.getWest()); },

    /**
     * Get southeast corner
     * @returns {LatLng} southeast
     */
    getSouthEast: function() { return new LatLng(this.getSouth(), this.getEast()); },

    /**
     * Get west edge longitude
     * @returns {number} west
     */
    getWest:  function() { return this._sw.lng; },

    /**
     * Get south edge latitude
     * @returns {number} south
     */
    getSouth: function() { return this._sw.lat; },

    /**
     * Get east edge longitude
     * @returns {number} east
     */
    getEast:  function() { return this._ne.lng; },

    /**
     * Get north edge latitude
     * @returns {number} north
     */
    getNorth: function() { return this._ne.lat; }
};

/**
 * constructs LatLngBounds from an array if necessary
 * @param {LatLngBounds|*} a any input
 * @returns {LatLngBounds|false}
 * @example
 * // calls LatLng.convert internally to
 * // support arrays as latlng values
 * LatLngBounds.convert([[-10, -10], [10, 10]]);
 */
LatLngBounds.convert = function (a) {
    if (!a || a instanceof LatLngBounds) return a;
    return new LatLngBounds(a);
};

},{"./lat_lng":28}],30:[function(require,module,exports){
'use strict';

var LatLng = require('./lat_lng'),
    Point = require('point-geometry'),
    Coordinate = require('./coordinate'),
    wrap = require('../util/util').wrap,
    interp = require('../util/interpolate'),
    vec4 = require('gl-matrix').vec4,
    mat4 = require('gl-matrix').mat4;

module.exports = Transform;

/*
 * A single transform, generally used for a single tile to be
 * scaled, rotated, and zoomed.
 *
 * @param {Number} minZoom
 * @param {Number} maxZoom
 * @private
 */
function Transform(minZoom, maxZoom) {
    this.tileSize = 512; // constant

    this._minZoom = minZoom || 0;
    this._maxZoom = maxZoom || 22;

    this.latRange = [-85.05113, 85.05113];

    this.width = 0;
    this.height = 0;
    this.zoom = 0;
    this.center = new LatLng(0, 0);
    this.angle = 0;
    this._altitude = 1.5;
    this._pitch = 0;
}

Transform.prototype = {
    get minZoom() { return this._minZoom; },
    set minZoom(zoom) {
        this._minZoom = zoom;
        this.zoom = Math.max(this.zoom, zoom);
    },

    get maxZoom() { return this._maxZoom; },
    set maxZoom(zoom) {
        this._maxZoom = zoom;
        this.zoom = Math.min(this.zoom, zoom);
    },

    get worldSize() {
        return this.tileSize * this.scale;
    },

    get centerPoint() {
        return this.size._div(2);
    },

    get size() {
        return new Point(this.width, this.height);
    },

    get bearing() {
        return -this.angle / Math.PI * 180;
    },
    set bearing(bearing) {
        this.angle = -wrap(bearing, -180, 180) * Math.PI / 180;
    },

    get pitch() {
        return this._pitch / Math.PI * 180;
    },
    set pitch(pitch) {
        this._pitch = Math.min(60, pitch) / 180 * Math.PI;
    },

    get altitude() {
        return this._altitude;
    },
    set altitude(altitude) {
        this._altitude = Math.max(0.75, altitude);
    },

    get zoom() { return this._zoom; },
    set zoom(zoom) {
        zoom = Math.min(Math.max(zoom, this.minZoom), this.maxZoom);
        this._zoom = zoom;
        this.scale = this.zoomScale(zoom);
        this.tileZoom = Math.floor(zoom);
        this.zoomFraction = zoom - this.tileZoom;
        this._constrain();
    },

    zoomScale: function(zoom) { return Math.pow(2, zoom); },
    scaleZoom: function(scale) { return Math.log(scale) / Math.LN2; },

    project: function(latlng, worldSize) {
        return new Point(
            this.lngX(latlng.lng, worldSize),
            this.latY(latlng.lat, worldSize));
    },

    unproject: function(point, worldSize) {
        return new LatLng(
            this.yLat(point.y, worldSize),
            this.xLng(point.x, worldSize));
    },

    get x() { return this.lngX(this.center.lng); },
    get y() { return this.latY(this.center.lat); },

    get point() { return new Point(this.x, this.y); },

    /**
     * lat/lon <-> absolute pixel coords conversion
     * @param {Number} lon
     * @param {Number} [worldSize=this.worldSize]
     * @returns {Number} pixel coordinate
     * @private
     */
    lngX: function(lon, worldSize) {
        return (180 + lon) * (worldSize || this.worldSize) / 360;
    },
    /**
     * latitude to absolute y coord
     *
     * @param {Number} lat
     * @param {Number} [worldSize=this.worldSize]
     * @returns {Number} pixel coordinate
     * @private
     */
    latY: function(lat, worldSize) {
        var y = 180 / Math.PI * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
        return (180 - y) * (worldSize || this.worldSize) / 360;
    },

    xLng: function(x, worldSize) {
        return x * 360 / (worldSize || this.worldSize) - 180;
    },
    yLat: function(y, worldSize) {
        var y2 = 180 - y * 360 / (worldSize || this.worldSize);
        return 360 / Math.PI * Math.atan(Math.exp(y2 * Math.PI / 180)) - 90;
    },

    panBy: function(offset) {
        var point = this.centerPoint._add(offset);
        this.center = this.pointLocation(point);
        this._constrain();
    },

    setLocationAtPoint: function(latlng, point) {
        var c = this.locationCoordinate(latlng);
        var coordAtPoint = this.pointCoordinate(point);
        var coordCenter = this.pointCoordinate(this.centerPoint);

        var translate = coordAtPoint._sub(c);
        this.center = this.coordinateLocation(coordCenter._sub(translate));

        this._constrain();
    },

    setZoomAround: function(zoom, center) {
        var p = this.locationPoint(center);
        this.zoom = zoom;
        this.setLocationAtPoint(center, p);
    },

    setBearingAround: function(bearing, center) {
        var p = this.locationPoint(center);
        this.bearing = bearing;
        this.setLocationAtPoint(center, p);
    },

    /**
     * Given a location, return the screen point that corresponds to it
     * @param {LatLng} latlng location
     * @returns {Point} screen point
     */
    locationPoint: function(latlng) {
        return this.coordinatePoint(this.locationCoordinate(latlng));
    },

    /**
     * Given a point on screen, return its latlng
     * @param {Point} p screen point
     * @returns {LatLng} latlng location
     */
    pointLocation: function(p) {
        return this.coordinateLocation(this.pointCoordinate(p));
    },

    /**
     * Given a geographical latlng, return an unrounded
     * coordinate that represents it at this transform's zoom level and
     * worldsize.
     * @param {LatLng} latlng
     * @returns {Coordinate}
     */
    locationCoordinate: function(latlng) {
        var k = this.zoomScale(this.tileZoom) / this.worldSize;
        return new Coordinate(
            this.lngX(latlng.lng) * k,
            this.latY(latlng.lat) * k,
            this.tileZoom);
    },

    /**
     * Given a Coordinate, return its geographical position.
     * @param {Coordinate} coord
     * @returns {LatLng} latlng
     */
    coordinateLocation: function(coord) {
        var worldSize = this.zoomScale(coord.zoom);
        return new LatLng(
            this.yLat(coord.row, worldSize),
            this.xLng(coord.column, worldSize));
    },

    pointCoordinate: function(p, targetZ) {

        if (targetZ === undefined) targetZ = 0;

        var matrix = this.coordinatePointMatrix(this.tileZoom);
        var inverted = mat4.invert(new Float64Array(16), matrix);

        if (!inverted) throw "failed to invert matrix";

        // since we don't know the correct projected z value for the point,
        // unproject two points to get a line and then find the point on that
        // line with z=0

        var coord0 = vec4.transformMat4([], [p.x, p.y, 0, 1], inverted);
        var coord1 = vec4.transformMat4([], [p.x, p.y, 1, 1], inverted);

        var w0 = coord0[3];
        var w1 = coord1[3];
        var x0 = coord0[0] / w0;
        var x1 = coord1[0] / w1;
        var y0 = coord0[1] / w0;
        var y1 = coord1[1] / w1;
        var z0 = coord0[2] / w0;
        var z1 = coord1[2] / w1;


        var t = z0 === z1 ? 0 : (targetZ - z0) / (z1 - z0);

        return new Coordinate(
            interp(x0, x1, t),
            interp(y0, y1, t),
            this.tileZoom);
    },

    /**
     * Given a coordinate, return the screen point that corresponds to it
     * @param {Coordinate} coord
     * @returns {Point} screen point
     */
    coordinatePoint: function(coord) {
        var matrix = this.coordinatePointMatrix(coord.zoom);
        var p = vec4.transformMat4([], [coord.column, coord.row, 0, 1], matrix);
        return new Point(p[0] / p[3], p[1] / p[3]);
    },

    coordinatePointMatrix: function(z) {
        var proj = this.getProjMatrix();
        var scale = this.worldSize / this.zoomScale(z);
        mat4.scale(proj, proj, [scale, scale, 1]);
        mat4.multiply(proj, this.getPixelMatrix(), proj);
        return proj;
    },

    /**
     * converts gl coordinates -1..1 to pixels 0..width
     * @returns {Object} matrix
     */
    getPixelMatrix: function() {
        var m = mat4.create();
        mat4.scale(m, m, [this.width / 2, -this.height / 2, 1]);
        mat4.translate(m, m, [1, -1, 0]);
        return m;
    },

    _constrain: function() {
        if (!this.center) return;

        var minY, maxY, minX, maxX, sy, sx, x2, y2,
            size = this.size;

        if (this.latRange) {
            minY = this.latY(this.latRange[1]);
            maxY = this.latY(this.latRange[0]);
            sy = maxY - minY < size.y ? size.y / (maxY - minY) : 0;
        }

        if (this.lngRange) {
            minX = this.lngX(this.lngRange[0]);
            maxX = this.lngX(this.lngRange[1]);
            sx = maxX - minX < size.x ? size.x / (maxX - minX) : 0;
        }

        // how much the map should scale to fit the screen into given latitude/longitude ranges
        var s = Math.max(sx || 0, sy || 0);

        if (s) {
            this.center = this.unproject(new Point(
                sx ? (maxX + minX) / 2 : this.x,
                sy ? (maxY + minY) / 2 : this.y));
            this.zoom += this.scaleZoom(s);
            return;
        }

        if (this.latRange) {
            var y = this.y,
                h2 = size.y / 2;

            if (y - h2 < minY) y2 = minY + h2;
            if (y + h2 > maxY) y2 = maxY - h2;
        }

        if (this.lngRange) {
            var x = this.x,
                w2 = size.x / 2;

            if (x - w2 < minX) x2 = minX + w2;
            if (x + w2 > maxX) x2 = maxX - w2;
        }

        // pan the map if the screen goes off the range
        if (x2 !== undefined || y2 !== undefined) {
            this.center = this.unproject(new Point(
                x2 !== undefined ? x2 : this.x,
                y2 !== undefined ? y2 : this.y));
        }
    },

    getProjMatrix: function() {
        var m = new Float64Array(16);

        // Find the distance from the center point to the center top in altitude units using law of sines.
        var halfFov = Math.atan(0.5 / this.altitude);
        var topHalfSurfaceDistance = Math.sin(halfFov) * this.altitude / Math.sin(Math.PI / 2 - this._pitch - halfFov);
        // Calculate z value of the farthest fragment that should be rendered.
        var farZ = Math.cos(Math.PI / 2 - this._pitch) * topHalfSurfaceDistance + this.altitude;

        mat4.perspective(m, 2 * Math.atan((this.height / 2) / this.altitude), this.width / this.height, 0.1, farZ);

        mat4.translate(m, m, [0, 0, -this.altitude]);

        // After the rotateX, z values are in pixel units. Convert them to
        // altitude unites. 1 altitude unit = the screen height.
        mat4.scale(m, m, [1, -1, 1 / this.height]);

        mat4.rotateX(m, m, this._pitch);
        mat4.rotateZ(m, m, this.angle);
        mat4.translate(m, m, [-this.x, -this.y, 0]);
        return m;
    }
};

},{"../util/interpolate":103,"../util/util":107,"./coordinate":27,"./lat_lng":28,"gl-matrix":115,"point-geometry":124}],31:[function(require,module,exports){
'use strict';

// Font data From Hershey Simplex Font
// http://paulbourke.net/dataformats/hershey/
var simplexFont = {
    " ": [16, []],
    "!": [10, [5, 21, 5, 7, -1, -1, 5, 2, 4, 1, 5, 0, 6, 1, 5, 2]],
    "\"": [16, [4, 21, 4, 14, -1, -1, 12, 21, 12, 14]],
    "#": [21, [11, 25, 4, -7, -1, -1, 17, 25, 10, -7, -1, -1, 4, 12, 18, 12, -1, -1, 3, 6, 17, 6]],
    "$": [20, [8, 25, 8, -4, -1, -1, 12, 25, 12, -4, -1, -1, 17, 18, 15, 20, 12, 21, 8, 21, 5, 20, 3, 18, 3, 16, 4, 14, 5, 13, 7, 12, 13, 10, 15, 9, 16, 8, 17, 6, 17, 3, 15, 1, 12, 0, 8, 0, 5, 1, 3, 3]],
    "%": [24, [21, 21, 3, 0, -1, -1, 8, 21, 10, 19, 10, 17, 9, 15, 7, 14, 5, 14, 3, 16, 3, 18, 4, 20, 6, 21, 8, 21, 10, 20, 13, 19, 16, 19, 19, 20, 21, 21, -1, -1, 17, 7, 15, 6, 14, 4, 14, 2, 16, 0, 18, 0, 20, 1, 21, 3, 21, 5, 19, 7, 17, 7]],
    "&": [26, [23, 12, 23, 13, 22, 14, 21, 14, 20, 13, 19, 11, 17, 6, 15, 3, 13, 1, 11, 0, 7, 0, 5, 1, 4, 2, 3, 4, 3, 6, 4, 8, 5, 9, 12, 13, 13, 14, 14, 16, 14, 18, 13, 20, 11, 21, 9, 20, 8, 18, 8, 16, 9, 13, 11, 10, 16, 3, 18, 1, 20, 0, 22, 0, 23, 1, 23, 2]],
    "'": [10, [5, 19, 4, 20, 5, 21, 6, 20, 6, 18, 5, 16, 4, 15]],
    "(": [14, [11, 25, 9, 23, 7, 20, 5, 16, 4, 11, 4, 7, 5, 2, 7, -2, 9, -5, 11, -7]],
    ")": [14, [3, 25, 5, 23, 7, 20, 9, 16, 10, 11, 10, 7, 9, 2, 7, -2, 5, -5, 3, -7]],
    "*": [16, [8, 21, 8, 9, -1, -1, 3, 18, 13, 12, -1, -1, 13, 18, 3, 12]],
    "+": [26, [13, 18, 13, 0, -1, -1, 4, 9, 22, 9]],
    ",": [10, [6, 1, 5, 0, 4, 1, 5, 2, 6, 1, 6, -1, 5, -3, 4, -4]],
    "-": [26, [4, 9, 22, 9]],
    ".": [10, [5, 2, 4, 1, 5, 0, 6, 1, 5, 2]],
    "/": [22, [20, 25, 2, -7]],
    "0": [20, [9, 21, 6, 20, 4, 17, 3, 12, 3, 9, 4, 4, 6, 1, 9, 0, 11, 0, 14, 1, 16, 4, 17, 9, 17, 12, 16, 17, 14, 20, 11, 21, 9, 21]],
    "1": [20, [6, 17, 8, 18, 11, 21, 11, 0]],
    "2": [20, [4, 16, 4, 17, 5, 19, 6, 20, 8, 21, 12, 21, 14, 20, 15, 19, 16, 17, 16, 15, 15, 13, 13, 10, 3, 0, 17, 0]],
    "3": [20, [5, 21, 16, 21, 10, 13, 13, 13, 15, 12, 16, 11, 17, 8, 17, 6, 16, 3, 14, 1, 11, 0, 8, 0, 5, 1, 4, 2, 3, 4]],
    "4": [20, [13, 21, 3, 7, 18, 7, -1, -1, 13, 21, 13, 0]],
    "5": [20, [15, 21, 5, 21, 4, 12, 5, 13, 8, 14, 11, 14, 14, 13, 16, 11, 17, 8, 17, 6, 16, 3, 14, 1, 11, 0, 8, 0, 5, 1, 4, 2, 3, 4]],
    "6": [20, [16, 18, 15, 20, 12, 21, 10, 21, 7, 20, 5, 17, 4, 12, 4, 7, 5, 3, 7, 1, 10, 0, 11, 0, 14, 1, 16, 3, 17, 6, 17, 7, 16, 10, 14, 12, 11, 13, 10, 13, 7, 12, 5, 10, 4, 7]],
    "7": [20, [17, 21, 7, 0, -1, -1, 3, 21, 17, 21]],
    "8": [20, [8, 21, 5, 20, 4, 18, 4, 16, 5, 14, 7, 13, 11, 12, 14, 11, 16, 9, 17, 7, 17, 4, 16, 2, 15, 1, 12, 0, 8, 0, 5, 1, 4, 2, 3, 4, 3, 7, 4, 9, 6, 11, 9, 12, 13, 13, 15, 14, 16, 16, 16, 18, 15, 20, 12, 21, 8, 21]],
    "9": [20, [16, 14, 15, 11, 13, 9, 10, 8, 9, 8, 6, 9, 4, 11, 3, 14, 3, 15, 4, 18, 6, 20, 9, 21, 10, 21, 13, 20, 15, 18, 16, 14, 16, 9, 15, 4, 13, 1, 10, 0, 8, 0, 5, 1, 4, 3]],
    ":": [10, [5, 14, 4, 13, 5, 12, 6, 13, 5, 14, -1, -1, 5, 2, 4, 1, 5, 0, 6, 1, 5, 2]],
    ";": [10, [5, 14, 4, 13, 5, 12, 6, 13, 5, 14, -1, -1, 6, 1, 5, 0, 4, 1, 5, 2, 6, 1, 6, -1, 5, -3, 4, -4]],
    "<": [24, [20, 18, 4, 9, 20, 0]],
    "=": [26, [4, 12, 22, 12, -1, -1, 4, 6, 22, 6]],
    ">": [24, [4, 18, 20, 9, 4, 0]],
    "?": [18, [3, 16, 3, 17, 4, 19, 5, 20, 7, 21, 11, 21, 13, 20, 14, 19, 15, 17, 15, 15, 14, 13, 13, 12, 9, 10, 9, 7, -1, -1, 9, 2, 8, 1, 9, 0, 10, 1, 9, 2]],
    "@": [27, [18, 13, 17, 15, 15, 16, 12, 16, 10, 15, 9, 14, 8, 11, 8, 8, 9, 6, 11, 5, 14, 5, 16, 6, 17, 8, -1, -1, 12, 16, 10, 14, 9, 11, 9, 8, 10, 6, 11, 5, -1, -1, 18, 16, 17, 8, 17, 6, 19, 5, 21, 5, 23, 7, 24, 10, 24, 12, 23, 15, 22, 17, 20, 19, 18, 20, 15, 21, 12, 21, 9, 20, 7, 19, 5, 17, 4, 15, 3, 12, 3, 9, 4, 6, 5, 4, 7, 2, 9, 1, 12, 0, 15, 0, 18, 1, 20, 2, 21, 3, -1, -1, 19, 16, 18, 8, 18, 6, 19, 5]],
    "A": [18, [9, 21, 1, 0, -1, -1, 9, 21, 17, 0, -1, -1, 4, 7, 14, 7]],
    "B": [21, [4, 21, 4, 0, -1, -1, 4, 21, 13, 21, 16, 20, 17, 19, 18, 17, 18, 15, 17, 13, 16, 12, 13, 11, -1, -1, 4, 11, 13, 11, 16, 10, 17, 9, 18, 7, 18, 4, 17, 2, 16, 1, 13, 0, 4, 0]],
    "C": [21, [18, 16, 17, 18, 15, 20, 13, 21, 9, 21, 7, 20, 5, 18, 4, 16, 3, 13, 3, 8, 4, 5, 5, 3, 7, 1, 9, 0, 13, 0, 15, 1, 17, 3, 18, 5]],
    "D": [21, [4, 21, 4, 0, -1, -1, 4, 21, 11, 21, 14, 20, 16, 18, 17, 16, 18, 13, 18, 8, 17, 5, 16, 3, 14, 1, 11, 0, 4, 0]],
    "E": [19, [4, 21, 4, 0, -1, -1, 4, 21, 17, 21, -1, -1, 4, 11, 12, 11, -1, -1, 4, 0, 17, 0]],
    "F": [18, [4, 21, 4, 0, -1, -1, 4, 21, 17, 21, -1, -1, 4, 11, 12, 11]],
    "G": [21, [18, 16, 17, 18, 15, 20, 13, 21, 9, 21, 7, 20, 5, 18, 4, 16, 3, 13, 3, 8, 4, 5, 5, 3, 7, 1, 9, 0, 13, 0, 15, 1, 17, 3, 18, 5, 18, 8, -1, -1, 13, 8, 18, 8]],
    "H": [22, [4, 21, 4, 0, -1, -1, 18, 21, 18, 0, -1, -1, 4, 11, 18, 11]],
    "I": [8, [4, 21, 4, 0]],
    "J": [16, [12, 21, 12, 5, 11, 2, 10, 1, 8, 0, 6, 0, 4, 1, 3, 2, 2, 5, 2, 7]],
    "K": [21, [4, 21, 4, 0, -1, -1, 18, 21, 4, 7, -1, -1, 9, 12, 18, 0]],
    "L": [17, [4, 21, 4, 0, -1, -1, 4, 0, 16, 0]],
    "M": [24, [4, 21, 4, 0, -1, -1, 4, 21, 12, 0, -1, -1, 20, 21, 12, 0, -1, -1, 20, 21, 20, 0]],
    "N": [22, [4, 21, 4, 0, -1, -1, 4, 21, 18, 0, -1, -1, 18, 21, 18, 0]],
    "O": [22, [9, 21, 7, 20, 5, 18, 4, 16, 3, 13, 3, 8, 4, 5, 5, 3, 7, 1, 9, 0, 13, 0, 15, 1, 17, 3, 18, 5, 19, 8, 19, 13, 18, 16, 17, 18, 15, 20, 13, 21, 9, 21]],
    "P": [21, [4, 21, 4, 0, -1, -1, 4, 21, 13, 21, 16, 20, 17, 19, 18, 17, 18, 14, 17, 12, 16, 11, 13, 10, 4, 10]],
    "Q": [22, [9, 21, 7, 20, 5, 18, 4, 16, 3, 13, 3, 8, 4, 5, 5, 3, 7, 1, 9, 0, 13, 0, 15, 1, 17, 3, 18, 5, 19, 8, 19, 13, 18, 16, 17, 18, 15, 20, 13, 21, 9, 21, -1, -1, 12, 4, 18, -2]],
    "R": [21, [4, 21, 4, 0, -1, -1, 4, 21, 13, 21, 16, 20, 17, 19, 18, 17, 18, 15, 17, 13, 16, 12, 13, 11, 4, 11, -1, -1, 11, 11, 18, 0]],
    "S": [20, [17, 18, 15, 20, 12, 21, 8, 21, 5, 20, 3, 18, 3, 16, 4, 14, 5, 13, 7, 12, 13, 10, 15, 9, 16, 8, 17, 6, 17, 3, 15, 1, 12, 0, 8, 0, 5, 1, 3, 3]],
    "T": [16, [8, 21, 8, 0, -1, -1, 1, 21, 15, 21]],
    "U": [22, [4, 21, 4, 6, 5, 3, 7, 1, 10, 0, 12, 0, 15, 1, 17, 3, 18, 6, 18, 21]],
    "V": [18, [1, 21, 9, 0, -1, -1, 17, 21, 9, 0]],
    "W": [24, [2, 21, 7, 0, -1, -1, 12, 21, 7, 0, -1, -1, 12, 21, 17, 0, -1, -1, 22, 21, 17, 0]],
    "X": [20, [3, 21, 17, 0, -1, -1, 17, 21, 3, 0]],
    "Y": [18, [1, 21, 9, 11, 9, 0, -1, -1, 17, 21, 9, 11]],
    "Z": [20, [17, 21, 3, 0, -1, -1, 3, 21, 17, 21, -1, -1, 3, 0, 17, 0]],
    "[": [14, [4, 25, 4, -7, -1, -1, 5, 25, 5, -7, -1, -1, 4, 25, 11, 25, -1, -1, 4, -7, 11, -7]],
    "\\": [14, [0, 21, 14, -3]],
    "]": [14, [9, 25, 9, -7, -1, -1, 10, 25, 10, -7, -1, -1, 3, 25, 10, 25, -1, -1, 3, -7, 10, -7]],
    "^": [16, [6, 15, 8, 18, 10, 15, -1, -1, 3, 12, 8, 17, 13, 12, -1, -1, 8, 17, 8, 0]],
    "_": [16, [0, -2, 16, -2]],
    "`": [10, [6, 21, 5, 20, 4, 18, 4, 16, 5, 15, 6, 16, 5, 17]],
    "a": [19, [15, 14, 15, 0, -1, -1, 15, 11, 13, 13, 11, 14, 8, 14, 6, 13, 4, 11, 3, 8, 3, 6, 4, 3, 6, 1, 8, 0, 11, 0, 13, 1, 15, 3]],
    "b": [19, [4, 21, 4, 0, -1, -1, 4, 11, 6, 13, 8, 14, 11, 14, 13, 13, 15, 11, 16, 8, 16, 6, 15, 3, 13, 1, 11, 0, 8, 0, 6, 1, 4, 3]],
    "c": [18, [15, 11, 13, 13, 11, 14, 8, 14, 6, 13, 4, 11, 3, 8, 3, 6, 4, 3, 6, 1, 8, 0, 11, 0, 13, 1, 15, 3]],
    "d": [19, [15, 21, 15, 0, -1, -1, 15, 11, 13, 13, 11, 14, 8, 14, 6, 13, 4, 11, 3, 8, 3, 6, 4, 3, 6, 1, 8, 0, 11, 0, 13, 1, 15, 3]],
    "e": [18, [3, 8, 15, 8, 15, 10, 14, 12, 13, 13, 11, 14, 8, 14, 6, 13, 4, 11, 3, 8, 3, 6, 4, 3, 6, 1, 8, 0, 11, 0, 13, 1, 15, 3]],
    "f": [12, [10, 21, 8, 21, 6, 20, 5, 17, 5, 0, -1, -1, 2, 14, 9, 14]],
    "g": [19, [15, 14, 15, -2, 14, -5, 13, -6, 11, -7, 8, -7, 6, -6, -1, -1, 15, 11, 13, 13, 11, 14, 8, 14, 6, 13, 4, 11, 3, 8, 3, 6, 4, 3, 6, 1, 8, 0, 11, 0, 13, 1, 15, 3]],
    "h": [19, [4, 21, 4, 0, -1, -1, 4, 10, 7, 13, 9, 14, 12, 14, 14, 13, 15, 10, 15, 0]],
    "i": [8, [3, 21, 4, 20, 5, 21, 4, 22, 3, 21, -1, -1, 4, 14, 4, 0]],
    "j": [10, [5, 21, 6, 20, 7, 21, 6, 22, 5, 21, -1, -1, 6, 14, 6, -3, 5, -6, 3, -7, 1, -7]],
    "k": [17, [4, 21, 4, 0, -1, -1, 14, 14, 4, 4, -1, -1, 8, 8, 15, 0]],
    "l": [8, [4, 21, 4, 0]],
    "m": [30, [4, 14, 4, 0, -1, -1, 4, 10, 7, 13, 9, 14, 12, 14, 14, 13, 15, 10, 15, 0, -1, -1, 15, 10, 18, 13, 20, 14, 23, 14, 25, 13, 26, 10, 26, 0]],
    "n": [19, [4, 14, 4, 0, -1, -1, 4, 10, 7, 13, 9, 14, 12, 14, 14, 13, 15, 10, 15, 0]],
    "o": [19, [8, 14, 6, 13, 4, 11, 3, 8, 3, 6, 4, 3, 6, 1, 8, 0, 11, 0, 13, 1, 15, 3, 16, 6, 16, 8, 15, 11, 13, 13, 11, 14, 8, 14]],
    "p": [19, [4, 14, 4, -7, -1, -1, 4, 11, 6, 13, 8, 14, 11, 14, 13, 13, 15, 11, 16, 8, 16, 6, 15, 3, 13, 1, 11, 0, 8, 0, 6, 1, 4, 3]],
    "q": [19, [15, 14, 15, -7, -1, -1, 15, 11, 13, 13, 11, 14, 8, 14, 6, 13, 4, 11, 3, 8, 3, 6, 4, 3, 6, 1, 8, 0, 11, 0, 13, 1, 15, 3]],
    "r": [13, [4, 14, 4, 0, -1, -1, 4, 8, 5, 11, 7, 13, 9, 14, 12, 14]],
    "s": [17, [14, 11, 13, 13, 10, 14, 7, 14, 4, 13, 3, 11, 4, 9, 6, 8, 11, 7, 13, 6, 14, 4, 14, 3, 13, 1, 10, 0, 7, 0, 4, 1, 3, 3]],
    "t": [12, [5, 21, 5, 4, 6, 1, 8, 0, 10, 0, -1, -1, 2, 14, 9, 14]],
    "u": [19, [4, 14, 4, 4, 5, 1, 7, 0, 10, 0, 12, 1, 15, 4, -1, -1, 15, 14, 15, 0]],
    "v": [16, [2, 14, 8, 0, -1, -1, 14, 14, 8, 0]],
    "w": [22, [3, 14, 7, 0, -1, -1, 11, 14, 7, 0, -1, -1, 11, 14, 15, 0, -1, -1, 19, 14, 15, 0]],
    "x": [17, [3, 14, 14, 0, -1, -1, 14, 14, 3, 0]],
    "y": [16, [2, 14, 8, 0, -1, -1, 14, 14, 8, 0, 6, -4, 4, -6, 2, -7, 1, -7]],
    "z": [17, [14, 14, 3, 0, -1, -1, 3, 14, 14, 14, -1, -1, 3, 0, 14, 0]],
    "{": [14, [9, 25, 7, 24, 6, 23, 5, 21, 5, 19, 6, 17, 7, 16, 8, 14, 8, 12, 6, 10, -1, -1, 7, 24, 6, 22, 6, 20, 7, 18, 8, 17, 9, 15, 9, 13, 8, 11, 4, 9, 8, 7, 9, 5, 9, 3, 8, 1, 7, 0, 6, -2, 6, -4, 7, -6, -1, -1, 6, 8, 8, 6, 8, 4, 7, 2, 6, 1, 5, -1, 5, -3, 6, -5, 7, -6, 9, -7]],
    "|": [8, [4, 25, 4, -7]],
    "}": [14, [5, 25, 7, 24, 8, 23, 9, 21, 9, 19, 8, 17, 7, 16, 6, 14, 6, 12, 8, 10, -1, -1, 7, 24, 8, 22, 8, 20, 7, 18, 6, 17, 5, 15, 5, 13, 6, 11, 10, 9, 6, 7, 5, 5, 5, 3, 6, 1, 7, 0, 8, -2, 8, -4, 7, -6, -1, -1, 8, 8, 6, 6, 6, 4, 7, 2, 8, 1, 9, -1, 9, -3, 8, -5, 7, -6, 5, -7]],
    "~": [24, [3, 6, 3, 8, 4, 11, 6, 12, 8, 12, 10, 11, 14, 8, 16, 7, 18, 7, 20, 8, 21, 10, -1, -1, 3, 8, 4, 10, 6, 11, 8, 11, 10, 10, 14, 7, 16, 6, 18, 6, 20, 7, 21, 10, 21, 12]]
};

module.exports = function textVertices(text, left, baseline, scale) {
    scale = scale || 1;

    var strokes = [],
        i, len, j, len2, glyph, x, y, prev;

    for (i = 0, len = text.length; i < len; i++) {
        glyph = simplexFont[text[i]];
        if (!glyph) continue;
        prev = null;

        for (j = 0, len2 = glyph[1].length; j < len2; j += 2) {
            if (glyph[1][j] === -1 && glyph[1][j + 1] === -1) {
                prev = null;

            } else {
                x = left + glyph[1][j] * scale;
                y = baseline - glyph[1][j + 1] * scale;
                if (prev) {
                    strokes.push(prev.x, prev.y, x, y);
                }
                prev = {x: x, y: y};
            }
        }
        left += glyph[0] * scale;
    }

    return strokes;
};

},{}],32:[function(require,module,exports){
'use strict';

/**
 * mapboxgl is a A WebGL JavaScript interactive maps library that can render
 * [Mapbox vector tiles](https://www.mapbox.com/blog/vector-tiles/).
 *
 * @module mapboxgl
 * @summary WebGL JavaScript map library
 */

// jshint -W079
var mapboxgl = module.exports = {};

mapboxgl.Map = require('./ui/map');
mapboxgl.Navigation = require('./ui/control/navigation');
mapboxgl.Attribution = require('./ui/control/attribution');
mapboxgl.Popup = require('./ui/popup');

mapboxgl.GeoJSONSource = require('./source/geojson_source');
mapboxgl.VideoSource = require('./source/video_source');

mapboxgl.Style = require('./style/style');

mapboxgl.LatLng = require('./geo/lat_lng');
mapboxgl.LatLngBounds = require('./geo/lat_lng_bounds');
mapboxgl.Point = require('point-geometry');

mapboxgl.Evented = require('./util/evented');
mapboxgl.util = require('./util/util');

mapboxgl.supported = require('./util/browser').supported;

var ajax = require('./util/ajax');
mapboxgl.util.getJSON = ajax.getJSON;
mapboxgl.util.getArrayBuffer = ajax.getArrayBuffer;

var config = require('./util/config');
mapboxgl.config = config;

Object.defineProperty(mapboxgl, 'accessToken', {
    get: function() { return config.ACCESS_TOKEN; },
    set: function(token) { config.ACCESS_TOKEN = token; }
});

},{"./geo/lat_lng":28,"./geo/lat_lng_bounds":29,"./source/geojson_source":46,"./source/video_source":54,"./style/style":62,"./ui/control/attribution":86,"./ui/control/navigation":88,"./ui/map":92,"./ui/popup":93,"./util/ajax":95,"./util/browser":96,"./util/config":100,"./util/evented":101,"./util/util":107,"point-geometry":124}],33:[function(require,module,exports){
'use strict';

var mat3 = require('gl-matrix').mat3;

module.exports = drawBackground;

function drawBackground(painter, layer, posMatrix) {
    var gl = painter.gl;
    var color = layer.paint['background-color'];
    var image = layer.paint['background-image'];
    var opacity = layer.paint['background-opacity'];
    var shader;

    var imagePosA = image ? painter.spriteAtlas.getPosition(image.from, true) : null;
    var imagePosB = image ? painter.spriteAtlas.getPosition(image.to, true) : null;

    if (imagePosA && imagePosB) {
        // Draw texture fill
        shader = painter.patternShader;
        gl.switchShader(shader, posMatrix);
        gl.uniform1i(shader.u_image, 0);
        gl.uniform2fv(shader.u_pattern_tl_a, imagePosA.tl);
        gl.uniform2fv(shader.u_pattern_br_a, imagePosA.br);
        gl.uniform2fv(shader.u_pattern_tl_b, imagePosB.tl);
        gl.uniform2fv(shader.u_pattern_br_b, imagePosB.br);
        gl.uniform1f(shader.u_opacity, opacity);

        var transform = painter.transform;
        var sizeA = imagePosA.size;
        var sizeB = imagePosB.size;
        var center = transform.locationCoordinate(transform.center);
        var scale = 1 / Math.pow(2, transform.zoomFraction);

        gl.uniform1f(shader.u_mix, image.t);

        var matrixA = mat3.create();
        mat3.scale(matrixA, matrixA, [
            1 / (sizeA[0] * image.fromScale),
            1 / (sizeA[1] * image.fromScale)
        ]);
        mat3.translate(matrixA, matrixA, [
            (center.column * transform.tileSize) % (sizeA[0] * image.fromScale),
            (center.row    * transform.tileSize) % (sizeA[1] * image.fromScale)
        ]);
        mat3.rotate(matrixA, matrixA, -transform.angle);
        mat3.scale(matrixA, matrixA, [
            scale * transform.width  / 2,
           -scale * transform.height / 2
        ]);

        var matrixB = mat3.create();
        mat3.scale(matrixB, matrixB, [
            1 / (sizeB[0] * image.toScale),
            1 / (sizeB[1] * image.toScale)
        ]);
        mat3.translate(matrixB, matrixB, [
            (center.column * transform.tileSize) % (sizeB[0] * image.toScale),
            (center.row    * transform.tileSize) % (sizeB[1] * image.toScale)
        ]);
        mat3.rotate(matrixB, matrixB, -transform.angle);
        mat3.scale(matrixB, matrixB, [
            scale * transform.width  / 2,
           -scale * transform.height / 2
        ]);

        gl.uniformMatrix3fv(shader.u_patternmatrix_a, false, matrixA);
        gl.uniformMatrix3fv(shader.u_patternmatrix_b, false, matrixB);

        painter.spriteAtlas.bind(gl, true);

    } else {
        // Draw filling rectangle.
        shader = painter.fillShader;
        gl.switchShader(shader, posMatrix);
        gl.uniform4fv(shader.u_color, color);
    }

    gl.disable(gl.STENCIL_TEST);
    gl.bindBuffer(gl.ARRAY_BUFFER, painter.backgroundBuffer);
    gl.vertexAttribPointer(shader.a_pos, painter.backgroundBuffer.itemSize, gl.SHORT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, painter.backgroundBuffer.itemCount);
    gl.enable(gl.STENCIL_TEST);

    gl.stencilMask(0x00);
    gl.stencilFunc(gl.EQUAL, 0x80, 0x80);
}

},{"gl-matrix":115}],34:[function(require,module,exports){
'use strict';

module.exports = drawPlacementDebug;

function drawPlacementDebug(painter, layer, posMatrix, tile) {

    var elementGroups = tile.elementGroups[layer.ref || layer.id].collisionBox;
    if (!elementGroups) return;

    var gl = painter.gl;
    var buffer = tile.buffers.collisionBoxVertex;
    var shader = painter.collisionBoxShader;

    gl.enable(gl.STENCIL_TEST);

    gl.switchShader(shader, posMatrix);
    buffer.bind(gl, shader);
    gl.lineWidth(3);

    var stride = 12;
    gl.vertexAttribPointer(shader.a_pos, 2, gl.SHORT, false, stride, 0);
    gl.vertexAttribPointer(shader.a_extrude, 2, gl.SHORT, false, stride, 4);
    gl.vertexAttribPointer(shader.a_data, 2, gl.UNSIGNED_BYTE, false, stride, 8);

    gl.uniform1f(shader.u_scale, Math.pow(2, painter.transform.zoom - tile.coord.z));
    gl.uniform1f(shader.u_zoom, painter.transform.zoom * 10);
    gl.uniform1f(shader.u_maxzoom, (tile.coord.z + 1) * 10);

    var begin = elementGroups.groups[0].vertexStartIndex;
    var len = elementGroups.groups[0].vertexLength;
    gl.drawArrays(gl.LINES, begin, len);

    gl.disable(gl.STENCIL_TEST);
}

},{}],35:[function(require,module,exports){
'use strict';

var textVertices = require('../lib/debugtext');
var browser = require('../util/browser');

module.exports = drawDebug;

function drawDebug(painter, tile) {
    var gl = painter.gl;

    // Blend to the front, not the back.
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.switchShader(painter.debugShader, tile.posMatrix);

    // draw bounding rectangle
    gl.bindBuffer(gl.ARRAY_BUFFER, painter.debugBuffer);
    gl.vertexAttribPointer(painter.debugShader.a_pos, painter.debugBuffer.itemSize, gl.SHORT, false, 0, 0);
    gl.uniform4f(painter.debugShader.u_color, 1, 0, 0, 1);
    gl.lineWidth(4);
    gl.drawArrays(gl.LINE_STRIP, 0, painter.debugBuffer.itemCount);

    var vertices = textVertices(tile.coord.toString(), 50, 200, 5);

    gl.bindBuffer(gl.ARRAY_BUFFER, painter.debugTextBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Int16Array(vertices), gl.STREAM_DRAW);
    gl.vertexAttribPointer(painter.debugShader.a_pos, painter.debugTextBuffer.itemSize, gl.SHORT, false, 0, 0);
    gl.lineWidth(8 * browser.devicePixelRatio);
    gl.uniform4f(painter.debugShader.u_color, 1, 1, 1, 1);
    gl.drawArrays(gl.LINES, 0, vertices.length / painter.debugTextBuffer.itemSize);
    gl.lineWidth(2 * browser.devicePixelRatio);
    gl.uniform4f(painter.debugShader.u_color, 0, 0, 0, 1);
    gl.drawArrays(gl.LINES, 0, vertices.length / painter.debugTextBuffer.itemSize);

    // Revert blending mode to blend to the back.
    gl.blendFunc(gl.ONE_MINUS_DST_ALPHA, gl.ONE);
}

},{"../lib/debugtext":31,"../util/browser":96}],36:[function(require,module,exports){
'use strict';

var browser = require('../util/browser');
var mat3 = require('gl-matrix').mat3;

module.exports = drawFill;

function drawFill(painter, layer, posMatrix, tile) {
    // No data
    if (!tile.buffers) return;
    var elementGroups = tile.elementGroups[layer.ref || layer.id];
    if (!elementGroups) return;

    var gl = painter.gl;
    var translatedPosMatrix = painter.translateMatrix(posMatrix, tile, layer.paint['fill-translate'], layer.paint['fill-translate-anchor']);

    var color = layer.paint['fill-color'];

    var vertex, elements, group, count;

    // Draw the stencil mask.

    // We're only drawing to the first seven bits (== support a maximum of
    // 127 overlapping polygons in one place before we get rendering errors).
    gl.stencilMask(0x3F);
    gl.clear(gl.STENCIL_BUFFER_BIT);

    // Draw front facing triangles. Wherever the 0x80 bit is 1, we are
    // increasing the lower 7 bits by one if the triangle is a front-facing
    // triangle. This means that all visible polygons should be in CCW
    // orientation, while all holes (see below) are in CW orientation.
    gl.stencilFunc(gl.NOTEQUAL, 0x80, 0x80);

    // When we do a nonzero fill, we count the number of times a pixel is
    // covered by a counterclockwise polygon, and subtract the number of
    // times it is "uncovered" by a clockwise polygon.
    gl.stencilOpSeparate(gl.FRONT, gl.INCR_WRAP, gl.KEEP, gl.KEEP);
    gl.stencilOpSeparate(gl.BACK, gl.DECR_WRAP, gl.KEEP, gl.KEEP);

    // When drawing a shape, we first draw all shapes to the stencil buffer
    // and incrementing all areas where polygons are
    gl.colorMask(false, false, false, false);

    // Draw the actual triangle fan into the stencil buffer.
    gl.switchShader(painter.fillShader, translatedPosMatrix);

    // Draw all buffers
    vertex = tile.buffers.fillVertex;
    vertex.bind(gl);
    elements = tile.buffers.fillElement;
    elements.bind(gl);

    var offset, elementOffset;

    for (var i = 0; i < elementGroups.groups.length; i++) {
        group = elementGroups.groups[i];
        offset = group.vertexStartIndex * vertex.itemSize;
        gl.vertexAttribPointer(painter.fillShader.a_pos, 2, gl.SHORT, false, 4, offset + 0);

        count = group.elementLength * 3;
        elementOffset = group.elementStartIndex * elements.itemSize;
        gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, elementOffset);
    }

    // Now that we have the stencil mask in the stencil buffer, we can start
    // writing to the color buffer.
    gl.colorMask(true, true, true, true);

    // From now on, we don't want to update the stencil buffer anymore.
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
    gl.stencilMask(0x0);

    var strokeColor = layer.paint['fill-outline-color'];

    // Because we're drawing top-to-bottom, and we update the stencil mask
    // below, we have to draw the outline first (!)
    if (layer.paint['fill-antialias'] === true && !(layer.paint['fill-image'] && !strokeColor)) {
        gl.switchShader(painter.outlineShader, translatedPosMatrix);
        gl.lineWidth(2 * browser.devicePixelRatio);

        if (strokeColor) {
            // If we defined a different color for the fill outline, we are
            // going to ignore the bits in 0x3F and just care about the global
            // clipping mask.
            gl.stencilFunc(gl.EQUAL, 0x80, 0x80);
        } else {
            // Otherwise, we only want to draw the antialiased parts that are
            // *outside* the current shape. This is important in case the fill
            // or stroke color is translucent. If we wouldn't clip to outside
            // the current shape, some pixels from the outline stroke overlapped
            // the (non-antialiased) fill.
            gl.stencilFunc(gl.EQUAL, 0x80, 0xBF);
        }

        gl.uniform2f(painter.outlineShader.u_world, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.uniform4fv(painter.outlineShader.u_color, strokeColor ? strokeColor : color);

        // Draw all buffers
        vertex = tile.buffers.fillVertex;
        elements = tile.buffers.outlineElement;
        elements.bind(gl);

        for (var k = 0; k < elementGroups.groups.length; k++) {
            group = elementGroups.groups[k];
            offset = group.vertexStartIndex * vertex.itemSize;
            gl.vertexAttribPointer(painter.outlineShader.a_pos, 2, gl.SHORT, false, 4, offset + 0);

            count = group.secondElementLength * 2;
            elementOffset = group.secondElementStartIndex * elements.itemSize;
            gl.drawElements(gl.LINES, count, gl.UNSIGNED_SHORT, elementOffset);
        }
    }

    var image = layer.paint['fill-image'];
    var opacity = layer.paint['fill-opacity'] || 1;
    var shader;

    if (image) {
        // Draw texture fill
        var imagePosA = painter.spriteAtlas.getPosition(image.from, true);
        var imagePosB = painter.spriteAtlas.getPosition(image.to, true);
        if (!imagePosA || !imagePosB) return;

        shader = painter.patternShader;
        gl.switchShader(shader, posMatrix);
        gl.uniform1i(shader.u_image, 0);
        gl.uniform2fv(shader.u_pattern_tl_a, imagePosA.tl);
        gl.uniform2fv(shader.u_pattern_br_a, imagePosA.br);
        gl.uniform2fv(shader.u_pattern_tl_b, imagePosB.tl);
        gl.uniform2fv(shader.u_pattern_br_b, imagePosB.br);
        gl.uniform1f(shader.u_opacity, opacity);
        gl.uniform1f(shader.u_mix, image.t);

        var factor = (4096 / tile.tileSize) / Math.pow(2, painter.transform.tileZoom - tile.coord.z);

        var matrixA = mat3.create();
        mat3.scale(matrixA, matrixA, [
            1 / (imagePosA.size[0] * factor * image.fromScale),
            1 / (imagePosA.size[1] * factor * image.fromScale)
        ]);

        var matrixB = mat3.create();
        mat3.scale(matrixB, matrixB, [
            1 / (imagePosB.size[0] * factor * image.toScale),
            1 / (imagePosB.size[1] * factor * image.toScale)
        ]);

        gl.uniformMatrix3fv(shader.u_patternmatrix_a, false, matrixA);
        gl.uniformMatrix3fv(shader.u_patternmatrix_b, false, matrixB);

        painter.spriteAtlas.bind(gl, true);

    } else {
        // Draw filling rectangle.
        shader = painter.fillShader;
        gl.switchShader(shader, posMatrix);
        gl.uniform4fv(shader.u_color, color);
    }

    // Only draw regions that we marked
    gl.stencilFunc(gl.NOTEQUAL, 0x0, 0x3F);
    gl.bindBuffer(gl.ARRAY_BUFFER, painter.tileExtentBuffer);
    gl.vertexAttribPointer(shader.a_pos, painter.tileExtentBuffer.itemSize, gl.SHORT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, painter.tileExtentBuffer.itemCount);

    gl.stencilMask(0x00);
    gl.stencilFunc(gl.EQUAL, 0x80, 0x80);
}

},{"../util/browser":96,"gl-matrix":115}],37:[function(require,module,exports){
'use strict';

var browser = require('../util/browser');
var mat2 = require('gl-matrix').mat2;

/**
 * Draw a line. Under the hood this will read elements from
 * a tile, dash textures from a lineAtlas, and style properties from a layer.
 * @param {Object} painter
 * @param {Object} layer
 * @param {Object} posMatrix
 * @param {Tile} tile
 * @returns {undefined} draws with the painter
 */
module.exports = function drawLine(painter, layer, posMatrix, tile) {
    // No data
    if (!tile.buffers) return;
    var elementGroups = tile.elementGroups[layer.ref || layer.id];
    if (!elementGroups) return;

    var gl = painter.gl;

    // don't draw zero-width lines
    if (layer.paint['line-width'] <= 0) return;

    // the distance over which the line edge fades out.
    // Retina devices need a smaller distance to avoid aliasing.
    var antialiasing = 1 / browser.devicePixelRatio;

    var blur = layer.paint['line-blur'] + antialiasing;
    var edgeWidth = layer.paint['line-width'] / 2;
    var inset = -1;
    var offset = 0;
    var shift = 0;

    if (layer.paint['line-gap-width'] > 0) {
        inset = layer.paint['line-gap-width'] / 2 + antialiasing * 0.5;
        edgeWidth = layer.paint['line-width'];

        // shift outer lines half a pixel towards the middle to eliminate the crack
        offset = inset - antialiasing / 2;
    }

    var outset = offset + edgeWidth + antialiasing / 2 + shift;

    var color = layer.paint['line-color'];
    var ratio = painter.transform.scale / (1 << tile.coord.z) / (4096 / tile.tileSize);
    var vtxMatrix = painter.translateMatrix(posMatrix, tile, layer.paint['line-translate'], layer.paint['line-translate-anchor']);

    var tr = painter.transform;


    var antialiasingMatrix = mat2.create();
    mat2.scale(antialiasingMatrix, antialiasingMatrix, [1, Math.cos(tr._pitch)]);
    mat2.rotate(antialiasingMatrix, antialiasingMatrix, painter.transform.angle);

    // calculate how much longer the real world distance is at the top of the screen
    // than at the middle of the screen.
    var topedgelength = Math.sqrt(tr.height * tr.height / 4  * (1 + tr.altitude * tr.altitude));
    var x = tr.height / 2 * Math.tan(tr._pitch);
    var extra = (topedgelength + x) / topedgelength - 1;

    // how much the tile is overscaled by
    var overscaling = tile.tileSize / painter.transform.tileSize;

    var shader;


    var dasharray = layer.paint['line-dasharray'];
    var image = layer.paint['line-image'];

    if (dasharray) {

        shader = painter.linesdfpatternShader;
        gl.switchShader(shader, vtxMatrix, tile.exMatrix);

        gl.uniform2fv(shader.u_linewidth, [ outset, inset ]);
        gl.uniform1f(shader.u_ratio, ratio);
        gl.uniform1f(shader.u_blur, blur);
        gl.uniform4fv(shader.u_color, color);

        var posA = painter.lineAtlas.getDash(dasharray.from, layer.layout['line-cap'] === 'round');
        var posB = painter.lineAtlas.getDash(dasharray.to, layer.layout['line-cap'] === 'round');
        painter.lineAtlas.bind(gl);

        var patternratio = Math.pow(2, Math.floor(Math.log(painter.transform.scale) / Math.LN2) - tile.coord.z) / 8 * overscaling;
        var scaleA = [patternratio / posA.width / dasharray.fromScale, -posA.height / 2];
        var gammaA = painter.lineAtlas.width / (dasharray.fromScale * posA.width * 256 * browser.devicePixelRatio) / 2;
        var scaleB = [patternratio / posB.width / dasharray.toScale, -posB.height / 2];
        var gammaB = painter.lineAtlas.width / (dasharray.toScale * posB.width * 256 * browser.devicePixelRatio) / 2;

        gl.uniform2fv(shader.u_patternscale_a, scaleA);
        gl.uniform1f(shader.u_tex_y_a, posA.y);
        gl.uniform2fv(shader.u_patternscale_b, scaleB);
        gl.uniform1f(shader.u_tex_y_b, posB.y);

        gl.uniform1i(shader.u_image, 0);
        gl.uniform1f(shader.u_sdfgamma, Math.max(gammaA, gammaB));
        gl.uniform1f(shader.u_mix, dasharray.t);

    } else if (image) {
        var imagePosA = painter.spriteAtlas.getPosition(image.from, true);
        var imagePosB = painter.spriteAtlas.getPosition(image.to, true);
        if (!imagePosA || !imagePosB) return;
        var factor = 4096 / tile.tileSize / Math.pow(2, painter.transform.tileZoom - tile.coord.z) * overscaling;

        painter.spriteAtlas.bind(gl, true);

        shader = painter.linepatternShader;
        gl.switchShader(shader, vtxMatrix, tile.exMatrix);

        gl.uniform2fv(shader.u_linewidth, [ outset, inset ]);
        gl.uniform1f(shader.u_ratio, ratio);
        gl.uniform1f(shader.u_blur, blur);

        gl.uniform2fv(shader.u_pattern_size_a, [imagePosA.size[0] * factor * image.fromScale, imagePosB.size[1] ]);
        gl.uniform2fv(shader.u_pattern_size_b, [imagePosB.size[0] * factor * image.toScale, imagePosB.size[1] ]);
        gl.uniform2fv(shader.u_pattern_tl_a, imagePosA.tl);
        gl.uniform2fv(shader.u_pattern_br_a, imagePosA.br);
        gl.uniform2fv(shader.u_pattern_tl_b, imagePosB.tl);
        gl.uniform2fv(shader.u_pattern_br_b, imagePosB.br);
        gl.uniform1f(shader.u_fade, image.t);
        gl.uniform1f(shader.u_opacity, layer.paint['line-opacity']);

    } else {
        shader = painter.lineShader;
        gl.switchShader(shader, vtxMatrix, tile.exMatrix);

        gl.uniform2fv(shader.u_linewidth, [ outset, inset ]);
        gl.uniform1f(shader.u_ratio, ratio);
        gl.uniform1f(shader.u_blur, blur);
        gl.uniform1f(shader.u_extra, extra);
        gl.uniformMatrix2fv(shader.u_antialiasingmatrix, false, antialiasingMatrix);

        gl.uniform4fv(shader.u_color, color);
    }

    var vertex = tile.buffers.lineVertex;
    vertex.bind(gl);
    var element = tile.buffers.lineElement;
    element.bind(gl);

    for (var i = 0; i < elementGroups.groups.length; i++) {
        var group = elementGroups.groups[i];
        var vtxOffset = group.vertexStartIndex * vertex.itemSize;
        gl.vertexAttribPointer(shader.a_pos, 2, gl.SHORT, false, 8, vtxOffset + 0);
        gl.vertexAttribPointer(shader.a_data, 4, gl.BYTE, false, 8, vtxOffset + 4);

        var count = group.elementLength * 3;
        var elementOffset = group.elementStartIndex * element.itemSize;
        gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, elementOffset);
    }

};

},{"../util/browser":96,"gl-matrix":115}],38:[function(require,module,exports){
'use strict';

var util = require('../util/util');

module.exports = drawRaster;

function drawRaster(painter, layer, posMatrix, tile) {
    var gl = painter.gl;

    gl.disable(gl.STENCIL_TEST);

    var shader = painter.rasterShader;
    gl.switchShader(shader, posMatrix);

    // color parameters
    gl.uniform1f(shader.u_brightness_low, layer.paint['raster-brightness-min']);
    gl.uniform1f(shader.u_brightness_high, layer.paint['raster-brightness-max']);
    gl.uniform1f(shader.u_saturation_factor, saturationFactor(layer.paint['raster-saturation']));
    gl.uniform1f(shader.u_contrast_factor, contrastFactor(layer.paint['raster-contrast']));
    gl.uniform3fv(shader.u_spin_weights, spinWeights(layer.paint['raster-hue-rotate']));

    var parentTile = tile.source && tile.source._pyramid.findLoadedParent(tile.coord, 0, {}),
        opacities = getOpacities(tile, parentTile, layer, painter.transform);

    var parentScaleBy, parentTL;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tile.texture);

    if (parentTile) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, parentTile.texture);

        parentScaleBy = Math.pow(2, parentTile.coord.z - tile.coord.z);
        parentTL = [tile.coord.x * parentScaleBy % 1, tile.coord.y * parentScaleBy % 1];
    } else {
        opacities[1] = 0;
    }

    // cross-fade parameters
    gl.uniform2fv(shader.u_tl_parent, parentTL || [0, 0]);
    gl.uniform1f(shader.u_scale_parent, parentScaleBy || 1);
    gl.uniform1f(shader.u_buffer_scale, 1);
    gl.uniform1f(shader.u_opacity0, opacities[0]);
    gl.uniform1f(shader.u_opacity1, opacities[1]);
    gl.uniform1i(shader.u_image0, 0);
    gl.uniform1i(shader.u_image1, 1);

    gl.bindBuffer(gl.ARRAY_BUFFER, tile.boundsBuffer || painter.tileExtentBuffer);

    gl.vertexAttribPointer(shader.a_pos,         2, gl.SHORT, false, 8, 0);
    gl.vertexAttribPointer(shader.a_texture_pos, 2, gl.SHORT, false, 8, 4);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.enable(gl.STENCIL_TEST);
}

function spinWeights(angle) {
    angle *= Math.PI / 180;
    var s = Math.sin(angle);
    var c = Math.cos(angle);
    return [
        (2 * c + 1) / 3,
        (-Math.sqrt(3) * s - c + 1) / 3,
        (Math.sqrt(3) * s - c + 1) / 3
    ];
}

function contrastFactor(contrast) {
    return contrast > 0 ?
        1 / (1 - contrast) :
        1 + contrast;
}

function saturationFactor(saturation) {
    return saturation > 0 ?
        1 - 1 / (1.001 - saturation) :
        -saturation;
}

function getOpacities(tile, parentTile, layer, transform) {
    if (!tile.source) return [1, 0];

    var now = new Date().getTime();

    var fadeDuration = layer.paint['raster-fade-duration'];
    var sinceTile = (now - tile.timeAdded) / fadeDuration;
    var sinceParent = parentTile ? (now - parentTile.timeAdded) / fadeDuration : -1;

    var idealZ = tile.source._pyramid.coveringZoomLevel(transform);
    var parentFurther = parentTile ? Math.abs(parentTile.coord.z - idealZ) > Math.abs(tile.coord.z - idealZ) : false;

    var opacity = [];
    if (!parentTile || parentFurther) {
        // if no parent or parent is older
        opacity[0] = util.clamp(sinceTile, 0, 1);
        opacity[1] = 1 - opacity[0];
    } else {
        // parent is younger, zooming out
        opacity[0] = util.clamp(1 - sinceParent, 0, 1);
        opacity[1] = 1 - opacity[0];
    }

    var op = layer.paint['raster-opacity'];
    opacity[0] *= op;
    opacity[1] *= op;

    return opacity;
}

},{"../util/util":107}],39:[function(require,module,exports){
'use strict';

var browser = require('../util/browser');
var mat4 = require('gl-matrix').mat4;

var drawCollisionDebug = require('./draw_collision_debug');

module.exports = drawSymbols;

function drawSymbols(painter, layer, posMatrix, tile) {
    // No data
    if (!tile.buffers) return;
    var elementGroups = tile.elementGroups[layer.ref || layer.id];
    if (!elementGroups) return;

    var drawAcrossEdges = !(layer.layout['text-allow-overlap'] || layer.layout['icon-allow-overlap'] ||
        layer.layout['text-ignore-placement'] || layer.layout['icon-ignore-placement']);

    var gl = painter.gl;

    if (drawAcrossEdges) {
        // Disable the stencil test so that labels aren't clipped to tile boundaries.
        //
        // Layers with features that may be drawn overlapping aren't clipped. These
        // layers are sorted in the y direction, and to draw the correct ordering near
        // tile edges the icons are included in both tiles and clipped when drawing.
        gl.disable(gl.STENCIL_TEST);
    }

    if (elementGroups.text.groups.length) {
        drawSymbol(painter, layer, posMatrix, tile, elementGroups.text, 'text', true);
    }
    if (elementGroups.icon.groups.length) {
        drawSymbol(painter, layer, posMatrix, tile, elementGroups.icon, 'icon', elementGroups.sdfIcons);
    }

    drawCollisionDebug(painter, layer, posMatrix, tile);

    if (drawAcrossEdges) {
        gl.enable(gl.STENCIL_TEST);
    }
}

var defaultSizes = {
    icon: 1,
    text: 24
};

function drawSymbol(painter, layer, posMatrix, tile, elementGroups, prefix, sdf) {
    var gl = painter.gl;

    posMatrix = painter.translateMatrix(posMatrix, tile, layer.paint[prefix + '-translate'], layer.paint[prefix + '-translate-anchor']);

    var tr = painter.transform;
    var alignedWithMap = layer.layout[prefix + '-rotation-alignment'] === 'map';
    var skewed = alignedWithMap;
    var exMatrix, s, gammaScale;

    if (skewed) {
        exMatrix = mat4.create();
        s = 4096 / tile.tileSize / Math.pow(2, painter.transform.zoom - tile.coord.z);
        gammaScale = 1 / Math.cos(tr._pitch);
    } else {
        exMatrix = mat4.clone(tile.exMatrix);
        s = painter.transform.altitude;
        gammaScale = 1;
    }
    mat4.scale(exMatrix, exMatrix, [s, s, 1]);

    // If layer.paint.size > layer.layout[prefix + '-max-size'] then labels may collide
    var fontSize = layer.paint[prefix + '-size'];
    var fontScale = fontSize / defaultSizes[prefix];
    mat4.scale(exMatrix, exMatrix, [ fontScale, fontScale, 1 ]);

    // calculate how much longer the real world distance is at the top of the screen
    // than at the middle of the screen.
    var topedgelength = Math.sqrt(tr.height * tr.height / 4  * (1 + tr.altitude * tr.altitude));
    var x = tr.height / 2 * Math.tan(tr._pitch);
    var extra = (topedgelength + x) / topedgelength - 1;

    var text = prefix === 'text';
    var shader, vertex, elements, texsize;

    if (!text && !painter.style.sprite.loaded())
        return;

    gl.activeTexture(gl.TEXTURE0);

    if (sdf) {
        shader = painter.sdfShader;
    } else {
        shader = painter.iconShader;
    }

    if (text) {
        painter.glyphAtlas.updateTexture(gl);
        vertex = tile.buffers.glyphVertex;
        elements = tile.buffers.glyphElement;
        texsize = [painter.glyphAtlas.width / 4, painter.glyphAtlas.height / 4];
    } else {
        painter.spriteAtlas.bind(gl, alignedWithMap || painter.options.rotating ||
            painter.options.zooming || fontScale !== 1 || sdf || painter.transform.pitch);
        vertex = tile.buffers.iconVertex;
        elements = tile.buffers.iconElement;
        texsize = [painter.spriteAtlas.width / 4, painter.spriteAtlas.height / 4];
    }

    gl.switchShader(shader, posMatrix, exMatrix);
    gl.uniform1i(shader.u_texture, 0);
    gl.uniform2fv(shader.u_texsize, texsize);
    gl.uniform1i(shader.u_skewed, skewed);
    gl.uniform1f(shader.u_extra, extra);

    // adjust min/max zooms for variable font sies
    var zoomAdjust = Math.log(fontSize / layer.layout[prefix + '-max-size']) / Math.LN2 || 0;

    gl.uniform1f(shader.u_zoom, (painter.transform.zoom - zoomAdjust) * 10); // current zoom level

    var f = painter.frameHistory.getFadeProperties(300);
    gl.uniform1f(shader.u_fadedist, f.fadedist * 10);
    gl.uniform1f(shader.u_minfadezoom, Math.floor(f.minfadezoom * 10));
    gl.uniform1f(shader.u_maxfadezoom, Math.floor(f.maxfadezoom * 10));
    gl.uniform1f(shader.u_fadezoom, (painter.transform.zoom + f.bump) * 10);

    var group, offset, count, elementOffset;

    elements.bind(gl);

    if (sdf) {
        var sdfPx = 8;
        var blurOffset = 1.19;
        var haloOffset = 6;
        var gamma = 0.105 * defaultSizes[prefix] / fontSize / browser.devicePixelRatio;

        gl.uniform1f(shader.u_gamma, gamma * gammaScale);
        gl.uniform4fv(shader.u_color, layer.paint[prefix + '-color']);
        gl.uniform1f(shader.u_buffer, (256 - 64) / 256);

        for (var i = 0; i < elementGroups.groups.length; i++) {
            group = elementGroups.groups[i];
            offset = group.vertexStartIndex * vertex.itemSize;
            vertex.bind(gl, shader, offset);

            count = group.elementLength * 3;
            elementOffset = group.elementStartIndex * elements.itemSize;
            gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, elementOffset);
        }

        if (layer.paint[prefix + '-halo-color']) {
            // Draw halo underneath the text.
            gl.uniform1f(shader.u_gamma, (layer.paint[prefix + '-halo-blur'] * blurOffset / fontScale / sdfPx + gamma) * gammaScale);
            gl.uniform4fv(shader.u_color, layer.paint[prefix + '-halo-color']);
            gl.uniform1f(shader.u_buffer, (haloOffset - layer.paint[prefix + '-halo-width'] / fontScale) / sdfPx);

            for (var j = 0; j < elementGroups.groups.length; j++) {
                group = elementGroups.groups[j];
                offset = group.vertexStartIndex * vertex.itemSize;
                vertex.bind(gl, shader, offset);

                count = group.elementLength * 3;
                elementOffset = group.elementStartIndex * elements.itemSize;
                gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, elementOffset);
            }
        }
    } else {
        gl.uniform1f(shader.u_opacity, layer.paint['icon-opacity']);
        for (var k = 0; k < elementGroups.groups.length; k++) {
            group = elementGroups.groups[k];
            offset = group.vertexStartIndex * vertex.itemSize;
            vertex.bind(gl, shader, offset);

            count = group.elementLength * 3;
            elementOffset = group.elementStartIndex * elements.itemSize;
            gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, elementOffset);
        }
    }
}

},{"../util/browser":96,"./draw_collision_debug":34,"gl-matrix":115}],40:[function(require,module,exports){
'use strict';

var browser = require('../util/browser');
var mat4 = require('gl-matrix').mat4;

module.exports = drawVertices;

function drawVertices(painter, layer, posMatrix, tile) {
    var gl = painter.gl;

    if (!tile || !tile.buffers) return;
    var elementGroups = tile.elementGroups[layer.ref || layer.id];
    if (!elementGroups) return;

    // Blend to the front, not the back.
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // Draw all buffers
    if (layer.type === 'fill') {
        drawPoints(tile.buffers.fillVertex, elementGroups.groups, posMatrix, 4);
    } else if (layer.type === 'symbol') {
        drawPoints(tile.buffers.iconVertex, elementGroups.icon.groups, posMatrix, 16);
        drawPoints(tile.buffers.glyphVertex, elementGroups.text.groups, posMatrix, 16);
    } else if (layer.type === 'line') {
        var newPosMatrix = mat4.clone(posMatrix);
        mat4.scale(newPosMatrix, newPosMatrix, [0.5, 0.5, 1]);
        drawPoints(tile.buffers.lineVertex, elementGroups.groups, newPosMatrix, 8);
    }

    function drawPoints(vertex, groups, matrix, stride) {
        gl.switchShader(painter.dotShader, matrix);

        gl.uniform1f(painter.dotShader.u_size, 4 * browser.devicePixelRatio);
        gl.uniform1f(painter.dotShader.u_blur, 0.25);
        gl.uniform4fv(painter.dotShader.u_color, [0.1, 0, 0, 0.1]);

        vertex.bind(gl, painter.dotShader, 0);
        for (var i = 0; i < groups.length; i++) {
            var group = groups[i];
            var begin = group.vertexStartIndex;
            var count = group.vertexLength;
            gl.vertexAttribPointer(painter.dotShader.a_pos, 2, gl.SHORT, false, stride, 0);
            gl.drawArrays(gl.POINTS, begin, count);
        }
    }

    // Revert blending mode to blend to the back.
    gl.blendFunc(gl.ONE_MINUS_DST_ALPHA, gl.ONE);
}

},{"../util/browser":96,"gl-matrix":115}],41:[function(require,module,exports){
'use strict';

module.exports = FrameHistory;

function FrameHistory() {
    this.frameHistory = [];
}

FrameHistory.prototype.getFadeProperties = function(duration) {
    if (duration === undefined) duration = 300;
    var currentTime = (new Date()).getTime();

    // Remove frames until only one is outside the duration, or until there are only three
    while (this.frameHistory.length > 3 && this.frameHistory[1].time + duration < currentTime) {
        this.frameHistory.shift();
    }

    if (this.frameHistory[1].time + duration < currentTime) {
        this.frameHistory[0].z = this.frameHistory[1].z;
    }

    var frameLen = this.frameHistory.length;
    if (frameLen < 3) console.warn('there should never be less than three frames in the history');

    // Find the range of zoom levels we want to fade between
    var startingZ = this.frameHistory[0].z,
        lastFrame = this.frameHistory[frameLen - 1],
        endingZ = lastFrame.z,
        lowZ = Math.min(startingZ, endingZ),
        highZ = Math.max(startingZ, endingZ);

    // Calculate the speed of zooming, and how far it would zoom in terms of zoom levels in one duration
    var zoomDiff = lastFrame.z - this.frameHistory[1].z,
        timeDiff = lastFrame.time - this.frameHistory[1].time;
    var fadedist = zoomDiff / (timeDiff / duration);

    if (isNaN(fadedist)) console.warn('fadedist should never be NaN');

    // At end of a zoom when the zoom stops changing continue pretending to zoom at that speed
    // bump is how much farther it would have been if it had continued zooming at the same rate
    var bump = (currentTime - lastFrame.time) / duration * fadedist;

    return {
        fadedist: fadedist,
        minfadezoom: lowZ,
        maxfadezoom: highZ,
        bump: bump
    };
};

// Record frame history that will be used to calculate fading params
FrameHistory.prototype.record = function(zoom) {
    var currentTime = (new Date()).getTime();

    // first frame ever
    if (!this.frameHistory.length) {
        this.frameHistory.push({time: 0, z: zoom }, {time: 0, z: zoom });
    }

    if (this.frameHistory.length === 2 || this.frameHistory[this.frameHistory.length - 1].z !== zoom) {
        this.frameHistory.push({
            time: currentTime,
            z: zoom
        });
    }
};

},{}],42:[function(require,module,exports){
'use strict';

var shaders = require('./shaders');
var util = require('../util/util');

exports.extend = function(context) {
    var origLineWidth = context.lineWidth,
        lineWidthRange = context.getParameter(context.ALIASED_LINE_WIDTH_RANGE);

    context.lineWidth = function(width) {
        origLineWidth.call(context, util.clamp(width, lineWidthRange[0], lineWidthRange[1]));
    };

    context.getShader = function(name, type) {
        var kind = type === this.FRAGMENT_SHADER ? 'fragment' : 'vertex';
        if (!shaders[name] || !shaders[name][kind]) {
            throw new Error("Could not find shader " + name);
        }

        var shader = this.createShader(type);
        this.shaderSource(shader, shaders[name][kind]);
        this.compileShader(shader);
        if (!this.getShaderParameter(shader, this.COMPILE_STATUS)) {
            throw new Error(this.getShaderInfoLog(shader));
        }
        return shader;
    };

    context.initializeShader = function(name, attributes, uniforms) {
        var shader = {
            program: this.createProgram(),
            fragment: this.getShader(name, this.FRAGMENT_SHADER),
            vertex: this.getShader(name, this.VERTEX_SHADER),
            attributes: []
        };
        this.attachShader(shader.program, shader.vertex);
        this.attachShader(shader.program, shader.fragment);
        this.linkProgram(shader.program);

        if (!this.getProgramParameter(shader.program, this.LINK_STATUS)) {
            console.error(this.getProgramInfoLog(shader.program));
        } else {
            for (var i = 0; i < attributes.length; i++) {
                shader[attributes[i]] = this.getAttribLocation(shader.program, attributes[i]);
                shader.attributes.push(shader[attributes[i]]);
            }
            for (var k = 0; k < uniforms.length; k++) {
                shader[uniforms[k]] = this.getUniformLocation(shader.program, uniforms[k]);
            }
        }

        return shader;
    };

    // Switches to a different shader program.
    context.switchShader = function(shader, posMatrix, exMatrix) {
        if (!posMatrix) {
            console.trace('posMatrix does not have required argument');
        }

        if (this.currentShader !== shader) {
            this.useProgram(shader.program);

            // Disable all attributes from the existing shader that aren't used in
            // the new shader. Note: attribute indices are *not* program specific!
            var enabled = this.currentShader ? this.currentShader.attributes : [];
            var required = shader.attributes;

            for (var i = 0; i < enabled.length; i++) {
                if (required.indexOf(enabled[i]) < 0) {
                    this.disableVertexAttribArray(enabled[i]);
                }
            }

            // Enable all attributes for the new shader.
            for (var j = 0; j < required.length; j++) {
                if (enabled.indexOf(required[j]) < 0) {
                    this.enableVertexAttribArray(required[j]);
                }
            }

            this.currentShader = shader;
        }

        // Update the matrices if necessary. Note: This relies on object identity!
        // This means changing the matrix values without the actual matrix object
        // will FAIL to update the matrix properly.
        if (shader.posMatrix !== posMatrix) {
            this.uniformMatrix4fv(shader.u_matrix, false, posMatrix);
            shader.posMatrix = posMatrix;
        }
        if (exMatrix && shader.exMatrix !== exMatrix && shader.u_exmatrix) {
            this.uniformMatrix4fv(shader.u_exmatrix, false, exMatrix);
            shader.exMatrix = exMatrix;
        }
    };

    return context;
};

},{"../util/util":107,"./shaders":45}],43:[function(require,module,exports){
'use strict';

module.exports = LineAtlas;

/**
 * Much like a GlyphAtlas, a LineAtlas lets us reuse rendered dashed lines
 * by writing many of them to a texture and then fetching their positions
 * using .getDash.
 *
 * @param {number} width
 * @param {number} height
 * @private
 */
function LineAtlas(width, height) {
    this.width = width;
    this.height = height;
    this.nextRow = 0;

    this.bytes = 4;
    this.data = new Uint8Array(this.width * this.height * this.bytes);

    this.positions = {};
}

LineAtlas.prototype.setSprite = function(sprite) {
    this.sprite = sprite;
};

/**
 * Get or create a dash line pattern.
 *
 * @param {Array<number>} dasharray
 * @param {boolean} round whether to add circle caps in between dash segments
 * @returns {Object} position of dash texture in { y, height, width }
 * @private
 */
LineAtlas.prototype.getDash = function(dasharray, round) {
    var key = dasharray.join(",") + round;

    if (!this.positions[key]) {
        this.positions[key] = this.addDash(dasharray, round);
    }
    return this.positions[key];
};

LineAtlas.prototype.addDash = function(dasharray, round) {

    var n = round ? 7 : 0;
    var height = 2 * n + 1;
    var offset = 128;

    if (this.nextRow + height > this.height) {
        console.warn('LineAtlas out of space');
        return null;
    }

    var length = 0;
    for (var i = 0; i < dasharray.length; i++) {
        length += dasharray[i];
    }

    var stretch = this.width / length;
    var halfWidth = stretch / 2;

    // If dasharray has an odd length, both the first and last parts
    // are dashes and should be joined seamlessly.
    var oddLength = dasharray.length % 2 === 1;

    for (var y = -n; y <= n; y++) {
        var row = this.nextRow + n + y;
        var index = this.width * row;

        var left = oddLength ? -dasharray[dasharray.length - 1] : 0;
        var right = dasharray[0];
        var partIndex = 1;

        for (var x = 0; x < this.width; x++) {

            while (right < x / stretch) {
                left = right;
                right = right + dasharray[partIndex];

                if (oddLength && partIndex === dasharray.length - 1) {
                    right += dasharray[0];
                }

                partIndex++;
            }

            var distLeft = Math.abs(x - left * stretch);
            var distRight = Math.abs(x - right * stretch);
            var dist = Math.min(distLeft, distRight);
            var inside = (partIndex % 2) === 1;
            var signedDistance;

            if (round) {
                // Add circle caps
                var distMiddle = n ? y / n * (halfWidth + 1) : 0;
                if (inside) {
                    var distEdge = halfWidth - Math.abs(distMiddle);
                    signedDistance = Math.sqrt(dist * dist + distEdge * distEdge);
                } else {
                    signedDistance = halfWidth - Math.sqrt(dist * dist + distMiddle * distMiddle);
                }
            } else {
                signedDistance = (inside ? 1 : -1) * dist;
            }

            this.data[3 + (index + x) * 4] = Math.max(0, Math.min(255, signedDistance + offset));
        }
    }

    var pos = {
        y: (this.nextRow + n + 0.5) / this.height,
        height: 2 * n / this.height,
        width: length
    };

    this.nextRow += height;
    this.dirty = true;

    return pos;
};

LineAtlas.prototype.bind = function(gl) {
    if (!this.texture) {
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.data);

    } else {
        gl.bindTexture(gl.TEXTURE_2D, this.texture);

        if (this.dirty) {
            this.dirty = false;
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, this.data);
        }
    }
};

LineAtlas.prototype.debug = function() {

    var canvas = document.createElement('canvas');

    document.body.appendChild(canvas);
    canvas.style.position = 'absolute';
    canvas.style.top = 0;
    canvas.style.left = 0;
    canvas.style.background = '#ff0';

    canvas.width = this.width;
    canvas.height = this.height;

    var ctx = canvas.getContext('2d');
    var data = ctx.getImageData(0, 0, this.width, this.height);
    for (var i = 0; i < this.data.length; i++) {
        if (this.sdf) {
            var k = i * 4;
            data.data[k] = data.data[k + 1] = data.data[k + 2] = 0;
            data.data[k + 3] = this.data[i];
        } else {
            data.data[i] = this.data[i];
        }
    }
    ctx.putImageData(data, 0, 0);
};

},{}],44:[function(require,module,exports){
'use strict';

var glutil = require('./gl_util');
var browser = require('../util/browser');
var mat4 = require('gl-matrix').mat4;
var FrameHistory = require('./frame_history');

/*
 * Initialize a new painter object.
 *
 * @param {Canvas} gl an experimental-webgl drawing context
 */
module.exports = GLPainter;
function GLPainter(gl, transform) {
    this.gl = glutil.extend(gl);
    this.transform = transform;

    this.reusableTextures = {};
    this.preFbos = {};

    this.tileExtent = 4096;
    this.frameHistory = new FrameHistory();

    this.setup();
}

/*
 * Update the GL viewport, projection matrix, and transforms to compensate
 * for a new width and height value.
 */
GLPainter.prototype.resize = function(width, height) {
    var gl = this.gl;

    this.width = width * browser.devicePixelRatio;
    this.height = height * browser.devicePixelRatio;
    gl.viewport(0, 0, this.width, this.height);

};


GLPainter.prototype.setup = function() {
    var gl = this.gl;

    gl.verbose = true;

    // We are blending the new pixels *behind* the existing pixels. That way we can
    // draw front-to-back and use then stencil buffer to cull opaque pixels early.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE_MINUS_DST_ALPHA, gl.ONE);

    gl.enable(gl.STENCIL_TEST);

    // Initialize shaders
    this.debugShader = gl.initializeShader('debug',
        ['a_pos'],
        ['u_matrix', 'u_pointsize', 'u_color']);

    this.gaussianShader = gl.initializeShader('gaussian',
        ['a_pos'],
        ['u_matrix', 'u_image', 'u_offset']);

    this.rasterShader = gl.initializeShader('raster',
        ['a_pos', 'a_texture_pos'],
        ['u_matrix', 'u_brightness_low', 'u_brightness_high', 'u_saturation_factor', 'u_spin_weights', 'u_contrast_factor', 'u_opacity0', 'u_opacity1', 'u_image0', 'u_image1', 'u_tl_parent', 'u_scale_parent', 'u_buffer_scale']);

    this.lineShader = gl.initializeShader('line',
        ['a_pos', 'a_data'],
        ['u_matrix', 'u_linewidth', 'u_color', 'u_ratio', 'u_blur', 'u_extra', 'u_antialiasingmatrix']);

    this.linepatternShader = gl.initializeShader('linepattern',
        ['a_pos', 'a_data'],
        ['u_matrix', 'u_exmatrix', 'u_linewidth', 'u_ratio', 'u_pattern_size_a', 'u_pattern_size_b', 'u_pattern_tl_a', 'u_pattern_br_a', 'u_pattern_tl_b', 'u_pattern_br_b', 'u_blur', 'u_fade', 'u_opacity']);

    this.linesdfpatternShader = gl.initializeShader('linesdfpattern',
        ['a_pos', 'a_data'],
        ['u_matrix', 'u_exmatrix', 'u_linewidth', 'u_color', 'u_ratio', 'u_blur', 'u_patternscale_a', 'u_tex_y_a', 'u_patternscale_b', 'u_tex_y_b', 'u_image', 'u_sdfgamma', 'u_mix']);

    this.dotShader = gl.initializeShader('dot',
        ['a_pos'],
        ['u_matrix', 'u_size', 'u_color', 'u_blur']);

    this.sdfShader = gl.initializeShader('sdf',
        ['a_pos', 'a_offset', 'a_data1', 'a_data2'],
        ['u_matrix', 'u_exmatrix', 'u_texture', 'u_texsize', 'u_color', 'u_gamma', 'u_buffer', 'u_zoom', 'u_fadedist', 'u_minfadezoom', 'u_maxfadezoom', 'u_fadezoom', 'u_skewed', 'u_extra']);

    this.iconShader = gl.initializeShader('icon',
        ['a_pos', 'a_offset', 'a_data1', 'a_data2'],
        ['u_matrix', 'u_exmatrix', 'u_texture', 'u_texsize', 'u_zoom', 'u_fadedist', 'u_minfadezoom', 'u_maxfadezoom', 'u_fadezoom', 'u_opacity', 'u_skewed', 'u_extra']);

    this.outlineShader = gl.initializeShader('outline',
        ['a_pos'],
        ['u_matrix', 'u_color', 'u_world']
    );

    this.patternShader = gl.initializeShader('pattern',
        ['a_pos'],
        ['u_matrix', 'u_pattern_tl_a', 'u_pattern_br_a', 'u_pattern_tl_b', 'u_pattern_br_b', 'u_mix', 'u_patternmatrix_a', 'u_patternmatrix_b', 'u_opacity', 'u_image']
    );

    this.fillShader = gl.initializeShader('fill',
        ['a_pos'],
        ['u_matrix', 'u_color']
    );

    this.collisionBoxShader = gl.initializeShader('collisionbox',
        ['a_pos', 'a_extrude', 'a_data'],
        ['u_matrix', 'u_scale', 'u_zoom', 'u_maxzoom']
    );

    this.identityMatrix = mat4.create();

    // The backgroundBuffer is used when drawing to the full *canvas*
    this.backgroundBuffer = gl.createBuffer();
    this.backgroundBuffer.itemSize = 2;
    this.backgroundBuffer.itemCount = 4;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.backgroundBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Int16Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    // The tileExtentBuffer is used when drawing to a full *tile*
    this.tileExtentBuffer = gl.createBuffer();
    this.tileExtentBuffer.itemSize = 4;
    this.tileExtentBuffer.itemCount = 4;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tileExtentBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Int16Array([
        // tile coord x, tile coord y, texture coord x, texture coord y
                      0, 0,                    0, 0,
        this.tileExtent, 0,                32767, 0,
                      0, this.tileExtent,      0, 32767,
        this.tileExtent, this.tileExtent,  32767, 32767
    ]), gl.STATIC_DRAW);

    // The debugBuffer is used to draw tile outlines for debugging
    this.debugBuffer = gl.createBuffer();
    this.debugBuffer.itemSize = 2;
    this.debugBuffer.itemCount = 5;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.debugBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Int16Array([0, 0, 4095, 0, 4095, 4095, 0, 4095, 0, 0]), gl.STATIC_DRAW);

    // The debugTextBuffer is used to draw tile IDs for debugging
    this.debugTextBuffer = gl.createBuffer();
    this.debugTextBuffer.itemSize = 2;
};

/*
 * Reset the color buffers of the drawing canvas.
 */
GLPainter.prototype.clearColor = function() {
    var gl = this.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
};

/*
 * Reset the drawing canvas by clearing the stencil buffer so that we can draw
 * new tiles at the same location, while retaining previously drawn pixels.
 */
GLPainter.prototype.clearStencil = function() {
    var gl = this.gl;
    gl.clearStencil(0x0);
    gl.stencilMask(0xFF);
    gl.clear(gl.STENCIL_BUFFER_BIT);
};

GLPainter.prototype.drawClippingMask = function(tile) {
    var gl = this.gl;
    gl.switchShader(this.fillShader, tile.posMatrix);
    gl.colorMask(false, false, false, false);

    // Clear the entire stencil buffer, except for the 7th bit, which stores
    // the global clipping mask that allows us to avoid drawing in regions of
    // tiles we've already painted in.
    gl.clearStencil(0x0);
    gl.stencilMask(0xBF);
    gl.clear(gl.STENCIL_BUFFER_BIT);

    // The stencil test will fail always, meaning we set all pixels covered
    // by this geometry to 0x80. We use the highest bit 0x80 to mark the regions
    // we want to draw in. All pixels that have this bit *not* set will never be
    // drawn in.
    gl.stencilFunc(gl.EQUAL, 0xC0, 0x40);
    gl.stencilMask(0xC0);
    gl.stencilOp(gl.REPLACE, gl.KEEP, gl.KEEP);

    // Draw the clipping mask
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tileExtentBuffer);
    gl.vertexAttribPointer(this.fillShader.a_pos, this.tileExtentBuffer.itemSize, gl.SHORT, false, 8, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.tileExtentBuffer.itemCount);

    gl.stencilFunc(gl.EQUAL, 0x80, 0x80);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
    gl.stencilMask(0x00);
    gl.colorMask(true, true, true, true);
};

// Overridden by headless tests.
GLPainter.prototype.prepareBuffers = function() {};
GLPainter.prototype.bindDefaultFramebuffer = function() {
    var gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

var draw = {
    symbol: require('./draw_symbol'),
    line: require('./draw_line'),
    fill: require('./draw_fill'),
    raster: require('./draw_raster'),
    background: require('./draw_background'),
    debug: require('./draw_debug'),
    vertices: require('./draw_vertices')
};

GLPainter.prototype.render = function(style, options) {
    this.style = style;
    this.options = options;

    this.lineAtlas = style.lineAtlas;

    this.spriteAtlas = style.spriteAtlas;
    this.spriteAtlas.setSprite(style.sprite);

    this.glyphAtlas = style.glyphAtlas;
    this.glyphAtlas.bind(this.gl);

    this.frameHistory.record(this.transform.zoom);

    this.prepareBuffers();
    this.clearColor();

    for (var i = style._groups.length - 1; i >= 0; i--) {
        var group = style._groups[i];
        var source = style.sources[group.source];

        if (source) {
            this.clearStencil();
            source.render(group, this);

        } else if (group.source === undefined) {
            this.drawLayers(group, this.identityMatrix);
        }
    }
};

GLPainter.prototype.drawTile = function(tile, layers) {
    this.drawClippingMask(tile);
    this.drawLayers(layers, tile.posMatrix, tile);

    if (this.options.debug) {
        draw.debug(this, tile);
    }
};

GLPainter.prototype.drawLayers = function(layers, matrix, tile) {
    for (var i = layers.length - 1; i >= 0; i--) {
        var layer = layers[i];

        if (layer.hidden)
            continue;

        draw[layer.type](this, layer, matrix, tile);

        if (this.options.vertices) {
            draw.vertices(this, layer, matrix, tile);
        }
    }
};

// Draws non-opaque areas. This is for debugging purposes.
GLPainter.prototype.drawStencilBuffer = function() {
    var gl = this.gl;
    gl.switchShader(this.fillShader, this.identityMatrix);

    // Blend to the front, not the back.
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.stencilMask(0x00);
    gl.stencilFunc(gl.EQUAL, 0x80, 0x80);

    // Drw the filling quad where the stencil buffer isn't set.
    gl.bindBuffer(gl.ARRAY_BUFFER, this.backgroundBuffer);
    gl.vertexAttribPointer(this.fillShader.a_pos, this.backgroundBuffer.itemSize, gl.SHORT, false, 0, 0);
    gl.uniform4fv(this.fillShader.u_color, [0, 0, 0, 0.5]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.backgroundBuffer.itemCount);

    // Revert blending mode to blend to the back.
    gl.blendFunc(gl.ONE_MINUS_DST_ALPHA, gl.ONE);
};

GLPainter.prototype.translateMatrix = function(matrix, tile, translate, anchor) {
    if (!translate[0] && !translate[1]) return matrix;

    if (anchor === 'viewport') {
        var sinA = Math.sin(-this.transform.angle);
        var cosA = Math.cos(-this.transform.angle);
        translate = [
            translate[0] * cosA - translate[1] * sinA,
            translate[0] * sinA + translate[1] * cosA
        ];
    }

    var tilePixelRatio = this.transform.scale / (1 << tile.coord.z) / (tile.tileExtent / tile.tileSize);
    var translation = [
        translate[0] / tilePixelRatio,
        translate[1] / tilePixelRatio,
        0
    ];

    var translatedMatrix = new Float32Array(16);
    mat4.translate(translatedMatrix, matrix, translation);
    return translatedMatrix;
};

GLPainter.prototype.saveTexture = function(texture) {
    var textures = this.reusableTextures[texture.size];
    if (!textures) {
        this.reusableTextures[texture.size] = [texture];
    } else {
        textures.push(texture);
    }
};


GLPainter.prototype.getTexture = function(size) {
    var textures = this.reusableTextures[size];
    return textures && textures.length > 0 ? textures.pop() : null;
};

},{"../util/browser":96,"./draw_background":33,"./draw_debug":35,"./draw_fill":36,"./draw_line":37,"./draw_raster":38,"./draw_symbol":39,"./draw_vertices":40,"./frame_history":41,"./gl_util":42,"gl-matrix":115}],45:[function(require,module,exports){
'use strict';

var glify = undefined;

module.exports = {
    "debug": {"vertex":"precision mediump float;attribute vec2 a_pos;uniform float u_pointsize;uniform mat4 u_matrix;void main(){gl_Position=u_matrix*vec4(a_pos,step(32767.,a_pos.x),1);gl_PointSize=u_pointsize;}","fragment":"precision mediump float;uniform vec4 u_color;void main(){gl_FragColor=u_color;}"},
    "dot": {"vertex":"precision mediump float;uniform mat4 u_matrix;uniform float u_size;attribute vec2 a_pos;void main(){gl_Position=u_matrix*vec4(a_pos,0,1);gl_PointSize=u_size;}","fragment":"precision mediump float;uniform vec4 u_color;uniform float u_blur;void main(){float a,b;a=length(gl_PointCoord-.5);b=smoothstep(.5,.5-u_blur,a);gl_FragColor=u_color*b;}"},
    "fill": {"vertex":"precision mediump float;attribute vec2 a_pos;uniform mat4 u_matrix;void main(){gl_Position=u_matrix*vec4(a_pos,0,1);gl_PointSize=2.;}","fragment":"precision mediump float;uniform vec4 u_color;void main(){gl_FragColor=u_color;}"},
    "gaussian": {"vertex":"precision mediump float;attribute vec2 a_pos;uniform mat4 u_matrix;uniform vec2 u_offset;varying vec2 a[3];void main(){gl_Position=u_matrix*vec4(a_pos,0,1);vec2 b=gl_Position.xy/2.+.5;a[0]=b;a[1]=b+u_offset*1.1824255238063563;a[2]=b-u_offset*1.1824255238063563;}","fragment":"precision mediump float;uniform sampler2D u_image;varying vec2 a[3];void main(){vec4 b=vec4(0);b+=texture2D(u_image,a[0])*.40261994689424746;b+=texture2D(u_image,a[1])*.2986900265528763;b+=texture2D(u_image,a[2])*.2986900265528763;gl_FragColor=b;}"},
    "line": {"vertex":"precision mediump float;attribute vec2 a_pos;attribute vec4 a_data;uniform mat4 u_matrix;uniform float u_ratio,u_extra;uniform vec2 u_linewidth;uniform vec4 u_color;uniform mat2 u_antialiasingmatrix;varying vec2 a;varying float b,c;void main(){vec2 d,e;d=a_data.xy;e=mod(a_pos,2.);e.y=sign(e.y-.5);a=e;vec4 f=vec4(u_linewidth.s*d*.015873016,0,0);gl_Position=u_matrix*vec4(floor(a_pos*.5)+f.xy/u_ratio,0,1);float g,h,i;g=gl_Position.y/gl_Position.w;h=length(d)/length(u_antialiasingmatrix*d);i=1./(1.-g*u_extra);c=i*h;}","fragment":"precision mediump float;uniform vec2 u_linewidth,u_dasharray;uniform vec4 u_color;uniform float u_blur;varying vec2 a;varying float b,c;void main(){float d,e,f;d=length(a)*u_linewidth.s;e=u_blur*c;f=clamp(min(d-(u_linewidth.t-e),u_linewidth.s-d)/e,0.,1.);gl_FragColor=u_color*f;}"},
    "linepattern": {"vertex":"precision mediump float;attribute vec2 a_pos;attribute vec4 a_data;uniform mat4 u_matrix,u_exmatrix;uniform float u_ratio;uniform vec2 u_linewidth;uniform vec4 u_color;varying vec2 a;varying float b;void main(){vec2 c,e,f,g;c=a_data.xy;float d=a_data.z*128.+a_data.w;e=mod(a_pos,2.);e.y=sign(e.y-.5);a=e;f=c*.015873016;g=u_linewidth.s*f;gl_Position=u_matrix*vec4(floor(a_pos*.5)+g.xy/u_ratio,0,1);b=d;}","fragment":"precision mediump float;uniform vec2 u_linewidth,u_pattern_size_a,u_pattern_size_b,u_pattern_tl_a,u_pattern_br_a,u_pattern_tl_b,u_pattern_br_b;uniform float u_point,u_blur,u_fade,u_opacity;uniform sampler2D u_image;varying vec2 a;varying float b;void main(){float c,d,e,f,g,h;c=length(a)*u_linewidth.s;d=clamp(min(c-(u_linewidth.t-u_blur),u_linewidth.s-c)/u_blur,0.,1.);e=mod(b/u_pattern_size_a.x,1.);f=mod(b/u_pattern_size_b.x,1.);g=.5+a.y*u_linewidth.s/u_pattern_size_a.y;h=.5+a.y*u_linewidth.s/u_pattern_size_b.y;vec2 i,j;i=mix(u_pattern_tl_a,u_pattern_br_a,vec2(e,g));j=mix(u_pattern_tl_b,u_pattern_br_b,vec2(f,h));vec4 k=mix(texture2D(u_image,i),texture2D(u_image,j),u_fade);d*=u_opacity;gl_FragColor=k*d;}"},
    "linesdfpattern": {"vertex":"precision mediump float;attribute vec2 a_pos;attribute vec4 a_data;uniform mat4 u_matrix,u_exmatrix;uniform vec2 u_linewidth,u_patternscale_a,u_patternscale_b;uniform float u_ratio,u_tex_y_a,u_tex_y_b;varying vec2 a,b,c;void main(){vec2 d,f;d=a_data.xy;float e=a_data.z*128.+a_data.w;f=mod(a_pos,2.);f.y=sign(f.y-.5);a=f;vec4 g=vec4(u_linewidth.s*d*.015873016,0,0);gl_Position=u_matrix*vec4(floor(a_pos*.5)+g.xy/u_ratio,0,1);b=vec2(e*u_patternscale_a.x,f.y*u_patternscale_a.y+u_tex_y_a);c=vec2(e*u_patternscale_b.x,f.y*u_patternscale_b.y+u_tex_y_b);}","fragment":"precision mediump float;uniform vec2 u_linewidth;uniform vec4 u_color;uniform float u_blur,u_sdfgamma,u_mix;uniform sampler2D u_image;varying vec2 a,b,c;void main(){float d,e,f,g,h;d=length(a)*u_linewidth.s;e=clamp(min(d-(u_linewidth.t-u_blur),u_linewidth.s-d)/u_blur,0.,1.);f=texture2D(u_image,b).a;g=texture2D(u_image,c).a;h=mix(f,g,u_mix);e*=smoothstep(.5-u_sdfgamma,.5+u_sdfgamma,h);gl_FragColor=u_color*e;}"},
    "outline": {"vertex":"precision mediump float;attribute vec2 a_pos;uniform mat4 u_matrix;uniform vec2 u_world;varying vec2 a;void main(){gl_Position=u_matrix*vec4(a_pos,0,1);a=(gl_Position.xy/gl_Position.w+1.)/2.*u_world;}","fragment":"precision mediump float;uniform vec4 u_color;varying vec2 a;void main(){float b,c;b=length(a-gl_FragCoord.xy);c=smoothstep(1.,0.,b);gl_FragColor=u_color*c;}"},
    "pattern": {"vertex":"precision mediump float;uniform mat4 u_matrix;uniform mat3 u_patternmatrix_a,u_patternmatrix_b;attribute vec2 a_pos;varying vec2 a,b;void main(){gl_Position=u_matrix*vec4(a_pos,0,1);a=(u_patternmatrix_a*vec3(a_pos,1)).xy;b=(u_patternmatrix_b*vec3(a_pos,1)).xy;}","fragment":"precision mediump float;uniform float u_opacity,u_mix;uniform vec2 u_pattern_tl_a,u_pattern_br_a,u_pattern_tl_b,u_pattern_br_b;uniform sampler2D u_image;varying vec2 a,b;void main(){vec2 c,d,f,g;c=mod(a,1.);d=mix(u_pattern_tl_a,u_pattern_br_a,c);vec4 e,h;e=texture2D(u_image,d);f=mod(b,1.);g=mix(u_pattern_tl_b,u_pattern_br_b,f);h=texture2D(u_image,g);gl_FragColor=mix(e,h,u_mix)*u_opacity;}"},
    "raster": {"vertex":"precision mediump float;uniform mat4 u_matrix;uniform vec2 u_tl_parent;uniform float u_scale_parent,u_buffer_scale;attribute vec2 a_pos,a_texture_pos;varying vec2 a,b;void main(){gl_Position=u_matrix*vec4(a_pos,0,1);a=(a_texture_pos/32767.-.5)/u_buffer_scale+.5;b=a*u_scale_parent+u_tl_parent;}","fragment":"precision mediump float;uniform float u_opacity0,u_opacity1,u_brightness_low,u_brightness_high,u_saturation_factor,u_contrast_factor;uniform sampler2D u_image0,u_image1;varying vec2 a,b;uniform vec3 u_spin_weights;void main(){vec4 c,d,e;c=texture2D(u_image0,a);d=texture2D(u_image1,b);e=c*u_opacity0+d*u_opacity1;vec3 f,h,i;f=e.rgb;f=vec3(dot(f,u_spin_weights.xyz),dot(f,u_spin_weights.zxy),dot(f,u_spin_weights.yzx));float g=(e.r+e.g+e.b)/3.;f+=(g-f)*u_saturation_factor;f=(f-.5)*u_contrast_factor+.5;h=vec3(u_brightness_low);i=vec3(u_brightness_high);gl_FragColor=vec4(mix(h,i,f),e.a);}"},
    "icon": {"vertex":"precision mediump float;attribute vec2 a_pos,a_offset;attribute vec4 a_data1,a_data2;uniform mat4 u_matrix,u_exmatrix;uniform float u_zoom,u_fadedist,u_minfadezoom,u_maxfadezoom,u_fadezoom,u_opacity,u_extra;uniform bool u_skewed;uniform vec2 u_texsize;varying vec2 a;varying float b;void main(){vec2 c,e;c=a_data1.xy;float d,f,g,h,i,j;d=a_data1[2];e=a_data2.st;f=e[0];g=e[1];h=10.;i=2.-step(f,u_zoom)-(1.-step(g,u_zoom));j=clamp((u_fadezoom-d)/u_fadedist,0.,1.);if(u_fadedist>=0.)b=j;else b=1.-j;if(u_maxfadezoom<d)b=0.;if(u_minfadezoom>=d)b=1.;i+=step(b,0.);if(u_skewed){vec4 k=u_exmatrix*vec4(a_offset/64.,0,0);gl_Position=u_matrix*vec4(a_pos+k.xy,0,1);gl_Position.z+=i*gl_Position.w;}else{vec4 k=u_exmatrix*vec4(a_offset/64.,i,0);gl_Position=u_matrix*vec4(a_pos,0,1)+k;}a=c/u_texsize;b*=u_opacity;}","fragment":"precision mediump float;uniform sampler2D u_texture;varying vec2 a;varying float b;void main(){gl_FragColor=texture2D(u_texture,a)*b;}"},
    "sdf": {"vertex":"precision mediump float;attribute vec2 a_pos,a_offset;attribute vec4 a_data1,a_data2;uniform mat4 u_matrix,u_exmatrix;uniform float u_zoom,u_fadedist,u_minfadezoom,u_maxfadezoom,u_fadezoom,u_extra;uniform bool u_skewed;uniform vec2 u_texsize;varying vec2 a;varying float b,c;void main(){vec2 d,f;d=a_data1.xy;float e,g,h,i,j,k,l;e=a_data1[2];f=a_data2.st;g=f[0];h=f[1];i=2.-step(g,u_zoom)-(1.-step(h,u_zoom));j=clamp((u_fadezoom-e)/u_fadedist,0.,1.);if(u_fadedist>=0.)b=j;else b=1.-j;if(u_maxfadezoom<e)b=0.;if(u_minfadezoom>=e)b=1.;i+=step(b,0.);if(u_skewed){vec4 k=u_exmatrix*vec4(a_offset/64.,0,0);gl_Position=u_matrix*vec4(a_pos+k.xy,0,1);gl_Position.z+=i*gl_Position.w;}else{vec4 k=u_exmatrix*vec4(a_offset/64.,i,0);gl_Position=u_matrix*vec4(a_pos,0,1)+k;}k=gl_Position.y/gl_Position.w;l=1./(1.-k*u_extra);c=l;a=d/u_texsize;}","fragment":"precision mediump float;uniform sampler2D u_texture;uniform vec4 u_color;uniform float u_buffer,u_gamma;varying vec2 a;varying float b,c;void main(){float d,e,f;d=u_gamma*c;e=texture2D(u_texture,a).a;f=smoothstep(u_buffer-d,u_buffer+d,e)*b;gl_FragColor=u_color*f;}"},
    "collisionbox": {"vertex":"precision mediump float;attribute vec2 a_pos,a_extrude,a_data;uniform mat4 u_matrix;uniform float u_scale;varying float a,b;void main(){gl_Position=u_matrix*vec4(a_pos+a_extrude/u_scale,0,1);a=a_data.x;b=a_data.y;}","fragment":"precision mediump float;uniform float u_zoom,u_maxzoom;varying float a,b;void main(){float c=.5;gl_FragColor=vec4(0,1,0,1)*c;if(b>u_zoom)gl_FragColor=vec4(1,0,0,1)*c;if(u_zoom>=a)gl_FragColor=vec4(0,0,0,1)*c*.25;if(b>=u_maxzoom)gl_FragColor=vec4(0,0,1,1)*c*.2;}"}
};

},{}],46:[function(require,module,exports){
'use strict';

var util = require('../util/util');
var Evented = require('../util/evented');
var TilePyramid = require('./tile_pyramid');
var Source = require('./source');

module.exports = GeoJSONSource;

/**
 * Create a GeoJSON data source instance given an options object
 * @class GeoJSONSource
 * @param {Object} [options]
 * @param {Object|String} options.data A GeoJSON data object or URL to it. The latter is preferable in case of large GeoJSON files.
 * @param {Number} [options.maxzoom=14] Maximum zoom to preserve detail at.
 * @example
 * var sourceObj = new mapboxgl.GeoJSONSource({
 *    data: {
 *        "type": "FeatureCollection",
 *        "features": [{
 *            "type": "Feature",
 *            "geometry": {
 *                "type": "Point",
 *                "coordinates": [
 *                    -76.53063297271729,
 *                    39.18174077994108
 *                ]
 *            }
 *        }]
 *    }
 * });
 * map.addSource('some id', sourceObj); // add
 * map.removeSource('some id');  // remove
 */
function GeoJSONSource(options) {
    options = options || {};

    this._data = options.data;

    if (options.maxzoom !== undefined) this.maxzoom = options.maxzoom;

    this._pyramid = new TilePyramid({
        tileSize: 512,
        minzoom: this.minzoom,
        maxzoom: this.maxzoom,
        cacheSize: 20,
        load: this._loadTile.bind(this),
        abort: this._abortTile.bind(this),
        unload: this._unloadTile.bind(this),
        add: this._addTile.bind(this),
        remove: this._removeTile.bind(this)
    });
}

GeoJSONSource.prototype = util.inherit(Evented, /** @lends GeoJSONSource.prototype */{
    minzoom: 0,
    maxzoom: 14,
    _dirty: true,

    /**
     * Update source geojson data and rerender map
     *
     * @param {Object|String} data A GeoJSON data object or URL to it. The latter is preferable in case of large GeoJSON files.
     * @returns {GeoJSONSource} this
     */
    setData: function(data) {
        this._data = data;
        this._dirty = true;

        this.fire('change');

        if (this.map)
            this.update(this.map.transform);

        return this;
    },

    onAdd: function(map) {
        this.map = map;
    },

    loaded: function() {
        return this._loaded && this._pyramid.loaded();
    },

    update: function(transform) {
        if (this._dirty) {
            this._updateData();
        }

        if (this._loaded) {
            this._pyramid.update(this.used, transform);
        }
    },

    reload: function() {
        this._pyramid.reload();
    },

    render: Source._renderTiles,
    featuresAt: Source._vectorFeaturesAt,

    _updateData: function() {
        this._dirty = false;

        this.workerID = this.dispatcher.send('parse geojson', {
            data: this._data,
            tileSize: 512,
            source: this.id,
            maxZoom: this.maxzoom,
            parentHref: typeof window !== 'undefined' && window.location.href
        }, function(err) {

            if (err) {
                this.fire('error', {error: err});
                return;
            }
            this._loaded = true;
            this._pyramid.reload();

            this.fire('change');
        }.bind(this));
    },

    _loadTile: function(tile) {
        var overscaling = tile.coord.z > this.maxzoom ? Math.pow(2, tile.coord.z - this.maxzoom) : 1;
        var params = {
            uid: tile.uid,
            coord: tile.coord,
            zoom: tile.coord.z,
            maxZoom: this.maxzoom,
            tileSize: 512,
            source: this.id,
            overscaling: overscaling,
            angle: this.map.transform.angle,
            pitch: this.map.transform.pitch,
            collisionDebug: this.map.collisionDebug
        };

        tile.workerID = this.dispatcher.send('load geojson tile', params, function(err, data) {

            tile.unloadVectorData(this.map.painter);

            if (tile.aborted)
                return;

            if (err) {
                this.fire('tile.error', {tile: tile});
                return;
            }

            tile.loadVectorData(data);
            this.fire('tile.load', {tile: tile});

        }.bind(this), this.workerID);
    },

    _abortTile: function(tile) {
        tile.aborted = true;
    },

    _addTile: function(tile) {
        this.fire('tile.add', {tile: tile});
    },

    _removeTile: function(tile) {
        this.fire('tile.remove', {tile: tile});
    },

    _unloadTile: function(tile) {
        tile.unloadVectorData(this.map.painter);
        this.glyphAtlas.removeGlyphs(tile.uid);
        this.dispatcher.send('remove tile', { uid: tile.uid, source: this.id }, null, tile.workerID);
    }
});

},{"../util/evented":101,"../util/util":107,"./source":49,"./tile_pyramid":52}],47:[function(require,module,exports){
'use strict';

var Point = require('point-geometry');
var VectorTileFeature = require('vector-tile').VectorTileFeature;

module.exports = GeoJSONWrapper;

// conform to vectortile api
function GeoJSONWrapper(features) {
    this.features = features;
    this.length = features.length;
}

GeoJSONWrapper.prototype.feature = function(i) {
    return new FeatureWrapper(this.features[i]);
};

function FeatureWrapper(feature) {
    this.type = feature.type;
    this.rawGeometry = feature.type === 1 ? [feature.geometry] : feature.geometry;
    this.properties = feature.tags;
    this.extent = 4096;
}

FeatureWrapper.prototype.loadGeometry = function() {
    var rings = this.rawGeometry;
    this.geometry = [];

    for (var i = 0; i < rings.length; i++) {
        var ring = rings[i],
            newRing = [];
        for (var j = 0; j < ring.length; j++) {
            newRing.push(new Point(ring[j][0], ring[j][1]));
        }
        this.geometry.push(newRing);
    }
    return this.geometry;
};

FeatureWrapper.prototype.bbox = function() {
    if (!this.geometry) this.loadGeometry();

    var rings = this.geometry,
        x1 = Infinity,
        x2 = -Infinity,
        y1 = Infinity,
        y2 = -Infinity;

    for (var i = 0; i < rings.length; i++) {
        var ring = rings[i];

        for (var j = 0; j < ring.length; j++) {
            var coord = ring[j];

            x1 = Math.min(x1, coord.x);
            x2 = Math.max(x2, coord.x);
            y1 = Math.min(y1, coord.y);
            y2 = Math.max(y2, coord.y);
        }
    }

    return [x1, y1, x2, y2];
};

FeatureWrapper.prototype.toGeoJSON = VectorTileFeature.prototype.toGeoJSON;

},{"point-geometry":124,"vector-tile":127}],48:[function(require,module,exports){
'use strict';

var util = require('../util/util');
var ajax = require('../util/ajax');
var Evented = require('../util/evented');
var Source = require('./source');
var normalizeURL = require('../util/mapbox').normalizeTileURL;

module.exports = RasterTileSource;

function RasterTileSource(options) {
    util.extend(this, util.pick(options, ['url', 'tileSize']));

    Source._loadTileJSON.call(this, options);
}

RasterTileSource.prototype = util.inherit(Evented, {
    minzoom: 0,
    maxzoom: 22,
    tileSize: 512,
    _loaded: false,

    onAdd: function(map) {
        this.map = map;
    },

    loaded: function() {
        return this._pyramid && this._pyramid.loaded();
    },

    update: function(transform) {
        if (this._pyramid) {
            this._pyramid.update(this.used, transform, this.map.style.rasterFadeDuration);
        }
    },

    render: Source._renderTiles,

    _loadTile: function(tile) {
        ajax.getImage(normalizeURL(tile.coord.url(this.tiles), this.url), function(err, img) {
            if (tile.aborted)
                return;

            if (err) {
                this.fire('tile.error', {tile: tile});
                return;
            }

            var gl = this.map.painter.gl;
            tile.texture = this.map.painter.getTexture(img.width);
            if (tile.texture) {
                gl.bindTexture(gl.TEXTURE_2D, tile.texture);
                gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, img);
            } else {
                tile.texture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, tile.texture);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
                tile.texture.size = img.width;
            }
            gl.generateMipmap(gl.TEXTURE_2D);

            tile.timeAdded = new Date().getTime();
            this.map.animationLoop.set(this.style.rasterFadeDuration);

            tile.source = this;
            tile.loaded = true;

            this.fire('tile.load', {tile: tile});
        }.bind(this));
    },

    _abortTile: function(tile) {
        tile.aborted = true;
    },

    _addTile: function(tile) {
        this.fire('tile.add', {tile: tile});
    },

    _removeTile: function(tile) {
        this.fire('tile.remove', {tile: tile});
    },

    _unloadTile: function(tile) {
        if (tile.texture) this.map.painter.saveTexture(tile.texture);
    },

    featuresAt: function(point, params, callback) {
        callback(null, []);
    }
});

},{"../util/ajax":95,"../util/evented":101,"../util/mapbox":104,"../util/util":107,"./source":49}],49:[function(require,module,exports){
'use strict';

var util = require('../util/util');
var ajax = require('../util/ajax');
var browser = require('../util/browser');
var TilePyramid = require('./tile_pyramid');
var TileCoord = require('./tile_coord');
var normalizeURL = require('../util/mapbox').normalizeSourceURL;

exports._loadTileJSON = function(options) {
    var loaded = function(err, tileJSON) {
        if (err) {
            this.fire('error', {error: err});
            return;
        }

        util.extend(this, util.pick(tileJSON,
            ['tiles', 'minzoom', 'maxzoom', 'attribution']));

        this._pyramid = new TilePyramid({
            tileSize: this.tileSize,
            cacheSize: 20,
            minzoom: this.minzoom,
            maxzoom: this.maxzoom,
            reparseOverscaled: this.reparseOverscaled,
            load: this._loadTile.bind(this),
            abort: this._abortTile.bind(this),
            unload: this._unloadTile.bind(this),
            add: this._addTile.bind(this),
            remove: this._removeTile.bind(this),
            redoPlacement: this._redoTilePlacement ? this._redoTilePlacement.bind(this) : undefined
        });

        this.fire('load');
    }.bind(this);

    if (options.url) {
        ajax.getJSON(normalizeURL(options.url), loaded);
    } else {
        browser.frame(loaded.bind(this, null, options));
    }
};

exports._renderTiles = function(layers, painter) {
    if (!this._pyramid)
        return;

    var ids = this._pyramid.renderedIDs();
    for (var i = 0; i < ids.length; i++) {
        var tile = this._pyramid.getTile(ids[i]),
            // coord is different than tile.coord for wrapped tiles since the actual
            // tile object is shared between all the visible copies of that tile.
            coord = TileCoord.fromID(ids[i]),
            z = coord.z,
            x = coord.x,
            y = coord.y,
            w = coord.w;

        // if z > maxzoom then the tile is actually a overscaled maxzoom tile,
        // so calculate the matrix the maxzoom tile would use.
        z = Math.min(z, this.maxzoom);

        x += w * (1 << z);
        tile.calculateMatrices(z, x, y, painter.transform, painter);

        painter.drawTile(tile, layers);
    }
};

exports._vectorFeaturesAt = function(coord, params, callback) {
    if (!this._pyramid)
        return callback(null, []);

    var result = this._pyramid.tileAt(coord);
    if (!result)
        return callback(null, []);

    this.dispatcher.send('query features', {
        uid: result.tile.uid,
        x: result.x,
        y: result.y,
        scale: result.scale,
        source: this.id,
        params: params
    }, callback, result.tile.workerID);
};

/*
 * Create a tiled data source instance given an options object
 *
 * @param {Object} options
 * @param {String} options.type Either `raster` or `vector`.
 * @param {String} options.url A tile source URL. This should either be `mapbox://{mapid}` or a full `http[s]` url that points to a TileJSON endpoint.
 * @param {Array} options.tiles An array of tile sources. If `url` is not specified, `tiles` can be used instead to specify tile sources, as in the TileJSON spec. Other TileJSON keys such as `minzoom` and `maxzoom` can be specified in a source object if `tiles` is used.
 * @param {String} options.id An optional `id` to assign to the source
 * @param {Number} [options.tileSize=512] Optional tile size (width and height in pixels, assuming tiles are square). This option is only configurable for raster sources
 * @param {Number} options.cacheSize Optional max number of tiles to cache at any given time
 * @example
 * var sourceObj = new mapboxgl.Source.create({
 *    type: 'vector',
 *    url: 'mapbox://mapbox.mapbox-streets-v5'
 * });
 * map.addSource('some id', sourceObj); // add
 * map.removeSource('some id');  // remove
 */
exports.create = function(source) {
    // This is not at file scope in order to avoid a circular require.
    var sources = {
        vector: require('./vector_tile_source'),
        raster: require('./raster_tile_source'),
        geojson: require('./geojson_source'),
        video: require('./video_source')
    };

    for (var type in sources) {
        if (source instanceof sources[type]) {
            return source;
        }
    }

    return new sources[source.type](source);
};

},{"../util/ajax":95,"../util/browser":96,"../util/mapbox":104,"../util/util":107,"./geojson_source":46,"./raster_tile_source":48,"./tile_coord":51,"./tile_pyramid":52,"./vector_tile_source":53,"./video_source":54}],50:[function(require,module,exports){
'use strict';

var glmatrix = require('gl-matrix');
var mat2 = glmatrix.mat2;
var mat4 = glmatrix.mat4;
var util = require('../util/util');
var BufferSet = require('../data/buffer/buffer_set');

module.exports = Tile;

/**
 * A tile object is the combination of a Coordinate, which defines
 * its place, as well as a unique ID and data tracking for its content
 *
 * @param {Coordinate} coord
 * @param {number} size
 */
function Tile(coord, size) {
    this.coord = coord;
    this.uid = util.uniqueId();
    this.loaded = false;
    this.uses = 0;
    this.tileSize = size;
}

Tile.prototype = {
    // todo unhardcode
    tileExtent: 4096,

    /**
     * Calculate the internal posMatrix that this tile uses to display
     * itself in a map, given a coordinate as (z, x, y) and a transform
     * @param {number} z
     * @param {number} x
     * @param {number} y
     * @param {Object} transform
     */
    calculateMatrices: function(z, x, y, transform) {

        // Initialize model-view matrix that converts from the tile coordinates
        // to screen coordinates.
        var tileScale = Math.pow(2, z);
        var scale = transform.worldSize / tileScale;

        // TODO: remove
        this.scale = scale;

        // The position matrix
        this.posMatrix = new Float64Array(16);
        mat4.identity(this.posMatrix);
        mat4.translate(this.posMatrix, this.posMatrix, [x * scale, y * scale, 0]);

        mat4.scale(this.posMatrix, this.posMatrix, [ scale / this.tileExtent, scale / this.tileExtent, 1 ]);
        mat4.multiply(this.posMatrix, transform.getProjMatrix(), this.posMatrix);

        // The extrusion matrix.
        this.exMatrix = mat4.create();
        mat4.ortho(this.exMatrix, 0, transform.width, transform.height, 0, 0, -1);
        //mat4.rotateZ(this.exMatrix, this.exMatrix, -transform.angle);

        // 2x2 matrix for rotating points
        this.rotationMatrix = mat2.create();
        mat2.rotate(this.rotationMatrix, this.rotationMatrix, transform.angle);

        this.posMatrix = new Float32Array(this.posMatrix);
    },

    /**
     * Given a coordinate position, zoom that coordinate to my zoom and
     * scale and return a position in x, y, scale
     * @param {Coordinate} coord
     * @returns {Object} position
     */
    positionAt: function(coord, sourceMaxZoom) {
        coord = coord.zoomTo(Math.min(this.coord.z, sourceMaxZoom));
        return {
            x: (coord.column - this.coord.x) * 4096,
            y: (coord.row - this.coord.y) * 4096,
            scale: this.scale
        };
    },

    /**
     * Given a data object with a 'buffers' property, load it into
     * this tile's elementGroups and buffers properties and set loaded
     * to true. If the data is null, like in the case of an empty
     * GeoJSON tile, no-op but still set loaded to true.
     * @param {Object} data
     * @returns {undefined}
     */
    loadVectorData: function(data) {
        this.loaded = true;

        // empty GeoJSON tile
        if (!data) return;

        this.buffers = new BufferSet(data.buffers);
        this.elementGroups = data.elementGroups;
    },

    /**
     * given a data object and a GL painter, destroy and re-create
     * all of its buffers.
     * @param {Object} data
     * @param {Object} painter
     * @returns {undefined}
     */
    reloadSymbolData: function(data, painter) {

        if (!this.buffers) {
            // the tile has been destroyed
            return;
        }

        this.buffers.glyphVertex.destroy(painter.gl);
        this.buffers.glyphElement.destroy(painter.gl);
        this.buffers.iconVertex.destroy(painter.gl);
        this.buffers.iconElement.destroy(painter.gl);
        this.buffers.collisionBoxVertex.destroy(painter.gl);

        var buffers = new BufferSet(data.buffers);
        this.buffers.glyphVertex = buffers.glyphVertex;
        this.buffers.glyphElement = buffers.glyphElement;
        this.buffers.iconVertex = buffers.iconVertex;
        this.buffers.iconElement = buffers.iconElement;
        this.buffers.collisionBoxVertex = buffers.collisionBoxVertex;

        for (var id in data.elementGroups) {
            this.elementGroups[id] = data.elementGroups[id];
        }
    },

    /**
     * Make sure that this tile doesn't own any data within a given
     * painter, so that it doesn't consume any memory or maintain
     * any references to the painter.
     * @param {Object} painter gl painter object
     * @returns {undefined}
     */
    unloadVectorData: function(painter) {
        for (var b in this.buffers) {
            this.buffers[b].destroy(painter.gl);
        }
        this.buffers = null;
    }
};

},{"../data/buffer/buffer_set":12,"../util/util":107,"gl-matrix":115}],51:[function(require,module,exports){
'use strict';

module.exports = TileCoord;

function TileCoord(z, x, y, w) {
    if (w === undefined) w = 0;
    this.z = z;
    this.x = x;
    this.y = y;
    this.w = w;

    // calculate id
    w *= 2;
    if (w < 0) w = w * -1 - 1;
    var dim = 1 << this.z;
    this.id = ((dim * dim * w + dim * this.y + this.x) * 32) + this.z;
}

TileCoord.prototype.toString = function() {
    return this.z + "/" + this.x + "/" + this.y;
};

// Parse a packed integer id into a TileCoord object
TileCoord.fromID = function(id) {
    var z = id % 32, dim = 1 << z;
    var xy = ((id - z) / 32);
    var x = xy % dim, y = ((xy - x) / dim) % dim;
    var w = Math.floor(xy / (dim * dim));
    if (w % 2 !== 0) w = w * -1 - 1;
    w /= 2;
    return new TileCoord(z, x, y, w);
};

// given a list of urls, choose a url template and return a tile URL
TileCoord.prototype.url = function(urls, sourceMaxZoom) {
    return urls[(this.x + this.y) % urls.length]
        .replace('{prefix}', (this.x % 16).toString(16) + (this.y % 16).toString(16))
        .replace('{z}', Math.min(this.z, sourceMaxZoom || this.z))
        .replace('{x}', this.x)
        .replace('{y}', this.y);
};

// Return the coordinate of the parent tile
TileCoord.prototype.parent = function(sourceMaxZoom) {
    if (this.z === 0) return null;

    // the id represents an overscaled tile, return the same coordinates with a lower z
    if (this.z > sourceMaxZoom) {
        return new TileCoord(this.z - 1, this.x, this.y, this.w);
    }

    return new TileCoord(this.z - 1, Math.floor(this.x / 2), Math.floor(this.y / 2), this.w);
};

TileCoord.prototype.wrapped = function() {
    return new TileCoord(this.z, this.x, this.y, 0);
};

// Return the coordinates of the tile's children
TileCoord.prototype.children = function(sourceMaxZoom) {

    if (this.z >= sourceMaxZoom) {
        // return a single tile coord representing a an overscaled tile
        return [new TileCoord(this.z + 1, this.x, this.y, this.w)];
    }

    var z = this.z + 1;
    var x = this.x * 2;
    var y = this.y * 2;
    return [
        new TileCoord(z, x, y, this.w),
        new TileCoord(z, x + 1, y, this.w),
        new TileCoord(z, x, y + 1, this.w),
        new TileCoord(z, x + 1, y + 1, this.w)
    ];
};

// Taken from polymaps src/Layer.js
// https://github.com/simplegeo/polymaps/blob/master/src/Layer.js#L333-L383

function edge(a, b) {
    if (a.row > b.row) { var t = a; a = b; b = t; }
    return {
        x0: a.column,
        y0: a.row,
        x1: b.column,
        y1: b.row,
        dx: b.column - a.column,
        dy: b.row - a.row
    };
}

function scanSpans(e0, e1, ymin, ymax, scanLine) {
    var y0 = Math.max(ymin, Math.floor(e1.y0));
    var y1 = Math.min(ymax, Math.ceil(e1.y1));

    // sort edges by x-coordinate
    if ((e0.x0 === e1.x0 && e0.y0 === e1.y0) ?
            (e0.x0 + e1.dy / e0.dy * e0.dx < e1.x1) :
            (e0.x1 - e1.dy / e0.dy * e0.dx < e1.x0)) {
        var t = e0; e0 = e1; e1 = t;
    }

    // scan lines!
    var m0 = e0.dx / e0.dy;
    var m1 = e1.dx / e1.dy;
    var d0 = e0.dx > 0; // use y + 1 to compute x0
    var d1 = e1.dx < 0; // use y + 1 to compute x1
    for (var y = y0; y < y1; y++) {
        var x0 = m0 * Math.max(0, Math.min(e0.dy, y + d0 - e0.y0)) + e0.x0;
        var x1 = m1 * Math.max(0, Math.min(e1.dy, y + d1 - e1.y0)) + e1.x0;
        scanLine(Math.floor(x1), Math.ceil(x0), y);
    }
}

function scanTriangle(a, b, c, ymin, ymax, scanLine) {
    var ab = edge(a, b),
        bc = edge(b, c),
        ca = edge(c, a);

    var t;

    // sort edges by y-length
    if (ab.dy > bc.dy) { t = ab; ab = bc; bc = t; }
    if (ab.dy > ca.dy) { t = ab; ab = ca; ca = t; }
    if (bc.dy > ca.dy) { t = bc; bc = ca; ca = t; }

    // scan span! scan span!
    if (ab.dy) scanSpans(ca, ab, ymin, ymax, scanLine);
    if (bc.dy) scanSpans(ca, bc, ymin, ymax, scanLine);
}

TileCoord.cover = function(z, bounds, actualZ) {
    var tiles = 1 << z;
    var t = {};

    function scanLine(x0, x1, y) {
        var x, wx;
        if (y >= 0 && y <= tiles) {
            for (x = x0; x < x1; x++) {
                wx = (x + tiles) % tiles;
                var coord = new TileCoord(actualZ, wx, y, Math.floor(x / tiles));
                t[coord.id] = coord;
            }
        }
    }

    // Divide the screen up in two triangles and scan each of them:
    // +---/
    // | / |
    // /---+
    scanTriangle(bounds[0], bounds[1], bounds[2], 0, tiles, scanLine);
    scanTriangle(bounds[2], bounds[3], bounds[0], 0, tiles, scanLine);

    return Object.keys(t).map(function(id) {
        return t[id];
    });
};

},{}],52:[function(require,module,exports){
'use strict';

var Tile = require('./tile');
var TileCoord = require('./tile_coord');
var Point = require('point-geometry');
var Cache = require('../util/mru_cache');
var util = require('../util/util');

module.exports = TilePyramid;

/**
 * A tile pyramid is a specialized cache and datastructure
 * that contains tiles. It's used by sources to manage their
 * data.
 *
 * @param {Object} options
 * @param {number} options.tileSize
 * @param {number} options.minzoom
 * @param {number} options.maxzoom
 */
function TilePyramid(options) {
    this.tileSize = options.tileSize;
    this.minzoom = options.minzoom;
    this.maxzoom = options.maxzoom;
    this.reparseOverscaled = options.reparseOverscaled;

    this._load = options.load;
    this._abort = options.abort;
    this._unload = options.unload;
    this._add = options.add;
    this._remove = options.remove;
    this._redoPlacement = options.redoPlacement;

    this._tiles = {};
    this._cache = new Cache(options.cacheSize, function(tile) { return this._unload(tile); }.bind(this));
}

TilePyramid.prototype = {
    /**
     * Confirm that every tracked tile is loaded.
     * @returns {boolean} whether all tiles are loaded.
     * @private
     */
    loaded: function() {
        for (var t in this._tiles) {
            if (!this._tiles[t].loaded)
                return false;
        }
        return true;
    },

    /**
     * Return all tile ids ordered with z-order, and cast to numbers
     * @returns {Array<number>} ids
     * @private
     */
    orderedIDs: function() {
        return Object.keys(this._tiles)
            .sort(function(a, b) { return (b % 32) - (a % 32); })
            .map(function(id) { return +id; });
    },

    renderedIDs: function() {
        return this.orderedIDs().filter(function(id) {
            return this._tiles[id].loaded && !this._coveredTiles[id];
        }.bind(this));
    },

    reload: function() {
        this._cache.reset();
        for (var i in this._tiles) {
            this._load(this._tiles[i]);
        }
    },

    /**
     * Get a specific tile by id
     * @param {string|number} id tile id
     * @returns {Object} tile
     * @private
     */
    getTile: function(id) {
        return this._tiles[id];
    },

    /**
     * get the zoom level adjusted for the difference in map and source tilesizes
     * @param {Object} transform
     * @returns {number} zoom level
     * @private
     */
    getZoom: function(transform) {
        return transform.zoom + Math.log(transform.tileSize / this.tileSize) / Math.LN2;
    },

    /**
     * Return a zoom level that will cover all tiles in a given transform
     * @param {Object} transform
     * @returns {number} zoom level
     */
    coveringZoomLevel: function(transform) {
        return Math.floor(this.getZoom(transform));
    },

    /**
     * Given a transform, return all coordinates that could cover that
     * transform for a covering zoom level.
     * @param {Object} transform
     * @returns {Array<Tile>} tiles
     */
    coveringTiles: function(transform) {
        var z = this.coveringZoomLevel(transform);
        var actualZ = z;

        if (z < this.minzoom) return [];
        if (z > this.maxzoom) z = this.maxzoom;

        var tr = transform,
            tileCenter = tr.locationCoordinate(tr.center)._zoomTo(z),
            centerPoint = new Point(tileCenter.column - 0.5, tileCenter.row - 0.5);

        return TileCoord.cover(z, [
            tr.pointCoordinate(new Point(0, 0))._zoomTo(z),
            tr.pointCoordinate(new Point(tr.width, 0))._zoomTo(z),
            tr.pointCoordinate(new Point(tr.width, tr.height))._zoomTo(z),
            tr.pointCoordinate(new Point(0, tr.height))._zoomTo(z)
        ], this.reparseOverscaled ? actualZ : z).sort(function(a, b) {
            return centerPoint.dist(a) - centerPoint.dist(b);
        });
    },

    /**
     * Recursively find children of the given tile (up to maxCoveringZoom) that are already loaded;
     * adds found tiles to retain object; returns true if children completely cover the tile
     *
     * @param {Coordinate} coord
     * @param {number} maxCoveringZoom
     * @param {boolean} retain
     * @returns {boolean} whether the operation was complete
     * @private
     */
    findLoadedChildren: function(coord, maxCoveringZoom, retain) {
        var complete = true;
        var z = coord.z;
        var coords = coord.children(this.maxzoom);
        for (var i = 0; i < coords.length; i++) {
            var id = coords[i].id;
            if (this._tiles[id] && this._tiles[id].loaded) {
                retain[id] = true;
            } else {
                complete = false;
                if (z < maxCoveringZoom) {
                    // Go further down the hierarchy to find more unloaded children.
                    this.findLoadedChildren(coords[i], maxCoveringZoom, retain);
                }
            }
        }
        return complete;
    },

    /**
     * Find a loaded parent of the given tile (up to minCoveringZoom);
     * adds the found tile to retain object and returns the tile if found
     *
     * @param {Coordinate} coord
     * @param {number} minCoveringZoom
     * @param {boolean} retain
     * @returns {Tile} tile object
     */
    findLoadedParent: function(coord, minCoveringZoom, retain) {
        for (var z = coord.z - 1; z >= minCoveringZoom; z--) {
            coord = coord.parent(this.maxzoom);
            var tile = this._tiles[coord.id];
            if (tile && tile.loaded) {
                retain[coord.id] = true;
                return tile;
            }
        }
    },

    /**
     * Removes tiles that are outside the viewport and adds new tiles that
     * are inside the viewport.
     */
    update: function(used, transform, fadeDuration) {
        var i;
        var coord;
        var tile;

        // Determine the overzooming/underzooming amounts.
        var zoom = Math.floor(this.getZoom(transform));
        var minCoveringZoom = util.clamp(zoom - 10, this.minzoom, this.maxzoom);
        var maxCoveringZoom = util.clamp(zoom + 1,  this.minzoom, this.maxzoom);

        // Retain is a list of tiles that we shouldn't delete, even if they are not
        // the most ideal tile for the current viewport. This may include tiles like
        // parent or child tiles that are *already* loaded.
        var retain = {};
        var now = new Date().getTime();

        // Covered is a list of retained tiles who's areas are full covered by other,
        // better, retained tiles. They are not drawn separately.
        this._coveredTiles = {};

        var required = used ? this.coveringTiles(transform) : [];
        for (i = 0; i < required.length; i++) {
            coord = required[i];
            tile = this.addTile(coord);

            retain[coord.id] = true;

            if (tile.loaded)
                continue;

            // The tile we require is not yet loaded.
            // Retain child or parent tiles that cover the same area.
            if (!this.findLoadedChildren(coord, maxCoveringZoom, retain)) {
                this.findLoadedParent(coord, minCoveringZoom, retain);
            }
        }

        for (var id in retain) {
            coord = TileCoord.fromID(id);
            tile = this._tiles[id];
            if (tile && tile.timeAdded > now - (fadeDuration || 0)) {
                // This tile is still fading in. Find tiles to cross-fade with it.
                if (this.findLoadedChildren(coord, maxCoveringZoom, retain)) {
                    this._coveredTiles[id] = true;
                    retain[id] = true;
                } else {
                    this.findLoadedParent(coord, minCoveringZoom, retain);
                }
            }
        }

        // Remove the tiles we don't need anymore.
        var remove = util.keysDifference(this._tiles, retain);
        for (i = 0; i < remove.length; i++) {
            this.removeTile(+remove[i]);
        }
    },

    /**
     * Add a tile, given its coordinate, to the pyramid.
     * @param {Coordinate} coord
     * @returns {Coordinate} the coordinate.
     */
    addTile: function(coord) {
        var tile = this._tiles[coord.id];
        if (tile)
            return tile;

        var wrapped = coord.wrapped();
        tile = this._tiles[wrapped.id];

        if (!tile) {
            tile = this._cache.get(wrapped.id);
            if (tile && this._redoPlacement) {
                this._redoPlacement(tile);
            }
        }

        if (!tile) {
            var zoom = coord.z;
            var overscaling = zoom > this.maxzoom ? Math.pow(2, zoom - this.maxzoom) : 1;
            tile = new Tile(wrapped, this.tileSize * overscaling);
            this._load(tile);
        }

        tile.uses++;
        this._tiles[coord.id] = tile;
        this._add(tile, coord);

        return tile;
    },

    /**
     * Remove a tile, given its id, from the pyramid
     * @param {string|number} id tile id
     * @returns {undefined} nothing
     * @private
     */
    removeTile: function(id) {
        var tile = this._tiles[id];
        if (!tile)
            return;

        tile.uses--;
        delete this._tiles[id];
        this._remove(tile);

        if (tile.uses > 0)
            return;

        if (tile.loaded) {
            this._cache.add(tile.coord.wrapped().id, tile);
        } else {
            this._abort(tile);
            this._unload(tile);
        }
    },

    /**
     * Remove all tiles from this pyramid
     */
    clearTiles: function() {
        for (var id in this._tiles)
            this.removeTile(id);
        this._cache.reset();
    },

    /**
     * For a given coordinate, search through our current tiles and attempt
     * to find a tile at that point
     * @param {Coordinate} coord
     * @returns {Object} tile
     * @private
     */
    tileAt: function(coord) {
        var ids = this.orderedIDs();
        for (var i = 0; i < ids.length; i++) {
            var tile = this._tiles[ids[i]];
            var pos = tile.positionAt(coord, this.maxzoom);
            if (pos && pos.x >= 0 && pos.x < 4096 && pos.y >= 0 && pos.y < 4096) {
                // The click is within the viewport. There is only ever one tile in
                // a layer that has this property.
                return {
                    tile: tile,
                    x: pos.x,
                    y: pos.y,
                    scale: pos.scale
                };
            }
        }
    }
};

},{"../util/mru_cache":105,"../util/util":107,"./tile":50,"./tile_coord":51,"point-geometry":124}],53:[function(require,module,exports){
'use strict';

var util = require('../util/util');
var Evented = require('../util/evented');
var Source = require('./source');

module.exports = VectorTileSource;

function VectorTileSource(options) {
    util.extend(this, util.pick(options, ['url', 'tileSize']));

    if (this.tileSize !== 512) {
        throw new Error('vector tile sources must have a tileSize of 512');
    }

    Source._loadTileJSON.call(this, options);
}

VectorTileSource.prototype = util.inherit(Evented, {
    minzoom: 0,
    maxzoom: 22,
    tileSize: 512,
    reparseOverscaled: true,
    _loaded: false,

    onAdd: function(map) {
        this.map = map;
    },

    loaded: function() {
        return this._pyramid && this._pyramid.loaded();
    },

    update: function(transform) {
        if (this._pyramid) {
            this._pyramid.update(this.used, transform);
        }
    },

    reload: function() {
        this._pyramid.reload();
    },

    redoPlacement: function() {
        if (!this._pyramid) {
            return;
        }

        var ids = this._pyramid.orderedIDs();
        for (var i = 0; i < ids.length; i++) {
            var tile = this._pyramid.getTile(ids[i]);
            this._redoTilePlacement(tile);
        }
    },

    render: Source._renderTiles,
    featuresAt: Source._vectorFeaturesAt,

    _loadTile: function(tile) {
        var overscaling = tile.coord.z > this.maxzoom ? Math.pow(2, tile.coord.z - this.maxzoom) : 1;
        var params = {
            url: tile.coord.url(this.tiles, this.maxzoom),
            uid: tile.uid,
            coord: tile.coord,
            zoom: tile.coord.z,
            maxZoom: this.maxzoom,
            tileSize: this.tileSize * overscaling,
            source: this.id,
            overscaling: overscaling,
            angle: this.map.transform.angle,
            pitch: this.map.transform.pitch,
            collisionDebug: this.map.collisionDebug
        };

        if (tile.workerID) {
            this.dispatcher.send('reload tile', params, this._tileLoaded.bind(this, tile), tile.workerID);
        } else {
            tile.workerID = this.dispatcher.send('load tile', params, this._tileLoaded.bind(this, tile));
        }
    },

    _tileLoaded: function(tile, err, data) {
        if (tile.aborted)
            return;

        if (err) {
            this.fire('tile.error', {tile: tile});
            return;
        }

        tile.loadVectorData(data);

        if (tile.redoWhenDone) {
            tile.redoWhenDone = false;
            this._redoTilePlacement(tile);
        }

        this.fire('tile.load', {tile: tile});
    },

    _abortTile: function(tile) {
        tile.aborted = true;
        this.dispatcher.send('abort tile', { uid: tile.uid, source: this.id }, null, tile.workerID);
    },

    _addTile: function(tile) {
        this.fire('tile.add', {tile: tile});
    },

    _removeTile: function(tile) {
        this.fire('tile.remove', {tile: tile});
    },

    _unloadTile: function(tile) {
        tile.unloadVectorData(this.map.painter);
        this.glyphAtlas.removeGlyphs(tile.uid);
        this.dispatcher.send('remove tile', { uid: tile.uid, source: this.id }, null, tile.workerID);
    },

    _redoTilePlacement: function(tile) {

        if (!tile.loaded || tile.redoingPlacement) {
            tile.redoWhenDone = true;
            return;
        }

        tile.redoingPlacement = true;

        this.dispatcher.send('redo placement', {
            uid: tile.uid,
            source: this.id,
            angle: this.map.transform.angle,
            pitch: this.map.transform.pitch,
            collisionDebug: this.map.collisionDebug
        }, done.bind(this), tile.workerID);

        function done(_, data) {
            tile.reloadSymbolData(data, this.map.painter);
            this.fire('tile.load', {tile: tile});

            tile.redoingPlacement = false;
            if (tile.redoWhenDone) {
                this._redoTilePlacement(tile);
                tile.redoWhenDone = false;
            }
        }
    }
});

},{"../util/evented":101,"../util/util":107,"./source":49}],54:[function(require,module,exports){
'use strict';

var util = require('../util/util');
var Tile = require('./tile');
var LatLng = require('../geo/lat_lng');
var Point = require('point-geometry');
var Evented = require('../util/evented');
var Coordinate = require('../geo/coordinate');
var ajax = require('../util/ajax');

module.exports = VideoSource;

/**
 * Create a Video data source instance given an options object
 * @class VideoSource
 * @param {Object} [options]
 * @param {String|Array} options.url A string or array of URL(s) to video files
 * @param {Array} options.coordinates lat,lng coordinates in order clockwise starting at the top left: tl, tr, br, bl
 * @example
 * var sourceObj = new mapboxgl.VideoSource({
 *    url: [
 *        'https://www.mapbox.com/videos/baltimore-smoke.mp4',
 *        'https://www.mapbox.com/videos/baltimore-smoke.webm'
 *    ],
 *    coordinates: [
 *        [39.18579907229748, -76.54335737228394],
 *        [39.1838364847587, -76.52803659439087],
 *        [39.17683392507606, -76.5295386314392],
 *        [39.17876344106642, -76.54520273208618]
 *    ]
 * });
 * map.addSource('some id', sourceObj); // add
 * map.removeSource('some id');  // remove
 */
function VideoSource(options) {
    this.coordinates = options.coordinates;

    ajax.getVideo(options.url, function(err, video) {
        // @TODO handle errors via event.
        if (err) return;

        this.video = video;
        this.video.loop = true;

        var loopID;

        // start repainting when video starts playing
        this.video.addEventListener('playing', function() {
            loopID = this.map.style.animationLoop.set(Infinity);
            this.map._rerender();
        }.bind(this));

        // stop repainting when video stops
        this.video.addEventListener('pause', function() {
            this.map.style.animationLoop.cancel(loopID);
        }.bind(this));

        this._loaded = true;

        if (this.map) {
            this.video.play();
            this.createTile();
            this.fire('change');
        }
    }.bind(this));
}

VideoSource.prototype = util.inherit(Evented, {
    /**
     * Return the HTML video element.
     *
     * @returns {Object}
     */
    getVideo: function() {
        return this.video;
    },

    onAdd: function(map) {
        this.map = map;
        if (this.video) {
            this.video.play();
            this.createTile();
        }
    },

    createTile: function() {
        /*
         * Calculate which mercator tile is suitable for rendering the video in
         * and create a buffer with the corner coordinates. These coordinates
         * may be outside the tile, because raster tiles aren't clipped when rendering.
         */
        var map = this.map;
        var coords = this.coordinates.map(function(latlng) {
            var loc = LatLng.convert(latlng);
            return map.transform.locationCoordinate(loc).zoomTo(0);
        });

        var minX = Infinity;
        var minY = Infinity;
        var maxX = -Infinity;
        var maxY = -Infinity;

        for (var i = 0; i < coords.length; i++) {
            minX = Math.min(minX, coords[i].column);
            minY = Math.min(minY, coords[i].row);
            maxX = Math.max(maxX, coords[i].column);
            maxY = Math.max(maxY, coords[i].row);
        }

        var dx = maxX - minX;
        var dy = maxY - minY;
        var dMax = Math.max(dx, dy);
        var center = new Coordinate((minX + maxX) / 2, (minY + maxY) / 2, 0)
            .zoomTo(Math.floor(-Math.log(dMax) / Math.LN2));

        var tileExtent = 4096;
        var tileCoords = coords.map(function(coord) {
            var zoomedCoord = coord.zoomTo(center.zoom);
            return new Point(
                Math.round((zoomedCoord.column - center.column) * tileExtent),
                Math.round((zoomedCoord.row - center.row) * tileExtent));
        });

        var gl = map.painter.gl;
        var maxInt16 = 32767;
        var array = new Int16Array([
            tileCoords[0].x, tileCoords[0].y, 0, 0,
            tileCoords[1].x, tileCoords[1].y, maxInt16, 0,
            tileCoords[3].x, tileCoords[3].y, 0, maxInt16,
            tileCoords[2].x, tileCoords[2].y, maxInt16, maxInt16
        ]);

        this.tile = new Tile();
        this.tile.buckets = {};

        this.tile.boundsBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.tile.boundsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, array, gl.STATIC_DRAW);

        this.center = center;
    },

    loaded: function() {
        return this.video && this.video.readyState >= 2;
    },

    update: function() {
        // noop
    },

    render: function(layers, painter) {
        if (!this._loaded) return;
        if (this.video.readyState < 2) return; // not enough data for current position

        var c = this.center;
        this.tile.calculateMatrices(c.zoom, c.column, c.row, this.map.transform, painter);

        var gl = painter.gl;
        if (!this.tile.texture) {
            this.tile.texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.tile.texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.video);
        } else {
            gl.bindTexture(gl.TEXTURE_2D, this.tile.texture);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.video);
        }

        painter.drawLayers(layers, this.tile.posMatrix, this.tile);
    },

    featuresAt: function(point, params, callback) {
        return callback(null, []);
    }
});

},{"../geo/coordinate":27,"../geo/lat_lng":28,"../util/ajax":95,"../util/evented":101,"../util/util":107,"./tile":50,"point-geometry":124}],55:[function(require,module,exports){
'use strict';

var Actor = require('../util/actor');
var WorkerTile = require('./worker_tile');
var util = require('../util/util');
var ajax = require('../util/ajax');
var vt = require('vector-tile');
var Protobuf = require('pbf');
var url = require('url');

var geojsonvt = require('geojson-vt');
var GeoJSONWrapper = require('./geojson_wrapper');

module.exports = function(self) {
    return new Worker(self);
};

function Worker(self) {
    this.self = self;
    this.actor = new Actor(self, this);
    this.loading = {};

    this.loaded = {};
    this.layers = [];
    this.geoJSONIndexes = {};
}

util.extend(Worker.prototype, {
    'set layers': function(layers) {
        this.layers = layers;
    },

    'load tile': function(params, callback) {
        var source = params.source,
            uid = params.uid;

        if (!this.loading[source])
            this.loading[source] = {};

        var tile = this.loading[source][uid] = new WorkerTile(params);

        tile.xhr = ajax.getArrayBuffer(params.url, done.bind(this));

        function done(err, data) {
            delete this.loading[source][uid];

            if (err) return callback(err);

            tile.data = new vt.VectorTile(new Protobuf(new Uint8Array(data)));
            tile.parse(tile.data, this.layers, this.actor, callback);

            this.loaded[source] = this.loaded[source] || {};
            this.loaded[source][uid] = tile;
        }
    },

    'reload tile': function(params, callback) {
        var loaded = this.loaded[params.source],
            uid = params.uid;
        if (loaded && loaded[uid]) {
            var tile = loaded[uid];
            tile.parse(tile.data, this.layers, this.actor, callback);
        }
    },

    'abort tile': function(params) {
        var loading = this.loading[params.source],
            uid = params.uid;
        if (loading && loading[uid]) {
            loading[uid].xhr.abort();
            delete loading[uid];
        }
    },

    'remove tile': function(params) {
        var loaded = this.loaded[params.source],
            uid = params.uid;
        if (loaded && loaded[uid]) {
            delete loaded[uid];
        }
    },

    'redo placement': function(params, callback) {
        var loaded = this.loaded[params.source],
            loading = this.loading[params.source],
            uid = params.uid;

        if (loaded && loaded[uid]) {
            var tile = loaded[uid];
            var result = tile.redoPlacement(params.angle, params.pitch, params.collisionDebug);

            if (result.result) {
                callback(null, result.result, result.transferables);
            }

        } else if (loading && loading[uid]) {
            loading[uid].angle = params.angle;
        }
    },

    'parse geojson': function(params, callback) {
        var indexData = function(err, data) {
            if (err) return callback(err);
            this.geoJSONIndexes[params.source] = geojsonvt(data, {baseZoom: params.maxZoom});
            callback(null);
        }.bind(this);

        // TODO accept params.url for urls instead

        // Not, because of same origin issues, urls must either include an
        // explicit origin or absolute path.
        // ie: /foo/bar.json or http://example.com/bar.json
        // but not ../foo/bar.json
        if (typeof params.data === 'string') {
            var geojsonUrl = params.data;
            if (geojsonUrl.indexOf('http') === -1) {
                // To fix same origin issues with the web worker, prefix the url
                // with the origin.
                geojsonUrl = url.resolve(params.parentHref, geojsonUrl);
            }
            ajax.getJSON(geojsonUrl, indexData);
        }
        else indexData(null, params.data);
    },

    'load geojson tile': function(params, callback) {
        var source = params.source,
            coord = params.coord;
        // console.time('tile ' + coord.z + ' ' + coord.x + ' ' + coord.y);

        var geoJSONTile = this.geoJSONIndexes[source].getTile(coord.z, coord.x, coord.y);

        // console.timeEnd('tile ' + coord.z + ' ' + coord.x + ' ' + coord.y);

        // if (!geoJSONTile) console.log('not found', this.geoJSONIndexes[source], coord);

        if (!geoJSONTile) return callback(null, null); // nothing in the given tile

        var tile = new WorkerTile(params);
        tile.parse(new GeoJSONWrapper(geoJSONTile.features), this.layers, this.actor, callback);

        this.loaded[source] = this.loaded[source] || {};
        this.loaded[source][params.uid] = tile;
    },

    'query features': function(params, callback) {
        var tile = this.loaded[params.source] && this.loaded[params.source][params.uid];
        if (tile) {
            tile.featureTree.query(params, callback);
        } else {
            callback(null, []);
        }
    }
});

},{"../util/actor":94,"../util/ajax":95,"../util/util":107,"./geojson_wrapper":47,"./worker_tile":56,"geojson-vt":112,"pbf":122,"url":8,"vector-tile":127}],56:[function(require,module,exports){
'use strict';

var FeatureTree = require('../data/feature_tree');
var Collision = require('../symbol/collision_tile');
var BufferSet = require('../data/buffer/buffer_set');
var createBucket = require('../data/create_bucket');

module.exports = WorkerTile;

function WorkerTile(params) {
    this.coord = params.coord;
    this.uid = params.uid;
    this.zoom = params.zoom;
    this.maxZoom = params.maxZoom;
    this.tileSize = params.tileSize;
    this.source = params.source;
    this.overscaling = params.overscaling;
    this.angle = params.angle;
    this.pitch = params.pitch;
    this.collisionDebug = params.collisionDebug;

    this.stacks = {};
}

WorkerTile.prototype.parse = function(data, layers, actor, callback) {

    this.status = 'parsing';

    this.featureTree = new FeatureTree(this.coord, this.overscaling);

    var i, k,
        tile = this,
        layer,
        bucket,
        buffers = new BufferSet(),
        collision = this.collision = new Collision(this.zoom, 4096, this.tileSize),
        buckets = {},
        bucketsInOrder = this.bucketsInOrder = [],
        bucketsBySourceLayer = {};

    collision.reset(this.angle, this.pitch);

    // Map non-ref layers to buckets.
    for (i = 0; i < layers.length; i++) {
        layer = layers[i];

        if (layer.source !== this.source)
            continue;

        if (layer.ref)
            continue;

        var minzoom = layer.minzoom;
        if (minzoom && this.zoom < minzoom && minzoom < this.maxZoom)
            continue;

        var maxzoom = layer.maxzoom;
        if (maxzoom && this.zoom >= maxzoom)
            continue;

        var visibility = layer.layout.visibility;
        if (visibility === 'none')
            continue;

        bucket = createBucket(layer, buffers, collision, this.zoom, this.overscaling, this.collisionDebug);
        bucket.layers = [layer.id];

        buckets[bucket.id] = bucket;
        bucketsInOrder.push(bucket);

        if (data.layers) {
            // vectortile
            var sourceLayer = layer['source-layer'];
            if (!bucketsBySourceLayer[sourceLayer])
                bucketsBySourceLayer[sourceLayer] = {};
            bucketsBySourceLayer[sourceLayer][bucket.id] = bucket;
        } else {
            // geojson tile
            bucketsBySourceLayer[bucket.id] = bucket;
        }
    }

    // Index ref layers.
    for (i = 0; i < layers.length; i++) {
        layer = layers[i];

        if (layer.source !== this.source)
            continue;

        if (!layer.ref)
            continue;

        bucket = buckets[layer.ref];
        if (!bucket)
            continue;

        bucket.layers.push(layer.id);
    }

    // read each layer, and sort its features into buckets
    if (data.layers) {
        // vectortile
        for (k in bucketsBySourceLayer) {
            layer = data.layers[k];
            if (!layer) continue;
            sortLayerIntoBuckets(layer, bucketsBySourceLayer[k]);
        }
    } else {
        // geojson
        sortLayerIntoBuckets(data, bucketsBySourceLayer);
    }

    function sortLayerIntoBuckets(layer, buckets) {
        for (var i = 0; i < layer.length; i++) {
            var feature = layer.feature(i);
            for (var key in buckets) {
                var bucket = buckets[key];
                if (bucket.filter(feature)) {
                    bucket.features.push(feature);
                }
            }
        }
    }

    var prevPlacementBucket;
    var remaining = bucketsInOrder.length;

    /*
     *  The async parsing here is a bit tricky.
     *  Some buckets depend on resources that may need to be loaded async (glyphs).
     *  Some buckets need to be parsed in order (to get collision priorities right).
     *
     *  Dependencies calls are initiated first to get those rolling.
     *  Buckets that don't need to be parsed in order, aren't to save time.
     */

    for (i = 0; i < bucketsInOrder.length; i++) {
        bucket = bucketsInOrder[i];

        // Link buckets that need to be parsed in order
        if (bucket.collision) {
            if (prevPlacementBucket) {
                prevPlacementBucket.next = bucket;
            } else {
                bucket.previousPlaced = true;
            }
            prevPlacementBucket = bucket;
        }

        if (bucket.getDependencies) {
            bucket.getDependencies(this, actor, dependenciesDone(bucket));
        }

        // immediately parse buckets where order doesn't matter and no dependencies
        if (!bucket.collision && !bucket.getDependencies) {
            parseBucket(tile, bucket);
        }
    }

    function dependenciesDone(bucket) {
        return function(err) {
            bucket.dependenciesLoaded = true;
            parseBucket(tile, bucket, err);
        };
    }

    function parseBucket(tile, bucket, skip) {
        if (bucket.getDependencies && !bucket.dependenciesLoaded) return;
        if (bucket.collision && !bucket.previousPlaced) return;

        if (!skip) {
            var now = Date.now();
            if (bucket.features.length) bucket.addFeatures();
            var time = Date.now() - now;
            if (bucket.interactive) {
                for (var i = 0; i < bucket.features.length; i++) {
                    var feature = bucket.features[i];
                    tile.featureTree.insert(feature.bbox(), bucket.layers, feature);
                }
            }
            if (typeof self !== 'undefined') {
                self.bucketStats = self.bucketStats || {_total: 0};
                self.bucketStats._total += time;
                self.bucketStats[bucket.id] = (self.bucketStats[bucket.id] || 0) + time;
            }
        }

        remaining--;

        if (!remaining) {
            done();
            return;
        }

        // try parsing the next bucket, if it is ready
        if (bucket.next) {
            bucket.next.previousPlaced = true;
            parseBucket(tile, bucket.next);
        }
    }

    function done() {

        tile.status = 'done';

        if (tile.redoPlacementAfterDone) {
            var result = tile.redoPlacement(tile.angle, tile.pitch).result;
            buffers.glyphVertex = result.buffers.glyphVertex;
            buffers.iconVertex = result.buffers.iconVertex;
            buffers.collisionBoxVertex = result.buffers.collisionBoxVertex;
        }

        var transferables = [],
            elementGroups = {};

        for (k in buffers) {
            transferables.push(buffers[k].array);
        }

        for (k in buckets) {
            elementGroups[k] = buckets[k].elementGroups;
        }

        callback(null, {
            elementGroups: elementGroups,
            buffers: buffers
        }, transferables);
    }
};

WorkerTile.prototype.redoPlacement = function(angle, pitch, collisionDebug) {

    if (this.status !== 'done') {
        this.redoPlacementAfterDone = true;
        this.angle = angle;
        return {};
    }

    var buffers = new BufferSet();
    var transferables = [];
    var elementGroups = {};
    var collision = this.collision;

    collision.reset(angle, pitch);

    var bucketsInOrder = this.bucketsInOrder;
    for (var i = 0; i < bucketsInOrder.length; i++) {
        var bucket = bucketsInOrder[i];

        if (bucket.type === 'symbol') {
            bucket.placeFeatures(buffers, collisionDebug);
            elementGroups[bucket.id] = bucket.elementGroups;
        }
    }

    for (var k in buffers) {
        transferables.push(buffers[k].array);
    }

    return {
        result: {
            elementGroups: elementGroups,
            buffers: buffers
        },
        transferables: transferables
    };

};

},{"../data/buffer/buffer_set":12,"../data/create_bucket":21,"../data/feature_tree":23,"../symbol/collision_tile":74}],57:[function(require,module,exports){
'use strict';

module.exports = AnimationLoop;

function AnimationLoop() {
    this.n = 0;
    this.times = [];
}

// Are all animations done?
AnimationLoop.prototype.stopped = function() {
    this.times = this.times.filter(function(t) {
        return t.time >= (new Date()).getTime();
    });
    return !this.times.length;
};

// Add a new animation that will run t milliseconds
// Returns an id that can be used to cancel it layer
AnimationLoop.prototype.set = function(t) {
    this.times.push({ id: this.n, time: t + (new Date()).getTime() });
    return this.n++;
};

// Cancel an animation
AnimationLoop.prototype.cancel = function(n) {
    this.times = this.times.filter(function(t) {
        return t.id !== n;
    });
};

},{}],58:[function(require,module,exports){
'use strict';

var Evented = require('../util/evented');
var ajax = require('../util/ajax');
var browser = require('../util/browser');

module.exports = ImageSprite;

function ImageSprite(base) {
    this.base = base;
    this.retina = browser.devicePixelRatio > 1;

    base = this.base + (this.retina ? '@2x' : '');

    ajax.getJSON(base + '.json', function(err, data) {
        if (err) {
            this.fire('error', {error: err});
            return;
        }

        this.data = data;
        if (this.img) this.fire('load');
    }.bind(this));

    ajax.getImage(base + '.png', function(err, img) {
        if (err) {
            this.fire('error', {error: err});
            return;
        }

        // premultiply the sprite
        var data = img.getData();
        var newdata = img.data = new Uint8Array(data.length);
        for (var i = 0; i < data.length; i += 4) {
            var alpha = data[i + 3] / 255;
            newdata[i + 0] = data[i + 0] * alpha;
            newdata[i + 1] = data[i + 1] * alpha;
            newdata[i + 2] = data[i + 2] * alpha;
            newdata[i + 3] = data[i + 3];
        }

        this.img = img;
        if (this.data) this.fire('load');
    }.bind(this));
}

ImageSprite.prototype = Object.create(Evented);

ImageSprite.prototype.toJSON = function() {
    return this.base;
};

ImageSprite.prototype.loaded = function() {
    return !!(this.data && this.img);
};

ImageSprite.prototype.resize = function(/*gl*/) {
    if (browser.devicePixelRatio > 1 !== this.retina) {
        var newSprite = new ImageSprite(this.base);
        newSprite.on('load', function() {
            this.img = newSprite.img;
            this.data = newSprite.data;
            this.retina = newSprite.retina;
        }.bind(this));
    }
};

function SpritePosition() {}
SpritePosition.prototype = { x: 0, y: 0, width: 0, height: 0, pixelRatio: 1, sdf: false };

ImageSprite.prototype.getSpritePosition = function(name) {
    if (!this.loaded()) return new SpritePosition();

    var pos = this.data && this.data[name];
    if (pos && this.img) return pos;

    return new SpritePosition();
};

},{"../util/ajax":95,"../util/browser":96,"../util/evented":101}],59:[function(require,module,exports){
'use strict';

var reference = require('./reference');

module.exports = {};

reference.layout.forEach(function(className) {
    var Properties = function(props) {
        for (var p in props) {
            this[p] = props[p];
        }
    };

    var properties = reference[className];
    for (var prop in properties) {
        if (properties[prop].default === undefined) continue;
        Properties.prototype[prop] = properties[prop].default;
    }
    module.exports[className.replace('layout_', '')] = Properties;
});

},{"./reference":61}],60:[function(require,module,exports){
'use strict';

var reference = require('./reference');
var parseCSSColor = require('csscolorparser').parseCSSColor;

module.exports = {};

reference.paint.forEach(function(className) {
    var Calculated = function() {};

    var properties = reference[className];
    for (var p in properties) {
        var prop = properties[p],
            value = prop.default;

        if (value === undefined) continue;
        if (prop.type === 'color') value = parseCSSColor(value);

        Calculated.prototype[p] = value;
    }

    Calculated.prototype.hidden = false;
    module.exports[className.replace('paint_', '')] = Calculated;
});

},{"./reference":61,"csscolorparser":108}],61:[function(require,module,exports){
module.exports = require('mapbox-gl-style-spec/reference/latest');

},{"mapbox-gl-style-spec/reference/latest":119}],62:[function(require,module,exports){
'use strict';

var Evented = require('../util/evented');
var Source = require('../source/source');
var StyleLayer = require('./style_layer');
var ImageSprite = require('./image_sprite');
var GlyphSource = require('../symbol/glyph_source');
var GlyphAtlas = require('../symbol/glyph_atlas');
var SpriteAtlas = require('../symbol/sprite_atlas');
var LineAtlas = require('../render/line_atlas');
var util = require('../util/util');
var ajax = require('../util/ajax');
var normalizeURL = require('../util/mapbox').normalizeStyleURL;
var browser = require('../util/browser');
var Dispatcher = require('../util/dispatcher');
var AnimationLoop = require('./animation_loop');
var validate = require('mapbox-gl-style-spec/lib/validate/latest');

module.exports = Style;

function Style(stylesheet, animationLoop) {
    this.animationLoop = animationLoop || new AnimationLoop();
    this.dispatcher = new Dispatcher(Math.max(browser.hardwareConcurrency - 1, 1), this);
    this.glyphAtlas = new GlyphAtlas(1024, 1024);
    this.spriteAtlas = new SpriteAtlas(512, 512);
    this.spriteAtlas.resize(browser.devicePixelRatio);
    this.lineAtlas = new LineAtlas(256, 512);

    this._layers = {};
    this._order  = [];
    this._groups = [];
    this.sources = {};

    this.zoomHistory = {};

    util.bindAll([
        '_forwardSourceEvent',
        '_forwardTileEvent',
        '_redoPlacement'
    ], this);

    var loaded = function(err, stylesheet) {
        if (err) {
            this.fire('error', {error: err});
            return;
        }

        var valid = validate(stylesheet);
        if (valid.length) {
            valid.forEach(function(e) {
                throw new Error(e.message);
            });
        }

        this._loaded = true;
        this.stylesheet = stylesheet;

        var sources = stylesheet.sources;
        for (var id in sources) {
            this.addSource(id, sources[id]);
        }

        if (stylesheet.sprite) {
            this.sprite = new ImageSprite(stylesheet.sprite);
            this.sprite.on('load', this.fire.bind(this, 'change'));
        }

        this.glyphSource = new GlyphSource(stylesheet.glyphs, this.glyphAtlas);
        this._resolve();
        this.fire('load');
    }.bind(this);

    if (typeof stylesheet === 'string') {
        ajax.getJSON(normalizeURL(stylesheet), loaded);
    } else {
        browser.frame(loaded.bind(this, null, stylesheet));
    }
}

Style.prototype = util.inherit(Evented, {
    _loaded: false,

    loaded: function() {
        if (!this._loaded)
            return false;

        for (var id in this.sources)
            if (!this.sources[id].loaded())
                return false;

        if (this.sprite && !this.sprite.loaded())
            return false;

        return true;
    },

    _resolve: function() {
        var id, layer;

        this._layers = {};
        this._order  = [];

        for (var i = 0; i < this.stylesheet.layers.length; i++) {
            layer = new StyleLayer(this.stylesheet.layers[i], this.stylesheet.constants || {});
            this._layers[layer.id] = layer;
            this._order.push(layer.id);
        }

        // Resolve layout properties.
        for (id in this._layers) {
            this._layers[id].resolveLayout();
        }

        // Resolve reference and paint properties.
        for (id in this._layers) {
            this._layers[id].resolveReference(this._layers);
            this._layers[id].resolvePaint();
        }

        this._groupLayers();
        this._broadcastLayers();
    },

    _groupLayers: function() {
        var group;

        this._groups = [];

        // Split into groups of consecutive top-level layers with the same source.
        for (var i = 0; i < this._order.length; ++i) {
            var layer = this._layers[this._order[i]];

            if (!group || layer.source !== group.source) {
                group = [];
                group.source = layer.source;
                this._groups.push(group);
            }

            group.push(layer);
        }
    },

    _broadcastLayers: function() {
        var ordered = [];

        for (var id in this._layers) {
            ordered.push(this._layers[id].json());
        }

        this.dispatcher.broadcast('set layers', ordered);
    },

    _cascade: function(classes, options) {
        if (!this._loaded) return;

        options = options || {
            transition: true
        };

        for (var id in this._layers) {
            this._layers[id].cascade(classes, options,
                this.stylesheet.transition || {},
                this.animationLoop);
        }

        this.fire('change');
    },

    _recalculate: function(z) {
        for (var id in this.sources)
            this.sources[id].used = false;

        this._updateZoomHistory(z);

        this.rasterFadeDuration = 300;
        for (id in this._layers) {
            var layer = this._layers[id];

            if (layer.recalculate(z, this.zoomHistory) && layer.source) {
                this.sources[layer.source].used = true;
            }
        }

        var maxZoomTransitionDuration = 300;
        if (Math.floor(this.z) !== Math.floor(z)) {
            this.animationLoop.set(maxZoomTransitionDuration);
        }

        this.z = z;
        this.fire('zoom');
    },

    _updateZoomHistory: function(z) {

        var zh = this.zoomHistory;

        if (zh.lastIntegerZoom === undefined) {
            // first time
            zh.lastIntegerZoom = Math.floor(z);
            zh.lastIntegerZoomTime = 0;
            zh.lastZoom = z;
        }

        // check whether an integer zoom level as passed since the last frame
        // and if yes, record it with the time. Used for transitioning patterns.
        if (Math.floor(zh.lastZoom) < Math.floor(z)) {
            zh.lastIntegerZoom = Math.floor(z);
            zh.lastIntegerZoomTime = Date.now();

        } else if (Math.floor(zh.lastZoom) > Math.floor(z)) {
            zh.lastIntegerZoom = Math.floor(z + 1);
            zh.lastIntegerZoomTime = Date.now();
        }

        zh.lastZoom = z;
    },

    addSource: function(id, source) {
        if (this.sources[id] !== undefined) {
            throw new Error('There is already a source with this ID');
        }
        source = Source.create(source);
        this.sources[id] = source;
        source.id = id;
        source.style = this;
        source.dispatcher = this.dispatcher;
        source.glyphAtlas = this.glyphAtlas;
        source
            .on('load', this._forwardSourceEvent)
            .on('error', this._forwardSourceEvent)
            .on('change', this._forwardSourceEvent)
            .on('tile.add', this._forwardTileEvent)
            .on('tile.load', this._forwardTileEvent)
            .on('tile.error', this._forwardTileEvent)
            .on('tile.remove', this._forwardTileEvent);
        this.fire('source.add', {source: source});
        return this;
    },

    /**
     * Remove a source from this stylesheet, given its id.
     * @param {String} id id of the source to remove
     * @returns {Style} this style
     * @throws {Error} if no source is found with the given ID
     * @private
     */
    removeSource: function(id) {
        if (this.sources[id] === undefined) {
            throw new Error('There is no source with this ID');
        }
        var source = this.sources[id];
        delete this.sources[id];
        source
            .off('load', this._forwardSourceEvent)
            .off('error', this._forwardSourceEvent)
            .off('change', this._forwardSourceEvent)
            .off('tile.add', this._forwardTileEvent)
            .off('tile.load', this._forwardTileEvent)
            .off('tile.error', this._forwardTileEvent)
            .off('tile.remove', this._forwardTileEvent);
        this.fire('source.remove', {source: source});
        return this;
    },

    /**
     * Get a source by id.
     * @param {String} id id of the desired source
     * @returns {Object} source
     * @private
     */
    getSource: function(id) {
        return this.sources[id];
    },

    /**
     * Add a layer to the map style. The layer will be inserted before the layer with
     * ID `before`, or appended if `before` is omitted.
     * @param {StyleLayer|Object} layer
     * @param {string=} before  ID of an existing layer to insert before
     * @fires layer.add
     * @returns {Style} `this`
     */
    addLayer: function(layer, before) {
        if (this._layers[layer.id] !== undefined) {
            throw new Error('There is already a layer with this ID');
        }
        if (!(layer instanceof StyleLayer)) {
            layer = new StyleLayer(layer, this.stylesheet.constants || {});
        }
        this._layers[layer.id] = layer;
        this._order.splice(before ? this._order.indexOf(before) : Infinity, 0, layer.id);
        layer.resolveLayout();
        layer.resolveReference(this._layers);
        layer.resolvePaint();
        this._groupLayers();
        this._broadcastLayers();
        this.fire('layer.add', {layer: layer});
        return this;
    },

    /**
     * Remove a layer from this stylesheet, given its id.
     * @param {String} id id of the layer to remove
     * @returns {Style} this style
     * @throws {Error} if no layer is found with the given ID
     * @private
     */
    removeLayer: function(id) {
        var layer = this._layers[id];
        if (layer === undefined) {
            throw new Error('There is no layer with this ID');
        }
        for (var i in this._layers) {
            if (this._layers[i].ref === id) {
                this.removeLayer(i);
            }
        }
        delete this._layers[id];
        this._order.splice(this._order.indexOf(id), 1);
        this._groupLayers();
        this._broadcastLayers();
        this.fire('layer.remove', {layer: layer});
        return this;
    },

    /**
     * Get a layer by id.
     * @param {String} id id of the desired layer
     * @returns {Layer} layer
     * @private
     */
    getLayer: function(id) {
        return this._layers[id];
    },

    /**
     * If a layer has a `ref` property that makes it derive some values
     * from another layer, return that referent layer. Otherwise,
     * returns the layer itself.
     * @param {String} id the layer's id
     * @returns {Layer} the referent layer or the layer itself
     * @private
     */
    getReferentLayer: function(id) {
        var layer = this.getLayer(id);
        if (layer.ref) {
            layer = this.getLayer(layer.ref);
        }
        return layer;
    },

    setFilter: function(layer, filter) {
        layer = this.getReferentLayer(layer);
        layer.filter = filter;
        this._broadcastLayers();
        this.sources[layer.source].reload();
    },

    /**
     * Get a layer's filter object
     * @param {String} layer the layer to inspect
     * @returns {*} the layer's filter, if any
     * @private
     */
    getFilter: function(layer) {
        return this.getReferentLayer(layer).filter;
    },

    setLayoutProperty: function(layer, name, value) {
        layer = this.getReferentLayer(layer);
        layer.setLayoutProperty(name, value);
        this._broadcastLayers();
        this.sources[layer.source].reload();
    },

    /**
     * Get a layout property's value from a given layer
     * @param {String} layer the layer to inspect
     * @param {String} name the name of the layout property
     * @returns {*} the property value
     * @private
     */
    getLayoutProperty: function(layer, name) {
        return this.getReferentLayer(layer).getLayoutProperty(name);
    },

    setPaintProperty: function(layer, name, value, klass) {
        this.getLayer(layer).setPaintProperty(name, value, klass);
    },

    getPaintProperty: function(layer, name, klass) {
        return this.getLayer(layer).getPaintProperty(name, klass);
    },

    featuresAt: function(coord, params, callback) {
        var features = [];
        var error = null;

        if (params.layer) {
            params.layer = { id: params.layer };
        }

        util.asyncEach(Object.keys(this.sources), function(id, callback) {
            var source = this.sources[id];
            source.featuresAt(coord, params, function(err, result) {
                if (result) features = features.concat(result);
                if (err) error = err;
                callback();
            });
        }.bind(this), function() {
            if (error) return callback(error);

            callback(null, features
                .filter(function(feature) {
                    return this._layers[feature.layer] !== undefined;
                }.bind(this))
                .map(function(feature) {
                    feature.layer = this._layers[feature.layer].json();
                    return feature;
                }.bind(this)));
        }.bind(this));
    },

    _remove: function() {
        this.dispatcher.remove();
    },

    _updateSources: function(transform) {
        for (var id in this.sources) {
            this.sources[id].update(transform);
        }
    },

    _redoPlacement: function() {
        for (var id in this.sources) {
            if (this.sources[id].redoPlacement) this.sources[id].redoPlacement();
        }
    },

    _forwardSourceEvent: function(e) {
        this.fire('source.' + e.type, util.extend({source: e.target}, e));
    },

    _forwardTileEvent: function(e) {
        this.fire(e.type, util.extend({source: e.target}, e));
    },

    // Callbacks from web workers

    'get sprite json': function(params, callback) {
        var sprite = this.sprite;
        if (sprite.loaded()) {
            callback(null, { sprite: sprite.data, retina: sprite.retina });
        } else {
            sprite.on('load', function() {
                callback(null, { sprite: sprite.data, retina: sprite.retina });
            });
        }
    },

    'get icons': function(params, callback) {
        var sprite = this.sprite;
        var spriteAtlas = this.spriteAtlas;
        if (sprite.loaded()) {
            spriteAtlas.setSprite(sprite);
            spriteAtlas.addIcons(params.icons, callback);
        } else {
            sprite.on('load', function() {
                spriteAtlas.setSprite(sprite);
                spriteAtlas.addIcons(params.icons, callback);
            });
        }
    },

    'get glyphs': function(params, callback) {
        this.glyphSource.getSimpleGlyphs(params.fontstack, params.codepoints, params.uid, callback);
    }
});

},{"../render/line_atlas":43,"../source/source":49,"../symbol/glyph_atlas":76,"../symbol/glyph_source":77,"../symbol/sprite_atlas":83,"../util/ajax":95,"../util/browser":96,"../util/dispatcher":98,"../util/evented":101,"../util/mapbox":104,"../util/util":107,"./animation_loop":57,"./image_sprite":58,"./style_layer":66,"mapbox-gl-style-spec/lib/validate/latest":117}],63:[function(require,module,exports){
'use strict';

var util = require('../util/util');

exports.resolve = function(value, constants) {
    function resolve(value) {
        return typeof value === 'string' && value[0] === '@' ? constants[value] : value;
    }

    var i;

    value = resolve(value);

    if (Array.isArray(value)) {
        value = value.slice();

        for (i = 0; i < value.length; i++) {
            if (value[i] in constants) {
                value[i] = resolve(value[i]);
            }
        }
    }

    if (value.stops) {
        value = util.extend({}, value);
        value.stops = value.stops.slice();

        for (i = 0; i < value.stops.length; i++) {
            if (value.stops[i][1] in constants) {
                value.stops[i] = [
                    value.stops[i][0],
                    resolve(value.stops[i][1])
                ];
            }
        }
    }

    return value;
};

exports.resolveAll = function (properties, constants) {
    if (!constants)
        return properties;

    var result = {};

    for (var key in properties) {
        result[key] = exports.resolve(properties[key], constants);
    }

    return result;
};

},{"../util/util":107}],64:[function(require,module,exports){
'use strict';

var parseCSSColor = require('csscolorparser').parseCSSColor;
var mapboxGLFunction = require('mapbox-gl-function');
var util = require('../util/util');

module.exports = StyleDeclaration;

function StyleDeclaration(reference, value) {
    this.type = reference.type;
    this.transitionable = reference.transition;

    // immutable representation of value. used for comparison
    this.json = JSON.stringify(value);

    if (this.type !== 'color') {
        this.value = value;
    } else if (value.stops) {
        this.value = prepareColorFunction(value);
    } else {
        this.value = parseColor(value);
    }

    if (reference.function === 'interpolated') {
        this.calculate = mapboxGLFunction.interpolated(this.value);
    } else {
        this.calculate = mapboxGLFunction['piecewise-constant'](this.value);
        if (reference.transition) {
            this.calculate = transitioned(this.calculate);
        }
    }
}

function transitioned(calculate) {
    return function(z, zh, duration) {
        var fraction = z % 1;
        var t = Math.min((Date.now() - zh.lastIntegerZoomTime) / duration, 1);
        var fromScale = 1;
        var toScale = 1;
        var mix, from, to;

        if (z > zh.lastIntegerZoom) {
            mix = fraction + (1 - fraction) * t;
            fromScale *= 2;
            from = calculate(z - 1);
            to = calculate(z);
        } else {
            mix = 1 - (1 - t) * fraction;
            to = calculate(z);
            from = calculate(z + 1);
            fromScale /= 2;
        }

        return {
            from: from,
            fromScale: fromScale,
            to: to,
            toScale: toScale,
            t: mix
        };
    };
}

var colorCache = {};

function parseColor(value) {
    if (colorCache[value]) return colorCache[value];
    var color = prepareColor(parseCSSColor(value));
    colorCache[value] = color;
    return color;
}

function prepareColor(c) {
    return [c[0] / 255, c[1] / 255, c[2] / 255, c[3] / 1];
}

function prepareColorFunction(f) {
    return util.extend({}, f, {stops: f.stops.map(function(stop) {
        return [stop[0], parseColor(stop[1])];
    })});
}

},{"../util/util":107,"csscolorparser":108,"mapbox-gl-function":116}],65:[function(require,module,exports){
'use strict';

var util = require('../util/util');
var reference = require('./reference');
var StyleConstant = require('./style_constant');
var StyleDeclaration = require('./style_declaration');

var lookup = {
    paint: {},
    layout: {}
};

reference.layer.type.values.forEach(function(type) {
    lookup.paint[type] = makeConstructor(reference['paint_' + type]);
    lookup.layout[type] = makeConstructor(reference['layout_' + type]);
});

function makeConstructor(reference) {
    function StyleDeclarationSet(properties, constants) {
        this._values = {};
        this._transitions = {};

        this._constants = constants;

        for (var k in properties) {
            this[k] = StyleConstant.resolve(properties[k], this._constants);
        }
    }

    Object.keys(reference).forEach(function(k) {
        var property = reference[k];

        Object.defineProperty(StyleDeclarationSet.prototype, k, {
            set: function(v) {
                this._values[k] = new StyleDeclaration(property, StyleConstant.resolve(v, this._constants));
            },
            get: function() {
                return this._values[k].value;
            }
        });

        if (property.transition) {
            Object.defineProperty(StyleDeclarationSet.prototype, k + '-transition', {
                set: function(v) {
                    this._transitions[k] = v;
                },
                get: function() {
                    return this._transitions[k];
                }
            });
        }
    });

    StyleDeclarationSet.prototype.values = function() {
        return this._values;
    };

    StyleDeclarationSet.prototype.transition = function(k, global) {
        var t = this._transitions[k] || {};
        return {
            duration: util.coalesce(t.duration, global.duration, 300),
            delay: util.coalesce(t.delay, global.delay, 0)
        };
    };

    StyleDeclarationSet.prototype.json = function() {
        var result = {};

        for (var v in this._values) {
            result[v] = this._values[v].value;
        }

        for (var t in this._transitions) {
            result[t + '-transition'] = this._transitions[v];
        }

        return result;
    };

    return StyleDeclarationSet;
}

module.exports = function(renderType, layerType, properties, constants) {
    return new lookup[renderType][layerType](properties, constants);
};

},{"../util/util":107,"./reference":61,"./style_constant":63,"./style_declaration":64}],66:[function(require,module,exports){
'use strict';

var util = require('../util/util');
var StyleConstant = require('./style_constant');
var StyleTransition = require('./style_transition');
var StyleDeclarationSet = require('./style_declaration_set');
var LayoutProperties = require('./layout_properties');
var PaintProperties = require('./paint_properties');

module.exports = StyleLayer;

function StyleLayer(layer, constants) {
    this._layer = layer;
    this._constants = constants;

    this.id = layer.id;
    this.ref = layer.ref;

    // Resolved and cascaded paint properties.
    this._resolved = {}; // class name -> StyleDeclarationSet
    this._cascaded = {}; // property name -> StyleTransition

    this.assign(layer);
}

StyleLayer.prototype = {
    resolveLayout: function() {
        if (!this.ref) {
            this.layout = new LayoutProperties[this.type](
                StyleConstant.resolveAll(this._layer.layout, this._constants));

            if (this.layout['symbol-placement'] === 'line') {
                if (!this.layout.hasOwnProperty('text-rotation-alignment')) {
                    this.layout['text-rotation-alignment'] = 'map';
                }
                if (!this.layout.hasOwnProperty('icon-rotation-alignment')) {
                    this.layout['icon-rotation-alignment'] = 'map';
                }
                this.layout['symbol-avoid-edges'] = true;
            }
        }
    },

    setLayoutProperty: function(name, value) {
        this.layout[name] = StyleConstant.resolve(value, this._constants);
    },

    getLayoutProperty: function(name) {
        return this.layout[name];
    },

    resolveReference: function(layers) {
        if (this.ref) {
            this.assign(layers[this.ref]);
        }
    },

    resolvePaint: function() {
        for (var p in this._layer) {
            var match = p.match(/^paint(?:\.(.*))?$/);
            if (!match)
                continue;
            this._resolved[match[1] || ''] =
                new StyleDeclarationSet('paint', this.type, this._layer[p], this._constants);
        }
    },

    setPaintProperty: function(name, value, klass) {
        var declarations = this._resolved[klass || ''];
        if (!declarations) {
            declarations = this._resolved[klass || ''] =
                new StyleDeclarationSet('paint', this.type, {}, this._constants);
        }
        declarations[name] = value;
    },

    getPaintProperty: function(name, klass) {
        var declarations = this._resolved[klass || ''];
        if (!declarations)
            return undefined;
        return declarations[name];
    },

    cascade: function(classes, options, globalTrans, animationLoop) {
        for (var klass in this._resolved) {
            if (klass !== "" && !classes[klass])
                continue;

            var declarations = this._resolved[klass],
                values = declarations.values();

            for (var k in values) {
                var newDeclaration = values[k];
                var oldTransition = options.transition ? this._cascaded[k] : undefined;

                // Only create a new transition if the declaration changed
                if (!oldTransition || oldTransition.declaration.json !== newDeclaration.json) {
                    var newStyleTrans = declarations.transition(k, globalTrans);
                    var newTransition = this._cascaded[k] =
                        new StyleTransition(newDeclaration, oldTransition, newStyleTrans);

                    // Run the animation loop until the end of the transition
                    if (!newTransition.instant()) {
                        newTransition.loopID = animationLoop.set(newTransition.endTime - (new Date()).getTime());
                    }

                    if (oldTransition) {
                        animationLoop.cancel(oldTransition.loopID);
                    }
                }
            }
        }
    },

    recalculate: function(z, zoomHistory) {
        var type = this.type,
            calculated = this.paint = new PaintProperties[type]();

        for (var k in this._cascaded) {
            calculated[k] = this._cascaded[k].at(z, zoomHistory);
        }

        this.hidden = (this.minzoom && z < this.minzoom) ||
                      (this.maxzoom && z >= this.maxzoom) ||
                      // include visibility check for non-bucketed background layers
                      (this.layout.visibility === 'none');

        if (type === 'symbol') {
            if ((calculated['text-opacity'] === 0 || !this.layout['text-field']) &&
                (calculated['icon-opacity'] === 0 || !this.layout['icon-image'])) {
                this.hidden = true;
            } else {
                premultiplyLayer(calculated, 'text');
                premultiplyLayer(calculated, 'icon');
            }

        } else if (calculated[type + '-opacity'] === 0) {
            this.hidden = true;
        } else {
            premultiplyLayer(calculated, type);
        }

        if (this._cascaded['line-dasharray']) {
            // If the line is dashed, scale the dash lengths by the line
            // width at the previous round zoom level.
            var dashArray = calculated['line-dasharray'];
            var lineWidth = this._cascaded['line-width'] ?
                this._cascaded['line-width'].at(Math.floor(z), Infinity) :
                calculated['line-width'];

            dashArray.fromScale *= lineWidth;
            dashArray.toScale *= lineWidth;
        }

        return !this.hidden;
    },

    assign: function(layer) {
        util.extend(this, util.pick(layer,
            ['type', 'source', 'source-layer',
            'minzoom', 'maxzoom', 'filter',
            'layout']));
    },

    json: function() {
        return util.extend({},
            this._layer,
            util.pick(this,
                ['type', 'source', 'source-layer',
                'minzoom', 'maxzoom', 'filter',
                'layout', 'paint']));
    }
};

function premultiplyLayer(layer, type) {
    var colorProp = type + '-color',
        haloProp = type + '-halo-color',
        outlineProp = type + '-outline-color',
        color = layer[colorProp],
        haloColor = layer[haloProp],
        outlineColor = layer[outlineProp],
        opacity = layer[type + '-opacity'];

    var colorOpacity = color && (opacity * color[3]);
    var haloOpacity = haloColor && (opacity * haloColor[3]);
    var outlineOpacity = outlineColor && (opacity * outlineColor[3]);

    if (colorOpacity !== undefined && colorOpacity < 1) {
        layer[colorProp] = util.premultiply([color[0], color[1], color[2], colorOpacity]);
    }
    if (haloOpacity !== undefined && haloOpacity < 1) {
        layer[haloProp] = util.premultiply([haloColor[0], haloColor[1], haloColor[2], haloOpacity]);
    }
    if (outlineOpacity !== undefined && outlineOpacity < 1) {
        layer[outlineProp] = util.premultiply([outlineColor[0], outlineColor[1], outlineColor[2], outlineOpacity]);
    }
}

},{"../util/util":107,"./layout_properties":59,"./paint_properties":60,"./style_constant":63,"./style_declaration_set":65,"./style_transition":67}],67:[function(require,module,exports){
'use strict';

var util = require('../util/util');
var interpolate = require('../util/interpolate');

module.exports = StyleTransition;

/*
 * Represents a transition between two declarations
 */
function StyleTransition(declaration, oldTransition, value) {

    this.declaration = declaration;
    this.startTime = this.endTime = (new Date()).getTime();

    var type = declaration.type;
    if ((type === 'string' || type === 'array') && declaration.transitionable) {
        this.interp = interpZoomTransitioned;
    } else {
        this.interp = interpolate[type];
    }

    this.oldTransition = oldTransition;
    this.duration = value.duration || 0;
    this.delay = value.delay || 0;

    if (!this.instant()) {
        this.endTime = this.startTime + this.duration + this.delay;
        this.ease = util.easeCubicInOut;
    }

    if (oldTransition && oldTransition.endTime <= this.startTime) {
        // Old transition is done running, so we can
        // delete its reference to its old transition.

        delete oldTransition.oldTransition;
    }
}

StyleTransition.prototype.instant = function() {
    return !this.oldTransition || !this.interp || (this.duration === 0 && this.delay === 0);
};

/*
 * Return the value of the transitioning property at zoom level `z` and optional time `t`
 */
StyleTransition.prototype.at = function(z, zoomHistory, t) {

    var value = this.declaration.calculate(z, zoomHistory, this.duration);

    if (this.instant()) return value;

    t = t || Date.now();

    if (t < this.endTime) {
        var oldValue = this.oldTransition.at(z, zoomHistory, this.startTime);
        var eased = this.ease((t - this.startTime - this.delay) / this.duration);
        value = this.interp(oldValue, value, eased);
    }

    return value;

};

function interpZoomTransitioned(from, to, t) {
    return {
        from: from.to,
        fromScale: from.toScale,
        to: to.to,
        toScale: to.toScale,
        t: t
    };
}

},{"../util/interpolate":103,"../util/util":107}],68:[function(require,module,exports){
'use strict';

var Point = require('point-geometry');

module.exports = Anchor;

function Anchor(x, y, angle, segment) {
    this.x = x;
    this.y = y;
    this.angle = angle;

    if (segment !== undefined) {
        this.segment = segment;
    }
}

Anchor.prototype = Object.create(Point.prototype);

Anchor.prototype.clone = function() {
    return new Anchor(this.x, this.y, this.angle, this.segment);
};

},{"point-geometry":124}],69:[function(require,module,exports){
'use strict';

module.exports = BinPack;
function BinPack(width, height) {
    this.width = width;
    this.height = height;
    this.free = [{ x: 0, y: 0, w: width, h: height }];
}

/**
 * Simple algorithm to recursively merge the newly released cell with its
 * neighbor. This doesn't merge more than two cells at a time, and fails
 * for complicated merges.
 * @private
 */
BinPack.prototype.release = function(rect) {
    for (var i = 0; i < this.free.length; i++) {
        var free = this.free[i];

        if (free.y === rect.y && free.h === rect.h && free.x + free.w === rect.x) {
            free.w += rect.w;

        } else if (free.x === rect.x && free.w === rect.w && free.y + free.h === rect.y) {
            free.h += rect.h;

        } else if (rect.y === free.y && rect.h === free.h && rect.x + rect.w === free.x) {
            free.x = rect.x;
            free.w += rect.w;

        } else if (rect.x === free.x && rect.w === free.w && rect.y + rect.h === free.y) {
            free.y = rect.y;
            free.h += rect.h;

        } else continue;

        this.free.splice(i, 1);
        this.release(free);
        return;

    }
    this.free.push(rect);
};

BinPack.prototype.allocate = function(width, height) {
    // Find the smallest free rect angle
    var rect = { x: Infinity, y: Infinity, w: Infinity, h: Infinity };
    var smallest = -1;
    for (var i = 0; i < this.free.length; i++) {
        var ref = this.free[i];
        if (width <= ref.w && height <= ref.h && ref.y <= rect.y && ref.x <= rect.x) {
            rect = ref;
            smallest = i;
        }
    }

    if (smallest < 0) {
        // There's no space left for this char.
        return { x: -1, y: -1 };
    }

    this.free.splice(smallest, 1);

    // Shorter/Longer Axis Split Rule (SAS)
    // http://clb.demon.fi/files/RectangleBinPack.pdf p. 15
    // Ignore the dimension of R and just split long the shorter dimension
    // See Also: http://www.cs.princeton.edu/~chazelle/pubs/blbinpacking.pdf
    if (rect.w < rect.h) {
        // split horizontally
        // +--+---+
        // |__|___|  <-- b1
        // +------+  <-- b2
        if (rect.w > width) this.free.push({ x: rect.x + width, y: rect.y, w: rect.w - width, h: height });
        if (rect.h > height) this.free.push({ x: rect.x, y: rect.y + height, w: rect.w, h: rect.h - height });
    } else {
        // split vertically
        // +--+---+
        // |__|   | <-- b1
        // +--|---+ <-- b2
        if (rect.w > width) this.free.push({ x: rect.x + width, y: rect.y, w: rect.w - width, h: rect.h });
        if (rect.h > height) this.free.push({ x: rect.x, y: rect.y + height, w: width, h: rect.h - height });
    }

    return { x: rect.x, y: rect.y, w: width, h: height };
};

},{}],70:[function(require,module,exports){
'use strict';

module.exports = checkMaxAngle;

function checkMaxAngle(line, anchor, labelLength, windowSize, maxAngle) {

    // horizontal labels always pass
    if (anchor.segment === undefined) return true;

    var p = anchor;
    var index = anchor.segment + 1;
    var anchorDistance = 0;

    // move backwards along the line to the first segment the label appears on
    while (anchorDistance > -labelLength / 2) {
        index--;

        // there isn't enough room for the label after the beginning of the line
        if (index < 0) return false;

        anchorDistance -= line[index].dist(p);
        p = line[index];
    }

    anchorDistance += line[index].dist(line[index + 1]);
    index++;

    // store recent corners and their total angle difference
    var recentCorners = [];
    var recentAngleDelta = 0;

    // move forwards by the length of the label and check angles along the way
    while (anchorDistance < labelLength / 2) {
        var prev = line[index - 1];
        var current = line[index];
        var next = line[index + 1];

        // there isn't enough room for the label before the end of the line
        if (!next) return false;

        var angleDelta = prev.angleTo(current) - current.angleTo(next);
        // restrict angle to -pi..pi range
        angleDelta = ((angleDelta + 3 * Math.PI) % (Math.PI * 2)) - Math.PI;

        recentCorners.push({
            distance: anchorDistance,
            angleDelta: angleDelta
        });
        recentAngleDelta += angleDelta;

        // remove corners that are far enough away from the list of recent anchors
        while (anchorDistance - recentCorners[0].distance > windowSize) {
            recentAngleDelta -= recentCorners.shift().angleDelta;
        }

        // the sum of angles within the window area exceeds the maximum allowed value. check fails.
        if (Math.abs(recentAngleDelta) > maxAngle) return false;

        index++;
        anchorDistance += current.dist(next);
    }

    // no part of the line had an angle greater than the maximum allowed. check passes.
    return true;
}

},{}],71:[function(require,module,exports){
'use strict';

var Point = require('point-geometry');

module.exports = clipLine;

function clipLine(lines, x1, y1, x2, y2) {
    var clippedLines = [];

    for (var l = 0; l < lines.length; l++) {
        var line = lines[l];
        var clippedLine;

        for (var i = 0; i < line.length - 1; i++) {
            var p0 = line[i];
            var p1 = line[i + 1];


            if (p0.x < x1 && p1.x < x1) {
                continue;
            } else if (p0.x < x1) {
                p0 = new Point(x1, p0.y + (p1.y - p0.y) * ((x1 - p0.x) / (p1.x - p0.x)));
            } else if (p1.x < x1) {
                p1 = new Point(x1, p0.y + (p1.y - p0.y) * ((x1 - p0.x) / (p1.x - p0.x)));
            }

            if (p0.y < y1 && p1.y < y1) {
                continue;
            } else if (p0.y < y1) {
                p0 = new Point(p0.x + (p1.x - p0.x) * ((y1 - p0.y) / (p1.y - p0.y)), y1);
            } else if (p1.y < y1) {
                p1 = new Point(p0.x + (p1.x - p0.x) * ((y1 - p0.y) / (p1.y - p0.y)), y1);
            }

            if (p0.x >= x2 && p1.x >= x2) {
                continue;
            } else if (p0.x >= x2) {
                p0 = new Point(x2, p0.y + (p1.y - p0.y) * ((x2 - p0.x) / (p1.x - p0.x)));
            } else if (p1.x >= x2) {
                p1 = new Point(x2, p0.y + (p1.y - p0.y) * ((x2 - p0.x) / (p1.x - p0.x)));
            }

            if (p0.y >= y2 && p1.y >= y2) {
                continue;
            } else if (p0.y >= y2) {
                p0 = new Point(p0.x + (p1.x - p0.x) * ((y2 - p0.y) / (p1.y - p0.y)), y2);
            } else if (p1.y >= y2) {
                p1 = new Point(p0.x + (p1.x - p0.x) * ((y2 - p0.y) / (p1.y - p0.y)), y2);
            }

            if (!clippedLine || !p0.equals(clippedLine[clippedLine.length - 1])) {
                clippedLine = [p0];
                clippedLines.push(clippedLine);
            }

            clippedLine.push(p1);
        }
    }

    return clippedLines;
}

},{"point-geometry":124}],72:[function(require,module,exports){
'use strict';

module.exports = CollisionBox;

function CollisionBox(anchor, x1, y1, x2, y2, maxScale) {
    // the box is centered around the anchor point
    this.anchor = anchor;

    // distances to the edges from the anchor
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;

    // the box is only valid for scales < maxScale.
    // The box does not block other boxes at scales >= maxScale;
    this.maxScale = maxScale;

    // the scale at which the label can first be shown
    this.placementScale = 0;

    // rotated and scaled bbox used for indexing
    this[0] = this[1] = this[2] = this[3] = 0;
}

},{}],73:[function(require,module,exports){
'use strict';

var CollisionBox = require('./collision_box');

module.exports = CollisionFeature;

function CollisionFeature(line, anchor, shaped, boxScale, padding, alignLine) {

    var y1 = shaped.top * boxScale - padding;
    var y2 = shaped.bottom * boxScale + padding;
    var x1 = shaped.left * boxScale - padding;
    var x2 = shaped.right * boxScale + padding;

    this.boxes = [];

    if (alignLine) {

        var height = y2 - y1;
        var length = x2 - x1;

        if (height <= 0) return;

        // set minimum box height to avoid very many small labels
        height = Math.max(10 * boxScale, height);

        this.bboxifyLabel(line, anchor, length, height);

    } else {
        this.boxes.push(new CollisionBox(anchor, x1, y1, x2, y2, Infinity));
    }
}

CollisionFeature.prototype.bboxifyLabel = function(line, anchor, labelLength, boxSize) {
    var step = boxSize / 2;
    var nBoxes = Math.floor(labelLength / step);

    // offset the center of the first box by half a box so that the edge of the
    // box is at the edge of the label.
    var firstBoxOffset = -boxSize / 2;

    var bboxes = this.boxes;

    var p = anchor;
    var index = anchor.segment + 1;
    var anchorDistance = firstBoxOffset;

    // move backwards along the line to the first segment the label appears on
    do {
        index--;

        // there isn't enough room for the label after the beginning of the line
        // checkMaxAngle should have already caught this
        if (index < 0) return bboxes;

        anchorDistance -= line[index].dist(p);
        p = line[index];
    } while (anchorDistance > -labelLength / 2);

    var segmentLength = line[index].dist(line[index + 1]);

    for (var i = 0; i < nBoxes; i++) {
        // the distance the box will be from the anchor
        var boxDistanceToAnchor = -labelLength / 2 + i * step;

        // the box is not on the current segment. Move to the next segment.
        while (anchorDistance + segmentLength < boxDistanceToAnchor) {
            anchorDistance += segmentLength;
            index++;

            // There isn't enough room before the end of the line.
            if (index + 1 >= line.length) return bboxes;

            segmentLength = line[index].dist(line[index + 1]);
        }

        // the distance the box will be from the beginning of the segment
        var segmentBoxDistance = boxDistanceToAnchor - anchorDistance;

        var p0 = line[index];
        var p1 = line[index + 1];
        var boxAnchor = p1.sub(p0)._unit()._mult(segmentBoxDistance)._add(p0);

        var distanceToInnerEdge = Math.max(Math.abs(boxDistanceToAnchor - firstBoxOffset) - step / 2, 0);
        var maxScale = labelLength / 2 / distanceToInnerEdge;

        bboxes.push(new CollisionBox(boxAnchor, -boxSize / 2, -boxSize / 2, boxSize / 2, boxSize / 2, maxScale));
    }

    return bboxes;
};

},{"./collision_box":72}],74:[function(require,module,exports){
'use strict';

var rbush = require('rbush');

module.exports = CollisionTile;

function CollisionTile(zoom, tileExtent, tileSize) {
    this.zoom = zoom;
    this.tilePixelRatio = tileExtent / tileSize;
}

CollisionTile.prototype.minScale = 0.25;
CollisionTile.prototype.maxScale = 2;

CollisionTile.prototype.reset = function(angle, pitch) {
    this.tree = rbush();
    this.angle = angle;

    var sin = Math.sin(angle),
        cos = Math.cos(angle);
    this.rotationMatrix = [cos, -sin, sin, cos];

    // Stretch boxes in y direction to account for the map tilt.
    this.yStretch = 1 / Math.cos(pitch / 180 * Math.PI);

    // The amount the map is squished depends on the y position.
    // Sort of account for this by making all boxes a bit bigger.
    this.yStretch = Math.pow(this.yStretch, 1.3);
};

CollisionTile.prototype.placeFeature = function(feature) {

    var minPlacementScale = this.minScale;
    var rotationMatrix = this.rotationMatrix;
    var yStretch = this.yStretch;

    for (var b = 0; b < feature.boxes.length; b++) {

        var box = feature.boxes[b];

        var anchor = box.anchor.matMult(rotationMatrix);
        var x = anchor.x;
        var y = anchor.y;

        box[0] = x + box.x1;
        box[1] = y + box.y1 * yStretch;
        box[2] = x + box.x2;
        box[3] = y + box.y2 * yStretch;

        var blockingBoxes = this.tree.search(box);

        for (var i = 0; i < blockingBoxes.length; i++) {
            var blocking = blockingBoxes[i];
            var blockingAnchor = blocking.anchor.matMult(rotationMatrix);

            // Find the lowest scale at which the two boxes can fit side by side without overlapping.
            // Original algorithm:
            var s1 = (blocking.x1 - box.x2) / (x - blockingAnchor.x); // scale at which new box is to the left of old box
            var s2 = (blocking.x2 - box.x1) / (x - blockingAnchor.x); // scale at which new box is to the right of old box
            var s3 = (blocking.y1 - box.y2) * yStretch / (y - blockingAnchor.y); // scale at which new box is to the top of old box
            var s4 = (blocking.y2 - box.y1) * yStretch / (y - blockingAnchor.y); // scale at which new box is to the bottom of old box

            if (isNaN(s1) || isNaN(s2)) s1 = s2 = 1;
            if (isNaN(s3) || isNaN(s4)) s3 = s4 = 1;

            var collisionFreeScale = Math.min(Math.max(s1, s2), Math.max(s3, s4));

            if (collisionFreeScale > blocking.maxScale) {
                // After a box's maxScale the label has shrunk enough that the box is no longer needed to cover it,
                // so unblock the new box at the scale that the old box disappears.
                collisionFreeScale = blocking.maxScale;
            }

            if (collisionFreeScale > box.maxScale) {
                // If the box can only be shown after it is visible, then the box can never be shown.
                // But the label can be shown after this box is not visible.
                collisionFreeScale = box.maxScale;
            }

            if (collisionFreeScale > minPlacementScale &&
                    collisionFreeScale >= blocking.placementScale) {
                // If this collision occurs at a lower scale than previously found collisions
                // and the collision occurs while the other label is visible

                // this this is the lowest scale at which the label won't collide with anything
                minPlacementScale = collisionFreeScale;
            }

            if (minPlacementScale >= this.maxScale) return minPlacementScale;
        }
    }

    return minPlacementScale;
};

CollisionTile.prototype.insertFeature = function(feature, minPlacementScale) {

    var boxes = feature.boxes;
    for (var k = 0; k < boxes.length; k++) {
        boxes[k].placementScale = minPlacementScale;
    }

    if (minPlacementScale < this.maxScale) {
        this.tree.load(boxes);
    }
};

},{"rbush":125}],75:[function(require,module,exports){
'use strict';

var interpolate = require('../util/interpolate');
var Anchor = require('../symbol/anchor');
var checkMaxAngle = require('./check_max_angle');

module.exports = getAnchors;

function getAnchors(line, spacing, maxAngle, shapedText, glyphSize, boxScale, overscaling) {

    // Resample a line to get anchor points for labels and check that each
    // potential label passes text-max-angle check and has enough froom to fit
    // on the line.

    var angleWindowSize = shapedText ?
        3 / 5 * glyphSize * boxScale :
        0;

    // Offset the first anchor by half the label length (or half the spacing distance for icons).
    // Add a bit of extra offset to avoid collisions at T intersections.
    var labelLength = shapedText ? shapedText.right - shapedText.left : spacing;
    var extraOffset = glyphSize * 2;
    var offset = ((labelLength / 2 + extraOffset) * boxScale * overscaling) % spacing;

    return resample(line, offset, spacing, angleWindowSize, maxAngle, labelLength * boxScale, false);
}


function resample(line, offset, spacing, angleWindowSize, maxAngle, labelLength, placeAtMiddle) {

    var distance = 0,
        markedDistance = offset ? offset - spacing : 0;

    var anchors = [];

    for (var i = 0; i < line.length - 1; i++) {

        var a = line[i],
            b = line[i + 1];

        var segmentDist = a.dist(b),
            angle = b.angleTo(a);

        while (markedDistance + spacing < distance + segmentDist) {
            markedDistance += spacing;

            var t = (markedDistance - distance) / segmentDist,
                x = interpolate(a.x, b.x, t),
                y = interpolate(a.y, b.y, t);

            if (x >= 0 && x < 4096 && y >= 0 && y < 4096) {
                x = Math.round(x);
                y = Math.round(y);
                var anchor = new Anchor(x, y, angle, i);

                if (!angleWindowSize || checkMaxAngle(line, anchor, labelLength, angleWindowSize, maxAngle)) {
                    anchors.push(anchor);
                }
            }
        }

        distance += segmentDist;
    }

    if (!placeAtMiddle && !anchors.length) {
        // The first attempt at finding anchors at which labels can be placed failed.
        // Try again, but this time just try placing one anchor at the middle of the line.
        // This has the most effect for short lines in overscaled tiles, since the
        // initial offset used in overscaled tiles is calculated to align labels with positions in
        // parent tiles instead of placing the label as close to the beginning as possible.
        anchors = resample(line, distance / 2, spacing, angleWindowSize, maxAngle, labelLength, true);
    }

    return anchors;
}

},{"../symbol/anchor":68,"../util/interpolate":103,"./check_max_angle":70}],76:[function(require,module,exports){
'use strict';

var BinPack = require('./bin_pack');

module.exports = GlyphAtlas;
function GlyphAtlas(width, height) {
    this.width = width;
    this.height = height;

    this.bin = new BinPack(width, height);
    this.index = {};
    this.ids = {};
    this.data = new Uint8Array(width * height);
}

GlyphAtlas.prototype = {
    get debug() {
        return 'canvas' in this;
    },
    set debug(value) {
        if (value && !this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.width = this.width;
            this.canvas.height = this.height;
            document.body.appendChild(this.canvas);
            this.ctx = this.canvas.getContext('2d');
        } else if (!value && this.canvas) {
            this.canvas.parentNode.removeChild(this.canvas);
            delete this.ctx;
            delete this.canvas;
        }
    }
};

GlyphAtlas.prototype.getGlyphs = function() {
    var glyphs = {},
        split,
        name,
        id;

    for (var key in this.ids) {
        split = key.split('#');
        name = split[0];
        id = split[1];

        if (!glyphs[name]) glyphs[name] = [];
        glyphs[name].push(id);
    }

    return glyphs;
};

GlyphAtlas.prototype.getRects = function() {
    var rects = {},
        split,
        name,
        id;

    for (var key in this.ids) {
        split = key.split('#');
        name = split[0];
        id = split[1];

        if (!rects[name]) rects[name] = {};
        rects[name][id] = this.index[key];
    }

    return rects;
};

GlyphAtlas.prototype.removeGlyphs = function(id) {
    for (var key in this.ids) {

        var ids = this.ids[key];

        var pos = ids.indexOf(id);
        if (pos >= 0) ids.splice(pos, 1);
        this.ids[key] = ids;

        if (!ids.length) {
            var rect = this.index[key];

            var target = this.data;
            for (var y = 0; y < rect.h; y++) {
                var y1 = this.width * (rect.y + y) + rect.x;
                for (var x = 0; x < rect.w; x++) {
                    target[y1 + x] = 0;
                }
            }

            this.dirty = true;

            this.bin.release(rect);

            delete this.index[key];
            delete this.ids[key];
        }
    }


    this.updateTexture(this.gl);
};

GlyphAtlas.prototype.addGlyph = function(id, name, glyph, buffer) {
    if (!glyph) {
        // console.warn('missing glyph', code, String.fromCharCode(code));
        return null;
    }
    var key = name + "#" + glyph.id;

    // The glyph is already in this texture.
    if (this.index[key]) {
        if (this.ids[key].indexOf(id) < 0) {
            this.ids[key].push(id);
        }
        return this.index[key];
    }

    // The glyph bitmap has zero width.
    if (!glyph.bitmap) {
        return null;
    }

    var bufferedWidth = glyph.width + buffer * 2;
    var bufferedHeight = glyph.height + buffer * 2;

    // Add a 1px border around every image.
    var padding = 1;
    var packWidth = bufferedWidth + 2 * padding;
    var packHeight = bufferedHeight + 2 * padding;

    // Increase to next number divisible by 4, but at least 1.
    // This is so we can scale down the texture coordinates and pack them
    // into 2 bytes rather than 4 bytes.
    packWidth += (4 - packWidth % 4);
    packHeight += (4 - packHeight % 4);

    var rect = this.bin.allocate(packWidth, packHeight);
    if (rect.x < 0) {
        console.warn('glyph bitmap overflow');
        return { glyph: glyph, rect: null };
    }

    this.index[key] = rect;
    this.ids[key] = [id];

    var target = this.data;
    var source = glyph.bitmap;
    for (var y = 0; y < bufferedHeight; y++) {
        var y1 = this.width * (rect.y + y + padding) + rect.x + padding;
        var y2 = bufferedWidth * y;
        for (var x = 0; x < bufferedWidth; x++) {
            target[y1 + x] = source[y2 + x];
        }
    }

    this.dirty = true;

    return rect;
};

GlyphAtlas.prototype.bind = function(gl) {
    this.gl = gl;
    if (!this.texture) {
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.ALPHA, this.width, this.height, 0, gl.ALPHA, gl.UNSIGNED_BYTE, null);

    } else {
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
    }
};

GlyphAtlas.prototype.updateTexture = function(gl) {
    this.bind(gl);
    if (this.dirty) {

        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.width, this.height, gl.ALPHA, gl.UNSIGNED_BYTE, this.data);

        // DEBUG
        if (this.ctx) {
            var data = this.ctx.getImageData(0, 0, this.width, this.height);
            for (var i = 0, j = 0; i < this.data.length; i++, j += 4) {
                data.data[j] = this.data[i];
                data.data[j + 1] = this.data[i];
                data.data[j + 2] = this.data[i];
                data.data[j + 3] = 255;
            }
            this.ctx.putImageData(data, 0, 0);

            this.ctx.strokeStyle = 'red';
            for (var k = 0; k < this.bin.free.length; k++) {
                var free = this.bin.free[k];
                this.ctx.strokeRect(free.x, free.y, free.w, free.h);
            }
        }
        // END DEBUG

        this.dirty = false;
    }
};

},{"./bin_pack":69}],77:[function(require,module,exports){
'use strict';

var normalizeURL = require('../util/mapbox').normalizeGlyphsURL;
var getArrayBuffer = require('../util/ajax').getArrayBuffer;
var Glyphs = require('../util/glyphs');
var Protobuf = require('pbf');

module.exports = GlyphSource;

/**
 * A glyph source has a URL from which to load new glyphs and owns a GlyphAtlas
 * that stores currently-loaded glyphs.
 *
 * @param {string} url glyph template url
 * @param {Object} glyphAtlas glyph atlas object
 * @private
 */
function GlyphSource(url, glyphAtlas) {
    this.url = url && normalizeURL(url);
    this.glyphAtlas = glyphAtlas;
    this.stacks = [];
    this.loading = {};
}

GlyphSource.prototype.getSimpleGlyphs = function(fontstack, glyphIDs, uid, callback) {

    if (this.stacks[fontstack] === undefined) this.stacks[fontstack] = {};

    var glyphs = {};

    var stack = this.stacks[fontstack];
    var glyphAtlas = this.glyphAtlas;

    // the number of pixels the sdf bitmaps are padded by
    var buffer = 3;

    var missing = {};
    var remaining = 0;
    var range;

    for (var i = 0; i < glyphIDs.length; i++) {
        var glyphID = glyphIDs[i];
        range = Math.floor(glyphID / 256);

        if (stack[range]) {
            var glyph = stack[range].glyphs[glyphID];
            var rect  = glyphAtlas.addGlyph(uid, fontstack, glyph, buffer);
            if (glyph) glyphs[glyphID] = new SimpleGlyph(glyph, rect, buffer);
        } else {
            if (missing[range] === undefined) {
                missing[range] = [];
                remaining++;
            }
            missing[range].push(glyphID);
        }
    }

    if (!remaining) callback(undefined, glyphs);

    var onRangeLoaded = function(err, range, data) {
        // TODO not be silent about errors
        if (!err) {
            var stack = this.stacks[fontstack][range] = data.stacks[0];
            for (var i = 0; i < missing[range].length; i++) {
                var glyphID = missing[range][i];
                var glyph = stack.glyphs[glyphID];
                var rect  = glyphAtlas.addGlyph(uid, fontstack, glyph, buffer);
                if (glyph) glyphs[glyphID] = new SimpleGlyph(glyph, rect, buffer);
            }
        }
        remaining--;
        if (!remaining) callback(undefined, glyphs);
    }.bind(this);

    for (var r in missing) {
        this.loadRange(fontstack, r, onRangeLoaded);
    }
};

// A simplified representation of the glyph containing only the properties needed for shaping.
function SimpleGlyph(glyph, rect, buffer) {
    var padding = 1;
    this.advance = glyph.advance;
    this.left = glyph.left - buffer - padding;
    this.top = glyph.top + buffer + padding;
    this.rect = rect;
}

GlyphSource.prototype.loadRange = function(fontstack, range, callback) {

    if (range * 256 > 65535) return callback('gyphs > 65535 not supported');

    if (this.loading[fontstack] === undefined) this.loading[fontstack] = {};
    var loading = this.loading[fontstack];

    if (loading[range]) {
        loading[range].push(callback);
    } else {
        loading[range] = [callback];

        var rangeName = (range * 256) + '-' + (range * 256 + 255);
        var url = glyphUrl(fontstack, rangeName, this.url);

        getArrayBuffer(url, function(err, data) {
            var glyphs = !err && new Glyphs(new Protobuf(new Uint8Array(data)));
            for (var i = 0; i < loading[range].length; i++) {
                loading[range][i](err, range, glyphs);
            }
            delete loading[range];
        });
    }
};

/**
 * Use CNAME sharding to load a specific glyph range over a randomized
 * but consistent subdomain.
 * @param {string} fontstack comma-joined fonts
 * @param {string} range comma-joined range
 * @param {url} url templated url
 * @param {string} [subdomains=abc] subdomains as a string where each letter is one.
 * @returns {string} a url to load that section of glyphs
 * @private
 */
function glyphUrl(fontstack, range, url, subdomains) {
    subdomains = subdomains || 'abc';

    return url
        .replace('{s}', subdomains[fontstack.length % subdomains.length])
        .replace('{fontstack}', fontstack)
        .replace('{range}', range);
}

},{"../util/ajax":95,"../util/glyphs":102,"../util/mapbox":104,"pbf":122}],78:[function(require,module,exports){
'use strict';

module.exports = function (features, textFeatures, geometries) {

    var leftIndex = {},
        rightIndex = {},
        mergedFeatures = [],
        mergedGeom = [],
        mergedTexts = [],
        mergedIndex = 0,
        k;

    function add(k) {
        mergedFeatures.push(features[k]);
        mergedGeom.push(geometries[k]);
        mergedTexts.push(textFeatures[k]);
        mergedIndex++;
    }

    function mergeFromRight(leftKey, rightKey, geom) {
        var i = rightIndex[leftKey];
        delete rightIndex[leftKey];
        rightIndex[rightKey] = i;

        mergedGeom[i][0].pop();
        mergedGeom[i][0] = mergedGeom[i][0].concat(geom[0]);
        return i;
    }

    function mergeFromLeft(leftKey, rightKey, geom) {
        var i = leftIndex[rightKey];
        delete leftIndex[rightKey];
        leftIndex[leftKey] = i;

        mergedGeom[i][0].shift();
        mergedGeom[i][0] = geom[0].concat(mergedGeom[i][0]);
        return i;
    }

    function getKey(text, geom, onRight) {
        var point = onRight ? geom[0][geom[0].length - 1] : geom[0][0];
        return text + ':' + point.x + ':' + point.y;
    }

    for (k = 0; k < features.length; k++) {
        var geom = geometries[k],
            text = textFeatures[k];

        if (!text) {
            add(k);
            continue;
        }

        var leftKey = getKey(text, geom),
            rightKey = getKey(text, geom, true);

        if ((leftKey in rightIndex) && (rightKey in leftIndex) && (rightIndex[leftKey] !== leftIndex[rightKey])) {
            // found lines with the same text adjacent to both ends of the current line, merge all three
            var j = mergeFromLeft(leftKey, rightKey, geom);
            var i = mergeFromRight(leftKey, rightKey, mergedGeom[j]);

            delete leftIndex[leftKey];
            delete rightIndex[rightKey];

            rightIndex[getKey(text, mergedGeom[i], true)] = i;
            mergedGeom[j] = null;

        } else if (leftKey in rightIndex) {
            // found mergeable line adjacent to the start of the current line, merge
            mergeFromRight(leftKey, rightKey, geom);

        } else if (rightKey in leftIndex) {
            // found mergeable line adjacent to the end of the current line, merge
            mergeFromLeft(leftKey, rightKey, geom);

        } else {
            // no adjacent lines, add as a new item
            add(k);
            leftIndex[leftKey] = mergedIndex - 1;
            rightIndex[rightKey] = mergedIndex - 1;
        }
    }

    return {
        features: mergedFeatures,
        textFeatures: mergedTexts,
        geometries: mergedGeom
    };
};

},{}],79:[function(require,module,exports){
'use strict';

var Point = require('point-geometry');
var Anchor = require('../symbol/anchor');

module.exports = {
    getIconQuads: getIconQuads,
    getGlyphQuads: getGlyphQuads
};

var minScale = 0.5; // underscale by 1 zoom level

function SymbolQuad(anchor, tl, tr, bl, br, tex, angle, minScale, maxScale) {
    this.anchor = anchor;
    this.tl = tl;
    this.tr = tr;
    this.bl = bl;
    this.br = br;
    this.tex = tex;
    this.angle = angle;
    this.minScale = minScale;
    this.maxScale = maxScale;
}

function getIconQuads(anchor, shapedIcon, boxScale, line, layout, alongLine) {

    var rect = shapedIcon.image.rect;

    var border = 1;
    var left = shapedIcon.left - border;
    var right = left + rect.w;
    var top = shapedIcon.top - border;
    var bottom = top + rect.h;
    var tl = new Point(left, top);
    var tr = new Point(right, top);
    var br = new Point(right, bottom);
    var bl = new Point(left, bottom);

    var angle = layout['icon-rotate'] * Math.PI / 180;
    if (alongLine) {
        var prev = line[anchor.segment];
        angle += Math.atan2(anchor.y - prev.y, anchor.x - prev.x);
    }

    if (angle) {
        var sin = Math.sin(angle),
            cos = Math.cos(angle),
            matrix = [cos, -sin, sin, cos];

        tl = tl.matMult(matrix);
        tr = tr.matMult(matrix);
        bl = bl.matMult(matrix);
        br = br.matMult(matrix);
    }

    return [new SymbolQuad(anchor, tl, tr, bl, br, shapedIcon.image.rect, 0, minScale, Infinity)];
}

function getGlyphQuads(anchor, shaping, boxScale, line, layout, alongLine) {

    var textRotate = layout['text-rotate'] * Math.PI / 180;
    var keepUpright = layout['text-keep-upright'];

    var positionedGlyphs = shaping.positionedGlyphs;
    var quads = [];

    for (var k = 0; k < positionedGlyphs.length; k++) {
        var positionedGlyph = positionedGlyphs[k];
        var glyph = positionedGlyph.glyph;
        var rect = glyph.rect;

        if (!rect) continue;

        var centerX = (positionedGlyph.x + glyph.advance / 2) * boxScale;

        var glyphInstances;
        var labelMinScale = minScale;
        if (alongLine) {
            glyphInstances = [];
            labelMinScale = getSegmentGlyphs(glyphInstances, anchor, centerX, line, anchor.segment, 1);
            if (keepUpright) {
                labelMinScale = Math.min(labelMinScale, getSegmentGlyphs(glyphInstances, anchor, centerX, line, anchor.segment, -1));
            }

        } else {
            glyphInstances = [{
                anchor: anchor,
                offset: 0,
                angle: 0,
                maxScale: Infinity,
                minScale: minScale
            }];
        }

        var x1 = positionedGlyph.x + glyph.left,
            y1 = positionedGlyph.y - glyph.top,
            x2 = x1 + rect.w,
            y2 = y1 + rect.h,

            otl = new Point(x1, y1),
            otr = new Point(x2, y1),
            obl = new Point(x1, y2),
            obr = new Point(x2, y2);

        for (var i = 0; i < glyphInstances.length; i++) {

            var instance = glyphInstances[i],
                tl = otl,
                tr = otr,
                bl = obl,
                br = obr,
                angle = instance.angle + textRotate;

            if (angle) {
                var sin = Math.sin(angle),
                    cos = Math.cos(angle),
                    matrix = [cos, -sin, sin, cos];

                tl = tl.matMult(matrix);
                tr = tr.matMult(matrix);
                bl = bl.matMult(matrix);
                br = br.matMult(matrix);
            }

            // Prevent label from extending past the end of the line
            var glyphMinScale = Math.max(instance.minScale, labelMinScale);

            var glyphAngle = (anchor.angle + textRotate + instance.offset + 2 * Math.PI) % (2 * Math.PI);
            quads.push(new SymbolQuad(instance.anchor, tl, tr, bl, br, rect, glyphAngle, glyphMinScale, instance.maxScale));

        }
    }

    return quads;
}

function getSegmentGlyphs(glyphs, anchor, offset, line, segment, direction) {
    var upsideDown = direction < 0;

    if (offset < 0) direction *= -1;

    if (direction > 0) segment++;

    var newAnchor = anchor;
    var end = line[segment];
    var prevScale = Infinity;

    offset = Math.abs(offset);

    var placementScale = minScale;

    while (true) {
        var distance = newAnchor.dist(end);
        var scale = offset / distance;

        // Get the angle of the line segment
        var angle = Math.atan2(end.y - newAnchor.y, end.x - newAnchor.x);
        if (direction < 0) angle += Math.PI;
        if (upsideDown) angle += Math.PI;

        glyphs.push({
            anchor: new Anchor(newAnchor.x, newAnchor.y, anchor.angle),
            offset: upsideDown ? Math.PI : 0,
            minScale: scale,
            maxScale: prevScale,
            angle: (angle + 2 * Math.PI) % (2 * Math.PI)
        });

        if (scale <= placementScale) break;

        newAnchor = end;

        // skip duplicate nodes
        while (newAnchor.equals(end)) {
            segment += direction;
            end = line[segment];
            if (!end) {
                return scale;
            }
        }

        var unit = end.sub(newAnchor)._unit();
        newAnchor = newAnchor.sub(unit._mult(distance));

        prevScale = scale;
    }

    return placementScale;
}

},{"../symbol/anchor":68,"point-geometry":124}],80:[function(require,module,exports){
'use strict';

var resolveTokens = require('../util/token');

module.exports = resolveIcons;

// For an array of features determine what icons need to be loaded.
function resolveIcons(features, layoutProperties) {
    var icons = [];

    for (var i = 0, fl = features.length; i < fl; i++) {
        var text = resolveTokens(features[i].properties, layoutProperties['icon-image']);
        if (!text) continue;

        if (icons.indexOf(text) < 0) {
            icons.push(text);
        }
    }

    return icons;
}

},{"../util/token":106}],81:[function(require,module,exports){
'use strict';

var resolveTokens = require('../util/token');

module.exports = resolveText;

/**
 * For an array of features determine what glyph ranges need to be loaded
 * and apply any text preprocessing. The remaining users of text should
 * use the `textFeatures` key returned by this function rather than accessing
 * feature text directly.
 * @private
 */
function resolveText(features, layoutProperties, glyphs) {
    var textFeatures = [];
    var codepoints = [];

    for (var i = 0, fl = features.length; i < fl; i++) {
        var text = resolveTokens(features[i].properties, layoutProperties['text-field']);
        if (!text) {
            textFeatures[i] = null;
            continue;
        }
        text = text.toString();

        var transform = layoutProperties['text-transform'];
        if (transform === 'uppercase') {
            text = text.toLocaleUpperCase();
        } else if (transform === 'lowercase') {
            text = text.toLocaleLowerCase();
        }

        for (var j = 0, jl = text.length; j < jl; j++) {
            codepoints.push(text.charCodeAt(j));
        }

        // Track indexes of features with text.
        textFeatures[i] = text;
    }

    // get a list of unique codepoints we are missing
    codepoints = uniq(codepoints, glyphs);

    return {
        textFeatures: textFeatures,
        codepoints: codepoints
    };
}

function uniq(ids, alreadyHave) {
    var u = [];
    var last;
    ids.sort(sortNumbers);
    for (var i = 0; i < ids.length; i++) {
        if (ids[i] !== last) {
            last = ids[i];
            if (!alreadyHave[last]) u.push(ids[i]);
        }
    }
    return u;
}

function sortNumbers(a, b) {
    return a - b;
}

},{"../util/token":106}],82:[function(require,module,exports){
'use strict';

module.exports = {
    shapeText: shapeText,
    shapeIcon: shapeIcon
};


// The position of a glyph relative to the text's anchor point.
function PositionedGlyph(codePoint, x, y, glyph) {
    this.codePoint = codePoint;
    this.x = x;
    this.y = y;
    this.glyph = glyph;
}

// A collection of positioned glyphs and some metadata
function Shaping(positionedGlyphs, top, bottom, left, right) {
    this.positionedGlyphs = positionedGlyphs;
    this.top = top;
    this.bottom = bottom;
    this.left = left;
    this.right = right;
}

function shapeText(text, glyphs, maxWidth, lineHeight, horizontalAlign, verticalAlign, justify, spacing, translate) {

    var positionedGlyphs = [];
    var shaping = new Shaping(positionedGlyphs, translate[1], translate[1], translate[0], translate[0]);

    // the y offset *should* be part of the font metadata
    var yOffset = -17;

    var x = translate[0];
    var y = translate[1] + yOffset;

    for (var i = 0; i < text.length; i++) {
        var codePoint = text.charCodeAt(i);
        var glyph = glyphs[codePoint];

        if (!glyph) continue;

        positionedGlyphs.push(new PositionedGlyph(codePoint, x, y, glyph));
        x += glyph.advance + spacing;
    }

    if (!positionedGlyphs.length) return false;

    linewrap(shaping, glyphs, lineHeight, maxWidth, horizontalAlign, verticalAlign, justify);

    return shaping;
}

var breakable = { 32: true }; // Currently only breaks at regular spaces

function linewrap(shaping, glyphs, lineHeight, maxWidth, horizontalAlign, verticalAlign, justify) {
    var lastSafeBreak = null;

    var lengthBeforeCurrentLine = 0;
    var lineStartIndex = 0;
    var line = 0;

    var maxLineLength = 0;

    var positionedGlyphs = shaping.positionedGlyphs;

    if (maxWidth) {
        for (var i = 0; i < positionedGlyphs.length; i++) {
            var positionedGlyph = positionedGlyphs[i];

            positionedGlyph.x -= lengthBeforeCurrentLine;
            positionedGlyph.y += lineHeight * line;

            if (positionedGlyph.x > maxWidth && lastSafeBreak !== null) {

                var lineLength = positionedGlyphs[lastSafeBreak + 1].x;
                maxLineLength = Math.max(lineLength, maxLineLength);

                for (var k = lastSafeBreak + 1; k <= i; k++) {
                    positionedGlyphs[k].y += lineHeight;
                    positionedGlyphs[k].x -= lineLength;
                }

                if (justify) {
                    justifyLine(positionedGlyphs, glyphs, lineStartIndex, lastSafeBreak - 1, justify);
                }

                lineStartIndex = lastSafeBreak + 1;
                lastSafeBreak = null;
                lengthBeforeCurrentLine += lineLength;
                line++;
            }

            if (breakable[positionedGlyph.codePoint]) {
                lastSafeBreak = i;
            }
        }
    }

    var lastPositionedGlyph = positionedGlyphs[positionedGlyphs.length - 1];
    var lastLineLength = lastPositionedGlyph.x + glyphs[lastPositionedGlyph.codePoint].advance;
    maxLineLength = Math.max(maxLineLength, lastLineLength);

    var height = (line + 1) * lineHeight;

    justifyLine(positionedGlyphs, glyphs, lineStartIndex, positionedGlyphs.length - 1, justify);
    align(positionedGlyphs, justify, horizontalAlign, verticalAlign, maxLineLength, lineHeight, line);

    // Calculate the bounding box
    shaping.top += -verticalAlign * height;
    shaping.bottom = shaping.top + height;
    shaping.left += -horizontalAlign * maxLineLength;
    shaping.right = shaping.left + maxLineLength;
}

function justifyLine(positionedGlyphs, glyphs, start, end, justify) {
    var lastAdvance = glyphs[positionedGlyphs[end].codePoint].advance;
    var lineIndent = (positionedGlyphs[end].x + lastAdvance) * justify;

    for (var j = start; j <= end; j++) {
        positionedGlyphs[j].x -= lineIndent;
    }

}

function align(positionedGlyphs, justify, horizontalAlign, verticalAlign, maxLineLength, lineHeight, line) {
    var shiftX = (justify - horizontalAlign) * maxLineLength;
    var shiftY = (-verticalAlign * (line + 1) + 0.5) * lineHeight;

    for (var j = 0; j < positionedGlyphs.length; j++) {
        positionedGlyphs[j].x += shiftX;
        positionedGlyphs[j].y += shiftY;
    }
}


function shapeIcon(image, layout) {
    if (!image || !image.rect) return null;

    var dx = layout['icon-offset'][0];
    var dy = layout['icon-offset'][1];
    var x1 = dx - image.width / 2;
    var x2 = x1 + image.width;
    var y1 = dy - image.height / 2;
    var y2 = y1 + image.height;

    return new PositionedIcon(image, y1, y2, x1, x2);
}

function PositionedIcon(image, top, bottom, left, right) {
    this.image = image;
    this.top = top;
    this.bottom = bottom;
    this.left = left;
    this.right = right;
}

},{}],83:[function(require,module,exports){
'use strict';

var BinPack = require('./bin_pack');

module.exports = SpriteAtlas;
function SpriteAtlas(width, height) {
    this.width = width;
    this.height = height;

    this.bin = new BinPack(width, height);
    this.images = {};
    this.data = false;
    this.texture = 0; // WebGL ID
    this.filter = 0; // WebGL ID
    this.pixelRatio = 1;
    this.dirty = true;
}

SpriteAtlas.prototype = {
    get debug() {
        return 'canvas' in this;
    },
    set debug(value) {
        if (value && !this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.width = this.width * this.pixelRatio;
            this.canvas.height = this.height * this.pixelRatio;
            this.canvas.style.width = this.width + 'px';
            this.canvas.style.width = this.width + 'px';
            document.body.appendChild(this.canvas);
            this.ctx = this.canvas.getContext('2d');
        } else if (!value && this.canvas) {
            this.canvas.parentNode.removeChild(this.canvas);
            delete this.ctx;
            delete this.canvas;
        }
    }
};

SpriteAtlas.prototype.resize = function(newRatio) {
    if (this.pixelRatio === newRatio) return false;

    var oldRatio = this.pixelRatio;
    this.pixelRatio = newRatio;

    if (this.canvas) {
        this.canvas.width = this.width * this.pixelRatio;
        this.canvas.height = this.height * this.pixelRatio;
    }

    if (this.data) {
        var oldData = this.data;

        this.data = false;
        this.allocate();
        this.texture = false;

        var oldWidth = this.width * oldRatio;
        var oldHeight = this.height * oldRatio;
        var newWidth = this.width * newRatio;
        var newHeight = this.height * newRatio;

        // Basic image scaling. TODO: Replace this with better image scaling.
        var newImage = this.data;
        var oldImage = oldData;

        for (var y = 0; y < newHeight; y++) {
            var oldYOffset = Math.floor((y * oldHeight) / newHeight) * oldWidth;
            var newYOffset = y * newWidth;
            for (var x = 0; x < newWidth; x++) {
                var oldX = Math.floor((x * oldWidth) / newWidth);
                newImage[newYOffset + x] = oldImage[oldYOffset + oldX];
            }
        }

        oldData = null;
        this.dirty = true;
    }

    return this.dirty;
};

function copyBitmap(src, srcStride, srcX, srcY, dst, dstStride, dstX, dstY, width, height, wrap) {
    var srcI = srcY * srcStride + srcX;
    var dstI = dstY * dstStride + dstX;
    var x, y;

    if (wrap) {
        // add 1 pixel wrapped padding on each side of the image
        dstI -= dstStride;
        for (y = -1; y <= height; y++, srcI = ((y + height) % height + srcY) * srcStride + srcX, dstI += dstStride) {
            for (x = -1; x <= width; x++) {
                dst[dstI + x] = src[srcI + ((x + width) % width)];
            }
        }

    } else {
        for (y = 0; y < height; y++, srcI += srcStride, dstI += dstStride) {
            for (x = 0; x < width; x++) {
                dst[dstI + x] = src[srcI + x];
            }
        }
    }
}

SpriteAtlas.prototype.allocateImage = function(pixelWidth, pixelHeight) {

    // Increase to next number divisible by 4, but at least 1.
    // This is so we can scale down the texture coordinates and pack them
    // into 2 bytes rather than 4 bytes.
    // Pad icons to prevent them from polluting neighbours during linear interpolation
    var padding = 2;
    var packWidth = pixelWidth + padding + (4 - (pixelWidth + padding) % 4);
    var packHeight = pixelHeight + padding + (4 - (pixelHeight + padding) % 4);// + 4;

    // We have to allocate a new area in the bin, and store an empty image in it.
    // Add a 1px border around every image.
    var rect = this.bin.allocate(packWidth, packHeight);
    if (rect.w === 0) {
        return rect;
    }

    rect.originalWidth = pixelWidth;
    rect.originalHeight = pixelHeight;

    return rect;
};

SpriteAtlas.prototype.getImage = function(name, wrap) {
    if (this.images[name]) {
        return this.images[name];
    }

    if (!this.sprite) {
        return null;
    }

    var pos = this.sprite.getSpritePosition(name);
    if (!pos.width || !pos.height) {
        return null;
    }

    var width = pos.width / pos.pixelRatio;
    var height = pos.height / pos.pixelRatio;
    var rect = this.allocateImage(width, height);
    if (rect.w === 0) {
        return rect;
    }

    var image = new AtlasImage(rect, width, height, pos.sdf);
    this.images[name] = image;

    this.copy(rect, pos, wrap);

    return image;
};


SpriteAtlas.prototype.getPosition = function(name, repeating) {
    var image = this.getImage(name, repeating);
    var rect = image && image.rect;

    if (!rect) {
        return null;
    }

    // When the image is repeating, get the correct position of the image, rather than the
    // one rounded up to 4 pixels.
    var width = repeating ? image.width : rect.w;
    var height = repeating ? image.height : rect.h;
    var padding = 1;

    return {
        size: [width, height],
        tl: [(rect.x + padding)         / this.width, (rect.y + padding)          / this.height],
        br: [(rect.x + padding + width) / this.width, (rect.y + padding + height) / this.height]
    };
};


SpriteAtlas.prototype.allocate = function() {
    if (!this.data) {
        var w = Math.floor(this.width * this.pixelRatio);
        var h = Math.floor(this.height * this.pixelRatio);
        this.data = new Uint32Array(w * h);
        for (var i = 0; i < this.data.length; i++) {
            this.data[i] = 0;
        }
    }
};


SpriteAtlas.prototype.copy = function(dst, src, wrap) {
    // if (!sprite->raster) return;
    if (!this.sprite.img.data) return;
    var srcImg = new Uint32Array(this.sprite.img.data.buffer);

    this.allocate();
    var dstImg = this.data;

    var padding = 1;

    copyBitmap(
        /* source buffer */  srcImg,
        /* source stride */  this.sprite.img.width,
        /* source x */       src.x,
        /* source y */       src.y,
        /* dest buffer */    dstImg,
        /* dest stride */    this.width * this.pixelRatio,
        /* dest x */         (dst.x + padding) * this.pixelRatio,
        /* dest y */         (dst.y + padding) * this.pixelRatio,
        /* icon dimension */ src.width,
        /* icon dimension */ src.height,
        /* wrap */ wrap
    );

    this.dirty = true;
};

SpriteAtlas.prototype.setSprite = function(sprite) {
    this.sprite = sprite;
};

SpriteAtlas.prototype.addIcons = function(icons, callback) {
    for (var i = 0; i < icons.length; i++) {
        this.getImage(icons[i]);
    }

    callback(null, this.images);
};

SpriteAtlas.prototype.bind = function(gl, linear) {
    var first = false;
    if (!this.texture) {
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        first = true;
    } else {
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
    }

    var filterVal = linear ? gl.LINEAR : gl.NEAREST;
    if (filterVal !== this.filter) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filterVal);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filterVal);
        this.filter = filterVal;
    }

    if (this.dirty) {
        this.allocate();

        if (first) {
            gl.texImage2D(
                gl.TEXTURE_2D, // enum target
                0, // ind level
                gl.RGBA, // ind internalformat
                this.width * this.pixelRatio, // GLsizei width
                this.height * this.pixelRatio, // GLsizei height
                0, // ind border
                gl.RGBA, // enum format
                gl.UNSIGNED_BYTE, // enum type
                new Uint8Array(this.data.buffer) // Object data
            );
        } else {
            gl.texSubImage2D(
                gl.TEXTURE_2D, // enum target
                0, // int level
                0, // int xoffset
                0, // int yoffset
                this.width * this.pixelRatio, // long width
                this.height * this.pixelRatio, // long height
                gl.RGBA, // enum format
                gl.UNSIGNED_BYTE, // enum type
                new Uint8Array(this.data.buffer) // Object pixels
            );
        }

        this.dirty = false;

        // DEBUG
        if (this.ctx) {
            var data = this.ctx.getImageData(0, 0, this.width * this.pixelRatio, this.height * this.pixelRatio);
            data.data.set(new Uint8ClampedArray(this.data.buffer));
            this.ctx.putImageData(data, 0, 0);

            this.ctx.strokeStyle = 'red';
            for (var k = 0; k < this.bin.free.length; k++) {
                var free = this.bin.free[k];
                this.ctx.strokeRect(free.x * this.pixelRatio, free.y * this.pixelRatio, free.w * this.pixelRatio, free.h * this.pixelRatio);
            }
        }
        // END DEBUG
    }
};

function AtlasImage(rect, width, height, sdf) {
    this.rect = rect;
    this.width = width;
    this.height = height;
    this.sdf = sdf;
}

},{"./bin_pack":69}],84:[function(require,module,exports){
'use strict';

var Canvas = require('../util/canvas');
var util = require('../util/util');
var browser = require('../util/browser');
var Evented = require('../util/evented');
var DOM = require('../util/dom');

var Style = require('../style/style');
var AnimationLoop = require('../style/animation_loop');
var GLPainter = require('../render/painter');

var Transform = require('../geo/transform');
var Hash = require('./hash');
var Handlers = require('./handlers');
var Camera = require('./camera');
var LatLng = require('../geo/lat_lng');
var LatLngBounds = require('../geo/lat_lng_bounds');
var Point = require('point-geometry');
var Attribution = require('./control/attribution');

/**
 * Creates a map instance.
 * @class Map
 * @param {Object} options
 * @param {String} options.container HTML element to initialize the map in (or element id as string)
 * @param {Number} [options.minZoom=0] Minimum zoom of the map
 * @param {Number} [options.maxZoom=20] Maximum zoom of the map
 * @param {Object} options.style Map style and data source definition (either a JSON object or a JSON URL), described in the [style reference](https://mapbox.com/mapbox-gl-style-spec/)
 * @param {Boolean} [options.hash=false] If `true`, the map will track and update the page URL according to map position
 * @param {Boolean} [options.interactive=true] If `false`, no mouse, touch, or keyboard listeners are attached to the map, so it will not respond to input
 * @param {Array} options.classes Style class names with which to initialize the map
 * @param {Boolean} [options.failIfMajorPerformanceCaveat=false] If `true`, map creation will fail if the implementation determines that the performance of the created WebGL context would be dramatically lower than expected.
 * @param {Boolean} [options.preserveDrawingBuffer=false] If `true`, The maps canvas can be exported to a PNG using `map.getCanvas().toDataURL();`. This is false by default as a performance optimization.
 * @example
 * var map = new mapboxgl.Map({
 *   container: 'map',
 *   center: [37.772537, -122.420679],
 *   zoom: 13,
 *   style: style_object,
 *   hash: true
 * });
 */
var Map = module.exports = function(options) {
    options = this.options = util.inherit(this.options, options);

    this.animationLoop = new AnimationLoop();
    this.transform = new Transform(options.minZoom, options.maxZoom);

    if (options.maxBounds) {
        var b = LatLngBounds.convert(options.maxBounds);
        this.transform.latRange = [b.getSouth(), b.getNorth()];
        this.transform.lngRange = [b.getWest(), b.getEast()];
    }

    util.bindAll([
        '_forwardStyleEvent',
        '_forwardSourceEvent',
        '_forwardLayerEvent',
        '_forwardTileEvent',
        '_onStyleLoad',
        '_onStyleChange',
        '_onSourceAdd',
        '_onSourceRemove',
        '_onSourceUpdate',
        'update',
        'render'
    ], this);

    this._setupContainer();
    this._setupPainter();

    this.on('move', this.update);
    this.on('zoom', this.update.bind(this, true));
    this.on('moveend', function() {
        this.animationLoop.set(300); // text fading
        this._rerender();
    }.bind(this));

    this.handlers = options.interactive && new Handlers(this);

    this._hash = options.hash && (new Hash()).addTo(this);
    // don't set position from options if set through hash
    if (!this._hash || !this._hash._onHashChange()) {
        this.jumpTo(options);
    }

    this.sources = {};
    this.stacks = {};
    this._classes = {};

    this.resize();

    if (options.classes) this.setClasses(options.classes);
    if (options.style) this.setStyle(options.style);
    if (options.attributionControl) this.addControl(new Attribution());
};

util.extend(Map.prototype, Evented);
util.extend(Map.prototype, Camera.prototype);
util.extend(Map.prototype, /** @lends Map.prototype */{

    options: {
        center: [0, 0],
        zoom: 0,
        bearing: 0,
        pitch: 0,

        minZoom: 0,
        maxZoom: 20,

        interactive: true,
        hash: false,

        attributionControl: true,

        failIfMajorPerformanceCaveat: false,
        preserveDrawingBuffer: false
    },

    addControl: function(control) {
        control.addTo(this);
        return this;
    },

    /**
     * @typedef {Object} [styleOptions]
     * @param {Boolean} [styleOptions.transition=true]
     */

    /**
     * Adds a style class to a map
     *
     * @param {string} klass name of style class
     * @param {styleOptions} options
     * @fires change
     * @returns {Map} `this`
     */
    addClass: function(klass, options) {
        if (this._classes[klass]) return;
        this._classes[klass] = true;
        if (this.style) this.style._cascade(this._classes, options);
    },

    /**
     * Removes a style class from a map
     *
     * @param {string} klass name of style class
     * @param {styleOptions} options
     * @fires change
     * @returns {Map} `this`
     */
    removeClass: function(klass, options) {
        if (!this._classes[klass]) return;
        delete this._classes[klass];
        if (this.style) this.style._cascade(this._classes, options);
    },

    /**
     * Helper method to add more than one class
     *
     * @param {Array<string>} klasses An array of class names
     * @param {styleOptions} options
     * @fires change
     * @returns {Map} `this`
     */
    setClasses: function(klasses, options) {
        this._classes = {};
        for (var i = 0; i < klasses.length; i++) {
            this._classes[klasses[i]] = true;
        }
        if (this.style) this.style._cascade(this._classes, options);
    },

    /**
     * Check whether a style class is active
     *
     * @param {string} klass Name of style class
     * @returns {boolean}
     */
    hasClass: function(klass) {
        return !!this._classes[klass];
    },

    /**
     * Return an array of the current active style classes
     *
     * @returns {boolean}
     */
    getClasses: function() {
        return Object.keys(this._classes);
    },

    /**
     * Detect the map's new width and height and resize it.
     *
     * @returns {Map} `this`
     */
    resize: function() {
        var width = 0, height = 0;

        if (this._container) {
            width = this._container.offsetWidth || 400;
            height = this._container.offsetHeight || 300;
        }

        this._canvas.resize(width, height);

        this.transform.width = width;
        this.transform.height = height;
        this.transform._constrain();

        this.painter.resize(width, height);

        return this
            .fire('movestart')
            .fire('move')
            .fire('resize')
            .fire('moveend');
    },

    /**
     * Get the map's geographical bounds
     *
     * @returns {LatLngBounds}
     */
    getBounds: function() {
        return new LatLngBounds(
            this.transform.pointLocation(new Point(0, 0)),
            this.transform.pointLocation(this.transform.size));
    },

    /**
     * Get pixel coordinates (relative to map container) given a geographical location
     *
     * @param {LatLng} latlng
     * @returns {Object} `x` and `y` coordinates
     */
    project: function(latlng) {
        return this.transform.locationPoint(LatLng.convert(latlng));
    },

    /**
     * Get geographical coordinates given pixel coordinates
     *
     * @param {Array<number>} point [x, y] pixel coordinates
     * @returns {LatLng}
     */
    unproject: function(point) {
        return this.transform.pointLocation(Point.convert(point));
    },

    /**
     * Get all features at a point ([x, y])
     *
     * @param {Array<number>} point [x, y] pixel coordinates
     * @param {Object} params
     * @param {number} [params.radius=0] Optional. Radius in pixels to search in
     * @param {string} params.layer Optional. Only return features from a given layer
     * @param {string} params.type Optional. Either `raster` or `vector`
     * @param {featuresAtCallback} callback function that returns the response
     *
     * @callback featuresAtCallback
     * @param {Object|null} err Error _If any_
     * @param {Array} features Displays a JSON array of features given the passed parameters of `featuresAt`
     *
     * @returns {Map} `this`
     *
     * @example
     * map.featuresAt([10, 20], { radius: 10 }, function(err, features) {
     *   console.log(features);
     * });
     */
    featuresAt: function(point, params, callback) {
        var coord = this.transform.pointCoordinate(Point.convert(point));
        this.style.featuresAt(coord, params, callback);
        return this;
    },

    /**
     * Replaces the map's style object
     *
     * @param {Object} style A style object formatted as JSON
     * @returns {Map} `this`
     */
    setStyle: function(style) {
        if (this.style) {
            this.style
                .off('load', this._onStyleLoad)
                .off('error', this._forwardStyleEvent)
                .off('change', this._onStyleChange)
                .off('source.add', this._onSourceAdd)
                .off('source.remove', this._onSourceRemove)
                .off('source.load', this._onSourceUpdate)
                .off('source.error', this._forwardSourceEvent)
                .off('source.change', this._onSourceUpdate)
                .off('layer.add', this._forwardLayerEvent)
                .off('layer.remove', this._forwardLayerEvent)
                .off('tile.add', this._forwardTileEvent)
                .off('tile.remove', this._forwardTileEvent)
                .off('tile.load', this.update)
                .off('tile.error', this._forwardTileEvent)
                ._remove();

            this.off('rotate', this.style._redoPlacement);
            this.off('pitch', this.style._redoPlacement);
        }

        if (!style) {
            this.style = null;
            return this;
        } else if (style instanceof Style) {
            this.style = style;
        } else {
            this.style = new Style(style, this.animationLoop);
        }

        this.style
            .on('load', this._onStyleLoad)
            .on('error', this._forwardStyleEvent)
            .on('change', this._onStyleChange)
            .on('source.add', this._onSourceAdd)
            .on('source.remove', this._onSourceRemove)
            .on('source.load', this._onSourceUpdate)
            .on('source.error', this._forwardSourceEvent)
            .on('source.change', this._onSourceUpdate)
            .on('layer.add', this._forwardLayerEvent)
            .on('layer.remove', this._forwardLayerEvent)
            .on('tile.add', this._forwardTileEvent)
            .on('tile.remove', this._forwardTileEvent)
            .on('tile.load', this.update)
            .on('tile.error', this._forwardTileEvent);

        this.on('rotate', this.style._redoPlacement);
        this.on('pitch', this.style._redoPlacement);

        return this;
    },

    /**
     * Add a source to the map style.
     *
     * @param {string} id ID of the source. Must not be used by any existing source.
     * @param {Object} source source specification, following the
     * [Mapbox GL Style Reference](https://www.mapbox.com/mapbox-gl-style-spec/#sources)
     * @fires source.add
     * @returns {Map} `this`
     */
    addSource: function(id, source) {
        this.style.addSource(id, source);
        return this;
    },

    /**
     * Remove an existing source from the map style.
     *
     * @param {string} id ID of the source to remove
     * @fires source.remove
     * @returns {Map} `this`
     */
    removeSource: function(id) {
        this.style.removeSource(id);
        return this;
    },

    /**
     * Return the style source object with the given `id`.
     *
     * @param {string} id source ID
     * @returns {Object}
     */
    getSource: function(id) {
        return this.style.getSource(id);
    },

    /**
     * Add a layer to the map style. The layer will be inserted before the layer with
     * ID `before`, or appended if `before` is omitted.
     * @param {StyleLayer|Object} layer
     * @param {string=} before  ID of an existing layer to insert before
     * @fires layer.add
     * @returns {Map} `this`
     */
    addLayer: function(layer, before) {
        this.style.addLayer(layer, before);
        this.style._cascade(this._classes);
        return this;
    },

    /**
     * Remove the layer with the given `id` from the map. Any layers which refer to the
     * specified layer via a `ref` property are also removed.
     *
     * @param {string} id layer id
     * @fires layer.remove
     * @returns {Map} this
     */
    removeLayer: function(id) {
        this.style.removeLayer(id);
        this.style._cascade(this._classes);
        return this;
    },

    /**
     * Set the filter for a given style layer.
     *
     * @param {string} layer ID of a layer
     * @param {Array} filter filter specification, as defined in the [Style Specification](https://www.mapbox.com/mapbox-gl-style-spec/#filter)
     * @returns {Map} `this`
     */
    setFilter: function(layer, filter) {
        this.style.setFilter(layer, filter);
        return this;
    },

    /**
     * Get the filter for a given style layer.
     *
     * @param {string} layer ID of a layer
     * @returns {Array} filter specification, as defined in the [Style Specification](https://www.mapbox.com/mapbox-gl-style-spec/#filter)
     */
    getFilter: function(layer) {
        return this.style.getFilter(layer);
    },

    /**
     * Set the value of a paint property in a given style layer.
     *
     * @param {string} layer ID of a layer
     * @param {string} name name of a paint property
     * @param {*} value value for the paint propery; must have the type appropriate for the property as defined in the [Style Specification](https://www.mapbox.com/mapbox-gl-style-spec/)
     * @param {string=} klass optional class specifier for the property
     * @returns {Map} `this`
     */
    setPaintProperty: function(layer, name, value, klass) {
        this.style.setPaintProperty(layer, name, value, klass);
        this.style._cascade(this._classes);
        this.update(true);
        return this;
    },

    /**
     * Get the value of a paint property in a given style layer.
     *
     * @param {string} layer ID of a layer
     * @param {string} name name of a paint property
     * @param {string=} klass optional class specifier for the property
     * @returns {*} value for the paint propery
     */
    getPaintProperty: function(layer, name, klass) {
        return this.style.getPaintProperty(layer, name, klass);
    },

    /**
     * Set the value of a layout property in a given style layer.
     *
     * @param {string} layer ID of a layer
     * @param {string} name name of a layout property
     * @param {*} value value for the layout propery; must have the type appropriate for the property as defined in the [Style Specification](https://www.mapbox.com/mapbox-gl-style-spec/)
     * @returns {Map} `this`
     */
    setLayoutProperty: function(layer, name, value) {
        this.style.setLayoutProperty(layer, name, value);
        return this;
    },

    /**
     * Get the value of a layout property in a given style layer.
     *
     * @param {string} layer ID of a layer
     * @param {string} name name of a layout property
     * @param {string=} klass optional class specifier for the property
     * @returns {*} value for the layout propery
     */
    getLayoutProperty: function(layer, name) {
        return this.style.getLayoutProperty(layer, name);
    },

    /**
     * Get the Map's container as an HTML element
     * @returns {HTMLElement} container
     */
    getContainer: function() {
        return this._container;
    },

    /**
     * Get the container for the map `canvas` element.
     *
     * If you want to add non-GL overlays to the map, you should append them to this element. This
     * is the element to which event bindings for map interactivity such as panning and zooming are
     * attached. It will receive bubbled events for child elements such as the `canvas`, but not for
     * map controls.
     *
     * @returns {HTMLElement} container
     */
    getCanvasContainer: function() {
        return this._canvasContainer;
    },

    /**
     * Get the Map's canvas as an HTML canvas
     * @returns {HTMLElement} canvas
     */
    getCanvas: function() {
        return this._canvas.getElement();
    },

    _setupContainer: function() {
        var id = this.options.container;

        var container = this._container = typeof id === 'string' ? document.getElementById(id) : id;
        container.classList.add('mapboxgl-map');

        var canvasContainer = this._canvasContainer = DOM.create('div', 'mapboxgl-canvas-container', container);
        if (this.options.interactive) {
            canvasContainer.classList.add('mapboxgl-interactive');
        }
        this._canvas = new Canvas(this, canvasContainer);

        var controlContainer = DOM.create('div', 'mapboxgl-control-container', container);
        var corners = this._controlCorners = {};
        ['top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach(function (pos) {
            corners[pos] = DOM.create('div', 'mapboxgl-ctrl-' + pos, controlContainer);
        });
    },

    _setupPainter: function() {
;
        var gl = this._canvas.getWebGLContext({
            failIfMajorPerformanceCaveat: this.options.failIfMajorPerformanceCaveat,
            preserveDrawingBuffer: this.options.preserveDrawingBuffer
        });

        if (!gl) {
            console.error('Failed to initialize WebGL');
            return;
        }

        this.painter = new GLPainter(gl, this.transform);
    },

    _contextLost: function(event) {
        event.preventDefault();
        if (this._frameId) {
            browser.cancelFrame(this._frameId);
        }
    },

    _contextRestored: function() {
        this._setupPainter();
        this.resize();
        this.update();
    },

    /**
     * Is this map fully loaded? If the style isn't loaded
     * or it has a change to the sources or style that isn't
     * propagated to its style, return false.
     *
     * @returns {boolean} whether the map is loaded
     */
    loaded: function() {
        if (this._styleDirty || this._sourcesDirty)
            return false;
        if (this.style && !this.style.loaded())
            return false;
        return true;
    },

    /**
     * Update this map's style and re-render the map.
     *
     * @param {Object} updateStyle new style
     * @returns {Map} this
     */
    update: function(updateStyle) {
        if (!this.style) return this;

        this._styleDirty = this._styleDirty || updateStyle;
        this._sourcesDirty = true;

        this._rerender();

        return this;
    },

    /**
     * Call when a (re-)render of the map is required, e.g. when the
     * user panned or zoomed,f or new data is available.
     * @returns {Map} this
     */
    render: function() {
        if (this.style && this._styleDirty) {
            this._styleDirty = false;
            this.style._recalculate(this.transform.zoom);
        }

        if (this.style && this._sourcesDirty && !this._sourcesDirtyTimeout) {
            this._sourcesDirty = false;
            this._sourcesDirtyTimeout = setTimeout(function() {
                this._sourcesDirtyTimeout = null;
            }.bind(this), 50);
            this.style._updateSources(this.transform);
        }

        this.painter.render(this.style, {
            debug: this.debug,
            vertices: this.vertices,
            rotating: this.rotating,
            zooming: this.zooming
        });

        this.fire('render');

        if (this.loaded() && !this._loaded) {
            this._loaded = true;
            this.fire('load');
        }

        this._frameId = null;

        if (!this.animationLoop.stopped()) {
            this._styleDirty = true;
        }

        if (this._sourcesDirty || this._repaint || !this.animationLoop.stopped()) {
            this._rerender();
        }

        return this;
    },

    /**
     * Destroys the map's underlying resources, including web workers.
     * @returns {Map} this
     */
    remove: function() {
        if (this._hash) this._hash.remove();
        browser.cancelFrame(this._frameId);
        clearTimeout(this._sourcesDirtyTimeout);
        this.setStyle(null);
        return this;
    },

    _rerender: function() {
        if (this.style && !this._frameId) {
            this._frameId = browser.frame(this.render);
        }
    },

    _forwardStyleEvent: function(e) {
        this.fire('style.' + e.type, util.extend({style: e.target}, e));
    },

    _forwardSourceEvent: function(e) {
        this.fire(e.type, util.extend({style: e.target}, e));
    },

    _forwardLayerEvent: function(e) {
        this.fire(e.type, util.extend({style: e.target}, e));
    },

    _forwardTileEvent: function(e) {
        this.fire(e.type, util.extend({style: e.target}, e));
    },

    _onStyleLoad: function(e) {
        this.style._cascade(this._classes, {transition: false});
        this._forwardStyleEvent(e);
    },

    _onStyleChange: function(e) {
        this.update(true);
        this._forwardStyleEvent(e);
    },

    _onSourceAdd: function(e) {
        var source = e.source;
        if (source.onAdd)
            source.onAdd(this);
        this._forwardSourceEvent(e);
    },

    _onSourceRemove: function(e) {
        var source = e.source;
        if (source.onRemove)
            source.onRemove(this);
        this._forwardSourceEvent(e);
    },

    _onSourceUpdate: function(e) {
        this.update();
        this._forwardSourceEvent(e);
    }
});

util.extendAll(Map.prototype, {

    /**
     * Enable debugging mode
     *
     * @name debug
     * @memberof Map
     * @type {boolean}
     */
    _debug: false,
    get debug() { return this._debug; },
    set debug(value) { this._debug = value; this.update(); },

    /**
     * Show collision boxes: useful for debugging label placement
     * in styles.
     *
     * @name collisionDebug
     * @memberof Map
     * @type {boolean}
     */
    _collisionDebug: false,
    get collisionDebug() { return this._collisionDebug; },
    set collisionDebug(value) {
        this._collisionDebug = value;
        for (var i in this.style.sources) {
            if (this.style.sources[i].reload) {
                this.style.sources[i].reload();
            }
        }
        this.update();
    },

    /**
     * Enable continuous repaint to analyze performance
     *
     * @name repaint
     * @memberof Map
     * @type {boolean}
     */
    _repaint: false,
    get repaint() { return this._repaint; },
    set repaint(value) { this._repaint = value; this.update(); },

    // show vertices
    _vertices: false,
    get vertices() { return this._vertices; },
    set vertices(value) { this._vertices = value; this.update(); }
});

},{"../geo/lat_lng":28,"../geo/lat_lng_bounds":29,"../geo/transform":30,"../render/painter":44,"../style/animation_loop":57,"../style/style":62,"../util/browser":96,"../util/canvas":97,"../util/dom":99,"../util/evented":101,"../util/util":107,"./camera":85,"./control/attribution":86,"./handlers":89,"./hash":90,"point-geometry":124}],85:[function(require,module,exports){
'use strict';

var util = require('../util/util');
var interpolate = require('../util/interpolate');
var browser = require('../util/browser');
var LatLng = require('../geo/lat_lng');
var LatLngBounds = require('../geo/lat_lng_bounds');
var Point = require('point-geometry');

/**
 * @typedef {Object} CameraOptions
 * @property {Array} [center] Latitude and longitude (passed as `[lat, lng]`)
 * @property {number} [zoom] Map zoom level
 * @property {number} [bearing] Map rotation bearing in degrees counter-clockwise from north
 * @property {number} [pitch] The angle at which the camera is looking at the ground
 */

/**
 * @typedef {Object} [AnimationOptions]
 * @property {number} [duration=500] Number in milliseconds
 * @property {Function} [easing]
 * @property {Array} [offset=[0,0]] point, origin of movement relative to map center
 * @property {boolean} [animate=true] When set to false, no animation happens
 */

var Camera = module.exports = function() {};

util.extend(Camera.prototype, /** @lends Map.prototype */{
    /**
     * Get the current view geographical point.
     * @returns {LatLng}
     */
    getCenter: function() { return this.transform.center; },

    /**
     * Sets a map location. Equivalent to `jumpTo({center: center})`.
     *
     * @param {Array} center Latitude and longitude (passed as `[lat, lng]`)
     * @fires movestart
     * @fires moveend
     * @returns {Map} `this`
     * @example
     * map.setCenter([-74, 38]);
     */
    setCenter: function(center) {
        this.jumpTo({center: center});
    },

    /**
     * Pan by a certain number of pixels
     *
     * @param {Array} offset [x, y]
     * @param {AnimationOptions}
     * @fires movestart
     * @fires moveend
     * @returns {this}
     */
    panBy: function(offset, options) {
        this.panTo(this.transform.center, util.extend({offset: Point.convert(offset).mult(-1)}, options));
        return this;
    },

    /**
     * Pan to a certain location with easing
     *
     * @param {Object} latlng a `LatLng` object
     * @param {AnimationOptions}
     * @fires movestart
     * @fires moveend
     * @returns {this}
     */
    panTo: function(latlng, options) {
        this.stop();

        latlng = LatLng.convert(latlng);

        options = util.extend({
            duration: 500,
            easing: util.ease,
            offset: [0, 0]
        }, options);

        var tr = this.transform,
            offset = Point.convert(options.offset).rotate(-tr.angle),
            from = tr.point,
            to = tr.project(latlng).sub(offset);

        if (!options.noMoveStart) {
            this.fire('movestart');
        }

        this._ease(function(k) {
            tr.center = tr.unproject(from.add(to.sub(from).mult(k)));
            this.fire('move');
        }, function() {
            this.fire('moveend');
        }, options);

        return this;
    },


    /**
     * Get the current zoom
     * @returns {number}
     */
    getZoom: function() { return this.transform.zoom; },

    /**
     * Sets a map zoom. Equivalent to `jumpTo({zoom: zoom})`.
     *
     * @param {number} zoom Map zoom level
     * @fires movestart
     * @fires moveend
     * @returns {Map} `this`
     * @example
     * // zoom the map to 5
     * map.setZoom(5);
     */
    setZoom: function(zoom) {
        this.jumpTo({zoom: zoom});
    },

    /**
     * Zooms to a certain zoom level with easing.
     *
     * @param {Number} zoom
     * @param {AnimationOptions}
     * @fires movestart
     * @fires moveend
     * @returns {this}
     */
    zoomTo: function(zoom, options) {
        this.stop();

        options = util.extend({
            duration: 500
        }, options);

        options.easing = this._updateEasing(options.duration, zoom, options.easing);

        var tr = this.transform,
            around = tr.center,
            startZoom = tr.zoom;

        if (options.around) {
            around = LatLng.convert(options.around);
        } else if (options.offset) {
            around = tr.pointLocation(tr.centerPoint.add(Point.convert(options.offset)));
        }

        if (options.animate === false) options.duration = 0;

        if (!this.zooming) {
            this.zooming = true;
            this.fire('movestart');
        }

        this._ease(function(k) {
            tr.setZoomAround(interpolate(startZoom, zoom, k), around);
            this.fire('move').fire('zoom');
        }, function() {
            this.ease = null;
            if (options.duration >= 200) {
                this.zooming = false;
                this.fire('moveend');
            }
        }, options);

        if (options.duration < 200) {
            clearTimeout(this._onZoomEnd);
            this._onZoomEnd = setTimeout(function() {
                this.zooming = false;
                this.fire('moveend');
            }.bind(this), 200);
        }

        return this;
    },

    /**
     * Zoom in by 1 level
     *
     * @param {AnimationOptions}
     * @fires movestart
     * @fires moveend
     * @returns {this}
     */
    zoomIn: function(options) {
        this.zoomTo(this.getZoom() + 1, options);
    },

    /**
     * Zoom out by 1 level
     *
     * @param {AnimationOptions}
     * @fires movestart
     * @fires moveend
     * @returns {this}
     */
    zoomOut: function(options) {
        this.zoomTo(this.getZoom() - 1, options);
    },


    /**
     * Get the current bearing in degrees
     * @returns {number}
     */
    getBearing: function() { return this.transform.bearing; },

    /**
     * Sets a map rotation. Equivalent to `jumpTo({bearing: bearing})`.
     *
     * @param {number} bearing Map rotation bearing in degrees counter-clockwise from north
     * @fires movestart
     * @fires moveend
     * @returns {Map} `this`
     * @example
     * // rotate the map to 90 degrees
     * map.setBearing(90);
     */
    setBearing: function(bearing) {
        this.jumpTo({bearing: bearing});
    },

    /**
     * Rotate bearing by a certain number of degrees with easing
     *
     * @param {Number} bearing
     * @param {AnimationOptions}
     * @fires movestart
     * @fires moveend
     * @returns {this}
     */
    rotateTo: function(bearing, options) {
        this.stop();

        options = util.extend({
            duration: 500,
            easing: util.ease
        }, options);

        var tr = this.transform,
            start = this.getBearing(),
            around = tr.center;

        if (options.around) {
            around = LatLng.convert(options.around);
        } else if (options.offset) {
            around = tr.pointLocation(tr.centerPoint.add(Point.convert(options.offset)));
        }

        bearing = this._normalizeBearing(bearing, start);

        this.rotating = true;
        this.fire('movestart');

        this._ease(function(k) {
            tr.setBearingAround(interpolate(start, bearing, k), around);
            this.fire('move').fire('rotate');
        }, function() {
            this.rotating = false;
            this.fire('moveend');
        }, options);

        return this;
    },

    /**
     * Sets map bearing to 0 (north) with easing
     *
     * @param {AnimationOptions}
     * @fires movestart
     * @fires moveend
     * @returns {this}
     */
    resetNorth: function(options) {
        return this.rotateTo(0, util.extend({duration: 1000}, options));
    },


    /**
     * Get the current angle in degrees
     * @returns {number}
     */
    getPitch: function() { return this.transform.pitch; },

    /**
     * Sets a map angle. Equivalent to `jumpTo({pitch: pitch})`.
     *
     * @param {number} pitch The angle at which the camera is looking at the ground
     * @fires movestart
     * @fires moveend
     * @returns {Map} `this`
     */
    setPitch: function(pitch) {
        this.jumpTo({pitch: pitch});
    },


    /**
     * Zoom to contain certain geographical bounds
     *
     * @param {Array} bounds [[minLat, minLng], [maxLat, maxLng]]
     * @param {Object} options
     * @param {Number} [options.speed=1.2] How fast animation occurs
     * @param {Number} [options.curve=1.42] How much zooming out occurs during animation
     * @param {Function} options.easing
     * @param {Number} options.padding how much padding there is around the given bounds on each side in pixels
     * @param {Number} options.maxZoom
     * @fires movestart
     * @fires moveend
     * @returns {this}
     */
    fitBounds: function(bounds, options) {

        options = util.extend({
            padding: 0,
            offset: [0, 0],
            maxZoom: Infinity
        }, options);

        bounds = LatLngBounds.convert(bounds);

        var offset = Point.convert(options.offset),
            tr = this.transform,
            nw = tr.project(bounds.getNorthWest()),
            se = tr.project(bounds.getSouthEast()),
            size = se.sub(nw),
            scaleX = (tr.width - options.padding * 2 - Math.abs(offset.x) * 2) / size.x,
            scaleY = (tr.height - options.padding * 2 - Math.abs(offset.y) * 2) / size.y;

        options.center = tr.unproject(nw.add(se).div(2));
        options.zoom = Math.min(tr.scaleZoom(tr.scale * Math.min(scaleX, scaleY)), options.maxZoom);
        options.bearing = 0;

        return options.linear ?
            this.easeTo(options) :
            this.flyTo(options);
    },

    /**
     * Change any combination of center, zoom, bearing, and pitch, without
     * a transition. The map will retain the current values for any options
     * not included in `options`.
     *
     * @param {CameraOptions} options map view options
     * @fires movestart
     * @fires moveend
     * @returns {Map} `this`
     */
    jumpTo: function(options) {
        this.stop();

        var tr = this.transform,
            zoomChanged = false,
            bearingChanged = false,
            pitchChanged = false;

        if ('center' in options) {
            tr.center = LatLng.convert(options.center);
        }

        if ('zoom' in options && tr.zoom !== +options.zoom) {
            zoomChanged = true;
            tr.zoom = +options.zoom;
        }

        if ('bearing' in options && tr.bearing !== +options.bearing) {
            bearingChanged = true;
            tr.bearing = +options.bearing;
        }

        if ('pitch' in options && tr.pitch !== +options.pitch) {
            pitchChanged = true;
            tr.pitch = +options.pitch;
        }

        this.fire('movestart')
            .fire('move');

        if (zoomChanged) {
            this.fire('zoom');
        }

        if (bearingChanged) {
            this.fire('rotate');
        }

        if (pitchChanged) {
            this.fire('pitch');
        }

        return this.fire('moveend');
    },

    /**
     * Easing animation to a specified location/zoom/bearing
     *
     * @param {CameraOptions+AnimationOptions} options map view and animation options
     * @fires movestart
     * @fires moveend
     * @returns {this}
     */
    easeTo: function(options) {
        this.stop();

        options = util.extend({
            offset: [0, 0],
            duration: 500,
            easing: util.ease
        }, options);

        var tr = this.transform,
            offset = Point.convert(options.offset).rotate(-tr.angle),
            from = tr.point,
            startZoom = this.getZoom(),
            startBearing = this.getBearing(),
            startPitch = this.getPitch();

        var zoom = 'zoom' in options ? +options.zoom : startZoom;
        var bearing = 'bearing' in options ? this._normalizeBearing(options.bearing, startBearing) : startBearing;
        var pitch = 'pitch' in options ? +options.pitch : startPitch;

        var scale = tr.zoomScale(zoom - startZoom),
            to = 'center' in options ? tr.project(LatLng.convert(options.center)).sub(offset.div(scale)) : from,
            around;

        if (zoom !== startZoom) {
            around = tr.pointLocation(tr.centerPoint.add(to.sub(from).div(1 - 1 / scale)));
            this.zooming = true;
        }

        if (startBearing !== bearing) {
            this.rotating = true;
        }

        this.fire('movestart');

        this._ease(function (k) {
            if (zoom !== startZoom) {
                tr.setZoomAround(interpolate(startZoom, zoom, k), around);
            } else {
                tr.center = tr.unproject(from.add(to.sub(from).mult(k)));
            }

            if (bearing !== startBearing) {
                tr.bearing = interpolate(startBearing, bearing, k);
            }

            if (pitch !== startPitch) {
                tr.pitch = interpolate(startPitch, pitch, k);
            }

            this.fire('move');
            if (this.zooming) {
                this.fire('zoom');
            }
            if (this.rotating) {
                this.fire('rotate');
            }
        }, function() {
            this.zooming = false;
            this.rotating = false;
            this.fire('moveend');
        }, options);

        return this;
    },

    /**
     * Flying animation to a specified location/zoom/bearing with automatic curve
     *
     * @param {CameraOptions} options map view options
     * @param {Number} [options.speed=1.2] How fast animation occurs
     * @param {Number} [options.curve=1.42] How much zooming out occurs during animation
     * @param {Function} [options.easing]
     * @fires movestart
     * @fires moveend
     * @returns {this}
     * @example
     * // fly with default options to null island
     * map.flyTo({center: [0, 0], zoom: 9});
     * // using flyTo options
     * map.flyTo({
     *   center: [0, 0],
     *   zoom: 9,
     *   speed: 0.2,
     *   curve: 1,
     *   easing: function(t) {
     *     return t;
     *   }
     * });
     */
    flyTo: function(options) {
        this.stop();

        options = util.extend({
            offset: [0, 0],
            speed: 1.2,
            curve: 1.42,
            easing: util.ease
        }, options);

        var tr = this.transform,
            offset = Point.convert(options.offset),
            startZoom = this.getZoom(),
            startBearing = this.getBearing();

        var center = 'center' in options ? LatLng.convert(options.center) : this.getCenter();
        var zoom = 'zoom' in options ?  +options.zoom : startZoom;
        var bearing = 'bearing' in options ? this._normalizeBearing(options.bearing, startBearing) : startBearing;

        var scale = tr.zoomScale(zoom - startZoom),
            from = tr.point,
            to = tr.project(center).sub(offset.div(scale));

        var startWorldSize = tr.worldSize,
            rho = options.curve,
            V = options.speed,

            w0 = Math.max(tr.width, tr.height),
            w1 = w0 / scale,
            u1 = to.sub(from).mag(),
            rho2 = rho * rho;

        function r(i) {
            var b = (w1 * w1 - w0 * w0 + (i ? -1 : 1) * rho2 * rho2 * u1 * u1) / (2 * (i ? w1 : w0) * rho2 * u1);
            return Math.log(Math.sqrt(b * b + 1) - b);
        }

        function sinh(n) { return (Math.exp(n) - Math.exp(-n)) / 2; }
        function cosh(n) { return (Math.exp(n) + Math.exp(-n)) / 2; }
        function tanh(n) { return sinh(n) / cosh(n); }

        var r0 = r(0),
            w = function (s) { return (cosh(r0) / cosh(r0 + rho * s)); },
            u = function (s) { return w0 * ((cosh(r0) * tanh(r0 + rho * s) - sinh(r0)) / rho2) / u1; },
            S = (r(1) - r0) / rho;

        if (Math.abs(u1) < 0.000001) {
            if (Math.abs(w0 - w1) < 0.000001) return this;

            var k = w1 < w0 ? -1 : 1;
            S = Math.abs(Math.log(w1 / w0)) / rho;

            u = function() { return 0; };
            w = function(s) { return Math.exp(k * rho * s); };
        }

        options.duration = 1000 * S / V;

        this.zooming = true;
        if (startBearing !== bearing) this.rotating = true;

        this.fire('movestart');

        this._ease(function (k) {
            var s = k * S,
                us = u(s);

            tr.zoom = startZoom + tr.scaleZoom(1 / w(s));
            tr.center = tr.unproject(from.add(to.sub(from).mult(us)), startWorldSize);

            if (bearing !== startBearing) {
                tr.bearing = interpolate(startBearing, bearing, k);
            }

            this.fire('move').fire('zoom');
            if (bearing !== startBearing) {
                this.fire('rotate');
            }
        }, function() {
            this.zooming = false;
            this.rotating = false;
            this.fire('moveend');
        }, options);

        return this;
    },

    isEasing: function() {
        return !!this._abortFn;
    },

    /**
     * Stop current animation
     *
     * @returns {this}
     */
    stop: function() {
        if (this._abortFn) {
            this._abortFn.call(this);
            delete this._abortFn;

            this._finishFn.call(this);
            delete this._finishFn;
        }
        return this;
    },

    _ease: function(frame, finish, options) {
        this._finishFn = finish;
        this._abortFn = browser.timed(function (t) {
            frame.call(this, options.easing(t));
            if (t === 1) {
                delete this._abortFn;
                this._finishFn.call(this);
                delete this._finishFn;
            }
        }, options.animate === false ? 0 : options.duration, this);
    },

    // convert bearing so that it's numerically close to the current one so that it interpolates properly
    _normalizeBearing: function(bearing, currentBearing) {
        bearing = util.wrap(bearing, -180, 180);
        var diff = Math.abs(bearing - currentBearing);
        if (Math.abs(bearing - 360 - currentBearing) < diff) bearing -= 360;
        if (Math.abs(bearing + 360 - currentBearing) < diff) bearing += 360;
        return bearing;
    },

    _updateEasing: function(duration, zoom, bezier) {
        var easing;

        if (this.ease) {
            var ease = this.ease,
                t = (Date.now() - ease.start) / ease.duration,
                speed = ease.easing(t + 0.01) - ease.easing(t),

                // Quick hack to make new bezier that is continuous with last
                x = 0.27 / Math.sqrt(speed * speed + 0.0001) * 0.01,
                y = Math.sqrt(0.27 * 0.27 - x * x);

            easing = util.bezier(x, y, 0.25, 1);
        } else {
            easing = bezier ? util.bezier.apply(util, bezier) : util.ease;
        }

        // store information on current easing
        this.ease = {
            start: (new Date()).getTime(),
            to: Math.pow(2, zoom),
            duration: duration,
            easing: easing
        };

        return easing;
    }
});

},{"../geo/lat_lng":28,"../geo/lat_lng_bounds":29,"../util/browser":96,"../util/interpolate":103,"../util/util":107,"point-geometry":124}],86:[function(require,module,exports){
'use strict';

var Control = require('./control');
var DOM = require('../../util/dom');
var util = require('../../util/util');

module.exports = Attribution;

/**
 * Creates an attribution control
 * @class Attribution
 * @example
 * map.addControl(new mapboxgl.Attribution());
 */
function Attribution() {}

Attribution.prototype = util.inherit(Control, {
    options: {
        position: 'bottom-right'
    },

    onAdd: function(map) {
        var className = 'mapboxgl-ctrl-attrib',
            container = this._container = DOM.create('div', className, map.getContainer());

        this._update();
        map.on('source.load', this._update.bind(this));
        map.on('source.change', this._update.bind(this));
        map.on('source.remove', this._update.bind(this));
        map.on('moveend', this._updateEditLink.bind(this));

        return container;
    },

    _update: function() {
        var attributions = [];

        if (this._map.style) {
            for (var id in this._map.style.sources) {
                var source = this._map.style.sources[id];
                if (source.attribution && attributions.indexOf(source.attribution) < 0) {
                    attributions.push(source.attribution);
                }
            }
        }

        this._container.innerHTML = attributions.join(' | ');
        this._editLink = this._container.getElementsByClassName('mapbox-improve-map')[0];
        this._updateEditLink();
    },

    _updateEditLink: function() {
        if (this._editLink) {
            var center = this._map.getCenter();
            this._editLink.href = 'https://www.mapbox.com/map-feedback/#/' +
                    center.lng + '/' + center.lat + '/' + Math.round(this._map.getZoom() + 1);
        }
    }
});

},{"../../util/dom":99,"../../util/util":107,"./control":87}],87:[function(require,module,exports){
'use strict';

module.exports = Control;

/**
 * A base class for map-related interface elements.
 *
 * @class Control
 */
function Control() {}

Control.prototype = {
    /**
     * Add this control to the map, returning the control itself
     * for chaining. This will insert the control's DOM element into
     * the map's DOM element if the control has a `position` specified.
     *
     * @param {Map} map
     * @returns {Control} this
     */
    addTo: function(map) {
        this._map = map;
        var container = this._container = this.onAdd(map);
        if (this.options && this.options.position) {
            var pos = this.options.position;
            var corner = map._controlCorners[pos];
            container.className += ' mapboxgl-ctrl';
            if (pos.indexOf('bottom') !== -1) {
                corner.insertBefore(container, corner.firstChild);
            } else {
                corner.appendChild(container);
            }
        }

        return this;
    },

    /**
     * Remove this control from the map it has been added to.
     *
     * @returns {Control} this
     */
    remove: function() {
        this._container.parentNode.removeChild(this._container);
        if (this.onRemove) this.onRemove(this._map);
        this._map = null;
        return this;
    }
};

},{}],88:[function(require,module,exports){
'use strict';

var Control = require('./control');
var DOM = require('../../util/dom');
var util = require('../../util/util');

module.exports = Navigation;

/**
 * Creates a navigation control with zoom buttons and a compass
 * @class Navigation
 * @param {Object} [options]
 * @param {String} [options.position=top-right] A string indicating the control's position on the map. Options are `top-right`, `top-left`, `bottom-right`, `bottom-left`
 * @example
 * map.addControl(new mapboxgl.Navigation({position: 'top-left'})); // position is optional
 */
function Navigation(options) {
    util.setOptions(this, options);
}

Navigation.prototype = util.inherit(Control, {
    options: {
        position: 'top-right'
    },

    onAdd: function(map) {
        var className = 'mapboxgl-ctrl';

        var container = this._container = DOM.create('div', className + '-group', map.getContainer());

        this._zoomInButton = this._createButton(className + '-icon ' + className + '-zoom-in', map.zoomIn.bind(map));
        this._zoomOutButton = this._createButton(className + '-icon ' + className + '-zoom-out', map.zoomOut.bind(map));
        this._compass = this._createButton(className + '-compass', map.resetNorth.bind(map));

        var compassCanvas = this._compassCanvas = DOM.create('canvas', className + '-compass-canvas', this._compass);
        compassCanvas.style.cssText = 'width:26px; height:26px;';
        compassCanvas.width = 26 * 2;
        compassCanvas.height = 26 * 2;

        this._compass.addEventListener('mousedown', this._onCompassDown.bind(this));
        this._onCompassMove = this._onCompassMove.bind(this);
        this._onCompassUp = this._onCompassUp.bind(this);

        this._compassCtx = compassCanvas.getContext('2d');

        map.on('rotate', this._drawNorth.bind(this));
        this._drawNorth();

        return container;
    },

    _onCompassDown: function(e) {
        DOM.disableDrag();

        document.addEventListener('mousemove', this._onCompassMove);
        document.addEventListener('mouseup', this._onCompassUp);
        this._prevX = e.screenX;

        e.stopPropagation();
    },

    _onCompassMove: function(e) {
        var x = e.screenX,
            d = x < 2 ? -5 : // left edge of the screen, continue rotating
                x > window.screen.width - 2 ? 5 : // right edge
                (x - this._prevX) / 4;

        this._map.setBearing(this._map.getBearing() - d);
        this._prevX = e.screenX;
        this._moved = true;

        e.preventDefault();
    },

    _onCompassUp: function() {
        document.removeEventListener('mousemove', this._onCompassMove);
        document.removeEventListener('mouseup', this._onCompassUp);
        DOM.enableDrag();

        if (this._moved) {
            this._moved = false;
            DOM.suppressClick();
        }
    },

    _createButton: function(className, fn) {
        var a = DOM.create('button', className, this._container);
        a.addEventListener('click', function() { fn(); });
        return a;
    },

    _drawNorth: function() {
        var rad = 20,
            width = 8,
            center = 26,
            angle = this._map.transform.angle + (Math.PI / 2),
            ctx = this._compassCtx;

        this._compassCanvas.width = this._compassCanvas.width;

        ctx.translate(center, center);
        ctx.rotate(angle);

        ctx.beginPath();
        ctx.fillStyle = '#000';
        ctx.lineTo(0, -width);
        ctx.lineTo(-rad, 0);
        ctx.lineTo(0, width);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = '#bbb';
        ctx.moveTo(0, 0);
        ctx.lineTo(0, width);
        ctx.lineTo(rad, 0);
        ctx.lineTo(0, -width);
        ctx.fill();

        ctx.beginPath();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.moveTo(0, -width);
        ctx.lineTo(0, width);
        ctx.stroke();
    }
});

},{"../../util/dom":99,"../../util/util":107,"./control":87}],89:[function(require,module,exports){
'use strict';

var Interaction = require('./interaction');
var Point = require('point-geometry');
var util = require('../util/util');
var DOM = require('../util/dom');
var LatLngBounds = require('../geo/lat_lng_bounds');

module.exports = Handlers;

function Handlers(map) {

    var rotateEnd;

    var box;

    var inertiaLinearity = 0.2,
        inertiaEasing = util.bezier(0, 0, inertiaLinearity, 1);

    function boxzoomFinish() {
        if (box) {
            box.parentNode.removeChild(box);
            map.getContainer().classList.remove('mapboxgl-crosshair');
            box = false;
            DOM.enableDrag();
        }
    }

    this.interaction = new Interaction(map.getCanvas())
        .on('click', function(e) {
            e.latLng = map.unproject(e.point);
            map.fire('click', e);
        })
        .on('dblclick', function(e) {
            e.latLng = map.unproject(e.point);
            map.fire('dblclick', e);
        })
        .on('mousemove', function(e) {
            e.latLng = map.unproject(e.point);
            map.fire('mousemove', e);
        })
        .on('down', function() {
            map.fire('movestart');
        })
        .on('resize', function() {
            map.stop();
            map.resize();
            map.update();
        })
        .on('keydown', function(e) {
            if (e.altKey || e.ctrlKey || e.metaKey) return;

            var pan = 80;
            var rotate = 2;

            function zoomBy(z) {
                map.zoomTo(Math.round(map.getZoom()) + (e.shiftKey ? 2 : 1) * z);
            }

            function panBy(v) {
                map.panBy(v);
            }

            function rotateBy(v) {
                map.setBearing(map.getBearing() + v);
            }

            switch (e.keyCode) {
                case 61:
                case 107:
                case 171:
                case 187:
                    zoomBy(1);
                    break;
                case 189:
                case 109:
                case 173:
                    zoomBy(-1);
                    break;
                case 37:
                    if (e.shiftKey) {
                        rotateBy(-rotate);
                    } else {
                        panBy([-pan, 0]);
                    }
                    break;
                case 39:
                    if (e.shiftKey) {
                        rotateBy(rotate);
                    } else {
                        panBy([pan, 0]);
                    }
                    break;
                case 38:
                    panBy([0, -pan]);
                    break;
                case 40:
                    panBy([0, pan]);
                    break;
                default:
                    return;
            }
        })
        .on('pan', function(e) {
            map.stop();
            var mouseLocation = map.transform.pointLocation(e.point.add(e.offset));
            map.transform.setLocationAtPoint(mouseLocation, e.point);
            map.fire('move');
        })
        .on('panend', function(e) {
            if (!e.inertia) {
                map.fire('moveend');
            } else {
                // convert velocity to px/s & adjust for increased initial animation speed when easing out
                var velocity = e.inertia.mult(1000 * inertiaLinearity),
                    speed = velocity.mag();

                var maxSpeed = 4000; // px/s

                if (speed >= maxSpeed) {
                    speed = maxSpeed;
                    velocity._unit()._mult(maxSpeed);
                }

                var deceleration = 8000, // px/s^2
                    duration = speed / (deceleration * inertiaLinearity),
                    offset = velocity.mult(-duration / 2).round();

                map.panBy(offset, {
                    duration: duration * 1000,
                    easing: inertiaEasing,
                    noMoveStart: true
                });
            }
        })
        .on('zoom', function(e) {
            // Scale by sigmoid of scroll wheel delta.
            var scale = 2 / (1 + Math.exp(-Math.abs(e.delta / 100)));
            if (e.delta < 0 && scale !== 0) scale = 1 / scale;

            var fromScale = map.ease && isFinite(e.delta) ? map.ease.to : map.transform.scale,
                duration = !isFinite(e.delta) ? 800 : 0;

            map.zoomTo(map.transform.scaleZoom(fromScale * scale), {
                duration: duration,
                around: map.unproject(e.point)
            });
        })
        .on('rotate', function(e) {
            var center = map.transform.centerPoint, // Center of rotation
                startToCenter = e.start.sub(center),
                startToCenterDist = startToCenter.mag();

            map.rotating = true;

            // If the first click was too close to the center, move the center of rotation by 200 pixels
            // in the direction of the click.
            if (startToCenterDist < 200) {
                center = e.start.add(new Point(-200, 0)._rotate(startToCenter.angle()));
            }

            var bearingDiff = e.prev.sub(center).angleWith(e.current.sub(center)) / Math.PI * 180;
            map.transform.bearing = map.getBearing() - bearingDiff;

            map.fire('move').fire('rotate');

            window.clearTimeout(rotateEnd);
            rotateEnd = window.setTimeout(function() {
                map.rotating = false;
                map._rerender();
            }, 200);
        })
        .on('boxzoomstart', function(e) {
            if (!box) {
                box = DOM.create('div', 'mapboxgl-boxzoom', map.getContainer());
                map.getContainer().classList.add('mapboxgl-crosshair');
                map.fire('boxzoomstart');
                DOM.disableDrag();
            }

            var minX = Math.min(e.start.x, e.current.x);
            var maxX = Math.max(e.start.x, e.current.x);
            var minY = Math.min(e.start.y, e.current.y);
            var maxY = Math.max(e.start.y, e.current.y);

            DOM.setTransform(box, 'translate(' + minX + 'px,' + minY + 'px)');
            box.style.width = (maxX - minX) + 'px';
            box.style.height = (maxY - minY) + 'px';
        })
        .on('boxzoomend', function(e) {
            boxzoomFinish();

            var bounds = new LatLngBounds(
                map.unproject(e.start),
                map.unproject(e.current)
            );

            map.fitBounds(bounds, { linear: true }).fire('boxzoomend', {
                boxZoomBounds: bounds
            });
        })
        .on('boxzoomcancel', boxzoomFinish);
}

},{"../geo/lat_lng_bounds":29,"../util/dom":99,"../util/util":107,"./interaction":91,"point-geometry":124}],90:[function(require,module,exports){
'use strict';

/*
 * Adds positional coordinates to URL hashes. Passed as an option to the map object
 *
 * @class mapboxgl.Hash
 * @returns {Hash} `this`
 */
module.exports = Hash;

var util = require('../util/util');

function Hash() {
    util.bindAll([
        '_onHashChange',
        '_updateHash'
    ], this);
}

Hash.prototype = {
    /* Map element to listen for coordinate changes
     *
     * @param {Object} map
     * @returns {Hash} `this`
     */
    addTo: function(map) {
        this._map = map;
        window.addEventListener('hashchange', this._onHashChange, false);
        this._map.on('moveend', this._updateHash);
        return this;
    },

    /* Removes hash
     *
     * @returns {Popup} `this`
     */
    remove: function() {
        window.removeEventListener('hashchange', this._onHashChange, false);
        this._map.off('moveend', this._updateHash);
        delete this._map;
        return this;
    },

    _onHashChange: function() {
        var loc = location.hash.replace('#', '').split('/');
        if (loc.length >= 3) {
            this._map.jumpTo({
                center: [+loc[1], +loc[2]],
                zoom: +loc[0],
                bearing: +(loc[3] || 0)
            });
            return true;
        }
        return false;
    },

    _updateHash: function() {
        var center = this._map.getCenter(),
            zoom = this._map.getZoom(),
            bearing = this._map.getBearing(),
            precision = Math.max(0, Math.ceil(Math.log(zoom) / Math.LN2)),

            hash = '#' + (Math.round(zoom * 100) / 100) +
                '/' + center.lat.toFixed(precision) +
                '/' + center.lng.toFixed(precision) +
                (bearing ? '/' + (Math.round(bearing * 10) / 10) : '');

        window.history.replaceState('', '', hash);
    }
};

},{"../util/util":107}],91:[function(require,module,exports){
'use strict';

var Evented = require('../util/evented');
var browser = require('../util/browser');
var Point = require('point-geometry');

module.exports = Interaction;

/**
 * Mouse event
 *
 * @event Map#mousemove
 * @type {Object}
 * @property {Point} point the pixel location of the event
 * @property {Event} originalEvent the original DOM event
 */

/**
 * Double click event.
 *
 * @event Map#dblclick
 * @type {Object}
 * @property {Point} point the pixel location of the event
 */

/**
 * Pan event
 *
 * @event Map#pan
 * @type {Object}
 * @property {Point} point the pixel location of the event
 * @property {Point} offset a point representing the movement from the previous map location to the current one.
 */

/**
 * Pan end event
 *
 * @event Map#panend
 * @type {Object}
 * @property {number} velocity a measure of how much inertia was recorded in this pan motion
 */

function Interaction(el) {
    var interaction = this;
    if (!el) return;

    var rotating = false,
        panned = false,
        boxzoom = false,
        firstPos = null,
        pos = null,
        inertia = null,
        now;

    function mousePos(e) {
        var rect = el.getBoundingClientRect();
        return new Point(
            e.clientX - rect.left - el.clientLeft,
            e.clientY - rect.top - el.clientTop);
    }

    el.addEventListener('contextmenu', function(ev) {
        rotating = true;
        firstPos = pos = mousePos(ev);
        ev.preventDefault();
    }, false);
    el.addEventListener('mousedown', onmousedown, false);
    document.addEventListener('mouseup', onmouseup, false);
    document.addEventListener('mousemove', onmousemove, false);
    el.addEventListener('click', onclick, false);
    scrollwheel(zoom);
    el.addEventListener('dblclick', ondoubleclick, false);
    window.addEventListener('resize', resize, false);
    el.addEventListener('keydown', keydown, false);

    function zoom(type, delta, point) {
        interaction.fire('zoom', {
            source: type,
            delta: delta,
            point: point
        });
        inertia = null;
        now = null;
    }

    function click(point, ev) {
        interaction.fire('click', {point: point, originalEvent: ev});
    }

    function mousemove(point, ev) {
        interaction.fire('mousemove', {point: point, originalEvent: ev});
    }

    function pan(point) {
        if (pos) {
            var offset = pos.sub(point);
            interaction.fire('pan', {offset: offset, point: point});

            // add an averaged version of this movement to the inertia vector
            if (inertia) {
                var duration = Date.now() - now;
                // sometimes it's 0 after some erratic paning
                if (duration) {
                    var time = duration + now;
                    inertia.push([time, point]);
                    while (inertia.length > 2 && time - inertia[0][0] > 100) inertia.shift();
                }

            } else {
                inertia = [];
            }
            now = Date.now();
            pos = point;
        }
    }

    function resize() {
        interaction.fire('resize');
    }

    function keydown(ev) {
        if (boxzoom && ev.keyCode === 27) {
            interaction.fire('boxzoomcancel');
            boxzoom = false;
        }

        interaction.fire('keydown', ev);
    }

    function rotate(point) {
        if (pos) {
            interaction.fire('rotate', {
                start: firstPos,
                prev: pos,
                current: point
            });
            pos = point;
        }
    }

    function doubleclick(point, ev) {
        interaction.fire('dblclick', {
            point: point,
            originalEvent: ev
        });
    }

    function onmousedown(ev) {
        firstPos = pos = mousePos(ev);
        interaction.fire('down');
        if (ev.shiftKey || ((ev.which === 1) && (ev.button === 1))) {
          boxzoom = true;
        }
    }

    function onmouseup(ev) {
        panned = pos && firstPos && (pos.x !== firstPos.x || pos.y !== firstPos.y);

        rotating = false;
        pos = null;

        if (boxzoom) {
            interaction.fire('boxzoomend', {
                start: firstPos,
                current: mousePos(ev)
            });
            boxzoom = false;

        } else if (inertia && inertia.length >= 2 && now > Date.now() - 100) {
            var last = inertia[inertia.length - 1],
                first = inertia[0],
                velocity = last[1].sub(first[1]).div(last[0] - first[0]);
            interaction.fire('panend', {inertia: velocity});

        } else if (pos) {
          interaction.fire('panend');
        }

        inertia = null;
        now = null;
    }

    function onmousemove(ev) {
        var point = mousePos(ev);

        if (boxzoom) {
            interaction.fire('boxzoomstart', {
                start: firstPos,
                current: point
            });

        } else if (rotating) {
            rotate(point);

        } else if (pos) {
            pan(point);

        } else {
            var target = ev.toElement || ev.target;
            while (target && target !== el && target.parentNode) target = target.parentNode;
            if (target === el) {
                mousemove(point, ev);
            }
        }
    }

    function onclick(ev) {
        if (!panned) click(mousePos(ev), ev);
    }

    function ondoubleclick(ev) {
        doubleclick(mousePos(ev), ev);
        zoom('wheel', Infinity * (ev.shiftKey ? -1 : 1), mousePos(ev));
        ev.preventDefault();
    }

    function scrollwheel(callback) {
        var firefox = /Firefox/i.test(navigator.userAgent);
        var safari = /Safari/i.test(navigator.userAgent) && !/Chrom(ium|e)/i.test(navigator.userAgent);
        var time = window.performance || Date;

        el.addEventListener('wheel', wheel, false);
        el.addEventListener('mousewheel', mousewheel, false);

        var lastEvent = 0;

        var type = null;
        var typeTimeout = null;
        var initialValue = null;

        function scroll(value, ev) {
            var stamp = time.now();
            var timeDelta = stamp - lastEvent;
            lastEvent = stamp;

            var point = mousePos(ev);

            if (value !== 0 && (value % 4.000244140625) === 0) {
                // This one is definitely a mouse wheel event.
                type = 'wheel';
                // Normalize this value to match trackpad.
                value = Math.floor(value / 4);
            } else if (value !== 0 && Math.abs(value) < 4) {
                // This one is definitely a trackpad event because it is so small.
                type = 'trackpad';
            } else if (timeDelta > 400) {
                // This is likely a new scroll action.
                type = null;
                initialValue = value;
                // Start a timeout in case this was a singular event, and dely it
                // by up to 40ms.
                typeTimeout = setTimeout(function() {
                    type = 'wheel';
                    callback(type, -initialValue, point);
                }, 40);
            } else if (type === null) {
                // This is a repeating event, but we don't know the type of event
                // just yet. If the delta per time is small, we assume it's a
                // fast trackpad; otherwise we switch into wheel mode.
                type = (Math.abs(timeDelta * value) < 200) ? 'trackpad' : 'wheel';

                // Make sure our delayed event isn't fired again, because we
                // accumulate the previous event (which was less than 40ms ago) into
                // this event.
                if (typeTimeout) {
                    clearTimeout(typeTimeout);
                    typeTimeout = null;
                    value += initialValue;
                }
            }

            // Slow down zoom if shift key is held for more precise zooming
            if (ev.shiftKey && value) value = value / 4;

            // Only fire the callback if we actually know what type of scrolling
            // device the user uses.
            if (type !== null) {
                callback(type, -value, point);
            }
        }

        function wheel(e) {
            var deltaY = e.deltaY;
            // Firefox doubles the values on retina screens...
            if (firefox && e.deltaMode === window.WheelEvent.DOM_DELTA_PIXEL) deltaY /= browser.devicePixelRatio;
            if (e.deltaMode === window.WheelEvent.DOM_DELTA_LINE) deltaY *= 40;
            scroll(deltaY, e);
            e.preventDefault();
        }

        function mousewheel(e) {
            var deltaY = -e.wheelDeltaY;
            if (safari) deltaY = deltaY / 3;
            scroll(deltaY, e);
            e.preventDefault();
        }
    }
}

Interaction.prototype = Object.create(Evented);

},{"../util/browser":96,"../util/evented":101,"point-geometry":124}],92:[function(require,module,exports){
arguments[4][84][0].apply(exports,arguments)
},{"../geo/lat_lng":28,"../geo/lat_lng_bounds":29,"../geo/transform":30,"../render/painter":44,"../style/animation_loop":57,"../style/style":62,"../util/browser":96,"../util/canvas":97,"../util/dom":99,"../util/evented":101,"../util/util":107,"./camera":85,"./control/attribution":86,"./handlers":89,"./hash":90,"dup":84,"point-geometry":124}],93:[function(require,module,exports){
'use strict';

module.exports = Popup;

var util = require('../util/util');
var Evented = require('../util/evented');
var DOM = require('../util/dom');
var LatLng = require('../geo/lat_lng');

/**
 * Creates a popup component
 * @class Popup
 * @param {Object} options
 * @param {Boolean} options.closeButton
 * @param {Boolean} options.closeOnClick
 * @example
 * var tooltip = new mapboxgl.Popup()
 *   .setLatLng(map.unproject(e.point))
 *   .setHTML("<h1>Hello World!</h1>")
 *   .addTo(map);
 */
function Popup(options) {
    util.setOptions(this, options);
    util.bindAll([
        '_updatePosition',
        '_onClickClose'],
        this);
}

Popup.prototype = util.inherit(Evented, /** @lends Popup.prototype */{
    options: {
        closeButton: true,
        closeOnClick: true
    },

    /**
     * Attaches the popup to a map
     * @param {Map} map
     * @returns {Popup} `this`
     */
    addTo: function(map) {
        this._map = map;
        this._map.on('move', this._updatePosition);
        if (this.options.closeOnClick) {
            this._map.on('click', this._onClickClose);
        }
        this._update();
        return this;
    },

    /**
     * Removes the popup from the map
     * @example
     * var popup = new mapboxgl.Popup().addTo(map);
     * popup.remove();
     * @returns {Popup} `this`
     */
    remove: function() {
        if (this._container) {
            this._container.parentNode.removeChild(this._container);
        }

        if (this._map) {
            this._map.off('move', this._updatePosition);
            this._map.off('click', this._onClickClose);
            delete this._map;
        }

        return this;
    },

    /**
     * Get the current coordinates of popup element relative to map
     * @returns {LatLng}
     */
    getLatLng: function() {
        return this._latLng;
    },

    /**
     * Set the coordinates of a popup element to a map
     * @param {LatLng} latlng
     * @returns {Popup} `this`
     */
    setLatLng: function(latlng) {
        this._latLng = LatLng.convert(latlng);
        this._update();
        return this;
    },

    /**
     * Fill a popup element with text only content
     * @param {string} text
     * @returns {Popup} `this`
     */
    setText: function(text) {
        this._content = document.createTextNode(text);
        this._updateContent();
        return this;
    },

    /**
     * Fill a popup element with HTML content
     * @param {string} html
     * @returns {Popup} `this`
     */
    setHTML: function(html) {
        this._content = document.createDocumentFragment();

        var temp = document.createElement('body'), child;
        temp.innerHTML = html;
        while (true) {
            child = temp.firstChild;
            if (!child) break;
            this._content.appendChild(child);
        }

        this._updateContent();
        return this;
    },

    _update: function() {
        if (!this._map) { return; }

        if (!this._container) {
            this._container = DOM.create('div', 'mapboxgl-popup', this._map.getContainer());

            this._tip     = DOM.create('div', 'mapboxgl-popup-tip',     this._container);
            this._wrapper = DOM.create('div', 'mapboxgl-popup-content', this._container);

            if (this.options.closeButton) {
                this._closeButton = DOM.create('button', 'mapboxgl-popup-close-button', this._wrapper);
                this._closeButton.innerHTML = '&#215;';
                this._closeButton.addEventListener('click', this._onClickClose);
            }
        }

        this._updateContent();
        this._updatePosition();
    },

    _updateContent: function() {
        if (!this._content || !this._container) { return; }

        var node = this._wrapper;

        while (node.hasChildNodes()) {
            node.removeChild(node.firstChild);
        }

        node.appendChild(this._closeButton);
        node.appendChild(this._content);
    },

    _updatePosition: function() {
        if (!this._latLng || !this._container) { return; }

        var pos = this._map.project(this._latLng).round(),
            anchor = this.options.anchor;

        if (!anchor) {
            var width = this._container.offsetWidth,
                height = this._container.offsetHeight;

            if (pos.y < height) {
                anchor = ['top'];
            } else if (pos.y > this._map.transform.height - height) {
                anchor = ['bottom'];
            } else {
                anchor = [];
            }

            if (pos.x < width / 2) {
                anchor.push('left');
            } else if (pos.x > this._map.transform.width - width / 2) {
                anchor.push('right');
            }

            if (anchor.length === 0) {
                anchor = 'bottom';
            } else {
                anchor = anchor.join('-');
            }

            this.options.anchor = anchor;
        }

        var anchorTranslate = {
            'top': 'translate(-50%,0)',
            'top-left': 'translate(0,0)',
            'top-right': 'translate(-100%,0)',
            'bottom': 'translate(-50%,-100%)',
            'bottom-left': 'translate(0,-100%)',
            'bottom-right': 'translate(-100%,-100%)',
            'left': 'translate(0,-50%)',
            'right': 'translate(-100%,-50%)'
        };

        var classList = this._container.classList;
        for (var key in anchorTranslate) {
            classList.remove('mapboxgl-popup-anchor-' + key);
        }
        classList.add('mapboxgl-popup-anchor-' + anchor);

        DOM.setTransform(this._container, anchorTranslate[anchor] + ' translate(' + pos.x + 'px,' + pos.y + 'px)');
    },

    _onClickClose: function() {
        this.remove();
    }
});

},{"../geo/lat_lng":28,"../util/dom":99,"../util/evented":101,"../util/util":107}],94:[function(require,module,exports){
'use strict';

module.exports = Actor;

function Actor(target, parent) {
    this.target = target;
    this.parent = parent;
    this.callbacks = {};
    this.callbackID = 0;
    this.receive = this.receive.bind(this);
    this.target.addEventListener('message', this.receive, false);
}

Actor.prototype.receive = function(message) {
    var data = message.data,
        callback;

    if (data.type === '<response>') {
        callback = this.callbacks[data.id];
        delete this.callbacks[data.id];
        callback(data.error || null, data.data);
    } else if (typeof data.id !== 'undefined') {
        var id = data.id;
        this.parent[data.type](data.data, function(err, data, buffers) {
            this.postMessage({
                type: '<response>',
                id: String(id),
                error: err ? String(err) : null,
                data: data
            }, buffers);
        }.bind(this));
    } else {
        this.parent[data.type](data.data);
    }
};

Actor.prototype.send = function(type, data, callback, buffers) {
    var id = null;
    if (callback) this.callbacks[id = this.callbackID++] = callback;
    this.postMessage({ type: type, id: String(id), data: data }, buffers);
};

Actor.prototype.postMessage = function(message, transferList) {
    try {
        this.target.postMessage(message, transferList);
    } catch (e) {
        this.target.postMessage(message); // No support for transferList on IE
    }
};

},{}],95:[function(require,module,exports){
'use strict';

exports.getJSON = function(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onerror = function(e) {
        callback(e);
    };
    xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300 && xhr.response) {
            var data;
            try {
                data = JSON.parse(xhr.response);
            } catch (err) {
                return callback(err);
            }
            callback(null, data);
        } else {
            callback(new Error(xhr.statusText));
        }
    };
    xhr.send();
    return xhr;
};

exports.getArrayBuffer = function(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onerror = function(e) {
        callback(e);
    };
    xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300 && xhr.response) {
            callback(null, xhr.response);
        } else {
            callback(new Error(xhr.statusText));
        }
    };
    xhr.send();
    return xhr;
};

exports.getImage = function(url, callback) {
    var img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function() {
        callback(null, img);
    };
    img.src = url;
    img.getData = function() {
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0);
        return context.getImageData(0, 0, img.width, img.height).data;
    };
    return img;
};

exports.getVideo = function(urls, callback) {
    var video = document.createElement('video');
    video.crossOrigin = 'Anonymous';
    video.onloadstart = function() {
        callback(null, video);
    };
    for (var i = 0; i < urls.length; i++) {
        var s = document.createElement('source');
        s.src = urls[i];
        video.appendChild(s);
    }
    video.getData = function() { return video; };
    return video;
};

},{}],96:[function(require,module,exports){
'use strict';

var Canvas = require('./canvas');

var frame = window.requestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame;

exports.frame = function(fn) {
    return frame(fn);
};

var cancel = window.cancelAnimationFrame ||
    window.mozCancelAnimationFrame ||
    window.webkitCancelAnimationFrame ||
    window.msCancelAnimationFrame;

exports.cancelFrame = function(id) {
    cancel(id);
};

exports.timed = function (fn, dur, ctx) {
    if (!dur) {
        fn.call(ctx, 1);
        return null;
    }

    var abort = false,
        start = window.performance ? window.performance.now() : Date.now();

    function tick(now) {
        if (abort) return;
        if (!window.performance) now = Date.now();

        if (now >= start + dur) {
            fn.call(ctx, 1);
        } else {
            fn.call(ctx, (now - start) / dur);
            exports.frame(tick);
        }
    }

    exports.frame(tick);

    return function() { abort = true; };
};

/**
 * Test whether the basic JavaScript and DOM features required for Mapbox GL are present.
 * @param {Object} options
 * @param {Boolean} [options.failIfMajorPerformanceCaveat=false] If `true`, map creation will fail if the implementation determines that the performance of the created WebGL context would be dramatically lower than expected.
 * @return {Boolean} Returns true if Mapbox GL should be expected to work, and false if not.
 */
exports.supported = function(options) {

    var supports = [

        function() { return typeof window !== 'undefined'; },

        function() { return typeof document !== 'undefined'; },

        function () {
            return !!(Array.prototype &&
                Array.prototype.every &&
                Array.prototype.filter &&
                Array.prototype.forEach &&
                Array.prototype.indexOf &&
                Array.prototype.lastIndexOf &&
                Array.prototype.map &&
                Array.prototype.some &&
                Array.prototype.reduce &&
                Array.prototype.reduceRight &&
                Array.isArray);
        },

        function() {
            return !!(Function.prototype && Function.prototype.bind) &&
                !!(Object.keys &&
                    Object.create &&
                    Object.getPrototypeOf &&
                    Object.getOwnPropertyNames &&
                    Object.isSealed &&
                    Object.isFrozen &&
                    Object.isExtensible &&
                    Object.getOwnPropertyDescriptor &&
                    Object.defineProperty &&
                    Object.defineProperties &&
                    Object.seal &&
                    Object.freeze &&
                    Object.preventExtensions);
        },

        function() {
            return 'JSON' in window && 'parse' in JSON && 'stringify' in JSON;
        },

        function() {
            return new Canvas().supportsWebGLContext((options && options.failIfMajorPerformanceCaveat) || false);
        },

        function() { return 'Worker' in window; }
    ];

    for (var i = 0; i < supports.length; i++) {
        if (!supports[i]()) return false;
    }
    return true;
};

exports.hardwareConcurrency = navigator.hardwareConcurrency || 8;

Object.defineProperty(exports, 'devicePixelRatio', {
    get: function() { return window.devicePixelRatio; }
});

},{"./canvas":97}],97:[function(require,module,exports){
'use strict';

var util = require('../util');

module.exports = Canvas;

function Canvas(parent, container) {
    this.canvas = document.createElement('canvas');

    if (parent && container) {
        this.canvas.style.position = 'absolute';
        this.canvas.classList.add('mapboxgl-canvas');
        this.canvas.addEventListener('webglcontextlost', parent._contextLost.bind(parent), false);
        this.canvas.addEventListener('webglcontextrestored', parent._contextRestored.bind(parent), false);
        this.canvas.setAttribute('tabindex', 0);
        container.appendChild(this.canvas);
    }
}

Canvas.prototype.resize = function(width, height) {
    var pixelRatio = window.devicePixelRatio || 1;

    // Request the required canvas size taking the pixelratio into account.
    this.canvas.width = pixelRatio * width;
    this.canvas.height = pixelRatio * height;

    // Maintain the same canvas size, potentially downscaling it for HiDPI displays
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
};

Canvas.prototype._contextAttributes = {
    antialias: false,
    alpha: true,
    stencil: true,
    depth: false
};

Canvas.prototype.getWebGLContext = function(attributes) {
    attributes = util.inherit(this._contextAttributes, attributes);
    console.log('attributes', attributes);

    return this.canvas.getContext('webgl', attributes) ||
        this.canvas.getContext('experimental-webgl', attributes);
};

Canvas.prototype.supportsWebGLContext = function(failIfMajorPerformanceCaveat) {
    var attributes = util.inherit(this._contextAttributes, {
        failIfMajorPerformanceCaveat: failIfMajorPerformanceCaveat
    });

    if ('probablySupportsContext' in this.canvas) {
        return this.canvas.probablySupportsContext('webgl', attributes) ||
            this.canvas.probablySupportsContext('experimental-webgl', attributes);
    } else if ('supportsContext' in this.canvas) {
        return this.canvas.supportsContext('webgl', attributes) ||
            this.canvas.supportsContext('experimental-webgl', attributes);
    }

    return !!window.WebGLRenderingContext && !!this.getWebGLContext(failIfMajorPerformanceCaveat);
};

Canvas.prototype.getElement = function() {
    return this.canvas;
};

},{"../util":107}],98:[function(require,module,exports){
'use strict';

var Actor = require('../actor');
var WebWorkify = require('webworkify');

module.exports = Dispatcher;

function Dispatcher(length, parent) {
    this.actors = [];
    this.currentActor = 0;
    for (var i = 0; i < length; i++) {
        var worker = new WebWorkify(require('../../source/worker'));
        var actor = new Actor(worker, parent);
        actor.name = "Worker " + i;
        this.actors.push(actor);
    }
}

Dispatcher.prototype = {
    broadcast: function(type, data) {
        for (var i = 0; i < this.actors.length; i++) {
            this.actors[i].send(type, data);
        }
    },

    send: function(type, data, callback, targetID, buffers) {
        if (typeof targetID !== 'number' || isNaN(targetID)) {
            // Use round robin to send requests to web workers.
            targetID = this.currentActor = (this.currentActor + 1) % this.actors.length;
        }

        this.actors[targetID].send(type, data, callback, buffers);
        return targetID;
    },

    remove: function() {
        for (var i = 0; i < this.actors.length; i++) {
            this.actors[i].target.terminate();
        }
        this.actors = [];
    }
};

},{"../../source/worker":55,"../actor":94,"webworkify":131}],99:[function(require,module,exports){
'use strict';

exports.create = function (tagName, className, container) {
    var el = document.createElement(tagName);
    if (className) el.className = className;
    if (container) container.appendChild(el);
    return el;
};

var docStyle = document.documentElement.style;

function testProp(props) {
    for (var i = 0; i < props.length; i++) {
        if (props[i] in docStyle) {
            return props[i];
        }
    }
}

var selectProp = testProp(['userSelect', 'MozUserSelect', 'WebkitUserSelect', 'msUserSelect']),
    userSelect;
exports.disableDrag = function () {
    if (selectProp) {
        userSelect = docStyle[selectProp];
        docStyle[selectProp] = 'none';
    }
};
exports.enableDrag = function () {
    if (selectProp) {
        docStyle[selectProp] = userSelect;
    }
};

var transformProp = testProp(['transform', 'WebkitTransform']);
exports.setTransform = function(el, value) {
    el.style[transformProp] = value;
};

// Suppress the next click, but only if it's immediate.
function suppressClick(e) {
    e.preventDefault();
    e.stopPropagation();
    window.removeEventListener('click', suppressClick, true);
}
exports.suppressClick = function() {
    window.addEventListener('click', suppressClick, true);
    window.setTimeout(function() {
        window.removeEventListener('click', suppressClick, true);
    }, 0);
};

},{}],100:[function(require,module,exports){
'use strict';

module.exports = {
    HTTP_URL: 'http://a.tiles.mapbox.com',
    HTTPS_URL: 'https://a.tiles.mapbox.com',
    FORCE_HTTPS: true,
    REQUIRE_ACCESS_TOKEN: true
};

},{}],101:[function(require,module,exports){
'use strict';

var util = require('./util');

/**
 * Methods mixed in to other classes for event capabilities.
 * @mixin Evented
 */
var Evented = {

    /**
     * Subscribe to a specified event with a listener function the latter gets the data object that was passed to `fire` and additionally `target` and `type` properties
     *
     * @param {String} type Event type
     * @param {Function} listener Function to be called when the event is fired
     */
    on: function(type, fn) {
        this._events = this._events || {};
        this._events[type] = this._events[type] || [];
        this._events[type].push(fn);

        return this;
    },

    /**
     * Remove a event listener
     *
     * @param {String} [type] Event type. If none is specified, remove all listeners
     * @param {Function} [listener] Function to be called when the event is fired. If none is specified all listeners are removed
     */
    off: function(type, fn) {
        if (!type) {
            // clear all listeners if no arguments specified
            delete this._events;
            return this;
        }

        if (!this.listens(type)) return this;

        if (fn) {
            var idx = this._events[type].indexOf(fn);
            if (idx >= 0) {
                this._events[type].splice(idx, 1);
            }
            if (!this._events[type].length) {
                delete this._events[type];
            }
        } else {
            delete this._events[type];
        }

        return this;
    },

    /**
     * Call a function once when an event has fired
     *
     * @param {String} type Event type.
     * @param {Function} listener Function to be called once when the event is fired
     */
    once: function(type, fn) {
        var wrapper = function(data) {
            this.off(type, wrapper);
            fn.call(this, data);
        }.bind(this);
        this.on(type, wrapper);
        return this;
    },

    /**
     * Fire event of a given string type with the given data object
     *
     * @param {String} type The event name
     * @param {Object} [data] Optional data passed down to the event object
     * @returns {Boolean} Returns true if the object listens to an event of a particular type
     */
    fire: function(type, data) {
        if (!this.listens(type)) return this;

        data = util.extend({}, data);
        util.extend(data, {type: type, target: this});

        // make sure adding/removing listeners inside other listeners won't cause infinite loop
        var listeners = this._events[type].slice();

        for (var i = 0; i < listeners.length; i++) {
            listeners[i].call(this, data);
        }

        return this;
    },

    /**
     * Check if an event is registered to a type
     * @returns {Boolean} Returns true if the object listens to an event of a particular type
     */
    listens: function(type) {
        return !!(this._events && this._events[type]);
    }
};

module.exports = Evented;

},{"./util":107}],102:[function(require,module,exports){
'use strict';

module.exports = Glyphs;

function Glyphs(pbf, end) {
    this.stacks = pbf.readFields(readFontstacks, [], end);
}

function readFontstacks(tag, stacks, pbf) {
    if (tag === 1) {
        var fontstack = pbf.readMessage(readFontstack, {glyphs: {}});
        stacks.push(fontstack);
    }
}

function readFontstack(tag, fontstack, pbf) {
    if (tag === 1) fontstack.name = pbf.readString();
    else if (tag === 2) fontstack.range = pbf.readString();
    else if (tag === 3) {
        var glyph = pbf.readMessage(readGlyph, {});
        fontstack.glyphs[glyph.id] = glyph;
    }
}

function readGlyph(tag, glyph, pbf) {
    if (tag === 1) glyph.id = pbf.readVarint();
    else if (tag === 2) glyph.bitmap = pbf.readBytes();
    else if (tag === 3) glyph.width = pbf.readVarint();
    else if (tag === 4) glyph.height = pbf.readVarint();
    else if (tag === 5) glyph.left = pbf.readSVarint();
    else if (tag === 6) glyph.top = pbf.readSVarint();
    else if (tag === 7) glyph.advance = pbf.readVarint();
}

},{}],103:[function(require,module,exports){
'use strict';

module.exports = interpolate;

function interpolate(a, b, t) {
    return (a * (1 - t)) + (b * t);
}

interpolate.number = interpolate;

interpolate.vec2 = function(from, to, t) {
    return [
        interpolate(from[0], to[0], t),
        interpolate(from[1], to[1], t)
    ];
};

/*
 * Interpolate between two colors given as 4-element arrays.
 *
 * @param {Color} from
 * @param {Color} to
 * @param {Number} t interpolation factor between 0 and 1
 * @returns {Color} interpolated color
 */
interpolate.color = function(from, to, t) {
    return [
        interpolate(from[0], to[0], t),
        interpolate(from[1], to[1], t),
        interpolate(from[2], to[2], t),
        interpolate(from[3], to[3], t)
    ];
};

interpolate.array = function(from, to, t) {
    return from.map(function(d, i) {
        return interpolate(d, to[i], t);
    });
};

},{}],104:[function(require,module,exports){
'use strict';

var config = require('./config');
var browser = require('./browser');

function normalizeURL(url, pathPrefix, accessToken) {
    accessToken = accessToken || config.ACCESS_TOKEN;

    if (!accessToken && config.REQUIRE_ACCESS_TOKEN) {
        throw new Error('An API access token is required to use Mapbox GL. ' +
            'See https://www.mapbox.com/developers/api/#access-tokens');
    }

    var https = config.FORCE_HTTPS ||
        (typeof document !== 'undefined' && document.location.protocol === 'https:');

    url = url.replace(/^mapbox:\/\//, (https ? config.HTTPS_URL : config.HTTP_URL) + pathPrefix);
    url += url.indexOf('?') !== -1 ? '&access_token=' : '?access_token=';

    if (config.REQUIRE_ACCESS_TOKEN) {
        if (accessToken[0] === 's') {
            throw new Error('Use a public access token (pk.*) with Mapbox GL JS, not a secret access token (sk.*). ' +
                'See https://www.mapbox.com/developers/api/#access-tokens');
        }

        url += accessToken;
    }

    return url;
}

module.exports.normalizeStyleURL = function(url, accessToken) {
    var user = url.match(/^mapbox:\/\/([^.]+)/);
    if (!user)
        return url;

    return normalizeURL(url, '/styles/v1/' + user[1] + '/', accessToken);
};

module.exports.normalizeSourceURL = function(url, accessToken) {
    if (!url.match(/^mapbox:\/\//))
        return url;

    url = normalizeURL(url + '.json', '/v4/', accessToken);

    // TileJSON requests need a secure flag appended to their URLs so
    // that the server knows to send SSL-ified resource references.
    if (url.indexOf('https') === 0)
        url += '&secure';

    return url;
};

module.exports.normalizeGlyphsURL = function(url, accessToken) {
    if (!url.match(/^mapbox:\/\//))
        return url;

    return normalizeURL(url, '/v4/', accessToken);
};

module.exports.normalizeTileURL = function(url, sourceUrl) {
    if (!sourceUrl || !sourceUrl.match(/^mapbox:\/\//))
        return url;
    return url.replace(/\.((?:png|jpg)\d*)(?=$|\?)/, browser.devicePixelRatio >= 2 ? '@2x.$1' : '.$1');
};

},{"./browser":96,"./config":100}],105:[function(require,module,exports){
'use strict';

/*
 * A [most-recently-used cache](http://en.wikipedia.org/wiki/Cache_algorithms)
 * with hash lookup made possible by keeping a list of keys in parallel to
 * an array of dictionary of values
 */
module.exports = MRUCache;
function MRUCache(length, onRemove) {
    this.max = length;
    this.onRemove = onRemove;
    this.reset();
}

/*
 * Clears the cache
 */
MRUCache.prototype.reset = function() {
    for (var key in this.list) {
        this.onRemove(this.list[key]);
    }

    this.list = {};
    this.order = [];

    return this;
};

/*
 * Add a key, value combination to the cache, trimming its size if this pushes
 * it over max length.
 */
MRUCache.prototype.add = function(key, data) {
    this.list[key] = data;
    this.order.push(key);

    if (this.order.length > this.max) {
        var removedData = this.get(this.order[0]);
        if (removedData) this.onRemove(removedData);
    }

    return this;
};

/*
 * Determine whether the value attached to `key` is present
 */
MRUCache.prototype.has = function(key) {
    return key in this.list;
};

/*
 * List all keys in the cache
 */
MRUCache.prototype.keys = function() {
    return this.order;
};

/*
 * Get the value attached to a specific key. If the key is not found,
 * returns `null`
 */
MRUCache.prototype.get = function(key) {
    if (!this.has(key)) { return null; }

    var data = this.list[key];

    delete this.list[key];
    this.order.splice(this.order.indexOf(key), 1);

    return data;
};

},{}],106:[function(require,module,exports){
'use strict';

module.exports = resolveTokens;

function resolveTokens(properties, text) {
    return text.replace(/{([^{}()\[\]<>$=:;.,^]+)}/g, function(match, key) {
        return key in properties ? properties[key] : '';
    });
}

},{}],107:[function(require,module,exports){
'use strict';

var UnitBezier = require('unitbezier');

/**
 * Given a value `t` that varies between 0 and 1, return
 * an interpolation function that eases between 0 and 1 in a pleasing
 * cubic in-out fashion.
 *
 * @param {number} t input
 * @returns {number} input
 */
exports.easeCubicInOut = function (t) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    var t2 = t * t,
        t3 = t2 * t;
    return 4 * (t < 0.5 ? t3 : 3 * (t - t2) + t3 - 0.75);
};

/**
 * Given given (x, y), (x1, y1) control points for a bezier curve,
 * return a function that interpolates along that curve.
 *
 * @param {number} p1x control point 1 x coordinate
 * @param {number} p1y control point 1 y coordinate
 * @param {number} p2x control point 2 x coordinate
 * @param {number} p2y control point 2 y coordinate
 * @returns {Function} interpolator: receives number value, returns
 * number value.
 */
exports.bezier = function(p1x, p1y, p2x, p2y) {
    var bezier = new UnitBezier(p1x, p1y, p2x, p2y);
    return function(t) {
        return bezier.solve(t);
    };
};

/**
 * A default bezier-curve powered easing function with
 * control points (0.25, 0.1) and (0.25, 1)
 *
 * @param {number} t
 * @returns {number} output
 */
exports.ease = exports.bezier(0.25, 0.1, 0.25, 1);

/**
 * Given a four-element array of numbers that represents a color in
 * RGBA, return a version for which the RGB components are multiplied
 * by the A (alpha) component
 *
 * @param {Number<Array>} c color array
 * @returns {Number<Array>} premultiplied color array
 */
exports.premultiply = function (c) {
    c[0] *= c[3];
    c[1] *= c[3];
    c[2] *= c[3];
    return c;
};

/**
 * constrain n to the given range via min + max
 *
 * @param {Number} n value
 * @param {Number} min the minimum value to be returned
 * @param {Number} max the maximum value to be returned
 * @returns {Number} the clamped value
 */
exports.clamp = function (n, min, max) {
    return Math.min(max, Math.max(min, n));
};

/*
 * constrain n to the given range via modular arithmetic
 * @param {Number} n
 * @param {Number} min
 * @param {Number} max
 * @returns {Number} constrained number
 */
exports.wrap = function (n, min, max) {
    var d = max - min;
    return n === max ? n : ((n - min) % d + d) % d + min;
};

/*
 * return the first non-null and non-undefined argument to this function.
 * @returns {*} argument
 */
exports.coalesce = function() {
    for (var i = 0; i < arguments.length; i++) {
        var arg = arguments[i];
        if (arg !== null && arg !== undefined)
            return arg;
    }
};

/*
 * Call an asynchronous function on an array of arguments,
 * calling `callback` once all calls complete.
 *
 * @param {Array<*>} array input to each call of the async function.
 * @param {Function} fn an async function with signature (data, callback)
 * @param {Function} callback a callback run after all async work is done.
 * called with no arguments
 * @returns {undefined}
 */
exports.asyncEach = function (array, fn, callback) {
    var remaining = array.length;
    if (remaining === 0) return callback();
    function check() { if (--remaining === 0) callback(); }
    for (var i = 0; i < array.length; i++) fn(array[i], check);
};

/*
 * Compute the difference between the keys in one object and the keys
 * in another object.
 *
 * @param {Object} obj
 * @param {Object} other
 * @returns {Array<string>} keys difference
 */
exports.keysDifference = function (obj, other) {
    var difference = [];
    for (var i in obj) {
        if (!(i in other)) {
            difference.push(i);
        }
    }
    return difference;
};

/**
 * Given a destination object and optionally many source objects,
 * copy all properties from the source objects into the destination.
 * The last source object given overrides properties from previous
 * source objects.
 * @param {Object} dest destination object
 * @param {...Object} sources sources from which properties are pulled
 * @returns {Object} dest
 */
exports.extend = function (dest) {
    for (var i = 1; i < arguments.length; i++) {
        var src = arguments[i];
        for (var k in src) {
            dest[k] = src[k];
        }
    }
    return dest;
};

/**
 * Extend a destination object with all properties of the src object,
 * using defineProperty instead of simple assignment.
 * @param {Object} dest
 * @param {Object} src
 * @returns {Object} dest
 */
exports.extendAll = function (dest, src) {
    for (var i in src) {
        Object.defineProperty(dest, i, Object.getOwnPropertyDescriptor(src, i));
    }
    return dest;
};

/**
 * Extend a parent's prototype with all properties in a properties
 * object.
 *
 * @param {Object} parent
 * @param {Object} props
 * @returns {Object}
 */
exports.inherit = function (parent, props) {
    var parentProto = typeof parent === 'function' ? parent.prototype : parent,
        proto = Object.create(parentProto);
    exports.extendAll(proto, props);
    return proto;
};

/**
 * Given an object and a number of properties as strings, return version
 * of that object with only those properties.
 *
 * @param {Object} src the object
 * @param {Array<string>} properties an array of property names chosen
 * to appear on the resulting object.
 * @returns {Object} object with limited properties.
 * @example
 * var foo = { name: 'Charlie', age: 10 };
 * var justName = pick(foo, ['name']);
 * // justName = { name: 'Charlie' }
 */
exports.pick = function (src, properties) {
    var result = {};
    for (var i = 0; i < properties.length; i++) {
        var k = properties[i];
        if (k in src) {
            result[k] = src[k];
        }
    }
    return result;
};

var id = 1;

/**
 * Return a unique numeric id, starting at 1 and incrementing with
 * each call.
 *
 * @returns {Number} unique numeric id.
 */
exports.uniqueId = function () {
    return id++;
};

/**
 * Create a version of `fn` that only fires once every `time` millseconds.
 *
 * @param {Function} fn the function to be throttled
 * @param {Number} time millseconds required between function calls
 * @param {*} context the value of `this` with which the function is called
 * @returns {Function} debounced function
 */
exports.throttle = function (fn, time, context) {
    var lock, args, wrapperFn, later;

    later = function () {
        // reset lock and call if queued
        lock = false;
        if (args) {
            wrapperFn.apply(context, args);
            args = false;
        }
    };

    wrapperFn = function () {
        if (lock) {
            // called too soon, queue to call later
            args = arguments;

        } else {
            // call and lock until later
            fn.apply(context, arguments);
            setTimeout(later, time);
            lock = true;
        }
    };

    return wrapperFn;
};

/**
 * Create a version of `fn` that is only called `time` milliseconds
 * after its last invocation
 *
 * @param {Function} fn the function to be debounced
 * @param {Number} time millseconds after which the function will be invoked
 * @returns {Function} debounced function
 */
exports.debounce = function(fn, time) {
    var timer, args;

    return function() {
        args = arguments;
        clearTimeout(timer);

        timer = setTimeout(function() {
            fn.apply(null, args);
        }, time);
    };
};

/**
 * Given an array of member function names as strings, replace all of them
 * with bound versions that will always refer to `context` as `this`. This
 * is useful for classes where otherwise event bindings would reassign
 * `this` to the evented object or some other value: this lets you ensure
 * the `this` value always.
 *
 * @param {Array<string>} fns list of member function names
 * @param {*} context the context value
 * @returns {undefined} changes functions in-place
 * @example
 * function MyClass() {
 *   bindAll(['ontimer'], this);
 *   this.name = 'Tom';
 * }
 * MyClass.prototype.ontimer = function() {
 *   alert(this.name);
 * };
 * var myClass = new MyClass();
 * setTimeout(myClass.ontimer, 100);
 */
exports.bindAll = function(fns, context) {
    fns.forEach(function(fn) {
        context[fn] = context[fn].bind(context);
    });
};

/**
 * Set the 'options' property on `obj` with properties
 * from the `options` argument. Properties in the `options`
 * object will override existing properties.
 *
 * @param {Object} obj destination object
 * @param {Object} options object of override options
 * @returns {Object} derived options object.
 */
exports.setOptions = function(obj, options) {
    if (!obj.hasOwnProperty('options')) {
        obj.options = obj.options ? Object.create(obj.options) : {};
    }
    for (var i in options) {
        obj.options[i] = options[i];
    }
    return obj.options;
};

},{"unitbezier":126}],108:[function(require,module,exports){
// (c) Dean McNamee <dean@gmail.com>, 2012.
//
// https://github.com/deanm/css-color-parser-js
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.

// http://www.w3.org/TR/css3-color/
var kCSSColorTable = {
  "transparent": [0,0,0,0], "aliceblue": [240,248,255,1],
  "antiquewhite": [250,235,215,1], "aqua": [0,255,255,1],
  "aquamarine": [127,255,212,1], "azure": [240,255,255,1],
  "beige": [245,245,220,1], "bisque": [255,228,196,1],
  "black": [0,0,0,1], "blanchedalmond": [255,235,205,1],
  "blue": [0,0,255,1], "blueviolet": [138,43,226,1],
  "brown": [165,42,42,1], "burlywood": [222,184,135,1],
  "cadetblue": [95,158,160,1], "chartreuse": [127,255,0,1],
  "chocolate": [210,105,30,1], "coral": [255,127,80,1],
  "cornflowerblue": [100,149,237,1], "cornsilk": [255,248,220,1],
  "crimson": [220,20,60,1], "cyan": [0,255,255,1],
  "darkblue": [0,0,139,1], "darkcyan": [0,139,139,1],
  "darkgoldenrod": [184,134,11,1], "darkgray": [169,169,169,1],
  "darkgreen": [0,100,0,1], "darkgrey": [169,169,169,1],
  "darkkhaki": [189,183,107,1], "darkmagenta": [139,0,139,1],
  "darkolivegreen": [85,107,47,1], "darkorange": [255,140,0,1],
  "darkorchid": [153,50,204,1], "darkred": [139,0,0,1],
  "darksalmon": [233,150,122,1], "darkseagreen": [143,188,143,1],
  "darkslateblue": [72,61,139,1], "darkslategray": [47,79,79,1],
  "darkslategrey": [47,79,79,1], "darkturquoise": [0,206,209,1],
  "darkviolet": [148,0,211,1], "deeppink": [255,20,147,1],
  "deepskyblue": [0,191,255,1], "dimgray": [105,105,105,1],
  "dimgrey": [105,105,105,1], "dodgerblue": [30,144,255,1],
  "firebrick": [178,34,34,1], "floralwhite": [255,250,240,1],
  "forestgreen": [34,139,34,1], "fuchsia": [255,0,255,1],
  "gainsboro": [220,220,220,1], "ghostwhite": [248,248,255,1],
  "gold": [255,215,0,1], "goldenrod": [218,165,32,1],
  "gray": [128,128,128,1], "green": [0,128,0,1],
  "greenyellow": [173,255,47,1], "grey": [128,128,128,1],
  "honeydew": [240,255,240,1], "hotpink": [255,105,180,1],
  "indianred": [205,92,92,1], "indigo": [75,0,130,1],
  "ivory": [255,255,240,1], "khaki": [240,230,140,1],
  "lavender": [230,230,250,1], "lavenderblush": [255,240,245,1],
  "lawngreen": [124,252,0,1], "lemonchiffon": [255,250,205,1],
  "lightblue": [173,216,230,1], "lightcoral": [240,128,128,1],
  "lightcyan": [224,255,255,1], "lightgoldenrodyellow": [250,250,210,1],
  "lightgray": [211,211,211,1], "lightgreen": [144,238,144,1],
  "lightgrey": [211,211,211,1], "lightpink": [255,182,193,1],
  "lightsalmon": [255,160,122,1], "lightseagreen": [32,178,170,1],
  "lightskyblue": [135,206,250,1], "lightslategray": [119,136,153,1],
  "lightslategrey": [119,136,153,1], "lightsteelblue": [176,196,222,1],
  "lightyellow": [255,255,224,1], "lime": [0,255,0,1],
  "limegreen": [50,205,50,1], "linen": [250,240,230,1],
  "magenta": [255,0,255,1], "maroon": [128,0,0,1],
  "mediumaquamarine": [102,205,170,1], "mediumblue": [0,0,205,1],
  "mediumorchid": [186,85,211,1], "mediumpurple": [147,112,219,1],
  "mediumseagreen": [60,179,113,1], "mediumslateblue": [123,104,238,1],
  "mediumspringgreen": [0,250,154,1], "mediumturquoise": [72,209,204,1],
  "mediumvioletred": [199,21,133,1], "midnightblue": [25,25,112,1],
  "mintcream": [245,255,250,1], "mistyrose": [255,228,225,1],
  "moccasin": [255,228,181,1], "navajowhite": [255,222,173,1],
  "navy": [0,0,128,1], "oldlace": [253,245,230,1],
  "olive": [128,128,0,1], "olivedrab": [107,142,35,1],
  "orange": [255,165,0,1], "orangered": [255,69,0,1],
  "orchid": [218,112,214,1], "palegoldenrod": [238,232,170,1],
  "palegreen": [152,251,152,1], "paleturquoise": [175,238,238,1],
  "palevioletred": [219,112,147,1], "papayawhip": [255,239,213,1],
  "peachpuff": [255,218,185,1], "peru": [205,133,63,1],
  "pink": [255,192,203,1], "plum": [221,160,221,1],
  "powderblue": [176,224,230,1], "purple": [128,0,128,1],
  "red": [255,0,0,1], "rosybrown": [188,143,143,1],
  "royalblue": [65,105,225,1], "saddlebrown": [139,69,19,1],
  "salmon": [250,128,114,1], "sandybrown": [244,164,96,1],
  "seagreen": [46,139,87,1], "seashell": [255,245,238,1],
  "sienna": [160,82,45,1], "silver": [192,192,192,1],
  "skyblue": [135,206,235,1], "slateblue": [106,90,205,1],
  "slategray": [112,128,144,1], "slategrey": [112,128,144,1],
  "snow": [255,250,250,1], "springgreen": [0,255,127,1],
  "steelblue": [70,130,180,1], "tan": [210,180,140,1],
  "teal": [0,128,128,1], "thistle": [216,191,216,1],
  "tomato": [255,99,71,1], "turquoise": [64,224,208,1],
  "violet": [238,130,238,1], "wheat": [245,222,179,1],
  "white": [255,255,255,1], "whitesmoke": [245,245,245,1],
  "yellow": [255,255,0,1], "yellowgreen": [154,205,50,1]}

function clamp_css_byte(i) {  // Clamp to integer 0 .. 255.
  i = Math.round(i);  // Seems to be what Chrome does (vs truncation).
  return i < 0 ? 0 : i > 255 ? 255 : i;
}

function clamp_css_float(f) {  // Clamp to float 0.0 .. 1.0.
  return f < 0 ? 0 : f > 1 ? 1 : f;
}

function parse_css_int(str) {  // int or percentage.
  if (str[str.length - 1] === '%')
    return clamp_css_byte(parseFloat(str) / 100 * 255);
  return clamp_css_byte(parseInt(str));
}

function parse_css_float(str) {  // float or percentage.
  if (str[str.length - 1] === '%')
    return clamp_css_float(parseFloat(str) / 100);
  return clamp_css_float(parseFloat(str));
}

function css_hue_to_rgb(m1, m2, h) {
  if (h < 0) h += 1;
  else if (h > 1) h -= 1;

  if (h * 6 < 1) return m1 + (m2 - m1) * h * 6;
  if (h * 2 < 1) return m2;
  if (h * 3 < 2) return m1 + (m2 - m1) * (2/3 - h) * 6;
  return m1;
}

function parseCSSColor(css_str) {
  // Remove all whitespace, not compliant, but should just be more accepting.
  var str = css_str.replace(/ /g, '').toLowerCase();

  // Color keywords (and transparent) lookup.
  if (str in kCSSColorTable) return kCSSColorTable[str].slice();  // dup.

  // #abc and #abc123 syntax.
  if (str[0] === '#') {
    if (str.length === 4) {
      var iv = parseInt(str.substr(1), 16);  // TODO(deanm): Stricter parsing.
      if (!(iv >= 0 && iv <= 0xfff)) return null;  // Covers NaN.
      return [((iv & 0xf00) >> 4) | ((iv & 0xf00) >> 8),
              (iv & 0xf0) | ((iv & 0xf0) >> 4),
              (iv & 0xf) | ((iv & 0xf) << 4),
              1];
    } else if (str.length === 7) {
      var iv = parseInt(str.substr(1), 16);  // TODO(deanm): Stricter parsing.
      if (!(iv >= 0 && iv <= 0xffffff)) return null;  // Covers NaN.
      return [(iv & 0xff0000) >> 16,
              (iv & 0xff00) >> 8,
              iv & 0xff,
              1];
    }

    return null;
  }

  var op = str.indexOf('('), ep = str.indexOf(')');
  if (op !== -1 && ep + 1 === str.length) {
    var fname = str.substr(0, op);
    var params = str.substr(op+1, ep-(op+1)).split(',');
    var alpha = 1;  // To allow case fallthrough.
    switch (fname) {
      case 'rgba':
        if (params.length !== 4) return null;
        alpha = parse_css_float(params.pop());
        // Fall through.
      case 'rgb':
        if (params.length !== 3) return null;
        return [parse_css_int(params[0]),
                parse_css_int(params[1]),
                parse_css_int(params[2]),
                alpha];
      case 'hsla':
        if (params.length !== 4) return null;
        alpha = parse_css_float(params.pop());
        // Fall through.
      case 'hsl':
        if (params.length !== 3) return null;
        var h = (((parseFloat(params[0]) % 360) + 360) % 360) / 360;  // 0 .. 1
        // NOTE(deanm): According to the CSS spec s/l should only be
        // percentages, but we don't bother and let float or percentage.
        var s = parse_css_float(params[1]);
        var l = parse_css_float(params[2]);
        var m2 = l <= 0.5 ? l * (s + 1) : l + s - l * s;
        var m1 = l * 2 - m2;
        return [clamp_css_byte(css_hue_to_rgb(m1, m2, h+1/3) * 255),
                clamp_css_byte(css_hue_to_rgb(m1, m2, h) * 255),
                clamp_css_byte(css_hue_to_rgb(m1, m2, h-1/3) * 255),
                alpha];
      default:
        return null;
    }
  }

  return null;
}

try { exports.parseCSSColor = parseCSSColor } catch(e) { }

},{}],109:[function(require,module,exports){
'use strict';

var VectorTileFeatureTypes = ['Unknown', 'Point', 'LineString', 'Polygon'];

function infix(operator) {
    return function(_, key, value) {
        if (key === '$type') {
            return 't' + operator + VectorTileFeatureTypes.indexOf(value);
        } else {
            return 'p[' + JSON.stringify(key) + ']' + operator + JSON.stringify(value);
        }
    };
}

function strictInfix(operator) {
    var nonstrictInfix = infix(operator);
    return function(_, key, value) {
        if (key === '$type') {
            return nonstrictInfix(_, key, value);
        } else {
            return 'typeof(p[' + JSON.stringify(key) + ']) === typeof(' + JSON.stringify(value) + ') && ' +
                nonstrictInfix(_, key, value);
        }
    };
}

var operators = {
    '==': infix('==='),
    '!=': infix('!=='),
    '>': strictInfix('>'),
    '<': strictInfix('<'),
    '<=': strictInfix('<='),
    '>=': strictInfix('>='),
    'in': function(_, key) {
        return Array.prototype.slice.call(arguments, 2).map(function(value) {
            return '(' + operators['=='](_, key, value) + ')';
        }).join('||') || 'false';
    },
    '!in': function() {
        return '!(' + operators.in.apply(this, arguments) + ')';
    },
    'any': function() {
        return Array.prototype.slice.call(arguments, 1).map(function(filter) {
            return '(' + compile(filter) + ')';
        }).join('||') || 'false';
    },
    'all': function() {
        return Array.prototype.slice.call(arguments, 1).map(function(filter) {
            return '(' + compile(filter) + ')';
        }).join('&&') || 'true';
    },
    'none': function() {
        return '!(' + operators.any.apply(this, arguments) + ')';
    }
};

function compile(filter) {
    return operators[filter[0]].apply(filter, filter);
}

function truth() {
    return true;
}

/**
 * Given a filter expressed as nested arrays, return a new function
 * that evaluates whether a given feature (with a .properties or .tags property)
 * passes its test.
 *
 * @param {Array} filter mapbox gl filter
 * @returns {Function} filter-evaluating function
 */
module.exports = function (filter) {
    if (!filter) return truth;
    var filterStr = 'var p = f.properties || f.tags || {}, t = f.type; return ' + compile(filter) + ';';
    // jshint evil: true
    return new Function('f', filterStr);
};

},{}],110:[function(require,module,exports){
'use strict';

module.exports = clip;

/* clip features between two axis-parallel lines:
 *     |        |
 *  ___|___     |     /
 * /   |   \____|____/
 *     |        |
 */

function clip(features, scale, k1, k2, axis, intersect) {

    k1 /= scale;
    k2 /= scale;

    var clipped = [];

    for (var i = 0; i < features.length; i++) {

        var feature = features[i],
            geometry = feature.geometry,
            type = feature.type,
            min, max;

        if (feature.min) {
            min = feature.min[axis];
            max = feature.max[axis];

            if (min >= k1 && max <= k2) { // trivial accept
                clipped.push(feature);
                continue;
            } else if (min > k2 || max < k1) continue; // trivial reject
        }

        var slices = type === 1 ?
                clipPoints(geometry, k1, k2, axis) :
                clipGeometry(geometry, k1, k2, axis, intersect, type === 3);

        if (slices.length) {
            // if a feature got clipped, it will likely get clipped on the next zoom level as well,
            // so there's no need to recalculate bboxes
            clipped.push({
                geometry: slices,
                type: type,
                tags: features[i].tags || null
            });
        }
    }

    return clipped.length ? clipped : null;
}

function clipPoints(geometry, k1, k2, axis) {
    var slice = [];

    for (var i = 0; i < geometry.length; i++) {
        var a = geometry[i],
            ak = a[axis];

        if (ak >= k1 && ak <= k2) slice.push(a);
    }
    return slice;
}

function clipGeometry(geometry, k1, k2, axis, intersect, closed) {

    var slices = [];

    for (var i = 0; i < geometry.length; i++) {

        var ak = 0,
            bk = 0,
            b = null,
            points = geometry[i],
            area = points.area,
            dist = points.dist,
            len = points.length,
            a, j;

        var slice = [];

        for (j = 0; j < len - 1; j++) {
            a = b || points[j];
            b = points[j + 1];
            ak = bk || a[axis];
            bk = b[axis];

            if (ak < k1) {

                if ((bk > k2)) { // ---|-----|-->
                    slice.push(intersect(a, b, k1), intersect(a, b, k2));
                    if (!closed) slice = newSlice(slices, slice, area, dist);

                } else if (bk >= k1) slice.push(intersect(a, b, k1)); // ---|-->  |

            } else if (ak > k2) {

                if ((bk < k1)) { // <--|-----|---
                    slice.push(intersect(a, b, k2), intersect(a, b, k1));
                    if (!closed) slice = newSlice(slices, slice, area, dist);

                } else if (bk <= k2) slice.push(intersect(a, b, k2)); // |  <--|---

            } else {

                slice.push(a);

                if (bk < k1) { // <--|---  |
                    slice.push(intersect(a, b, k1));
                    if (!closed) slice = newSlice(slices, slice, area, dist);

                } else if (bk > k2) { // |  ---|-->
                    slice.push(intersect(a, b, k2));
                    if (!closed) slice = newSlice(slices, slice, area, dist);
                }
                // | --> |
            }
        }

        // add the last point
        a = points[len - 1];
        ak = a[axis];
        if (ak >= k1 && ak <= k2) slice.push(a);

        // close the polygon if its endpoints are not the same after clipping
        if (closed && slice[0] !== slice[slice.length - 1]) slice.push(slice[0]);

        // add the final slice
        newSlice(slices, slice, area, dist);
    }

    return slices;
}

function newSlice(slices, slice, area, dist) {
    if (slice.length) {
        // we don't recalculate the area/length of the unclipped geometry because the case where it goes
        // below the visibility threshold as a result of clipping is rare, so we avoid doing unnecessary work
        slice.area = area;
        slice.dist = dist;

        slices.push(slice);
    }
    return [];
}

},{}],111:[function(require,module,exports){
'use strict';

module.exports = convert;

var simplify = require('./simplify');

// converts GeoJSON feature into an intermediate projected JSON vector format with simplification data

function convert(data, tolerance) {
    var features = [];

    if (data.type === 'FeatureCollection') {
        for (var i = 0; i < data.features.length; i++) {
            convertFeature(features, data.features[i], tolerance);
        }
    } else if (data.type === 'Feature') {
        convertFeature(features, data, tolerance);

    } else {
        // single geometry or a geometry collection
        convertFeature(features, {geometry: data}, tolerance);
    }
    return features;
}

function convertFeature(features, feature, tolerance) {
    var geom = feature.geometry,
        type = geom.type,
        coords = geom.coordinates,
        tags = feature.properties,
        i, j, rings;

    if (type === 'Point') {
        features.push(create(tags, 1, [projectPoint(coords)]));

    } else if (type === 'MultiPoint') {
        features.push(create(tags, 1, project(coords)));

    } else if (type === 'LineString') {
        features.push(create(tags, 2, [project(coords, tolerance)]));

    } else if (type === 'MultiLineString' || type === 'Polygon') {
        rings = [];
        for (i = 0; i < coords.length; i++) {
            rings.push(project(coords[i], tolerance));
        }
        features.push(create(tags, type === 'Polygon' ? 3 : 2, rings));

    } else if (type === 'MultiPolygon') {
        rings = [];
        for (i = 0; i < coords.length; i++) {
            for (j = 0; j < coords[i].length; j++) {
                rings.push(project(coords[i][j], tolerance));
            }
        }
        features.push(create(tags, 3, rings));

    } else if (type === 'GeometryCollection') {
        for (i = 0; i < geom.geometries.length; i++) {
            convertFeature(features, {
                geometry: geom.geometries[i],
                properties: tags
            }, tolerance);
        }

    } else {
        console.warn('Unsupported GeoJSON type: ' + geom.type);
    }
}

function create(tags, type, geometry) {
    var feature = {
        geometry: geometry,
        type: type,
        tags: tags || null,
        min: [1, 1], // initial bbox values;
        max: [0, 0]  // note that all coords are in [0..1] range
    };
    calcBBox(feature);
    return feature;
}

function project(lonlats, tolerance) {
    var projected = [];
    for (var i = 0; i < lonlats.length; i++) {
        projected.push(projectPoint(lonlats[i]));
    }
    if (tolerance) {
        simplify(projected, tolerance);
        calcSize(projected);
    }
    return projected;
}

function projectPoint(p) {
    var sin = Math.sin(p[1] * Math.PI / 180),
        x = (p[0] / 360 + 0.5),
        y = (0.5 - 0.25 * Math.log((1 + sin) / (1 - sin)) / Math.PI);
    return [x, y, 0];
}

// calculate area and length of the poly
function calcSize(points) {
    var area = 0,
        dist = 0;

    for (var i = 0, a, b; i < points.length - 1; i++) {
        a = b || points[i];
        b = points[i + 1];

        area += a[0] * b[1] - b[0] * a[1];

        // use Manhattan distance instead of Euclidian one to avoid expensive square root computation
        dist += Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
    }
    points.area = Math.abs(area / 2);
    points.dist = dist;
}

// calculate the feature bounding box for faster clipping later
function calcBBox(feature) {
    var geometry = feature.geometry,
        min = feature.min,
        max = feature.max;

    if (feature.type === 1) calcRingBBox(min, max, geometry);
    else for (var i = 0; i < geometry.length; i++) calcRingBBox(min, max, geometry[i]);

    return feature;
}

function calcRingBBox(min, max, points) {
    for (var i = 0, p; i < points.length; i++) {
        p = points[i];
        min[0] = Math.min(p[0], min[0]);
        max[0] = Math.max(p[0], max[0]);
        min[1] = Math.min(p[1], min[1]);
        max[1] = Math.max(p[1], max[1]);
    }
}

},{"./simplify":113}],112:[function(require,module,exports){
'use strict';

module.exports = geojsonvt;

var convert = require('./convert'), // GeoJSON conversion and preprocessing
    clip = require('./clip'),       // stripe clipping algorithm
    createTile = require('./tile'); // final simplified tile generation


function geojsonvt(data, options) {
    return new GeoJSONVT(data, options);
}

function GeoJSONVT(data, options) {
    options = this.options = extend(Object.create(this.options), options);

    var debug = options.debug;

    if (debug) console.time('preprocess data');

    var z2 = 1 << options.baseZoom, // 2^z
        features = convert(data, options.tolerance / (z2 * options.extent));

    this.tiles = {};

    if (debug) {
        console.timeEnd('preprocess data');
        console.time('generate tiles up to z' + options.maxZoom);
        this.stats = {};
        this.total = 0;
    }

    // start slicing from the top tile down
    this.splitTile(features, 0, 0, 0);

    if (debug) {
        console.log('features: %d, points: %d', this.tiles[0].numFeatures, this.tiles[0].numPoints);
        console.timeEnd('generate tiles up to z' + options.maxZoom);
        console.log('tiles generated:', this.total, JSON.stringify(this.stats));
    }
}

GeoJSONVT.prototype.options = {
    baseZoom: 14,   // max zoom to preserve detail on
    maxZoom: 4,     // zoom to slice down to on first pass
    maxPoints: 100, // stop slicing a tile below this number of points
    tolerance: 3,   // simplification tolerance (higher means simpler)
    extent: 4096,   // tile extent
    buffer: 64,     // tile buffer on each side
    debug: 0        // logging level (0, 1 or 2)
};

GeoJSONVT.prototype.splitTile = function (features, z, x, y, cz, cx, cy) {

    var stack = [features, z, x, y],
        options = this.options,
        debug = options.debug,
        extent = options.extent,
        buffer = options.buffer;

    // avoid recursion by using a processing queue
    while (stack.length) {
        features = stack.shift();
        z = stack.shift();
        x = stack.shift();
        y = stack.shift();

        var z2 = 1 << z,
            id = toID(z, x, y),
            tile = this.tiles[id],
            tileTolerance = z === options.baseZoom ? 0 : options.tolerance / (z2 * extent);

        if (!tile) {
            if (debug > 1) console.time('creation');

            tile = this.tiles[id] = createTile(features, z2, x, y, tileTolerance, extent, z === options.baseZoom);

            if (debug) {
                if (debug > 1) {
                    console.log('tile z%d-%d-%d (features: %d, points: %d, simplified: %d)',
                        z, x, y, tile.numFeatures, tile.numPoints, tile.numSimplified);
                    console.timeEnd('creation');
                }
                var key = 'z' + z + ':';
                this.stats[key] = (this.stats[key] || 0) + 1;
                this.total++;
            }
        }

        if (!cz && (z === options.maxZoom || tile.numPoints <= options.maxPoints ||
                isClippedSquare(tile.features, extent, buffer)) || z === options.baseZoom || z === cz) {
            tile.source = features;
            continue; // stop tiling
        }

        if (cz) tile.source = features;
        else tile.source = null;

        if (debug > 1) console.time('clipping');

        // values we'll use for clipping
        var k1 = 0.5 * buffer / extent,
            k2 = 0.5 - k1,
            k3 = 0.5 + k1,
            k4 = 1 + k1,

            tl, bl, tr, br, left, right,
            m, goLeft, goTop;

        if (cz) { // if we have a specific tile to drill down to, calculate where to go
            m = 1 << (cz - z);
            goLeft = cx / m - x < 0.5;
            goTop = cy / m - y < 0.5;
        }

        tl = bl = tr = br = left = right = null;

        if (!cz ||  goLeft) left  = clip(features, z2, x - k1, x + k3, 0, intersectX);
        if (!cz || !goLeft) right = clip(features, z2, x + k2, x + k4, 0, intersectX);

        if (left) {
            if (!cz ||  goTop) tl = clip(left, z2, y - k1, y + k3, 1, intersectY);
            if (!cz || !goTop) bl = clip(left, z2, y + k2, y + k4, 1, intersectY);
        }

        if (right) {
            if (!cz ||  goTop) tr = clip(right, z2, y - k1, y + k3, 1, intersectY);
            if (!cz || !goTop) br = clip(right, z2, y + k2, y + k4, 1, intersectY);
        }

        if (debug > 1) console.timeEnd('clipping');

        if (tl) stack.push(tl, z + 1, x * 2,     y * 2);
        if (bl) stack.push(bl, z + 1, x * 2,     y * 2 + 1);
        if (tr) stack.push(tr, z + 1, x * 2 + 1, y * 2);
        if (br) stack.push(br, z + 1, x * 2 + 1, y * 2 + 1);
    }
};

GeoJSONVT.prototype.getTile = function (z, x, y) {
    var id = toID(z, x, y);
    if (this.tiles[id]) return this.tiles[id];

    var options = this.options,
        debug = options.debug;

    if (debug > 1) console.log('drilling down to z%d-%d-%d', z, x, y);

    var z0 = z,
        x0 = x,
        y0 = y,
        parent;

    while (!parent && z0 > 0) {
        z0--;
        x0 = Math.floor(x0 / 2);
        y0 = Math.floor(y0 / 2);
        parent = this.tiles[toID(z0, x0, y0)];
    }

    if (debug > 1) console.log('found parent tile z%d-%d-%d', z0, x0, y0);

    // if we found a parent tile containing the original geometry, we can drill down from it
    if (parent.source) {
        if (isClippedSquare(parent.features, options.extent, options.buffer)) return parent;

        if (debug) console.time('drilling down');
        this.splitTile(parent.source, z0, x0, y0, z, x, y);
        if (debug) console.timeEnd('drilling down');
    }

    return this.tiles[id];
};

// checks whether a tile is a whole-area fill after clipping; if it is, there's no sense slicing it further
function isClippedSquare(features, extent, buffer) {
    if (features.length !== 1) return false;

    var feature = features[0];
    if (feature.type !== 3 || feature.geometry.length > 1) return false;

    for (var i = 0; i < feature.geometry[0].length; i++) {
        var p = feature.geometry[0][i];
        if ((p[0] !== -buffer && p[0] !== extent + buffer) ||
            (p[1] !== -buffer && p[1] !== extent + buffer)) return false;
    }
    return true;
}

function toID(z, x, y) {
    return (((1 << z) * y + x) * 32) + z;
}

function intersectX(a, b, x) {
    return [x, (x - a[0]) * (b[1] - a[1]) / (b[0] - a[0]) + a[1], 1];
}
function intersectY(a, b, y) {
    return [(y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]) + a[0], y, 1];
}

function extend(dest, src) {
    for (var i in src) dest[i] = src[i];
    return dest;
}

},{"./clip":110,"./convert":111,"./tile":114}],113:[function(require,module,exports){
'use strict';

module.exports = simplify;

// calculate simplification data using optimized Douglas-Peucker algorithm

function simplify(points, tolerance) {

    var sqTolerance = tolerance * tolerance,
        len = points.length,
        first = 0,
        last = len - 1,
        stack = [],
        i, maxSqDist, sqDist, index;

    // always retain the endpoints (1 is the max value)
    points[first][2] = 1;
    points[last][2] = 1;

    // avoid recursion by using a stack
    while (last) {

        maxSqDist = 0;

        for (i = first + 1; i < last; i++) {
            sqDist = getSqSegDist(points[i], points[first], points[last]);

            if (sqDist > maxSqDist) {
                index = i;
                maxSqDist = sqDist;
            }
        }

        if (maxSqDist > sqTolerance) {
            points[index][2] = maxSqDist; // save the point importance in squared pixels as a z coordinate
            stack.push(first, index, index, last);
        }

        last = stack.pop();
        first = stack.pop();
    }
}

// square distance from a point to a segment
function getSqSegDist(p, a, b) {

    var x = a[0], y = a[1],
        bx = b[0], by = b[1],
        px = p[0], py = p[1],
        dx = bx - x,
        dy = by - y;

    if (dx !== 0 || dy !== 0) {

        var t = ((px - x) * dx + (py - y) * dy) / (dx * dx + dy * dy);

        if (t > 1) {
            x = bx;
            y = by;

        } else if (t > 0) {
            x += dx * t;
            y += dy * t;
        }
    }

    dx = px - x;
    dy = py - y;

    return dx * dx + dy * dy;
}

},{}],114:[function(require,module,exports){
'use strict';

module.exports = createTile;

function createTile(features, z2, tx, ty, tolerance, extent, noSimplify) {
    var tile = {
        features: [],
        numPoints: 0,
        numSimplified: 0,
        numFeatures: 0,
        source: null
    };
    for (var i = 0; i < features.length; i++) {
        tile.numFeatures++;
        addFeature(tile, features[i], z2, tx, ty, tolerance, extent, noSimplify);
    }
    return tile;
}

function addFeature(tile, feature, z2, tx, ty, tolerance, extent, noSimplify) {

    var geom = feature.geometry,
        type = feature.type,
        transformed = [],
        sqTolerance = tolerance * tolerance,
        i, j, ring, p;

    if (type === 1) {
        for (i = 0; i < geom.length; i++) {
            transformed.push(transformPoint(geom[i], z2, tx, ty, extent));
            tile.numPoints++;
            tile.numSimplified++;
        }

    } else {

        // simplify and transform projected coordinates for tile geometry
        for (i = 0; i < geom.length; i++) {
            ring = geom[i];

            // filter out tiny polylines & polygons
            if (!noSimplify && ((type === 2 && ring.dist < tolerance) ||
                                (type === 3 && ring.area < sqTolerance))) {
                tile.numPoints += ring.length;
                continue;
            }

            var transformedRing = [];

            for (j = 0; j < ring.length; j++) {
                p = ring[j];
                // keep points with importance > tolerance
                if (noSimplify || p[2] > sqTolerance) {
                    transformedRing.push(transformPoint(p, z2, tx, ty, extent));
                    tile.numSimplified++;
                }
                tile.numPoints++;
            }

            transformed.push(transformedRing);
        }
    }

    if (transformed.length) {
        tile.features.push({
            geometry: transformed,
            type: type,
            tags: feature.tags || null
        });
    }
}

function transformPoint(p, z2, tx, ty, extent) {
    var x = Math.round(extent * (p[0] * z2 - tx)),
        y = Math.round(extent * (p[1] * z2 - ty));
    return [x, y];
}

},{}],115:[function(require,module,exports){
/**
 * @fileoverview gl-matrix - High performance matrix and vector operations
 * @author Brandon Jones
 * @author Colin MacKenzie IV
 * @version 2.2.1
 */

/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */


(function(_global) {
  "use strict";

  var shim = {};
  if (typeof(exports) === 'undefined') {
    if(typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
      shim.exports = {};
      define(function() {
        return shim.exports;
      });
    } else {
      // gl-matrix lives in a browser, define its namespaces in global
      shim.exports = typeof(window) !== 'undefined' ? window : _global;
    }
  }
  else {
    // gl-matrix lives in commonjs, define its namespaces in exports
    shim.exports = exports;
  }

  (function(exports) {
    /* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation 
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */


if(!GLMAT_EPSILON) {
    var GLMAT_EPSILON = 0.000001;
}

if(!GLMAT_ARRAY_TYPE) {
    var GLMAT_ARRAY_TYPE = (typeof Float32Array !== 'undefined') ? Float32Array : Array;
}

if(!GLMAT_RANDOM) {
    var GLMAT_RANDOM = Math.random;
}

/**
 * @class Common utilities
 * @name glMatrix
 */
var glMatrix = {};

/**
 * Sets the type of array used when creating new vectors and matricies
 *
 * @param {Type} type Array type, such as Float32Array or Array
 */
glMatrix.setMatrixArrayType = function(type) {
    GLMAT_ARRAY_TYPE = type;
}

if(typeof(exports) !== 'undefined') {
    exports.glMatrix = glMatrix;
}

var degree = Math.PI / 180;

/**
* Convert Degree To Radian
*
* @param {Number} Angle in Degrees
*/
glMatrix.toRadian = function(a){
     return a * degree;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation 
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 2 Dimensional Vector
 * @name vec2
 */

var vec2 = {};

/**
 * Creates a new, empty vec2
 *
 * @returns {vec2} a new 2D vector
 */
vec2.create = function() {
    var out = new GLMAT_ARRAY_TYPE(2);
    out[0] = 0;
    out[1] = 0;
    return out;
};

/**
 * Creates a new vec2 initialized with values from an existing vector
 *
 * @param {vec2} a vector to clone
 * @returns {vec2} a new 2D vector
 */
vec2.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(2);
    out[0] = a[0];
    out[1] = a[1];
    return out;
};

/**
 * Creates a new vec2 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @returns {vec2} a new 2D vector
 */
vec2.fromValues = function(x, y) {
    var out = new GLMAT_ARRAY_TYPE(2);
    out[0] = x;
    out[1] = y;
    return out;
};

/**
 * Copy the values from one vec2 to another
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the source vector
 * @returns {vec2} out
 */
vec2.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    return out;
};

/**
 * Set the components of a vec2 to the given values
 *
 * @param {vec2} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @returns {vec2} out
 */
vec2.set = function(out, x, y) {
    out[0] = x;
    out[1] = y;
    return out;
};

/**
 * Adds two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.add = function(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    return out;
};

/**
 * Subtracts vector b from vector a
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.subtract = function(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    return out;
};

/**
 * Alias for {@link vec2.subtract}
 * @function
 */
vec2.sub = vec2.subtract;

/**
 * Multiplies two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.multiply = function(out, a, b) {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    return out;
};

/**
 * Alias for {@link vec2.multiply}
 * @function
 */
vec2.mul = vec2.multiply;

/**
 * Divides two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.divide = function(out, a, b) {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    return out;
};

/**
 * Alias for {@link vec2.divide}
 * @function
 */
vec2.div = vec2.divide;

/**
 * Returns the minimum of two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.min = function(out, a, b) {
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    return out;
};

/**
 * Returns the maximum of two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.max = function(out, a, b) {
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    return out;
};

/**
 * Scales a vec2 by a scalar number
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec2} out
 */
vec2.scale = function(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    return out;
};

/**
 * Adds two vec2's after scaling the second operand by a scalar value
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec2} out
 */
vec2.scaleAndAdd = function(out, a, b, scale) {
    out[0] = a[0] + (b[0] * scale);
    out[1] = a[1] + (b[1] * scale);
    return out;
};

/**
 * Calculates the euclidian distance between two vec2's
 *
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {Number} distance between a and b
 */
vec2.distance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1];
    return Math.sqrt(x*x + y*y);
};

/**
 * Alias for {@link vec2.distance}
 * @function
 */
vec2.dist = vec2.distance;

/**
 * Calculates the squared euclidian distance between two vec2's
 *
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {Number} squared distance between a and b
 */
vec2.squaredDistance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1];
    return x*x + y*y;
};

/**
 * Alias for {@link vec2.squaredDistance}
 * @function
 */
vec2.sqrDist = vec2.squaredDistance;

/**
 * Calculates the length of a vec2
 *
 * @param {vec2} a vector to calculate length of
 * @returns {Number} length of a
 */
vec2.length = function (a) {
    var x = a[0],
        y = a[1];
    return Math.sqrt(x*x + y*y);
};

/**
 * Alias for {@link vec2.length}
 * @function
 */
vec2.len = vec2.length;

/**
 * Calculates the squared length of a vec2
 *
 * @param {vec2} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */
vec2.squaredLength = function (a) {
    var x = a[0],
        y = a[1];
    return x*x + y*y;
};

/**
 * Alias for {@link vec2.squaredLength}
 * @function
 */
vec2.sqrLen = vec2.squaredLength;

/**
 * Negates the components of a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a vector to negate
 * @returns {vec2} out
 */
vec2.negate = function(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    return out;
};

/**
 * Normalize a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a vector to normalize
 * @returns {vec2} out
 */
vec2.normalize = function(out, a) {
    var x = a[0],
        y = a[1];
    var len = x*x + y*y;
    if (len > 0) {
        //TODO: evaluate use of glm_invsqrt here?
        len = 1 / Math.sqrt(len);
        out[0] = a[0] * len;
        out[1] = a[1] * len;
    }
    return out;
};

/**
 * Calculates the dot product of two vec2's
 *
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {Number} dot product of a and b
 */
vec2.dot = function (a, b) {
    return a[0] * b[0] + a[1] * b[1];
};

/**
 * Computes the cross product of two vec2's
 * Note that the cross product must by definition produce a 3D vector
 *
 * @param {vec3} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec3} out
 */
vec2.cross = function(out, a, b) {
    var z = a[0] * b[1] - a[1] * b[0];
    out[0] = out[1] = 0;
    out[2] = z;
    return out;
};

/**
 * Performs a linear interpolation between two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {vec2} out
 */
vec2.lerp = function (out, a, b, t) {
    var ax = a[0],
        ay = a[1];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    return out;
};

/**
 * Generates a random vector with the given scale
 *
 * @param {vec2} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec2} out
 */
vec2.random = function (out, scale) {
    scale = scale || 1.0;
    var r = GLMAT_RANDOM() * 2.0 * Math.PI;
    out[0] = Math.cos(r) * scale;
    out[1] = Math.sin(r) * scale;
    return out;
};

/**
 * Transforms the vec2 with a mat2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to transform
 * @param {mat2} m matrix to transform with
 * @returns {vec2} out
 */
vec2.transformMat2 = function(out, a, m) {
    var x = a[0],
        y = a[1];
    out[0] = m[0] * x + m[2] * y;
    out[1] = m[1] * x + m[3] * y;
    return out;
};

/**
 * Transforms the vec2 with a mat2d
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to transform
 * @param {mat2d} m matrix to transform with
 * @returns {vec2} out
 */
vec2.transformMat2d = function(out, a, m) {
    var x = a[0],
        y = a[1];
    out[0] = m[0] * x + m[2] * y + m[4];
    out[1] = m[1] * x + m[3] * y + m[5];
    return out;
};

/**
 * Transforms the vec2 with a mat3
 * 3rd vector component is implicitly '1'
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to transform
 * @param {mat3} m matrix to transform with
 * @returns {vec2} out
 */
vec2.transformMat3 = function(out, a, m) {
    var x = a[0],
        y = a[1];
    out[0] = m[0] * x + m[3] * y + m[6];
    out[1] = m[1] * x + m[4] * y + m[7];
    return out;
};

/**
 * Transforms the vec2 with a mat4
 * 3rd vector component is implicitly '0'
 * 4th vector component is implicitly '1'
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to transform
 * @param {mat4} m matrix to transform with
 * @returns {vec2} out
 */
vec2.transformMat4 = function(out, a, m) {
    var x = a[0], 
        y = a[1];
    out[0] = m[0] * x + m[4] * y + m[12];
    out[1] = m[1] * x + m[5] * y + m[13];
    return out;
};

/**
 * Perform some operation over an array of vec2s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec2. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec2s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */
vec2.forEach = (function() {
    var vec = vec2.create();

    return function(a, stride, offset, count, fn, arg) {
        var i, l;
        if(!stride) {
            stride = 2;
        }

        if(!offset) {
            offset = 0;
        }
        
        if(count) {
            l = Math.min((count * stride) + offset, a.length);
        } else {
            l = a.length;
        }

        for(i = offset; i < l; i += stride) {
            vec[0] = a[i]; vec[1] = a[i+1];
            fn(vec, vec, arg);
            a[i] = vec[0]; a[i+1] = vec[1];
        }
        
        return a;
    };
})();

/**
 * Returns a string representation of a vector
 *
 * @param {vec2} vec vector to represent as a string
 * @returns {String} string representation of the vector
 */
vec2.str = function (a) {
    return 'vec2(' + a[0] + ', ' + a[1] + ')';
};

if(typeof(exports) !== 'undefined') {
    exports.vec2 = vec2;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation 
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 3 Dimensional Vector
 * @name vec3
 */

var vec3 = {};

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */
vec3.create = function() {
    var out = new GLMAT_ARRAY_TYPE(3);
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    return out;
};

/**
 * Creates a new vec3 initialized with values from an existing vector
 *
 * @param {vec3} a vector to clone
 * @returns {vec3} a new 3D vector
 */
vec3.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(3);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    return out;
};

/**
 * Creates a new vec3 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} a new 3D vector
 */
vec3.fromValues = function(x, y, z) {
    var out = new GLMAT_ARRAY_TYPE(3);
    out[0] = x;
    out[1] = y;
    out[2] = z;
    return out;
};

/**
 * Copy the values from one vec3 to another
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the source vector
 * @returns {vec3} out
 */
vec3.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    return out;
};

/**
 * Set the components of a vec3 to the given values
 *
 * @param {vec3} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} out
 */
vec3.set = function(out, x, y, z) {
    out[0] = x;
    out[1] = y;
    out[2] = z;
    return out;
};

/**
 * Adds two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.add = function(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    return out;
};

/**
 * Subtracts vector b from vector a
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.subtract = function(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    return out;
};

/**
 * Alias for {@link vec3.subtract}
 * @function
 */
vec3.sub = vec3.subtract;

/**
 * Multiplies two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.multiply = function(out, a, b) {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    out[2] = a[2] * b[2];
    return out;
};

/**
 * Alias for {@link vec3.multiply}
 * @function
 */
vec3.mul = vec3.multiply;

/**
 * Divides two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.divide = function(out, a, b) {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    out[2] = a[2] / b[2];
    return out;
};

/**
 * Alias for {@link vec3.divide}
 * @function
 */
vec3.div = vec3.divide;

/**
 * Returns the minimum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.min = function(out, a, b) {
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    out[2] = Math.min(a[2], b[2]);
    return out;
};

/**
 * Returns the maximum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.max = function(out, a, b) {
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    out[2] = Math.max(a[2], b[2]);
    return out;
};

/**
 * Scales a vec3 by a scalar number
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec3} out
 */
vec3.scale = function(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    return out;
};

/**
 * Adds two vec3's after scaling the second operand by a scalar value
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec3} out
 */
vec3.scaleAndAdd = function(out, a, b, scale) {
    out[0] = a[0] + (b[0] * scale);
    out[1] = a[1] + (b[1] * scale);
    out[2] = a[2] + (b[2] * scale);
    return out;
};

/**
 * Calculates the euclidian distance between two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} distance between a and b
 */
vec3.distance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2];
    return Math.sqrt(x*x + y*y + z*z);
};

/**
 * Alias for {@link vec3.distance}
 * @function
 */
vec3.dist = vec3.distance;

/**
 * Calculates the squared euclidian distance between two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} squared distance between a and b
 */
vec3.squaredDistance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2];
    return x*x + y*y + z*z;
};

/**
 * Alias for {@link vec3.squaredDistance}
 * @function
 */
vec3.sqrDist = vec3.squaredDistance;

/**
 * Calculates the length of a vec3
 *
 * @param {vec3} a vector to calculate length of
 * @returns {Number} length of a
 */
vec3.length = function (a) {
    var x = a[0],
        y = a[1],
        z = a[2];
    return Math.sqrt(x*x + y*y + z*z);
};

/**
 * Alias for {@link vec3.length}
 * @function
 */
vec3.len = vec3.length;

/**
 * Calculates the squared length of a vec3
 *
 * @param {vec3} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */
vec3.squaredLength = function (a) {
    var x = a[0],
        y = a[1],
        z = a[2];
    return x*x + y*y + z*z;
};

/**
 * Alias for {@link vec3.squaredLength}
 * @function
 */
vec3.sqrLen = vec3.squaredLength;

/**
 * Negates the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to negate
 * @returns {vec3} out
 */
vec3.negate = function(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    return out;
};

/**
 * Normalize a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to normalize
 * @returns {vec3} out
 */
vec3.normalize = function(out, a) {
    var x = a[0],
        y = a[1],
        z = a[2];
    var len = x*x + y*y + z*z;
    if (len > 0) {
        //TODO: evaluate use of glm_invsqrt here?
        len = 1 / Math.sqrt(len);
        out[0] = a[0] * len;
        out[1] = a[1] * len;
        out[2] = a[2] * len;
    }
    return out;
};

/**
 * Calculates the dot product of two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} dot product of a and b
 */
vec3.dot = function (a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
};

/**
 * Computes the cross product of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.cross = function(out, a, b) {
    var ax = a[0], ay = a[1], az = a[2],
        bx = b[0], by = b[1], bz = b[2];

    out[0] = ay * bz - az * by;
    out[1] = az * bx - ax * bz;
    out[2] = ax * by - ay * bx;
    return out;
};

/**
 * Performs a linear interpolation between two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {vec3} out
 */
vec3.lerp = function (out, a, b, t) {
    var ax = a[0],
        ay = a[1],
        az = a[2];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    out[2] = az + t * (b[2] - az);
    return out;
};

/**
 * Generates a random vector with the given scale
 *
 * @param {vec3} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec3} out
 */
vec3.random = function (out, scale) {
    scale = scale || 1.0;

    var r = GLMAT_RANDOM() * 2.0 * Math.PI;
    var z = (GLMAT_RANDOM() * 2.0) - 1.0;
    var zScale = Math.sqrt(1.0-z*z) * scale;

    out[0] = Math.cos(r) * zScale;
    out[1] = Math.sin(r) * zScale;
    out[2] = z * scale;
    return out;
};

/**
 * Transforms the vec3 with a mat4.
 * 4th vector component is implicitly '1'
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {mat4} m matrix to transform with
 * @returns {vec3} out
 */
vec3.transformMat4 = function(out, a, m) {
    var x = a[0], y = a[1], z = a[2];
    out[0] = m[0] * x + m[4] * y + m[8] * z + m[12];
    out[1] = m[1] * x + m[5] * y + m[9] * z + m[13];
    out[2] = m[2] * x + m[6] * y + m[10] * z + m[14];
    return out;
};

/**
 * Transforms the vec3 with a mat3.
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {mat4} m the 3x3 matrix to transform with
 * @returns {vec3} out
 */
vec3.transformMat3 = function(out, a, m) {
    var x = a[0], y = a[1], z = a[2];
    out[0] = x * m[0] + y * m[3] + z * m[6];
    out[1] = x * m[1] + y * m[4] + z * m[7];
    out[2] = x * m[2] + y * m[5] + z * m[8];
    return out;
};

/**
 * Transforms the vec3 with a quat
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {quat} q quaternion to transform with
 * @returns {vec3} out
 */
vec3.transformQuat = function(out, a, q) {
    // benchmarks: http://jsperf.com/quaternion-transform-vec3-implementations

    var x = a[0], y = a[1], z = a[2],
        qx = q[0], qy = q[1], qz = q[2], qw = q[3],

        // calculate quat * vec
        ix = qw * x + qy * z - qz * y,
        iy = qw * y + qz * x - qx * z,
        iz = qw * z + qx * y - qy * x,
        iw = -qx * x - qy * y - qz * z;

    // calculate result * inverse quat
    out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    return out;
};

/*
* Rotate a 3D vector around the x-axis
* @param {vec3} out The receiving vec3
* @param {vec3} a The vec3 point to rotate
* @param {vec3} b The origin of the rotation
* @param {Number} c The angle of rotation
* @returns {vec3} out
*/
vec3.rotateX = function(out, a, b, c){
   var p = [], r=[];
	  //Translate point to the origin
	  p[0] = a[0] - b[0];
	  p[1] = a[1] - b[1];
  	p[2] = a[2] - b[2];

	  //perform rotation
	  r[0] = p[0];
	  r[1] = p[1]*Math.cos(c) - p[2]*Math.sin(c);
	  r[2] = p[1]*Math.sin(c) + p[2]*Math.cos(c);

	  //translate to correct position
	  out[0] = r[0] + b[0];
	  out[1] = r[1] + b[1];
	  out[2] = r[2] + b[2];

  	return out;
};

/*
* Rotate a 3D vector around the y-axis
* @param {vec3} out The receiving vec3
* @param {vec3} a The vec3 point to rotate
* @param {vec3} b The origin of the rotation
* @param {Number} c The angle of rotation
* @returns {vec3} out
*/
vec3.rotateY = function(out, a, b, c){
  	var p = [], r=[];
  	//Translate point to the origin
  	p[0] = a[0] - b[0];
  	p[1] = a[1] - b[1];
  	p[2] = a[2] - b[2];
  
  	//perform rotation
  	r[0] = p[2]*Math.sin(c) + p[0]*Math.cos(c);
  	r[1] = p[1];
  	r[2] = p[2]*Math.cos(c) - p[0]*Math.sin(c);
  
  	//translate to correct position
  	out[0] = r[0] + b[0];
  	out[1] = r[1] + b[1];
  	out[2] = r[2] + b[2];
  
  	return out;
};

/*
* Rotate a 3D vector around the z-axis
* @param {vec3} out The receiving vec3
* @param {vec3} a The vec3 point to rotate
* @param {vec3} b The origin of the rotation
* @param {Number} c The angle of rotation
* @returns {vec3} out
*/
vec3.rotateZ = function(out, a, b, c){
  	var p = [], r=[];
  	//Translate point to the origin
  	p[0] = a[0] - b[0];
  	p[1] = a[1] - b[1];
  	p[2] = a[2] - b[2];
  
  	//perform rotation
  	r[0] = p[0]*Math.cos(c) - p[1]*Math.sin(c);
  	r[1] = p[0]*Math.sin(c) + p[1]*Math.cos(c);
  	r[2] = p[2];
  
  	//translate to correct position
  	out[0] = r[0] + b[0];
  	out[1] = r[1] + b[1];
  	out[2] = r[2] + b[2];
  
  	return out;
};

/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */
vec3.forEach = (function() {
    var vec = vec3.create();

    return function(a, stride, offset, count, fn, arg) {
        var i, l;
        if(!stride) {
            stride = 3;
        }

        if(!offset) {
            offset = 0;
        }
        
        if(count) {
            l = Math.min((count * stride) + offset, a.length);
        } else {
            l = a.length;
        }

        for(i = offset; i < l; i += stride) {
            vec[0] = a[i]; vec[1] = a[i+1]; vec[2] = a[i+2];
            fn(vec, vec, arg);
            a[i] = vec[0]; a[i+1] = vec[1]; a[i+2] = vec[2];
        }
        
        return a;
    };
})();

/**
 * Returns a string representation of a vector
 *
 * @param {vec3} vec vector to represent as a string
 * @returns {String} string representation of the vector
 */
vec3.str = function (a) {
    return 'vec3(' + a[0] + ', ' + a[1] + ', ' + a[2] + ')';
};

if(typeof(exports) !== 'undefined') {
    exports.vec3 = vec3;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation 
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 4 Dimensional Vector
 * @name vec4
 */

var vec4 = {};

/**
 * Creates a new, empty vec4
 *
 * @returns {vec4} a new 4D vector
 */
vec4.create = function() {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    return out;
};

/**
 * Creates a new vec4 initialized with values from an existing vector
 *
 * @param {vec4} a vector to clone
 * @returns {vec4} a new 4D vector
 */
vec4.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
};

/**
 * Creates a new vec4 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {vec4} a new 4D vector
 */
vec4.fromValues = function(x, y, z, w) {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = w;
    return out;
};

/**
 * Copy the values from one vec4 to another
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the source vector
 * @returns {vec4} out
 */
vec4.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
};

/**
 * Set the components of a vec4 to the given values
 *
 * @param {vec4} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {vec4} out
 */
vec4.set = function(out, x, y, z, w) {
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = w;
    return out;
};

/**
 * Adds two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.add = function(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
    return out;
};

/**
 * Subtracts vector b from vector a
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.subtract = function(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    out[3] = a[3] - b[3];
    return out;
};

/**
 * Alias for {@link vec4.subtract}
 * @function
 */
vec4.sub = vec4.subtract;

/**
 * Multiplies two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.multiply = function(out, a, b) {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    out[2] = a[2] * b[2];
    out[3] = a[3] * b[3];
    return out;
};

/**
 * Alias for {@link vec4.multiply}
 * @function
 */
vec4.mul = vec4.multiply;

/**
 * Divides two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.divide = function(out, a, b) {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    out[2] = a[2] / b[2];
    out[3] = a[3] / b[3];
    return out;
};

/**
 * Alias for {@link vec4.divide}
 * @function
 */
vec4.div = vec4.divide;

/**
 * Returns the minimum of two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.min = function(out, a, b) {
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    out[2] = Math.min(a[2], b[2]);
    out[3] = Math.min(a[3], b[3]);
    return out;
};

/**
 * Returns the maximum of two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.max = function(out, a, b) {
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    out[2] = Math.max(a[2], b[2]);
    out[3] = Math.max(a[3], b[3]);
    return out;
};

/**
 * Scales a vec4 by a scalar number
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec4} out
 */
vec4.scale = function(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    out[3] = a[3] * b;
    return out;
};

/**
 * Adds two vec4's after scaling the second operand by a scalar value
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec4} out
 */
vec4.scaleAndAdd = function(out, a, b, scale) {
    out[0] = a[0] + (b[0] * scale);
    out[1] = a[1] + (b[1] * scale);
    out[2] = a[2] + (b[2] * scale);
    out[3] = a[3] + (b[3] * scale);
    return out;
};

/**
 * Calculates the euclidian distance between two vec4's
 *
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {Number} distance between a and b
 */
vec4.distance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2],
        w = b[3] - a[3];
    return Math.sqrt(x*x + y*y + z*z + w*w);
};

/**
 * Alias for {@link vec4.distance}
 * @function
 */
vec4.dist = vec4.distance;

/**
 * Calculates the squared euclidian distance between two vec4's
 *
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {Number} squared distance between a and b
 */
vec4.squaredDistance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2],
        w = b[3] - a[3];
    return x*x + y*y + z*z + w*w;
};

/**
 * Alias for {@link vec4.squaredDistance}
 * @function
 */
vec4.sqrDist = vec4.squaredDistance;

/**
 * Calculates the length of a vec4
 *
 * @param {vec4} a vector to calculate length of
 * @returns {Number} length of a
 */
vec4.length = function (a) {
    var x = a[0],
        y = a[1],
        z = a[2],
        w = a[3];
    return Math.sqrt(x*x + y*y + z*z + w*w);
};

/**
 * Alias for {@link vec4.length}
 * @function
 */
vec4.len = vec4.length;

/**
 * Calculates the squared length of a vec4
 *
 * @param {vec4} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */
vec4.squaredLength = function (a) {
    var x = a[0],
        y = a[1],
        z = a[2],
        w = a[3];
    return x*x + y*y + z*z + w*w;
};

/**
 * Alias for {@link vec4.squaredLength}
 * @function
 */
vec4.sqrLen = vec4.squaredLength;

/**
 * Negates the components of a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a vector to negate
 * @returns {vec4} out
 */
vec4.negate = function(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] = -a[3];
    return out;
};

/**
 * Normalize a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a vector to normalize
 * @returns {vec4} out
 */
vec4.normalize = function(out, a) {
    var x = a[0],
        y = a[1],
        z = a[2],
        w = a[3];
    var len = x*x + y*y + z*z + w*w;
    if (len > 0) {
        len = 1 / Math.sqrt(len);
        out[0] = a[0] * len;
        out[1] = a[1] * len;
        out[2] = a[2] * len;
        out[3] = a[3] * len;
    }
    return out;
};

/**
 * Calculates the dot product of two vec4's
 *
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {Number} dot product of a and b
 */
vec4.dot = function (a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
};

/**
 * Performs a linear interpolation between two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {vec4} out
 */
vec4.lerp = function (out, a, b, t) {
    var ax = a[0],
        ay = a[1],
        az = a[2],
        aw = a[3];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    out[2] = az + t * (b[2] - az);
    out[3] = aw + t * (b[3] - aw);
    return out;
};

/**
 * Generates a random vector with the given scale
 *
 * @param {vec4} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec4} out
 */
vec4.random = function (out, scale) {
    scale = scale || 1.0;

    //TODO: This is a pretty awful way of doing this. Find something better.
    out[0] = GLMAT_RANDOM();
    out[1] = GLMAT_RANDOM();
    out[2] = GLMAT_RANDOM();
    out[3] = GLMAT_RANDOM();
    vec4.normalize(out, out);
    vec4.scale(out, out, scale);
    return out;
};

/**
 * Transforms the vec4 with a mat4.
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the vector to transform
 * @param {mat4} m matrix to transform with
 * @returns {vec4} out
 */
vec4.transformMat4 = function(out, a, m) {
    var x = a[0], y = a[1], z = a[2], w = a[3];
    out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
    out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
    out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
    out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
    return out;
};

/**
 * Transforms the vec4 with a quat
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the vector to transform
 * @param {quat} q quaternion to transform with
 * @returns {vec4} out
 */
vec4.transformQuat = function(out, a, q) {
    var x = a[0], y = a[1], z = a[2],
        qx = q[0], qy = q[1], qz = q[2], qw = q[3],

        // calculate quat * vec
        ix = qw * x + qy * z - qz * y,
        iy = qw * y + qz * x - qx * z,
        iz = qw * z + qx * y - qy * x,
        iw = -qx * x - qy * y - qz * z;

    // calculate result * inverse quat
    out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    return out;
};

/**
 * Perform some operation over an array of vec4s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec4. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec2s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */
vec4.forEach = (function() {
    var vec = vec4.create();

    return function(a, stride, offset, count, fn, arg) {
        var i, l;
        if(!stride) {
            stride = 4;
        }

        if(!offset) {
            offset = 0;
        }
        
        if(count) {
            l = Math.min((count * stride) + offset, a.length);
        } else {
            l = a.length;
        }

        for(i = offset; i < l; i += stride) {
            vec[0] = a[i]; vec[1] = a[i+1]; vec[2] = a[i+2]; vec[3] = a[i+3];
            fn(vec, vec, arg);
            a[i] = vec[0]; a[i+1] = vec[1]; a[i+2] = vec[2]; a[i+3] = vec[3];
        }
        
        return a;
    };
})();

/**
 * Returns a string representation of a vector
 *
 * @param {vec4} vec vector to represent as a string
 * @returns {String} string representation of the vector
 */
vec4.str = function (a) {
    return 'vec4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
};

if(typeof(exports) !== 'undefined') {
    exports.vec4 = vec4;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation 
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 2x2 Matrix
 * @name mat2
 */

var mat2 = {};

/**
 * Creates a new identity mat2
 *
 * @returns {mat2} a new 2x2 matrix
 */
mat2.create = function() {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
};

/**
 * Creates a new mat2 initialized with values from an existing matrix
 *
 * @param {mat2} a matrix to clone
 * @returns {mat2} a new 2x2 matrix
 */
mat2.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
};

/**
 * Copy the values from one mat2 to another
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the source matrix
 * @returns {mat2} out
 */
mat2.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
};

/**
 * Set a mat2 to the identity matrix
 *
 * @param {mat2} out the receiving matrix
 * @returns {mat2} out
 */
mat2.identity = function(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
};

/**
 * Transpose the values of a mat2
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the source matrix
 * @returns {mat2} out
 */
mat2.transpose = function(out, a) {
    // If we are transposing ourselves we can skip a few steps but have to cache some values
    if (out === a) {
        var a1 = a[1];
        out[1] = a[2];
        out[2] = a1;
    } else {
        out[0] = a[0];
        out[1] = a[2];
        out[2] = a[1];
        out[3] = a[3];
    }
    
    return out;
};

/**
 * Inverts a mat2
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the source matrix
 * @returns {mat2} out
 */
mat2.invert = function(out, a) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],

        // Calculate the determinant
        det = a0 * a3 - a2 * a1;

    if (!det) {
        return null;
    }
    det = 1.0 / det;
    
    out[0] =  a3 * det;
    out[1] = -a1 * det;
    out[2] = -a2 * det;
    out[3] =  a0 * det;

    return out;
};

/**
 * Calculates the adjugate of a mat2
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the source matrix
 * @returns {mat2} out
 */
mat2.adjoint = function(out, a) {
    // Caching this value is nessecary if out == a
    var a0 = a[0];
    out[0] =  a[3];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] =  a0;

    return out;
};

/**
 * Calculates the determinant of a mat2
 *
 * @param {mat2} a the source matrix
 * @returns {Number} determinant of a
 */
mat2.determinant = function (a) {
    return a[0] * a[3] - a[2] * a[1];
};

/**
 * Multiplies two mat2's
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the first operand
 * @param {mat2} b the second operand
 * @returns {mat2} out
 */
mat2.multiply = function (out, a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
    var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    out[0] = a0 * b0 + a2 * b1;
    out[1] = a1 * b0 + a3 * b1;
    out[2] = a0 * b2 + a2 * b3;
    out[3] = a1 * b2 + a3 * b3;
    return out;
};

/**
 * Alias for {@link mat2.multiply}
 * @function
 */
mat2.mul = mat2.multiply;

/**
 * Rotates a mat2 by the given angle
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat2} out
 */
mat2.rotate = function (out, a, rad) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
        s = Math.sin(rad),
        c = Math.cos(rad);
    out[0] = a0 *  c + a2 * s;
    out[1] = a1 *  c + a3 * s;
    out[2] = a0 * -s + a2 * c;
    out[3] = a1 * -s + a3 * c;
    return out;
};

/**
 * Scales the mat2 by the dimensions in the given vec2
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the matrix to rotate
 * @param {vec2} v the vec2 to scale the matrix by
 * @returns {mat2} out
 **/
mat2.scale = function(out, a, v) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
        v0 = v[0], v1 = v[1];
    out[0] = a0 * v0;
    out[1] = a1 * v0;
    out[2] = a2 * v1;
    out[3] = a3 * v1;
    return out;
};

/**
 * Returns a string representation of a mat2
 *
 * @param {mat2} mat matrix to represent as a string
 * @returns {String} string representation of the matrix
 */
mat2.str = function (a) {
    return 'mat2(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
};

/**
 * Returns Frobenius norm of a mat2
 *
 * @param {mat2} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */
mat2.frob = function (a) {
    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2)))
};

/**
 * Returns L, D and U matrices (Lower triangular, Diagonal and Upper triangular) by factorizing the input matrix
 * @param {mat2} L the lower triangular matrix 
 * @param {mat2} D the diagonal matrix 
 * @param {mat2} U the upper triangular matrix 
 * @param {mat2} a the input matrix to factorize
 */

mat2.LDU = function (L, D, U, a) { 
    L[2] = a[2]/a[0]; 
    U[0] = a[0]; 
    U[1] = a[1]; 
    U[3] = a[3] - L[2] * U[1]; 
    return [L, D, U];       
}; 

if(typeof(exports) !== 'undefined') {
    exports.mat2 = mat2;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation 
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 2x3 Matrix
 * @name mat2d
 * 
 * @description 
 * A mat2d contains six elements defined as:
 * <pre>
 * [a, c, tx,
 *  b, d, ty]
 * </pre>
 * This is a short form for the 3x3 matrix:
 * <pre>
 * [a, c, tx,
 *  b, d, ty,
 *  0, 0, 1]
 * </pre>
 * The last row is ignored so the array is shorter and operations are faster.
 */

var mat2d = {};

/**
 * Creates a new identity mat2d
 *
 * @returns {mat2d} a new 2x3 matrix
 */
mat2d.create = function() {
    var out = new GLMAT_ARRAY_TYPE(6);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    out[4] = 0;
    out[5] = 0;
    return out;
};

/**
 * Creates a new mat2d initialized with values from an existing matrix
 *
 * @param {mat2d} a matrix to clone
 * @returns {mat2d} a new 2x3 matrix
 */
mat2d.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(6);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    return out;
};

/**
 * Copy the values from one mat2d to another
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the source matrix
 * @returns {mat2d} out
 */
mat2d.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    return out;
};

/**
 * Set a mat2d to the identity matrix
 *
 * @param {mat2d} out the receiving matrix
 * @returns {mat2d} out
 */
mat2d.identity = function(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    out[4] = 0;
    out[5] = 0;
    return out;
};

/**
 * Inverts a mat2d
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the source matrix
 * @returns {mat2d} out
 */
mat2d.invert = function(out, a) {
    var aa = a[0], ab = a[1], ac = a[2], ad = a[3],
        atx = a[4], aty = a[5];

    var det = aa * ad - ab * ac;
    if(!det){
        return null;
    }
    det = 1.0 / det;

    out[0] = ad * det;
    out[1] = -ab * det;
    out[2] = -ac * det;
    out[3] = aa * det;
    out[4] = (ac * aty - ad * atx) * det;
    out[5] = (ab * atx - aa * aty) * det;
    return out;
};

/**
 * Calculates the determinant of a mat2d
 *
 * @param {mat2d} a the source matrix
 * @returns {Number} determinant of a
 */
mat2d.determinant = function (a) {
    return a[0] * a[3] - a[1] * a[2];
};

/**
 * Multiplies two mat2d's
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the first operand
 * @param {mat2d} b the second operand
 * @returns {mat2d} out
 */
mat2d.multiply = function (out, a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
        b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5];
    out[0] = a0 * b0 + a2 * b1;
    out[1] = a1 * b0 + a3 * b1;
    out[2] = a0 * b2 + a2 * b3;
    out[3] = a1 * b2 + a3 * b3;
    out[4] = a0 * b4 + a2 * b5 + a4;
    out[5] = a1 * b4 + a3 * b5 + a5;
    return out;
};

/**
 * Alias for {@link mat2d.multiply}
 * @function
 */
mat2d.mul = mat2d.multiply;


/**
 * Rotates a mat2d by the given angle
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat2d} out
 */
mat2d.rotate = function (out, a, rad) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
        s = Math.sin(rad),
        c = Math.cos(rad);
    out[0] = a0 *  c + a2 * s;
    out[1] = a1 *  c + a3 * s;
    out[2] = a0 * -s + a2 * c;
    out[3] = a1 * -s + a3 * c;
    out[4] = a4;
    out[5] = a5;
    return out;
};

/**
 * Scales the mat2d by the dimensions in the given vec2
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the matrix to translate
 * @param {vec2} v the vec2 to scale the matrix by
 * @returns {mat2d} out
 **/
mat2d.scale = function(out, a, v) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
        v0 = v[0], v1 = v[1];
    out[0] = a0 * v0;
    out[1] = a1 * v0;
    out[2] = a2 * v1;
    out[3] = a3 * v1;
    out[4] = a4;
    out[5] = a5;
    return out;
};

/**
 * Translates the mat2d by the dimensions in the given vec2
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the matrix to translate
 * @param {vec2} v the vec2 to translate the matrix by
 * @returns {mat2d} out
 **/
mat2d.translate = function(out, a, v) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
        v0 = v[0], v1 = v[1];
    out[0] = a0;
    out[1] = a1;
    out[2] = a2;
    out[3] = a3;
    out[4] = a0 * v0 + a2 * v1 + a4;
    out[5] = a1 * v0 + a3 * v1 + a5;
    return out;
};

/**
 * Returns a string representation of a mat2d
 *
 * @param {mat2d} a matrix to represent as a string
 * @returns {String} string representation of the matrix
 */
mat2d.str = function (a) {
    return 'mat2d(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + 
                    a[3] + ', ' + a[4] + ', ' + a[5] + ')';
};

/**
 * Returns Frobenius norm of a mat2d
 *
 * @param {mat2d} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */
mat2d.frob = function (a) { 
    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + 1))
}; 

if(typeof(exports) !== 'undefined') {
    exports.mat2d = mat2d;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation 
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 3x3 Matrix
 * @name mat3
 */

var mat3 = {};

/**
 * Creates a new identity mat3
 *
 * @returns {mat3} a new 3x3 matrix
 */
mat3.create = function() {
    var out = new GLMAT_ARRAY_TYPE(9);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
};

/**
 * Copies the upper-left 3x3 values into the given mat3.
 *
 * @param {mat3} out the receiving 3x3 matrix
 * @param {mat4} a   the source 4x4 matrix
 * @returns {mat3} out
 */
mat3.fromMat4 = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[4];
    out[4] = a[5];
    out[5] = a[6];
    out[6] = a[8];
    out[7] = a[9];
    out[8] = a[10];
    return out;
};

/**
 * Creates a new mat3 initialized with values from an existing matrix
 *
 * @param {mat3} a matrix to clone
 * @returns {mat3} a new 3x3 matrix
 */
mat3.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(9);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return out;
};

/**
 * Copy the values from one mat3 to another
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the source matrix
 * @returns {mat3} out
 */
mat3.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return out;
};

/**
 * Set a mat3 to the identity matrix
 *
 * @param {mat3} out the receiving matrix
 * @returns {mat3} out
 */
mat3.identity = function(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
};

/**
 * Transpose the values of a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the source matrix
 * @returns {mat3} out
 */
mat3.transpose = function(out, a) {
    // If we are transposing ourselves we can skip a few steps but have to cache some values
    if (out === a) {
        var a01 = a[1], a02 = a[2], a12 = a[5];
        out[1] = a[3];
        out[2] = a[6];
        out[3] = a01;
        out[5] = a[7];
        out[6] = a02;
        out[7] = a12;
    } else {
        out[0] = a[0];
        out[1] = a[3];
        out[2] = a[6];
        out[3] = a[1];
        out[4] = a[4];
        out[5] = a[7];
        out[6] = a[2];
        out[7] = a[5];
        out[8] = a[8];
    }
    
    return out;
};

/**
 * Inverts a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the source matrix
 * @returns {mat3} out
 */
mat3.invert = function(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],

        b01 = a22 * a11 - a12 * a21,
        b11 = -a22 * a10 + a12 * a20,
        b21 = a21 * a10 - a11 * a20,

        // Calculate the determinant
        det = a00 * b01 + a01 * b11 + a02 * b21;

    if (!det) { 
        return null; 
    }
    det = 1.0 / det;

    out[0] = b01 * det;
    out[1] = (-a22 * a01 + a02 * a21) * det;
    out[2] = (a12 * a01 - a02 * a11) * det;
    out[3] = b11 * det;
    out[4] = (a22 * a00 - a02 * a20) * det;
    out[5] = (-a12 * a00 + a02 * a10) * det;
    out[6] = b21 * det;
    out[7] = (-a21 * a00 + a01 * a20) * det;
    out[8] = (a11 * a00 - a01 * a10) * det;
    return out;
};

/**
 * Calculates the adjugate of a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the source matrix
 * @returns {mat3} out
 */
mat3.adjoint = function(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8];

    out[0] = (a11 * a22 - a12 * a21);
    out[1] = (a02 * a21 - a01 * a22);
    out[2] = (a01 * a12 - a02 * a11);
    out[3] = (a12 * a20 - a10 * a22);
    out[4] = (a00 * a22 - a02 * a20);
    out[5] = (a02 * a10 - a00 * a12);
    out[6] = (a10 * a21 - a11 * a20);
    out[7] = (a01 * a20 - a00 * a21);
    out[8] = (a00 * a11 - a01 * a10);
    return out;
};

/**
 * Calculates the determinant of a mat3
 *
 * @param {mat3} a the source matrix
 * @returns {Number} determinant of a
 */
mat3.determinant = function (a) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8];

    return a00 * (a22 * a11 - a12 * a21) + a01 * (-a22 * a10 + a12 * a20) + a02 * (a21 * a10 - a11 * a20);
};

/**
 * Multiplies two mat3's
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the first operand
 * @param {mat3} b the second operand
 * @returns {mat3} out
 */
mat3.multiply = function (out, a, b) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],

        b00 = b[0], b01 = b[1], b02 = b[2],
        b10 = b[3], b11 = b[4], b12 = b[5],
        b20 = b[6], b21 = b[7], b22 = b[8];

    out[0] = b00 * a00 + b01 * a10 + b02 * a20;
    out[1] = b00 * a01 + b01 * a11 + b02 * a21;
    out[2] = b00 * a02 + b01 * a12 + b02 * a22;

    out[3] = b10 * a00 + b11 * a10 + b12 * a20;
    out[4] = b10 * a01 + b11 * a11 + b12 * a21;
    out[5] = b10 * a02 + b11 * a12 + b12 * a22;

    out[6] = b20 * a00 + b21 * a10 + b22 * a20;
    out[7] = b20 * a01 + b21 * a11 + b22 * a21;
    out[8] = b20 * a02 + b21 * a12 + b22 * a22;
    return out;
};

/**
 * Alias for {@link mat3.multiply}
 * @function
 */
mat3.mul = mat3.multiply;

/**
 * Translate a mat3 by the given vector
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the matrix to translate
 * @param {vec2} v vector to translate by
 * @returns {mat3} out
 */
mat3.translate = function(out, a, v) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],
        x = v[0], y = v[1];

    out[0] = a00;
    out[1] = a01;
    out[2] = a02;

    out[3] = a10;
    out[4] = a11;
    out[5] = a12;

    out[6] = x * a00 + y * a10 + a20;
    out[7] = x * a01 + y * a11 + a21;
    out[8] = x * a02 + y * a12 + a22;
    return out;
};

/**
 * Rotates a mat3 by the given angle
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat3} out
 */
mat3.rotate = function (out, a, rad) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],

        s = Math.sin(rad),
        c = Math.cos(rad);

    out[0] = c * a00 + s * a10;
    out[1] = c * a01 + s * a11;
    out[2] = c * a02 + s * a12;

    out[3] = c * a10 - s * a00;
    out[4] = c * a11 - s * a01;
    out[5] = c * a12 - s * a02;

    out[6] = a20;
    out[7] = a21;
    out[8] = a22;
    return out;
};

/**
 * Scales the mat3 by the dimensions in the given vec2
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the matrix to rotate
 * @param {vec2} v the vec2 to scale the matrix by
 * @returns {mat3} out
 **/
mat3.scale = function(out, a, v) {
    var x = v[0], y = v[1];

    out[0] = x * a[0];
    out[1] = x * a[1];
    out[2] = x * a[2];

    out[3] = y * a[3];
    out[4] = y * a[4];
    out[5] = y * a[5];

    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return out;
};

/**
 * Copies the values from a mat2d into a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {mat2d} a the matrix to copy
 * @returns {mat3} out
 **/
mat3.fromMat2d = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = 0;

    out[3] = a[2];
    out[4] = a[3];
    out[5] = 0;

    out[6] = a[4];
    out[7] = a[5];
    out[8] = 1;
    return out;
};

/**
* Calculates a 3x3 matrix from the given quaternion
*
* @param {mat3} out mat3 receiving operation result
* @param {quat} q Quaternion to create matrix from
*
* @returns {mat3} out
*/
mat3.fromQuat = function (out, q) {
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        yx = y * x2,
        yy = y * y2,
        zx = z * x2,
        zy = z * y2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - yy - zz;
    out[3] = yx - wz;
    out[6] = zx + wy;

    out[1] = yx + wz;
    out[4] = 1 - xx - zz;
    out[7] = zy - wx;

    out[2] = zx - wy;
    out[5] = zy + wx;
    out[8] = 1 - xx - yy;

    return out;
};

/**
* Calculates a 3x3 normal matrix (transpose inverse) from the 4x4 matrix
*
* @param {mat3} out mat3 receiving operation result
* @param {mat4} a Mat4 to derive the normal matrix from
*
* @returns {mat3} out
*/
mat3.normalFromMat4 = function (out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,

        // Calculate the determinant
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) { 
        return null; 
    }
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;

    out[3] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[4] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[5] = (a01 * b08 - a00 * b10 - a03 * b06) * det;

    out[6] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[7] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[8] = (a30 * b04 - a31 * b02 + a33 * b00) * det;

    return out;
};

/**
 * Returns a string representation of a mat3
 *
 * @param {mat3} mat matrix to represent as a string
 * @returns {String} string representation of the matrix
 */
mat3.str = function (a) {
    return 'mat3(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + 
                    a[3] + ', ' + a[4] + ', ' + a[5] + ', ' + 
                    a[6] + ', ' + a[7] + ', ' + a[8] + ')';
};

/**
 * Returns Frobenius norm of a mat3
 *
 * @param {mat3} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */
mat3.frob = function (a) {
    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + Math.pow(a[6], 2) + Math.pow(a[7], 2) + Math.pow(a[8], 2)))
};


if(typeof(exports) !== 'undefined') {
    exports.mat3 = mat3;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation 
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 4x4 Matrix
 * @name mat4
 */

var mat4 = {};

/**
 * Creates a new identity mat4
 *
 * @returns {mat4} a new 4x4 matrix
 */
mat4.create = function() {
    var out = new GLMAT_ARRAY_TYPE(16);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};

/**
 * Creates a new mat4 initialized with values from an existing matrix
 *
 * @param {mat4} a matrix to clone
 * @returns {mat4} a new 4x4 matrix
 */
mat4.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(16);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};

/**
 * Copy the values from one mat4 to another
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
mat4.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};

/**
 * Set a mat4 to the identity matrix
 *
 * @param {mat4} out the receiving matrix
 * @returns {mat4} out
 */
mat4.identity = function(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};

/**
 * Transpose the values of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
mat4.transpose = function(out, a) {
    // If we are transposing ourselves we can skip a few steps but have to cache some values
    if (out === a) {
        var a01 = a[1], a02 = a[2], a03 = a[3],
            a12 = a[6], a13 = a[7],
            a23 = a[11];

        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a01;
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a02;
        out[9] = a12;
        out[11] = a[14];
        out[12] = a03;
        out[13] = a13;
        out[14] = a23;
    } else {
        out[0] = a[0];
        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a[1];
        out[5] = a[5];
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a[2];
        out[9] = a[6];
        out[10] = a[10];
        out[11] = a[14];
        out[12] = a[3];
        out[13] = a[7];
        out[14] = a[11];
        out[15] = a[15];
    }
    
    return out;
};

/**
 * Inverts a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
mat4.invert = function(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,

        // Calculate the determinant
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) { 
        return null; 
    }
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    return out;
};

/**
 * Calculates the adjugate of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
mat4.adjoint = function(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    out[0]  =  (a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22));
    out[1]  = -(a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22));
    out[2]  =  (a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12));
    out[3]  = -(a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12));
    out[4]  = -(a10 * (a22 * a33 - a23 * a32) - a20 * (a12 * a33 - a13 * a32) + a30 * (a12 * a23 - a13 * a22));
    out[5]  =  (a00 * (a22 * a33 - a23 * a32) - a20 * (a02 * a33 - a03 * a32) + a30 * (a02 * a23 - a03 * a22));
    out[6]  = -(a00 * (a12 * a33 - a13 * a32) - a10 * (a02 * a33 - a03 * a32) + a30 * (a02 * a13 - a03 * a12));
    out[7]  =  (a00 * (a12 * a23 - a13 * a22) - a10 * (a02 * a23 - a03 * a22) + a20 * (a02 * a13 - a03 * a12));
    out[8]  =  (a10 * (a21 * a33 - a23 * a31) - a20 * (a11 * a33 - a13 * a31) + a30 * (a11 * a23 - a13 * a21));
    out[9]  = -(a00 * (a21 * a33 - a23 * a31) - a20 * (a01 * a33 - a03 * a31) + a30 * (a01 * a23 - a03 * a21));
    out[10] =  (a00 * (a11 * a33 - a13 * a31) - a10 * (a01 * a33 - a03 * a31) + a30 * (a01 * a13 - a03 * a11));
    out[11] = -(a00 * (a11 * a23 - a13 * a21) - a10 * (a01 * a23 - a03 * a21) + a20 * (a01 * a13 - a03 * a11));
    out[12] = -(a10 * (a21 * a32 - a22 * a31) - a20 * (a11 * a32 - a12 * a31) + a30 * (a11 * a22 - a12 * a21));
    out[13] =  (a00 * (a21 * a32 - a22 * a31) - a20 * (a01 * a32 - a02 * a31) + a30 * (a01 * a22 - a02 * a21));
    out[14] = -(a00 * (a11 * a32 - a12 * a31) - a10 * (a01 * a32 - a02 * a31) + a30 * (a01 * a12 - a02 * a11));
    out[15] =  (a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11));
    return out;
};

/**
 * Calculates the determinant of a mat4
 *
 * @param {mat4} a the source matrix
 * @returns {Number} determinant of a
 */
mat4.determinant = function (a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32;

    // Calculate the determinant
    return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
};

/**
 * Multiplies two mat4's
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the first operand
 * @param {mat4} b the second operand
 * @returns {mat4} out
 */
mat4.multiply = function (out, a, b) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    // Cache only the current line of the second matrix
    var b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];  
    out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
    return out;
};

/**
 * Alias for {@link mat4.multiply}
 * @function
 */
mat4.mul = mat4.multiply;

/**
 * Translate a mat4 by the given vector
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to translate
 * @param {vec3} v vector to translate by
 * @returns {mat4} out
 */
mat4.translate = function (out, a, v) {
    var x = v[0], y = v[1], z = v[2],
        a00, a01, a02, a03,
        a10, a11, a12, a13,
        a20, a21, a22, a23;

    if (a === out) {
        out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
        out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
        out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
        out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    } else {
        a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
        a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
        a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

        out[0] = a00; out[1] = a01; out[2] = a02; out[3] = a03;
        out[4] = a10; out[5] = a11; out[6] = a12; out[7] = a13;
        out[8] = a20; out[9] = a21; out[10] = a22; out[11] = a23;

        out[12] = a00 * x + a10 * y + a20 * z + a[12];
        out[13] = a01 * x + a11 * y + a21 * z + a[13];
        out[14] = a02 * x + a12 * y + a22 * z + a[14];
        out[15] = a03 * x + a13 * y + a23 * z + a[15];
    }

    return out;
};

/**
 * Scales the mat4 by the dimensions in the given vec3
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to scale
 * @param {vec3} v the vec3 to scale the matrix by
 * @returns {mat4} out
 **/
mat4.scale = function(out, a, v) {
    var x = v[0], y = v[1], z = v[2];

    out[0] = a[0] * x;
    out[1] = a[1] * x;
    out[2] = a[2] * x;
    out[3] = a[3] * x;
    out[4] = a[4] * y;
    out[5] = a[5] * y;
    out[6] = a[6] * y;
    out[7] = a[7] * y;
    out[8] = a[8] * z;
    out[9] = a[9] * z;
    out[10] = a[10] * z;
    out[11] = a[11] * z;
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};

/**
 * Rotates a mat4 by the given angle
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @param {vec3} axis the axis to rotate around
 * @returns {mat4} out
 */
mat4.rotate = function (out, a, rad, axis) {
    var x = axis[0], y = axis[1], z = axis[2],
        len = Math.sqrt(x * x + y * y + z * z),
        s, c, t,
        a00, a01, a02, a03,
        a10, a11, a12, a13,
        a20, a21, a22, a23,
        b00, b01, b02,
        b10, b11, b12,
        b20, b21, b22;

    if (Math.abs(len) < GLMAT_EPSILON) { return null; }
    
    len = 1 / len;
    x *= len;
    y *= len;
    z *= len;

    s = Math.sin(rad);
    c = Math.cos(rad);
    t = 1 - c;

    a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
    a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
    a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

    // Construct the elements of the rotation matrix
    b00 = x * x * t + c; b01 = y * x * t + z * s; b02 = z * x * t - y * s;
    b10 = x * y * t - z * s; b11 = y * y * t + c; b12 = z * y * t + x * s;
    b20 = x * z * t + y * s; b21 = y * z * t - x * s; b22 = z * z * t + c;

    // Perform rotation-specific matrix multiplication
    out[0] = a00 * b00 + a10 * b01 + a20 * b02;
    out[1] = a01 * b00 + a11 * b01 + a21 * b02;
    out[2] = a02 * b00 + a12 * b01 + a22 * b02;
    out[3] = a03 * b00 + a13 * b01 + a23 * b02;
    out[4] = a00 * b10 + a10 * b11 + a20 * b12;
    out[5] = a01 * b10 + a11 * b11 + a21 * b12;
    out[6] = a02 * b10 + a12 * b11 + a22 * b12;
    out[7] = a03 * b10 + a13 * b11 + a23 * b12;
    out[8] = a00 * b20 + a10 * b21 + a20 * b22;
    out[9] = a01 * b20 + a11 * b21 + a21 * b22;
    out[10] = a02 * b20 + a12 * b21 + a22 * b22;
    out[11] = a03 * b20 + a13 * b21 + a23 * b22;

    if (a !== out) { // If the source and destination differ, copy the unchanged last row
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }
    return out;
};

/**
 * Rotates a matrix by the given angle around the X axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
mat4.rotateX = function (out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7],
        a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];

    if (a !== out) { // If the source and destination differ, copy the unchanged rows
        out[0]  = a[0];
        out[1]  = a[1];
        out[2]  = a[2];
        out[3]  = a[3];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[4] = a10 * c + a20 * s;
    out[5] = a11 * c + a21 * s;
    out[6] = a12 * c + a22 * s;
    out[7] = a13 * c + a23 * s;
    out[8] = a20 * c - a10 * s;
    out[9] = a21 * c - a11 * s;
    out[10] = a22 * c - a12 * s;
    out[11] = a23 * c - a13 * s;
    return out;
};

/**
 * Rotates a matrix by the given angle around the Y axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
mat4.rotateY = function (out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3],
        a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];

    if (a !== out) { // If the source and destination differ, copy the unchanged rows
        out[4]  = a[4];
        out[5]  = a[5];
        out[6]  = a[6];
        out[7]  = a[7];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[0] = a00 * c - a20 * s;
    out[1] = a01 * c - a21 * s;
    out[2] = a02 * c - a22 * s;
    out[3] = a03 * c - a23 * s;
    out[8] = a00 * s + a20 * c;
    out[9] = a01 * s + a21 * c;
    out[10] = a02 * s + a22 * c;
    out[11] = a03 * s + a23 * c;
    return out;
};

/**
 * Rotates a matrix by the given angle around the Z axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
mat4.rotateZ = function (out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3],
        a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7];

    if (a !== out) { // If the source and destination differ, copy the unchanged last row
        out[8]  = a[8];
        out[9]  = a[9];
        out[10] = a[10];
        out[11] = a[11];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[0] = a00 * c + a10 * s;
    out[1] = a01 * c + a11 * s;
    out[2] = a02 * c + a12 * s;
    out[3] = a03 * c + a13 * s;
    out[4] = a10 * c - a00 * s;
    out[5] = a11 * c - a01 * s;
    out[6] = a12 * c - a02 * s;
    out[7] = a13 * c - a03 * s;
    return out;
};

/**
 * Creates a matrix from a quaternion rotation and vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     var quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {vec3} v Translation vector
 * @returns {mat4} out
 */
mat4.fromRotationTranslation = function (out, q, v) {
    // Quaternion math
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        xy = x * y2,
        xz = x * z2,
        yy = y * y2,
        yz = y * z2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - (yy + zz);
    out[1] = xy + wz;
    out[2] = xz - wy;
    out[3] = 0;
    out[4] = xy - wz;
    out[5] = 1 - (xx + zz);
    out[6] = yz + wx;
    out[7] = 0;
    out[8] = xz + wy;
    out[9] = yz - wx;
    out[10] = 1 - (xx + yy);
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    
    return out;
};

mat4.fromQuat = function (out, q) {
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        yx = y * x2,
        yy = y * y2,
        zx = z * x2,
        zy = z * y2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - yy - zz;
    out[1] = yx + wz;
    out[2] = zx - wy;
    out[3] = 0;

    out[4] = yx - wz;
    out[5] = 1 - xx - zz;
    out[6] = zy + wx;
    out[7] = 0;

    out[8] = zx + wy;
    out[9] = zy - wx;
    out[10] = 1 - xx - yy;
    out[11] = 0;

    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;

    return out;
};

/**
 * Generates a frustum matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {Number} left Left bound of the frustum
 * @param {Number} right Right bound of the frustum
 * @param {Number} bottom Bottom bound of the frustum
 * @param {Number} top Top bound of the frustum
 * @param {Number} near Near bound of the frustum
 * @param {Number} far Far bound of the frustum
 * @returns {mat4} out
 */
mat4.frustum = function (out, left, right, bottom, top, near, far) {
    var rl = 1 / (right - left),
        tb = 1 / (top - bottom),
        nf = 1 / (near - far);
    out[0] = (near * 2) * rl;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = (near * 2) * tb;
    out[6] = 0;
    out[7] = 0;
    out[8] = (right + left) * rl;
    out[9] = (top + bottom) * tb;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (far * near * 2) * nf;
    out[15] = 0;
    return out;
};

/**
 * Generates a perspective projection matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} fovy Vertical field of view in radians
 * @param {number} aspect Aspect ratio. typically viewport width/height
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
mat4.perspective = function (out, fovy, aspect, near, far) {
    var f = 1.0 / Math.tan(fovy / 2),
        nf = 1 / (near - far);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (2 * far * near) * nf;
    out[15] = 0;
    return out;
};

/**
 * Generates a orthogonal projection matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} left Left bound of the frustum
 * @param {number} right Right bound of the frustum
 * @param {number} bottom Bottom bound of the frustum
 * @param {number} top Top bound of the frustum
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
mat4.ortho = function (out, left, right, bottom, top, near, far) {
    var lr = 1 / (left - right),
        bt = 1 / (bottom - top),
        nf = 1 / (near - far);
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 2 * nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = (far + near) * nf;
    out[15] = 1;
    return out;
};

/**
 * Generates a look-at matrix with the given eye position, focal point, and up axis
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {vec3} eye Position of the viewer
 * @param {vec3} center Point the viewer is looking at
 * @param {vec3} up vec3 pointing up
 * @returns {mat4} out
 */
mat4.lookAt = function (out, eye, center, up) {
    var x0, x1, x2, y0, y1, y2, z0, z1, z2, len,
        eyex = eye[0],
        eyey = eye[1],
        eyez = eye[2],
        upx = up[0],
        upy = up[1],
        upz = up[2],
        centerx = center[0],
        centery = center[1],
        centerz = center[2];

    if (Math.abs(eyex - centerx) < GLMAT_EPSILON &&
        Math.abs(eyey - centery) < GLMAT_EPSILON &&
        Math.abs(eyez - centerz) < GLMAT_EPSILON) {
        return mat4.identity(out);
    }

    z0 = eyex - centerx;
    z1 = eyey - centery;
    z2 = eyez - centerz;

    len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
    z0 *= len;
    z1 *= len;
    z2 *= len;

    x0 = upy * z2 - upz * z1;
    x1 = upz * z0 - upx * z2;
    x2 = upx * z1 - upy * z0;
    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
    if (!len) {
        x0 = 0;
        x1 = 0;
        x2 = 0;
    } else {
        len = 1 / len;
        x0 *= len;
        x1 *= len;
        x2 *= len;
    }

    y0 = z1 * x2 - z2 * x1;
    y1 = z2 * x0 - z0 * x2;
    y2 = z0 * x1 - z1 * x0;

    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
    if (!len) {
        y0 = 0;
        y1 = 0;
        y2 = 0;
    } else {
        len = 1 / len;
        y0 *= len;
        y1 *= len;
        y2 *= len;
    }

    out[0] = x0;
    out[1] = y0;
    out[2] = z0;
    out[3] = 0;
    out[4] = x1;
    out[5] = y1;
    out[6] = z1;
    out[7] = 0;
    out[8] = x2;
    out[9] = y2;
    out[10] = z2;
    out[11] = 0;
    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    out[15] = 1;

    return out;
};

/**
 * Returns a string representation of a mat4
 *
 * @param {mat4} mat matrix to represent as a string
 * @returns {String} string representation of the matrix
 */
mat4.str = function (a) {
    return 'mat4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ', ' +
                    a[4] + ', ' + a[5] + ', ' + a[6] + ', ' + a[7] + ', ' +
                    a[8] + ', ' + a[9] + ', ' + a[10] + ', ' + a[11] + ', ' + 
                    a[12] + ', ' + a[13] + ', ' + a[14] + ', ' + a[15] + ')';
};

/**
 * Returns Frobenius norm of a mat4
 *
 * @param {mat4} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */
mat4.frob = function (a) {
    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + Math.pow(a[6], 2) + Math.pow(a[6], 2) + Math.pow(a[7], 2) + Math.pow(a[8], 2) + Math.pow(a[9], 2) + Math.pow(a[10], 2) + Math.pow(a[11], 2) + Math.pow(a[12], 2) + Math.pow(a[13], 2) + Math.pow(a[14], 2) + Math.pow(a[15], 2) ))
};


if(typeof(exports) !== 'undefined') {
    exports.mat4 = mat4;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation 
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class Quaternion
 * @name quat
 */

var quat = {};

/**
 * Creates a new identity quat
 *
 * @returns {quat} a new quaternion
 */
quat.create = function() {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
};

/**
 * Sets a quaternion to represent the shortest rotation from one
 * vector to another.
 *
 * Both vectors are assumed to be unit length.
 *
 * @param {quat} out the receiving quaternion.
 * @param {vec3} a the initial vector
 * @param {vec3} b the destination vector
 * @returns {quat} out
 */
quat.rotationTo = (function() {
    var tmpvec3 = vec3.create();
    var xUnitVec3 = vec3.fromValues(1,0,0);
    var yUnitVec3 = vec3.fromValues(0,1,0);

    return function(out, a, b) {
        var dot = vec3.dot(a, b);
        if (dot < -0.999999) {
            vec3.cross(tmpvec3, xUnitVec3, a);
            if (vec3.length(tmpvec3) < 0.000001)
                vec3.cross(tmpvec3, yUnitVec3, a);
            vec3.normalize(tmpvec3, tmpvec3);
            quat.setAxisAngle(out, tmpvec3, Math.PI);
            return out;
        } else if (dot > 0.999999) {
            out[0] = 0;
            out[1] = 0;
            out[2] = 0;
            out[3] = 1;
            return out;
        } else {
            vec3.cross(tmpvec3, a, b);
            out[0] = tmpvec3[0];
            out[1] = tmpvec3[1];
            out[2] = tmpvec3[2];
            out[3] = 1 + dot;
            return quat.normalize(out, out);
        }
    };
})();

/**
 * Sets the specified quaternion with values corresponding to the given
 * axes. Each axis is a vec3 and is expected to be unit length and
 * perpendicular to all other specified axes.
 *
 * @param {vec3} view  the vector representing the viewing direction
 * @param {vec3} right the vector representing the local "right" direction
 * @param {vec3} up    the vector representing the local "up" direction
 * @returns {quat} out
 */
quat.setAxes = (function() {
    var matr = mat3.create();

    return function(out, view, right, up) {
        matr[0] = right[0];
        matr[3] = right[1];
        matr[6] = right[2];

        matr[1] = up[0];
        matr[4] = up[1];
        matr[7] = up[2];

        matr[2] = -view[0];
        matr[5] = -view[1];
        matr[8] = -view[2];

        return quat.normalize(out, quat.fromMat3(out, matr));
    };
})();

/**
 * Creates a new quat initialized with values from an existing quaternion
 *
 * @param {quat} a quaternion to clone
 * @returns {quat} a new quaternion
 * @function
 */
quat.clone = vec4.clone;

/**
 * Creates a new quat initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {quat} a new quaternion
 * @function
 */
quat.fromValues = vec4.fromValues;

/**
 * Copy the values from one quat to another
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the source quaternion
 * @returns {quat} out
 * @function
 */
quat.copy = vec4.copy;

/**
 * Set the components of a quat to the given values
 *
 * @param {quat} out the receiving quaternion
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {quat} out
 * @function
 */
quat.set = vec4.set;

/**
 * Set a quat to the identity quaternion
 *
 * @param {quat} out the receiving quaternion
 * @returns {quat} out
 */
quat.identity = function(out) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
};

/**
 * Sets a quat from the given angle and rotation axis,
 * then returns it.
 *
 * @param {quat} out the receiving quaternion
 * @param {vec3} axis the axis around which to rotate
 * @param {Number} rad the angle in radians
 * @returns {quat} out
 **/
quat.setAxisAngle = function(out, axis, rad) {
    rad = rad * 0.5;
    var s = Math.sin(rad);
    out[0] = s * axis[0];
    out[1] = s * axis[1];
    out[2] = s * axis[2];
    out[3] = Math.cos(rad);
    return out;
};

/**
 * Adds two quat's
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @returns {quat} out
 * @function
 */
quat.add = vec4.add;

/**
 * Multiplies two quat's
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @returns {quat} out
 */
quat.multiply = function(out, a, b) {
    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bx = b[0], by = b[1], bz = b[2], bw = b[3];

    out[0] = ax * bw + aw * bx + ay * bz - az * by;
    out[1] = ay * bw + aw * by + az * bx - ax * bz;
    out[2] = az * bw + aw * bz + ax * by - ay * bx;
    out[3] = aw * bw - ax * bx - ay * by - az * bz;
    return out;
};

/**
 * Alias for {@link quat.multiply}
 * @function
 */
quat.mul = quat.multiply;

/**
 * Scales a quat by a scalar number
 *
 * @param {quat} out the receiving vector
 * @param {quat} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {quat} out
 * @function
 */
quat.scale = vec4.scale;

/**
 * Rotates a quaternion by the given angle about the X axis
 *
 * @param {quat} out quat receiving operation result
 * @param {quat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {quat} out
 */
quat.rotateX = function (out, a, rad) {
    rad *= 0.5; 

    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bx = Math.sin(rad), bw = Math.cos(rad);

    out[0] = ax * bw + aw * bx;
    out[1] = ay * bw + az * bx;
    out[2] = az * bw - ay * bx;
    out[3] = aw * bw - ax * bx;
    return out;
};

/**
 * Rotates a quaternion by the given angle about the Y axis
 *
 * @param {quat} out quat receiving operation result
 * @param {quat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {quat} out
 */
quat.rotateY = function (out, a, rad) {
    rad *= 0.5; 

    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        by = Math.sin(rad), bw = Math.cos(rad);

    out[0] = ax * bw - az * by;
    out[1] = ay * bw + aw * by;
    out[2] = az * bw + ax * by;
    out[3] = aw * bw - ay * by;
    return out;
};

/**
 * Rotates a quaternion by the given angle about the Z axis
 *
 * @param {quat} out quat receiving operation result
 * @param {quat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {quat} out
 */
quat.rotateZ = function (out, a, rad) {
    rad *= 0.5; 

    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bz = Math.sin(rad), bw = Math.cos(rad);

    out[0] = ax * bw + ay * bz;
    out[1] = ay * bw - ax * bz;
    out[2] = az * bw + aw * bz;
    out[3] = aw * bw - az * bz;
    return out;
};

/**
 * Calculates the W component of a quat from the X, Y, and Z components.
 * Assumes that quaternion is 1 unit in length.
 * Any existing W component will be ignored.
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a quat to calculate W component of
 * @returns {quat} out
 */
quat.calculateW = function (out, a) {
    var x = a[0], y = a[1], z = a[2];

    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = -Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
    return out;
};

/**
 * Calculates the dot product of two quat's
 *
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @returns {Number} dot product of a and b
 * @function
 */
quat.dot = vec4.dot;

/**
 * Performs a linear interpolation between two quat's
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {quat} out
 * @function
 */
quat.lerp = vec4.lerp;

/**
 * Performs a spherical linear interpolation between two quat
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {quat} out
 */
quat.slerp = function (out, a, b, t) {
    // benchmarks:
    //    http://jsperf.com/quaternion-slerp-implementations

    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bx = b[0], by = b[1], bz = b[2], bw = b[3];

    var        omega, cosom, sinom, scale0, scale1;

    // calc cosine
    cosom = ax * bx + ay * by + az * bz + aw * bw;
    // adjust signs (if necessary)
    if ( cosom < 0.0 ) {
        cosom = -cosom;
        bx = - bx;
        by = - by;
        bz = - bz;
        bw = - bw;
    }
    // calculate coefficients
    if ( (1.0 - cosom) > 0.000001 ) {
        // standard case (slerp)
        omega  = Math.acos(cosom);
        sinom  = Math.sin(omega);
        scale0 = Math.sin((1.0 - t) * omega) / sinom;
        scale1 = Math.sin(t * omega) / sinom;
    } else {        
        // "from" and "to" quaternions are very close 
        //  ... so we can do a linear interpolation
        scale0 = 1.0 - t;
        scale1 = t;
    }
    // calculate final values
    out[0] = scale0 * ax + scale1 * bx;
    out[1] = scale0 * ay + scale1 * by;
    out[2] = scale0 * az + scale1 * bz;
    out[3] = scale0 * aw + scale1 * bw;
    
    return out;
};

/**
 * Calculates the inverse of a quat
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a quat to calculate inverse of
 * @returns {quat} out
 */
quat.invert = function(out, a) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
        dot = a0*a0 + a1*a1 + a2*a2 + a3*a3,
        invDot = dot ? 1.0/dot : 0;
    
    // TODO: Would be faster to return [0,0,0,0] immediately if dot == 0

    out[0] = -a0*invDot;
    out[1] = -a1*invDot;
    out[2] = -a2*invDot;
    out[3] = a3*invDot;
    return out;
};

/**
 * Calculates the conjugate of a quat
 * If the quaternion is normalized, this function is faster than quat.inverse and produces the same result.
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a quat to calculate conjugate of
 * @returns {quat} out
 */
quat.conjugate = function (out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] = a[3];
    return out;
};

/**
 * Calculates the length of a quat
 *
 * @param {quat} a vector to calculate length of
 * @returns {Number} length of a
 * @function
 */
quat.length = vec4.length;

/**
 * Alias for {@link quat.length}
 * @function
 */
quat.len = quat.length;

/**
 * Calculates the squared length of a quat
 *
 * @param {quat} a vector to calculate squared length of
 * @returns {Number} squared length of a
 * @function
 */
quat.squaredLength = vec4.squaredLength;

/**
 * Alias for {@link quat.squaredLength}
 * @function
 */
quat.sqrLen = quat.squaredLength;

/**
 * Normalize a quat
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a quaternion to normalize
 * @returns {quat} out
 * @function
 */
quat.normalize = vec4.normalize;

/**
 * Creates a quaternion from the given 3x3 rotation matrix.
 *
 * NOTE: The resultant quaternion is not normalized, so you should be sure
 * to renormalize the quaternion yourself where necessary.
 *
 * @param {quat} out the receiving quaternion
 * @param {mat3} m rotation matrix
 * @returns {quat} out
 * @function
 */
quat.fromMat3 = function(out, m) {
    // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
    // article "Quaternion Calculus and Fast Animation".
    var fTrace = m[0] + m[4] + m[8];
    var fRoot;

    if ( fTrace > 0.0 ) {
        // |w| > 1/2, may as well choose w > 1/2
        fRoot = Math.sqrt(fTrace + 1.0);  // 2w
        out[3] = 0.5 * fRoot;
        fRoot = 0.5/fRoot;  // 1/(4w)
        out[0] = (m[7]-m[5])*fRoot;
        out[1] = (m[2]-m[6])*fRoot;
        out[2] = (m[3]-m[1])*fRoot;
    } else {
        // |w| <= 1/2
        var i = 0;
        if ( m[4] > m[0] )
          i = 1;
        if ( m[8] > m[i*3+i] )
          i = 2;
        var j = (i+1)%3;
        var k = (i+2)%3;
        
        fRoot = Math.sqrt(m[i*3+i]-m[j*3+j]-m[k*3+k] + 1.0);
        out[i] = 0.5 * fRoot;
        fRoot = 0.5 / fRoot;
        out[3] = (m[k*3+j] - m[j*3+k]) * fRoot;
        out[j] = (m[j*3+i] + m[i*3+j]) * fRoot;
        out[k] = (m[k*3+i] + m[i*3+k]) * fRoot;
    }
    
    return out;
};

/**
 * Returns a string representation of a quatenion
 *
 * @param {quat} vec vector to represent as a string
 * @returns {String} string representation of the vector
 */
quat.str = function (a) {
    return 'quat(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
};

if(typeof(exports) !== 'undefined') {
    exports.quat = quat;
}
;













  })(shim.exports);
})(this);

},{}],116:[function(require,module,exports){
'use strict';

function constant(value) {
    return function() {
        return value;
    }
}

function interpolateNumber(a, b, t) {
    return (a * (1 - t)) + (b * t);
}

function interpolateArray(a, b, t) {
    var result = [];
    for (var i = 0; i < a.length; i++) {
        result[i] = interpolateNumber(a[i], b[i], t);
    }
    return result;
}

exports['interpolated'] = function(f) {
    if (!f.stops) {
        return constant(f);
    }

    var stops = f.stops,
        base = f.base || 1,
        interpolate = Array.isArray(stops[0][1]) ? interpolateArray : interpolateNumber;

    return function(z) {
        // find the two stops which the current z is between
        var low, high;

        for (var i = 0; i < stops.length; i++) {
            var stop = stops[i];

            if (stop[0] <= z) {
                low = stop;
            }

            if (stop[0] > z) {
                high = stop;
                break;
            }
        }

        if (low && high) {
            var zoomDiff = high[0] - low[0],
                zoomProgress = z - low[0],

                t = base === 1 ?
                zoomProgress / zoomDiff :
                (Math.pow(base, zoomProgress) - 1) / (Math.pow(base, zoomDiff) - 1);

            return interpolate(low[1], high[1], t);

        } else if (low) {
            return low[1];

        } else if (high) {
            return high[1];
        }
    };
};

exports['piecewise-constant'] = function(f) {
    if (!f.stops) {
        return constant(f);
    }

    var stops = f.stops;

    return function(z) {
        for (var i = 0; i < stops.length; i++) {
            if (stops[i][0] > z) {
                return stops[i === 0 ? 0 : i - 1][1];
            }
        }

        return stops[stops.length - 1][1];
    }
};

},{}],117:[function(require,module,exports){
'use strict';

var reference = require('../../reference/latest.js');
var validate = require('./parsed');

module.exports = function(style) {
    return validate(style, reference);
};

},{"../../reference/latest.js":119,"./parsed":118}],118:[function(require,module,exports){
'use strict';

var parseCSSColor = require('csscolorparser').parseCSSColor;
var format = require('util').format;

module.exports = function(style, reference) {

    var constants = style.constants || {},
        layers = {},
        errors = [];

    function error(key, val /*, message, ...*/) {
        var err = {
            message: (key ? key + ': ' : '') +
            format.apply(format, Array.prototype.slice.call(arguments, 2))
        };

        if (val !== null && val !== undefined && val.__line__) {
            err.line = val.__line__;
        }

        errors.push(err);
    }

    // Main recursive validation function. Tracks:
    //
    // - key: string representing location of validation in style tree. Used only
    //   for more informative error reporting.
    // - val: current value from style being evaluated. May be anything from a
    //   high level object that needs to be descended into deeper or a simple
    //   scalar value.
    // - spec: current spec being evaluated. Tracks val.
    //
    function validate(key, val, spec) {
        var type = typeof_(val);

        // Constants
        if (type === 'string' && val[0] === '@') {
            if (!(val in constants)) {
                return error(key, val, 'constant "%s" not found', val);
            }
            val = constants[val];
            type = typeof_(val);
        }

        // Functions
        if (spec.function && type === 'object') {
            return validate.function(key, val, spec);
        }

        if (spec.type) {
            var validator = validate[spec.type];
            if (validator) {
                return validator(key, val, spec);
            }
            spec = reference[spec.type];
        }

        validate.object(key, val, spec);
    }

    validate.constants = function(key, val) {
        var type = typeof_(val);
        if (type !== 'object') {
            return error(key, val, 'object expected, %s found', type);
        }

        for (var k in val) {
            if (k[0] !== '@') {
                error(key + '.' + k, val[k], 'constants must start with "@"');
            }
        }
    };

    validate.source = function(key, val) {
        if (!val.type) {
            error(key, val, '"type" is required');
            return;
        }

        var type = unbundle(val.type);
        switch (type) {
            case 'vector':
            case 'raster':
                validate.object(key, val, reference.source_tile);

                if ('url' in val) {
                    for (var prop in val) {
                        if (['type', 'url', 'tileSize'].indexOf(prop) < 0) {
                            error(key + '.' + prop, val[prop], 'a source with a "url" property may not include a "%s" property', prop);
                        }
                    }
                }

                break;
            case 'geojson':
                validate.object(key, val, reference.source_geojson);
                break;
            case 'video':
                validate.object(key, val, reference.source_video);
                break;
            default:
                validate.enum(key + '.type', val.type, {values: ['vector', 'raster', 'geojson', 'video']});
        }
    };

    validate.layer = function(key, val) {
        if (!val.type && !val.ref) {
            error(key, val, 'either "type" or "ref" is required');
        }

        var type = unbundle(val.type),
            ref = unbundle(val.ref);

        if (val.id) {
            if (layers[val.id]) {
                error(key, val.id, 'duplicate layer id "%s", previously used at line %d', val.id, layers[val.id]);
            } else {
                layers[val.id] = val.id.__line__;
            }
        }

        if ('ref' in val) {
            ['type', 'source', 'source-layer', 'filter', 'layout'].forEach(function (p) {
                if (p in val) {
                    error(key, val[p], '"%s" is prohibited for ref layers', p);
                }
            });

            var parent;

            style.layers.forEach(function(layer) {
                if (layer.id == ref) parent = layer;
            });

            if (!parent) {
                error(key, val.ref, 'ref layer "%s" not found', ref);
            } else if (parent.ref) {
                error(key, val.ref, 'ref cannot reference another ref layer');
            } else {
                type = parent.type;
            }
        } else if (type !== 'background') {
            if (!val.source) {
                error(key, val, 'missing required property "source"');
            } else {
                var source = style.sources[val.source];
                if (!source) {
                    error(key, val.source, 'source "%s" not found', val.source);
                } else if (source.type == 'vector' && type == 'raster') {
                    error(key, val.source, 'layer "%s" requires a raster source', val.id);
                } else if (source.type == 'raster' && type != 'raster') {
                    error(key, val.source, 'layer "%s" requires a vector source', val.id);
                }
            }
        }

        validate.object(key, val, reference.layer, {
            filter: validate.filter,
            layout: function(key, val) {
                var spec = reference['layout_' + type];
                return type && spec && validate(key, val, spec);
            },
            paint: function(key, val) {
                var spec = reference['paint_' + type];
                return type && spec && validate(key, val, spec);
            }
        });
    };

    validate.object = function (key, val, spec, validators) {
        validators = validators || {};

        var type = typeof_(val);
        if (type !== 'object') {
            return error(key, val, 'object expected, %s found', type);
        }

        for (var k in val) {
            var speckey = k.split('.')[0]; // treat 'paint.*' as 'paint'
            var def = spec[speckey] || spec['*'];
            var transition = speckey.match(/^(.*)-transition$/);

            if (def) {
                (validators[speckey] || validate)((key ? key + '.' : key) + k, val[k], def);
            } else if (transition && spec[transition[1]] && spec[transition[1]].transition) {
                validate((key ? key + '.' : key) + k, val[k], reference.transition);
            // tolerate root-level extra keys & arbitrary layer properties
            } else if (key !== '' && key.split('.').length !== 1) {
                error(key, val[k], 'unknown property "%s"', k);
            }
        }

        for (var l in spec) {
            if (spec[l].required && spec[l]['default'] === undefined && val[l] === undefined) {
                error(key, val, 'missing required property "%s"', l);
            }
        }
    };

    validate.array = function (key, val, spec, validator) {
        if (typeof_(val) !== 'array') {
            return error(key, val, 'array expected, %s found', typeof_(val));
        }

        if (spec.length && val.length !== spec.length) {
            return error(key, val, 'array length %d expected, length %d found', spec.length, val.length);
        }

        var value = {
            "type": spec.value
        };

        if (style.version < 7) {
            value.function = spec.function;
        }

        if (typeof_(spec.value) === 'object') {
            value = spec.value;
        }

        for (var i = 0; i < val.length; i++) {
            (validator || validate)(key + '[' + i + ']', val[i], value);
        }
    };

    validate.filter = function(key, val) {
        var type;

        if (typeof_(val) !== 'array') {
            return error(key, val, 'array expected, %s found', typeof_(val));
        }

        if (val.length < 1) {
            return error(key, val, 'filter array must have at least 1 element');
        }

        validate.enum(key + '[0]', val[0], reference.filter_operator);

        switch (unbundle(val[0])) {
            case '<':
            case '<=':
            case '>':
            case '>=':
                if (val.length >= 2 && val[1] == '$type') {
                    error(key, val, '"$type" cannot be use with operator "%s"', val[0]);
                }
            /* falls through */
            case '==':
            case '!=':
                if (val.length != 3) {
                    error(key, val, 'filter array for operator "%s" must have 3 elements', val[0]);
                }
            /* falls through */
            case 'in':
            case '!in':
                if (val.length >= 2) {
                    type = typeof_(val[1]);
                    if (type !== 'string') {
                        error(key + '[1]', val[1], 'string expected, %s found', type);
                    } else if (val[1][0] === '@') {
                        error(key + '[1]', val[1], 'filter key cannot be a constant');
                    }
                }
                for (var i = 2; i < val.length; i++) {
                    type = typeof_(val[i]);
                    if (val[1] == '$type') {
                        validate.enum(key + '[' + i + ']', val[i], reference.geometry_type);
                    } else if (type === 'string' && val[i][0] === '@') {
                        error(key + '[' + i + ']', val[i], 'filter value cannot be a constant');
                    } else if (type !== 'string' && type !== 'number' && type !== 'boolean') {
                        error(key + '[' + i + ']', val[i], 'string, number, or boolean expected, %s found', type);
                    }
                }
                break;

            case 'any':
            case 'all':
            case 'none':
                for (i = 1; i < val.length; i++) {
                    validate.filter(key + '[' + i + ']', val[i]);
                }
                break;
        }
    };

    validate.function = function(key, val, spec) {
        validate.object(key, val, reference.function, {
            stops: function (key, val, arraySpec) {
                var lastStop = -Infinity;
                validate.array(key, val, arraySpec, function validateStop(key, val) {
                    if (typeof_(val) !== 'array') {
                        return error(key, val, 'array expected, %s found', typeof_(val));
                    }

                    if (val.length !== 2) {
                        return error(key, val, 'array length %d expected, length %d found', 2, val.length);
                    }

                    validate(key + '[0]', val[0], {type: 'number'});
                    validate(key + '[1]', val[1], spec);

                    if (typeof_(val[0]) === 'number') {
                        if (spec.function === 'piecewise-constant' && val[0] % 1 !== 0) {
                            error(key + '[0]', val[0], 'zoom level for piecewise-constant functions must be an integer');
                        }

                        if (val[0] < lastStop) {
                            error(key + '[0]', val[0], 'array stops must appear in ascending order');
                        }

                        lastStop = val[0];
                    }
                });

                if (typeof_(val) === 'array' && val.length === 0) {
                    error(key, val, 'array must have at least one stop');
                }
            }
        });
    };

    validate.enum = function (key, val, spec) {
        if (spec.values.indexOf(unbundle(val)) === -1) {
            error(key, val, 'expected one of [%s], %s found', spec.values.join(', '), val);
        }
    };

    validate.color = function(key, val) {
        var type = typeof_(val);
        if (type !== 'string') {
            error(key, val, 'color expected, %s found', type);
        } else if (parseCSSColor(val) === null) {
            error(key, val, 'color expected, "%s" found', val);
        }
    };

    function typeValidator(expected) {
        return function(key, val, spec) {
            var actual = typeof_(val);
            if (actual !== expected) {
                error(key, val, '%s expected, %s found', expected, actual);
            }

            if ('minimum' in spec && val < spec.minimum) {
                error(key, val, '%s is less than the minimum value %s', val, spec.minimum);
            }

            if ('maximum' in spec && val > spec.maximum) {
                error(key, val, '%s is greater than the maximum value %s', val, spec.maximum);
            }
        };
    }

    validate.number = typeValidator('number');
    validate.string = typeValidator('string');
    validate.boolean = typeValidator('boolean');

    validate['*'] = function() {};

    validate('', style, reference.$root);

    return errors;
};

function typeof_(val) {
    if (val instanceof Number)
        return 'number';
    if (val instanceof String)
        return 'string';
    if (val instanceof Boolean)
        return 'boolean';
    if (Array.isArray(val))
        return 'array';
    if (val === null)
        return 'null';
    return typeof val;
}

function unbundle(_) {
    if (_ instanceof Number ||
        _ instanceof String ||
        _ instanceof Boolean) {
        return _.valueOf();
    } else {
        return _;
    }
}

},{"csscolorparser":108,"util":10}],119:[function(require,module,exports){
module.exports = require('./v7.json');

},{"./v7.json":120}],120:[function(require,module,exports){
module.exports={
  "$version": 7,
  "$root": {
    "version": {
      "required": true,
      "type": "enum",
      "values": [
        7
      ],
      "doc": "Stylesheet version number. Must be 7."
    },
    "name": {
      "type": "string",
      "doc": "A human-readable name for the style."
    },
    "constants": {
      "type": "constants",
      "doc": "An object of constants to be referenced in layers."
    },
    "sources": {
      "required": true,
      "type": "sources",
      "doc": "Data source specifications."
    },
    "sprite": {
      "type": "string",
      "doc": "A base URL for retrieving the sprite image and metadata. The extensions `.png`, `.json` and scale factor `@2x.png` will be automatically appended."
    },
    "glyphs": {
      "type": "string",
      "doc": "A URL template for loading signed-distance-field glyph sets in PBF format. Valid tokens are {fontstack} and {range}."
    },
    "transition": {
      "type": "transition",
      "doc": "A global transition definition to use as a default across properties."
    },
    "layers": {
      "required": true,
      "type": "array",
      "value": "layer",
      "doc": "Layers will be drawn in the order of this array."
    }
  },
  "constants": {
    "*": {
      "type": "*",
      "doc": "A constant that will be replaced verbatim in the referencing place. This can be anything, including objects and arrays. All variable names must be prefixed with an `@` symbol."
    }
  },
  "sources": {
    "*": {
      "type": "source",
      "doc": "Specification of a data source. For vector and raster sources, either TileJSON or a URL to a TileJSON must be provided. For GeoJSON and video sources, a URL must be provided."
    }
  },
  "source": [
    "source_tile",
    "source_geojson",
    "source_video"
  ],
  "source_tile": {
    "type": {
      "required": true,
      "type": "enum",
      "values": [
        "vector",
        "raster"
      ],
      "doc": "The data type of the source."
    },
    "url": {
      "type": "string",
      "doc": "A URL to a TileJSON resource. Supported protocols are `http:`, `https:`, and `mapbox://<mapid>`."
    },
    "tiles": {
      "type": "array",
      "value": "string",
      "doc": "An array of one or more tile source URLs, as in the TileJSON spec."
    },
    "minzoom": {
      "type": "number",
      "default": 0,
      "doc": "Minimum zoom level for which tiles are available, as in the TileJSON spec."
    },
    "maxzoom": {
      "type": "number",
      "default": 22,
      "doc": "Maximum zoom level for which tiles are available, as in the TileJSON spec. Data from tiles at the maxzoom are used when displaying the map at higher zoom levels."
    },
    "tileSize": {
      "type": "number",
      "default": 512,
      "units": "pixels",
      "doc": "The minimum visual size to display tiles for this layer. Only configurable for raster layers."
    },
    "*": {
      "type": "*",
      "doc": "Other keys to configure the data source."
    }
  },
  "source_geojson": {
    "type": {
      "required": true,
      "type": "enum",
      "values": [
        "geojson"
      ]
    },
    "data": {
      "type": "*"
    }
  },
  "source_video": {
    "type": {
      "required": true,
      "type": "enum",
      "values": [
        "video"
      ]
    },
    "url": {
      "required": true,
      "type": "array",
      "value": "string",
      "doc": "URLs to video content in order of preferred format."
    },
    "coordinates": {
      "required": true,
      "type": "array",
      "length": 4,
      "value": {
        "type": "array",
        "length": 2,
        "value": "number"
      }
    }
  },
  "layer": {
    "id": {
      "type": "string",
      "doc": "Unique layer name."
    },
    "type": {
      "type": "enum",
      "values": [
        "fill",
        "line",
        "symbol",
        "raster",
        "background"
      ],
      "doc": "Rendering type of this layer."
    },
    "ref": {
      "type": "string",
      "doc": "References another layer to copy `type`, `source`, `source-layer`, `minzoom`, `maxzoom`, `filter`, and `layout` properties from. This allows the layers to share processing and be more efficient."
    },
    "source": {
      "type": "string",
      "doc": "Name of a source description to be used for this layer."
    },
    "source-layer": {
      "type": "string",
      "doc": "Layer to use from a vector tile source. Required if the source supports multiple layers."
    },
    "minzoom": {
      "type": "number",
      "minimum": 0,
      "maximum": 22,
      "doc": "The minimum zoom level on which the layer gets parsed and appears on."
    },
    "maxzoom": {
      "type": "number",
      "minimum": 0,
      "maximum": 22,
      "doc": "The maximum zoom level on which the layer gets parsed and appears on."
    },
    "interactive": {
      "type": "boolean",
      "doc": "Enable querying of feature data from this layer for interactivity.",
      "default": false
    },
    "filter": {
      "type": "filter",
      "doc": "A expression specifying conditions on source features. Only features that match the filter are displayed."
    },
    "layout": {
      "type": "layout",
      "doc": "Layout properties for the layer."
    },
    "paint": {
      "type": "paint",
      "doc": "Default paint properties for this layer."
    },
    "paint.*": {
      "type": "paint",
      "doc": "Class-specific paint properties for this layer. The class name is the part after the first dot."
    }
  },
  "layout": [
    "layout_fill",
    "layout_line",
    "layout_symbol",
    "layout_raster",
    "layout_background"
  ],
  "layout_background": {
    "visibility": {
      "type": "enum",
      "function": "piecewise-constant",
      "values": [
        "visible",
        "none"
      ],
      "default": "visible",
      "doc": "The display of this layer. `none` hides this layer."
    }
  },
  "layout_fill": {
    "visibility": {
      "type": "enum",
      "function": "piecewise-constant",
      "values": [
        "visible",
        "none"
      ],
      "default": "visible",
      "doc": "The display of this layer. `none` hides this layer."
    }
  },
  "layout_line": {
    "line-cap": {
      "type": "enum",
      "function": "piecewise-constant",
      "values": [
        "butt",
        "round",
        "square"
      ],
      "default": "butt",
      "doc": "The display of line endings."
    },
    "line-join": {
      "type": "enum",
      "function": "piecewise-constant",
      "values": [
        "bevel",
        "round",
        "miter"
      ],
      "default": "miter",
      "doc": "The display of lines when joining."
    },
    "line-miter-limit": {
      "type": "number",
      "default": 2,
      "function": "interpolated",
      "doc": "Used to automatically convert miter joins to bevel joins for sharp angles.",
      "requires": [
        {
          "line-join": "miter"
        }
      ]
    },
    "line-round-limit": {
      "type": "number",
      "default": 1,
      "function": "interpolated",
      "doc": "Used to automatically convert round joins to miter joins for shallow angles.",
      "requires": [
        {
          "line-join": "round"
        }
      ]
    },
    "visibility": {
      "type": "enum",
      "function": "piecewise-constant",
      "values": [
        "visible",
        "none"
      ],
      "default": "visible",
      "doc": "The display of this layer. `none` hides this layer."
    }
  },
  "layout_symbol": {
    "symbol-placement": {
      "type": "enum",
      "function": "piecewise-constant",
      "values": [
          "point",
          "line"
      ],
      "default": "point",
      "doc": "Label placement relative to its geometry. `line` can only be used on LineStrings and Polygons."
    },
    "symbol-min-distance": {
      "type": "number",
      "default": 250,
      "minimum": 1,
      "function": "interpolated",
      "units": "pixels",
      "doc": "Minimum distance between two symbol anchors.",
      "requires": [
        {
          "symbol-placement": "line"
        }
      ]
    },
    "symbol-avoid-edges": {
      "type": "boolean",
      "function": "piecewise-constant",
      "default": false,
      "doc": "If true, the symbols will not cross tile edges to avoid mutual collisions. Recommended in layers that don't have enough padding in the vector tile to prevent collisions, or if it is a point symbol layer placed after a line symbol layer."
    },
    "icon-allow-overlap": {
      "type": "boolean",
      "function": "piecewise-constant",
      "default": false,
      "doc": "If true, the icon will be visible even if it collides with other icons and text.",
      "requires": [
        "icon-image"
      ]
    },
    "icon-ignore-placement": {
      "type": "boolean",
      "function": "piecewise-constant",
      "default": false,
      "doc": "If true, the icon won't affect placement of other icons and text.",
      "requires": [
        "icon-image"
      ]
    },
    "icon-optional": {
      "type": "boolean",
      "function": "piecewise-constant",
      "default": false,
      "doc": "If true, the symbol will appear without its icon, in spaces where the icon would make it too large to fit.",
      "requires": [
        "icon-image",
        "text-field"
      ]
    },
    "icon-rotation-alignment": {
      "type": "enum",
      "function": "piecewise-constant",
      "values": [
        "map",
        "viewport"
      ],
      "default": "viewport",
      "doc": "Orientation of icon when map is rotated.",
      "requires": [
        "icon-image"
      ]
    },
    "icon-max-size": {
      "type": "number",
      "default": 1,
      "minimum": 0,
      "function": "interpolated",
      "doc": "The maximum factor to scale the icon.",
      "requires": [
        "icon-image"
      ]
    },
    "icon-image": {
      "type": "string",
      "function": "piecewise-constant",
      "doc": "A string with {tokens} replaced, referencing the data property to pull from.",
      "tokens": true
    },
    "icon-rotate": {
      "type": "number",
      "default": 0,
      "period": 360,
      "function": "interpolated",
      "units": "degrees",
      "doc": "Rotates the icon clockwise.",
      "requires": [
        "icon-image"
      ]
    },
    "icon-padding": {
      "type": "number",
      "default": 2,
      "minimum": 0,
      "function": "interpolated",
      "units": "pixels",
      "doc": "Padding value around icon bounding box to avoid icon collisions.",
      "requires": [
        "icon-image"
      ]
    },
    "icon-keep-upright": {
      "type": "boolean",
      "function": "piecewise-constant",
      "default": false,
      "doc": "If true, the icon may be flipped to prevent it from being rendered upside-down",
      "requires": [
        "icon-image",
        {
          "icon-rotation-alignment": "map"
        }
      ]
    },
    "icon-offset": {
      "type": "array",
      "value": "number",
      "length": 2,
      "default": [
        0,
        0
      ],
      "function": "interpolated",
      "doc": "Icon's offset distance. Values are [x, y] where negatives indicate left and up, respectively.",
      "requires": [
        "icon-image"
      ]
    },
    "text-rotation-alignment": {
      "type": "enum",
      "function": "piecewise-constant",
      "values": [
        "map",
        "viewport"
      ],
      "default": "viewport",
      "doc": "Orientation of icon or text when map is rotated.",
      "requires": [
        "text-field"
      ]
    },
    "text-field": {
      "type": "string",
      "function": "piecewise-constant",
      "default": "",
      "tokens": true,
      "doc": "Value to use for a text label. Feature properties are specified using tokens like {field_name}."
    },
    "text-font": {
      "type": "string",
      "function": "piecewise-constant",
      "default": "Open Sans Regular, Arial Unicode MS Regular",
      "doc": "Font stack to use for displaying text.",
      "requires": [
        "text-field"
      ]
    },
    "text-max-size": {
      "type": "number",
      "default": 16,
      "minimum": 0,
      "units": "pixels",
      "function": "interpolated",
      "doc": "The maximum size text will be laid out, to calculate collisions with.",
      "requires": [
        "text-field"
      ]
    },
    "text-max-width": {
      "type": "number",
      "default": 15,
      "minimum": 0,
      "units": "em",
      "function": "interpolated",
      "doc": "The maximum line width for text wrapping.",
      "requires": [
        "text-field"
      ]
    },
    "text-line-height": {
      "type": "number",
      "default": 1.2,
      "units": "em",
      "function": "interpolated",
      "doc": "Text leading value for multi-line text.",
      "requires": [
        "text-field"
      ]
    },
    "text-letter-spacing": {
      "type": "number",
      "default": 0,
      "units": "em",
      "function": "interpolated",
      "doc": "Text kerning value.",
      "requires": [
        "text-field"
      ]
    },
    "text-justify": {
      "type": "enum",
      "function": "piecewise-constant",
      "values": [
        "left",
        "center",
        "right"
      ],
      "default": "center",
      "doc": "Text justification options.",
      "requires": [
        "text-field"
      ]
    },
    "text-anchor": {
      "type": "enum",
      "function": "piecewise-constant",
      "values": [
        "center",
        "left",
        "right",
        "top",
        "bottom",
        "top-left",
        "top-right",
        "bottom-left",
        "bottom-right"
      ],
      "default": "center",
      "doc": "Which part of the text to place closest to the anchor.",
      "requires": [
        "text-field"
      ]
    },
    "text-max-angle": {
      "type": "number",
      "default": 45,
      "units": "degrees",
      "function": "interpolated",
      "doc": "Maximum angle change between adjacent characters.",
      "requires": [
        "text-field",
        {
          "symbol-placement": "line"
        }
      ]
    },
    "text-rotate": {
      "type": "number",
      "default": 0,
      "period": 360,
      "units": "degrees",
      "function": "interpolated",
      "doc": "Rotates the text clockwise.",
      "requires": [
        "text-field"
      ]
    },
    "text-padding": {
      "type": "number",
      "default": 2,
      "minimum": 0,
      "units": "pixels",
      "function": "interpolated",
      "doc": "Padding value around text bounding box to avoid label collisions.",
      "requires": [
        "text-field"
      ]
    },
    "text-keep-upright": {
      "type": "boolean",
      "function": "piecewise-constant",
      "default": true,
      "doc": "If true, the text may be flipped vertically to prevent it from being rendered upside-down.",
      "requires": [
        "text-field",
        {
          "text-rotation-alignment": "map"
        }
      ]
    },
    "text-transform": {
      "type": "enum",
      "function": "piecewise-constant",
      "values": [
        "none",
        "uppercase",
        "lowercase"
      ],
      "default": "none",
      "doc": "Specifies how to capitalize text, similar to the CSS `text-transform` property.",
      "requires": [
        "text-field"
      ]
    },
    "text-offset": {
      "type": "array",
      "doc": "Specifies the distance that text is offset from its anchor horizontally and vertically.",
      "value": "number",
      "units": "ems",
      "function": "interpolated",
      "length": 2,
      "default": [
        0,
        0
      ],
      "requires": [
        "text-field"
      ]
    },
    "text-allow-overlap": {
      "type": "boolean",
      "function": "piecewise-constant",
      "default": false,
      "doc": "If true, the text will be visible even if it collides with other icons and labels.",
      "requires": [
        "text-field"
      ]
    },
    "text-ignore-placement": {
      "type": "boolean",
      "function": "piecewise-constant",
      "default": false,
      "doc": "If true, the text won't affect placement of other icons and labels.",
      "requires": [
        "text-field"
      ]
    },
    "text-optional": {
      "type": "boolean",
      "function": "piecewise-constant",
      "default": false,
      "doc": "If true, the symbol will appear without its text, in spaces where the text would make it too large to fit.",
      "requires": [
        "text-field",
        "icon-image"
      ]
    },
    "visibility": {
      "type": "enum",
      "function": "piecewise-constant",
      "values": [
        "visible",
        "none"
      ],
      "default": "visible",
      "doc": "The display of this layer. `none` hides this layer."
    }
  },
  "layout_raster": {
    "visibility": {
      "type": "enum",
      "function": "piecewise-constant",
      "values": [
        "visible",
        "none"
      ],
      "default": "visible",
      "doc": "The display of this layer. `none` hides this layer."
    }
  },
  "filter": {
    "type": "array",
    "value": "*"
  },
  "filter_operator": {
    "type": "enum",
    "values": [
      "==",
      "!=",
      ">",
      ">=",
      "<",
      "<=",
      "in",
      "!in",
      "all",
      "any",
      "none"
    ]
  },
  "geometry_type": {
    "type": "enum",
    "values": [
      "Point",
      "LineString",
      "Polygon"
    ]
  },
  "function": {
    "stops": {
      "type": "array",
      "required": true,
      "doc": "An array of stops.",
      "value": "function_stop"
    },
    "base": {
      "type": "number",
      "default": 1,
      "minimum": 0,
      "doc": "The exponential base of the interpolation curve. It controls the rate at which the result increases. Higher values make the result increase more towards the high end of the range. With `1` the stops are interpolated linearly."
    }
  },
  "function_stop": {
    "type": "array",
    "minimum": 0,
    "maximum": 22,
    "value": [
      "number",
      "color"
    ],
    "length": 2,
    "doc": "Zoom level and value pair."
  },
  "paint": [
    "paint_fill",
    "paint_line",
    "paint_symbol",
    "paint_raster",
    "paint_background"
  ],
  "paint_fill": {
    "fill-antialias": {
      "type": "boolean",
      "function": "piecewise-constant",
      "default": true,
      "doc": "Whether or not the fill should be antialiased."
    },
    "fill-opacity": {
      "type": "number",
      "function": "interpolated",
      "default": 1,
      "minimum": 0,
      "maximum": 1,
      "doc": "The opacity given to the fill color.",
      "transition": true
    },
    "fill-color": {
      "type": "color",
      "default": "#000000",
      "doc": "The color of the fill.",
      "function": "interpolated",
      "transition": true,
      "requires": [
        {
          "!": "fill-image"
        }
      ]
    },
    "fill-outline-color": {
      "type": "color",
      "doc": "The outline color of the fill. Matches the value of `fill-color` if unspecified.",
      "function": "interpolated",
      "transition": true,
      "requires": [
        {
          "!": "fill-image"
        },
        {
          "fill-antialias": true
        }
      ]
    },
    "fill-translate": {
      "type": "array",
      "value": "number",
      "length": 2,
      "default": [
        0,
        0
      ],
      "function": "interpolated",
      "transition": true,
      "units": "pixels",
      "doc": "The geometry's offset. Values are [x, y] where negatives indicate left and up, respectively."
    },
    "fill-translate-anchor": {
      "type": "enum",
      "function": "piecewise-constant",
      "values": [
        "map",
        "viewport"
      ],
      "doc": "Control whether the translation is relative to the map (north) or viewport (screen)",
      "default": "map",
      "requires": [
        "fill-translate"
      ]
    },
    "fill-image": {
      "type": "string",
      "function": "piecewise-constant",
      "transition": true,
      "doc": "Name of image in sprite to use for drawing image fills."
    }
  },
  "paint_line": {
    "line-opacity": {
      "type": "number",
      "doc": "The opacity at which the line will be drawn.",
      "function": "interpolated",
      "default": 1,
      "minimum": 0,
      "maximum": 1,
      "transition": true
    },
    "line-color": {
      "type": "color",
      "doc": "The color with which the line will be drawn.",
      "default": "#000000",
      "function": "interpolated",
      "transition": true,
      "requires": [
        {
          "!": "line-image"
        }
      ]
    },
    "line-translate": {
      "type": "array",
      "value": "number",
      "length": 2,
      "default": [
        0,
        0
      ],
      "function": "interpolated",
      "transition": true,
      "units": "pixels",
      "doc": "The geometry's offset. Values are [x, y] where negatives indicate left and up, respectively."
    },
    "line-translate-anchor": {
      "type": "enum",
      "function": "piecewise-constant",
      "values": [
        "map",
        "viewport"
      ],
      "doc": "Control whether the translation is relative to the map (north) or viewport (screen)",
      "default": "map",
      "requires": [
        "line-translate"
      ]
    },
    "line-width": {
      "type": "number",
      "default": 1,
      "minimum": 0,
      "function": "interpolated",
      "transition": true,
      "units": "pixels",
      "doc": "Stroke thickness."
    },
    "line-gap-width": {
      "type": "number",
      "default": 0,
      "minimum": 0,
      "doc": "Draws a line casing outside of a line's actual path. Value indicates the width of the inner gap.",
      "function": "interpolated",
      "transition": true,
      "units": "pixels"
    },
    "line-blur": {
      "type": "number",
      "default": 0,
      "minimum": 0,
      "function": "interpolated",
      "transition": true,
      "units": "pixels",
      "doc": "Blur applied to the line, in pixels."
    },
    "line-dasharray": {
      "type": "array",
      "function": "piecewise-constant",
      "value": "number",
      "doc": "Specifies the lengths of the alternating dashes and gaps that form the dash pattern. The lengths are later scaled by the line width. To convert a dash length to pixels, multiply the length by the current line width.",
      "minimum": 0,
      "transition": true,
      "units": "line widths",
      "requires": [
        {
          "!": "line-image"
        }
      ]
    },
    "line-image": {
      "type": "string",
      "function": "piecewise-constant",
      "transition": true,
      "doc": "Name of image in sprite to use for drawing image lines."
    }
  },
  "paint_symbol": {
    "icon-opacity": {
      "doc": "The opacity at which the icon will be drawn.",
      "type": "number",
      "default": 1,
      "minimum": 0,
      "maximum": 1,
      "function": "interpolated",
      "transition": true,
      "requires": [
        "icon-image"
      ]
    },
    "icon-size": {
      "type": "number",
      "default": 1,
      "function": "interpolated",
      "transition": true,
      "doc": "Scale factor for icon. 1 is original size, 3 triples the size.",
      "requires": [
        "icon-image"
      ]
    },
    "icon-color": {
      "type": "color",
      "default": "#000000",
      "function": "interpolated",
      "transition": true,
      "doc": "The color of the icon. This can only be used with sdf icons.",
      "requires": [
        "icon-image"
      ]
    },
    "icon-halo-color": {
      "type": "color",
      "default": "rgba(0, 0, 0, 0)",
      "function": "interpolated",
      "transition": true,
      "doc": "The color of the icon's halo. Icon halos can only be used with sdf icons.",
      "requires": [
        "icon-image"
      ]
    },
    "icon-halo-width": {
      "type": "number",
      "default": 0,
      "minimum": 0,
      "function": "interpolated",
      "transition": true,
      "units": "pixels",
      "doc": "Distance of halo to the icon outline.",
      "requires": [
        "icon-image"
      ]
    },
    "icon-halo-blur": {
      "type": "number",
      "default": 0,
      "minimum": 0,
      "function": "interpolated",
      "transition": true,
      "units": "pixels",
      "doc": "Fade out the halo towards the outside.",
      "requires": [
        "icon-image"
      ]
    },
    "icon-translate": {
      "type": "array",
      "value": "number",
      "length": 2,
      "default": [
        0,
        0
      ],
      "function": "interpolated",
      "transition": true,
      "units": "pixels",
      "doc": "An icon's offset distance. Values are [x, y] where negatives indicate left and up, respectively.",
      "requires": [
        "icon-image"
      ]
    },
    "icon-translate-anchor": {
      "type": "enum",
      "function": "piecewise-constant",
      "values": [
        "map",
        "viewport"
      ],
      "doc": "Control whether the translation is relative to the map (north) or viewport (screen)",
      "default": "map",
      "requires": [
        "icon-image",
        "icon-translate"
      ]
    },
    "text-opacity": {
      "type": "number",
      "doc": "The opacity at which the text will be drawn.",
      "default": 1,
      "minimum": 0,
      "maximum": 1,
      "function": "interpolated",
      "transition": true,
      "requires": [
        "text-field"
      ]
    },
    "text-size": {
      "type": "number",
      "default": 16,
      "minimum": 0,
      "function": "interpolated",
      "transition": true,
      "units": "pixels",
      "doc": "Font size. If unspecified, the text will be as big as allowed by the layer definition.",
      "requires": [
        "text-field"
      ]
    },
    "text-color": {
      "type": "color",
      "doc": "The color with which the text will be drawn.",
      "default": "#000000",
      "function": "interpolated",
      "transition": true,
      "requires": [
        "text-field"
      ]
    },
    "text-halo-color": {
      "type": "color",
      "default": "rgba(0, 0, 0, 0)",
      "function": "interpolated",
      "transition": true,
      "doc": "The color of the text's halo, which helps it stand out from backgrounds.",
      "requires": [
        "text-field"
      ]
    },
    "text-halo-width": {
      "type": "number",
      "default": 0,
      "minimum": 0,
      "function": "interpolated",
      "transition": true,
      "units": "pixels",
      "doc": "Distance of halo to the font outline. Max text halo width is 1/4 of the font-size.",
      "requires": [
        "text-field"
      ]
    },
    "text-halo-blur": {
      "type": "number",
      "default": 0,
      "minimum": 0,
      "function": "interpolated",
      "transition": true,
      "units": "pixels",
      "doc": "The halo's fadeout distance towards the outside.",
      "requires": [
        "text-field"
      ]
    },
    "text-translate": {
      "type": "array",
      "value": "number",
      "length": 2,
      "default": [
        0,
        0
      ],
      "function": "interpolated",
      "transition": true,
      "units": "pixels",
      "doc": "Label offset. Values are [x, y] where negatives indicate left and up, respectively.",
      "requires": [
        "text-field"
      ]
    },
    "text-translate-anchor": {
      "type": "enum",
      "function": "piecewise-constant",
      "values": [
        "map",
        "viewport"
      ],
      "doc": "Control whether the translation is relative to the map (north) or viewport (screen)",
      "default": "map",
      "requires": [
        "text-field",
        "text-translate"
      ]
    }
  },
  "paint_raster": {
    "raster-opacity": {
      "type": "number",
      "doc": "The opacity at which the image will be drawn.",
      "default": 1,
      "minimum": 0,
      "maximum": 1,
      "function": "interpolated",
      "transition": true
    },
    "raster-hue-rotate": {
      "type": "number",
      "default": 0,
      "period": 360,
      "function": "interpolated",
      "transition": true,
      "units": "degrees",
      "doc": "Rotates hues around the color wheel."
    },
    "raster-brightness-min": {
      "type": "number",
      "function": "interpolated",
      "doc": "Increase or reduce the brightness of the image. The value is the minimum brightness.",
      "default": 0,
      "minimum": 0,
      "maximum": 1,
      "transition": true
    },
    "raster-brightness-max": {
      "type": "number",
      "function": "interpolated",
      "doc": "Increase or reduce the brightness of the image. The value is the maximum brightness.",
      "default": 1,
      "minimum": 0,
      "maximum": 1,
      "transition": true
    },
    "raster-saturation": {
      "type": "number",
      "doc": "Increase or reduce the saturation of the image.",
      "default": 0,
      "minimum": -1,
      "maximum": 1,
      "function": "interpolated",
      "transition": true
    },
    "raster-contrast": {
      "type": "number",
      "doc": "Increase or reduce the contrast of the image.",
      "default": 0,
      "minimum": -1,
      "maximum": 1,
      "function": "interpolated",
      "transition": true
    },
    "raster-fade-duration": {
      "type": "number",
      "default": 300,
      "minimum": 0,
      "function": "interpolated",
      "transition": true,
      "units": "milliseconds",
      "doc": "Fade duration when a new tile is added."
    }
  },
  "paint_background": {
    "background-color": {
      "type": "color",
      "default": "#000000",
      "doc": "The color with which the background will be drawn.",
      "function": "interpolated",
      "transition": true,
      "requires": [
        {
          "!": "background-image"
        }
      ]
    },
    "background-image": {
      "type": "string",
      "function": "piecewise-constant",
      "transition": true,
      "doc": "Optionally an image which is drawn as the background."
    },
    "background-opacity": {
      "type": "number",
      "default": 1,
      "minimum": 0,
      "maximum": 1,
      "doc": "The opacity at which the background will be drawn.",
      "function": "interpolated",
      "transition": true
    }
  },
  "transition": {
    "duration": {
      "type": "number",
      "default": 300,
      "minimum": 0,
      "units": "milliseconds",
      "doc": "Time allotted for transitions to complete."
    },
    "delay": {
      "type": "number",
      "default": 0,
      "minimum": 0,
      "units": "milliseconds",
      "doc": "Length of time before a transition begins."
    }
  }
}

},{}],121:[function(require,module,exports){
'use strict';

// lightweight Buffer shim for pbf browser build
// based on code from github.com/feross/buffer (MIT-licensed)

module.exports = Buffer;

var ieee754 = require('ieee754');

var BufferMethods;

function Buffer(length) {
    var arr;
    if (length && length.length) {
        arr = length;
        length = arr.length;
    }
    var buf = new Uint8Array(length || 0);
    if (arr) buf.set(arr);

    buf.readUInt32LE = BufferMethods.readUInt32LE;
    buf.writeUInt32LE = BufferMethods.writeUInt32LE;
    buf.readInt32LE = BufferMethods.readInt32LE;
    buf.writeInt32LE = BufferMethods.writeInt32LE;
    buf.readFloatLE = BufferMethods.readFloatLE;
    buf.writeFloatLE = BufferMethods.writeFloatLE;
    buf.readDoubleLE = BufferMethods.readDoubleLE;
    buf.writeDoubleLE = BufferMethods.writeDoubleLE;
    buf.toString = BufferMethods.toString;
    buf.write = BufferMethods.write;
    buf.slice = BufferMethods.slice;
    buf.copy = BufferMethods.copy;

    buf._isBuffer = true;
    return buf;
}

var lastStr, lastStrEncoded;

BufferMethods = {
    readUInt32LE: function(pos) {
        return ((this[pos]) |
            (this[pos + 1] << 8) |
            (this[pos + 2] << 16)) +
            (this[pos + 3] * 0x1000000);
    },

    writeUInt32LE: function(val, pos) {
        this[pos] = val;
        this[pos + 1] = (val >>> 8);
        this[pos + 2] = (val >>> 16);
        this[pos + 3] = (val >>> 24);
    },

    readInt32LE: function(pos) {
        return ((this[pos]) |
            (this[pos + 1] << 8) |
            (this[pos + 2] << 16)) +
            (this[pos + 3] << 24);
    },

    readFloatLE:  function(pos) { return ieee754.read(this, pos, true, 23, 4); },
    readDoubleLE: function(pos) { return ieee754.read(this, pos, true, 52, 8); },

    writeFloatLE:  function(val, pos) { return ieee754.write(this, val, pos, true, 23, 4); },
    writeDoubleLE: function(val, pos) { return ieee754.write(this, val, pos, true, 52, 8); },

    toString: function(encoding, start, end) {
        var str = '',
            tmp = '';

        start = start || 0;
        end = Math.min(this.length, end || this.length);

        for (var i = start; i < end; i++) {
            var ch = this[i];
            if (ch <= 0x7F) {
                str += decodeURIComponent(tmp) + String.fromCharCode(ch);
                tmp = '';
            } else {
                tmp += '%' + ch.toString(16);
            }
        }

        str += decodeURIComponent(tmp);

        return str;
    },

    write: function(str, pos) {
        var bytes = str === lastStr ? lastStrEncoded : encodeString(str);
        for (var i = 0; i < bytes.length; i++) {
            this[pos + i] = bytes[i];
        }
    },

    slice: function(start, end) {
        return this.subarray(start, end);
    },

    copy: function(buf, pos) {
        pos = pos || 0;
        for (var i = 0; i < this.length; i++) {
            buf[pos + i] = this[i];
        }
    }
};

BufferMethods.writeInt32LE = BufferMethods.writeUInt32LE;

Buffer.byteLength = function(str) {
    lastStr = str;
    lastStrEncoded = encodeString(str);
    return lastStrEncoded.length;
};

Buffer.isBuffer = function(buf) {
    return !!(buf && buf._isBuffer);
};

function encodeString(str) {
    var length = str.length,
        bytes = [];

    for (var i = 0, c, lead; i < length; i++) {
        c = str.charCodeAt(i); // code point

        if (c > 0xD7FF && c < 0xE000) {

            if (lead) {
                if (c < 0xDC00) {
                    bytes.push(0xEF, 0xBF, 0xBD);
                    lead = c;
                    continue;

                } else {
                    c = lead - 0xD800 << 10 | c - 0xDC00 | 0x10000;
                    lead = null;
                }

            } else {
                if (c > 0xDBFF || (i + 1 === length)) bytes.push(0xEF, 0xBF, 0xBD);
                else lead = c;

                continue;
            }

        } else if (lead) {
            bytes.push(0xEF, 0xBF, 0xBD);
            lead = null;
        }

        if (c < 0x80) bytes.push(c);
        else if (c < 0x800) bytes.push(c >> 0x6 | 0xC0, c & 0x3F | 0x80);
        else if (c < 0x10000) bytes.push(c >> 0xC | 0xE0, c >> 0x6 & 0x3F | 0x80, c & 0x3F | 0x80);
        else bytes.push(c >> 0x12 | 0xF0, c >> 0xC & 0x3F | 0x80, c >> 0x6 & 0x3F | 0x80, c & 0x3F | 0x80);
    }
    return bytes;
}

},{"ieee754":123}],122:[function(require,module,exports){
(function (global){
'use strict';

module.exports = Pbf;

var Buffer = global.Buffer || require('./buffer');

function Pbf(buf) {
    this.buf = !Buffer.isBuffer(buf) ? new Buffer(buf || 0) : buf;
    this.pos = 0;
    this.length = this.buf.length;
}

Pbf.Varint  = 0; // varint: int32, int64, uint32, uint64, sint32, sint64, bool, enum
Pbf.Fixed64 = 1; // 64-bit: double, fixed64, sfixed64
Pbf.Bytes   = 2; // length-delimited: string, bytes, embedded messages, packed repeated fields
Pbf.Fixed32 = 5; // 32-bit: float, fixed32, sfixed32

var SHIFT_LEFT_32 = (1 << 16) * (1 << 16),
    SHIFT_RIGHT_32 = 1 / SHIFT_LEFT_32,
    POW_2_63 = Math.pow(2, 63);

Pbf.prototype = {

    destroy: function() {
        this.buf = null;
    },

    // === READING =================================================================

    readFields: function(readField, result, end) {
        end = end || this.length;

        while (this.pos < end) {
            var val = this.readVarint(),
                tag = val >> 3,
                startPos = this.pos;

            readField(tag, result, this);

            if (this.pos === startPos) this.skip(val);
        }
        return result;
    },

    readMessage: function(readField, result) {
        return this.readFields(readField, result, this.readVarint() + this.pos);
    },

    readFixed32: function() {
        var val = this.buf.readUInt32LE(this.pos);
        this.pos += 4;
        return val;
    },

    readSFixed32: function() {
        var val = this.buf.readInt32LE(this.pos);
        this.pos += 4;
        return val;
    },

    // 64-bit int handling is based on github.com/dpw/node-buffer-more-ints (MIT-licensed)

    readFixed64: function() {
        var val = this.buf.readUInt32LE(this.pos) + this.buf.readUInt32LE(this.pos + 4) * SHIFT_LEFT_32;
        this.pos += 8;
        return val;
    },

    readSFixed64: function() {
        var val = this.buf.readUInt32LE(this.pos) + this.buf.readInt32LE(this.pos + 4) * SHIFT_LEFT_32;
        this.pos += 8;
        return val;
    },

    readFloat: function() {
        var val = this.buf.readFloatLE(this.pos);
        this.pos += 4;
        return val;
    },

    readDouble: function() {
        var val = this.buf.readDoubleLE(this.pos);
        this.pos += 8;
        return val;
    },

    readVarint: function() {
        var buf = this.buf,
            val, b, b0, b1, b2, b3;

        b0 = buf[this.pos++]; if (b0 < 0x80) return b0;                 b0 = b0 & 0x7f;
        b1 = buf[this.pos++]; if (b1 < 0x80) return b0 | b1 << 7;       b1 = (b1 & 0x7f) << 7;
        b2 = buf[this.pos++]; if (b2 < 0x80) return b0 | b1 | b2 << 14; b2 = (b2 & 0x7f) << 14;
        b3 = buf[this.pos++]; if (b3 < 0x80) return b0 | b1 | b2 | b3 << 21;

        val = b0 | b1 | b2 | (b3 & 0x7f) << 21;

        b = buf[this.pos++]; val += (b & 0x7f) * 0x10000000;         if (b < 0x80) return val;
        b = buf[this.pos++]; val += (b & 0x7f) * 0x800000000;        if (b < 0x80) return val;
        b = buf[this.pos++]; val += (b & 0x7f) * 0x40000000000;      if (b < 0x80) return val;
        b = buf[this.pos++]; val += (b & 0x7f) * 0x2000000000000;    if (b < 0x80) return val;
        b = buf[this.pos++]; val += (b & 0x7f) * 0x100000000000000;  if (b < 0x80) return val;
        b = buf[this.pos++]; val += (b & 0x7f) * 0x8000000000000000; if (b < 0x80) return val;

        throw new Error('Expected varint not more than 10 bytes');
    },

    readVarint64: function() {
        var startPos = this.pos,
            val = this.readVarint();

        if (val < POW_2_63) return val;

        var pos = this.pos - 2;
        while (this.buf[pos] === 0xff) pos--;
        if (pos < startPos) pos = startPos;

        val = 0;
        for (var i = 0; i < pos - startPos + 1; i++) {
            var b = ~this.buf[startPos + i] & 0x7f;
            val += i < 4 ? b << i * 7 : b * Math.pow(2, i * 7);
        }

        return -val - 1;
    },

    readSVarint: function() {
        var num = this.readVarint();
        return num % 2 === 1 ? (num + 1) / -2 : num / 2; // zigzag encoding
    },

    readBoolean: function() {
        return Boolean(this.readVarint());
    },

    readString: function() {
        var end = this.readVarint() + this.pos,
            str = this.buf.toString('utf8', this.pos, end);
        this.pos = end;
        return str;
    },

    readBytes: function() {
        var end = this.readVarint() + this.pos,
            buffer = this.buf.slice(this.pos, end);
        this.pos = end;
        return buffer;
    },

    // verbose for performance reasons; doesn't affect gzipped size

    readPackedVarint: function() {
        var end = this.readVarint() + this.pos, arr = [];
        while (this.pos < end) arr.push(this.readVarint());
        return arr;
    },
    readPackedSVarint: function() {
        var end = this.readVarint() + this.pos, arr = [];
        while (this.pos < end) arr.push(this.readSVarint());
        return arr;
    },
    readPackedBoolean: function() {
        var end = this.readVarint() + this.pos, arr = [];
        while (this.pos < end) arr.push(this.readBoolean());
        return arr;
    },
    readPackedFloat: function() {
        var end = this.readVarint() + this.pos, arr = [];
        while (this.pos < end) arr.push(this.readFloat());
        return arr;
    },
    readPackedDouble: function() {
        var end = this.readVarint() + this.pos, arr = [];
        while (this.pos < end) arr.push(this.readDouble());
        return arr;
    },
    readPackedFixed32: function() {
        var end = this.readVarint() + this.pos, arr = [];
        while (this.pos < end) arr.push(this.readFixed32());
        return arr;
    },
    readPackedSFixed32: function() {
        var end = this.readVarint() + this.pos, arr = [];
        while (this.pos < end) arr.push(this.readSFixed32());
        return arr;
    },
    readPackedFixed64: function() {
        var end = this.readVarint() + this.pos, arr = [];
        while (this.pos < end) arr.push(this.readFixed64());
        return arr;
    },
    readPackedSFixed64: function() {
        var end = this.readVarint() + this.pos, arr = [];
        while (this.pos < end) arr.push(this.readSFixed64());
        return arr;
    },

    skip: function(val) {
        var type = val & 0x7;
        if (type === Pbf.Varint) while (this.buf[this.pos++] > 0x7f) {}
        else if (type === Pbf.Bytes) this.pos = this.readVarint() + this.pos;
        else if (type === Pbf.Fixed32) this.pos += 4;
        else if (type === Pbf.Fixed64) this.pos += 8;
        else throw new Error('Unimplemented type: ' + type);
    },

    // === WRITING =================================================================

    writeTag: function(tag, type) {
        this.writeVarint((tag << 3) | type);
    },

    realloc: function(min) {
        var length = this.length || 16;

        while (length < this.pos + min) length *= 2;

        if (length !== this.length) {
            var buf = new Buffer(length);
            this.buf.copy(buf);
            this.buf = buf;
            this.length = length;
        }
    },

    finish: function() {
        this.length = this.pos;
        this.pos = 0;
        return this.buf.slice(0, this.length);
    },

    writeFixed32: function(val) {
        this.realloc(4);
        this.buf.writeUInt32LE(val, this.pos);
        this.pos += 4;
    },

    writeSFixed32: function(val) {
        this.realloc(4);
        this.buf.writeInt32LE(val, this.pos);
        this.pos += 4;
    },

    writeFixed64: function(val) {
        this.realloc(8);
        this.buf.writeInt32LE(val & -1, this.pos);
        this.buf.writeUInt32LE(Math.floor(val * SHIFT_RIGHT_32), this.pos + 4);
        this.pos += 8;
    },

    writeSFixed64: function(val) {
        this.realloc(8);
        this.buf.writeInt32LE(val & -1, this.pos);
        this.buf.writeInt32LE(Math.floor(val * SHIFT_RIGHT_32), this.pos + 4);
        this.pos += 8;
    },

    writeVarint: function(val) {
        val = +val;

        if (val <= 0x7f) {
            this.realloc(1);
            this.buf[this.pos++] = val;

        } else if (val <= 0x3fff) {
            this.realloc(2);
            this.buf[this.pos++] = ((val >>> 0) & 0x7f) | 0x80;
            this.buf[this.pos++] = ((val >>> 7) & 0x7f);

        } else if (val <= 0x1fffff) {
            this.realloc(3);
            this.buf[this.pos++] = ((val >>> 0) & 0x7f) | 0x80;
            this.buf[this.pos++] = ((val >>> 7) & 0x7f) | 0x80;
            this.buf[this.pos++] = ((val >>> 14) & 0x7f);

        } else if (val <= 0xfffffff) {
            this.realloc(4);
            this.buf[this.pos++] = ((val >>> 0) & 0x7f) | 0x80;
            this.buf[this.pos++] = ((val >>> 7) & 0x7f) | 0x80;
            this.buf[this.pos++] = ((val >>> 14) & 0x7f) | 0x80;
            this.buf[this.pos++] = ((val >>> 21) & 0x7f);

        } else {
            var pos = this.pos;
            while (val >= 0x80) {
                this.realloc(1);
                this.buf[this.pos++] = (val & 0xff) | 0x80;
                val /= 0x80;
            }
            this.realloc(1);
            this.buf[this.pos++] = val | 0;
            if (this.pos - pos > 10) throw new Error('Given varint doesn\'t fit into 10 bytes');
        }
    },

    writeSVarint: function(val) {
        this.writeVarint(val < 0 ? -val * 2 - 1 : val * 2);
    },

    writeBoolean: function(val) {
        this.writeVarint(Boolean(val));
    },

    writeString: function(str) {
        str = String(str);
        var bytes = Buffer.byteLength(str);
        this.writeVarint(bytes);
        this.realloc(bytes);
        this.buf.write(str, this.pos);
        this.pos += bytes;
    },

    writeFloat: function(val) {
        this.realloc(4);
        this.buf.writeFloatLE(val, this.pos);
        this.pos += 4;
    },

    writeDouble: function(val) {
        this.realloc(8);
        this.buf.writeDoubleLE(val, this.pos);
        this.pos += 8;
    },

    writeBytes: function(buffer) {
        var len = buffer.length;
        this.writeVarint(len);
        this.realloc(len);
        for (var i = 0; i < len; i++) this.buf[this.pos++] = buffer[i];
    },

    writeMessage: function(tag, fn, obj) {
        this.writeTag(tag, Pbf.Bytes);

        this.pos++; // reserve 1 byte for short message length

        // write the message directly to the buffer and see how much was written
        var startPos = this.pos;
        fn(obj, this);
        var len = this.pos - startPos;

        var varintLen =
            len <= 0x7f ? 1 :
            len <= 0x3fff ? 2 :
            len <= 0x1fffff ? 3 :
            len <= 0xfffffff ? 4 : Math.ceil(Math.log(len) / (Math.LN2 * 7));

        // if 1 byte isn't enough for encoding message length, shift the data to the right
        if (varintLen > 1) {
            this.realloc(varintLen - 1);
            for (var i = this.pos - 1; i >= startPos; i--) this.buf[i + varintLen - 1] = this.buf[i];
        }

        // finally, write the message length in the reserved place and restore the position
        this.pos = startPos - 1;
        this.writeVarint(len);
        this.pos += len;
    },

    writePackedVarint:   function(tag, arr) { this.writeMessage(tag, writePackedVarint, arr);   },
    writePackedSVarint:  function(tag, arr) { this.writeMessage(tag, writePackedSVarint, arr);  },
    writePackedBoolean:  function(tag, arr) { this.writeMessage(tag, writePackedBoolean, arr);  },
    writePackedFloat:    function(tag, arr) { this.writeMessage(tag, writePackedFloat, arr);    },
    writePackedDouble:   function(tag, arr) { this.writeMessage(tag, writePackedDouble, arr);   },
    writePackedFixed32:  function(tag, arr) { this.writeMessage(tag, writePackedFixed32, arr);  },
    writePackedSFixed32: function(tag, arr) { this.writeMessage(tag, writePackedSFixed32, arr); },
    writePackedFixed64:  function(tag, arr) { this.writeMessage(tag, writePackedFixed64, arr);  },
    writePackedSFixed64: function(tag, arr) { this.writeMessage(tag, writePackedSFixed64, arr); },

    writeBytesField: function(tag, buffer) {
        this.writeTag(tag, Pbf.Bytes);
        this.writeBytes(buffer);
    },
    writeFixed32Field: function(tag, val) {
        this.writeTag(tag, Pbf.Fixed32);
        this.writeFixed32(val);
    },
    writeSFixed32Field: function(tag, val) {
        this.writeTag(tag, Pbf.Fixed32);
        this.writeSFixed32(val);
    },
    writeFixed64Field: function(tag, val) {
        this.writeTag(tag, Pbf.Fixed64);
        this.writeFixed64(val);
    },
    writeSFixed64Field: function(tag, val) {
        this.writeTag(tag, Pbf.Fixed64);
        this.writeSFixed64(val);
    },
    writeVarintField: function(tag, val) {
        this.writeTag(tag, Pbf.Varint);
        this.writeVarint(val);
    },
    writeSVarintField: function(tag, val) {
        this.writeTag(tag, Pbf.Varint);
        this.writeSVarint(val);
    },
    writeStringField: function(tag, str) {
        this.writeTag(tag, Pbf.Bytes);
        this.writeString(str);
    },
    writeFloatField: function(tag, val) {
        this.writeTag(tag, Pbf.Fixed32);
        this.writeFloat(val);
    },
    writeDoubleField: function(tag, val) {
        this.writeTag(tag, Pbf.Fixed64);
        this.writeDouble(val);
    },
    writeBooleanField: function(tag, val) {
        this.writeVarintField(tag, Boolean(val));
    }
};

function writePackedVarint(arr, pbf)   { for (var i = 0; i < arr.length; i++) pbf.writeVarint(arr[i]);   }
function writePackedSVarint(arr, pbf)  { for (var i = 0; i < arr.length; i++) pbf.writeSVarint(arr[i]);  }
function writePackedFloat(arr, pbf)    { for (var i = 0; i < arr.length; i++) pbf.writeFloat(arr[i]);    }
function writePackedDouble(arr, pbf)   { for (var i = 0; i < arr.length; i++) pbf.writeDouble(arr[i]);   }
function writePackedBoolean(arr, pbf)  { for (var i = 0; i < arr.length; i++) pbf.writeBoolean(arr[i]);  }
function writePackedFixed32(arr, pbf)  { for (var i = 0; i < arr.length; i++) pbf.writeFixed32(arr[i]);  }
function writePackedSFixed32(arr, pbf) { for (var i = 0; i < arr.length; i++) pbf.writeSFixed32(arr[i]); }
function writePackedFixed64(arr, pbf)  { for (var i = 0; i < arr.length; i++) pbf.writeFixed64(arr[i]);  }
function writePackedSFixed64(arr, pbf) { for (var i = 0; i < arr.length; i++) pbf.writeSFixed64(arr[i]); }

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./buffer":121}],123:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],124:[function(require,module,exports){
'use strict';

module.exports = Point;

function Point(x, y) {
    this.x = x;
    this.y = y;
}

Point.prototype = {
    clone: function() { return new Point(this.x, this.y); },

    add:     function(p) { return this.clone()._add(p);     },
    sub:     function(p) { return this.clone()._sub(p);     },
    mult:    function(k) { return this.clone()._mult(k);    },
    div:     function(k) { return this.clone()._div(k);     },
    rotate:  function(a) { return this.clone()._rotate(a);  },
    matMult: function(m) { return this.clone()._matMult(m); },
    unit:    function() { return this.clone()._unit(); },
    perp:    function() { return this.clone()._perp(); },
    round:   function() { return this.clone()._round(); },

    mag: function() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    },

    equals: function(p) {
        return this.x === p.x &&
               this.y === p.y;
    },

    dist: function(p) {
        return Math.sqrt(this.distSqr(p));
    },

    distSqr: function(p) {
        var dx = p.x - this.x,
            dy = p.y - this.y;
        return dx * dx + dy * dy;
    },

    angle: function() {
        return Math.atan2(this.y, this.x);
    },

    angleTo: function(b) {
        return Math.atan2(this.y - b.y, this.x - b.x);
    },

    angleWith: function(b) {
        return this.angleWithSep(b.x, b.y);
    },

    // Find the angle of the two vectors, solving the formula for the cross product a x b = |a||b|sin(θ) for θ.
    angleWithSep: function(x, y) {
        return Math.atan2(
            this.x * y - this.y * x,
            this.x * x + this.y * y);
    },

    _matMult: function(m) {
        var x = m[0] * this.x + m[1] * this.y,
            y = m[2] * this.x + m[3] * this.y;
        this.x = x;
        this.y = y;
        return this;
    },

    _add: function(p) {
        this.x += p.x;
        this.y += p.y;
        return this;
    },

    _sub: function(p) {
        this.x -= p.x;
        this.y -= p.y;
        return this;
    },

    _mult: function(k) {
        this.x *= k;
        this.y *= k;
        return this;
    },

    _div: function(k) {
        this.x /= k;
        this.y /= k;
        return this;
    },

    _unit: function() {
        this._div(this.mag());
        return this;
    },

    _perp: function() {
        var y = this.y;
        this.y = this.x;
        this.x = -y;
        return this;
    },

    _rotate: function(angle) {
        var cos = Math.cos(angle),
            sin = Math.sin(angle),
            x = cos * this.x - sin * this.y,
            y = sin * this.x + cos * this.y;
        this.x = x;
        this.y = y;
        return this;
    },

    _round: function() {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);
        return this;
    }
};

// constructs Point from an array if necessary
Point.convert = function (a) {
    if (a instanceof Point) {
        return a;
    }
    if (Array.isArray(a)) {
        return new Point(a[0], a[1]);
    }
    return a;
};

},{}],125:[function(require,module,exports){
/*
 (c) 2013, Vladimir Agafonkin
 RBush, a JavaScript library for high-performance 2D spatial indexing of points and rectangles.
 https://github.com/mourner/rbush
*/

(function () { 'use strict';

function rbush(maxEntries, format) {

    // jshint newcap: false, validthis: true
    if (!(this instanceof rbush)) return new rbush(maxEntries, format);

    // max entries in a node is 9 by default; min node fill is 40% for best performance
    this._maxEntries = Math.max(4, maxEntries || 9);
    this._minEntries = Math.max(2, Math.ceil(this._maxEntries * 0.4));

    if (format) {
        this._initFormat(format);
    }

    this.clear();
}

rbush.prototype = {

    all: function () {
        return this._all(this.data, []);
    },

    search: function (bbox) {

        var node = this.data,
            result = [],
            toBBox = this.toBBox;

        if (!intersects(bbox, node.bbox)) return result;

        var nodesToSearch = [],
            i, len, child, childBBox;

        while (node) {
            for (i = 0, len = node.children.length; i < len; i++) {

                child = node.children[i];
                childBBox = node.leaf ? toBBox(child) : child.bbox;

                if (intersects(bbox, childBBox)) {
                    if (node.leaf) result.push(child);
                    else if (contains(bbox, childBBox)) this._all(child, result);
                    else nodesToSearch.push(child);
                }
            }
            node = nodesToSearch.pop();
        }

        return result;
    },

    collides: function (bbox) {

        var node = this.data,
            toBBox = this.toBBox;

        if (!intersects(bbox, node.bbox)) return false;

        var nodesToSearch = [],
            i, len, child, childBBox;

        while (node) {
            for (i = 0, len = node.children.length; i < len; i++) {

                child = node.children[i];
                childBBox = node.leaf ? toBBox(child) : child.bbox;

                if (intersects(bbox, childBBox)) {
                    if (node.leaf || contains(bbox, childBBox)) return true;
                    nodesToSearch.push(child);
                }
            }
            node = nodesToSearch.pop();
        }

        return false;
    },

    load: function (data) {
        if (!(data && data.length)) return this;

        if (data.length < this._minEntries) {
            for (var i = 0, len = data.length; i < len; i++) {
                this.insert(data[i]);
            }
            return this;
        }

        // recursively build the tree with the given data from stratch using OMT algorithm
        var node = this._build(data.slice(), 0, data.length - 1, 0);

        if (!this.data.children.length) {
            // save as is if tree is empty
            this.data = node;

        } else if (this.data.height === node.height) {
            // split root if trees have the same height
            this._splitRoot(this.data, node);

        } else {
            if (this.data.height < node.height) {
                // swap trees if inserted one is bigger
                var tmpNode = this.data;
                this.data = node;
                node = tmpNode;
            }

            // insert the small tree into the large tree at appropriate level
            this._insert(node, this.data.height - node.height - 1, true);
        }

        return this;
    },

    insert: function (item) {
        if (item) this._insert(item, this.data.height - 1);
        return this;
    },

    clear: function () {
        this.data = {
            children: [],
            height: 1,
            bbox: empty(),
            leaf: true
        };
        return this;
    },

    remove: function (item) {
        if (!item) return this;

        var node = this.data,
            bbox = this.toBBox(item),
            path = [],
            indexes = [],
            i, parent, index, goingUp;

        // depth-first iterative tree traversal
        while (node || path.length) {

            if (!node) { // go up
                node = path.pop();
                parent = path[path.length - 1];
                i = indexes.pop();
                goingUp = true;
            }

            if (node.leaf) { // check current node
                index = node.children.indexOf(item);

                if (index !== -1) {
                    // item found, remove the item and condense tree upwards
                    node.children.splice(index, 1);
                    path.push(node);
                    this._condense(path);
                    return this;
                }
            }

            if (!goingUp && !node.leaf && contains(node.bbox, bbox)) { // go down
                path.push(node);
                indexes.push(i);
                i = 0;
                parent = node;
                node = node.children[0];

            } else if (parent) { // go right
                i++;
                node = parent.children[i];
                goingUp = false;

            } else node = null; // nothing found
        }

        return this;
    },

    toBBox: function (item) { return item; },

    compareMinX: function (a, b) { return a[0] - b[0]; },
    compareMinY: function (a, b) { return a[1] - b[1]; },

    toJSON: function () { return this.data; },

    fromJSON: function (data) {
        this.data = data;
        return this;
    },

    _all: function (node, result) {
        var nodesToSearch = [];
        while (node) {
            if (node.leaf) result.push.apply(result, node.children);
            else nodesToSearch.push.apply(nodesToSearch, node.children);

            node = nodesToSearch.pop();
        }
        return result;
    },

    _build: function (items, left, right, height) {

        var N = right - left + 1,
            M = this._maxEntries,
            node;

        if (N <= M) {
            // reached leaf level; return leaf
            node = {
                children: items.slice(left, right + 1),
                height: 1,
                bbox: null,
                leaf: true
            };
            calcBBox(node, this.toBBox);
            return node;
        }

        if (!height) {
            // target height of the bulk-loaded tree
            height = Math.ceil(Math.log(N) / Math.log(M));

            // target number of root entries to maximize storage utilization
            M = Math.ceil(N / Math.pow(M, height - 1));
        }

        // TODO eliminate recursion?

        node = {
            children: [],
            height: height,
            bbox: null
        };

        // split the items into M mostly square tiles

        var N2 = Math.ceil(N / M),
            N1 = N2 * Math.ceil(Math.sqrt(M)),
            i, j, right2, right3;

        multiSelect(items, left, right, N1, this.compareMinX);

        for (i = left; i <= right; i += N1) {

            right2 = Math.min(i + N1 - 1, right);

            multiSelect(items, i, right2, N2, this.compareMinY);

            for (j = i; j <= right2; j += N2) {

                right3 = Math.min(j + N2 - 1, right2);

                // pack each entry recursively
                node.children.push(this._build(items, j, right3, height - 1));
            }
        }

        calcBBox(node, this.toBBox);

        return node;
    },

    _chooseSubtree: function (bbox, node, level, path) {

        var i, len, child, targetNode, area, enlargement, minArea, minEnlargement;

        while (true) {
            path.push(node);

            if (node.leaf || path.length - 1 === level) break;

            minArea = minEnlargement = Infinity;

            for (i = 0, len = node.children.length; i < len; i++) {
                child = node.children[i];
                area = bboxArea(child.bbox);
                enlargement = enlargedArea(bbox, child.bbox) - area;

                // choose entry with the least area enlargement
                if (enlargement < minEnlargement) {
                    minEnlargement = enlargement;
                    minArea = area < minArea ? area : minArea;
                    targetNode = child;

                } else if (enlargement === minEnlargement) {
                    // otherwise choose one with the smallest area
                    if (area < minArea) {
                        minArea = area;
                        targetNode = child;
                    }
                }
            }

            node = targetNode;
        }

        return node;
    },

    _insert: function (item, level, isNode) {

        var toBBox = this.toBBox,
            bbox = isNode ? item.bbox : toBBox(item),
            insertPath = [];

        // find the best node for accommodating the item, saving all nodes along the path too
        var node = this._chooseSubtree(bbox, this.data, level, insertPath);

        // put the item into the node
        node.children.push(item);
        extend(node.bbox, bbox);

        // split on node overflow; propagate upwards if necessary
        while (level >= 0) {
            if (insertPath[level].children.length > this._maxEntries) {
                this._split(insertPath, level);
                level--;
            } else break;
        }

        // adjust bboxes along the insertion path
        this._adjustParentBBoxes(bbox, insertPath, level);
    },

    // split overflowed node into two
    _split: function (insertPath, level) {

        var node = insertPath[level],
            M = node.children.length,
            m = this._minEntries;

        this._chooseSplitAxis(node, m, M);

        var newNode = {
            children: node.children.splice(this._chooseSplitIndex(node, m, M)),
            height: node.height
        };

        if (node.leaf) newNode.leaf = true;

        calcBBox(node, this.toBBox);
        calcBBox(newNode, this.toBBox);

        if (level) insertPath[level - 1].children.push(newNode);
        else this._splitRoot(node, newNode);
    },

    _splitRoot: function (node, newNode) {
        // split root node
        this.data = {
            children: [node, newNode],
            height: node.height + 1
        };
        calcBBox(this.data, this.toBBox);
    },

    _chooseSplitIndex: function (node, m, M) {

        var i, bbox1, bbox2, overlap, area, minOverlap, minArea, index;

        minOverlap = minArea = Infinity;

        for (i = m; i <= M - m; i++) {
            bbox1 = distBBox(node, 0, i, this.toBBox);
            bbox2 = distBBox(node, i, M, this.toBBox);

            overlap = intersectionArea(bbox1, bbox2);
            area = bboxArea(bbox1) + bboxArea(bbox2);

            // choose distribution with minimum overlap
            if (overlap < minOverlap) {
                minOverlap = overlap;
                index = i;

                minArea = area < minArea ? area : minArea;

            } else if (overlap === minOverlap) {
                // otherwise choose distribution with minimum area
                if (area < minArea) {
                    minArea = area;
                    index = i;
                }
            }
        }

        return index;
    },

    // sorts node children by the best axis for split
    _chooseSplitAxis: function (node, m, M) {

        var compareMinX = node.leaf ? this.compareMinX : compareNodeMinX,
            compareMinY = node.leaf ? this.compareMinY : compareNodeMinY,
            xMargin = this._allDistMargin(node, m, M, compareMinX),
            yMargin = this._allDistMargin(node, m, M, compareMinY);

        // if total distributions margin value is minimal for x, sort by minX,
        // otherwise it's already sorted by minY
        if (xMargin < yMargin) node.children.sort(compareMinX);
    },

    // total margin of all possible split distributions where each node is at least m full
    _allDistMargin: function (node, m, M, compare) {

        node.children.sort(compare);

        var toBBox = this.toBBox,
            leftBBox = distBBox(node, 0, m, toBBox),
            rightBBox = distBBox(node, M - m, M, toBBox),
            margin = bboxMargin(leftBBox) + bboxMargin(rightBBox),
            i, child;

        for (i = m; i < M - m; i++) {
            child = node.children[i];
            extend(leftBBox, node.leaf ? toBBox(child) : child.bbox);
            margin += bboxMargin(leftBBox);
        }

        for (i = M - m - 1; i >= m; i--) {
            child = node.children[i];
            extend(rightBBox, node.leaf ? toBBox(child) : child.bbox);
            margin += bboxMargin(rightBBox);
        }

        return margin;
    },

    _adjustParentBBoxes: function (bbox, path, level) {
        // adjust bboxes along the given tree path
        for (var i = level; i >= 0; i--) {
            extend(path[i].bbox, bbox);
        }
    },

    _condense: function (path) {
        // go through the path, removing empty nodes and updating bboxes
        for (var i = path.length - 1, siblings; i >= 0; i--) {
            if (path[i].children.length === 0) {
                if (i > 0) {
                    siblings = path[i - 1].children;
                    siblings.splice(siblings.indexOf(path[i]), 1);

                } else this.clear();

            } else calcBBox(path[i], this.toBBox);
        }
    },

    _initFormat: function (format) {
        // data format (minX, minY, maxX, maxY accessors)

        // uses eval-type function compilation instead of just accepting a toBBox function
        // because the algorithms are very sensitive to sorting functions performance,
        // so they should be dead simple and without inner calls

        // jshint evil: true

        var compareArr = ['return a', ' - b', ';'];

        this.compareMinX = new Function('a', 'b', compareArr.join(format[0]));
        this.compareMinY = new Function('a', 'b', compareArr.join(format[1]));

        this.toBBox = new Function('a', 'return [a' + format.join(', a') + '];');
    }
};


// calculate node's bbox from bboxes of its children
function calcBBox(node, toBBox) {
    node.bbox = distBBox(node, 0, node.children.length, toBBox);
}

// min bounding rectangle of node children from k to p-1
function distBBox(node, k, p, toBBox) {
    var bbox = empty();

    for (var i = k, child; i < p; i++) {
        child = node.children[i];
        extend(bbox, node.leaf ? toBBox(child) : child.bbox);
    }

    return bbox;
}

function empty() { return [Infinity, Infinity, -Infinity, -Infinity]; }

function extend(a, b) {
    a[0] = Math.min(a[0], b[0]);
    a[1] = Math.min(a[1], b[1]);
    a[2] = Math.max(a[2], b[2]);
    a[3] = Math.max(a[3], b[3]);
    return a;
}

function compareNodeMinX(a, b) { return a.bbox[0] - b.bbox[0]; }
function compareNodeMinY(a, b) { return a.bbox[1] - b.bbox[1]; }

function bboxArea(a)   { return (a[2] - a[0]) * (a[3] - a[1]); }
function bboxMargin(a) { return (a[2] - a[0]) + (a[3] - a[1]); }

function enlargedArea(a, b) {
    return (Math.max(b[2], a[2]) - Math.min(b[0], a[0])) *
           (Math.max(b[3], a[3]) - Math.min(b[1], a[1]));
}

function intersectionArea(a, b) {
    var minX = Math.max(a[0], b[0]),
        minY = Math.max(a[1], b[1]),
        maxX = Math.min(a[2], b[2]),
        maxY = Math.min(a[3], b[3]);

    return Math.max(0, maxX - minX) *
           Math.max(0, maxY - minY);
}

function contains(a, b) {
    return a[0] <= b[0] &&
           a[1] <= b[1] &&
           b[2] <= a[2] &&
           b[3] <= a[3];
}

function intersects(a, b) {
    return b[0] <= a[2] &&
           b[1] <= a[3] &&
           b[2] >= a[0] &&
           b[3] >= a[1];
}

// sort an array so that items come in groups of n unsorted items, with groups sorted between each other;
// combines selection algorithm with binary divide & conquer approach

function multiSelect(arr, left, right, n, compare) {
    var stack = [left, right],
        mid;

    while (stack.length) {
        right = stack.pop();
        left = stack.pop();

        if (right - left <= n) continue;

        mid = left + Math.ceil((right - left) / n / 2) * n;
        select(arr, left, right, mid, compare);

        stack.push(left, mid, mid, right);
    }
}

// Floyd-Rivest selection algorithm:
// sort an array between left and right (inclusive) so that the smallest k elements come first (unordered)
function select(arr, left, right, k, compare) {
    var n, i, z, s, sd, newLeft, newRight, t, j;

    while (right > left) {
        if (right - left > 600) {
            n = right - left + 1;
            i = k - left + 1;
            z = Math.log(n);
            s = 0.5 * Math.exp(2 * z / 3);
            sd = 0.5 * Math.sqrt(z * s * (n - s) / n) * (i - n / 2 < 0 ? -1 : 1);
            newLeft = Math.max(left, Math.floor(k - i * s / n + sd));
            newRight = Math.min(right, Math.floor(k + (n - i) * s / n + sd));
            select(arr, newLeft, newRight, k, compare);
        }

        t = arr[k];
        i = left;
        j = right;

        swap(arr, left, k);
        if (compare(arr[right], t) > 0) swap(arr, left, right);

        while (i < j) {
            swap(arr, i, j);
            i++;
            j--;
            while (compare(arr[i], t) < 0) i++;
            while (compare(arr[j], t) > 0) j--;
        }

        if (compare(arr[left], t) === 0) swap(arr, left, j);
        else {
            j++;
            swap(arr, j, right);
        }

        if (j <= k) left = j + 1;
        if (k <= j) right = j - 1;
    }
}

function swap(arr, i, j) {
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
}


// export as AMD/CommonJS module or global variable
if (typeof define === 'function' && define.amd) define('rbush', function() { return rbush; });
else if (typeof module !== 'undefined') module.exports = rbush;
else if (typeof self !== 'undefined') self.rbush = rbush;
else window.rbush = rbush;

})();

},{}],126:[function(require,module,exports){
/*
 * Copyright (C) 2008 Apple Inc. All Rights Reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * Ported from Webkit
 * http://svn.webkit.org/repository/webkit/trunk/Source/WebCore/platform/graphics/UnitBezier.h
 */

module.exports = UnitBezier;

function UnitBezier(p1x, p1y, p2x, p2y) {
    // Calculate the polynomial coefficients, implicit first and last control points are (0,0) and (1,1).
    this.cx = 3.0 * p1x;
    this.bx = 3.0 * (p2x - p1x) - this.cx;
    this.ax = 1.0 - this.cx - this.bx;

    this.cy = 3.0 * p1y;
    this.by = 3.0 * (p2y - p1y) - this.cy;
    this.ay = 1.0 - this.cy - this.by;

    this.p1x = p1x;
    this.p1y = p2y;
    this.p2x = p2x;
    this.p2y = p2y;
}

UnitBezier.prototype.sampleCurveX = function(t) {
    // `ax t^3 + bx t^2 + cx t' expanded using Horner's rule.
    return ((this.ax * t + this.bx) * t + this.cx) * t;
};

UnitBezier.prototype.sampleCurveY = function(t) {
    return ((this.ay * t + this.by) * t + this.cy) * t;
};

UnitBezier.prototype.sampleCurveDerivativeX = function(t) {
    return (3.0 * this.ax * t + 2.0 * this.bx) * t + this.cx;
};

UnitBezier.prototype.solveCurveX = function(x, epsilon) {
    if (typeof epsilon === 'undefined') epsilon = 1e-6;

    var t0, t1, t2, x2, i;

    // First try a few iterations of Newton's method -- normally very fast.
    for (t2 = x, i = 0; i < 8; i++) {

        x2 = this.sampleCurveX(t2) - x;
        if (Math.abs(x2) < epsilon) return t2;

        var d2 = this.sampleCurveDerivativeX(t2);
        if (Math.abs(d2) < 1e-6) break;

        t2 = t2 - x2 / d2;
    }

    // Fall back to the bisection method for reliability.
    t0 = 0.0;
    t1 = 1.0;
    t2 = x;

    if (t2 < t0) return t0;
    if (t2 > t1) return t1;

    while (t0 < t1) {

        x2 = this.sampleCurveX(t2);
        if (Math.abs(x2 - x) < epsilon) return t2;

        if (x > x2) {
            t0 = t2;
        } else {
            t1 = t2;
        }

        t2 = (t1 - t0) * 0.5 + t0;
    }

    // Failure.
    return t2;
};

UnitBezier.prototype.solve = function(x, epsilon) {
    return this.sampleCurveY(this.solveCurveX(x, epsilon));
};

},{}],127:[function(require,module,exports){
module.exports.VectorTile = require('./lib/vectortile.js');
module.exports.VectorTileFeature = require('./lib/vectortilefeature.js');
module.exports.VectorTileLayer = require('./lib/vectortilelayer.js');

},{"./lib/vectortile.js":128,"./lib/vectortilefeature.js":129,"./lib/vectortilelayer.js":130}],128:[function(require,module,exports){
'use strict';

var VectorTileLayer = require('./vectortilelayer');

module.exports = VectorTile;

function VectorTile(pbf, end) {
    this.layers = pbf.readFields(readTile, {}, end);
}

function readTile(tag, layers, pbf) {
    if (tag === 3) {
        var layer = new VectorTileLayer(pbf, pbf.readVarint() + pbf.pos);
        if (layer.length) layers[layer.name] = layer;
    }
}


},{"./vectortilelayer":130}],129:[function(require,module,exports){
'use strict';

var Point = require('point-geometry');

module.exports = VectorTileFeature;

function VectorTileFeature(pbf, end, extent, keys, values) {
    // Public
    this.properties = {};
    this.extent = extent;
    this.type = 0;

    // Private
    this._pbf = pbf;
    this._geometry = -1;
    this._keys = keys;
    this._values = values;

    pbf.readFields(readFeature, this, end);
}

function readFeature(tag, feature, pbf) {
    if (tag == 1) feature._id = pbf.readVarint();
    else if (tag == 2) readTag(pbf, feature);
    else if (tag == 3) feature.type = pbf.readVarint();
    else if (tag == 4) feature._geometry = pbf.pos;
}

function readTag(pbf, feature) {
    var end = pbf.readVarint() + pbf.pos;

    while (pbf.pos < end) {
        var key = feature._keys[pbf.readVarint()],
            value = feature._values[pbf.readVarint()];
        feature.properties[key] = value;
    }
}

VectorTileFeature.types = ['Unknown', 'Point', 'LineString', 'Polygon'];

VectorTileFeature.prototype.loadGeometry = function() {
    var pbf = this._pbf;
    pbf.pos = this._geometry;

    var end = pbf.readVarint() + pbf.pos,
        cmd = 1,
        length = 0,
        x = 0,
        y = 0,
        lines = [],
        line;

    while (pbf.pos < end) {
        if (!length) {
            var cmdLen = pbf.readVarint();
            cmd = cmdLen & 0x7;
            length = cmdLen >> 3;
        }

        length--;

        if (cmd === 1 || cmd === 2) {
            x += pbf.readSVarint();
            y += pbf.readSVarint();

            if (cmd === 1) { // moveTo
                if (line) lines.push(line);
                line = [];
            }

            line.push(new Point(x, y));

        } else if (cmd === 7) {
            line.push(line[0].clone()); // closePolygon

        } else {
            throw new Error('unknown command ' + cmd);
        }
    }

    if (line) lines.push(line);

    return lines;
};

VectorTileFeature.prototype.bbox = function() {
    var pbf = this._pbf;
    pbf.pos = this._geometry;

    var end = pbf.readVarint() + pbf.pos,
        cmd = 1,
        length = 0,
        x = 0,
        y = 0,
        x1 = Infinity,
        x2 = -Infinity,
        y1 = Infinity,
        y2 = -Infinity;

    while (pbf.pos < end) {
        if (!length) {
            var cmdLen = pbf.readVarint();
            cmd = cmdLen & 0x7;
            length = cmdLen >> 3;
        }

        length--;

        if (cmd === 1 || cmd === 2) {
            x += pbf.readSVarint();
            y += pbf.readSVarint();
            if (x < x1) x1 = x;
            if (x > x2) x2 = x;
            if (y < y1) y1 = y;
            if (y > y2) y2 = y;

        } else if (cmd !== 7) {
            throw new Error('unknown command ' + cmd);
        }
    }

    return [x1, y1, x2, y2];
};

VectorTileFeature.prototype.toGeoJSON = function(x, y, z) {
    var size = this.extent * Math.pow(2, z),
        x0 = this.extent * x,
        y0 = this.extent * y,
        coords = this.loadGeometry(),
        type = VectorTileFeature.types[this.type];

    for (var i = 0; i < coords.length; i++) {
        var line = coords[i];
        for (var j = 0; j < line.length; j++) {
            var p = line[j], y2 = 180 - (p.y + y0) * 360 / size;
            line[j] = [
                (p.x + x0) * 360 / size - 180,
                360 / Math.PI * Math.atan(Math.exp(y2 * Math.PI / 180)) - 90
            ];
        }
    }

    if (type === 'Point' && coords.length === 1) {
        coords = coords[0][0];
    } else if (type === 'Point') {
        coords = coords[0];
        type = 'MultiPoint';
    } else if (type === 'LineString' && coords.length === 1) {
        coords = coords[0];
    } else if (type === 'LineString') {
        type = 'MultiLineString';
    }

    return {
        type: "Feature",
        geometry: {
            type: type,
            coordinates: coords
        },
        properties: this.properties
    };
};

},{"point-geometry":124}],130:[function(require,module,exports){
'use strict';

var VectorTileFeature = require('./vectortilefeature.js');

module.exports = VectorTileLayer;

function VectorTileLayer(pbf, end) {
    // Public
    this.version = 1;
    this.name = null;
    this.extent = 4096;
    this.length = 0;

    // Private
    this._pbf = pbf;
    this._keys = [];
    this._values = [];
    this._features = [];

    pbf.readFields(readLayer, this, end);

    this.length = this._features.length;
}

function readLayer(tag, layer, pbf) {
    if (tag === 15) layer.version = pbf.readVarint();
    else if (tag === 1) layer.name = pbf.readString();
    else if (tag === 5) layer.extent = pbf.readVarint();
    else if (tag === 2) layer._features.push(pbf.pos);
    else if (tag === 3) layer._keys.push(pbf.readString());
    else if (tag === 4) layer._values.push(readValueMessage(pbf));
}

function readValueMessage(pbf) {
    var value = null,
        end = pbf.readVarint() + pbf.pos;

    while (pbf.pos < end) {
        var tag = pbf.readVarint() >> 3;

        value = tag === 1 ? pbf.readString() :
            tag === 2 ? pbf.readFloat() :
            tag === 3 ? pbf.readDouble() :
            tag === 4 ? pbf.readVarint64() :
            tag === 5 ? pbf.readVarint() :
            tag === 6 ? pbf.readSVarint() :
            tag === 7 ? pbf.readBoolean() : null;
    }

    return value;
}

// return feature `i` from this layer as a `VectorTileFeature`
VectorTileLayer.prototype.feature = function(i) {
    if (i < 0 || i >= this._features.length) throw new Error('feature index out of bounds');

    this._pbf.pos = this._features[i];

    var end = this._pbf.readVarint() + this._pbf.pos;
    return new VectorTileFeature(this._pbf, end, this.extent, this._keys, this._values);
};

},{"./vectortilefeature.js":129}],131:[function(require,module,exports){
var bundleFn = arguments[3];
var sources = arguments[4];
var cache = arguments[5];

var stringify = JSON.stringify;

module.exports = function (fn) {
    var keys = [];
    var wkey;
    var cacheKeys = Object.keys(cache);
    
    for (var i = 0, l = cacheKeys.length; i < l; i++) {
        var key = cacheKeys[i];
        if (cache[key].exports === fn) {
            wkey = key;
            break;
        }
    }
    
    if (!wkey) {
        wkey = Math.floor(Math.pow(16, 8) * Math.random()).toString(16);
        var wcache = {};
        for (var i = 0, l = cacheKeys.length; i < l; i++) {
            var key = cacheKeys[i];
            wcache[key] = key;
        }
        sources[wkey] = [
            Function(['require','module','exports'], '(' + fn + ')(self)'),
            wcache
        ];
    }
    var skey = Math.floor(Math.pow(16, 8) * Math.random()).toString(16);
    
    var scache = {}; scache[wkey] = wkey;
    sources[skey] = [
        Function(['require'],'require(' + stringify(wkey) + ')(self)'),
        scache
    ];
    
    var src = '(' + bundleFn + ')({'
        + Object.keys(sources).map(function (key) {
            return stringify(key) + ':['
                + sources[key][0]
                + ',' + stringify(sources[key][1]) + ']'
            ;
        }).join(',')
        + '},{},[' + stringify(skey) + '])'
    ;
    
    var URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
    
    return new Worker(URL.createObjectURL(
        new Blob([src], { type: 'text/javascript' })
    ));
};

},{}],132:[function(require,module,exports){
module.exports={
	MAPBOX_ACCESS_TOKEN: "pk.eyJ1IjoidWJlcmRhdGEiLCJhIjoiOGRlYzM1MzZkYWYyZTU1YTYzZDE4MjY4MjFhZmJiYTIifQ.vGOB1DFeWq5N3oy0b249oQ"
}
},{}]},{},[1]);
