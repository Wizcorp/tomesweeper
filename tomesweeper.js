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

var Tome = require('tomes').Tome;
var UndefinedTome = require('tomes').UndefinedTome;

/* sample usage:
var sweeper = new Tomesweeper();

sweeper.prohibit('PropertyInjection', true);

sweeper.on('log', function (entry) {
	if (entry.type === 'TypeChange') {
		throw new Error(entry.desc);
	}
});

sweeper.add(tome);
var result = sweeper.report();
{ type: 'TypeChange', tome: tome, desc: 'Trying to convert from ArrayTome to NumberTome' }
*/

var defaultProhibits = {
	typeChange: {
		primitiveToPrimitive: true,
		primitiveToObject: true,
		primitiveToArray: true,
		primitiveToNull: true,
	},
	readable: {
		invalidKeys: true
	},
	report: {
	}
};

var checks = { typeChange: {} };

Tome.buildChain = function (tome) { //TODO remove after introduced in tomes v0.0.9
	var chain = [];

	while (tome.hasOwnProperty('__key__')) {
		chain.push(tome.__key__);
		tome = tome.__parent__;
	}

	return chain.reverse();
};

checks.undefinedHasProperty = function (tomesweeper, tome) {
	var keys = Object.keys(tome);
	for (var i = 0, len = keys.length; i < len; i += 1) {
		var key = keys[i];
		if (tome[key] instanceof Tome) {
			if (tome instanceof UndefinedTome) {
			}
		}
	}
};

checks.invalidKeys = function (tomesweeper, tome) { // need v0.0.9 to make this work.
	var keys = Object.keys(tome);
	for (var i = 0, len = keys.length; i < len; i += 1) {
		var key = keys[i];
		if (tome[key] instanceof Tome) {
			if (tome[key].__key__ !== key) {
				tomesweeper.issues.push({ type: 'invalidKeys', chain: Tome.buildChain(tome), desc: 'Key "' + tome[key].__key__ + '" does not match key from parent: ' + key });
			}
		} else {
			tomesweeper.issues.push({ type: 'invalidKeys', chain: Tome.buildChain(tome), desc: 'Found non-Tome key: ' + key });
		}
	}
};

var primitiveTypes = {
	string: true,
	boolean: true,
	number: true
};

checks.typeChange.primitiveToNull = function (oldType, newType) {
	return primitiveTypes[oldType] && newType === 'null';
};

checks.typeChange.primitiveToPrimitive = function (oldType, newType) {
	return primitiveTypes[oldType] && primitiveTypes[newType];
};

checks.typeChange.primitiveToArray = function (oldType, newType) {
	return primitiveTypes[oldType] && newType === 'array';
};

checks.typeChange.primitiveToArray = function (oldType, newType) {
	return primitiveTypes[oldType] && newType === 'object';
};

function Tomesweeper(prohibits) {
	this.tomes = [];
	this.issues = [];
	this.prohibits = prohibits || defaultProhibits;

	var that = this;

	this.handlers = {};

	this.handlers.typeChange = function (tome, oldType, newType) {
		for (var checkName in that.prohibits.typeChange) {
			if (checks.typeChange[checkName](oldType, newType)) {
				var chain = Tome.buildChain(tome);
				return that.issues.push({ type: checkName, chain: chain, desc: 'Tome changed type from '.concat(oldType).concat(' to ').concat(newType) });
			}
		}
	};

	this.handlers.readable = function (dirtyAt, tome) {
		for (var checkName in that.prohibits.readable) {
			checks[checkName](that, tome);
		}
	};

	return this;
}

Tomesweeper.prototype.add = function (tome) {
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

Tomesweeper.prototype.prohibit = function (checkName, readable) {
	if (checks.typeChange[checkName]) {
		if (readable !== undefined) {
			throw new Error(checkName + ' is a typeChange check and does not take any options.');
		}

		if (!Object.keys(this.typeChange).length) {
			registerHandlers(this, 'typeChange');
		}

		this.config.typeChange[checkName] = true;
	} else if (checks[checkName]) {
		if (readable) {
			if (!Object.keys(this.readable).length) {
				registerHandlers(this, 'readable');
			}
			
			this.config.readable[checkName] = true;

			delete this.config.report[checkName];
		} else {
			this.config.report[checkName] = true;

			delete this.config.readable[checkName];
		}

		if (!Object.keys(this.config.readable).length) {
			unregisterHandlers(this, 'readable');
		}
	} else {
		throw new Error('Unknown check: ' + checkName);
	}
};

Tomesweeper.prototype.allow = function (checkName) {
	for (var eventName in this.prohibits) {
		if (this.prohibits[eventName].hasOwnProperty(checkName)) {
			delete this.prohibits[eventName][checkName];
			if (Object.keys(this.prohibits[eventName]).length && eventName !== 'report') {
				unregisterHandlers(this, eventName);
			}
		}
	}
};

Tomesweeper.prototype.allowAll = function () {
	for (var eventName in this.prohibits) {
		this.prohibits[eventName] = {};
		if (eventName !== 'report') {
			unregisterHandlers(this, eventName);
		}
	}
};

Tomesweeper.prototype.prohibitAll = function () {
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

	for (var checkName in this.prohibits.report) {
		for (var i = 0, len = tomes.length; i < len; i += 1) {
			checks[checkName](this, tomes[i]);
		}
	}

	var out = this.issues;
	
	this.issues = [];

	return out;
};

exports.Tomesweeper = Tomesweeper;