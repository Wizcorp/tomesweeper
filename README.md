tomesweeper
===========

Catch mistakes you've made with [tomes](https://github.com/bjornstar/tomes).

It's a bit like lint for tomes.

Example
=======
```javascript
var yourTome = Tome.conjure(yourData);

var ts = new Tomesweeper();
ts.add(yourTome);

// ... use yourTome.

var issues = ts.report();
```

Methods
=======

###addTome( *tome* )
Add tome to the list of tomes that the tomesweeper is checking.

###removeTome( *tome* )
Remove tome from the list of tomes that the tomesweeper is checking.

###sweepFor( *issue*, *[reportOnly]* )
Make the tomesweeper check for issue. If reportOnly is true, the tomesweeper will only check for that issue when report is called.

###ignore( *issue* )
Make the tomesweeper stop checking for issue.

###sweepForAll( )
Resets the tomesweeper back to the defaults, which checks for all issues.

###ignoreAll( )
Makes the tomesweeper stop checking for all issues, useful when you just want to check for one or two issues.

###report( *[tome]* )
Returns an array of all issues the tomesweeper found.

Issues
======

##Real Issues
Any of these issues represent a possibly fatal problem with your Tomes. These can be configured to be checked for when a Tome emits readable or when report is called.

###keyInjection
Non-tome keys found on a Tome.

###keyMismatch
A Tome's key does not match the key that it's parent has for it.

###undefinedTomeNotOnArrayTome
An UndefinedTome was found on an a Tome that was not an ArrayTome.

###valTypeMismatch
The type of value held by a primitive Tome does not match the Tome's type.

###parentIsNotObjectOrArray
A Tome was found on a Tome that is not an Array or Object.

##typeChange
In general, typeChanges are automatic and expected, but if you want to enforce schema-like behavior you can use these checks. typeChange issues are a special type of issue that can only be caught as they happen and cannot be set to reportOnly (see sweepFor).

###primitiveToPrimitive
A Tome changed from one primitive type to another (string, boolean, or number).

###primitiveToObject
A Tome changed from a primitive type to an object.

###primitiveToArray
A Tome changed from a primitive type to an array.

###primitiveToNull
A Tome changed from a primitive type to null.

Events
======

###issue( *issue* )
Emitted when an issue is found.
