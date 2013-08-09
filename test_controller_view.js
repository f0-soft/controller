var redis = require('redis');
var redisConfig = require('./config/config.js').redisConfig;
var Controller = require('./index.js');
var Flexo = require('flexo');
var View = require( 'view' );
var crypto = require('crypto');
var fs = require('fs');

var controller;
var flexo;
//Имитация глобальной переменной с информацией из конфига views
//сигнатура {viewName:[flexoSchemesNames]}
var globalViewsConfig = {'viewCustomers': ['customers']};
//Имитация глобальной переменной с информацией из flexo схем
//сигнатура {schemeName:{read:[fieldsNames], modify:[fieldsNames]}
var globalFlexoSchemes = {
	'customers': {
		read:['name', 'inn', 'managerName', 'tsCreate'],
		modify:['name', 'inn', 'managerName', 'tsCreate']
	}
};
//Инициализация библиотеки flexo
Flexo.init({}, function(err){
	if(err){
		console.log('Error. Ошибка инициализации Flexo');
	} else {
		flexo = Flexo.Collection;
//		console.log(fs.realpathSync('node_modules/view/test.views/viewCustomers'));
//		require('/home/user/source/node_modules/view/test.views/viewCustomers');

		View.init({
			views: { viewCustomers: require('/home/user/test-f0/node_modules/view/test.views/viewCustomers') },
			path: '/home/user/test-f0/node_modules/view/test.templates/'
		}, function( error, result){
			if ( error ) console.log ( error );

			//Инициализация контроллера
			Controller.init( {}, flexo, View, globalViewsConfig, globalFlexoSchemes ,function( err ) {
				if( err ) console.log( err );
			});

			//Создаем экземпляр контроллера
			controller = new Controller.create();

			//Сброс всех прав и информации о пользователях из redis
			var client = redis.createClient();

			client.SMEMBERS( setAllAccess(), function( err, replies ) {
				if ( err ) {
					console.log( err );
				} else {
					//Формируем команды на удаление всех ключей о пользователях и правах на доступ
					var multi = client.multi();
					for ( var i = 0; i < replies.length; i++ ) {
						multi.DEL( replies[i] );
					}
					multi.EXEC( function( err, reply ) {
						if ( err ) {
							console.log( err );
						} else {
							//Удаление завершено запускаем тесты

							//Создание, чтение и модификация данных о пользователе
							test1();
							//Добавление, чтение данных о правах на flexо и view
							test2(function(){

								//Проверяем работу определения пересечения прав
								test3();

							});
						}
					});

				}

			} );

		});
	}
});

//Тестовые запросы для контролера
function test1(){
	//Тест на сохранение информации о пользователе
	var query = {
		user: {
			_id:'1',
			login:'guest',
			pass:getHash('1234567890', '1234567890'),
			role:'admin',
			name:'Alexander',
			lastname:'Razygraev',
			position:'...',
			company:'f0',
			hash:'...',
			salt:'1234567890'
		}
	};

	controller.create( query, function( err, reply ) {
		if( err ) {
			console.log( err );
		} else {
			console.log( 'Тест 1.0 Сохранение данных о пользователе: ' + reply );

			//Чтение сохраненных данных о пользователе по логину
			var query2 = {
				user:{
					login:'guest'
				}
			};

			controller.find( query2, function( err, reply ) {
				if( err ) {
					console.log( err );
				} else {
					console.log( 'Тест 1.1 Поиск данных о пользователе по логину: ' +
						JSON.stringify( reply ) );

					//Чтение сохраненных данных о пользователе по id
					var query3 = {
						user:{
							_id:'1'
						}
					};

					controller.find( query3, function( err, reply ) {
						if( err ) {
							console.log( err );
						} else {
							console.log( 'Тест 1.2 Поиск данных о пользователе по _id: ' +
								JSON.stringify( reply ) );


							//Запрос на модификацию сохраненных данных
							var query4 = {
								user:{
									login:'guest',
									name:'Alex'
								}
							};

							controller.modify( query4, function( err, reply ) {
								if ( err ) {
									console.log( err );
								} else {
									console.log( 'Тест 1.3 Модификация сохраненных данных: ' + reply );

									//Чтение модифицированных данных
									var query5 = {
										user:{
											login:'guest'
										}
									};

									controller.find(query5, function( err, reply ) {
										if( err ) {
											console.log( err );
										} else {
											console.log( 'Тест 1.4 Поиск измененных данных о пользователе по логину: ' +
												JSON.stringify( reply ) );
										}
									});

									//ToDo:Проверить удаление
								}
							} );
						}
					} );
				}
			} );
		}
	});
}

//Добавление, чтение данных о правах на flexо и view
function test2(callback){
	//Объект прав
	var objAccess = {
		roleFlexo:{
			'admin:customers':{ //role:schemeName
				read: {
					'(all)': 1,
					'name': 0
				},
				modify: {
					'(all)': 1,
					'name': 0
				},
				create: {
					'(all)': 1,
					'name': 0
				},
				delete: 0
			}
		},

		//Информация о сужении и расширении прав доступа к flexo документам
		userFlexo:{
			'guest:customers':{ //user:schemeName
				read: {
					'(all)': 1,
					'name': 1,
					'inn':1
				},
				modify: {
					'(all)': 1,
					'name': 1,
					'inn':1
				},
				create: {
					'(all)': 1,
					'name': 1,
					'inn':1
				},
				delete: 1
			}
		},

		//Информация о доступе к view по роли
		roleView:{
			'admin:viewCustomers':{ //role:viewName
				'customers':{ //flexoSchemeName
					read: {
						'(all)': 1,
						'name': 0,
						'inn':0
					},
					modify: {
						'(all)': 1,
						'name': 0,
						'inn':0
					},
					create: {
						'(all)': 1,
						'name': 0,
						'inn':0
					},
					delete: 1
				}
			}
		},

		//Информация о доступе к view по пользователю
		userView:{
			'guest:viewCustomers':{ //user:viewName
				'customers':{ //flexoSchemeName
					read: {
						'(all)': 1
					},
					modify: {
						'(all)': 1
					},
					create: {
						'(all)': 1
					},
					delete: 1
				}
			}

		}
	};

	var query = {
		access:{
			flexoSchemeName: 'customers',
			role:'admin',
			objAccess: objAccess.roleFlexo['admin:customers']
		}
	};

	controller.create(query, function ( err, reply ) {
		if( err ) {
			console.log( err );
		} else {
			console.log( 'Тест 2.0 Сохранение flexo прав по роли: ' + reply );

			//Читаем сохраненные права
			var query2 = {
				access:{
					flexoSchemeName: 'customers',
					role:'admin'
				}
			};

			controller.find(query2, function( err, reply ) {
				if( err ) {
					console.log( err );
				} else {
					console.log( 'Teст 2.1 Читаем сохраненные права flexo по роли: ' + JSON.stringify(reply) );

					//Записываем права flexo по пользователю
					var query3 = {
						access:{
							flexoSchemeName: 'customers',
							login:'guest',
							objAccess: objAccess.userFlexo['guest:customers']
						}
					};

					controller.create(query3, function ( err, reply ) {
						if( err ) {
							console.log( err );
						} else {
							console.log( 'Тест 2.2 Сохранение flexo прав по пользователю: ' + reply );

							//Читаем сохраненные права
							var query4 = {
								access:{
									flexoSchemeName: 'customers',
									login:'guest'
								}
							};

							controller.find(query4, function ( err, reply ) {
								if( err ) {
									console.log( err );
								} else {
									console.log( 'Teст 2.3 Читаем сохраненные права flexo по пользователю: ' + JSON.stringify(reply) );

									//Сохраняем права на view для роли
									var query5 = {
										access:{
											viewName: 'viewCustomers',
											role:'admin',
											objAccess: objAccess.roleView['admin:viewCustomers']
										}
									};

									controller.create( query5, function( err, reply ) {
										if( err ) {
											console.log( err );
										} else {
											console.log( 'Тест 2.4 Сохранение права на view по роли: ' + reply );

											//Читаем сохраненные права
											var query6 = {
												access:{
													viewName: 'viewCustomers',
													role:'admin'
												}
											};

											controller.find( query6, function( err, reply ) {
												if( err ) {
													console.log( err );
												} else {
													console.log( 'Teст 2.5 Читаем сохраненные права на view по роли: ' + JSON.stringify(reply) );

													//Сохраняем права на view по пользователю
													var query7 = {
														access:{
															viewName: 'viewCustomers',
															login:'guest',
															objAccess: objAccess.userView['guest:viewCustomers']
														}
													};

													controller.create( query7, function( err, reply ) {
														if( err ) {
															console.log( err );
														} else {
															console.log( 'Тест 2.6 Сохранение права на view по пользователю: ' + reply );

															//Читаем сохраненные права
															var query8 = {
																access:{
																	viewName: 'viewCustomers',
																	login:'guest'
																}
															};

															controller.find( query8, function(err, reply){
																if( err ) {
																	console.log( err );
																} else {
																	console.log( 'Teст 2.7 Читаем сохраненные права на view по пользователю: ' + JSON.stringify(reply) );
																	callback();
																}
															})

														}
													})

												}
											} );

										}
									} );

								}
							});

						}
					} );

				}
			});


		}
	});


}

//Проверяем работу определения пересечения прав
function test3(){
	//Запрос на шаблон
	var viewName = 'viewCustomers';
	var user = 'guest';
	var role = 'admin';
	var socket = {};


	controller.getTemplate(viewName, user, role, socket, function( err, reply ) {
		if ( err ) {
			console.log( err );
		} else {
			console.log( 'Тест 3.0 Запрос шаблона: ' + reply + ' Объект socket: ' + JSON.stringify(socket.view.viewCustomers.access) );

			//Проверяем проверку прав на чтение
			var type = 'read';
			var request = {
				queries:{
					'customers':{
						selector:{

						},

						options:{
							limit:10
						}
					}
				},
				count: true
			};

			var options = {
				customers:['name', 'inn', 'managerName', 'tsCreate']

			};

			controller.queryToView( type, request, options, viewName, socket, function( err, reply, count ) {
				if ( err ) {
					console.log( err );
				} else {
					console.log( 'Тест 3.1 Запрос на чтение совсеми разрешенными полями: ', reply, ' count: ' + count );
				}

			} );

		}
	} );
}

//Формирование ключа Redis (SET) для множества всех ключей с правами и пользователями
function setAllAccess(){
	return 'all:access:';
}

function getHash (msg, key) {
	msg = msg.toString();
	key = key.toString();
	return crypto.createHmac('sha256', key).update(msg).digest('hex');
}