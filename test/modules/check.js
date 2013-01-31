var Tome = require('tomes').Tome;
var Tomesweeper = require('../../tomesweeper.js').Tomesweeper;

exports.testUndefinedHasProperty = function (test) {
	test.expect(1);

	var a = { a: undefined };
	var b = Tome.conjure(a);

	var ts = new Tomesweeper();
	ts.addTome(b);

	b.a = 5;

	var report = ts.report();

	test.strictEqual(report[0].type, 'keyInjection');

	test.done();
};

exports.testTypeChange = function (test) {
	test.expect(1);

	var a = { a: true };
	var b = Tome.conjure(a);

	var ts = new Tomesweeper();
	ts.addTome(b);

	b.a.assign('string');

	var report = ts.report();

	test.strictEqual(report[0].type, 'primitiveToPrimitive');

	test.done();
};

