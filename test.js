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

//Конфиг
configForController = {
	redisConfig: {},
	view:{},
	flexoSchemes:globalFlexoSchemes,
	viewConfig:{},
};

exports.init = function (test) {
	test.expect( 6 );
	Controller.init( configForController, function( err, reply ) {
		test.ifError(err);
		test.ok(reply);
		test.ok(Controller.create);
		test.ok(Controller.find);
		test.ok(Controller.delete);
		test.ok(Controller.modify);
		controller = Controller;
		test.done();
	} );
};

var testData1 = {
	testObjAccessFlexo: {
		read: {
			'managerName': getRandom(0,1),
			'name': getRandom(0,1),
			'inn':getRandom(0,1)
		},
		modify: {
			'managerName': getRandom(0,1),
			'name': getRandom(0,1),
			'inn':getRandom(0,1)
		},
		create: {},
		createAll: getRandom(0,1),
		delete: getRandom(0,1)
	},
	userLogin: generatorString(1,10),
	userRole: generatorString(1,10),
	flexoSchemeName: generatorString(1,20)
};

exports.adminFunctionForFlexoAccess = {
	saveAccessForUser: function(test){
		test.expect(13);
		var objAccess = testData1.testObjAccessFlexo;
		var login = testData1.userLogin;
		var flexoSchemeName = testData1.flexoSchemeName;

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
				test.strictEqual(keys.length, 5, 'Проверка количества типов прав возвращаемых ' +
					'в сохраненных flexo правах на пользователя');
				test.strictEqual(reply.read.managerName, testData1.testObjAccessFlexo.read.managerName,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.read.name, testData1.testObjAccessFlexo.read.name,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.read.inn, testData1.testObjAccessFlexo.read.inn,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.modify.managerName,
					testData1.testObjAccessFlexo.modify.managerName,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.modify.name, testData1.testObjAccessFlexo.modify.name,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.modify.inn, testData1.testObjAccessFlexo.modify.inn,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.createAll, testData1.testObjAccessFlexo.createAll,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.delete, testData1.testObjAccessFlexo.delete,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.done();
			});
		});

	},
	deleteAccessForUser: function(test){
		test.expect(3);
		var login = testData1.userLogin;
		var flexoSchemeName = testData1.flexoSchemeName;

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
		test.expect(13);
		var objAccess = testData1.testObjAccessFlexo;
		var role = testData1.userRole;
		var flexoSchemeName = testData1.flexoSchemeName;

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

			controller.find(queryForRead, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);
				var keys = Object.keys(reply);
				test.strictEqual(keys.length, 5, 'Проверка количества типов прав возвращаемых ' +
					'в сохраненных flexo правах по пользователя');
				test.strictEqual(reply.read.managerName, testData1.testObjAccessFlexo.read.managerName,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.read.name, testData1.testObjAccessFlexo.read.name,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.read.inn, testData1.testObjAccessFlexo.read.inn,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.modify.managerName,
					testData1.testObjAccessFlexo.modify.managerName,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.modify.name, testData1.testObjAccessFlexo.modify.name,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.modify.inn, testData1.testObjAccessFlexo.modify.inn,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.createAll, testData1.testObjAccessFlexo.createAll,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.strictEqual(reply.delete, testData1.testObjAccessFlexo.delete,
					'Проверка получили ли мы тот же объект, что сохранили');
				test.done();
			});
		});
	},
	deleteAccessForRole:function(test){
		test.expect(3);
		var role = testData1.userRole;
		var flexoSchemeName = testData1.flexoSchemeName;

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

var testData2 = {
	userLogin: generatorString(1,10),
	userRole: generatorString(1,10),
	viewName: generatorString(1,20)
};

exports.adminFunctionForViewAccess = {
	saveAccessForUser: function(test){
		//Генерируем объект прав
		var objAccess = {};
		var count = getRandom(1, 100);
		for( var i = 0; i < count; i++ ) {
			objAccess[i] = getRandom(0,1);
		}

		test.expect((count+5));

		var login = testData2.userLogin;
		var viewName = testData2.viewName;

		//Формируем объект запрос на сохранение
		var queryForSave = {
			access:{
				viewName: viewName,
				login: login,
				objAccess: objAccess
			}
		};

		controller.create(queryForSave, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);

			var queryForRead = {
				access: {
					viewName: viewName,
					login: login
				}
			};

			controller.find(queryForRead, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);
				var keys = Object.keys(reply);
				test.strictEqual(keys.length, count, 'Проверка количества типов прав возвращаемых ' +
					'в сохраненных flexo правах по пользователя');
				for( var i = 0; i < count; i++ ) {
					test.strictEqual(reply[i], objAccess[i],
						'Проверка получили ли мы тот же объект, что сохранили');
				}
				test.done();
			});
		});

	},
	deleteAccessForUser: function(test){
		test.expect(3);
		var login = testData2.userLogin;
		var viewName = testData2.viewName;

		//Формируем объект запрос на удаление
		var queryForDelete = {
			access: {
				viewName:viewName,
				login:login
			}
		};

		controller.delete(queryForDelete, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);

			var queryForRead = {
				access: {
					viewName:viewName,
					login:login
				}
			};

			controller.find(queryForRead, function( err, reply ) {
				test.ok(err.message, 'No requested object access (user: ' + login +', ' +
					'viewName: ' + viewName + ')');
				test.done();
			});
		});
	},
	saveAccessForRole: function(test){
		//Генерируем объект прав
		var objAccess = {};
		var count = getRandom(1, 100);
		for( var i = 0; i < count; i++ ) {
			objAccess[i] = getRandom(0,1);
		}

		test.expect((count+5));

		var role = testData2.userRole;
		var viewName = testData2.viewName;

		//Формируем объект запрос на сохранение
		var queryForSave = {
			access:{
				viewName: viewName,
				role: role,
				objAccess: objAccess
			}
		};

		controller.create(queryForSave, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);

			var queryForRead = {
				access: {
					viewName: viewName,
					role: role
				}
			};

			controller.find(queryForRead, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);
				var keys = Object.keys(reply);
				test.strictEqual(keys.length, count, 'Проверка количества типов прав возвращаемых ' +
					'в сохраненных flexo правах по пользователя');
				for( var i = 0; i < count; i++ ) {
					test.strictEqual(reply[i], objAccess[i],
						'Проверка получили ли мы тот же объект, что сохранили');
				}
				test.done();
			});
		});

	},
	deleteAccessForRole: function(test){
		test.expect(3);
		var role = testData2.userRole;
		var viewName = testData2.viewName;

		//Формируем объект запрос на удаление
		var queryForDelete = {
			access: {
				viewName:viewName,
				role:role
			}
		};

		controller.delete(queryForDelete, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);

			var queryForRead = {
				access: {
					viewName:viewName,
					role:role
				}
			};

			controller.find(queryForRead, function( err, reply ) {
				test.ok(err.message, 'No requested object access (role: ' + role +', ' +
					'viewName: ' + viewName + ')');
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

