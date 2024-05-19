
const DeepCompare = require("./DeepCompare").DeepCompare;
const SchemaBuilder = require('./SchemaBuilder').SchemaBuilder;
const serverResponse = require('../../NEW-webb-server').serverResponse;
// -----------------------------------------------------------------------
const SCHEMA_ROOT_DIR = "SCHEMA_ROOT_DIR";
// const G_MAX_SUBDOMAIN_LENGTH = 50;
// const G_MIN_SUBDOMAIN_LENGTH = 5;
const G_SCHEMA_STOP_CHARACTER = "?";
// const CONSTRAINTS_LIST_REQUIRED = ['allow-empty', 'length-limits', 'allow-whitespace'];
// const CONSTRAINTS_LIST_OPTIONAL = ['--allow-unicode', '--whitelist-special-characters', '--letters-required', '--custom-regex'];

//NOTE: When making a POST request with a body as well as URL parameters,
//the latter are treated as if they were part of the body, for validation purposes only! 
//This means that there must not be a naming conflict between the URL parameters the fields of the request body. 

//TODO (FUTURE): Set in constructor option to use SCHEMA_ROOT_DIR/.global.schema.json file for global constraints variables or not
let schemaBuilder = new SchemaBuilder(__dirname + '/' + SCHEMA_ROOT_DIR);
schemaBuilder.registerDirectory();
const SCHEMA = schemaBuilder.getFinalSchema();		//in final production environment, we'll get it from the central server as application/json 



module.exports = (req, res, next) => {
	// console.log(JSON.stringify(req.body,null,2));

	//TEMP SKIP HACKS=======================
	if(req.originalUrl.includes('addProduct')) {next(); return}
	

	//TEMP SKIP HACKS=======================

	let notFound = false;
	let cleanUrl = req.originalUrl.split('?')[0];
	let specificSchema = getSpecificSchemaForPath(cleanUrl, SCHEMA);
	if (specificSchema !== null) {
		let schemaForPath = specificSchema[req.method];
		if (typeof schemaForPath !== 'undefined' && schemaForPath != null) {
			let correctStructure;
			let frontendRequest = {};
			let deepCompare = new DeepCompare(req.body);
			if (req.method === 'GET') frontendRequest = req.query;
			else if (req.method === 'POST') {
				//Support POST requests with URL parameters.
				//Append query params as fields on `frontendRequest` object
				for (let q in req.query) frontendRequest[q] = req.query[q]
				Object.assign(frontendRequest, req.body);
				console.log(frontendRequest)
			}
			correctStructure = deepCompare.doCompare(schemaForPath, frontendRequest, G_SCHEMA_STOP_CHARACTER, checkConstraints, true);
			console.log('//BOOLEANS//',deepCompare.getBooleans())
			// console.log(correctStructure, deepCompare.getReqHasValidConstraints())
			serverResponse.setBooleans(deepCompare.getBooleans());
			//----> Api call is VALID
			if (correctStructure && deepCompare.getReqHasValidConstraints()) next();
			//----> Api call is INVALID
			else if (!deepCompare.getReqHasValidConstraints()) {
				req.body = null; //help garbage collection (?)
				res.status(400).send(serverResponse.setStatusCode('FORM__INVALID_FORM').getResponse());
			} else {
				req.body = null; //help garbage collection (?)
				serverResponse.setBooleans(null);
				res.status(400).send(serverResponse.setStatusCode('BAD_REQUEST').getResponse());
			}
		} else notFound = true;
	} else notFound = true;
	if (notFound) { res.status(400).send(serverResponse.setStatusCode('DEBUG_ONLY__PATH_NOT_FOUND').getResponse()); }
};

function getSpecificSchemaForPath(url, globalSchema) {
	if (url.charAt(0) === '/') url = String(url).substring(1);
	if (url.charAt(url.length - 1) === '/') url = String(url).substring(0, url.length - 1);
	let urlArray = url.split('/');
	let o = globalSchema;
	let l = urlArray.length;
	let unexpected_resource = false;
	for (let i = 1; i <= l; i++) {
		if (typeof o[urlArray[0]] === 'undefined') {
			unexpected_resource = true;
			break;
		} else o = o[urlArray.shift()];
	}
	if (unexpected_resource) return null;
	else return o;
}

//>>>All checks work they probably should, @2-3-2023
//TODO: check for correct type. Must add "type":string,integer,object etc in the schema json
//Presupposes valid rules definitions!!
function checkConstraints(key, inputValue, constraintsObject) {

	console.log('Checking:  ', inputValue)

	//---Prechecks:
	if (inputValue === 'PRECHECK__MAGIC_NUMBER_FALSE') return false;
	if (inputValue === 'PRECHECK__EMPTY_FILE') return false;

	if (isObjectProper(inputValue)) { //we have a file
		if (!constraintsObject.extensions.includes(inputValue.extension)) return false;
		if (!(inputValue.filesizeB >= constraintsObject.filesizeB[0] && inputValue.filesizeB <= constraintsObject.filesizeB[1])) return false;
		return true;
	} else { //we have a value

		if (typeof constraintsObject['is-number'] !== 'undefined') {
			// required -------------------
			if (constraintsObject['is-number'] && typeof inputValue !== 'number') return false;
			//optional --------------------
			if (typeof constraintsObject['--is-number-int'] !== 'undefined') {
				if (constraintsObject['--is-number-int'] && Math.floor(inputValue) !== inputValue) return false
			}
		} else {
			// required -------------------
			if (!constraintsObject['allow-empty'] && isEmptyString(inputValue)) return false;
			if (!validLength(inputValue, constraintsObject['length-limits'][0], constraintsObject['length-limits'][1])) return false;
			if (!constraintsObject['allow-whitespace'] && containsWhitespace(inputValue)) return false;

			//optional --------------------
			if (typeof constraintsObject['--allow-unicode'] !== 'undefined') {
				if (!constraintsObject['--allow-unicode'] && containsUnicode(inputValue)) return false;
			}
			if (typeof constraintsObject['--whitelist-special-characters'] !== 'undefined') {
				if (containsInvalidSpecial(inputValue, constraintsObject['--whitelist-special-characters'])) return false;
			}
			if (typeof constraintsObject['--letters-required'] !== 'undefined') {
				if (constraintsObject['--letters-required'] && !containsLetters(inputValue)) return false;
			}
			if (typeof constraintsObject['--custom-regex'] !== 'undefined') {
				if (constraintsObject['--custom-regex'] != null && !checkCustomRegex(inputValue, constraintsObject['--custom-regex'])) return false;

			}
			// if (typeof constraintsObject['--required'] !== 'undefined') {
			// 	if (constraintsObject['--required'] && inputValue == null) {
			// 		return false;
			// 	}
			// }
		}
		return true;
	}
}

function containsInvalidSpecial(s, whitelist) {
	if (whitelist === 'ALL') return false;
	else {
		let blacklist = ['\\', '!', '$', '@', '[', ']', '/', '#', '~', '`', ';', '%', '^', '\'', '\"', ',', '.', '+', '>', '<', '&', '?', '*', '(', ')', '{', '}', '|', '=', '-', '_'];
		let new_blacklist = '';
		if (whitelist !== null) {
			for (let i = 0; i < blacklist.length; i++)
				if (!whitelist.includes(blacklist[i])) new_blacklist += blacklist[i];
		} else new_blacklist = blacklist.join('');
		for (character of new_blacklist) {
			if (s.includes(character)) return true;
		}
	}
}
//
//TODO: accept array of specific values ONLY e.g. "allow-only":["value-1","value-2",...]
function containsUnicode(s) { return s.match(/[^\x00-\x7F]+/) != null }

//TODO: accept letters in unicode (other languages)
function containsLetters(s) { return s.match(/[\sA-za-z]/g) != null; }

function validLength(s, a, b) { return s.length >= a && s.length <= b; }

function isEmptyString(s) { return s == "" || s == null; }

function containsWhitespace(s) { return s.match(/\s/g) != null }

function checkCustomRegex(s, r) { return s.match(new RegExp(r), 'gi') != null; }


function isObjectProper(x) { return typeof x === 'object' && !Array.isArray(x) && x !== null; }
