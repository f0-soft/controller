var redis = require('redis');
var redisConfig = require('./config/config.js').redisConfig;
var mock = require('./config/config.js').mock;
var Controller = require('./index.js');
var crypto = require('crypto');

var controller;
var configForController = {};
configForController.redisConfig = redisConfig;

//Имитация глобальной переменной с информацией из конфига views
var globalViewsConfig = {
	'viewCustomers': { 'customers':['name', 'inn', 'managerName', 'tsCreate'] },
	'viewOrdersServices':{
		'orders':['number', 'comments', 'services'],
		'services':['name', 'price']
	},
	'viewUsers':{users:['login', 'role', 'name', 'lastname', 'position', 'company', 'hash', 'salt']}
};
configForController.viewConfig = globalViewsConfig;
//Имитация глобальной переменной с информацией из flexo схем
//сигнатура {schemeName:{read:[fieldsNames], modify:[fieldsNames]}
var globalFlexoSchemes = {
	'customers': {
		read:['name', 'inn', 'managerName', 'tsCreate'],
		modify:['name', 'inn', 'managerName', 'tsCreate']
	},
	'orders': {
		read: ['number', 'comments', 'services'],
		modify:['number', 'comments', 'services']
	},
	'services': {
		read: ['name', 'price'],
		modify:['name', 'price']
	},
	'users': {
		read: ['login', 'role', 'name', 'lastname', 'position', 'company', 'hash', 'salt'],
		modify: ['login', 'role', 'name', 'lastname', 'position', 'company', 'hash', 'salt']
	}
};

configForController.flexoSchemes = globalFlexoSchemes;

var menuConfig = {
	main:{
		sTitle:'Главная',
		div:'main'
	},
	sales:{
		sTitle:'Продажи',
		submenu:{
			customers:{
				sTitle:'Клиенты',
				div:'customer'
			},
			orders:{
				sTitle:'Заказы',
				submenu:{
					contracts:{
						sTitle:'Договора',
						div:'contracts'
					},
					accounts:{
						sTitle:'Счета',
						div:'accounts',
						submenu:{
							addaccounts:{
								sTitle:'Выставить счет',
								div:'addaccounts'
							},
							removeaccounts:{
								sTitle:'Аннулировать счет',
								div:'addaccounts'
							}
						}
					},
					payments:{
						sTitle:'Оплаты',
						div:'payments'
					}
				}
			}
		}
	},
	about:{
		sTitle:'Справка',
		div:'about'
	}
};

configForController.menuConfig = menuConfig;

if(mock.view ){
	var viewConfig = {dependent:'services'};
	var View = require( './mock/view_mock.js' );
} else {
	var viewConfig = require('./config/viewConfig.js').viewConfig;
	var View = require( 'f0.view' );
}

var counter = 0;

//Инициализация view и контроллера
View.init(viewConfig, function( err ){
	if(err){
		console.log('Error. Ошибка инициализации View');
	} else {
		if( mock.view ){
			configForController.view = View.view_mock;
		} else {
			configForController.view = View;
		}
		configForController.formConfig = {};
		Controller.init(configForController, function( err ) {
				if( err ) {
					console.log( err );
				} else {
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
								}
							});

						}

					} );
				}
			});
	}
});

//Тестовые запросы для контролера
function test1(){
	//Тест на сохранение информации о пользователе
	var query = {
		user:{
			queries:{
				'users':{
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
			}
		}
	};

	controller.create( query, function( err, reply ) {
		if( err ) {
			console.log( 'Error: Тест 1.0 Сохранение данных о пользователе ' + err.message );
		} else {
			if (reply){
				console.log( '✓ Тест 1.0 Сохранение данных о пользователе.' );
				counter++;
			} else {
				console.log( '× Тест 1.0 Сохранение данных о пользователе.' );
			}
			//Чтение сохраненных данных о пользователе по логину
			var query2 = {
				user:{
					login:'guest'
				}
			};

			controller.find( query2, function( err, reply ) {
				if( err ) {
					console.log( 'Error: Тест 1.1 Поиск данных о пользователе по логину:' +
						err.message );
				} else {
					if (reply['users'][0].name) {
						console.log( '✓ Тест 1.1 Поиск данных о пользователе по логину.' );
						counter++;
					} else {
						console.log( '× Тест 1.1 Поиск данных о пользователе по логину.' );
					}
					//Чтение сохраненных данных о пользователе по id
					var query3 = {
						user:{
							_id:reply['users'][0]._id
						}
					};

					controller.find( query3, function( err, reply ) {
						if( err ) {
							console.log( 'Error: Тест 1.2 Поиск данных о пользователе по _id: ' +
								err.message );
						} else {
							if (reply['users'][0].name) {
								console.log( '✓ Тест 1.2 Поиск данных о пользователе по _id.' );
								counter++;
							} else {
								console.log( '× Тест 1.2 Поиск данных о пользователе по _id.' );
							}

							//Запрос на модификацию сохраненных данных
							var query4 = {
								user:{
									queries:{
										'users':{
											selector:{
												_id:reply['users'][0]._id
											},
											properties:{
												login:'guest',
												name:'Alex'
											}
										}

									}

								}
							};

							controller.modify( query4, function( err, reply ) {
								if ( err ) {
									console.log( 'Error: Тест 1.3 Модификация сохраненных данных: '
										+ err.message );
								} else {
									if (reply){
										console.log( '✓ Тест 1.3 Модификация сохраненных данных.' );
										counter++;
									} else {
										console.log( '× Тест 1.3 Модификация сохраненных данных.' );
									}
									//Чтение модифицированных данных
									var query5 = {
										user:{
											login:'guest'
										}
									};

									controller.find(query5, function( err, reply ) {
										if( err ) {
											console.log( 'Error: Тест 1.4 Поиск измененных данных ' +
												'о пользователе по логину: ' +  err.message );
										} else {
											if (reply['users'][0].name === 'Alex') {
												console.log( '✓ Тест 1.4 Поиск измененных данных ' +
													'о пользователе по логину.' );
												counter++;

												if( mock.flexo ){
													test2();
												} else {
													test1_2();
												}
											} else {
												console.log( '× Тест 1.4 Поиск измененных данных ' +
													'о пользователе по логину.' );
											}
										}
									});

								}
							} );
						}
					} );
				}
			} );
		}
	});
}

function test1_2(){
	//Тест на сохранение информации о пользователе
	var rand = getHash('1234567890', '1234567890');

	var query = {
		user:{
			queries:{
				'users':{
					login:'sasha',
					pass:getHash('1234567890', '1234567890'),
					role:'admin',
					name:'Alexander',
					lastname:'Razygraev',
					position:'...',
					company:'f0',
					hash: rand,
					salt:'1234567890'
				}
			}
		}
	};

	controller.create( query, function( err, reply ) {
		if( err ) {
			console.log( 'Error: Тест 1.5 Сохранение данных о пользователе ' + err.message );
		} else {
			if (reply['users'][0]._id){
				console.log( '✓ Тест 1.5 Сохранение данных о пользователе.' );
				counter++;

				//Проверяем сложный поиск
				var query2 = {
					user:{
						queries:{
							'users':{
								selector:{
									_id: reply['users'][0]._id
								}
							}
						}
					}
				};

				controller.find( query2, function( err, reply ) {
					if( err ) {
						console.log( 'Error: Тест 1.6 Сложный поиск данных о пользователе по полю _id:' +
							err.message );
					} else {
						if (reply['users'][0].login === 'sasha') {
							console.log( '✓ Тест 1.6 Сложный поиск о пользователе по полю _id.' );
							counter++;

							//Проверяем модификацию
							var query3 = {
								user:{
									queries:{
										'users':{
											selector:{
												_id:reply['users'][0]._id
											},
											properties:{
												position:'IT department'
											}
										}
									}
								}
							};

							controller.modify(query3, function( err, reply ) {
								if( err ) {
									console.log( 'Error: Тест 1.7 Модификация данных о пользователе:' +
										err.message );
								} else {
									if (reply['users'][0]._id) {
										console.log( '✓ Тест 1.7 Модификация данных о ' +
											'пользователе.' );
										counter++;

										//Проверка модификации данных
										var query4 = {
											user:{
												queries:{
													'users':{
														selector:{
															_id:reply['users'][0]._id
														}
													}
												}
											}
										};

										controller.find(query4, function( err, reply){
											if( err ) {
												console.log( 'Error: Тест 1.8 Чтение ' +
													'модифицированных данных из flexo:' +
													err.message );
											} else {
												if (reply['users'][0].position ===
													'IT department') {
													console.log( '✓ Тест 1.8 Чтение ' +
														'модифицированных данных из flexo.' );
													counter++;
													test1_3(reply['users'][0]._id);
												} else {
													console.log( '× Тест 1.8 Чтение ' +
														'модифицированных данных из flexo.' );
												}
											}
										});

									} else {
										console.log( '× Тест 1.7 Модификация данных о пользователе.' );
									}
								}
							});


						} else {
							console.log( '× Тест 1.6 Сложный поиск о пользователе по _id.' );
						}
					}
				});

			} else {
				console.log( '× Тест 1.5 Сохранение данных о пользователе.' );
			}

		}
	});

}

function test1_3(_id){
	//Проверка модификации данных
	var query = {
		user:{
			_id:_id
		}
	};

	controller.find(query, function( err, reply){
		if( err ) {
			console.log( 'Error: Тест 1.9 Чтение ' +
				'модифицированных данных из redis:' +
				err.message );
		} else {
			if (reply['users'][0].position === 'IT department') {
				console.log( '✓ Тест 1.9 Чтение ' +
					'модифицированных данных из redis.' );
				counter++;

				//Удаление
				var query2 = {
					user:{
						queries:{
							'users':{
								selector:{
									_id:reply['users'][0]._id
								}
							}
						}
					}
				};

				controller.delete(query2, function( err, reply){
					if( err ) {
						console.log( 'Error: Тест 1.10 Удаление ' +
							'модифицированных данных из redis и mongo:' +
							err.message );
					} else {
						if (reply['users'][0]._id) {
							console.log( '✓ Тест 1.10 Удаление ' +
								'модифицированных данных из redis и mongo.' );
							counter++;

							//Проверка модификации данных
							var _id2 = reply['users'][0];

							var query3 = {
								user:{
									queries:{
										'users':{
											selector:{
												_id:_id2
											}
										}
									}
								}
							};

							controller.find(query3, function( err, reply){
								if( err ) {
									console.log( 'Error: Тест 1.11 Чтение ' +
										'удаленных данных из flexo:' +
										err.message );
								} else {
									if (reply['users'].length === 0) {
										console.log( '✓ Тест 1.11 Чтение ' +
											'удаленных данных из flexo.' );
										counter++;

										var query4 = {
											user:{
												_id:_id2
											}
										};

										controller.find(query4, function( err, reply){
											if( err.message === 'No cache in redis for the _id: ' + _id2) {
												console.log( '✓ Тест 1.12 Чтение ' +
													'удаленных данных из redis.' );
												counter++;

												test2();

											} else {
												if (err) {
													console.log( 'Error: Тест 1.12 Чтение ' +
														'удаленных данных из redis:' +
														err.message );
												} else {
													console.log( '× Тест 1.12 Чтение ' +
														'удаленных данных из redis.' );
												}
											}
										});
									} else {
										console.log( '× Тест 1.11 Чтение ' +
											'удаленных данных из flexo.' );
									}
								}
							});



						} else {
							console.log( '× Тест 1.10 Удаление ' +
								'модифицированных данных из redis и mongo.' );
						}
					}
				});


			} else {
				console.log( '× Тест 1.9 Чтение ' +
					'модифицированных данных из redis.' );
			}
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
			console.log( 'Error: Тест 2.0 Сохранение flexo прав по роли: ' + err.message );
		} else {
			if (reply) {
				console.log( '✓ Тест 2.0 Сохранение flexo прав по роли.' );
				counter++;
			} else {
				console.log( '× Тест 2.0 Сохранение flexo прав по роли.' );
			}

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
					if(reply['read'] && reply['modify'] && reply['create'] &&
						reply['delete'] === 0){
						console.log( '✓ Teст 2.1 Читаем сохраненные права flexo по роли.');
						counter++;
					} else {
						console.log( '× Teст 2.1 Читаем сохраненные права flexo по роли.');
					}

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
							console.log( 'Error: Тест 2.2 Сохранение flexo прав по ' +
								'пользователю: ' +	err.message );
						} else {
							if (reply){
								console.log( '✓ Тест 2.2 Сохранение flexo прав по пользователю.');
								counter++;
							} else {
								console.log( '× Тест 2.2 Сохранение flexo прав по пользователю.');
							}
							//Читаем сохраненные права
							var query4 = {
								access:{
									flexoSchemeName: 'customers',
									login:'guest'
								}
							};

							controller.find(query4, function ( err, reply ) {
								if( err ) {
									console.log( 'Error: Teст 2.3 Читаем сохраненные права flexo ' +
										'по пользователю: ' + err.message );
								} else {
									if(reply['read'] && reply['modify'] && reply['create'] &&
										reply['delete']){
										console.log( '✓ Teст 2.3 Читаем сохраненные права flexo ' +
											'по пользователю.');
										counter++;
									} else {
										console.log( '× Teст 2.3 Читаем сохраненные права flexo ' +
											'по пользователю.');
									}
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
											console.log( 'Error: Тест 2.4 Сохранение права на ' +
												'view по роли: ' + err.message );
										} else {
											if (reply){
												console.log( '✓ Тест 2.4 Сохранение права на ' +
													'view по роли.');
												counter++;
											} else {
												console.log( '× Тест 2.4 Сохранение права на ' +
													'view по роли.');
											}

											test2_2(objAccess);

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

function test2_2(objAccess){
	//Читаем сохраненные права
	var query6 = {
		access:{
			viewName: 'viewCustomers',
			role:'admin'
		}
	};

	controller.find( query6, function( err, reply ) {
		if( err ) {
			console.log( 'Error: Teст 2.5 Читаем сохраненные ' +
				'права на view по роли: ' + err.message );
		} else {
			if(reply.customers['read'] && reply.customers['modify']
				&& reply.customers['create'] && reply.customers['delete'] ){
				console.log( '✓ Teст 2.5 Читаем сохраненные ' +
					'права на view по роли.' );
				counter++;
			} else {
				console.log( '× Teст 2.5 Читаем сохраненные ' +
					'права на view по роли.' );
			}
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
					console.log( 'Error: Тест 2.6 Сохранение ' +
						'права на view по пользователю: ' + err.message );
				} else {
					if (reply) {
						console.log( '✓ Тест 2.6 Сохранение ' +
							'права на view по пользователю.');
						counter++;
					} else {
						console.log( '× Тест 2.6 Сохранение ' +
							'права на view по пользователю.');
					}

					//Читаем сохраненные права
					var query8 = {
						access:{
							viewName: 'viewCustomers',
							login:'guest'
						}
					};

					controller.find( query8, function(err, reply){
						if( err ) {
							console.log( 'Error: Teст 2.7 Читаем ' +
								'сохраненные права на view по пользователю:' +
								err.message );
						} else {
							if(reply.customers['read'] && reply.customers['modify']
								&& reply.customers['create'] && reply.customers['delete']){
								console.log( '✓ Teст 2.7 Читаем сохраненные' +
									' права на view по пользователю.');
								counter++;
								test3();
							} else {
								console.log( '× Teст 2.7 Читаем сохраненные ' +
									'права на view по пользователю. ');
							}
						}
					})

				}
			});
		}
	} );
}

//Проверяем работу определения пересечения прав
function test3(){
	//Запрос на шаблон
	var viewName = 'viewCustomers';
	var user = 'guest';
	var role = 'admin';
	var socket = {};


	controller.getTemplate('view', viewName, user, role, socket, function( err, reply, config) {
		if ( err ) {
			console.log( 'Error: Тест 3.0 Запрос шаблона для view:' + err.message );
		} else {
			if ( reply || config ) {
				console.log( '✓ Тест 3.0 Запрос шаблона для view.');
				counter++;
			} else {
				console.log( '× Тест 3.0 Запрос шаблона для view.');
			}

			var request = {
				queries:{
					'customers':{ name:'alex', inn:'123456789', managerName:'sasha' }
				}
			};

			controller.queryToView('create', request, viewName, socket,
				function( err, reply, count ) {
				if ( err ) {
					console.log( 'Error: Тест 3.1 Запрос на создание одного документа с ' +
						'разрешенными полями:' + err.message );
				} else {
					if( reply.customers.length === 1 ){
						console.log( '✓ Тест 3.1 Запрос на создание одного документа с ' +
							'разрешенными полями.');
						counter++;

						var type = 'read';
						var request2 = {
							queries:{
								'customers':{
									selector:{
										_id:reply.customers[0]._id
									}
								}
							}
						};

						controller.queryToView( type, request2, viewName, socket,
							function( err, reply, count ) {
							if ( err ) {
								console.log( 'Error: Тест 3.2 Запрос на чтение совсеми ' +
									'разрешенными полями сохраненных данных:' + err.message );
							} else {
								if(reply.customers[0].name === 'alex'){
									console.log( '✓ Тест 3.2 Запрос на чтение совсеми ' +
										'разрешенными полями сохраненных данных.');
									counter++;

									var tsCreateForCheck = reply.customers[0].tsCreate;

									//Модификация
									var request3 = {
										queries:{
											'customers':{
												selector: {_id:reply.customers[0]._id},
												properties: {name:'alexander'}
											}
										}
									};


									controller.queryToView('modify', request3, viewName, socket,
										function( err, reply, count ) {
										if ( err ) {
											console.log( 'Error: Тест 3.3 Запрос на модификацию ' +
												'одного документа с разрешенными полями:' +
												err.message );
										} else {
											if(reply.customers[0].tsUpdate > tsCreateForCheck) {
												console.log( '✓ Тест 3.3 Запрос на модификацию ' +
													'одного документа с разрешенными полями.');
												counter++;

                                                test3_1(socket, reply, viewName);


											} else {
												console.log( '× Тест 3.3 Запрос на модификацию ' +
													'одного документа с разрешенными полями.');
											}
										}
									} );





								} else {
									console.log( '× Тест 3.2 Запрос на чтение совсеми ' +
										'разрешенными полями сохраненных данных.');
								}
							}
						} );


					} else {
						console.log( '× Тест 3.1 Запрос на создание одного документа с ' +
							'разрешенными полями.');
					}
				}
			} );
		}
	} );
}

function test3_1(socket, reply, viewName){
	//Читаем модифицированные данные
	var request4 = {
		queries:{
			'customers':{
				selector:{
					_id:reply.customers[0]._id
				}
			}
		}
	};

	controller.queryToView( 'read', request4, viewName, socket, function( err, reply, count ) {
		if ( err ) {
			console.log( 'Error: Тест 3.4 Запрос на чтение совсеми разрешенными полями ' +
				'одного модифицированного документа:' + err.message );
		} else {
			if(reply.customers[0].name === 'alexander'){
				console.log( '✓ Тест 3.4 Запрос на чтение совсеми разрешенными полями одного ' +
					'модифицированного документа.');
				counter++;

				var _idDeletedDocuments = reply.customers[0]._id;

				//Удаление документа
				var request5 = {
					queries:{
						customers:
						{
							selector: {_id:_idDeletedDocuments}
						}
					}
				};


				controller.queryToView('delete', request5, viewName, socket,
					function( err, reply, count ) {
					if ( err ) {
						console.log( 'Error: Тест 3.5 Запрос на разрешенное удаление ' +
							'модифицированного документа:' + err.message );
					} else {
						if(reply.customers[0]._id === _idDeletedDocuments) {
							console.log( '✓ Тест 3.5 Запрос на разрешенное удаление ' +
								'модифицированного документа.');
							counter++;

							var request6 = {
								queries:{
									'customers':{
										selector:{
											_id:_idDeletedDocuments
										}
									}
								}
							};

							controller.queryToView( 'read', request6, viewName, socket,
								function( err, reply, count ) {
								if ( err ) {
									console.log( 'Error: Тест 3.6 Запрос на чтение совсеми ' +
										'разрешенными полями удаленного документа:' + err.message );
								} else {
									if(reply.customers.length === 0){
										console.log( '✓ Тест 3.6 Запрос на чтение совсеми ' +
											'разрешенными полями удаленного документа.');
										counter++;

										var request7 = {
											queries:{
												'customers':{
													selector: {_id:_idDeletedDocuments},
													properties: {name:'1'}
												}
											}
										};


										controller.queryToView('modify', request7, viewName, socket,
											function( err, reply, count ) {
											if ( err ) {
												console.log( 'Error: Тест 3.7 Запрос на ' +
													'модификацию одного несуществующего ' +
													'документа с неразрешенными полями: ' +
													err.message);
											} else {
												if(reply.customers.length === 0){
													console.log( '✓ Тест 3.7 Запрос на ' +
														'модификацию одного несуществующего ' +
														'документа с неразрешенными полями.');
													counter++;

													//Добавление, чтение, модификация, удаление
													// массива документов одной flexo схемы
													test6();

												} else {
													console.log( '× Тест 3.7 Запрос на ' +
														'модификацию одного несуществующего ' +
														'документа с неразрешенными полями: ');
												}
											}
										} );




									} else {
										console.log( '× Тест 3.6 Запрос на чтение совсеми ' +
											'разрешенными полями удаленного документа.');
									}
								}
							} );





						} else {
							console.log( '× Тест 3.5 Запрос на разрешенное удаление ' +
								'модифицированного документа.');
						}
					}
				} );




			} else {
				console.log( '× Тест 3.4 Запрос на чтение совсеми разрешенными полями одного ' +
					'модифицированного документа.');
			}
		}
	} );
}

function test4(){
	//Запрос на шаблон
	var viewName = 'viewCustomers';
	var user = 'guest';
	var role = 'admin';
	var socket = {};


	controller.getTemplate('view', viewName, user, role, socket, function( err, reply, config ) {
		if ( err ) {
			console.log( 'Error: Тест 4.0 Запрос шаблона:' + err.message );
		} else {
			if ( reply || config) {
				console.log( '✓ Тест 4.0 Запрос шаблона.');
				counter++;
			} else {
				console.log( '× Тест 4.0 Запрос шаблона.');
			}

			var request = {
				queries:{
					'customers':[
						{ name:'alex', inn:'123456789', managerName:'vitalie' },
						{ name:'sasha', inn:'223456789', managerName:'vitalie' },
						{ name:'alexander', inn:'323456789', managerName:'vitalie' }
					]
				}
			};

			controller.queryToView('create', request, viewName, socket,
				function( err, reply, count ) {
				if ( err ) {
					console.log( 'Error: Тест 4.1 Запрос на создание массива из трех ' +
						'документов с разрешенными полями:' + err.message );
				} else {
					if( reply.customers.length === 3 ){
						console.log( '✓ Тест 4.1 Запрос на создание массива из трех ' +
							'документов с разрешенными полями.');
						counter++;

						var _idDocuments0 = reply.customers[0]._id;
						var _idDocuments1 = reply.customers[1]._id;
						var _idDocuments2 = reply.customers[2]._id;

						var request2 = {
							queries:{
								'customers':
								{selector:{_id:reply.customers[0]._id}}
							}
						};

						controller.queryToView( 'read', request2, viewName, socket,
							function( err, reply, count ) {
							if ( err ) {
								console.log( 'Error: Тест 4.2 Запрос на чтение совсеми ' +
									'разрешенными полями одного из трех сохраненных документов ' +
									'из одной схемы:' + err.message );
							} else {
								if(reply.customers[0].name === 'alex'){
									console.log( '✓ Тест 4.2 Запрос на чтение совсеми ' +
										'разрешенными полями одного из трех сохраненных ' +
										'документов из одной схемы.');
									counter++;

									var tsCreateForCheck0 = reply.customers[0].tsCreate;

									//Модификация
									var request3 = {
										queries:{
											'customers':[
												{
													selector: {_id:_idDocuments0},
													properties: {name:'alexander'}
												},
												{
													selector: {_id:_idDocuments1},
													properties: {name:'sasha super'}
												},
												{
													selector: {_id:_idDocuments2},
													properties: {name:'alex'}
												}
											]
										}
									};


									controller.queryToView('modify', request3, viewName, socket,
										function( err, reply, count ) {
										if ( err ) {
											console.log( 'Error: Тест 4.3 Запрос на модификацию ' +
												'трех документов с разрешенными полями:' +
												err.message );
										} else {
											if(reply.customers[0].tsUpdate > tsCreateForCheck0) {
												console.log( '✓ Тест 4.3 Запрос на модификацию ' +
													'трех документов с разрешенными полями.');
												counter++;


												test4_2(socket, reply, viewName, _idDocuments0,
													_idDocuments1, _idDocuments2);

											} else {
												console.log( '× Тест 4.3 Запрос на модификацию ' +
													'трех документов с разрешенными полями.');
											}
										}
									} );





								} else {
									console.log( '× Тест 4.2 Запрос на чтение совсеми ' +
										'разрешенными полями одного из трех сохраненных ' +
										'документов из одной схемы.');
								}
							}
						} );


					} else {
						console.log( '× Тест 4.1 Запрос на создание массива из трех документов ' +
							'с разрешенными полями.');
					}
				}
			} );
		}
	});
}

function test4_2(socket, reply, viewName, _idDocuments0, _idDocuments1, _idDocuments2){
	//Читаем модифицированные данные
	var request4 = {
		queries:{
			'customers':
			{selector:{_id:reply.customers[1]._id}}
		}
	};

	controller.queryToView( 'read', request4, viewName, socket, function( err, reply, count ) {
		if ( err ) {
			console.log( 'Error: Тест 4.4 Запрос на чтение совсеми разрешенными полями одного ' +
				'из трех модифицированных документов:' + err.message );
		} else {
			if(reply.customers[0].name === 'sasha super'){
				console.log( '✓ Тест 4.4 Запрос на чтение совсеми разрешенными полями одного ' +
					'из трех модифицированных документов.');
				counter++;

				//Удаление документа
				var request5 = {
					queries:{
						customers:[
							{
								selector: {_id:_idDocuments0}
							},
							{
								selector: {_id:_idDocuments1}
							},
							{
								selector: {_id:_idDocuments2}
							}
						]
					}
				};


				controller.queryToView('delete', request5, viewName, socket,
					function( err, reply, count ) {
					if ( err ) {
						console.log( 'Error: Тест 4.5 Запрос на разрешенное удаление ' +
							'трех модифицированных документов:' + err.message );
					} else {
						if(reply.customers[0]._id === _idDocuments0 &&
							reply.customers[1]._id === _idDocuments1 &&
							reply.customers[2]._id === _idDocuments2) {
							console.log( '✓ Тест 4.5 Запрос на разрешенное удаление ' +
								'трех модифицированных документов.');
							counter++;

							var request6 = {
								queries:{
									'customers':
									{selector:{_id:_idDocuments2}}

								}
							};

							controller.queryToView( 'read', request6, viewName, socket,
								function( err, reply, count ) {
								if ( err ) {
									console.log( 'Error: Тест 4.6 Запрос на чтение совсеми ' +
										'разрешенными полями удаленных трех документов:' +
										err.message );
								} else {
									if(reply.customers.length === 0){
										console.log( '✓ Тест 4.6 Запрос на чтение совсеми ' +
											'разрешенными полями удаленных трех документов.');
										counter++;

										test7();

									} else {
										console.log( '× Тест 4.6 Запрос на чтение совсеми ' +
											'разрешенными полями удаленных трех документов.');
									}
								}
							} );





						} else {
							console.log( '× Тест 4.5 Запрос на разрешенное удаление трех ' +
								'модифицированных документов.');
						}
					}
				} );




			} else {
				console.log( '× Тест 4.4 Запрос на чтение совсеми разрешенными полями одного ' +
					'из трех модифицированных документов.');
			}
		}
	} );
}

function test5(){
	//Запрос на шаблон
	var viewName = 'viewCustomers';
	var user = 'guest';
	var role = 'admin';
	var socket = {};


	controller.getTemplate('view', viewName, user, role, socket, function( err, reply, config ) {
		if ( err ) {
			console.log( 'Error: Тест 5.0 Запрос шаблона:' + err.message );
		} else {
			if ( reply || config ) {
				console.log( '✓ Тест 5.0 Запрос шаблона.');
				counter++;
			} else {
				console.log( '× Тест 5.0 Запрос шаблона.');
			}

			var type = 'read';
			var request = {
				queries:{
					'customers':{
						selector:{
							name:'1',
							tsQwer:2
						},
						options:{
							sort:{
								name:1
							}
						}
					}
				}
			};

			controller.queryToView( type, request, viewName, socket,
				function( err, reply, count ) {
				if ( err && err.message === 'Requested more fields than allowed to read') {
					console.log( '✓ Тест 5.1 Запрос на чтение с несуществующем полем в select.');
					counter++;
				} else {
					if(reply){
						console.log( '× Тест 5.1 Запрос на чтение с несуществующем полем ' +
							'в select.');
					} else {
						console.log( 'Error: Тест 5.1 Запрос на чтение с несуществующем полем ' +
							'в select:' + err.message );
					}
				}
			} );


			var request2 = {
				queries:{
					'customers':{
						selector:{
							name:'1'
						},
						options:{
							sort:{
								tsQwer:1
							}
						}
					}
				}
			};

			controller.queryToView( type, request2, viewName, socket,
				function( err, reply, count ) {
				if ( err.message === 'Requested more fields than allowed to read' ) {
					console.log( '✓ Тест 5.2 Запрос на чтение с несуществующем полем в sort.');
					counter++;
				} else {
					if(reply){
						console.log( '× Тест 5.2 Запрос на чтение с несуществующем полем в sort.');
					} else {
						console.log( 'Error: Тест 5.2 Запрос на чтение с несуществующем ' +
							'полем в sort: ' + err.message);
					}
				}
			} );

			var request3 = {
				queries:{
					'customers':[
						{ name:'a', inn:'123', managerName:'sss', tsCreate:'1233', _id:0 },
						{ name:'a', inn:'123', managerName:'sss', tsCreate:'1234' },
						{ name:'a', inn:'123', managerName:'sss', tsCreate:'1235' }
					]
				}
			};


			controller.queryToView('create', request3, viewName, socket,
				function( err, reply, count ) {
				if ( err && err.message === 'No permission to create in view' ) {
					console.log( '✓ Тест 5.3 Запрос на создание массива документов ' +
						'с неразрешенным полем _id на создание.');
					counter++;
				} else {
					if(reply){
						console.log( '× Тест 5.3 Запрос на создание массива документов ' +
							'с неразрешенным полем _id на создание.');
					} else {
						console.log( 'Error: Тест 5.3 Запрос на создание массива документов ' +
							'с неразрешенным полем _id на создание: ' + err.message);
					}
				}
			} );

			var request4 = {
				queries:{
					'customers':{ name:'a', inn:'123', managerName:'sss', tsCreate:'1233', _id:0 }
				}
			};


			controller.queryToView('create', request4, viewName, socket,
				function( err, reply, count ) {
				if ( err && err.message === 'No permission to create in view' ) {
					console.log( '✓ Тест 5.4 Запрос на создание одного документа с ' +
						'неразрешенным полем _id на создание.');
					counter++;
				} else {
					if(reply){
						console.log( '× Тест 5.4 Запрос на создание одного документа с ' +
							'неразрешенным полем _id на создание.');
					} else {
						console.log( 'Error: Тест 5.4 Запрос на создание одного документа с ' +
							'неразрешенным полем _id на создание: ' + err.message);
					}
				}
			} );

			var request5 = {
				queries:{
					'customers':{
						selector: {_id:'a'},
						properties: {name:'1', _id:'2'}
					}
				}
			};


			controller.queryToView('modify', request5, viewName, socket,
				function( err, reply, count ) {
				if ( err && err.message === 'No permission to modify in view' ) {
					console.log( '✓ Тест 5.5 Запрос на модификацию одного документа с ' +
						'неразрешенным полем _id для модификации.');
					counter++;
				} else {
					if(reply){
						console.log( '× Тест 5.5 Запрос на модификацию одного документа с ' +
							'неразрешенным полем _id для модификации.');
					} else {
						console.log( 'Error: Тест 5.5 Запрос на модификацию одного документа с ' +
							'неразрешенным полем _id для модификации: ' + err.message);
					}
				}
			} );

			var request6 = {
				queries:{
					'customers':[
						{
							selector: {_id:'a'},
							properties: {name:'1', _id:'2'}
						}, {
							selector: {_id:'b'},
							properties: {name:'2'}
						}
					]
				}
			};


			controller.queryToView('modify', request6, viewName, socket,
				function( err, reply, count ) {
				if ( err && err.message === 'No permission to modify in view' ) {
					console.log( '✓ Тест 5.6 Запрос на модификацию массива документов с ' +
						'неразрешенным полем _id на модификацию.');
					counter++;

					test6();

				} else {
					if(reply){
						console.log( '× Тест 5.6 Запрос на модификацию массива документов с ' +
							'неразрешенным полем _id на модификацию.');
					} else {
						console.log( 'Error: Тест 5.6 Запрос на модификацию массива документов с ' +
							'неразрешенным полем _id на модификацию: ' + err.message);
					}
				}
			} );
		}
	});
}

function test6(){
	//Вставляем необходимые права
	//Объект прав
	var objAccess = {
		//Информация о сужении и расширении прав доступа к flexo документам
		userFlexo:{
			'guest:orders':{ //user:schemeName
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
			},
			'guest:services':{ //user:schemeName
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
		},

		//Информация о доступе к view по пользователю
		userView:{
			'guest:viewOrdersServices':{ //user:viewName
				'orders':{ //flexoSchemeName
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
				},
				'services':{ //flexoSchemeName
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
	}

	var query = {
		access:{
			flexoSchemeName: 'orders',
			login:'guest',
			objAccess: objAccess.userFlexo['guest:orders']
		}
	};

	controller.create(query, function ( err, reply ) {
		if( err ) {
			console.log( 'Error: Тест 6.0 Сохранение flexo прав для схемы orders ' +
				'по пользователю: ' + err.message );
		} else {
			if (reply) {
				console.log( '✓ Тест 6.0 Сохранение flexo прав для схемы orders по пользователю.' );
				counter++;

				var query2 = {
					access:{
						flexoSchemeName: 'services',
						login:'guest',
						objAccess: objAccess.userFlexo['guest:services']
					}
				};

				controller.create(query2, function ( err, reply ) {
					if( err ) {
						console.log( 'Error: Тест 6.1 Сохранение flexo прав для схемы services ' +
							'по пользователю: ' + err.message );
					} else {
						if (reply) {
							console.log( '✓ Тест 6.1 Сохранение flexo прав для схемы services ' +
								'по пользователю.' );
							counter++;

							var query3 = {
								access:{
									viewName: 'viewOrdersServices',
									login:'guest',
									objAccess: objAccess.userView['guest:viewOrdersServices']
								}
							};

							controller.create(query3, function ( err, reply ) {
								if( err ) {
									console.log( 'Error: Тест 6.2 Сохранение viewOrdersServices ' +
										'прав по пользователю: ' + err.message );
								} else {
									if (reply) {
										console.log( '✓ Тест 6.2 Сохранение viewOrdersServices ' +
											'прав по пользователю.' );
										counter++;

										var viewName = 'viewOrdersServices';
										var socket = {
											login:'guest',
											role:'admin'
										};

										//Запрос на создение
										var request = {
											queries:{
												'services':[
													{ name:'buying', price:'200' },
													{ name:'packaging', price:'300' },
													{ name:'delivery', price:'400' }
												]
											}
										};

										controller.queryToView('create', request, viewName, socket,
											function( err, reply, count ) {
											if ( err ) {
												console.log( 'Error: Тест 6.3 Запрос к view на ' +
													'создание массива из трех документов ' +
													'содержащих поля из services flexo схемы:' +
													err.message );
											} else {
												if( reply.services.length === 3 ){
													console.log( '✓ Тест 6.3 Запрос к view на ' +
														'создание массива из трех документов ' +
														'содержащих поля из services flexo схемы.');
													counter++;

													test6_2(socket, viewName, reply);

												} else {
													console.log( '× Тест 6.3 Запрос к view на' +
														' создание массива из трех документов ' +
														'содержащих поля из services flexo схемы.' );
												}
											}
										});
									} else {
										console.log( '× Тест 6.2 Сохранение viewOrdersServices' +
											' прав по пользователю.' );
									}
								}
							});

						} else {
							console.log( '× Тест 6.1 Сохранение flexo прав для схемы services' +
								' по пользователю.' );
						}
					}
				});

			} else {
				console.log( '× Тест 6.0 Сохранение flexo прав для схемы orders по пользователю.' );
			}
		}
	});

}

function test6_2(socket, viewName, reply){
	//Запрос на создение
	var request2 = {
		queries:{
			'orders':{
				number:'111111',
				comments:'not comments',
				services:[
					reply.services[0]._id,
					reply.services[1]._id,
					reply.services[2]._id
				]
			}
		}
	};

	controller.queryToView('create', request2, viewName, socket, function( err, reply, count ) {
		if ( err ) {
			console.log( 'Error: Тест 6.4 Запрос к view на создание одного корневого документа ' +
				'с массивом _id из другой схемы:' + err.message );
		} else {
			if( reply.orders.length === 1 ){
				console.log( '✓ Тест 6.4 Запрос к view на создание одного корневого документа ' +
					'с массивом _id из другой схемы.');
				counter++;

				var request3 = {
					queries:{
						'orders':
						{selector:{_id:reply.orders[0]._id}}

					}
				};

				controller.queryToView( 'read', request3, viewName, socket,
					function( err, reply, count ) {
					if ( err ) {
						console.log( 'Error: Тест 6.5 Запрос на чтение по корневой схеме ' +
							'одного документа из view c двумя flexo схемами:' + err.message );
					} else {
						if(reply.orders.length === 1 && reply.services.length === 3){
							console.log( '✓ Тест 6.5 Запрос на чтение по корневой схеме ' +
								'одного документа из view c двумя flexo схемами.');
							counter++;

							//Модификация корневого
							var tsCreateForCheck = reply.orders[0].tsCreate;

							//Модификация
							var request4 = {
								queries:{
									'orders':{
										selector: {_id:reply.orders[0]._id},
										properties: {number:'22222'}
									}

								}
							};


							controller.queryToView('modify', request4, viewName, socket,
								function( err, reply, count ) {
								if ( err ) {
									console.log( 'Error: Тест 6.6 Запрос на модификацию в ' +
										'корневой схеме одного документа из view c двумя ' +
										'flexo схемами:' + err.message );
								} else {
									if(reply.orders[0].tsUpdate > tsCreateForCheck) {
										console.log( '✓ Тест 6.6 Запрос на модификацию в ' +
											'корневой схеме одного документа из view c ' +
											'двумя flexo схемами.');
										counter++;

										//Чтение корневого
										var request5 = {
											queries:{
												'orders':
												{selector:{_id:reply.orders[0]._id}}

											}
										};

										controller.queryToView( 'read', request5, viewName, socket,
											function( err, reply, count ) {
											if ( err ) {
												console.log( 'Error: Тест 6.7 Запрос на чтение ' +
													'по корневой схеме одного документа из view ' +
													'c двумя flexo схемами:' + err.message );
											} else {
												if(reply.orders.length === 1 &&
													reply.orders[0].number === '22222' &&
													reply.services.length === 3){
													console.log( '✓ Тест 6.7 Запрос на чтение ' +
														'по корневой схеме одного ' +
														'модифицированного документа из view ' +
														'c двумя flexo схемами.');
													counter++;

													var idDeleted = reply.orders[0]._id;

													test6_3(socket, viewName, reply, idDeleted);


												} else {
													console.log( '× Тест 6.7 Запрос на чтение' +
														' по корневой схеме одного ' +
														'модифицированного документа из view c ' +
														'двумя flexo схемами.');
												}
											}
										});

									} else {
										console.log( '× Тест 6.6 Запрос на модификацию в ' +
											'корневой схеме одного модифицированного документа ' +
											'из view c двумя flexo схемами.');
									}
								}
							});


						} else {
							console.log( '× Тест 6.5 Запрос на чтение по корневой схеме одного ' +
								'документа из view c двумя flexo схемами.');
						}
					}
				} );



			} else {
				console.log( '× Тест 6.4 Запрос к view на создание одного корневого документа ' +
					'с массивом _id из другой схемы.' );
			}
		}
	});
}

function test6_3(socket, viewName, reply, idDeleted){
	//Удаление документа
	var request6 = {
		queries:{
			orders:{
				selector: {_id:reply.orders[0]._id}
			}

		}
	};


	controller.queryToView('delete', request6, viewName, socket,
		function( err, reply, count ) {
			if ( err ) {
				console.log( 'Error: Тест 6.8 Запрос на удаление в корневой схеме одного ' +
					'документа из view c двумя flexo схемами:' + err.message );
			} else {
				if(reply.orders[0] && reply.orders[0]._id === idDeleted ) {
					console.log( '✓ Тест 6.8 Запрос на удаление в корневой схеме одного ' +
						'документа из view c двумя flexo схемами.');
					counter++;

					var request7 = {
						queries:{
							'orders':{selector:{_id:idDeleted}}
						}
					};

					controller.queryToView( 'read', request7, viewName, socket,
						function( err, reply, count ) {
						if ( err ) {
							console.log( 'Error: Тест 6.9 Запрос на чтение по корневой схеме ' +
								'удаленного документа из view c двумя flexo схемами:' +
								err.message );
						} else {
							if(reply.orders && reply.orders.length === 0){
								console.log( '✓ Тест 6.9 Запрос на чтение по корневой схеме ' +
									'удаленного документа из view c двумя flexo схемами.');
								counter++;

								test7();

							} else {
								console.log( '× Тест 6.9 Запрос на чтение по корневой схеме ' +
									'удаленного документа из view c двумя flexo схемами.');
							}
						}
					} );





				} else {
					console.log( '× Тест 6.8 Запрос на удаление в корневой схеме одного ' +
						'документа из view c двумя flexo схемами.');
				}
			}
		} );
}

function test7(){
	objMenu = {
		role:{
			'main':1,
			'sales':1,
			'sales/customers':1,
			'sales/orders':1,
			'sales/orders/contracts':1,
			'sales/orders/accounts':1,
			'sales/orders/accounts/addaccounts':1,
			'sales/orders/accounts/removeaccounts':1,
			'sales/orders/payments':1,
			'about':1
		},
		user:{
			'(all)':1,
			'sales/orders/accounts':0
		}
	};

	var query = {
		access:{
			menuName:'root',
			role:'admin',
			objAccess: objMenu.role
		}
	};

	//Запрос на вставку данных о меню с правами по роли
	controller.create(query, function( err, reply ) {
		if ( err ) {
			console.log( 'Error: Тест 7.0 Запрос на создание прав к меню по роли:' +
				err.message );
		} else {
			if(reply){
				console.log( '✓ Тест 7.0 Запрос на создание прав к меню по роли.');
				counter++;

				var query2 = {
					access:{
						menuName:'root',
						login:'sasha',
						objAccess: objMenu.user
					}
				};

				//Запрос на вставку данных о меню с правами по роли
				controller.create(query2, function( err, reply ) {
					if ( err ) {
						console.log( 'Error: Тест 7.1 Запрос на создание прав к меню по пользователю:' +
							err.message );
					} else {
						if(reply){
							console.log( '✓ Тест 7.1 Запрос на создание прав к меню по пользователю.');
							counter++;

							var query3 = {
								access:{
									menuName:'root',
									login:'sasha'
								}
							};

							//Запрос на вставку данных о меню с правами по роли
							controller.find(query3, function( err, reply ) {
								if ( err ) {
									console.log( 'Error: Тест 7.2 Запрос на чтение прав меню по пользователю:' +
										err.message );
								} else {
									if(reply){
										console.log( '✓ Тест 7.2 Запрос на чтение прав меню по пользователю.', reply);
										counter++;

										var query4 = {
											access:{
												menuName:'root',
												role:'admin'
											}
										};

										//Запрос на вставку данных о меню с правами по роли
										controller.find(query4, function( err, reply ) {
											if ( err ) {
												console.log( 'Error: Тест 7.3 Запрос на чтение прав меню по роли:' +
													err.message );
											} else {
												if(reply){
													console.log( '✓ Тест 7.3 Запрос на чтение прав меню по роли.', reply);
													counter++;

													//Запрос шаблона меню (временно прав)
													var type = 'menu';
													var name = 'root';
													var user = 'sasha';
													var role = 'admin'
													var socket = {};

													controller.getTemplate(type, name, user, role, socket,function( err, reply ) {
														if ( err ) {
															console.log( 'Error: Тест 7.4 Запрос шаблона меню:' +
																err.message );
														} else {
															if(reply){
																console.log( '✓ Тест 7.4 Запрос шаблона меню.', reply);
																counter++;
																if( mock.flexo ){
																 console.log('Всего тестов 71, из них выполнено: ' + counter);
																 } else {
																 console.log('Всего тестов 79, из них выполнено: ' + counter);
																 }

																 process.kill();


															} else {
																console.log( '× Тест 7.4 шаблона меню.');
															}
														}
													});


												} else {
													console.log( '× Тест 7.3 Запрос на чтение прав меню по роли.');
												}
											}
										} );

									} else {
										console.log( '× Тест 7.2 Запрос на чтение прав меню по пользователю.');
									}
								}
							} );

						} else {
							console.log( '× Тест 7.1 Запрос на создание прав к меню по пользователю.');
						}
					}
				} );

			} else {
				console.log( '× Тест 7.0 Запрос на создание прав к меню по роли.');
			}
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
