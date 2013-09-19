module.exports = {
	name: 'testCustomer',
	root: {
		name: { type: 'string', title:'', description:'' },
		manager_id: { type: 'id', from: 'testManager', link: 'contract-manager', title:'', description:'' }
	}
};
