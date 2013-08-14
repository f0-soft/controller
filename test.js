var Controller = require('./index.js');

//Глобальная переменная для хранения общих данных о view
var testObjGlobalViewsConfig = {
	'testViewCustomers': { 'testCustomers':['name', 'inn', 'managerName', 'tsCreate'] },
	'testViewOrdersServices':{
		'orders':['number', 'comments', 'services'],
		'services':['name', 'price']
	}
};

//Переменная для хранения экземпляра контролера
var controller;

//Конфиг
configForController = {
	redisConfig: {},
	view:{},
	flexoSchemes:{},
	menuConfig:{},
	formConfig:{}
};

exports.init = function (test) {
	test.expect( 3 );
	Controller.init( configForController, function( err, reply ) {
		test.ifError(err);
		test.ok(reply);
		test.ok(Controller.create);
		controller = new Controller.create();
		test.done();
	} );
};

exports.saveDataAboutView1 = function(test) {
	test.expect( 5 );
	//Объект запрос на создание данных о view
	var viewName = 'testViewCustomers';

	var queryForSave = {
		access: {
			viewName:viewName,
			objAccess:testObjGlobalViewsConfig[viewName]
		}
	};

	controller.create(queryForSave, function( err, reply ) {
		test.ifError(err);
		test.ok(reply);

		var queryForRead = {
			access: {
				viewName:viewName
			}
		};

		controller.find(queryForRead, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);
			test.deepEqual(reply, testObjGlobalViewsConfig[viewName], 'Возвращен другой объект');
			test.done();
		});
	});
};

exports.saveDataAboutView2 = function(test) {
	test.expect( 5 );
	//Объект запрос на создание данных о view
	var viewName = 'testViewOrdersServices';

	var queryForSave = {
		access: {
			viewName:viewName,
			objAccess:testObjGlobalViewsConfig[viewName]
		}
	};

	controller.create(queryForSave, function( err, reply ) {
		test.ifError(err);
		test.ok(reply);

		var queryForRead = {
			access: {
				viewName:viewName
			}
		};

		controller.find(queryForRead, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);
			test.deepEqual(reply, testObjGlobalViewsConfig[viewName], 'Возвращен другой объект');
			test.done();
		});
	});
};
