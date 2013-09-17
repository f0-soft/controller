var _ = require( 'underscore' );
var starter = require( 'f0.starter' );

var configStarter = {
	rabbit: require( 'f0.rabbit' ),
	flexo: require( 'f0.flexo' ),
	view: require( 'f0.view' ),
	controller: require('./../index.js'),

	flexo_path: __dirname + '/scheme/flexoForTestWithView',
	link_path: __dirname + '/scheme/linksForTestWithView',
	view_path: __dirname + '/scheme/viewForTestWithView',
	template_path: __dirname + '/scheme/viewForTestWithView',
	template_timeout: 100,
	controller_role_to_company_view: {},

	redis: {
		host: '127.0.0.1',
		port: 6379
	},

	rabbit_hint: {},
	rabbit_hint_score: {}
};

//Словарь используемый для генерации строк
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

//Имитация глобальной переменной для хранения общих данных о view при view_mock
var testObjGlobalViewsConfig = {
	'testManager': {
		m1:{flexo:['testManager', '_id'], type:'read'},
		m2:{flexo:['testManager', 'tsUpdate'], type:'read'},
		m3:{flexo:['testManager', 'name'], type:'modify'},
		m4:{flexo:['testManager', 'lastName'], type:'modify'},
		m5:{flexo:['testManager', 'name'], type:'create'},
		m6:{flexo:['testManager', 'lastName'], type:'create'},
		m7:{flexo:['testManager'], type:'delete'}
	},
	'testCustomer': {
		cu1:{flexo:['testCustomer', '_id'], type:'read'},
		cu2:{flexo:['testCustomer', 'tsUpdate'], type:'read'},
		cu3:{flexo:['testCustomer', 'name'], type:'modify'},
		cu4:{flexo:['testCustomer', 'manager_id'], type:'modify'},
		cu5:{flexo:['testCustomer', 'name'], type:'create'},
		cu6:{flexo:['testCustomer', 'manager_id'], type:'create'},
		cu7:{flexo:['testCustomer'], type:'delete'}
	},
	'testContract':{
		co1:{flexo:['testContract', '_id'], type:'read'},
		co2:{flexo:['testContract', 'tsUpdate'], type:'read'},
		co3:{flexo:['testContract', 'date'], type:'modify'},
		co4:{flexo:['testContract', 'index'], type:'modify'},
		co5:{flexo:['testContract', 'customer_id'], type:'modify'},
		co6:{flexo:['testContract', 'date'], type:'create'},
		co7:{flexo:['testContract', 'index'], type:'create'},
		co8:{flexo:['testContract', 'customer_id'], type:'create'},
		co9:{flexo:['testContract'], type:'delete'}
	},
	'testManagerCustomer':{
		mcu1:{flexo:['testManager', '_id'], type:'read'},
		mcu2:{flexo:['testManager', 'tsUpdate'], type:'read'},
		mcu3:{flexo:['testManager', 'name'], type:'read'},
		mcu4:{flexo:['testManager', 'lastName'], type:'read'},
		mcu5:{flexo:['testCustomer', '_id'], type:'read'},
		mcu6:{flexo:['testCustomer', 'tsUpdate'], type:'read'},
		mcu7:{flexo:['testCustomer', 'name'], type:'read'},
		mcu8:{flexo:['testCustomer', 'manager_id'], type:'read'}
	},
	'testManagerContract':{
		mco1:{flexo:['testManager', '_id'], type:'read'},
		mco2:{flexo:['testManager', 'tsUpdate'], type:'read'},
		mco3:{flexo:['testManager', 'name'], type:'read'},
		mco4:{flexo:['testManager', 'lastName'], type:'read'},
		mco5:{flexo:['testContract', '_id'], type:'read'},
		mco6:{flexo:['testContract', 'index'], type:'read'},
		mco7:{flexo:['testContract', 'customer_id'], type:'read'}
	}
};

//Имитация глобальной переменной с информацией из flexo схем при использовании view_mock
//сигнатура {schemeName:{read:[fieldsNames], modify:[fieldsNames]}
var globalFlexoSchemes = {
	'testManager': {
		read: ['_id', 'tsUpdate', 'name', 'lastName'],
		modify: ['name', 'lastName'],
		readForAdminPanel:[],
		modifyForAdminPanel:[]
	},
	'testCustomer': {
		read: ['_id', 'tsUpdate', 'name', 'manager_id'],
		modify: ['name', 'manager_id'],
		readForAdminPanel:[],
		modifyForAdminPanel:[]
	},
	'testContract':{
		read: ['_id', 'tsUpdate', 'date', 'index', 'customer_id'],
		modify: ['name', 'manager_id'],
		readForAdminPanel:[],
		modifyForAdminPanel:[]
	}
};

var controller; //Переменная для хранения контролера

//Тестирование инициализации контроллера и view
exports.testInit = {
	//Инициализация view
	starter: function(test){
		test.expect( 2 );

		starter.init( configStarter, function( err, module ) {
			test.ifError( err );

			test.ok( module );

			controller = module;

			test.done();
		} );
	}
};

//Объект с описанием автора запроса (от кого и от куда запрос)
var sender = {
	login: generatorString(1,10),
	role: generatorString(1,10),
	userId: generatorString(1,10),
	place: 'nodeunit_test_with_view'
};

//Создаем права на flexo
exports.saveAccess = {
	flexoAccess:function(test){
		test.expect( 6 );
		//Объект прав для flexo по роли (все разрешено)
		var objAccessForRole = {
			read: {
				'(all)':1,
				'fields':[]
			},
			modify: {
				'(all)':1,
					'fields':[]
			},
			create: {
				'(all)':1,
					'fields':[]
			},
			createAll: 1,
			delete: 1
		};

		//Формируем запрос на сохранение прав по поли для flexo схемы
		var queryForSave = {
			access:{
				flexoSchemeName: 'testManager',
				role:sender.role,
				objAccess: objAccessForRole
			}
		};

		controller.create(queryForSave, sender, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);

			//Формируем запрос на сохранение прав по поли для flexo схемы
			var queryForSave = {
				access:{
					flexoSchemeName: 'testCustomer',
					role:sender.role,
					objAccess: objAccessForRole
				}
			};

			controller.create(queryForSave, sender, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);

				//Формируем запрос на сохранение прав по поли для flexo схемы
				var queryForSave = {
					access:{
						flexoSchemeName: 'testContract',
						role:sender.role,
						objAccess: objAccessForRole
					}
				};

				controller.create(queryForSave, sender, function( err, reply ) {
					test.ifError(err);
					test.ok(reply);
					test.done();
				});
			});
		});
	},
	viewAccess:function(test){
		test.expect( 10 );
		//Объект с правами для view по роли (без сужения по id)
		var objAccess = {
			'(all)':1,
			'viewIds':[],
			'(useId)':0
		};

		//Формируем объект запрос на сохранение прав
		var queryForSave = {
			access:{
				viewName: 'testManager',
				role: sender.role,
				objAccess: objAccess
			}
		};

		controller.create(queryForSave, sender, function( err, reply ) {
			test.ifError(err);
			test.ok(reply);

			//Формируем объект запрос на сохранение прав
			var queryForSave = {
				access:{
					viewName: 'testCustomer',
					role: sender.role,
					objAccess: objAccess
				}
			};

			controller.create(queryForSave, sender, function( err, reply ) {
				test.ifError(err);
				test.ok(reply);

				//Формируем объект запрос на сохранение прав
				var queryForSave = {
					access:{
						viewName: 'testContract',
						role: sender.role,
						objAccess: objAccess
					}
				};

				controller.create(queryForSave, sender, function( err, reply ) {
					test.ifError(err);
					test.ok(reply);

					//Формируем объект запрос на сохранение прав
					var queryForSave = {
						access:{
							viewName: 'testManagerCustomer',
							role: sender.role,
							objAccess: objAccess
						}
					};

					controller.create(queryForSave, sender, function( err, reply ) {
						test.ifError(err);
						test.ok(reply);

						//Формируем объект запрос на сохранение прав
						var queryForSave = {
							access:{
								viewName: 'testManagerContract',
								role: sender.role,
								objAccess: objAccess
							}
						};

						controller.create(queryForSave, sender, function( err, reply ) {
							test.ifError(err);
							test.ok(reply);

							test.done();
						});
					});
				});
			});
		});
	}
};

//Объект буфер для теста w
var buffer = {
	obj:[],
	socketForViewTestManager:{}
};

//Запросы к view
exports.queryToViewCreateAndFind = {
	createTwoManagersAndReadSecondManager: function(test) {
		test.expect( 15 );

		var viewName = 'testManager';
		var socket = {};
		debugger
		controller.getTemplate( viewName, sender, socket, function( error, config, template ) {
			test.ifError(error);
			test.ok(config);
			test.strictEqual(template, '', 'Проверка отсутствия шаблона');

			//Формируем запрос на создание двух менеджеров
			var queryToCreate = [
				{m5:generatorString(1,20), m6: generatorString(1,20)},
				{m5:generatorString(1,20), m6: generatorString(1,20)}
			];

			buffer.obj.push( { managers: queryToCreate[0] } );
			buffer.obj.push( { managers: queryToCreate[1] } );
			buffer.socketForViewTestManager = socket;
			controller.queryToView ( 'create', sender, queryToCreate, viewName, socket,
				function(error, documents ){
					test.ifError(error);

					test.strictEqual(documents.length, 2,
						'Проверяем количество возвращенных документов view');

					for( var i = 0; i < documents.length; i++ ) {
						test.ok(documents[i]['m1']);
						test.ok(documents[i]['m2']);
						buffer.obj[i].managers['m1'] = documents[i]['m1'];
						buffer.obj[i].managers['m2'] = documents[i]['m2'];
					}

					//Формируем запрос на чтение по name
					var request = { selector: {'testManager':{ m3:buffer.obj[1].managers['m5']} } };

					controller.queryToView ( 'read', sender, request, viewName, socket,
						function(error, documents, count) {
						test.ifError(error);
						test.strictEqual(documents.length, 1,
							'Проверяем количество возвращенных документов view');

						test.strictEqual(documents[0]['m1'], buffer.obj[1].managers['m1'],
							'Проверяем тот ли монагер возвращен');
						test.strictEqual(documents[0]['m2'], buffer.obj[1].managers['m2'],
							'Проверяем тот ли монагер возвращен');
						test.strictEqual(documents[0]['m3'], buffer.obj[1].managers['m5'],
							'Проверяем тот ли монагер возвращен');
						test.strictEqual(documents[0]['m4'], buffer.obj[1].managers['m6'],
							'Проверяем тот ли монагер возвращен');

						test.done();
					});
			});
		});
	},
	createTwoCustomersAndReadFirstCustomer: function(test) {
		test.expect( 15 );

		var viewName = 'testCustomer';
		var socket = {};

		controller.getTemplate( viewName, sender, socket, function( error, config, template ) {
			test.ifError(error);
			test.ok(config);
			test.strictEqual(template, '', 'Проверка отсутствия шаблона');

			//Формируем запрос на создание двух заказчиков
			var queryToCreate = [
				{cu5:generatorString(1,20), cu6: buffer.obj[0].managers['m1']},
				{cu5:generatorString(1,20), cu6: buffer.obj[1].managers['m1']}
			];

			buffer.obj[0].customers = queryToCreate[0];
			buffer.obj[1].customers = queryToCreate[1];

			controller.queryToView ( 'create', sender, queryToCreate, viewName, socket,
				function(error, documents ){
					test.ifError(error);

					test.strictEqual(documents.length, 2,
						'Проверяем количество возвращенных документов view');

					for( var i = 0; i < documents.length; i++ ) {
						test.ok(documents[i]['cu1']);
						test.ok(documents[i]['cu2']);
						buffer.obj[i].customers['cu1'] = documents[i]['cu1'];
						buffer.obj[i].customers['cu2'] = documents[i]['cu2'];
					}

					//Формируем запрос на чтение по name
					var request = { selector: { 'testCustomer':{cu3:buffer.obj[0].customers['cu5']} } };

					controller.queryToView ( 'read', sender, request, viewName, socket,
						function(error, documents, count) {
							test.ifError(error);
							test.strictEqual(documents.length, 1,
								'Проверяем количество возвращенных документов view');

							test.strictEqual(documents[0]['cu1'], buffer.obj[0].customers['cu1'],
								'Проверяем тот ли заказчик возвращен');
							test.strictEqual(documents[0]['cu2'], buffer.obj[0].customers['cu2'],
								'Проверяем тот ли заказчик возвращен');
							test.strictEqual(documents[0]['cu3'], buffer.obj[0].customers['cu5'],
								'Проверяем тот ли заказчик возвращен');
							test.strictEqual(documents[0]['cu4'], buffer.obj[0].customers['cu6'],
								'Проверяем тот ли заказчик возвращен');

							test.done();
						});

				});
		});
	},
	createTwoContractsAndReadFirstContract:function(test){
		test.expect( 16 );

		var viewName = 'testContract';
		var socket = {};

		controller.getTemplate( viewName, sender, socket, function( error, config, template ) {
			test.ifError(error);
			test.ok(config);
			test.strictEqual(template, '', 'Проверка отсутствия шаблона');

			//Формируем запрос на создание двух заказчиков
			var queryToCreate = [
				{co6:getRandom(1,100000), co7: generatorString(1,20), co8:buffer.obj[0].customers['cu1']},
				{co6:getRandom(1,100000), co7: generatorString(1,20), co8:buffer.obj[1].customers['cu1']}
			];

			buffer.obj[0].contracts = queryToCreate[0];
			buffer.obj[1].contracts = queryToCreate[1];

			controller.queryToView ( 'create', sender, queryToCreate, viewName, socket,
				function(error, documents ){
					test.ifError(error);

					test.strictEqual(documents.length, 2,
						'Проверяем количество возвращенных документов view');

					for( var i = 0; i < documents.length; i++ ) {
						test.ok(documents[i]['co1']);
						test.ok(documents[i]['co2']);
						buffer.obj[i].contracts['co1'] = documents[i]['co1'];
						buffer.obj[i].contracts['co2'] = documents[i]['co2'];
					}

					//Формируем запрос на чтение по date
					var request = { selector: {'testContract':{ co3:buffer.obj[0].contracts['co6'] }} };

					controller.queryToView ( 'read', sender, request, viewName, socket,
						function(error, documents, count) {
							test.ifError(error);
							test.strictEqual(documents.length, 1,
								'Проверяем количество возвращенных документов view');

							test.strictEqual(documents[0]['co1'], buffer.obj[0].contracts['co1'],
								'Проверяем тот ли контракт возвращен');
							test.strictEqual(documents[0]['co2'], buffer.obj[0].contracts['co2'],
								'Проверяем тот ли контракт возвращен');
							test.strictEqual(documents[0]['co3'], buffer.obj[0].contracts['co6'],
								'Проверяем тот ли контракт возвращен');
							test.strictEqual(documents[0]['co4'], buffer.obj[0].contracts['co7'],
								'Проверяем тот ли контракт возвращен');
							test.strictEqual(documents[0]['co5'], buffer.obj[0].contracts['co8'],
								'Проверяем тот ли контракт возвращен');
							test.done();
						});

				});
		});
	},
	readOneCustomerWithJoinManager:function(test){
		test.expect( 12 );

		var viewName = 'testManagerCustomer';
		var socket = {};

		controller.getTemplate( viewName, sender, socket, function( error, config, template ) {
			test.ifError(error);
			test.ok(config);
			test.strictEqual(template, '', 'Проверка отсутствия шаблона');

			//Формируем запрос на чтение по _id manager
			var request = { selector: {'testManagerCustomer':{ mcu5:buffer.obj[0].customers['cu1'] } } };

			controller.queryToView ( 'read', sender, request, viewName, socket,
				function(error, documents, count) {
					test.ifError(error);
					test.strictEqual(documents.length, 1,
						'Проверяем количество возвращенных документов view');

					test.strictEqual(documents[0]['mcu1'], buffer.obj[0].managers['m1'],
						'Проверяем тот ли монагер возвращен');
					test.strictEqual(documents[0]['mcu2'], buffer.obj[0].managers['m2'],
						'Проверяем тот ли монагер возвращен');
					test.strictEqual(documents[0]['mcu3'], buffer.obj[0].managers['m5'],
						'Проверяем тот ли монагер возвращен');
					test.strictEqual(documents[0]['mcu4'], buffer.obj[0].managers['m6'],
						'Проверяем тот ли монагер возвращен');
					test.strictEqual(documents[0]['mcu5'], buffer.obj[0].customers['cu1'],
						'Проверяем тот ли заказчик возвращен');
					test.strictEqual(documents[0]['mcu6'], buffer.obj[0].customers['cu2'],
						'Проверяем тот ли заказчик возвращен');
					test.strictEqual(documents[0]['mcu7'], buffer.obj[0].customers['cu5'],
						'Проверяем тот ли заказчик возвращен');
					test.done();
				});

		});
	},
	readOneContractWithJoinManager:function(test){
		test.expect( 12 );

		var viewName = 'testManagerContract';
		var socket = {};

		controller.getTemplate( viewName, sender, socket, function( error, config, template ) {
			test.ifError(error);
			test.ok(config);
			test.strictEqual(template, '', 'Проверка отсутствия шаблона');

			//Формируем запрос на чтение по _id manager
			var request = { selector: {'testManagerContract':{ mco5:buffer.obj[0].contracts['co1']} } };

			controller.queryToView ( 'read', sender, request, viewName, socket,
				function(error, documents, count) {
					test.ifError(error);
					test.strictEqual(documents.length, 1,
						'Проверяем количество возвращенных документов view');

					test.strictEqual(documents[0]['mco1'][0], buffer.obj[0].managers['m1'],
						'Проверяем тот ли монагер возвращен');
					test.strictEqual(documents[0]['mco2'][0], buffer.obj[0].managers['m2'],
						'Проверяем тот ли монагер возвращен');
					test.strictEqual(documents[0]['mco3'][0], buffer.obj[0].managers['m5'],
						'Проверяем тот ли монагер возвращен');
					test.strictEqual(documents[0]['mco4'][0], buffer.obj[0].managers['m6'],
						'Проверяем тот ли монагер возвращен');
					test.strictEqual(documents[0]['mco5'], buffer.obj[0].contracts['co1'],
						'Проверяем тот ли контракт возвращен');
					test.strictEqual(documents[0]['mco6'], buffer.obj[0].contracts['co7'],
						'Проверяем тот ли контракт возвращен');
					test.strictEqual(documents[0]['mco7'], buffer.obj[0].contracts['co8'],
						'Проверяем тот ли контракт возвращен');
					test.done();
				});
		});
	}
};

exports.queryToViewWithRestriction = {
	saveAccess: function( test ){
		test.expect( 2 );
		//Объект с правами для view по роли (без сужения по id)
		var objAccess = {
			'(all)':1,
			'viewIds':[],
			'(useId)':1
		};

		//Формируем объект запрос на сохранение прав
		var queryForSave = {
			access:{
				viewName: 'testCustomer',
				role: sender.role,
				objAccess: objAccess
			}
		};

		controller.create(queryForSave, sender, function( error, reply ) {
			test.ifError(error);
			test.ok(reply);

			test.done();
		});
	},
	readCustomerWithRestrictionOnManager_id:function(test) {
		test.expect( 9 );
		debugger
		var senderForQuery = _.clone(sender);
		senderForQuery.userId = buffer.obj[0].managers['m1'];
		var viewName = 'testCustomer';
		var socket = {};

		controller.getTemplate( viewName, sender, socket, function( error, config, template ) {
			test.ifError(error);
			test.ok(config);
			test.strictEqual(template, '', 'Проверка отсутствия шаблона');

			//Формируем запрос на чтение
			var request = { selector: { testCustomer:{} } };

			controller.queryToView ( 'read', sender, request, viewName, socket,
				function(error, documents, count) {
					test.ifError(error);
					test.strictEqual(documents.length, 1,
						'Проверяем количество возвращенных документов view');

					test.strictEqual(documents[0]['cu1'], buffer.obj[0].customers['cu1'],
						'Проверяем тот ли монагер возвращен');
					test.strictEqual(documents[0]['cu2'], buffer.obj[0].customers['cu2'],
						'Проверяем тот ли монагер возвращен');
					test.strictEqual(documents[0]['cu3'], buffer.obj[0].customers['cu5'],
						'Проверяем тот ли монагер возвращен');
					test.strictEqual(documents[0]['cu4'], buffer.obj[0].customers['cu6'],
						'Проверяем тот ли монагер возвращен');

					test.done();
				});
		});

	}
};

exports.queryToViewModifyAndDelete = {
	modifyTwoManagersAndReadSecondManager:function(test){
		test.expect( 12 );

		var socket = buffer.socketForViewTestManager;
		var viewName = 'testManager';

		buffer.obj[0].managers['m3'] = generatorString(1,20);
		buffer.obj[1].managers['m3'] = generatorString(1,20);

		//Формируем запрос на модификацию
		var request = [
			{
				selector:{ m1:buffer.obj[0].managers['m1'], m2:buffer.obj[0].managers['m2'] },
			    properties:{  m3:buffer.obj[0].managers['m3'] }
			}, {
				selector:{ m1:buffer.obj[1].managers['m1'], m2:buffer.obj[1].managers['m2']	},
				properties:{  m3:buffer.obj[1].managers['m3']  }
			}
		];

		controller.queryToView ( 'modify', sender, request, viewName, socket,
			function(error, documents) {
				test.ifError(error);
				test.strictEqual(documents.length, 2,
					'Проверяем количество возвращенных документов view');

				for( var i = 0; i < documents.length; i++ ) {
					test.ok(documents[i]['m1']);
					test.ok(documents[i]['m2']);
					buffer.obj[i].managers['m1'] = documents[i]['m1'];
					buffer.obj[i].managers['m2'] = documents[i]['m2'];
				}

				//Формируем запрос на чтение одного менеджера
				//Формируем запрос на чтение
				var request = { selector: { testManager:{m3:buffer.obj[1].managers['m3']} } };

				controller.queryToView ( 'read', sender, request, viewName, socket,
					function(error, documents, count) {
						test.ifError(error);
						test.strictEqual(documents.length, 1,
							'Проверяем количество возвращенных документов view');
						console.log(documents[0]['m2']);
						test.strictEqual(documents[0]['m1'], buffer.obj[1].managers['m1'],
							'Проверяем тот ли монагер возвращен');
						test.strictEqual(documents[0]['m2'], buffer.obj[1].managers['m2'],
							'Проверяем тот ли монагер возвращен');
						test.strictEqual(documents[0]['m3'], buffer.obj[1].managers['m3'],
							'Проверяем тот ли монагер возвращен');
						test.strictEqual(documents[0]['m4'], buffer.obj[1].managers['m6'],
							'Проверяем тот ли монагер возвращен');

						test.done();
					});
			});

	},
	deleteAndReadFirstManager:function(test){
		test.expect( 5 );

		var socket = buffer.socketForViewTestManager;
		var viewName = 'testManager';

		//Формируем запрос на удаление
		var request = [
			{	m1:buffer.obj[0].managers['m1'], m2:buffer.obj[0].managers['m2'] }
		];

		controller.queryToView ( 'delete', sender, request, viewName, socket,
			function(error, documents) {
				test.ifError(error);
				test.strictEqual(documents.length, 1,
					'Проверяем количество возвращенных документов view');

				for( var i = 0; i < documents.length; i++ ) {
					test.ok(documents[i]['m1']);
				}

				//Формируем запрос на чтение
				var request = { selector: { testManager:{m1:buffer.obj[0].managers['m1']} } };

				controller.queryToView ( 'read', sender, request, viewName, socket,
					function(error, documents, count) {
						test.ifError(error);
						test.strictEqual(documents.length, 0,
							'Проверяем количество возвращенных документов view');

						test.done();
					});
			});

	}
};

//Создаем случайное число в заданных пределах
function getRandom(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

//Генерирует строку
function generatorString (z , g) {
	var stringLength = getRandom(z,g);
	var str = '';
	for(var i = 0; i < stringLength; i++){
		str = str + charString[getRandom(0,charString.length-1)];
	}

	return str;
}