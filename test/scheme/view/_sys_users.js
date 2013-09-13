module.exports = {
	name: '_sys_users',
	view:{},
	config: {
		menuItems: [
			{ _vid: 'a1', _flexo:{type: 'modify', scheme: ['_sys_users', '_id']}},
			{ _vid: 'a2', _flexo:{type: 'modify', scheme: ['_sys_users', 'tsUpdate']}},
			{ _vid: 'a3', _flexo:{type: 'modify', scheme: ['_sys_users', 'login']}},
			{ _vid: 'a4', _flexo:{type: 'modify', scheme: ['_sys_users', 'company_id']}}
		]
	}
};
