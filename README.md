# YAADV
Yet Another Api Descriptor-Validator | Describe and Validate your backend endpoints by saving special JSON files in the filesystem.

Your entire tree of API endpoinds described using good old folders and files. (And a custom 'language' for use inside JSON files)

YAADV is written in ES6 Javascript for use as an Express.js middleware in NodeJs projects, but can easily be ported to other languages as well.

## Example:

```json
{
	"?subdomain": {
		"allow-empty": false,
		"length-limits": [ 5, 63 ],
		"allow-whitespace": false,
		"--allow-unicode": false,
		"--whitelist-special-characters": [ "-" ],
		"--letters-required": true,
		"--custom-regex": null
	},
	"?password": {
		"allow-empty": false,
		"length-limits": [ 2, 64 ],
		"allow-whitespace": true,
		"--allow-unicode": true,
		"--whitelist-special-characters": "ALL",
		"--letters-required": true,
		"--custom-regex": null
	},
	"inputs": {
		"?name": {
			"allow-empty": false,
			"length-limits": [ 5, 63 ],
			"allow-whitespace": true,
			"--allow-unicode": false,
			"--whitelist-special-characters": [ "-" ],
			"--letters-required": true,
			"--custom-regex": null
		},
		"?~date": {
			"allow-empty": false,
			"length-limits": [ 5, 63 ],
			"allow-whitespace": false
		}

	}
}
```
In this example, we describe not only the strict structure of the request but the constraints each field must follow in order to not get back a 400 Bad Request.
The supported request could be this:

```json
{
  "subdomain":"mycool-subdomain",
  "password": "thi$isMyP4ssword",
  "inputs":{
      "name":"my name"
  }
}
```
"~", denotes an optional field.

**WARNING** this project is under very heavy, albeit sporadic development. Use at your own risk! Bugs discovered may not be removed in this repository.

TODO: Documentation
