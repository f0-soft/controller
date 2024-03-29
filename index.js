var redis = require('redis');
var sys = require('sys');
var async = require('async');
var underscore = require('underscore');

var AccessModuleView = require('./modules/access_module_view.js');
var AccessModuleFlexo = require('./modules/access_module_flexo.js');

var ModuleErrorLogging = require('./modules/module_error_logging.js');
var ModuleUser = require('./modules/module_user.js');
var ModuleTreeData = require('./modules/module_tree_data');

var client;
var globalFlexoSchemes;
var globalViewConfig;
var flexo;
var View;
var globalViewConfigForAdminPanel;

var Controller = {};
//Константы
var INITIALIZED = false;
var CREATE = 'create';
var CREATEALL = 'createAll';
var READ = 'read';
var MODIFY = 'modify';
var DELETE = 'delete';

var MIN_DATETIME = 1359662400000;
var MAX_DATETIME = 1517428800000;

module.exports = Controller;

/**
 * Инициализация контроллера
 *
 * @param config - объект с параметрами инициализации
 * @param callback
 */
Controller.init = function init( config, callback ) {
	if (!underscore.isFunction(callback)){
		throw new Error( 'Controller: callback not a function' );
	}

	if ( config && config.view ) {
		View = config.view;
	} else {
		callback( new Error( 'Controller: Parameter view is not specified in the config object' ) );
		return;
	}

	if ( config.viewConfig ) {
		globalViewConfig = config.viewConfig;
	} else {
		callback( new Error( 'Controller: Parameter viewConfig is not specified in the config ' +
			'object' ) );
		return;
	}

	if ( config.viewForAdminPanel ) {
		globalViewConfigForAdminPanel = config.viewForAdminPanel;
	} else {
		callback( new Error( 'Controller: Parameter viewForAdminPanel is not specified in the config ' +
			'object' ) );
		return;
	}

	if ( config.flexoSchemes ) {
		globalFlexoSchemes = config.flexoSchemes;
	} else {
		callback( new Error( 'Controller: Parameter flexoSchemes is not specified in the config ' +
			'object' ) );
		return;
	}

	if ( config.redisConfig ) {
		if ( config.redisConfig.max_attempts ) {
			client = redis.createClient( config.redisConfig.port, config.redisConfig.host,
				{ max_attempts: config.redisConfig.max_attempts } );

			client.on( "error", function ( err ) {
				callback( err );
			});

			client.on( "ready", function ( err ) {
				INITIALIZED = true;
				callback( null, true );
			});
		} else {
			client = redis.createClient( config.redisConfig.port, config.redisConfig.host );

			client.on( "error", function ( err ) {
				callback( err );
			});

			client.on( "ready", function ( err ) {
				INITIALIZED = true;
				callback( null, true );
			});
		}
	} else {
		client = redis.createClient();

		client.on( "error", function ( err ) {
			callback( err );
		});

		client.on( "ready", function ( err ) {
			INITIALIZED = true;
			callback( null, true );
		});
	}
};

Controller.create = function create( query, sender, callback ) {
	//Переменная для хранения описания ошибки
	var objDescriptioneError;

	if ( !underscore.isFunction( callback ) ) {
		throw new Error( 'Controller: callback not a function' );
	} else if ( !INITIALIZED ) {

		//Логирование ошибки
		objDescriptioneError = {
			type: 'initialization',
			variant: 1,
			place: 'Controller.create',
			time: new Date().getTime(),
			sender: sender,
			arguments:{
				query:query
			},
			descriptione: {
				title:'Controller: initialization required',
				text:'Вызвана функция create контроллера до его инициализации'
			}
		};

		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( !query ) {

		//Логирование ошибки
		objDescriptioneError = {
			type: 'invalid_function_arguments',
			variant: 1,
			place: 'Controller.create',
			time: new Date().getTime(),
			sender:sender,
			descriptione: {
				title:'Controller: Parameter query is not set',
				text:'Вызвана функция create с неопределенным или равным нулю аргументом query'
			}
		};

		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( query.user ) {
		//Запрос на создание пользователя

		//Проверяем уникальность создаваемого пользователя
		var viewName = 'viewUsers';
		var flexoSchemeName = 'users';
		ModuleUser.checkUnique( client, sender, query.user.login, function ( err ) {
			if ( err ) {
				callback ( err );
			} else {
				//ToDo:Согласовать название view
				var request = {selector: { 'sys_users': {'a3': query.user.login} } };
				var options = {company_id:sender.company_id, user_id: sender.userId, role:sender.role};
				View.find( 'sys_users', ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'], request,
					options, function ( err, documents ) {
					if ( err ) {
						//Логирование ошибки
						objDescriptioneError = {
							type: 'unknown_error',
							variant: 3,
							place: 'View.find',
							time: new Date().getTime(),
							sender:sender,
							arguments:{
								viewName:'sys_users',
								request:request,
								listAllowedOf_vid:['a1', 'a2', 'a3', 'a4', 'a5', 'a6']
							},
							descriptione: {
								title: err.message || err,
								text:'Ошибка полученная в функции обратного вызова при вызове ' +
									'функции view.find при запросе _id пользователя по логину'
							}
						};

						ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
					} else if ( documents.result[0].length === 0 ) {
						//Такого пользователя нет
						//Сохраняем данные во view
						var request = [{'a3':query.user.login, 'a4':query.user.company_id,
							'a5':query.user.name, 'a6':query.user.lastname, 'a7':query.user.role,
							'a8':query.user.lastname + ' ' + query.user.name}];

						if(query.user.email){
							request[0]['a9'] = query.user.email;
						}

						if(query.user.phone){
							request[0]['a10'] = query.user.phone;
						}

						var options = {company_id:sender.company_id, user_id: sender.userId, role:sender.role};
						View.insert( 'sys_users', ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10'], request, options,
							function( err, document ) {
							if ( err ) {
								//Логирование ошибки
								objDescriptioneError = {
									type: 'unknown_error',
									variant: 2,
									place: 'View.insert',
									time: new Date().getTime(),
									sender:sender,
									arguments:{
										viewName:'sys_users',
										request:request,
										listAllowedOf_vid:['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10']
									},
									descriptione: {
										title: err.message || err,
										text:'Ошибка полученная в функции обратного вызова при ' +
											'вызове функции view.insert при сохранение логина ' +
											'пользователя'
									}
								};
							} else if ( document[0]['a1'] ) {
								//Сохраняем документ в Redis
								var resultDocument = underscore.clone( query.user );
								resultDocument._id = document[0]['a1'];
								resultDocument.tsUpdate = document[0]['a2'];
								resultDocument.fullname = query.user.lastname + ' ' +  query.user.name;

								//Сохраняем документ в redis
								ModuleUser.create( client, sender, resultDocument, function( err ) {
									if(err){
										callback( err );
									} else {
										callback( err, true );
									}
								} );

							} else {
								//ToDo:Не получен идентификатор
								callback( 'Controller: view not return _id' );
							}
						});
					} else {
						//ToDo:есть такой пользователь в mongo!!!!!
						//callback('Controller: login already exists in database');
						if (query.user._rewrite){

							var request = [ {
								selector: {  'a1': documents.result[0][0]['a1'], 'a2':documents.result[0][0]['a2'] },
								properties: { 'a4': query.user.company_id,
									'a5': query.user.name, 'a6':query.user.lastname, 'a7':query.user.role,
									'a8':query.user.lastname + ' ' + query.user.name }
							} ];

							if(query.user.email){
								request[0].properties['a9'] = query.user.email;
							}

							if(query.user.phone){
								request[0].properties['a10'] = query.user.phone;
							}
							var options = {company_id:sender.company_id, user_id: sender.userId, role:sender.role};
							View.modify( 'sys_users', request, options, function( err, documentsNew ) {
								if ( err ) {
									//Логирование ошибки
									objDescriptioneError = {
										type: 'unknown_error',
										variant: 3,
										place: 'View.modify',
										time: new Date().getTime(),
										sender:sender,
										arguments:{
											viewName:'sys_users',
											request:request
										},
										descriptione: {
											title: err.message || err,
											text:'Ошибка полученная в функции обратного вызова при ' +
												'вызове функции view.modify при перезаписи ' +
												'сущесмтвующего в mongo пользователя'
										}
									};
								} else if( documentsNew[0]['a1'] ) {
									var document = underscore.clone( query.user );
									document._id = documentsNew[0]['a1'];
									document.tsUpdate = documentsNew[0]['a2'];
									document.fullname = query.user.lastname + ' ' +  query.user.name;
									delete document._rewrite;

									ModuleUser.create( client, sender, document, function(err, reply){
										if ( err ){
											callback( err );
										} else {
											callback(null, reply);
										}
									} );
								} else {
									//ToDo:не возвращен идентификатор
									callback( 'Controller: view not return _id' );
								}
							} );
						} else {
							callback( null, null, 'Пользователь с логином ' + query.user.login +
								' уже существует, перезаписать??');
						}
					}
				} );
			}
		});
	} else if ( query.role ) {
		//ToDo:валидация объекта роли
		//Запрос на создание роли
		ModuleUser.createRole(client, query.role, function( err ) {
			if(err){
				callback( err );
			} else {
				callback( err, true );
			}
		} );
	} else if ( query.access ) {
		//Запроса на создание прав
		if ( query.access.viewName ) {
			//Запрос на создание прав view
			if ( query.access.role ) {

				//Запрос на создание прав view по роли
				AccessModuleView.saveForRole( client, sender, query.access.role,
					query.access.viewName,	query.access.objAccess,
					globalViewConfig[query.access.viewName], callback );
			} else if ( query.access.login ) {

				//Запрос на создание прав view по пользователю
				AccessModuleView.saveForUser( client, sender, query.access.login,
					query.access.viewName, query.access.objAccess,
					globalViewConfig[query.access.viewName], callback );

			} else {

				//Логирование ошибки
				objDescriptioneError = {
					type: 'invalid_function_arguments',
					variant: 2,
					place: 'Controller.create',
					time: new Date().getTime(),
					sender:sender,
					arguments:{
						query:query
					},
					descriptione: {
						title:'Controller: Not set role or login in query.access',
						text:'Вызвана функция create, без указания в query.access логина или ' +
							'роли пользователя при указанном параметре viewName'
					}
				};

				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
			}
		} else if ( query.access.flexoSchemeName ) {
			if ( query.access.role ) {
				//Запрос на создание прав flexo по роли
				AccessModuleFlexo.saveForRole( client, sender, query.access.role,
					query.access.flexoSchemeName, query.access.objAccess,
					globalFlexoSchemes[query.access.flexoSchemeName], callback );
			} else if ( query.access.login ) {
				//Запрос на создание прав view по пользователю
				AccessModuleFlexo.saveForUser( client, sender, query.access.login,
					query.access.flexoSchemeName, query.access.objAccess,
					globalFlexoSchemes[query.access.flexoSchemeName], callback );
			} else {
				//Логирование ошибки
				objDescriptioneError = {
					type: 'invalid_function_arguments',
					variant: 3,
					place: 'Controller.create',
					time: new Date().getTime(),
					sender:sender,
					arguments:{
						query:query
					},
					descriptione: {
						title:'Controller: Not set role or login in query',
						text:'Вызвана функция create, без указания в query.access логина или ' +
							'роли пользователя при указанном параметре flexoSchemeName'
					}
				};

				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
			}
		} else {
			//Логирование ошибки
			objDescriptioneError = {
				type: 'invalid_function_arguments',
				variant: 4,
				place: 'Controller.create',
				time: new Date().getTime(),
				sender:sender,
				arguments:{
					query:query
				},
				descriptione: {
					title:'Controller: Incorrect parameter access in query',
					text:'Вызвана функция create, без указания в query.access параметра viewName или ' +
						'flexoSchemeName'
				}
			};

			ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
		}
	} else {
		//Логирование ошибки
		objDescriptioneError = {
			type: 'invalid_function_arguments',
			variant: 5,
			place: 'Controller.create',
			time: new Date().getTime(),
			sender:sender,
			arguments:{
				query:query
			},
			descriptione: {
				title:'Controller: Incorrect parameter query',
				text:'Вызвана функция create, без указания в query параметров access, user или ' +
					'role'
			}
		};

		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	}
};

Controller.find = function find( query, sender, callback ) {
	//Переменная для хранения описания ошибки
	var objDescriptioneError;

	if (!underscore.isFunction( callback ) ) {
		throw new Error( 'Controller: callback not a function' );
	} else if ( !INITIALIZED ) {
		//Логирование ошибки
		objDescriptioneError = {
			type: 'initialization',
			variant: 1,
			place: 'Controller.find',
			time: new Date().getTime(),
			sender: sender,
			arguments:{
				query:query
			},
			descriptione: {
				title:'Controller: initialization required',
				text:'Вызвана функция find контроллера до его инициализации'

			}
		};

		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( !query ) {

		//Логирование ошибки
		objDescriptioneError = {
			type: 'invalid_function_arguments',
			variant: 1,
			place: 'Controller.find',
			time: new Date().getTime(),
			sender:sender,
			descriptione: {
				title:'Controller: Parameter query is not set',
				text:'Вызвана функция find с неопределенным или равным нулю аргументом query'
			}
		};

		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( query.user ) {
		var flexoSchemeName = 'users';
		if( query.user.login || query.user._id ){
		    //Простой поиск одного пользователя
			var login = query.user.login || null;
			var _id = query.user._id || null;

			ModuleUser.find( client, sender, _id, login, function(err, reply){
				if ( err ){
					callback( err );
				} else {
					var obj = {};
					obj[flexoSchemeName] = [reply];
					callback(null, obj);
				}
			} );
		} else if ( query.user.companiesForUser ) {
			//Запрашивает массив с описанием компаний принадлежных к роли
			var viewName = 'sys_company';

			if ( viewName ) {
				//Запрашиваем данные из view
				var request = { selector:{} };
				request.selector[viewName] = {};
				var options = {company_id:sender.company_id, user_id: sender.userId, role:sender.role};

				View.find(viewName, ['a1', 'a2', 'a3'], request, options, function ( err, documents ) {
					if ( err ) {
						//Логирование ошибки
						objDescriptioneError = {
							type: 'unknown_error',
							variant: 4,
							place: 'View.find',
							time: new Date().getTime(),
							sender:sender,
							arguments:{
								viewName:viewName,
								request:request,
								listAllowedOf_vid:['a1', 'a2', 'a3']
							},
							descriptione: {
								title: err.message || err,
								text:'Ошибка полученная в функции обратного вызова при вызове ' +
									'функции view.find при запросе списка компаний'
							}
						};

						ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
					} else {
						callback(null, documents.result);
					}
				} );
			} else {
				callback(null, []);
			}

		} else if ( query.user.allUser ) {
			ModuleUser.findListOfUsers(client, function( err, replies ) {
				if ( err ) {
					callback( err );
				} else if ( query.user.allView ) {
					callback( null, replies, Object.keys( globalViewConfig ) );
				} else if ( query.user.allFlexo ) {
					callback( null, replies, Object.keys( globalFlexoSchemes ) );
				} else {
					callback( null, replies );
				}
			});
		} else if ( query.user.allObjUser ) {
			ModuleUser.findObjUsers(client, function( err, replies ) {
				if ( err ) {
					callback( err );
				} else {
					callback( null, replies );
				}
			});
		} else if ( query.user.allRole ) {
			ModuleUser.findListOfRoles(client, function( err, replies ) {
				if ( err ) {
					callback( err );
				} else if ( query.user.allView ) {
					callback( null, replies, Object.keys( globalViewConfig ) );
				} else if ( query.user.allFlexo ) {
					callback( null, replies, Object.keys( globalFlexoSchemes ) );
				} else {
					callback( null, replies );
				}
			});
		} else if ( query.user.allObjRole ) {
			ModuleUser.findObjRoles(client, function( err, replies ) {
				if ( err ) {
					callback( err );
				} else {
					callback( null, replies );
				}
			});
		} else if ( query.user.allViewsUser ) {
			ModuleUser.findListOfViewsUser(client, query.user.allViewsUser, function( err, replies ) {
				if ( err ) {
					callback( err );
				} else {
					callback( null, replies, Object.keys(globalViewConfig) );
				}
			} );
		} else if ( query.user.allFlexosUser ) {
			ModuleUser.findListOfFlexosUser(client, query.user.allFlexosUser, function( err, replies ) {
				if ( err ) {
					callback( err );
				} else {
					callback( null, replies, Object.keys(globalFlexoSchemes) );
				}
			} );
		} else if ( query.user.allViewsRole ) {
			ModuleUser.findListOfViewsRole(client, query.user.allViewsRole, function( err, replies ) {
				if ( err ) {
					callback( err );
				} else {
					callback( null, replies, Object.keys(globalViewConfig) );
				}
			} );
		} else if ( query.user.allFlexosRole ) {
			ModuleUser.findListOfFlexosRole(client, query.user.allFlexosRole, function( err, replies ) {
				if ( err ) {
					callback( err );
				} else {
					callback( null, replies, Object.keys(globalFlexoSchemes)  );
				}
			} );
		} else {
			//Логирование ошибки
			objDescriptioneError = {
				type: 'invalid_function_arguments',
				variant: 2,
				place: 'Controller.find',
				time: new Date().getTime(),
				sender:sender,
				arguments:{
					query:query
				},
				descriptione: {
					title:'Controller: Unknown type of query in query.user',
					text:'Вызвана функция find, без указания в query.user какого либо ' +
						'дополнительного параметра определяющего тип поиска'
				}
			};

			ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
		}
	} else if ( query.access ) {
		//Запроса на чтение прав
		if ( query.access.viewName ) {
			//Запрос на чтение прав view
			if ( query.access.role ) {
				//Запрос на чтение прав view по роли
				//Запрашиваемый искомый объект прав
				AccessModuleView.findForRole( client, sender, query.access.role,
					query.access.viewName, function( err, reply ) {
						callback( err, reply, globalViewConfigForAdminPanel[query.access.viewName]);
					} );
			} else if ( query.access.login ) {
				//Запрос на чтение прав view по пользователю
				//Запрашиваемый искомый объект прав
				AccessModuleView.findForUser( client, sender, query.access.login,
					query.access.viewName, function( err, reply ) {
						callback( err, reply, globalViewConfigForAdminPanel[query.access.viewName]);
					} );

			} else {
				//Логирование ошибки
				objDescriptioneError = {
					type: 'invalid_function_arguments',
					variant: 3,
					place: 'Controller.find',
					time: new Date().getTime(),
					sender:sender,
					arguments:{
						query:query
					},
					descriptione: {
						title:'Controller: Not set role or login in query',
						text:'Вызвана функция find, без указания в query.access параметров ' +
							'логина или роли пользователя при указанном параметре viewName'
					}
				};

				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
			}
		} else if ( query.access.flexoSchemeName ) {
			if ( query.access.role ) {
				//Запрос на чтение прав flexo по роли

				//Запрашиваемый искомый объект прав
				AccessModuleFlexo.findForRole( client, sender, query.access.role,
					query.access.flexoSchemeName, function( err, reply ) {
						callback( err, reply, globalFlexoSchemes[query.access.flexoSchemeName] )
					} );

			} else if ( query.access.login ) {
				//Запрос на чтение прав view по пользователю
				//Запрашиваемый искомый объект прав
				AccessModuleFlexo.findForUser( client, sender, query.access.login,
					query.access.flexoSchemeName, function( err, reply ) {
						callback( err, reply, globalFlexoSchemes[query.access.flexoSchemeName] )
					} );

			} else {

				//Логирование ошибки
				objDescriptioneError = {
					type: 'invalid_function_arguments',
					variant: 4,
					place: 'Controller.find',
					time: new Date().getTime(),
					sender:sender,
					arguments:{
						query:query
					},
					descriptione: {
						title:'Controller: Not set role or login in query',
						text:'Вызвана функция find, без указания в query.access параметров ' +
							'логина или роли пользователя при указанном параметре flexoSchemeName'
					}
				};

				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
			}
		} else {
			//Логирование ошибки
			objDescriptioneError = {
				type: 'invalid_function_arguments',
				variant: 5,
				place: 'Controller.find',
				time: new Date().getTime(),
				sender:sender,
				arguments:{
					query:query
				},
				descriptione: {
					title:'Controller: Incorrect parameter access in query',
					text:'Вызвана функция find, без указания в query.access параметра viewName ' +
						'или flexoSchemeName'
				}
			};

			ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
		}
	} else {
		//Логирование ошибки
		objDescriptioneError = {
			type: 'invalid_function_arguments',
			variant: 6,
			place: 'Controller.find',
			time: new Date().getTime(),
			sender:sender,
			arguments:{
				query:query
			},
			descriptione: {
				title:'Controller: Incorrect parameter query',
				text:'Вызвана функция find, без указания в query параметров access или user'
			}
		};

		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	}
};

Controller.delete = function del( query, sender, callback ) {
	//Переменная для хранения описания ошибки
	var objDescriptioneError;

	if (!underscore.isFunction( callback ) ) {
		throw new Error( 'Controller: callback not a function' );
	} else if ( !INITIALIZED ) {
		//Логирование ошибки
		objDescriptioneError = {
			type: 'initialization',
			variant: 1,
			place: 'Controller.delete',
			time: new Date().getTime(),
			sender: sender,
			arguments:{
				query:query
			},
			descriptione: {
				title:'Controller: initialization required',
				text:'Вызвана функция delete контроллера до его инициализации'
			}
		};

		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( !query ) {
		//Логирование ошибки
		objDescriptioneError = {
			type: 'invalid_function_arguments',
			variant: 1,
			place: 'Controller.delete',
			time: new Date().getTime(),
			sender:sender,
			descriptione: {
				title:'Controller: Parameter query is not set',
				text:'Вызвана функция delete с неопределенным или равным нулю аргументом query'
			}
		};

		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( query.user ) {
		//Простое удаление одного пользователя
		var login = query.user.login || null;
		var _id = query.user._id || null;

		ModuleUser.delete( client, sender, _id, login, function(err, reply){
			if ( err ){
				callback( err );
			} else {
				callback(null, reply);
			}
		} );
	} else if ( query.role ) {
	    ModuleUser.deleteRole(client, sender, query.role, function(err, reply){
			if ( err && reply ){
				callback( err, reply );
			} else if ( reply ){
				callback(null, reply);
			} else {
				callback( err );
			}
		} );
	} else if ( query.access ) {
		//Запроса на создание прав
		if ( query.access.viewName ) {
			//Запрос на удаление прав view
			if ( query.access.role ) {
				//Запрос на удаление прав view по роли
				//Создаем модель прав по роли для view
				AccessModuleView.deleteForRole( client, query.access.role, query.access.viewName,
					callback );
			} else if ( query.access.login ) {
				//Запрос на удаление прав view по пользователю
				//Удаляем запрашиваемый объект прав
				AccessModuleView.deleteForUser( client, query.access.login, query.access.viewName,
					callback );
			} else {

				//Логирование ошибки
				objDescriptioneError = {
					type: 'invalid_function_arguments',
					variant: 2,
					place: 'Controller.delete',
					time: new Date().getTime(),
					sender:sender,
					arguments:{
						query:query
					},
					descriptione: {
						title:'Controller: Not set role or login in query',
						text:'Вызвана функция delete, без указания в query.access параметров ' +
							'логина или роли пользователя при указанном параметре viewName'
					}
				};

				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
			}
		} else if ( query.access.flexoSchemeName ) {
			if ( query.access.role ) {
				//Запрос на удаление прав flexo по роли

				//Удаляем запрашиваемый объект прав
				AccessModuleFlexo.deleteForRole( client, query.access.role,
					query.access.flexoSchemeName, callback );

			} else if ( query.access.login ) {
				//Запрос на удаление прав flexo по пользователю

				//Удаляем запрашиваемый объект прав
				AccessModuleFlexo.deleteForUser( client, query.access.login,
					query.access.flexoSchemeName, callback );

			} else {
				//Логирование ошибки
				objDescriptioneError = {
					type: 'invalid_function_arguments',
					variant: 3,
					place: 'Controller.delete',
					time: new Date().getTime(),
					sender:sender,
					arguments:{
						query:query
					},
					descriptione: {
						title:'Controller: Not set role or login in query',
						text:'Вызвана функция delete, без указания в query.access параметров ' +
							'логина или роли пользователя при указанном параметре flexoSchemeName'
					}
				};

				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
			}
		} else {
			//Логирование ошибки
			objDescriptioneError = {
				type: 'invalid_function_arguments',
				variant: 4,
				place: 'Controller.delete',
				time: new Date().getTime(),
				sender:sender,
				arguments:{
					query:query
				},
				descriptione: {
					title:'Controller: Incorrect parameter access in query',
					text:'Вызвана функция delete, без указания в query.access параметра viewName ' +
						'или flexoSchemeName'
				}
			};

			ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
		}
	} else {
		//Логирование ошибки
		objDescriptioneError = {
			type: 'invalid_function_arguments',
			variant: 5,
			place: 'Controller.delete',
			time: new Date().getTime(),
			sender:sender,
			arguments:{
				query:query
			},
			descriptione: {
				title:'Controller: Incorrect parameter query',
				test:'Вызвана функция delete, без указания в query параметров access, role или user'
			}
		};

		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	}
};

Controller.modify = function modify( query, sender, callback ) {
	//Переменная для хранения описания ошибки
	var objDescriptioneError;

	if ( !underscore.isFunction( callback ) ){
		throw new Error( 'Controller: callback not a function' );
	} else if ( !INITIALIZED ) {
		//Логирование ошибки
		objDescriptioneError = {
			type: 'initialization',
			variant: 1,
			place: 'Controller.modify',
			time: new Date().getTime(),
			sender: sender,
			arguments:{
				query:query
			},
			descriptione: {
				title:'Controller: initialization required',
				text:'Вызвана функция modify контроллера до его инициализации'
			}
		};

		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( !query ) {
		//Логирование ошибки
		objDescriptioneError = {
			type: 'invalid_function_arguments',
			variant: 1,
			place: 'Controller.modify',
			time: new Date().getTime(),
			sender:sender,
			descriptione: {
				title:'Controller: Parameter query is not set',
				text:'Вызвана функция modify с неопределенным или равным нулю аргументом query'
			}
		};

		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( query.user ) {
		//Простая модификация одного пользователя
		var _id = query.user._id || null;

		//Сохраняем данные во view
		//ToDo:согласовать названия для view и flexo
		var request = [ {
			selector: {  'a1': _id, 'a2': query.user.tsUpdate },
			properties: { 'a3': query.user.login, 'a4': query.user.company_id,
				'a5': query.user.name, 'a6':query.user.lastname, 'a7':query.user.role,
				'a8':query.user.lastname + ' ' + query.user.name}
		} ];

		if(query.user.email){
			request[0].properties['a9'] = query.user.email;
		}

		if(query.user.phone){
			request[0].properties['a10'] = query.user.phone;
		}

		var options = {company_id:sender.company_id, user_id: sender.userId, role:sender.role};
		View.modify( 'sys_users', request, options, function( err, documents ) {
			if ( err ) {
				//Логирование ошибки
				objDescriptioneError = {
					type: 'unknown_error',
					variant: 2,
					place: 'View.modify',
					time: new Date().getTime(),
					sender:sender,
					arguments:{
						viewName:'sys_users',
						request:request
					},
					descriptione: {
						title: err.message || err,
						text:'Ошибка полученная в функции обратного вызова при ' +
							'вызове функции view.modify при сохранение логина и _id компании ' +
							'пользователя'
					}
				};

				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
			} else if( documents[0]['a1'] ) {
				var document = underscore.clone( query.user );
				document.tsUpdate = documents[0]['a2'];
				document.fullname = query.user.lastname + ' ' + query.user.name;

				ModuleUser.modify( client, sender, _id, document, function(err, reply){
					if ( err ){
						callback( err );
					} else {
						callback(null, reply);
					}
				} );
			} else {
				//ToDo:не возвращен идентификатор
				callback( 'Controller: view not return _id' );
			}
		} );
	} else if ( query.access ) {
		//Запроса на создание прав
		if ( query.access.viewName ) {
			//Запрос на создание прав view
			if ( query.access.role ) {
				//Запрос на создание прав view по роли
				AccessModuleView.save( client, query.access.role, query.access.viewName,
					query.access.objAccess, globalViewConfig[query.access.viewName], callback );
			} else if ( query.access.login ) {
				//Запрос на создание прав view по пользователю
				AccessModuleView.save( client, query.access.login, query.access.viewName,
					query.access.objAccess, globalViewConfig[query.access.viewName], callback );
			} else {
				//Логирование ошибки
				objDescriptioneError = {
					type: 'invalid_function_arguments',
					variant: 2,
					place: 'Controller.modify',
					time: new Date().getTime(),
					sender:sender,
					arguments:{
						query:query
					},
					descriptione: {
						title:'Controller: Not set role or login in query',
						text:'Вызвана функция modify, без указания в query.access параметров ' +
							'логина или роли пользователя при указанном параметре viewName'
					}
				};

				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
			}
		} else if ( query.access.flexoSchemeName ) {
			if ( query.access.role ) {
				//Запрос на создание прав flexo по роли
				AccessModuleFlexo.saveForRole( client, sender, query.access.role,
					query.access.flexoSchemeName, query.access.objAccess, callback );
			} else if ( query.access.login ) {
				//Запрос на создание прав view по пользователю
				AccessModuleFlexo.saveForUser( client, sender, query.access.login,
					query.access.flexoSchemeName, query.access.objAccess, callback );
			} else {
				//Логирование ошибки
				objDescriptioneError = {
					type: 'invalid_function_arguments',
					variant: 3,
					place: 'Controller.modify',
					time: new Date().getTime(),
					sender:sender,
					arguments:{
						query:query
					},
					descriptione: {
						title:'Controller: Not set role or login in query',
						text:'Вызвана функция modify, без указания в query.access параметров ' +
							'логина или роли пользователя при указанном параметре flexoSchemeName'
					}
				};

				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
			}
		} else {
			//Логирование ошибки
			objDescriptioneError = {
				type: 'invalid_function_arguments',
				variant: 4,
				place: 'Controller.modify',
				time: new Date().getTime(),
				sender:sender,
				arguments:{
					query:query
				},
				descriptione: {
					title:'Controller: Incorrect parameter access in query',
					text:'Вызвана функция modify, без указания в query.access параметра viewName ' +
						'или flexoSchemeName'
				}
			};

			ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
		}
	} else {
		//Логирование ошибки
		objDescriptioneError = {
			type: 'invalid_function_arguments',
			variant: 5,
			place: 'Controller.modify',
			time: new Date().getTime(),
			sender:sender,
			arguments:{
				query:query
			},
			descriptione: {
				title:'Controller: Incorrect parameter query',
				test:'Вызвана функция modify, без указания в query параметров access или user'
			}
		};

		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	}
};

Controller.getTemplate = getTemplate;

function getTemplate(object, socket, callback ) {
	var viewName = object.viewName || null;
	var sender = {
		userId: socket.userId || null,
		role: socket.role || null,
		login: socket.login || null,
		place: object.place || null,
		company_id:socket.company_id || null
	};

	var objDescriptioneError;
	if (!underscore.isFunction(callback)){
		throw new Error( 'Controller: callback not a function' );
	} else if ( !INITIALIZED ) {
		//Логирование ошибки
		objDescriptioneError = {
			type: 'initialization',
			variant: 1,
			place: 'Controller.getTemplate',
			time: new Date().getTime(),
			sender: sender,
			arguments:{
				viewName:viewName
			},
			descriptione: {
				title:'Controller: initialization required',
				text:'Вызвана функция getTemplate контроллера до его инициализации'
			}
		};

		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( !underscore.isString( viewName ) && globalViewConfig[viewName] ) {
		//Логирование ошибки
		objDescriptioneError = {
			type: 'invalid_function_arguments',
			variant: 1,
			place: 'Controller.getTemplate',
			time: new Date().getTime(),
			sender:sender,
			descriptione: {
				title:'Controller: Parameter viewName is not set or value not exist in global',
				text:'Вызвана функция getTemplate с неопределенным, равным нулю или несуществующим ' +
					'аргументом viewName'
			}
		};

		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( !underscore.isString( sender.login ) ) {
		//Логирование ошибки
		objDescriptioneError = {
			type: 'invalid_function_arguments',
			variant: 2,
			place: 'Controller.getTemplate',
			time: new Date().getTime(),
			sender:sender,
			arguments:{
				viewName:viewName
			},
			descriptione: {
				title:'Controller: Parameter login is not set in socket',
				text:'Вызвана функция getTemplate с неопределенным или равным нулю параметром ' +
					'login в аргументе sender'
			}
		};

		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( !underscore.isString( sender.role ) ) {
		//Логирование ошибки
		objDescriptioneError = {
			type: 'invalid_function_arguments',
			variant: 3,
			place: 'Controller.getTemplate',
			time: new Date().getTime(),
			sender:sender,
			arguments:{
				viewName:viewName
			},
			descriptione: {
				title:'Controller: Parameter role is not set in socket',
				text:'Вызвана функция getTemplate с неопределенным или равным нулю параметром ' +
					'role в аргументе sender'
			}
		};

		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( !socket ) {
		//Логирование ошибки
		objDescriptioneError = {
			type: 'invalid_function_arguments',
			variant: 4,
			place: 'Controller.getTemplate',
			time: new Date().getTime(),
			sender:sender,
			arguments:{
				viewName:viewName
			},
			descriptione: {
				title:'Controller: Parameter socket is not set',
				text:'Вызвана функция getTemplate с неопределенным или равным нулю аргументом ' +
					'socket'
			}
		};

		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else
	//Проверяем есть ли уже готовый список разрешенных мдентификаторов для view
	if( socket.view && socket.view[viewName] ) {
		//Подготовленный список _vid есть
		//ToDo:Временное фиксация времени
		var time = new Date().getTime();
		//Запрашиваем шаблон view c необходимыми параметрами
		View.getTemplate( viewName, socket.view[viewName].ids, function( err, ids, config, template ) {
			if( err ) {

					//Логирование ошибки
					objDescriptioneError = {
						type: 'unknown_error',
						variant: 1,
						place: 'View.getTemplate',
						time: new Date().getTime(),
						sender:sender,
						arguments:{
							viewName:viewName,
							list_vidsFromSocket:socket.view[viewName].ids
						},
						descriptione: {
							title: err.message || err,
							text:'Ошибка полученная в функции обратного вызова при вызове ' +
								'функции view.getTemplate'
						}
					};

					ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);

			} else {

				if( socket.view[viewName].ids.length !== ids.length ) {
					//Перезапись разрешенного списка _vid
					socket.view[viewName].ids = ids;

					//ToDo: оптимизировать формирование списков
					//Формируем 2 дополнительных списка на создание и чтение
					var listForRead = [];
					for( var i = 0; i < ids.length ; i++ ) {
						var globalVid = globalViewConfig[viewName][ids[i]];
						if ( globalVid.flexo ) {
							if ( globalVid.type === READ || globalVid.type === MODIFY ) {
								listForRead.push( ids[i] );
							}
						}
					}

					socket.view[viewName].listForRead = listForRead;

					//Логирование ошибки целостности, так как view обрезала список разрешенных
					//идентификаторов
					var objDescriptioneError = {
						type:'loss_integrity',
						variant:1,
						place:'View.getTemplate',
						time:new Date().getTime(),
						sender:sender,
						arguments:{
							viewName:viewName,
							list_vidsFromSocket:socket.view[viewName].ids
						},
						descriptione: {
							text:'Ошибка целостности, так как view обрезала список разрешенных ' +
								'идентификаторов при наличии списка разрешенных идентификаторов' +
								'прикрепленных к socket',
							vidsFromView:ids
						}
					};

					ModuleErrorLogging.save(client, [objDescriptioneError], function( err, reply ) {
						if ( err ) {
							callback( err );
						} else {
							callback( null, config, template, time );
						}
					} );
				} else {
                	callback( null, config, template, time );
				}
			}
		});
	} else {
		//Нет прав подготавливаем права и flexo модели
		formingFlexoAndView( sender, viewName, function ( err, listAllowedOf_vid, useId ) {
			if ( err ) {
				callback( err );
			} else {
				//Создаем view
				//ToDo:Временное фиксация времени
				var time = new Date().getTime();
				View.getTemplate( viewName, listAllowedOf_vid, function( err, ids, config, template ) {
					if( err ) {

						//Логирование ошибки
						objDescriptioneError = {
							type: 'unknown_error',
							variant: 2,
							place: 'View.getTemplate',
							time: new Date().getTime(),
							sender:sender,
							arguments:{
								viewName:viewName,
								listAllowedOf_vid:listAllowedOf_vid
							},
							descriptione: {
								title: err.message || err,
								text:'Ошибка полученная в функции обратного вызова при вызове ' +
									'функции view.getTemplate'
							}
						};

						ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
					} else {
						if ( !socket.view ) {
							socket.view = {};
						}
						//ToDo: оптимизировать формирование списков
						//Формируем 2 дополнительных списка на создание и чтение
						var listForRead = [];
						for( var i = 0; i < ids.length ; i++ ) {
							var globalVid = globalViewConfig[viewName][ids[i]];
							if ( globalVid.flexo ) {
								if ( globalVid.type === READ || globalVid.type === MODIFY ) {
									listForRead.push( ids[i] );
								}
							}
						}

						socket.view[viewName] = {ids:ids, useId:!!useId, listForRead:listForRead};

						if( listAllowedOf_vid.length !== ids.length ){
							//Логирование ошибки целостности, так как view обрезала список
							// разрешенных идентификаторов
							var objDescriptioneError = {
								type:'loss_integrity',
								variant:2,
								place:'View.getTemplate',
								time:new Date().getTime(),
								sender:sender,
								arguments:{
									viewName:viewName,
									listAllowedOf_vid:listAllowedOf_vid
								},
								descriptione: {
									text:'Ошибка целостности, так как view обрезала сформированный ' +
										'список разрешенных идентификаторов',
									vidsFromView:ids
								}
							};

							ModuleErrorLogging.save(client, [objDescriptioneError],
								function( err, reply ) {
								if ( err ) {
									callback( err );
								} else {
									callback( null, config, template, time );
								}
							} );
						} else {
                        	callback( null, config, template, time );
						}
					}
				});
			}

		} );

	}
}

Controller.queryToView = function queryToView( object, socket, callback ) { //type, sender, request, viewName, socket, callback ) {
	var type = object.type || null;
	var sender = {
		userId: socket.userId || null,
		role: socket.role || null,
		login: socket.login || null,
		place: object.place || null,
		company_id:socket.company_id || null
	};
	var request = object.request || null;
	var viewName = object.viewName || null;

	var objDescriptioneError;
	if ( !underscore.isFunction( callback ) ) {
		throw new Error( 'Controller: callback not a function' );
	} else if ( !sender.company_id ) {
		//Логирование ошибки
		objDescriptioneError = {
			type: 'invalid_function_arguments',
			variant: -1,
			place: 'Controller.queryToView',
			time: new Date().getTime(),
			sender:sender,
			arguments:{
				type:type,
				request:request,
				viewName:viewName
			},
			descriptione: {
				title:'Controller: Parameter company_id not set in socket',
				text:'Вызвана функция queryToView с неопределенным или равным нулю аргументом ' +
					'socket'
			}
		};

		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( !socket ) {
		//Логирование ошибки
		objDescriptioneError = {
			type: 'invalid_function_arguments',
			variant: 1,
			place: 'Controller.queryToView',
			time: new Date().getTime(),
			sender:sender,
			arguments:{
				type:type,
				request:request,
				viewName:viewName
			},
			descriptione: {
				title:'Controller: Parameter socket is not set',
				text:'Вызвана функция queryToView с неопределенным или равным нулю аргументом ' +
					'socket'
			}
		};

		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( !INITIALIZED ) {
		//Логирование ошибки
		objDescriptioneError = {
			type: 'initialization',
			variant: 1,
			place: 'Controller.queryToView',
			time: new Date().getTime(),
			sender: sender,
			arguments:{
				type:type,
				request:request,
				viewName:viewName,
				socketViews:socket.view
			},
			descriptione: {
				title:'Controller: initialization required',
				text:'Вызвана функция queryToView контроллера до его инициализации'
			}
		};

		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( !underscore.isString( viewName ) ) {
		//Логирование ошибки
		objDescriptioneError = {
			type: 'invalid_function_arguments',
			variant: 2,
			place: 'Controller.queryToView',
			time: new Date().getTime(),
			sender:sender,
			arguments:{
				type:type,
				request:request,
				socketViews:socket.view
			},
			descriptione: {
				title:'Controller: Parameter viewName is not set',
				text:'Вызвана функция queryToView с неопределенным или равным нулю аргументом ' +
					'viewName'
			}
		};

		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( !request ) {
		//Логирование ошибки
		objDescriptioneError = {
			type: 'invalid_function_arguments',
			variant: 3,
			place: 'Controller.queryToView',
			time: new Date().getTime(),
			sender:sender,
			arguments:{
				type:type,
				viewName:viewName,
				socketViews:socket.view
			},
			descriptione: {
				title:'Controller: Parameter request is not set',
				text:'Вызвана функция queryToView с неопределенным или равным нулю аргументом ' +
					'request'
			}
		};

		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	} else if ( type !== READ && !underscore.isArray( request ) ) {
		//Логирование ошибки
		objDescriptioneError = {
			type: 'invalid_function_arguments',
			variant: 4,
			place: 'Controller.queryToView',
			time: new Date().getTime(),
			sender:sender,
			arguments:{
				type:type,
				viewName:viewName,
				socketViews:socket.view,
				request:request
			},
			descriptione: {
				title:'Controller: Parameter request is not array',
				text:'Вызвана функция queryToView с типом запроса который подразумевает, что ' +
					'аргумент request должен быть массивом'
			}
		};

		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	}

	if( socket.view && socket.view[viewName] ) {
		//Подготовленный список разрешенных _vid есть
		if( type === READ ) {

			if( checkRead( viewName, request, socket.view ) ) {
				//Вызываем view c необходимыми параметрами
				//Формируем объект параметров для View
				var options = {
					company_id: sender.company_id,
					user_id: sender.userId,
					role: sender.role
				};
				//ToDo:временно зачекается время
				var time = new Date().getTime();
				View.find( viewName, socket.view[viewName].listForRead, request, options,
					function ( err, documents ) {
					if ( err ) {
						//Логирование ошибки
						objDescriptioneError = {
							type: 'unknown_error',
							variant: 1,
							place: 'View.find',
							time: new Date().getTime(),
							sender:sender,
							arguments:{
								viewName:viewName,
								list_vidsFromSocket:socket.view[viewName].ids,
								request:request,
								optionsView:options
							},
							descriptione: {
								title: err.message || err,
								text:'Ошибка полученная в функции обратного вызова при вызове ' +
									'функции view.find'
							}
						};

						ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
					} else {
						callback( null, documents, null, time );
					}
				} );

			} else {
				//Логирование ошибки
				objDescriptioneError = {
					type: 'access_violation',
					variant: 1,
					place: 'Controller.checkRead',
					time: new Date().getTime(),
					sender:sender,
					arguments:{
						viewName:viewName,
						list_vidsFromSocket:socket.view[viewName].ids,
						request:request
					},
					descriptione: {
						title:'Controller: No permission to read in view ' + viewName + ' or not correct request',
						text:'Запрашиваются несуществующие или неразрешенные идентификаторы на ' +
							'чтение view в request, или некоректный запрос'
					}
				};

				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
			}

		} else if ( type === CREATE ) {

			if( checkCreate( viewName, request, socket.view[viewName].ids ) ) {
				//Вызываем view c необходимыми параметрами
				//Формируем объект параметров для View
				var options = {
					company_id:sender.company_id,
					user_id: sender.userId,
					role: sender.role
				};

				View.insert( viewName, socket.view[viewName].listForRead, request, options,
					function ( err, documents ) {
					if ( err ) {
						//Логирование ошибки
						objDescriptioneError = {
							type: 'unknown_error',
							variant: 1,
							place: 'View.insert',
							time: new Date().getTime(),
							sender:sender,
							arguments:{
								viewName:viewName,
								list_vidsFromSocket:socket.view[viewName].ids,
								request:request,
								optionsView:options
							},
							descriptione: {
								title: err.message || err,
								text:'Ошибка полученная в функции обратного вызова при вызове ' +
									'функции view.insert'
							}
						};

						ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
					} else {
						callback( null, documents );
					}
				} );
			} else {
				//Логирование ошибки
				objDescriptioneError = {
					type: 'access_violation',
					variant: 1,
					place: 'Controller.checkCreate',
					time: new Date().getTime(),
					sender:sender,
					arguments:{
						viewName:viewName,
						list_vidsFromSocket:socket.view[viewName].ids,
						request:request
					},
					descriptione: {
						title:'Controller: No permission to create in view ' + viewName + ' or not correct request',
						text:'Запрашиваются несуществующие или неразрешенные идентификаторы на' +
							'создание view в request, или некоректный запрос'
					}
				};

				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
			}

		} else if ( type === MODIFY ) {

			if( checkModify( viewName, request, socket.view[viewName].ids ) ) {
				//Вызываем view c необходимыми параметрами
				//Формируем объект параметров для View
				var options = {
					company_id:sender.company_id,
					user_id: sender.userId,
					role: sender.role
				};

				View.modify( viewName, request, options, function ( err, documents ) {
					if ( err ) {
						//Логирование ошибки
						objDescriptioneError = {
							type: 'unknown_error',
							variant: 1,
							place: 'View.modify',
							time: new Date().getTime(),
							sender:sender,
							arguments:{
								viewName:viewName,
								request:request,
								optionsView:options
							},
							descriptione: {
								title: err.message || err,
								text:'Ошибка полученная в функции обратного вызова при вызове ' +
									'функции view.modify'
							}
						};

						ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
					} else {
						callback( null, documents );
					}
				} );
			} else {
				//Логирование ошибки
				objDescriptioneError = {
					type: 'access_violation',
					variant: 1,
					place: 'Controller.checkModify',
					time: new Date().getTime(),
					sender:sender,
					arguments:{
						viewName:viewName,
						list_vidsFromSocket:socket.view[viewName].ids,
						request:request
					},
					descriptione: {
						title:'Controller: No permission to modify in view ' + viewName + ' or not correct request',
						text:'Запрашиваются несуществующие или неразрешенные идентификаторы на' +
							'модификацию view в request, или некоректный запрос'
					}
				};

				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
			}

		} else if ( type === DELETE ) {

			if( checkDelete( viewName, request, socket.view[viewName].ids ) ) {
				//Формируем объект параметров для View
				var options = {
					company_id:sender.company_id,
					user_id: sender.userId,
					role: sender.role
				};

				View.delete( viewName, request, options, function ( err, documents ) {
					if ( err ) {
						//Логирование ошибки
						objDescriptioneError = {
							type: 'unknown_error',
							variant: 1,
							place: 'View.delete',
							time: new Date().getTime(),
							sender:sender,
							arguments:{
								viewName:viewName,
								request:request,
								optionsView:options
							},
							descriptione: {
								title: err.message || err,
								text:'Ошибка полученная в функции обратного вызова при вызове ' +
									'функции view.delete'
							}
						};

						ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
					} else {
						callback( null, documents );
					}
				} );
			} else {
				//Логирование ошибки
				objDescriptioneError = {
					type: 'access_violation',
					variant: 1,
					place: 'Controller.checkDelete',
					time: new Date().getTime(),
					sender:sender,
					arguments:{
						viewName:viewName,
						list_vidsFromSocket:socket.view[viewName].ids,
						request:request
					},
					descriptione: {
						title:'Controller: No permission to delete in view ' + viewName + ' or not correct request',
						text:'Запрашиваются неразрешенная операция на удаление view в request, или некоректный запрос'
					}
				};

				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
			}

		} else {
			//Логирование ошибки
			objDescriptioneError = {
				type: 'invalid_function_arguments',
				variant: 5,
				place: 'Controller.queryToView',
				time: new Date().getTime(),
				sender:sender,
				arguments:{
					type:type,
					viewName:viewName,
					socketViews:socket.view,
					request:request
				},
				descriptione: {
					title:'Controller: Unknown type of request',
					text:'Вызвана функция queryToView с неизвестным значением параметра type'
				}
			};

			ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
		}

	} else {
		//Логирование ошибки
		objDescriptioneError = {
			type: 'invalid_function_arguments',
			variant: 6,
			place: 'Controller.queryToView',
			time: new Date().getTime(),
			sender:sender,
			arguments:{
				type:type,
				viewName:viewName,
				socketViews:socket.view,
				request:request
			},
			descriptione: {
				title:'Controller: There is no list of approved viewIDs in socket or ' +
					'requested data without requiring a template or config',
				text:'Вызвана функция queryToView до вызова шаблона для данной view, иначе говоря' +
					'отсутствует список разрешенных идентификаторов прикрепленных к socket'
			}
		};

		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	}
};

function checkRead( viewName, queries, socketView ) {
	//ToDo:
	if(! queries.selector && typeof(queries.selector) !== "object"){
		return false;
	}

	if (!globalViewConfig[viewName]){
		return false;
	}

	//Переменная для хранения списка view в селекторе
	var viewsFromSelector = Object.keys( queries.selector );

	//Обходим селектор
	for( var i = 0; i < viewsFromSelector.length; i++ ) {
		if( !queries.selector[viewsFromSelector[i]] &&
			typeof(queries.selector[viewsFromSelector[i]]) !== "object"){
			return false
		}

		//Список идентификаторов из селектора
		var _vidsFromSelector = Object.keys( queries.selector[viewsFromSelector[i]] );

		//Проверяем наличие разрешений в глобальной переменной
		if (!globalViewConfig[viewsFromSelector[i]]){
			return false;
		}

		//Пересекаем с разрешенным списком _vids
		if ( !socketView[viewsFromSelector[i]] ){
			//Нет описания о идентификаторов принадлежных к данной view, поэтому не может быть запросов
			//на не существующие идентификаторы
			return false;
		} else {
			var unresolvedFields  = underscore.difference( _vidsFromSelector,
				socketView[viewsFromSelector[i]].ids );
			//Проверяем есть ли неразрешенные идентификаторы
			if ( unresolvedFields.length !== 0 ) {
				return false;
			}

			for( var j = 0; j < _vidsFromSelector.length; j++ ) {
				//Проверяем имеет ли запрашиваемый _vids доступ на чтение в глобальной переменной
				var _vidsDataFromViewConfig =
					globalViewConfig[viewsFromSelector[i]][_vidsFromSelector[j]];
				if ( !( _vidsDataFromViewConfig && _vidsDataFromViewConfig.flexo &&
					_vidsDataFromViewConfig.flexo.length > 1 &&
					( _vidsDataFromViewConfig.type === READ ||
					_vidsDataFromViewConfig.type === MODIFY ) ) ) {
					return false;
				}
			}
		}
	}

	if( queries.options && queries.options.sort) {
		if ( typeof(queries.options.sort) !== "object" ) {
			return false;
		}
		//_vidsFromSort = Object.keys( queries.options.sort );

		//Объединяем массива для проверок в один
		var _vidsForSort =  Object.keys(queries.options.sort);
		//Пересекаем с разрешенным списком _vids
		var unresolvedFields  = underscore.difference( _vidsForSort, socketView[viewName].ids  );

		if ( unresolvedFields.length !== 0 ) {
			return false;
		}

		//Проверяем имеет ли запрашиваемый _vids доступ на чтение в глобальной переменной
		for( var i=0; i < _vidsForSort.length; i++ ) {
			_vidsDataFromViewConfig = globalViewConfig[viewName][_vidsForSort[i]];
			if ( !( _vidsDataFromViewConfig && _vidsDataFromViewConfig.flexo &&
				_vidsDataFromViewConfig.flexo.length > 1 &&	( _vidsDataFromViewConfig.type === READ ||
					_vidsDataFromViewConfig.type === MODIFY ) ) ) {
				return false;
			}
		}
	}

	return true;
}

function checkCreate( viewName, queries, listOfAllowed_vids ) {
	//Список идентификаторов _vids view из запроса на проверку
	var _vidsForCheck = [];
	//Список не разрешенных полей
	var unresolvedFields;
	//Для организации циклов
	var i;
	//Информация для заданной view из глобального конфига
	var dataFromViewConfig = globalViewConfig[viewName];
	//Переменная для хранения информации о анализируемом идентификаторе view из глобального конфига
	var _vidsDataFromViewConfig;

	if( !dataFromViewConfig ) {
		//Нет описания о идентификаторов принадлежных к данной view, поэтому не может быть запросов
		//на не существующие идентификаторы
		//ToDo:логировать запрос к несуществующим идентификатарам
		return false;
	}

	//Формируем список полей на проверку

	for( i = 0; i < queries.length; i++ ) {
		var _vidsFromOneDocument = [];

		if( typeof(queries[i]) !== "object" ){
			return false;
		}

		if( !underscore.isEmpty( queries[i] ) ) {
			_vidsFromOneDocument = Object.keys( queries[i] );
		}

		_vidsForCheck = underscore.union(_vidsForCheck, _vidsFromOneDocument);
	}

	if( _vidsForCheck.length === 0 ) {
		return false;
	}

	//Пересекаем с разрешенным списком _vids
	unresolvedFields  = underscore.difference(_vidsForCheck, listOfAllowed_vids);

	if (unresolvedFields.length !== 0){
		return false;
	}

	//Проверяем имеет ли запрашиваемый _vids доступ к flexo в глобальной переменной
	for( i = 0; i < _vidsForCheck.length; i++ ) {
		_vidsDataFromViewConfig = dataFromViewConfig[_vidsForCheck[i]];
		if (!( _vidsDataFromViewConfig && _vidsDataFromViewConfig.flexo &&
			_vidsDataFromViewConfig.flexo.length > 1 &&
			//_vidsDataFromViewConfig.type === CREATE ) ) {
			_vidsDataFromViewConfig.type === MODIFY ) ) {
			return false;
		}
	}

	return true;
}

function checkModify( viewName, queries, listOfAllowed_vids ) {
	//Список идентификаторов _vids view из запроса на проверку
	var _vidsForCheck = [];
	//Список не разрешенных полей
	var unresolvedFields;
	//Для организации циклов
	var i;
	//Информация для заданной view из глобального конфига
	var dataFromViewConfig = globalViewConfig[viewName];
	//Переменная для хранения информации о анализируемом идентификаторе view из глобального конфига
	var _vidsDataFromViewConfig;

	if( !dataFromViewConfig ) {
		//Нет описания о идентификаторов принадлежных к данной view, поэтому не может быть запросов
		//на не существующие идентификаторы
		//ToDo:логировать запрос к несуществующим идентификатарам
		return false;
	}


	//Формируем список полей на проверку
	for( i = 0; i < queries.length; i++ ) {
		var _vidsFromOneDocument = [];

		if ( typeof(queries[i]) !== "object" ) {
			return false;
		}

		if ( typeof(queries[i].properties) !== "object" ) {
			return false;
		}

		if( !underscore.isEmpty( queries[i].properties ) ) {
			_vidsFromOneDocument = Object.keys( queries[i].properties );
		}
		_vidsForCheck = underscore.union( _vidsForCheck, _vidsFromOneDocument );
	}

	if( _vidsForCheck.length === 0 ) {
		return false;
	}

	//Пересекаем с разрешенным списком _vids
	unresolvedFields  = underscore.difference( _vidsForCheck, listOfAllowed_vids );

	if (unresolvedFields.length !== 0){
		return false;
	}

	//Проверяем имеет ли запрашиваемый _vids доступ к flexo в глобальной переменной
	for( i = 0; i < _vidsForCheck.length; i++ ) {
		_vidsDataFromViewConfig = dataFromViewConfig[_vidsForCheck[i]];
		if ( !( _vidsDataFromViewConfig && _vidsDataFromViewConfig.flexo &&
			_vidsDataFromViewConfig.flexo.length > 1 &&
			_vidsDataFromViewConfig.type === MODIFY ) ) {
			return false;
		}
	}

	return true;
}

function checkDelete( viewName, queries, listOfAllowed_vids ) {
	//Список идентификаторов _vids view из запроса на проверку
	var _vidsForCheck = [];
	//Список не разрешенных полей
	var unresolvedFields;
	//Список участвующих в операции удаления flexo схем
	var flexoScheme = [];
	//Для организации циклов
	var i, j;
	//Информация для заданной view из глобального конфига
	var dataFromViewConfig = globalViewConfig[viewName];
	//Переменная для хранения информации о анализируемом идентификаторе view из глобального конфига
	var _vidsDataFromViewConfig;

	if( !dataFromViewConfig ) {
		//Нет описания о идентификаторов принадлежных к данной view, поэтому не может быть запросов
		//на не существующие идентификаторы
		//ToDo:логировать запрос к несуществующим идентификатарам
		return false;
	}

    //Формируем список полей на проверку
	for( i = 0; i < queries.length; i++ ) {
		var _vidsFromOneDocument = [];

		if ( typeof(queries[i]) !== "object" ) {
			return false;
		}

		if( !underscore.isEmpty( queries[i] ) ) {
			_vidsFromOneDocument = Object.keys( queries[i] );
		}
		_vidsForCheck = underscore.union( _vidsForCheck, _vidsFromOneDocument );
	}

	if( _vidsForCheck.length === 0 ) {
		return false;
	}

	//Пересекаем с разрешенным списком _vids
	unresolvedFields  = underscore.difference( _vidsForCheck, listOfAllowed_vids );

	if (unresolvedFields.length !== 0){
		return false;
	}

	//Проверяем имеет ли запрашиваемый _vids доступ к flexo в глобальной переменной
	for( i = 0; i < _vidsForCheck.length; i++ ) {
		_vidsDataFromViewConfig = dataFromViewConfig[_vidsForCheck[i]];
		if( _vidsDataFromViewConfig && _vidsDataFromViewConfig.flexo &&
			_vidsDataFromViewConfig.flexo.length > 1 ) {
			flexoScheme.push( _vidsDataFromViewConfig.flexo[0] );
		} else {
			return false;
		}
	}

	//Проверяем есть ли разрешение на удаление для данной flexo схемы
	flexoScheme = underscore.uniq( flexoScheme );

	for( j = 0; j < flexoScheme.length; j++ ) {
		for( i = 0; i < listOfAllowed_vids.length; i++ ) {
			_vidsDataFromViewConfig = dataFromViewConfig[listOfAllowed_vids[i]];
			if( _vidsDataFromViewConfig && _vidsDataFromViewConfig.flexo &&
				_vidsDataFromViewConfig.flexo.length === 1 &&
				_vidsDataFromViewConfig.flexo[0] === flexoScheme[j] &&
				_vidsDataFromViewConfig.type === DELETE) {
				break;
			}
			if( i === ( listOfAllowed_vids.length - 1 ) ) {
				return false;
			}
		}
	}

	return true;
}

function formingFlexoAndView( sender, viewName, callback ){
	var user = sender.login;
	var role = sender.role;

	//Формируем объект с правами для view
	AccessModuleView.accessPreparation( client, role, user, viewName, globalViewConfig[viewName],
		function( err, listAllowedOf_vid, useId ) {
		if( err ) {
			//ToDo: возможно логирование ошибки от redis
			callback ( err );
		} else if ( listAllowedOf_vid.length === 0 ) {
			//Логирование ошибки
			objDescriptioneError = {
				type: 'access_violation',
				variant: 1,
				place: 'Controller.AccessModuleView.accessPreparation',
				time: new Date().getTime(),
				sender:sender,
				arguments:{
					viewName:viewName
				},
				descriptione: {
					title:'Controller: No permissions access to view ' + viewName,
					text:'Нет разрешений на view в redis для данного пользователя и роли',
					globalView:globalViewConfig[viewName]
				}
			};

			ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
		} else {
			//Формируем список необходимых flexo схем
			var listOfFlexoSchemes = [];
			//Массив объектов с описанием требуемой информации по flexo для каждой _vid
			var list_vidForFlexoCheck = [];
			var list_vidForRemove = [];

			//Информация для заданной view из глобального конфига
			var dataFromViewConfig = globalViewConfig[viewName];

			//Переменная для хранения информации о анализируемом идентификаторе view из
			// глобального конфига
			var _vidsDataFromViewConfig;
			//Массив для хранения ошибок целостности
			var aDescriptioneError = [];

			for( var i = 0; i < listAllowedOf_vid.length ; i++ ){
				_vidsDataFromViewConfig = dataFromViewConfig[listAllowedOf_vid[i]];
				//Проверяем существует ли такой _vid в глобальном описании view
				if( _vidsDataFromViewConfig ) {
					//Проверяем требуется ли flexo данные
					if( _vidsDataFromViewConfig.flexo &&
						_vidsDataFromViewConfig.flexo.length !== 0 ) {
						//Сохраняем данные о требуемой flexo
						var schemeName = _vidsDataFromViewConfig.flexo[0];
                        listOfFlexoSchemes.push( schemeName );
						//ToDo:может переделать на сохранение массива
						//ToDo:Вставляется массив [listAllowedOf_vid, schemeName, fields, type]
						list_vidForFlexoCheck.push({
							listAllowedOf_vid: listAllowedOf_vid[i],
							schemeName: schemeName,
							fields: underscore.without(	_vidsDataFromViewConfig.flexo, schemeName ),
							type: _vidsDataFromViewConfig.type
						});
					}

				} else {
					//Логирование ошибки целостности, разрешен в правах на view для _vid
					//которого нет в глобальной переменной
					var objDescriptioneError = {
						type:'loss_integrity',
						variant:1,
						place: 'Controller.AccessModuleView.accessPreparation',
						time: new Date().getTime(),
						sender:sender,
						arguments:{
							viewName:viewName
						},
						descriptione: {
							text:'Ошибка целостности, так как есть разрешения на элемент view ' +
								'которого нет в глобальной переменной',
							allowedOf_vid:listAllowedOf_vid[i],
							globalView:globalViewConfig[viewName]
						}
					};

					aDescriptioneError.push(objDescriptioneError);

					list_vidForRemove.push( listAllowedOf_vid[i] );
				}
			}

			listOfFlexoSchemes = underscore.uniq( listOfFlexoSchemes );
			listAllowedOf_vid = underscore.difference( listAllowedOf_vid, list_vidForRemove );

			if ( listOfFlexoSchemes.length ) {
				//Подготавливаем объект с правами для view
				AccessModuleFlexo.accessDataPreparation( client, sender, listOfFlexoSchemes,
					globalFlexoSchemes, function( err, flexoAccess ){
					if( err ){
						callback( err );
					} else {
						//Сравниваем разрешения flexo и требуемые разрешения
						var list_vidForRemove = [];
						//Переменная для хранения различия между запрашиваемыми полями по view и
						//полями разрешенными по flexo правам
						var difference;

						for( var i = 0; i < list_vidForFlexoCheck.length; i++ ) {
							if( list_vidForFlexoCheck[i].type === READ ) {

								difference = underscore.difference(
									list_vidForFlexoCheck[i].fields,
									flexoAccess[list_vidForFlexoCheck[i].schemeName][READ] );

								if( difference.length !== 0 ){
									//Запрашиваются поля которые не разрешены в правах
									list_vidForRemove.push(
										list_vidForFlexoCheck[i].listAllowedOf_vid );
								}

							} else if ( list_vidForFlexoCheck[i].type === MODIFY ) {

                                difference = underscore.difference(
									list_vidForFlexoCheck[i].fields,
									flexoAccess[list_vidForFlexoCheck[i].schemeName][MODIFY] );

								if( difference.length !== 0 ) {
									//Запрашиваются поля которые не разрешены в полях
									list_vidForRemove.push(
										list_vidForFlexoCheck[i].listAllowedOf_vid );
								}

							} else if ( list_vidForFlexoCheck[i].type === CREATE ) {

								if( list_vidForFlexoCheck[i].fields.length === 0 ) {
									//Проверяется общее разрешение на создание документа в целом
									if ( flexoAccess[list_vidForFlexoCheck[i].schemeName][CREATEALL]
										!== 1 ) {
										list_vidForRemove.push(
											list_vidForFlexoCheck[i].listAllowedOf_vid );
									}
								} else {

										//Проверяется частные разрешения на создание документа
										difference = underscore.difference(
											list_vidForFlexoCheck[i].fields,
											flexoAccess[list_vidForFlexoCheck[i].schemeName][CREATE]
										);

										if( difference.length !== 0 ){
											//Запрашиваются поля которые не разрешены в полях
											list_vidForRemove.push(
												list_vidForFlexoCheck[i].listAllowedOf_vid );
										}

								}

							} else if ( list_vidForFlexoCheck[i].type === DELETE ) {

								//Проверяется общее разрешение на удаление документа в целом
								if ( flexoAccess[list_vidForFlexoCheck[i].schemeName]['delete']
									!== 1 ) {
									list_vidForRemove.push(
										list_vidForFlexoCheck[i].listAllowedOf_vid );
								}
							}
						}

						listAllowedOf_vid = underscore.difference(
							listAllowedOf_vid, list_vidForRemove );

						if(aDescriptioneError.length !== 0){
							ModuleErrorLogging.save(client, aDescriptioneError,
								function ( err, reply ) {
								if ( err ) {
									callback( err );
								} else {
									callback( null, listAllowedOf_vid, useId );
								}
							});
						} else {
							callback( null, listAllowedOf_vid, useId );
						}
					}
				});
			} else {
				if(aDescriptioneError.length !== 0){
					ModuleErrorLogging.save(client, aDescriptioneError, function ( err, reply ) {
						if ( err ) {
							callback( err );
						} else {
							callback( null, listAllowedOf_vid, useId );
						}
					});
				} else {
					callback( null, listAllowedOf_vid, useId );
				}
			}

		}
	} );
}

Controller.findErrorLogging = function findErrorLogging( options, sender, callback ){
	var objDescriptioneError;

	if ( options ) {
		if ( options.all ) {
			ModuleErrorLogging.findFromMinToMax(client, MIN_DATETIME, MAX_DATETIME, callback);
		} else if ( options.min && options.max ) {
			ModuleErrorLogging.findFromMinToMax(client, options.min, options.max, callback);
		} else if ( options.min ) {
			ModuleErrorLogging.findFromMinToMax(client, options.min, MAX_DATETIME, callback);
		} else if ( options.max ) {
			ModuleErrorLogging.findFromMinToMax(client, MIN_DATETIME, options.max, callback);
		} else {
			//Логирование ошибки
			objDescriptioneError = {
				type: 'invalid_function_arguments',
				variant: 1,
				place: 'Controller.findErrorLogging',
				time: new Date().getTime(),
				sender:sender,
				arguments:{
					options:options
				},
				descriptione: {
					title:'Controller: Incorrect parameters in options',
					text:'Не указаны параметры поиска ошибки в объекте options'
				}
			};

			ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
		}
	} else {
		//Логирование ошибки
		objDescriptioneError = {
			type: 'invalid_function_arguments',
			variant: 2,
			place: 'Controller.findErrorLogging',
			time: new Date().getTime(),
			sender:sender,
			descriptione: {
				title:'Controller: Not set argument options',
				text:'Не определен или равен нулю аргумент функции options'
			}
		};

		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	}
};

Controller.deleteErrorLogging = function deleteErrorLogging( time, option, sender, callback ){
	var objDescriptioneError;

	if ( time ) {
		ModuleErrorLogging.deleteErrorLogging(client, time, callback);
	} else if ( option ) {
		ModuleErrorLogging.deleteAllErrorLogging(client, callback);
	} else {
		//Логирование ошибки
		objDescriptioneError = {
			type: 'invalid_function_arguments',
			variant: 1,
			place: 'Controller.deleteErrorLogging',
			time: new Date().getTime(),
			sender:sender,
			descriptione: {
				title:'Controller: Not set argument time or option',
				text:'Не определен или равен нулю аргумент функции time или option'
			}
		};

		ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
	}
};

Controller.treeData = function treeData( typeContent, typeOperation, oTreeData, callback ) {
	//ToDo:доделать логирование ошибок
	if ( typeContent === 'view' ) {
		if ( typeOperation === 'read' ) {
			var listOfView = Object.keys(globalViewConfig);
			ModuleTreeData.getGeneralTreeView(client, listOfView, callback);
		} else if ( typeOperation === 'write') {
			ModuleTreeData.setGeneralTreeView(client, oTreeData, callback);
		} else {
			callback('Unknown type operation');
		}
	} else if ( typeContent === 'flexo' ) {
		if ( typeOperation === 'read' ) {
			var listOfFlexo = Object.keys(globalFlexoSchemes);
			ModuleTreeData.getGeneralTreeFlexo(client, listOfFlexo, callback);
		} else if ( typeOperation === 'write') {
			ModuleTreeData.setGeneralTreeFlexo(client, oTreeData, callback);
		} else {
			callback('Unknown type operation');
		}
	} else {
		callback('Unknown type content');
	}
};


Controller.saveUploadFileStatus = function(user, idFile, type, status, callback){
	//ToDo:доделать логирование ошибок
	//Формируем ключ редиса
	var redisKey = 'uploadFileStatus:' + user + ':' + idFile + ':' + type;

	client.set(redisKey, status, function(err, reply) {
		if (err) {
			callback(err);
		} else {
			client.expire(redisKey, 60*60*10);
			callback(null, true);
		}
	});
};

Controller.readUploadFileStatus = function(user, idFile, type, callback){
	//ToDo:доделать логирование ошибок

	//Формируем ключ редиса
	var redisKey = 'uploadFileStatus:' + user + ':' + idFile + ':' + type;

	client.get(redisKey, function(err, status) {
		if (err) {
			callback(err);
		} else {
			callback(null, status);
		}
	});
};

Controller.checkUsers = function checkUsers(sender, callback){
	//ToDo:доделать логирование ошибок
	//Получаем список пользорвателей из redis
	ModuleUser.findListOfUsers(client, function( err, listOfUsersFromRedis ){
		if(err){
			callback( err );
		} else {
			//Получаем всех пользователей из mongo
			var request = {selector: { 'sys_users': {} } };
			var options = {company_id:sender.company_id, user_id: sender.userId, role:sender.role};
			View.find( 'sys_users', ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'], request,
				options, function ( err, documentsMongoUsers ) {
					if (err){
						callback(err);
					} else {
						//Список пользователей в mongo
						var listOfUsersFromMongo = [];

						for( var i=0; i<documentsMongoUsers.result[0].length; i++){
							listOfUsersFromMongo.push(documentsMongoUsers.result[0][i]['a3']);
						}

						//Формирую список пользователей, которые есть в mongo и в redis
						var listOfUsersIntersection = underscore.intersection( listOfUsersFromRedis, listOfUsersFromMongo );

						//Формируем список пользователей, которые есть в redis, но нет в mongo
						var listUsersOnlyRedis = underscore.difference( listOfUsersFromRedis, listOfUsersFromMongo );

						//Удаляем пользователей из redis

						async.parallel({
							cheakUsersInRedis:function(cb){

								async.map(
									listUsersOnlyRedis,
									function(login, cbMap){

										//Читаем данные из redis
										ModuleUser.find(client, sender, null, login, function(err, doc){
											if( err ) {
												cbMap(err);
											} else {
												if ( doc && doc.role !== 'admin' ){
													//Удаляем пользователя из Redis
													ModuleUser.delete(client, sender, null, login, cbMap);
												} else {
													cbMap(null, false);
												}
											}
										});

									},
									cb
								)

							},
							cheakUsersInRedisAndMongo:function(cb){

								async.map(
									listOfUsersIntersection,
									function(login, cbMap){

										//Читаем данные из Redis
										ModuleUser.find(client, sender, null, login, function(err, docFromRedis){
											if( err ) {
												cbMap(err);
											} else {

												//Читаем данные из mongo
												var request = {selector: { 'sys_users': {'a3': login} } };
												var options = {company_id:sender.company_id, user_id: sender.userId, role:sender.role};
												View.find( 'sys_users', ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8'], request,
													options, function ( err, docFromMongo ) {

													if (err){
														cbMap(err);
													} else {
											            //Анализируем результат из mongo и redis
														if( docFromRedis.role !== docFromMongo.result[0][0]['a7'] ){
															//Обновлемя данные в mongo
															var request = [ {
																selector: {  'a1': docFromMongo.result[0][0]['a1'], 'a2':docFromMongo.result[0][0]['a2'] },
																properties: { 'a7': docFromRedis.role }
															} ];
															var options = {company_id:sender.company_id, user_id: sender.userId, role:sender.role};
															View.modify( 'sys_users', request, options, function( err, docFromMongoUpdated ) {
																if ( err ) {
																	cbMap(err)
																} else {
																	//Обновляем данные в redis
																	var document = underscore.clone( docFromRedis );
																	document._id = docFromMongoUpdated[0]['a1'];
																	document.tsUpdate = docFromMongoUpdated[0]['a2'];
																	document.name = docFromMongoUpdated[0]['a5'];
																	document.lastname = docFromMongoUpdated[0]['a6'];
																	if(_.isArray(docFromMongoUpdated[0]['a4'])){
																		document.company_id = docFromMongoUpdated[0]['a4'][0];
																	} else {
																		document.company_id = docFromMongoUpdated[0]['a4'];
																	}
																	document.fullname = docFromRedis.lastname + ' ' +  docFromRedis.name;

																	ModuleUser.modifyWithId( client, sender, docFromRedis._id, document._id, document, function(err, reply){
																		if ( err ){
																			cbMap( err );
																		} else {
																			cbMap(null, true);
																		}
																	} );
																}
															});

														} else {

															if ( docFromRedis._id === docFromMongo.result[0][0]['a1'] &&
																docFromRedis.tsUpdate === docFromMongo.result[0][0]['a2'] &&
																docFromRedis.name === docFromMongo.result[0][0]['a5'] &&
																docFromRedis.lastname === docFromMongo.result[0][0]['a6'] &&
																docFromRedis.company_id === docFromMongo.result[0][0]['a4'][0]){
																cbMap(null, false);
															} else {
																//Обновляем данные в redis
																var document = underscore.clone( docFromRedis );
																document._id = docFromMongo.result[0][0]['a1'];
																document.tsUpdate = docFromMongo.result[0][0]['a2'];
																document.name = docFromMongo.result[0][0]['a5'];
																document.lastname = docFromMongo.result[0][0]['a6'];
																document.company_id = docFromMongo.result[0][0]['a4'][0];
																document.fullname = docFromRedis.lastname + ' ' +  docFromRedis.name;

																ModuleUser.modifyWithId( client, sender, docFromRedis._id, document._id, document, function(err, reply){
																	if ( err ){
																		cbMap( err );
																	} else {
																		cbMap(null, true);
																	}
																} );
															}
														}

													}

												});

											}
										});

									},
									cb
								)


							}},
							function(err, results) {
								if( err ){
									callback( err );
								} else {
									var listOfDeleted = underscore.without(results.cheakUsersInRedis, false);
									var listOfRecovery = underscore.without(results.cheakUsersInRedisAndMongo, false);
									callback(null, {delete:listOfDeleted, update:listOfRecovery});
								}

							}
						);

					}
				}
			);

		}
	})

}