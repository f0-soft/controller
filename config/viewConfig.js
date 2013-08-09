module.exports = {
	viewConfig : {
		views: {
			viewCustomers: require('./../node_modules/view/test.views/viewCustomers'),
			viewOrdersServices: require('./../node_modules/view/test.views/viewOrdersServices')
		},
		templatePath: './node_modules/view/test.templates/'
	}
};
