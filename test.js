var Controller = require('./index.js');
var async = require('async');

var charString = ['й','ц','у','к','е','н','г','ш','щ',
	'з','з','х','ъ','ф','ы','в','а','п','р','о','л',
	'д','ж','э','я','ч','с','м','и','т','ь','б','ю','Й',
	'Ц','У','К','Е','Н','Г','Ш','Щ','З','Х',
	'Ъ','Ф','Ы','В','А','П','Р','О','Л','Д','Ж','Э',
	'Я','Ч','С','М','И','Т','Ь','Б','Ю','q',
	'w','e','r','t','y','u','i','o','p','a','s','d','f',
	'g','h','j','k','l','z','x','c','v','b','n','m',
	'1','2','3','4','5','6','7','8','9','0','Q',
	'W','E','R','T','Y','U','I','O','P','A','S','D','F',
	'G','H','J','K','L','Z','X','C','V','B','N','M'];

//Имитация глобальной переменной для хранения общих данных о view
var testObjGlobalViewsConfig = {
	'testViewCustomers': { 'testCustomers':['name', 'inn', 'managerName'] },
	'testViewOrdersServices':{
		'testOrders':['number', 'comments', 'services'],
		'testServices':['name', 'price']
	}
};

//Имитация глобальной переменной с информацией из flexo схем
//сигнатура {schemeName:{read:[fieldsNames], modify:[fieldsNames]}
var globalFlexoSchemes = {
	'testCustomers': {
		read:['name', 'inn', 'managerName'],
		modify:['name', 'inn']
	},
	'testOrders': {
		read: ['number', 'comments', 'services'],
		modify:['number', 'comments', 'services']
	},
	'testServices': {
		read: ['name', 'price'],
		modify:['name', 'price']
	},
	'testUsers': {
		read: ['login', 'role', 'name', 'lastname', 'position', 'company', 'hash', 'salt'],
		modify: ['login', 'role', 'name', 'lastname', 'position', 'company', 'hash', 'salt']
	}
};

//Переменная для хранения экземпляра контролера
var controller;

var testDataForTestAdminFunctionForFlexoAccess = {
	testObjAccessFlexo: {
		read: {
			'(all)': 1,
			'name': 0,
			'inn':0
		},
		modify: {
			'(all)': 1,
			'name': 0,
			'inn':0
		}
	},
	userLogin: generatorString(1,10),
	userRole: generatorString(1,10),
	flexoSchemeName: generatorString(1,20)
};

//Конфиг
configForController = {
	redisConfig: {},
	view:{},
	flexoSchemes:globalFlexoSchemes,
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

exports.adminFunctionForFlexoAccess = {
	saveAccessForUser: function(test){
		test.expect(5);
		var objAccess = testDataForTestAdminFunctionForFlexoAccess.testObjAccessFlexo;
		var login = testDataForTestAdminFunctionForFlexoAccess.userLogin;
		var flexoSchemeName = testDataForTestAdminFunctionForFlexoAccess.flexoSchemeName;

		//Формируем объект запрос на сохранение
		var queryForSave = {
			access:{
				flexoSchemeName: flexoSchemeName,
				login:login,
				objAccess: objAccess
			}
		};

		controller.create(queryForSave, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);

			var queryForRead = {
				access: {
					flexoSchemeName:flexoSchemeName,
					login:login
				}
			};

			controller.find(queryForRead, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);
				var keys = Object.keys(reply);
				test.strictEqual(keys.length, 2, 'Проверка количества типов прав возвращаемых ' +
					'в сохраненных flexo правах на пользователя');
				test.done();
			});
		});

	},
	deleteAccessForUser: function(test){
		test.expect(3);
		var login = testDataForTestAdminFunctionForFlexoAccess.userLogin;
		var flexoSchemeName = testDataForTestAdminFunctionForFlexoAccess.flexoSchemeName;

		//Формируем объект запрос на удаление
		var queryForDelete = {
			access: {
				flexoSchemeName:flexoSchemeName,
				login:login
			}
		};

		controller.delete(queryForDelete, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);

			var queryForRead = {
				access: {
					flexoSchemeName:flexoSchemeName,
					login:login
				}
			};

			controller.find(queryForRead, function( err, reply ) {
				test.ok(err.message, 'No requested object access (user: ' + login +', ' +
					'flexoScheme: ' + flexoSchemeName + ')');
				test.done();
			});
		});
	},
	saveAccessForRole:function(test){
		test.expect(5);
		var objAccess = testDataForTestAdminFunctionForFlexoAccess.testObjAccessFlexo;
		var role = testDataForTestAdminFunctionForFlexoAccess.userRole;
		var flexoSchemeName = testDataForTestAdminFunctionForFlexoAccess.flexoSchemeName;

		//Формируем объект запрос на сохранение
		var queryForSave = {
			access:{
				flexoSchemeName: flexoSchemeName,
				role:role,
				objAccess: objAccess
			}
		};

		controller.create(queryForSave, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);

			var queryForRead = {
				access: {
					flexoSchemeName:flexoSchemeName,
					role:role
				}
			};
			debugger;
			controller.find(queryForRead, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);
				var keys = Object.keys(reply);
				test.strictEqual(keys.length, 2, 'Проверка количества типов прав возвращаемых ' +
					'в сохраненных flexo правах на пользователя');
				test.done();
			});
		});
	},
	deleteAccessForRole:function(test){
		test.expect(3);
		var role = testDataForTestAdminFunctionForFlexoAccess.userRole;
		var flexoSchemeName = testDataForTestAdminFunctionForFlexoAccess.flexoSchemeName;

		//Формируем объект запрос на удаление
		var queryForDelete = {
			access: {
				flexoSchemeName:flexoSchemeName,
				role:role
			}
		};

		controller.delete(queryForDelete, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);

			var queryForRead = {
				access: {
					flexoSchemeName:flexoSchemeName,
					role:role
				}
			};

			controller.find(queryForRead, function( err, reply ) {
				test.ok(err.message, 'No requested object access (role: ' + role +', ' +
					'flexoScheme: ' + flexoSchemeName + ')');
				test.done();
			});
		});
	}
};

//Создаем случайное число в заданных пределах
function getRandom(min, max) {
	return parseInt(Math.random() * (max - min) + min);
}

function generatorString (z , g) {
	var stringLength = getRandom(z,g);
	var str = '';
	for(var i = 0; i < stringLength; i++){
		str = str + charString[getRandom(0,charString.length-1)];
	}
	return str;
}

