var _ = require('underscore');
var ModuleErrorLogging = require('./module_error_logging.js');
var AccessModuleView = {};

/**
 * Сохранение модели в redis
 *
 * @param objAccess - объект прав для view роли
 * @param callback (err, reply)
 * 		err - ошибка от node_redis
 * 		reply - true в случае успешного сохранения
 */
AccessModuleView.saveForRole = function saveForRole( client, sender, role, viewName, objAccess,
													 globalView, callback ){
	var multi = client.multi();
	var key; //Формируемый ключ redis
	var objDescriptioneError;
	//Валидация и проверка целостности объекта view прав по роли
	validationAndCheckIntegrityAccessForRole(objAccess, globalView, function( errTitle, type, variant,
																			  textError ){
		if ( errTitle ) {

			//Логирование ошибки
			objDescriptioneError = {
				type: type,
				variant: variant,
				place: 'Controller.AccessModuleView.saveForRole',
				time: new Date().getTime(),
				sender:sender,
				arguments:{
					role:role,
					viewName:viewName,
					objAccess:objAccess
				},
				descriptione: {
					title:errTitle,
					text:textError,
					globalView:globalView
				}
			};

			ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);

		} else {
			//Сохранение объекта прав в redis
			key = strViewAccessRole( role, viewName );

			multi.SET( key, JSON.stringify(objAccess));

			multi.SADD( setRoleToAllViewAccess( role ), viewName );


			multi.EXEC( function( err ) {
				if ( err ) {
					callback( err );
				} else {
					callback( null, true );
				}
			});
		}
	});
};

/**
 * Сохранение модели в redis
 *
 * @param callback (err, reply)
 * 		err - ошибка от node_redis
 * 		reply - true в случае успешного сохранения
 */
AccessModuleView.saveForUser = function saveForUser( client, sender, user, viewName, objAccess,
													 globalView, callback ){
	var multi = client.multi();
	var key; //Формируемый ключ redis
	var objDescriptioneError;
	//Валидация и проверка целостности объекта view прав по пользователю
	validationAndCheckIntegrityAccessForUser(objAccess, globalView,	function( errTitle, type,
																				 variant,
																				 textError ) {
		if ( errTitle ) {

			//Логирование ошибки
			objDescriptioneError = {
				type: type,
				variant: variant,
				place: 'Controller.AccessModuleView.saveForUser',
				time: new Date().getTime(),
				sender:sender,
				arguments:{
					user:user,
					viewName:viewName,
					objAccess:objAccess
				},
				descriptione: {
					title:errTitle,
					text:textError,
					globalView:globalView
				}
			};

			ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);

		} else {
			//Сохранение объекта прав в redis
			key = strViewAccessUser( user, viewName );

			multi.SET( key, JSON.stringify(objAccess));

			//Сохраняем связку юзера и названия view по которой есть права для этого юзера
			multi.SADD( setUserToAllViewAccess( user ), viewName );

			multi.EXEC( function( err ) {
				if ( err ) {
					callback( err );
				} else {
					callback( null, true );
				}
			});
		}
	} );

};

//Валидация и проверка целостности объекта view прав по роли
function validationAndCheckIntegrityAccessForRole(objectAccess, globalView, callback){

	if ( _.isUndefined( objectAccess ) && _.isEmpty( objectAccess ) ) {
		callback( 'Controller: incorrect parameter query.access.objAccess',
			'invalid_function_arguments', 1,
			'Объект прав query.access.objAccess неопределен или пуст' );
		return;
	}

	if ( _.isUndefined( objectAccess['(all)'] ) && !_.isNumber( objectAccess['(all)'] ) ){
		callback( 'Controller: incorrect parameter ["(all)"] in query.access.objAccess',
			'invalid_function_arguments', 2, 'В объекте прав query.access.objAccess спец. ' +
				'параметр (all) не определен или не является числом');
		return;
	} else if ( _.isUndefined( objectAccess.viewIds ) && !_.isArray( objectAccess.viewIds ) ){
		callback('Controller: incorrect parameter viewIds in query.access.objAccess',
			'invalid_function_arguments', 3, 'В объекте прав query.access.objAccess ' +
				'параметр viewIds не определен или не является массивом');
		return;
	} else if ( _.isUndefined( objectAccess['(useId)'] ) && !_.isNumber( objectAccess['(useId)'] ) ){
		callback( 'Controller: incorrect parameter ["(useId)"] in query.access.objAccess',
			'invalid_function_arguments', 4, 'В объекте прав query.access.objAccess спец. ' +
				'параметр (useId) не определен или не является числом');
		return;
	}

	if ( _.isUndefined( globalView ) || _.isEmpty( globalView ) ) {
		if( _.difference( objectAccess.viewIds, Object.keys({}) ).length !== 0 ) {
			callback('Controller: error integrity in viewIds in query.access.objAccess',
				'loss_integrity', 1, 'В глобальном объекте прав нет идентификаторов, ' +
					'а следовательно в объекте прав query.access.objAccess параметр viewIds' +
					'содержит идентификаторы, которых нет в глобальном описании');
			return;
		}
	} else {
		if( _.difference( objectAccess.viewIds, Object.keys(globalView) ).length !== 0 ) {
			callback('Controller: error integrity in viewIds in query.access.objAccess',
				'loss_integrity', 2, 'В объекте прав query.access.objAccess параметр viewIds' +
					'содержит идентификаторы, которых нет в глобальном описании');
			return;
		}
	}

	callback( null );
}

//Валидация и проверка целостности объекта view прав по роли
function validationAndCheckIntegrityAccessForUser(objectAccess, globalView, callback){

	if ( _.isUndefined( objectAccess ) && _.isEmpty( objectAccess ) ) {
		callback( 'Controller: incorrect parameter query.access.objAccess',
			'invalid_function_arguments', 1,
			'Объект прав query.access.objAccess неопределен или пуст' );
		return;
	}

	if ( !_.isUndefined( objectAccess['(all)'] ) ){
		if( !_.isNumber( objectAccess['(all)'] ) ){
			callback( 'Controller: incorrect parameter ["(all)"] in query.access.objAccess',
				'invalid_function_arguments', 2, 'В объекте прав query.access.objAccess спец. ' +
					'параметр (all) определен, но не является числом');

			return;
		}
	}

	if ( _.isUndefined( objectAccess.viewIdsAdd ) && !_.isArray( objectAccess.viewIdsAdd ) ){
		callback('Controller: incorrect parameter viewIdsAdd in query.access.objAccess',
			'invalid_function_arguments', 3, 'В объекте прав query.access.objAccess ' +
				'параметр viewIdsAdd не определен или не является массивом');
		return;
	} else if ( _.isUndefined( objectAccess.viewIdsDel ) && !_.isArray( objectAccess.viewIdsDel ) ){
		callback('Controller: incorrect parameter viewIdsDel in query.access.objAccess',
			'invalid_function_arguments', 4, 'В объекте прав query.access.objAccess ' +
				'параметр viewIdsDel не определен или не является массивом');
		return;
	}

	if ( !_.isUndefined( objectAccess['(useId)'] ) ){
		if( !_.isNumber( objectAccess['(useId)'] ) ){
			callback( 'Controller: incorrect parameter ["(useId)"] in query.access.objAccess',
				'invalid_function_arguments', 5, 'В объекте прав query.access.objAccess спец. ' +
					'параметр (useId) определен и не является числом');
			return;
		}
	}

	if ( _.isUndefined( globalView ) || _.isEmpty( globalView ) ) {
		if( _.difference( objectAccess.viewIdsAdd, Object.keys({}) ).length !== 0 ) {
			callback('Controller: error integrity in viewIdsAdd in query.access.objAccess',
				'loss_integrity', 1, 'В глобальном объекте прав нет идентификаторов, ' +
					'а следовательно в объекте прав query.access.objAccess параметр viewIdsAdd' +
					'содержит идентификаторы, которых нет в глобальном описании');
			return;
		} else if ( _.difference( objectAccess.viewIdsDel, Object.keys({}) ).length !== 0 ) {
			callback('Controller: error integrity in viewIdsDel in query.access.objAccess',
				'loss_integrity', 2, 'В глобальном объекте прав нет идентификаторов, ' +
					'а следовательно в объекте прав query.access.objAccess параметр viewIdsDel' +
					'содержит идентификаторы, которых нет в глобальном описании');
			return;
		}
	} else {
		if( _.difference( objectAccess.viewIdsAdd, Object.keys(globalView) ).length !== 0 ) {
			callback('Controller: error integrity in viewIdsAdd in query.access.objAccess',
				'loss_integrity', 3, 'В объекте прав query.access.objAccess параметр viewIdsAdd' +
					'содержит идентификаторы, которых нет в глобальном описании');
			return;
		} else if ( _.difference( objectAccess.viewIdsDel, Object.keys(globalView) ).length !== 0 ) {
			callback('Controller: error integrity in viewIdsDel in query.access.objAccess',
				'loss_integrity', 4, 'В объекте прав query.access.objAccess параметр viewIdsDel' +
					'содержит идентификаторы, которых нет в глобальном описании');
			return;
		}
	}

	callback( null );
}



/**
 * Поиск модели прав для view в redis
 *
 * @param callback (err, reply)
 * 		err - ошибка от node_redis
 * 		reply - возвращается искомый объект прав
 */
AccessModuleView.findForRole = function findForRole( client, sender, role, viewName, callback ) {
	var objDescriptioneError;
	client.GET(  strViewAccessRole( role, viewName ), function( err, reply ) {
		if ( err ) {
			callback( err );
		} else {
			if ( reply ) {
				var objAccess  = JSON.parse(reply);

				callback( null, objAccess );
			} else {
				/*//Логирование ошибки
				objDescriptioneError = {
					type: "non-existent_data",
					variant: 1,
					place: 'Controller.AccessModuleView.findForRole',
					time: new Date().getTime(),
					sender:sender,
					arguments:{
						role:role,
						viewName:viewName
					},
					descriptione: {
						title:'Controller: No requested object access',
						text:'Запрашивается не существующий объект прав на view по роли'
					}
				};

				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);*/
				callback( new Error ( 'Controller: No requested object access' ) );
			}
		}
	});
};

/**
 * Поиск модели прав для view в redis
 *
 * @param callback (err, reply)
 * 		err - ошибка от node_redis
 * 		reply - возвращается искомый объект прав
 */
AccessModuleView.findForUser = function findForUser( client, sender, user, viewName, callback ) {
	var objDescriptioneError;
	client.GET(  strViewAccessUser( user, viewName ), function( err, reply ) {
		if ( err ) {
			callback( err );
		} else {
			if ( reply ) {
				var objAccess  = JSON.parse(reply);

				callback( null, objAccess );
			} else {
				/*//Логирование ошибки
				objDescriptioneError = {
					type: "non-existent_data",
					variant: 1,
					place: 'Controller.AccessModuleView.findForUser',
					time: new Date().getTime(),
					sender:sender,
					arguments:{
						user:user,
						viewName:viewName
					},
					descriptione: {
						title:'Controller: No requested object access',
						text:'Запрашивается не существующий объект прав на view по пользователю'
					}
				};

				ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);*/
				callback( new Error ( 'Controller: No requested object access' ) );
			}
		}
	});
};

/**
 * Удаление модели прав для view в redis по заданному списку flexo scheme
 *
 * @param callback (err, reply)
 * 		err - ошибка от node_redis
 * 		reply - - true в случае успешного удаления
 */
AccessModuleView.deleteForRole = function deleteForRole(client, role, viewName, callback){
	var multi = client.multi();
	var key;

	//Формируем команды на удаление
	key = strViewAccessRole( role, viewName );
	multi.DEL( key );

	multi.SREM( setRoleToAllViewAccess( role ), viewName );

	multi.EXEC( function( err ) {
		if ( err ) {
			callback( err );
		} else {
			callback( null, true );
		}
	});
};

/**
 * Удаление модели прав для view в redis по заданному списку flexo scheme
 *
 * @param callback (err, reply)
 * 		err - ошибка от node_redis
 * 		reply - - true в случае успешного удаления
 */
AccessModuleView.deleteForUser = function deleteForUser(client, user, viewName, callback){
	var multi = client.multi();
	var key;

	//Формируем команды на удаление
	key = strViewAccessUser( user, viewName );
	multi.DEL( key );

	multi.SREM( setUserToAllViewAccess( user ), viewName );

	multi.EXEC( function( err ) {
		if ( err ) {
			callback( err );
		} else {
			//ToDo:Доделать возможность удаления не всех данных из уже имеющимся в модели
			callback( null, true );
		}
	});
};

AccessModuleView.accessPreparation = function accessPreparation( client, role, user, viewName,
																 viewConfig, callback ) {
	var multi = client.multi();
	multi.GET(  strViewAccessRole( role, viewName ) );
	multi.GET(  strViewAccessUser( user, viewName ) );

	multi.EXEC( function( err, replies ) {
		if ( err ) {
			callback( err );
		} else {
			var objAccessForRole = JSON.parse(replies[0]);
			var objAccessForUser = JSON.parse(replies[1]);

			var listOfViewIdsForRole = accessPreparationForRole( objAccessForRole, viewConfig );
			var listOfViewIds = accessPreparationForUser( objAccessForUser, listOfViewIdsForRole,
				viewConfig );

			//Пересекаем спец разрешение '(useId)'
			var useId = 0;

			if ( objAccessForRole ) {
				useId = objAccessForRole['(useId)'] || 0;
			}

			if ( objAccessForUser && !_.isUndefined( objAccessForUser['(useId)'] ) &&
				_.isNumber( objAccessForUser['(useId)'] ) ) {
				useId = objAccessForUser['(useId)'];
			}

			callback( null, listOfViewIds, useId );
		}
	});

};

/**
 * Формируем список разрешенных идентификаторов view по роли
 *
 * @returns - объект с подготовленными данными
 */
function accessPreparationForRole( objAccess, viewConfig ) {
	//Формируем список разрешенных идентификаторов view по роли
	var listOfViewIdsForRole = [];

	if ( objAccess ) {
		if ( objAccess['(all)'] ) {
			listOfViewIdsForRole = Object.keys(viewConfig);
			listOfViewIdsForRole = _.difference( listOfViewIdsForRole, objAccess.viewIds );
		} else {
			listOfViewIdsForRole = objAccess.viewIds;
		}
	}
	//ToDo:возможно доделать проверку целостности
	//Возвращаем объект с правами на роль
	return listOfViewIdsForRole;
}

/**
 * Формируем список разрешенных идентификаторов для view за счет пересечения прав по роли и по
 * пользователю
 *
 * @returns {{}} - объект с подготовленными данными
 */
function accessPreparationForUser( objAccess, listOfViewIdsForRole, viewConfig ) {
	//Формируем список разрешенных идентификаторов для view за счет пересечения прав по роли и
	// по пользователю
	var listOfViewIds = [];
	if ( objAccess ) {
		if ( !_.isUndefined( objAccess['(all)'] ) ) {

			if ( objAccess['(all)'] ) {
				listOfViewIds = Object.keys( viewConfig );
				listOfViewIds = _.difference( listOfViewIds, objAccess.viewIdsDel );
			} else {
				listOfViewIds = objAccess.viewIdsAdd;
			}

		} else {

			listOfViewIds = listOfViewIdsForRole;
			listOfViewIds = _.union(listOfViewIds, objAccess.viewIdsAdd);
			listOfViewIds = _.difference(listOfViewIds, objAccess.viewIdsDel);
		}
	} else {
		listOfViewIds = listOfViewIdsForRole;
	}

	//Возвращаем массив разрешенных для данной view идентификаторов
	return listOfViewIds;

}

//Формирование ключа REDIS (SET) для сохранения связки логина юзера и названия view по
// которым у него есть права
function setUserToAllViewAccess( user ) {
	return 'user:all:viewName:' + user;
}

//Формирование строки ключа Redis (STRING) для прав относящиеся к view для заданной схемы и
//пользователю
function strViewAccessUser( user, viewName ) {
	return 'view:user:access:' + user + ':' + viewName;
}

//Формирование ключа REDIS (SET) для сохранения связки роли пользователя и названия view по
// которым у него есть права
function setRoleToAllViewAccess( role ) {
	return 'role:all:viewName:' + role;
}

//Формирование строки ключа Redis (STRING) для прав относящиеся к view для заданной роли
function strViewAccessRole( role, viewName ) {
	return 'view:role:access:' + role + ':' + viewName;
}

module.exports = AccessModuleView;
