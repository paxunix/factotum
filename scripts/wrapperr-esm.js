"use strict";

// From https://github.com/Wizcorp/wrapperr
// but turned into an ES6 module.


var WrappErr = function (error, message) {
	if (!(error instanceof Error)) {
		throw new TypeError('Objects passed to Wrapperr MUST be/inherit Error');
	}

	var tmpError = Error.call(this);
	this.name = 'Error';
	this.message = [message, error.message].join(': ');

	var errorStackArray = tmpError.stack.split('\n');
	errorStackArray.shift();
	errorStackArray.shift();
	errorStackArray.shift();
	errorStackArray.push(message);
	errorStackArray.push(errorStackArray.shift());
	errorStackArray.unshift(error.message);
	errorStackArray.unshift(this.message);
	this.stack = errorStackArray.join('\n    ');

	return this;
};

// http://stackoverflow.com/questions/8802845/inheriting-from-the-error-object-where-is-the-message-property
var IntermediateInheritor = function () {}
IntermediateInheritor.prototype = Error.prototype
WrappErr.prototype = new IntermediateInheritor();

export default WrappErr;
