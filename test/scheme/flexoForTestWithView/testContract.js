module.exports = {
	name: 'testContract',
	root: {
		date: { type: 'number', title:'', description:'' },
		index: { type: 'string', title:'', description:'' },
		customer_id: { type: 'id', from: 'testCustomer', link: 'contract-manager', title:'', description:'' }
	}
};
