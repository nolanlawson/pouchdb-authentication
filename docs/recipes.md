CouchDB authentication recipes
------------

So you just installed CouchDB, but you're not sure how to set up the right user permissions?  Look no further.

### First step: disable the Admin Party!

When you first install CouchDB, it will be in the "Admin Party" mode, which means everyone is an admin.  You'll want to disable this and create at least one admin user, so that random people can't mess with your CouchDB settings:

![Admin party][]

Below is a list of recipes for common authentication use cases.

* [Everybody can read and write everything](#everybody-can-read-and-write-everything)
* [Everybody can read, only some can write (everything)](#everybody-can-read-only-some-can-write-everything)
* [Everybody can read, only some can write (some things)](#everybody-can-read-only-some-can-write-some-things)
* [Some people can read and write everything](#some-people-can-read-and-write-everything)
* [Some people can read (some docs), some people can write (those same docs)](#some-people-can-read-some-docs-some-people-can-write-those-same-docs)
* [Everybody has to be logged in to do anything](#everybody-has-to-be-logged-in-to-do-anything)

### Everybody can read and write everything
* Example: a public wiki

#### Howto

Just create a new database; this is the default.  It's very dangerous, though, since users can even overwite the history of a document. So you probably don't want it.

### Everybody can read, only some can write (everything)
* Example: a blog

#### Howto

Create a new database, then add a *design doc* with a  `validate_doc_update` function (see [the CouchDB docs](http://guide.couchdb.org/draft/validation.html) for details). This function will be called whenever a document is created, modified, or deleted.  In it, we'll check that the user is either an admin or has the `'blogger'` role.

The function looks like this:

```js
function(newDoc, oldDoc, userCtx) {
  var role = "blogger";
  if (userCtx.roles.indexOf("_admin") === -1 && userCtx.roles.indexOf(role) === -1) {
    throw({forbidden : "Only users with role " + role + " or an admin can modify this database."});
  }
}
```

You can create the document like this:

    curl -X POST http://admin:password@localhost:5984/mydb \
    -H 'content-type:application/json' \
    -d $'{"_id":"_design/only_bloggers","validate_doc_update":"function (newDoc, oldDoc, userCtx) {\\nvar role = \\"blogger\\";\\nif (userCtx.roles.indexOf(\\"_admin\\") === -1 && userCtx.roles.indexOf(role) === -1) {\\nthrow({forbidden : \\"Only users with role \\" + role + \\" or an admin can modify this database.\\"});\\n}\\n}"}'

In the above command, you will need to change **admin**/**password** (admin and password), **localhost:5984** (your Couch URL), **mydb** (your database), **only_bloggers** (name of the design doc, can be whatever you want), and **blogger** (name of the new role).

You can also create the document in the Futon interface itself:

![New doc button][]

![Blogger DDoc][]

From now on, you can give users the role `"blogger"`, so they can add/modify/remove documents. (Only admins can change someone's roles.)

![Blogger][]

Admins can also modify documents, but they are the only ones who can change the security settings.

Everyone else will get an error if they try to write (but not if they try to read).

    $ curl -X POST http://blogger1:blogger1@localhost:5984/mydb -H 'content-type:application/json' -d '{"some" : "doc"}'
    {"ok":true,"id":"ef24bec394e1a45f32ea917121002282","rev":"1-65c2325c1ab76e8279e6c2e3abc1da69"}
    $ curl -X POST http://foobar:foobar@localhost:5984/mydb -H 'content-type:application/json' -d '{"some" : "doc"}'
    {"error":"forbidden","reason":"Only users with role blogger or an admin can modify this database."}

### Everybody can read, only some can write (some things)

* Example: Twitter

In this example, all tweets are public, but everybody can only create/edit/delete their own tweets.

Very similar to the above, we'll create a *design doc* with a `validate_doc_update` function, but this time we'll also ensure that every document contains a `user` field, and that the `user` field matches the name of the user who's modifying it:

```js
function(newDoc, oldDoc, userCtx) {
  if (userCtx.roles.indexOf('_admin') === -1 && newDoc.user !== userCtx.name) {
    throw({forbidden : "doc.user must be the same as your username."});
  }
}

```

Here's a `curl` command you can use:

    curl -X POST http://admin:password@localhost:5984/mydb \
    -H 'content-type:application/json' \
    -d $'{"_id":"_design/only_correct_user","validate_doc_update":"function (newDoc, oldDoc, userCtx) {\\nif (userCtx.roles.indexOf(\'_admin\') === -1 && newDoc.user !== userCtx.name) {\\nthrow({forbidden : \\"doc.user must be the same as your username.\\"});\\n}\\n}"}'

In the above command, you will need to change **admin**/**password** (admin and password), **localhost:5984** (your Couch URL), **mydb** (your database), and **only_correct_user** (name of the design doc, can be whatever you want).

You can also use the Futon UI to do this.  See the "blogger" example above for details.

### Some people can read and write everything
* Example: a shared company wiki

#### Howto

Create a new database, then click the "Security" button:

![security button][]

Set a new role as the read/write role.  We'll call this one `"employee"`:

![employee][]

In this scheme, only admins can change the security settings, but any user with the role `"employee"` can view or add/modify/delete documents. The database is not public; only valid users with the role `"employee"` can read from it.

See the "blogger" example above for how to set roles.

### Some people can read (some docs), some people can write (those same docs)

* Example: A private file locker

#### Howto

The standard practice for this is to set up **one database per user**.  Don't be scared: databases are cheap, and Cloudant says [100k databases per account is not uncommon][cloudant-100k].

Alternatively, if you have users who belong to multiple groups, and each group has a set of documents, then you should use a **one database per role** setup, with CouchDB's [roles system](http://docs.couchdb.org/en/latest/api/database/security.html?highlight=roles).

Then, you just need to set the database to be read-only/write-only for people with the correct user name (or correct role), using the [`db/_security` API](http://docs.couchdb.org/en/latest/api/database/security.html). (See screenshots above for manual steps.)

There are a few different ways to accomplish this, and unfortunately you can't do it with CouchDB alone (as of this writing).  But here are a few different third-party options you can try:

### [couch_peruser configuration](http://docs.couchdb.org/en/2.1.0/config/couch-peruser.html)

As of CouchDB 2.1, CouchDB supports couch_peruser configuration options.

#### [CouchPerUser](https://github.com/etrepum/couchperuser)

Native CouchDB Erlang plugin that automatically creates one database per user.  The database name is just a hex-encoded hash of the user name, and it completely predictable.

**Update!** This is now much easier to use, because there are [prebuilt Docker images (deprecated)](https://hub.docker.com/r/klaemo/couchdb/) containing the `CouchPerUser` plugin.

#### [couchdb-dbperuser-provisioning](https://github.com/pegli/couchdb-dbperuser-provisioning)

Node.js daemon to do the same as above.

#### [CouchDB-Selfservice](https://github.com/ocasta/CouchDB-Selfservice)

Python process that gives you a URL to use when registering users, and creates a database for that user on registration.

#### [PHP-on-Couch](https://github.com/dready92/PHP-on-Couch)

PHP library that provides some sugar over the CouchDB API, e.g. for admin stuff.

#### [Hoodie](http://hood.ie)

Batteries-included no-backend framework.  Currently (as of January 2016) being [ported to use PouchDB](https://github.com/hoodiehq/hoodie-client-store).

#### [PouchBase (deprecated)](https://github.com/pouchdb/pouchbase/) (formerly pouch.host)

(Work in progress as of January 2015.) Hosted PouchDB Server with per-user read-write access.

### Everybody has to be logged in to do anything

* Example: Medical healthcare records

#### Howto

The highest level of security offered by CouchDB.  No requests *whatsoever* are allowed from unauthenticated users.

First, ensure that at least one CouchDB user has been created (if you've [disabled admin party](#first-step-disable-the-admin-party), you'll already have at least one admin user).  Next, if you're using CORS, ensure the `cors.headers` array contains `authorization` (this should already be set if you've followed [CouchDB setup][couchdb setup]).  Finally, set `httpd.require_valid_user` to `true`.

To prevent browser HTTP basic authentication modal dialogs of ye olde times, we have to be subtle in the way we use PouchDB.  To prevent a rogue unauthenticated request to CouchDB (used to [check whether the remote DB exists][skipsetup]), pass `skip_setup: true` in Pouch's constructor options.  Secondly, to authenticate the request against `_session`, add the HTTP basic authorization header to `db.login()`'s [AJAX options][api].

Example usage:

```js
var user = {
  name: 'admin',
  password: 'admin'
};

var pouchOpts = {
  skip_setup: true
};

var ajaxOpts = {
  ajax: {
    headers: {
      Authorization: 'Basic ' + window.btoa(user.name + ':' + user.password)
    }
  }
};

var db = new PouchDB('http://localhost:5984/test', pouchOpts);

db.login(user.name, user.password, ajaxOpts).then(function() {
  return db.allDocs();
}).then(function(docs) {
  console.log(docs);
}).catch(function(error) {
  console.error(error);
});
```

[couchdb setup]: ../README.md#couchdb-setup
[api]: ./api.md

[admin party]: https://raw.githubusercontent.com/pouchdb-community/pouchdb-authentication/master/docs/admin_party.png
[blogger]: https://raw.githubusercontent.com/pouchdb-community/pouchdb-authentication/master/docs/blogger.png
[blogger ddoc]: https://raw.githubusercontent.com/pouchdb-community/pouchdb-authentication/master/docs/blogger_ddoc.png
[new doc button]: https://raw.githubusercontent.com/pouchdb-community/pouchdb-authentication/master/docs/new_doc_button.png
[security button]: https://raw.githubusercontent.com/pouchdb-community/pouchdb-authentication/master/docs/security_button.png
[employee]: https://raw.githubusercontent.com/pouchdb-community/pouchdb-authentication/master/docs/employee.png
[cloudant-100k]: https://mail-archives.apache.org/mod_mbox/couchdb-user/201401.mbox/%3C52CEB873.7080404@ironicdesign.com%3E
[couchperuser-gist]: https://gist.github.com/nolanlawson/9676093
[skipsetup]: https://github.com/pouchdb/pouchdb/blob/e78a30f8a548340335e28efb827cddfcd96d0482/lib/adapters/http.js#L157
