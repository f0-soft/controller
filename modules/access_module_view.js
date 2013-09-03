var _ = require('underscore');

var AccessModuleView = {};

/**
 * Сохранение модели в redis
 *
 * @param objAccess - объект прав для view роли
 * @param callback (err, reply)
 * 		err - ошибка от node_redis
 * 		reply - true в случае успешного сохранения
 */
AccessModuleView.saveForRole = function saveForRole( client, role, viewName, objAccess, globalView,
													 callback ){
	var multi = client.multi();
	var key; //Формируемый ключ redis

	//Валидация и проверка целостности объекта view прав по роли
	validationAndCheckIntegrityAccessForRole(objAccess, globalView, function( err ){
		if ( err ) {
			callback( err );
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
AccessModuleView.saveForUser = function saveForUser( client, user, viewName, objAccess, globalView,
													 callback ){
	var multi = client.multi();
	var key; //Формируемый ключ redis

	//Валидация и проверка целостности объекта view прав по пользователю
	validationAndCheckIntegrityAccessForUser(objAccess, globalView, function( err ){
		if ( err ) {
			callback( err );
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
		callback( new Error( 'Controller: incorrect parameter object access' ) );
		return;
	}

	if ( _.isUndefined( globalView ) || _.isEmpty( globalView ) ) {
		callback( new Error( 'Controller: incorrect data in global view for view:' + globalView ) );
		return;
	}

	if ( _.isUndefined( objectAccess['(all)'] ) && !_.isNumber( objectAccess['(all)'] ) ){
		callback(new Error('Controller: incorrect parameter ["(all)"] in object access: ' +
			JSON.stringify( objectAccess ) ) );
		return;
	} else if ( _.isUndefined( objectAccess.viewIds ) && !_.isArray( objectAccess.viewIds ) ){
		callback(new Error('Controller: incorrect parameter viewIds in object access: ' +
			JSON.stringify( objectAccess ) ) );
		return;
	} else if( _.difference( objectAccess.viewIds, Object.keys(globalView) ).length !== 0 ) {
		callback(new Error('Controller: error integrity in viewIds in object access: ' +
			JSON.stringify( objectAccess ) ) );
		return;
	}

	callback( null );
}

//Валидация и проверка целостности объекта view прав по роли
function validationAndCheckIntegrityAccessForUser(objectAccess, globalView, callback){

	if ( _.isUndefined( objectAccess ) && _.isEmpty( objectAccess ) ) {
		callback( new Error( 'Controller: incorrect parameter object access' ) );
		return;
	}

	if ( _.isUndefined( globalView ) || _.isEmpty( globalView ) ) {
		callback( new Error( 'Controller: incorrect data in global view for view:' + globalView ) );
		return;
	}

	if ( !_.isUndefined( objectAccess['(all)'] ) )
		if( !_.isNumber( objectAccess['(all)'] ) ){
		callback(new Error('Controller: incorrect parameter ["(all)"] in object access: ' +
			JSON.stringify( objectAccess ) ) );
		return;
	}

	if ( _.isUndefined( objectAccess.viewIdsAdd ) && !_.isArray( objectAccess.viewIdsAdd ) ){
		callback(new Error('Controller: incorrect parameter viewIdsAdd in object access: ' +
			JSON.stringify( objectAccess ) ) );
		return;
	} else if ( _.isUndefined( objectAccess.viewIdsDel ) && !_.isArray( objectAccess.viewIdsDel ) ){
		callback(new Error('Controller: incorrect parameter viewIdsDel in object access: ' +
			JSON.stringify( objectAccess ) ) );
		return;
	} else if( _.difference( objectAccess.viewIdsAdd, Object.keys(globalView) ).length !== 0 ) {
		callback(new Error('Controller: error integrity in viewIdsAdd in object access: ' +
			JSON.stringify( objectAccess ) ) );
		return;
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
AccessModuleView.findForRole = function findForRole( client, role, viewName, callback ) {

	client.GET(  strViewAccessRole( role, viewName ), function( err, reply ) {
		if ( err ) {
			callback( err );
		} else {
			if ( reply ) {
				var objAccess  = JSON.parse(reply);

				callback( null, objAccess );
			} else {
				callback(new Error('Controller: No requested object access (role: ' + role +', ' +
					'viewName: ' + viewName + ')'))
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
AccessModuleView.findForUser = function findForUser( client, user, viewName, callback ) {

	client.GET(  strViewAccessUser( user, viewName ), function( err, reply ) {
		if ( err ) {
			callback( err );
		} else {
			if ( reply ) {
				var objAccess  = JSON.parse(reply);

				callback( null, objAccess );
			} else {
				callback(new Error('Controller: No requested object access (user: ' + user +', ' +
					'viewName: ' + viewName + ')'))
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

			callback( null, listOfViewIds );
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
