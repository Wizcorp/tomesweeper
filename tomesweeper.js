// Copyright (C) 2013 Wizcorp, Inc. <info@wizcorp.jp>
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

var Tome = typeof require === 'function' ? require('tomes').Tome : Tome;

var EventEmitter = typeof require === 'function' ? require('events').EventEmitter : EventEmitter;

function inherits(Child, Parent) {
	Child.prototype = Object.create(Parent.prototype, {
		constructor: { value: Child, enumerable: false, writable: true, configurable: true }
	});
}

var defaultProhibits = {
	typeChange: {
		primitiveToPrimitive: true,
		primitiveToObject: true,
		primitiveToArray: true,
		primitiveToNull: true
	},
	readable: {
		keyInjection: true,
		keyMismatch: true,
		undefinedTomeNotOnArrayTome: true,
		valMismatch: true,
		parentIsNotObjectOrArray: true
	},
	report: {
	}
};

var issues = { typeChange: {} };

function foundIssue(tomesweeper, type, chain, desc) {
	var issue = { type: type, chain: chain, desc: desc };
	tomesweeper.foundIssues.push(issue);
	tomesweeper.emit('issue', issue);
}

issues.keyInjection = function (tomesweeper, tome) {
	var keys = Object.keys(tome);
	for (var i = 0, len = keys.length; i < len; i += 1) {
		var key = keys[i];
		if (!(tome[key] instanceof Tome)) {
			foundIssue(tomesweeper, 'keyInjection', Tome.buildChain(tome), 'Found non-Tome key: ' + key);
		}
	}
};

issues.keyMismatch = function (tomesweeper, tome) {
	var key = tome.__key__;
	var parent = tome.__parent__;
	if (key === undefined && parent === undefined) {
		return;
	}

	if (parent[key].__key__ !== key) {
		foundIssue(tomesweeper, 'keyMismatch', Tome.buildChain(tome), 'Key does not match parent\'s key for this tome: ' + parent[key].__key__);
	}
};

issues.undefinedTomeNotOnArrayTome = function (tomesweeper, tome) {
	if (Tome.typeOf(tome) === 'undefined' && Tome.typeOf(tome.__parent__) === 'array') {
		foundIssue(tomesweeper, 'undefinedTomeNotOnArrayTome', Tome.buildChain(tome), 'UndefinedTome\'s parent is not an ArrayTome.');
	}
};

issues.valMismatch = function (tomesweeper, tome) {
	var tomeType = Tome.typeOf(tome);
	if (Tome.typeOf(tome.valueOf()) !== tomeType) {
		foundIssue(tomesweeper, 'valMismatch', Tome.buildChain(tome), 'Tome\'s value does not match it\'s type: ' + tomeType);
	}
};

issues.parentIsNotObjectOrArray = function (tomesweeper, tome) {
	var parentType = Tome.typeOf(tome.__parent__);
	if (parentType !== 'array' || parentType !== 'object') {
		foundIssue(tomesweeper, 'parentIsNotObjectOrArray', Tome.buildChain(tome), 'Tome\'s parent is not an object or array.');
	}
};

function reportSweep(tomesweeper, tome, chain) {
	if (chain === undefined) {
		chain = [];
		tome = tome.__root__;
	}
	
	for (var issueType in tomesweeper.prohibits.readable) {
		issues[issueType](tomesweeper, tome);
	}

	for (issueType in tomesweeper.prohibits.report) {
		issues[issueType](tomesweeper, tome);
	}
	
	var keys = Object.keys(tome);
	for (var i = 0, len = keys.length; i < len; i += 1) {
		var key = keys[i];
		if (tome[key] instanceof Tome) {
			var link = chain.concat(key);
			reportSweep(tomesweeper, tome[key], link);
		}
	}
}

var primitiveTypes = {
	string: true,
	boolean: true,
	number: true
};

issues.typeChange.primitiveToNull = function (oldType, newType) {
	return primitiveTypes[oldType] && newType === 'null';
};

issues.typeChange.primitiveToPrimitive = function (oldType, newType) {
	return primitiveTypes[oldType] && primitiveTypes[newType];
};

issues.typeChange.primitiveToArray = function (oldType, newType) {
	return primitiveTypes[oldType] && newType === 'array';
};

issues.typeChange.primitiveToArray = function (oldType, newType) {
	return primitiveTypes[oldType] && newType === 'object';
};

function Tomesweeper(prohibits) {
	this.tomes = [];
	this.foundIssues = [];
	this.prohibits = prohibits || defaultProhibits;
	this.handlers = {};

	var that = this;

	this.handlers.typeChange = function (tome, oldType, newType) {
		for (var issueType in that.prohibits.typeChange) {
			if (issues.typeChange[issueType](oldType, newType)) {
				var chain = Tome.buildChain(tome);
				return foundIssue(that, issueType, chain, 'Tome changed type from '.concat(oldType).concat(' to ').concat(newType));
			}
		}
	};

	this.handlers.readable = function (dirtyAt, tome) {
		for (var issueType in that.prohibits.readable) {
			issues[issueType](that, tome);
		}
	};

	return this;
}

inherits(Tomesweeper, EventEmitter);

Tomesweeper.prototype.addTome = function (tome) {
	for (var i = 0, len = this.tomes.length; i < len; i += 1) {
		if (this.tomes[i].__root__ === tome.__root__) {
			return this;
		}
	}

	for (var eventName in this.prohibits) {
		if (Object.keys(this.prohibits[eventName]).length && eventName !== 'report') {
			tome.__root__.on(eventName, this.handlers[eventName]);
		}
	}

	this.tomes.push(tome);

	return this;
};

function registerHandlers(tomesweeper, eventName) {
	for (var i = 0, len = tomesweeper.tomes.length; i < len; i += 1) {
		tomesweeper.tomes[i].__root__.on(eventName, tomesweeper.handlers[eventName]);
	}
}

function unregisterHandlers(tomesweeper, eventName) {
	for (var i = 0, len = tomesweeper.tomes.length; i < len; i += 1) {
		tomesweeper.tomes[i].__root__.removeListener(eventName, tomesweeper.handlers[eventName]);
	}
}

Tomesweeper.prototype.sweepFor = function (issueType, reportOnly) {
	if (issues.typeChange.hasOwnProperty(issueType)) {
		if (reportOnly !== undefined) {
			throw new Error('typeChanges can only be caught as they happen.');
		}

		if (!Object.keys(this.typeChange).length) {
			registerHandlers(this, 'typeChange');
		}

		this.config.typeChange[issueType] = true;
	} else if (issues.hasOwnProperty(issueType)) {
		if (reportOnly) {
			this.config.report[issueType] = true;

			delete this.config.readable[issueType];
		} else {
			if (!Object.keys(this.readable).length) {
				registerHandlers(this, 'readable');
			}
			
			this.config.readable[issueType] = true;

			delete this.config.report[issueType];
		}

		if (!Object.keys(this.config.readable).length) {
			unregisterHandlers(this, 'readable');
		}
	} else {
		throw new Error('Unknown issue: ' + issueType);
	}
};

Tomesweeper.prototype.ignore = function (issueType) {
	for (var eventName in this.prohibits) {
		if (this.prohibits[eventName].hasOwnProperty(issueType)) {
			delete this.prohibits[eventName][issueType];
			if (Object.keys(this.prohibits[eventName]).length && eventName !== 'report') {
				unregisterHandlers(this, eventName);
			}
		}
	}
};

Tomesweeper.prototype.ignoreAll = function () {
	for (var eventName in this.prohibits) {
		this.prohibits[eventName] = {};
		if (eventName !== 'report') {
			unregisterHandlers(this, eventName);
		}
	}
};

Tomesweeper.prototype.sweepForAll = function () {
	for (var eventName in this.prohibits) {
		if (!Object.keys(this.prohibits[eventName]).length && eventName !== 'report') {
			registerHandlers(this, eventName);
		}
	}
	this.prohibits = defaultProhibits;
};

Tomesweeper.prototype.report = function (tomes) {
	if (tomes === undefined) {
		tomes = this.tomes;
	} else {
		tomes = [ tomes ];
	}

	for (var i = 0, len = tomes.length; i < len; i += 1) {
		reportSweep(this, tomes[i]);
	}


	var out = this.foundIssues;
	
	this.foundIssues = [];

	return out;
};

exports.Tomesweeper = Tomesweeper;