const fs = require('fs');

class SchemaBuilder {
	// constructor(initialSchema){
	// 	if(initialSchema) this.finalSchema = schema;
	// 	else this.finalSchema = {};
	// }

	constructor(schemaRootDir) {
		this.schemaRootDir = schemaRootDir;
		this.finalSchema = {};
	}

	// --------------------------------------------------------------------------------------------------
	// vvvvv private methods vvvvv

	_urlStringToUrlArray(urlString) {
		let urlArray = urlString.split('/');
		if (urlArray[0] === '') urlArray.shift();
		if (urlArray[urlArray.length - 1] === '') urlArray.pop();
		return urlArray;
	}

	_objectTraverse(currentNode, urlArray, urlIndex, rulesObject) {
		//note: second expression (right of ||) is used to deal with a duplicate api action object. The previous object ultimately gets replaced.
		//		It normally shouldn't get executed at all. It *may* get executed if an `initialSchema` is passed in the constructor with a duplicate api action.
		let currentUrlPart = urlArray[urlIndex];
		if (!currentNode.hasOwnProperty(currentUrlPart) || (currentNode.hasOwnProperty(currentUrlPart) && urlIndex === urlArray.length - 1)) {
			//need to check if another method has already been defined for the path.
			if (urlIndex === urlArray.length - 1) {
				if (currentNode[currentUrlPart] == undefined) currentNode[currentUrlPart] = rulesObject;
				else Object.assign(currentNode[currentUrlPart], rulesObject);
			}
			else {
				let objectToAdd = {};
				this._buildObjectFromKeysArray(objectToAdd, urlArray.slice(urlIndex + 1), 0, rulesObject);
				currentNode[currentUrlPart] = objectToAdd;
			}
			return;
		} else {
			currentNode = currentNode[currentUrlPart];
			urlIndex++;
			this._objectTraverse(currentNode, urlArray, urlIndex, rulesObject);
		}
	}

	_buildObjectFromKeysArray(o, a, index, content) {
		o[a[index]] = {};
		if (index === a.length - 1) {
			o[a[index]] = content
			return;
		} else if (index === a.length) return;
		index++;
		this._buildObjectFromKeysArray(o[a[index - 1]], a, index, content);
	}

	// --------------------------------------------------------------------------------------------------
	// vvvvv public methods vvvvv

	registerPath(method, urlString, rulesObject) {
		method = method.toUpperCase();
		if (method === 'GET' || method === 'HEAD' || method === 'POST' || method === 'PUT' || method === 'DELETE' || method === 'CONNECT' || method === 'OPTIONS' || method === 'TRACE' || method === 'PATCH') {
			rulesObject = { [method]: rulesObject };
			let urlArray = this._urlStringToUrlArray(urlString);
			this._objectTraverse(this.finalSchema, urlArray, 0, rulesObject);
			return this;	//handy for chained calls
		} else {
			console.error("CUSTOM METHODS NOT ALLOWED. Check `method` arguement. Skipping. Got: " + method);
			return -1;
		}
	}

	registerDirectory(currentDir = this.schemaRootDir) {
		let files = fs.readdirSync(currentDir);
		for (let file of files) {
			let path = currentDir + '/';
			if (fs.lstatSync(path + file).isFile()) {
				let filenameArray = file.replace('.schema.json', '').split('.');
				if (filenameArray.length > 2) console.error('ERROR!: Wrong file extension for .schema.json file. Skipping. Got: ' + file);
				else {
					let apiAction = filenameArray[0];
					let apiMethod = filenameArray[1];
					let content = fs.readFileSync(path + file, 'utf-8');
					let parsed_content;
					if (content === '') parsed_content = {}; //guard for empty schema json file. Turns it into an empty object
					else parsed_content = JSON.parse(content);
					this.registerPath(apiMethod, path.replace(this.schemaRootDir, '') + apiAction, parsed_content);
					//TODO: call a passed callback here for additional actions per schema json file
				}
			} else this.registerDirectory(path + file);
		}
	}
	getFinalSchema() { return this.finalSchema; }
};

module.exports = { SchemaBuilder };