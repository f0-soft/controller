var redis = require('redis');
var sys = require('sys');
var async = require('async');
var underscore = require('underscore');

var AccessModelRoleView = require('./access_model_role_view.js');
var AccessModelUserView = require('./access_model_user_view.js');
var AccessModelRoleFlexo = require('./access_model_role_flexo.js');
var AccessModelUserFlexo = require('./access_model_user_flexo.js');

var ModelUser = require('./model_user.js');
var ModelMenu = require('./model_menu.js');

var client;
var globalMenusConfig;
var globalFlexoSchemes;
var globalFormConfig;
var globalViewConfig;
var flexo;
var View;

module.exports = {
	init: init,
	create: Controller
};

/**
 * Инициализация контроллера
 *
 * @param config - объект с параметрами инициализации
 * @param callback
 */
function init( config, callback ) {
	if ( config.view ) {
		View = config.view;
	} else {
		callback( new Error( 'Parameter view is not specified in the config object' ) );
		return;
	}

	if ( config.viewConfig ) {
		globalViewConfig = config.viewConfig;
	} else {
		callback( new Error( 'Parameter viewConfig is not specified in the config object' ) );
		return;
	}

	if ( config.flexoSchemes ) {
		globalFlexoSchemes = config.flexoSchemes;
	} else {
		callback( new Error( 'Parameter flexoSchemes is not specified in the config object' ) );
		return;
	}

	if ( config.menuConfig ) {
		globalMenusConfig = config.menuConfig;
	} else {
		callback( new Error( 'Parameter menuConfig is not specified in the config object' ) );
		return;
	}

	if ( config.formConfig ) {
		globalMenusConfig = config.formConfig;
	} else {
		callback( new Error( 'Parameter formConfig is not specified in the config object' ) );
		return;
	}

	if ( config.redisConfig ) {
		if ( config.redisConfig.max_attempts ) {
			client = redis.createClient( config.redisConfig.port, config.redisConfig.host,
				{ max_attempts: config.redisConfig.max_attempts } );

			client.on( "error", function (err) {
				callback( err );
			});

			client.on( "ready", function (err) {
				callback( null, true );
			});
		} else {
			client = redis.createClient( config.redisConfig.port, config.redisConfig.host );

			client.on( "error", function (err) {
				callback( err );
			});

			client.on( "ready", function (err) {
				callback( null, true );
			});
		}
	} else {
		client = redis.createClient();

		client.on( "error", function (err) {
			callback( err );
		});

		client.on( "ready", function (err) {
			callback( null, true );
		});
	}
}

/**
 * Конструктор контроллера
 *
 * @constructor
 */
function Controller( ) {
	return this;
}

Controller.prototype.create = function create( query, callback ) {
	var model;

	if ( query.user ) {
		//Запрос на создание пользователя

		//Создаем модель пользователя
		model = new ModelUser( client );
		//Проверяем уникальность создаваемого пользователя
		var viewName = 'viewUsers';
		var flexoSchemeName = 'users';
		model.checkUnique( query.user.queries[flexoSchemeName].login, function ( err ) {
			if ( err ) {
				callback ( err );
			} else {
				//Создаем view
				//ToDo: передавать имя view и flexo
				//ToDo: передавать на socket???
				//ToDo: валидация запроса
				if ( globalViewConfig[viewName] ) {
					var dbAccess = {};
					dbAccess['insert'] = globalViewConfig[viewName];

					var viewModelUsers = new View(viewName, dbAccess, {});

					var document = underscore.clone( query.user );
					//Удаляем пороль из сохраняемго в flexo документа
					if ( document.queries && document.queries[flexoSchemeName] &&
						document.queries[flexoSchemeName].pass ){
						delete document.queries[flexoSchemeName].pass;
					}

					//Сохраняем документ вo view
					viewModelUsers.insert( document, function( err, result ) {
						if ( err ) {
							callback ( err );
						} else {

							query.user.queries[flexoSchemeName]._id =
								result[flexoSchemeName][0]._id;
							//Сохраняем документ в redis
							model.create( query.user.queries[flexoSchemeName], function( err ){
								if(err){
									callback( err );
								} else {
									callback( err, result );
								}
							} );
						}
					});
				} else {
					callback( new Error( 'No description in global object view with name:' +
						viewName) );
				}
			}
		});
	} else if ( query.access ) {
		//Запроса на создание прав
		if ( query.access.viewName ) {
			//Запрос на создание прав view
			if ( query.access.role ) {
				//Запрос на создание прав view по роли

				//Создаем модель прав по роли для view
				model = new AccessModelRoleView( client, query.access.viewName,
					query.access.role );

				//Передаем в модель объект прав и в случае успешной передачи сохраняем в redis
				if ( model.setObjAccess( query.access.objAccess ) ){
					model.save( callback );
				}
			} else if ( query.access.login ) {
				//Запрос на создание прав view по пользователю

				//Создаем модель прав по пользователю для view
				model = new AccessModelUserView( client, query.access.viewName,	query.access.login );

				//Передаем в модель объект прав и в случае успешной передачи сохраняем в redis
				if ( model.setObjAccess( query.access.objAccess ) ){
					model.save( callback );
				}
			} else {
				callback( new Error( 'Not set role or login in query: '
					+ JSON.stringify( query ) ) )
			}
		} else if ( query.access.flexoSchemeName ) {
			if ( query.access.role ) {
				//Запрос на создание прав flexo по роли

				//Создаем модель прав по роли для flexo схемы
				model = new AccessModelRoleFlexo( client, query.access.flexoSchemeName,
					query.access.role );

				//Передаем в модель объект прав и в случае успешной передачи сохраняем в redis
				if ( model.setObjAccess( query.access.objAccess ) ){
					model.save( callback );
				}
			} else if ( query.access.login ) {
				//Запрос на создание прав view по пользователю

				//Создаем модель прав по пользователю для flexo
				model = new AccessModelUserFlexo( client, query.access.flexoSchemeName,
					query.access.login );

				//Передаем в модель объект прав и в случае успешной передачи сохраняем в redis
				if ( model.setObjAccess( query.access.objAccess ) ){
					model.save( callback );
				}
			} else {
				callback( new Error( 'Not set role or login in query: '
					+ JSON.stringify( query ) ) );
			}
		} else if ( query.access.menuName ){
			if ( query.access.role ) {
				//Запрос на создание прав меню по роли
				//Создаем модель меню
				model = new ModelMenu( client, null, query.access.role );
				//Сохраняем права меню по роли
				model.create( 'role', query.access.objAccess, query.access.menuName, callback );
			} else if ( query.access.login ) {
				//Запрос на создание прав раздела по пользователю
				//Создаем модель раздела
				model = new ModelMenu( client, query.access.login );
				//Сохраняем права для раздела по пользователю
				model.create( 'user', query.access.objAccess, query.access.menuName, callback );
			} else {
				callback( new Error( 'Not set role or login in query: '
					+ JSON.stringify( query ) ) );
			}
		} else {
			callback( new Error( 'Incorrect parameter access in query: '
				+ JSON.stringify( query ) ) );
		}
	} else {
		callback( new Error( 'Invalid query: ' + JSON.stringify( query ) ) );
	}
};

Controller.prototype.find = function find( query, callback ) {
	var model;
	if ( query.user ) {
		var flexoSchemeName = 'users';
		if( query.user.login || query.user._id ){
		    //Простой поиск одного пользователя
			var login = query.user.login || null;
			var _id = query.user._id || null;
			//Создаем модель пользователя
			model = new ModelUser( client, login, _id );
			model.find( function(err, reply){
				if ( err ){
					callback( err );
				} else {
					var obj = {};
					obj[flexoSchemeName] = [reply];
					callback(null, obj);
				}
			} );
		} else if (query.user.queries){
			//Сложный поиск
			var viewName = 'viewUsers';
			var flexoSchemeName = 'users';
			//Создаем view модель
			if ( globalViewConfig[viewName] ) {
				var dbAccess = {};
				dbAccess['read'] = globalViewConfig[viewName];

				var viewModelUsers = new View(viewName, dbAccess, {});

				viewModelUsers.find( query.user, function( err, listDocuments ) {
					if ( err ) {
						callback ( err );
					} else {
						if( listDocuments.length !== 0){
							//Создаем модель пользователя
							var model = new ModelUser(client);
							model.findsPass( listDocuments, callback );
						}
					}
				} );
			} else {
				callback( new Error( 'No description in global object view with name:' +
					viewName) );
			}
		} else {
			callback( new Error( 'Unknown type of query: ' + JSON.stringify( query ) ) );
		}
	} else if ( query.access ) {
		//Запроса на чтение прав
		if ( query.access.viewName ) {
			//Запрос на чтение прав view
			if ( query.access.role ) {
				//Запрос на чтение прав view по роли

				//Создаем модель прав по роли для view
				model = new AccessModelRoleView( client, query.access.viewName,
					query.access.role );

				//Запрашиваемый искомый объект прав
				if ( globalViewConfig[query.access.viewName] ) {
					var flexoSchemes = Object.keys(globalViewConfig[query.access.viewName]);
					model.find( flexoSchemes, callback );
				} else {
					callback( new Error( 'No description in global object view with name: '
						+ query.access.viewName ) );
				}
			} else if ( query.access.login ) {
				//Запрос на чтение прав view по пользователю

				//Создаем модель прав по пользователю для view
				model = new AccessModelUserView( client, query.access.viewName,
					query.access.login );

				//Запрашиваемый искомый объект прав
				if ( globalViewConfig[query.access.viewName] ) {
					var flexoSchemes = Object.keys(globalViewConfig[query.access.viewName]);
					model.find( flexoSchemes, callback );
				} else {
					callback( new Error( 'No description in global object view with name: '
						+ query.access.viewName ) );
				}
			} else {
				callback( new Error( 'Not set role or login in query: '
					+ JSON.stringify( query ) ) )
			}
		} else if ( query.access.flexoSchemeName ) {
			if ( query.access.role ) {
				//Запрос на чтение прав flexo по роли

				//Создаем модель прав по роли для flexo схемы
				model = new AccessModelRoleFlexo( client, query.access.flexoSchemeName,
					query.access.role );

				//Запрашиваемый искомый объект прав
                model.find( query.access.flexoSchemeName, callback );

			} else if ( query.access.login ) {
				//Запрос на чтение прав view по пользователю

				//Создаем модель прав по пользователю для view
				model = new AccessModelUserFlexo( client, query.access.flexoSchemeName,
					query.access.login );

				//Запрашиваемый искомый объект прав
				model.find( query.access.flexoSchemeName, callback );

			} else {
				callback( new Error( 'Not set role or login in query: '
					+ JSON.stringify( query ) ) );
			}
		} else if ( query.access.menuName ){
			if ( query.access.role ) {
				//Запрос на создание прав меню по роли
				//Создаем модель меню
				model = new ModelMenu( client, null, query.access.role );
				//Сохраняем права меню по роли
				model.find( 'role', query.access.menuName, callback );
			} else if ( query.access.login ) {
				//Запрос на создание прав раздела по пользователю
				//Создаем модель раздела
				model = new ModelMenu( client, query.access.login );
				//Сохраняем права для раздела по пользователю
				model.find( 'user', query.access.menuName, callback );
			} else {
				callback( new Error( 'Not set role or login in query: '
					+ JSON.stringify( query ) ) );
			}
		} else {
			callback( new Error( 'Incorrect parameter access in query: '
				+ JSON.stringify( query ) ) );
		}
	} else {
		callback( new Error( 'Invalid query: ' + JSON.stringify( query ) ) );
	}
};

Controller.prototype.delete = function del( query, callback ) {
	var model;
	if ( query.user ) {
		var viewName = 'viewUsers';
		var flexoSchemeName = 'users';

		if( query.user.queries && query.user.queries[flexoSchemeName] &&
			query.user.queries[flexoSchemeName].selector &&
			query.user.queries[flexoSchemeName].selector._id ){

			//Создаем view
			if ( globalViewConfig[viewName] ) {
				var dbAccess = {};
				dbAccess['delete'] = {};
				dbAccess['delete'][viewName] = 1;
				dbAccess['read'] = globalViewConfig[viewName];

				var viewModelUsers = new View(viewName, dbAccess, {});

				viewModelUsers.find( query.user, function( err ){
					if ( err ) {
						callback ( err );
					} else {
						//Удаляем документ из mongo
						viewModelUsers.delete(query.user, function(err, result){
							if ( err ) {
								callback ( err );
							} else {
								var model = new ModelUser(client, null,
									result[flexoSchemeName][0]._id);
								//ToDo:множественное удаление пользователей из Redis???
								model.delete( function( err ) {
									if ( err ) {
										callback( err )
									} else {
										callback( null, result );
									}
								});
							}
						});
					}
				});
			} else {
				callback( new Error( 'No description in global object view with name:' +
					viewName) );
			}
		} else {
			callback( new Error( 'Incorrect parameter query.selector in query: '
				+ JSON.stringify( query ) ) );
		}
	} else if ( query.access ) {
		//Запроса на создание прав
		if ( query.access.viewName ) {
			//Запрос на удаление прав view
			if ( query.access.role ) {
				//Запрос на удаление прав view по роли

				//Создаем модель прав по роли для view
				model = new AccessModelRoleView( client, query.access.viewName,
					query.access.role );

				if ( globalViewConfig[query.access.viewName] ) {
					var flexoSchemes = Object.keys(globalViewConfig[query.access.viewName]);
					model.delete( flexoSchemes, callback );
				} else {
					callback( new Error( 'No description in global object view with name: '
						+ query.access.viewName ) );
				}
			} else if ( query.access.login ) {
				//Запрос на удаление прав view по пользователю

				//Создаем модель прав по роли для view
				model = new AccessModelUserView( client, query.access.viewName,
					query.access.login );

				//Удаляем запрашиваемый объект прав
				if ( globalViewConfig[query.access.viewName] ) {
					var flexoSchemes = Object.keys(globalViewConfig[query.access.viewName]);
					model.delete( flexoSchemes, callback );
				} else {
					callback( new Error( 'No description in global object view with name: '
						+ query.access.viewName ) );
				}
			} else {
				callback( new Error( 'Not set role or login in query: '
					+ JSON.stringify( query ) ) );
			}
		} else if ( query.access.flexoSchemeName ) {
			if ( query.access.role ) {
				//Запрос на удаление прав flexo по роли

				//Создаем модель прав по роли для view
				model = new AccessModelRoleFlexo( client, query.access.flexoSchemeName,
					query.access.role );

				//Удаляем запрашиваемый объект прав
                model.delete( query.access.flexoSchemeName, callback );

			} else if ( query.access.login ) {
				//Запрос на удаление прав flexo по пользователю

				//Создаем модель прав по роли для view
				model = new AccessModelUserFlexo( client, query.access.flexoSchemeName,
					query.access.login );

				//Удаляем запрашиваемый объект прав
				model.delete( query.access.flexoSchemeName, callback );

			} else {
				callback( new Error( 'Not set role or login in query: '
					+ JSON.stringify( query ) ) );
			}
		} else if ( query.access.menuName ){
			if ( query.access.role ) {
				//Запрос на создание прав меню по роли
				//Создаем модель меню
				model = new ModelMenu( client, null, query.access.role );
				//Сохраняем права меню по роли
				model.delete( 'role', query.access.menuName, callback );
			} else if ( query.access.login ) {
				//Запрос на создание прав раздела по пользователю
				//Создаем модель раздела
				model = new ModelMenu( client, query.access.login );
				//Сохраняем права для раздела по пользователю
				model.delete( 'user', query.access.menuName, callback );
			} else {
				callback( new Error( 'Not set role or login in query: '
					+ JSON.stringify( query ) ) );
			}
		} else {
			callback( new Error( 'Incorrect parameter access in query: '
				+ JSON.stringify( query ) ) );
		}
	} else {
		callback( new Error( 'Invalid query: ' + JSON.stringify( query ) ) );
	}
};

Controller.prototype.modify = function modify( query, callback ) {
	if ( query.user ) {
		var viewName = 'viewUsers';
		var flexoSchemeName = 'users';
		if(query.user.queries && query.user.queries[flexoSchemeName] &&
			query.user.queries[flexoSchemeName].selector &&
			query.user.queries[flexoSchemeName].selector._id) {
			//Создаем flexo модель

			if ( globalViewConfig[viewName] ) {
				var dbAccess = {};
				dbAccess['modify'] = globalViewConfig[viewName];
				dbAccess['read'] = globalViewConfig[viewName];

				var viewModelUsers = new View(viewName, dbAccess, {});

				var pass = null;
				if (query.user.queries[flexoSchemeName].properties &&
					query.user.queries[flexoSchemeName].properties.pass){
					pass = query.user.queries[flexoSchemeName].properties.pass;
					delete query.user.queries[flexoSchemeName].properties.pass;
				}

				viewModelUsers.find(query.user, function(err, reply){
					if ( err ) {
						callback ( err );
					} else {
						//Модифицируем документ в mongo
						viewModelUsers.modify(query.user, function(err, objResult){
							if ( err ) {
								callback ( err );
							} else {
								if(pass){
									query.user.queries[flexoSchemeName].properties.pass = pass;
								}

								var model = new ModelUser(client, null,
									reply[flexoSchemeName][0]._id);

								//Модификация в redis
								model.modify(query.user.queries[flexoSchemeName].properties,
									function( err ) {
									if( err ){
										callback( err );
									} else {
										callback( null, objResult );
									}

								});
							}
						});
					}
				});
			} else {
			callback( new Error( 'No description in global object view with name:' +
				viewName) );
			}
		} else {
			callback( new Error( 'Incorrect parameter selector in queries: '
				+ JSON.stringify( query ) ) );
		}
	} else if ( query.access ) {
		//Запроса на создание прав
		if ( query.access.viewName ) {
			//Запрос на создание прав view
			if ( query.access.role ) {
				//Запрос на создание прав view по роли

				//Создаем модель прав по роли для view
				var model = new AccessModelRoleView( client, query.access.viewName,
					query.access.role );

				//Передаем в модель объект прав и в случае успешной передачи сохраняем в redis
				if ( model.setObjAccess( query.access.objAccess ) ){
					model.save( callback );
				}
			} else if ( query.access.login ) {
				//Запрос на создание прав view по пользователю

				//Создаем модель прав по пользователю для view
				var model = new AccessModelUserView( client, query.access.viewName,
					query.access.login );

				//Передаем в модель объект прав и в случае успешной передачи сохраняем в redis
				if ( model.setObjAccess( query.access.objAccess ) ){
					model.save( callback );
				}
			} else {
				callback( new Error( 'Not set role or login in query: '
					+ JSON.stringify( query ) ) );
			}
		} else if ( query.access.flexoSchemeName ) {
			if ( query.access.role ) {
				//Запрос на создание прав flexo по роли

				//Создаем модель прав по роли для flexo схемы
				var model = new AccessModelRoleFlexo( client, query.access.flexoSchemeName,
					query.access.role );

				//Передаем в модель объект прав и в случае успешной передачи сохраняем в redis
				if ( model.setObjAccess( query.access.objAccess ) ){
					model.save( callback );
				}
			} else if ( query.access.login ) {
				//Запрос на создание прав view по пользователю

				//Создаем модель прав по пользователю для flexo
				var model = new AccessModelUserFlexo( client, query.access.flexoSchemeName,
					query.access.login );

				//Передаем в модель объект прав и в случае успешной передачи сохраняем в redis
				if ( model.setObjAccess( query.access.objAccess ) ){
					model.save( callback );
				}
			} else {
				callback( new Error( 'Not set role or login in query: '
					+ JSON.stringify( query ) ) );
			}
		} else if ( query.access.menuName ){
			if ( query.access.role ) {
				//Запрос на создание прав меню по роли
				//Создаем модель меню
				var model = new ModelMenu(client, null, query.access.role);
				//Сохраняем права меню по роли
				model.create('role', query.access.objAccess, query.access.menuName, callback );
			} else if ( query.access.login ) {
				//Запрос на создание прав раздела по пользователю
				//Создаем модель раздела
				var model = new ModelMenu(client, query.access.login);
				//Сохраняем права для раздела по пользователю
				model.create('user', query.access.objAccess, query.access.menuName, callback );
			} else {
				callback( new Error( 'Not set role or login in query: '
					+ JSON.stringify( query ) ) );
			}
		} else {
			callback( new Error( 'Incorrect parameter access in query: '
				+ JSON.stringify( query ) ) );
		}
	} else {
		callback( new Error( 'Invalid query: ' + JSON.stringify( query ) ) );
	}
};

Controller.prototype.getTemplate = getTemplate;

function getTemplate(type, name, user, role, socket, callback ) {
	if(type === 'view') {
		//Проверяем есть ли уже готовые права для view
		if( socket.view && socket.view[name] && socket.view[name].access) {
			//Подготовленные права есть
			//Запрашиваем шаблон view c необходимыми параметрами
			view.GetTemplate(name, socket.view[name].access, {}, callback);
		} else {
			//Нет прав подготавливаем права и flexo модели
			formingFlexoAndView( user, role, name, socket, function ( err, reply ) {
				if ( err ){
					callback( err );
				} else {
					//Запрашиваем шаблон view c найденными параметрами
					view.GetTemplate(name, socket.view[name].access, {}, callback);
				}

			} );

		}
	} else if (type === 'menu') {
		//Создаем модель меню
		var model = new ModelMenu(client);

		model.getAccess(user, role, globalMenusConfig, name, callback);
	}
}

Controller.prototype.queryToView = function queryToView( type, request, viewName, socket, callback ) {
	if( socket.view && socket.view[viewName]) {
		//Подготовленные права есть
		if( type === 'read' ) {
			if( socket.view[viewName].access.read ) {
				if(checkRead( request.queries, socket.view[viewName].access.read ) ){
					//Вызываем view c необходимыми параметрами
					view.ProcessRequest( viewName, 'find', request, socket.view[viewName].flexo,
						socket.view[viewName].access['read'], {}, callback );

				} else {
					callback(new Error('Requested more fields than allowed to read'));
				}
			} else {
				callback(new Error('No permission to read in view'));
			}
		} else if ( type === 'create' ) {
			if( socket.view[viewName].access.create ) {
				if(checkCreate( request.queries, socket.view[viewName].access.create ) ){
					//Вызываем view c необходимыми параметрами
					//Вызываем view c необходимыми параметрами
					view.ProcessRequest( viewName, 'insert', request, socket.view[viewName].flexo,
						socket.view[viewName].access['create'], {}, callback );
				} else {
					callback(new Error('No permission to create in view'));
				}
			} else {
				callback(new Error('No permission to create in view'));
			}
		} else if ( type === 'modify' ) {
			if( socket.view[viewName].access.modify ) {
				if(checkModify( request.queries, socket.view[viewName].access.modify ) ){
					//Вызываем view c необходимыми параметрами
					view.ProcessRequest( viewName, 'modify', request, socket.view[viewName].flexo,
						socket.view[viewName].access['modify'], {}, callback );
				} else {
					callback(new Error('No permission to modify in view'));
				}
			} else {
				callback(new Error('No permission to modify in view'));
			}
		} else if ( type === 'delete' ) {
			if( socket.view[viewName].access.delete ) {
				if(checkDelete( request.queries, socket.view[viewName].access.delete ) ){
					view.ProcessRequest( viewName, 'delete', request, socket.view[viewName].flexo,
						socket.view[viewName].access['delete'], {}, callback );
				} else {
					callback(new Error('No permission to delete in view'));
				}
			} else {
				callback(new Error('No permission to delete in view'));
			}
		}

	} else {
		formingFlexoAndView( socket.login, socket.role, viewName, socket, function ( err, reply ) {
			if ( err ){
				callback( err );
			} else {
				queryToView( type, request, viewName, socket, callback )
			}
		});
	}
};

function checkRead( queries, objAccess ) {
	//Формируем список запрашиваемых flexo
	var flexoSchemes = Object.keys(queries);

	//Проверяем каждый запрос на разрешенные поля
	for ( var i = 0; i < flexoSchemes.length; i++ ){

		if(objAccess[flexoSchemes[i]] && objAccess[flexoSchemes[i]].length === 0) {
			return false;
		}
		//Формируем списки запрашиваемых полей на проверку для данной схемы
		var fieldsFromSelector = [];
		var fieldsFromSort = [];

		if(queries[flexoSchemes[i]].selector)
			fieldsFromSelector = Object.keys(queries[flexoSchemes[i]].selector);
		if(queries[flexoSchemes[i]].options && queries[flexoSchemes[i]].options.sort)
			fieldsFromSort = Object.keys(queries[flexoSchemes[i]].options.sort);

		//Объединяем массива для проверок в один
		var fieldsForCheck = underscore.union(fieldsFromSelector, fieldsFromSort);
		//Пересекаем с разрешенным полями
		var unresolvedFields  = underscore.difference(fieldsForCheck, objAccess[flexoSchemes[i]]);
		unresolvedFields  = underscore.difference(unresolvedFields, ['_id', 'tsCreate', 'tsUpdate']);

		if (unresolvedFields.length !== 0){
			return false;
		}
	}

	return true;
}

function checkCreate( queries, objAccessCreate ) {
	//Формируем список передаваемых на создание flexo
	var flexoSchemes = Object.keys(queries);

	//Проверяем каждый запрос на разрешенные поля
	for ( var i = 0; i < flexoSchemes.length; i++ ){

		if(objAccessCreate[flexoSchemes[i]] && objAccessCreate[flexoSchemes[i]].length === 0) {
			return false;
		}

		//Проверяем разрешения на создания
		if( underscore.isArray( queries[flexoSchemes[i]] ) ) {
            for( var j = 0; j < queries[flexoSchemes[i]].length ; j++ ){
				//Формирую список полей на проверку
				var fields = Object.keys(queries[flexoSchemes[i]][j]);

				//Пересекаем с разрешенными полями на создание
				var unresolvedFields  = underscore.difference(fields, objAccessCreate[flexoSchemes[i]]);

				if (unresolvedFields.length !== 0){
					return false;
				}
			}
		} else {
			//Формирую список полей на проверку
			var fields = Object.keys(queries[flexoSchemes[i]]);

			//Пересекаем с разрешенными полями на создание
			var unresolvedFields  = underscore.difference(fields, objAccessCreate[flexoSchemes[i]]);

			if (unresolvedFields.length !== 0){
				return false;
			}
		}
	}

	return true;
}

function checkModify( queries, objAccessModify ) {
	//Формируем список изменяемых flexo
	var flexoSchemes = Object.keys(queries);

	//Проверяем каждый запрос на разрешенные поля
	for ( var i = 0; i < flexoSchemes.length; i++ ){

		if(objAccessModify[flexoSchemes[i]] && objAccessModify[flexoSchemes[i]].length === 0) {
			return false;
		}

		//Проверяем разрешения на создания
		if( underscore.isArray( queries[flexoSchemes[i]] ) ) {
			for( var j = 0; j < queries[flexoSchemes[i]].length ; j++ ){
				//Формирую список полей на проверку
				var fields = Object.keys(queries[flexoSchemes[i]][j].properties);

				//Пересекаем с разрешенными полями на изменение
				var unresolvedFields  = underscore.difference(fields, objAccessModify[flexoSchemes[i]]);

				if (unresolvedFields.length !== 0){
					return false;
				}
			}
		} else {
			//Формирую список полей на проверку
			var fields = Object.keys(queries[flexoSchemes[i]].properties);

			//Пересекаем с разрешенными полями на изменение
			var unresolvedFields  = underscore.difference(fields, objAccessModify[flexoSchemes[i]]);

			if (unresolvedFields.length !== 0){
				return false;
			}
		}
	}

	return true;
}

function checkDelete( queries, objAccessDelete ) {
	//Формируем список изменяемых flexo
	var flexoSchemes = Object.keys(queries);

	//Проверяем каждый запрос на разрешение удаления
	for ( var i = 0; i < flexoSchemes.length; i++ ) {
		if ( objAccessDelete[flexoSchemes[i]] !== 1 ) {
			return false;
		}
	}

	return true;
}

function formingFlexoAndView( user, role, viewName, socket, callback ){

	var flexoSchemesWithFields = globalViewConfig[viewName];
	var flexoSchemes = Object.keys(globalViewConfig[viewName]);

	async.parallel([
		function(cb){
			//Подготавливаем объект с правами для view
			crossingAccessForView(user, role, viewName, flexoSchemes,
				flexoSchemesWithFields, cb);
		},
		function(cb){
			//Подготавливаем объект с правами для view
			crossingAccessForFlexo(user, role, viewName, flexoSchemes, cb);
		}
	],
		function(err, replies) {
			if( err ) {
				callback ( err )
			} else {
				//Проверяем не выходят ли суммарные правила по view за границы правил по flexo
				//и если выходят, то обрезаем их
				var viewAccess = replies[0];
				var flexoAccess = replies[1];


				for(var i=0; i<flexoSchemes; i++){
					//Сравниваем права на чтение
					if( viewAccess['read'] && viewAccess['read'][flexoSchemes[i]] ){
						if(flexoAccess['read'] && flexoAccess['read'][flexoSchemes[i]]){
							var differenceRead = underscore.difference(
								viewAccess['read'][flexoSchemes[i]],
								flexoAccess['read'][flexoSchemes[i]]);
						} else {
							var differenceRead = viewAccess['read'][flexoSchemes[i]];
						}

						if( differenceRead.length !== 0 ){
							//ToDo: доделать сигнализацию о нарушении целостности
							//Присутствует нарушение целостности, обрезаем права
							viewAccess['read'][flexoSchemes[i]] = underscore.difference(
								viewAccess['read'][flexoSchemes[i]], differenceRead);
						}
					}

					//Сравниваем права на создание
					if( viewAccess['create'] && viewAccess['create'][flexoSchemes[i]] ){
						if(flexoAccess['create'] && flexoAccess['create'][flexoSchemes[i]]){
							var differenceCreate = underscore.difference(
								viewAccess['create'][flexoSchemes[i]],
								flexoAccess['create'][flexoSchemes[i]]);
						} else {
							var differenceCreate = viewAccess['create'][flexoSchemes[i]];
						}

						if( differenceCreate.length !== 0 ){
							//ToDo: доделать сигнализацию о нарушении целостности
							//Присутствует нарушение целостности, обрезаем права
							viewAccess['create'][flexoSchemes[i]] = underscore.difference(
								viewAccess['create'][flexoSchemes[i]], differenceCreate);
						}
					}

					//Сравнениваем права на модификацию
					if( viewAccess['modify'] && viewAccess['modify'][flexoSchemes[i]] ){
						if(flexoAccess['modify'] && flexoAccess['modify'][flexoSchemes[i]]){
							var differenceModify = underscore.difference(
								viewAccess['modify'][flexoSchemes[i]],
								flexoAccess['modify'][flexoSchemes[i]]);
						} else {
							var differenceModify = viewAccess['modify'][flexoSchemes[i]];
						}

						if( differenceModify.length !== 0 ){
							//ToDo: доделать сигнализацию о нарушении целостности
							//Присутствует нарушение целостности, обрезаем права
							viewAccess['modify'][flexoSchemes[i]] = underscore.difference(
								viewAccess['modify'][flexoSchemes[i]], differenceModify);
						}
					}

					//Сравниваем права на удаление
					if( viewAccess['delete'][flexoSchemes[i]] === 1) {
						if( flexoAccess['delete'][flexoSchemes[i]] === 0){
							//ToDo: доделать сигнализацию о нарушении целостности
							//Присутствует нарушение целостности, обрезаем права
							viewAccess['delete'][flexoSchemes[i]] = 0;
						}
					}
				}

				//Создаем объект view который мы привяжем к socket
				if ( !socket.view ) {
					socket.view = {}
				}

				socket.view[viewName] = {};
				socket.view[viewName]['access'] = viewAccess;

				callback(null, true);
			}
		}
	);
}

function crossingAccessForFlexo(user, role, viewName, flexoSchemes, callback) {
	//Создаем модель прав по роли и по пользователю для работы с объектами прав flexo схем
	var modelFlexoRole = new AccessModelRoleFlexo( client, null, role );
	var modelFlexoUser = new AccessModelUserFlexo( client, null, user );

	//Запрашиваемый данные о правах для определения пересечения
	if ( flexoSchemes ) {
		async.parallel([
			function(cb){
				modelFlexoRole.accessDataPreparation( globalFlexoSchemes, flexoSchemes, cb);
			},
			function(cb){
				modelFlexoUser.accessDataPreparation( globalFlexoSchemes, flexoSchemes, cb);
			}
		],
			function(err, replies) {
				if( err ) {
					callback ( err )
				} else {
					//Определение пересечения прав
					var objAccessRole = replies[0];
					var objAccessUser = replies[1];

					var schemes = flexoSchemes;
					//Объект хранящий готовое пересечение прав на чтение
					var objAccess = {};

					for( var i = 0; i < schemes.length; i++ ) {

						//Чтение
						objAccess = crossingAccess( 'read', schemes[i], objAccessRole,
							objAccessUser, objAccess );

						//Модификация
						objAccess = crossingAccess( 'modify', schemes[i], objAccessRole,
							objAccessUser, objAccess );

						//Создание
						objAccess = crossingAccess( 'create', schemes[i], objAccessRole,
							objAccessUser, objAccess );

						//Удаление
						var del = 0;

						if( objAccessRole[schemes[i]] && objAccessRole[schemes[i]]['delete'] ) {
							del = objAccessRole[schemes[i]['delete']];
						}

						if(objAccessUser[schemes[i]]){
							if( objAccessUser[schemes[i]]['delete'] === 0) {
								del = 0;
							} else if ( objAccessUser[schemes[i]]['delete'] === 1) {
								del = 1;
							}
						}

						if ( !objAccess['delete'] ) {
							objAccess['delete'] = {}
						}

						objAccess['delete'][schemes[i]] = del;
					}

					callback( null, objAccess );

				}
			}
		);
	} else {
		callback( new Error( 'No description in global object view with name: '
			+ JSON.stringify( viewName ) ) );
	}

}

function crossingAccessForView(user, role, viewName, flexoSchemes, flexoSchemesWithFields,
							   callback ) {
	//Создаем модель прав по роли и по пользователю
	var modelViewRole = new AccessModelRoleView( client, viewName, role );
	var modelViewUser = new AccessModelUserView( client, viewName, user );

	//Запрашиваемый данные о правах для определения пересечения
	if ( flexoSchemes ) {
		async.parallel([
			function(cb){
				modelViewRole.find( flexoSchemes, function(err, reply){
					if (err) {
						cb( err );
					} else {
						modelViewRole.accessDataPreparation(flexoSchemesWithFields, cb);
					}
				} );
			},
			function(cb){
				modelViewUser.find( flexoSchemes, function(err, reply){
					if (err) {
						cb( err );
					} else {
						modelViewUser.accessDataPreparation(flexoSchemesWithFields, cb);
					}
				} );
			}
		],
			function(err, replies) {
				if( err ) {
					callback ( err )
				} else {
					//Определение пересечения прав
					var objAccessRole = replies[0];
					var objAccessUser = replies[1];
					var schemes = flexoSchemes;
					//Объект хранящий готовое пересечение прав
					var objAccess = {};

					for( var i = 0; i < schemes.length; i++ ) {

						//Чтение
						objAccess = crossingAccess( 'read', schemes[i], objAccessRole,
							objAccessUser, objAccess );

						//Модификация
						objAccess = crossingAccess( 'modify', schemes[i], objAccessRole,
							objAccessUser, objAccess );

						//Создание
						objAccess = crossingAccess( 'create', schemes[i], objAccessRole,
							objAccessUser, objAccess );

						//Удаление
						var del = 0;

						if( objAccessRole[schemes[i]] && objAccessRole[schemes[i]]['delete'] ) {
							del = objAccessRole[schemes[i]['delete']];
						}

						if(objAccessUser[schemes[i]]){
							if( objAccessUser[schemes[i]]['delete'] === 0) {
								del = 0;
							} else if ( objAccessUser[schemes[i]]['delete'] === 1) {
								del = 1;
							}
						}

						if ( !objAccess['delete'] ) {
							objAccess['delete'] = {}
						}

						objAccess['delete'][schemes[i]] = del;
					}

					callback( null, objAccess );

				}
			}
		);
	} else {
		callback( new Error( 'No description in global object view with name: '
			+ JSON.stringify( viewName ) ) );
	}
}


function crossingAccess (method, scheme, objAccessRole, objAccessUser, objAccessArg) {
	var fields = [];
	var addFields = [];
	var removeFields = [];
	var objAccess = underscore.clone(objAccessArg);

	if( objAccessRole[scheme] && objAccessRole[scheme][method] ) {
		fields = objAccessRole[scheme][method];
	}

	if( objAccessUser[scheme] && objAccessUser[scheme][method] ) {
		addFields = objAccessUser[scheme][method][0];
		removeFields = objAccessUser[scheme][method][1];
	}

	var permisionFields =
		underscore.union( fields, addFields );
	permisionFields =
		underscore.difference( permisionFields, removeFields );

	if( permisionFields.length !== 0 ) {
		if ( !objAccess[method] ) {
			objAccess[method] = {}
		}
		objAccess[method][scheme] = permisionFields;
	}

	return objAccess;
}