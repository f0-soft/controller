'use strict';

module.exports = {
	name: 'orders',

	root: {
		'login': { type: 'string' },
		'role': { type: 'string' },
		'name': { type: 'string' },
		'lastname': { type: 'string' },
		'position': { type: 'string' },
		'company': { type: 'string' },
		'hash': { type: 'string' },
		'salt': { type: 'string' }
	}
};