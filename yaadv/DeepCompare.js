//For api validation, in the following explanations, o1 is the schema object and o2 is the test object from the actual api request
//(c) Stergios Stamatiou - Mar 2023

class DeepCompare {

	constructor(o) {
		// this.booleans = {};
		this.originalRequest = {};

		//----- VERY IMPORTANT!
		//This function creates a deep copy of the original request which is used to create the booleans object.
		//However, if we use JSON.parse(JSON.stringify()) on a request that has large buffers -many MBs- inside (see: form-data uploads), we get a heap overflow.
		//This function solves this by creating a deep copy where all values are turned into `null`.
		//We don't care about their values because they will be turned into `true` or `false` in the booleans object, anyway. We only care about the structure.
		this._deepCopyToNull(o, this.originalRequest);

		this.correctConstraints = true;
		this.identifiers = {
			'prefixes': {
				'leaf': '?',
				'optional': '~'
			},
			'suffixes': {
				'multiple': '[]'
			}
		}
	}

	//TODO: internal functions for indentifiers chars need more work! still somewhat hardcoded and notflexible!!!

	_clean(key) {
		let lPrefixes = 0;
		let lSuffixes = 0;
		for (let prefix in this.identifiers.prefixes) {
			if (this.identifiers.prefixes.hasOwnProperty(prefix) && key.includes(this.identifiers.prefixes[prefix]))
				lPrefixes += this.identifiers.prefixes[prefix].length;
		}
		for (let suffix in this.identifiers.suffixes) {
			if (this.identifiers.suffixes.hasOwnProperty(suffix) && key.includes(this.identifiers.suffixes[suffix]))
				lSuffixes += this.identifiers.suffixes[suffix].length;
		}
		return key.substring(lPrefixes, key.length - lSuffixes);
	}

	_isObjectProper(x) { return typeof x === 'object' && !Array.isArray(x) && x !== null; }

	_startsWithTilde(s) { return s.charAt(1) === '~' }

	_endsWithBrackets(s) {
		let l = s.length;

		return s.charAt(l - 2) === '[' && s.charAt(l - 1) === ']';
	}

	_trimBrackets(s) {
		return s.substring(0, s.length - 2);
	}

	_deepCopyToNull(o, c) {
		for (let key in o) {
			if (o.hasOwnProperty(key)) {
				if (this._isObjectProper(o[key])) {
					c[key] = {};
					this._deepCopyToNull(o[key], c[key]);
				} else {
					c[key] = null;
				}
			}
		}
		return;
	}

	//WARNING: This function is very complicated and very delicate. Small changes can break A LOT of things.
	//TODO!!: Maybe add an inversed comparison to detect fields in o2 that do not exist in o1
	doCompare(o1, o2, stopChar, checksCallback, checkAll, pointer = this.originalRequest) {
		if (o1 == null || typeof o1 === 'undefined') { console.error('o1 is empty!!'); return false; }
		let allKeysSame = true;
		for (let key in o1) {
			if (o1.hasOwnProperty(key)) {
				let currentNode = o1[key];
				let cleanKey = this._clean(key);
				if (this._isObjectProper(currentNode) && key.charAt(0) != stopChar) { //is node
					if (o2.hasOwnProperty(key)) {
						allKeysSame = this.doCompare(currentNode, o2[key], stopChar, checksCallback, checkAll, pointer[key]);
						if (!allKeysSame) return false;
					} else allKeysSame = false;
				} else { //is leaf
					let keyIsOptional = false;
					let validConstraints = true;
					if (this._startsWithTilde(key)) keyIsOptional = true;
					if (o2.hasOwnProperty(cleanKey)) {
						allKeysSame = true;
						if (this._endsWithBrackets(key)) {
							if (Array.isArray(o2[cleanKey])) {
								for (let copy of o2[cleanKey]) {
									validConstraints = checksCallback(cleanKey, copy, o1[key]);
									if (!validConstraints) break;
								}
								pointer[cleanKey] = validConstraints;
							} else {	//means o2 keyval is not array as it should be
								allKeysSame = false;
								// if (typeof checkAll !== null) if (!checkAll) allKeysSame = false; //don't know if this is needed. maybe just allKeysSame = false;
							}
						} else {
							if (key.charAt(0) == stopChar) validConstraints = checksCallback(cleanKey, o2[cleanKey], o1[key]);
							pointer[cleanKey] = validConstraints;
							if (typeof checkAll !== null) if (!checkAll && !validConstraints) allKeysSame = false;
						}
						if (!validConstraints) this.correctConstraints = false;
					} else {
						if (keyIsOptional) allKeysSame = true;
						else return false;
					}
				}
			}
		}
		return allKeysSame;
	}


	getBooleans() {
		return this.originalRequest;
	}

	getReqHasValidConstraints() { return this.correctConstraints; }



};
module.exports = { DeepCompare };