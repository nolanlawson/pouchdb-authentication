API
-------

* [db.signUp()](#dbsignupusername-password--options--callback)
* [db.logIn()](#dbloginusername-password--options--callback)
* [db.logOut()](#dblogoutcallback)
* [db.getSession()](#dbgetsessionopts--callback)
* [db.getUser()](#dbgetuserusername--opts-callback)
* [db.putUser()](#dbputuserusername-opts--callback)
* [db.deleteUser()](#dbdeleteuserusername-opts--callback)
* [db.changePassword()](#user-content-dbchangepasswordusername-password--opts-callback)
* [db.changeUsername()](#user-content-dbchangeusernameoldusername-newusername-opts-callback)
* [db.signUpAdmin()](#dbsignupadminusername-password--options--callback)
* [db.deleteAdmin()](#dbdeleteadminusername-opts--callback)

Like PouchDB, every function takes a Node-style callback of the form `function(error, response)`. Or you can use promises:

```js
db.doSomething(args).then(function (response) {
  return db.doSomethingElse(args);
}).then(function (response) {
  // handle response
}).catch(function (error) {
  // handle error
});
```

Every function also takes a set of `options`.  Unless otherwise noted, the only available option is `ajax`, which corresponds to the standard PouchDB ajax options. (See [the PouchDB API](http://pouchdb.com/api.html) for details.)  Currently the only ajax option is `ajax.cache`, which can be set to `true` to disable cache-busting on IE.

#### db.signUp(username, password [, options] [, callback])

Sign up a new user who doesn't exist yet.  Throws an error if the user already exists or if the username is invalid, or if some network error occurred.  CouchDB has some limitations on user names (e.g. they cannot contain the character `:`).

```js
db.signUp('batman', 'brucewayne', function (err, response) {
  if (err) {
    if (err.name === 'conflict') {
      // "batman" already exists, choose another username
    } else if (err.name === 'forbidden') {
      // invalid username
    } else {
      // HTTP error, cosmic rays, etc.
    }
  }
});
```

##### Example response:

```js
{
  "ok":true,
  "id":"org.couchdb.user:batman",
  "rev":"1-575ed65bb40cbe90dc882ced8044a90f"
}
```

**Note:** Signing up does not automatically log in a user; you will need to call `db.logIn()` afterwards.

##### Options

* **metadata** : Object of metadata you want to store with the username, e.g. an email address or any other info. Can be as deeply structured as you want.

##### Example:

```js
db.signUp('robin', 'dickgrayson', {
  metadata : {
    email : 'robin@boywonder.com',
    birthday : '1932-03-27T00:00:00.000Z',
    likes : ['acrobatics', 'short pants', 'sidekickin\''],
  }
}, function (err, response) {
  // etc.
});
```

Note that CouchDB does not enforce a password policy or a username policy, unless you add a security doc to the `_users` database.

#### db.logIn(username, password [, options] [, callback])

Log in an existing user. Throws an error if the user doesn't exist yet, the password is wrong, the HTTP server is unreachable, or a meteor struck your computer.

```js
db.logIn('superman', 'clarkkent', function (err, response) {
  if (err) {
    if (err.name === 'unauthorized' || err.name === 'forbidden') {
      // name or password incorrect
    } else {
      // cosmic rays, a meteor, etc.
    }
  }
});
```

##### Example response:

```js
{"ok":true,"name":"david","roles":[]}
```

#### db.logOut([callback])

Logs out whichever user is currently logged in. If nobody's logged in, it does nothing and just returns `{"ok" : true}`.

##### Example:

```js
db.logOut(function (err, response) {
  if (err) {
    // network error
  }
})
```

##### Example response:

```js
{"ok":true}
```

#### db.getSession([options] [, callback])

Returns information about the current session.  In other words, this tells you which user is currently logged in.

##### Example:

```js
db.getSession(function (err, response) {
  if (err) {
    // network error
  } else if (!response.userCtx.name) {
    // nobody's logged in
  } else {
    // response.userCtx.name is the current user
  }
});
```

##### Example response:

```js
{
    "info": {
        "authenticated": "cookie",
        "authentication_db": "_users",
        "authentication_handlers": ["oauth", "cookie", "default"]
    },
    "ok": true,
    "userCtx": {
        "name": "batman",
        "roles": []
    }
}

```

**Note:** `getSession()` returns basic user information, like name and roles, but doesn't return metadata.  If you need the metadata, use `getUser()`.

#### db.getUser(username [, options] [, callback])

Returns the user document associated with a username.  (CouchDB, in a pleasing show of consistency, stores users as JSON documents in the special `_users` database.) This is the primary way to get metadata about a user.

##### Example:

```js
db.getUser('aquaman', function (err, response) {
  if (err) {
    if (err.name === 'not_found') {
      // typo, or you don't have the privileges to see this user
    } else {
      // some other error
    }
  } else {
    // response is the user object
  }
});
```

##### Example response:

```js
{
    "_id": "org.couchdb.user:aquaman",
    "_rev": "1-60288b5b056a8af31e910bca2523ea6a",
    "derived_key": "05c3314f180faed646af3b77e637ffecf2e3fb93",
    "iterations": 10,
    "name": "aquaman",
    "password_scheme": "pbkdf2",
    "roles": [],
    "salt": "bce14111a559e00587f3e5f207e4a316",
    "type": "user"
}
```

**Note:** Only server admins or the user themselves can fetch user data. Otherwise you will get a 404 `not_found` error.


#### db.putUser(username [, options] [, callback])

Update the metadata of a user.

```js
db.putUser('robin', {
  metadata : {
    email : 'robin@boywonder.com',
    birthday : '1932-03-27T00:00:00.000Z',
    likes : ['acrobatics', 'short pants', 'sidekickin\''],
  }
}, function (err, response) {
  // etc.
});
```

#### db.deleteUser(username [, options] [, callback])

Delete a user.

```js
db.deleteUser('robin', function (err, response) {
  // etc.
});
```

#### db.changePassword(username, password [, options] [, callback])

Set new `password` for user `username`.

##### Example:

```js
db.changePassword('spiderman', 'will-remember', function(err, response) {
  if (err) {
    if (err.name === 'not_found') {
      // typo, or you don't have the privileges to see this user
    } else {
      // some other error
    }
  } else {
    // response is the user update response
    // {
    //   "ok": true,
    //   "id": "org.couchdb.user:spiderman",
    //   "rev": "2-09310a62dcc7eea42bf3d4f67e8ff8c4"
    // }
  }
});
```

**Note:** Only server admins or the user themselves can change user data. Otherwise you will get a 404 `not_found` error.

#### db.changeUsername(oldUsername, newUsername [, options] [, callback])

Renames `oldUsername` to `newUsername`.

##### Example:

```js
db.changeUsername('spiderman', 'batman', function(err) {
  if (err) {
    if (err.name === 'not_found') {
      // typo, or you don't have the privileges to see this user
    } else if (err.taken) {
      // auth error, make sure that 'batman' isn't already in DB
    } else {
      // some other error
    }
  } else {
    // succeeded
  }
});
```

**Note:** Only server admins change a username. Otherwise you will get a 404 `not_found` error.

#### db.signUpAdmin(username, password [, options] [, callback])

Sign up a new admin.

```js
db.signUpAdmin('batman', 'brucewayne', function (err, response) {
  // etc.
});
```

#### db.deleteAdmin(username [, options] [, callback])

Delete an admin.

```js
db.deleteAdmin('batman', function (err, response) {
  // etc.
});
```
