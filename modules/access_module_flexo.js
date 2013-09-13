var _ = require( 'underscore' );
var ModuleErrorLogging = require('./module_error_logging.js');

var AccessModuleFlexo = {};

/**
 * Сохранение модель в redis
 *
 * @param objAccess - объект прав
 * @param role - строка роль
 * @param strFlexoSchemeName - строка, название flexo схемы
 * @param client - объект, редис клиент
 * @param callback (err, reply)
 *        err - ошибка от node_redis
 *        reply - true в случае успешного сохранения
 */
AccessModuleFlexo.saveForRole = function saveForRole( client, sender, role, strFlexoSchemeName,
													  objAccess, globalFlexo, callback ) {
	var objDescriptioneError;
	//Валидация и проверка целостности объекта flexo прав по роли
	validationAndCheckIntegrityAccessForRole( objAccess, globalFlexo, function( errTitle, objForSave,
		type, variant,	textError ) {
		if ( errTitle ) {

			//Логирование ошибки
			objDescriptioneError = {
				type: type,
				variant: variant,
				place: 'Controller.AccessModuleFlexo.saveForRole',
				time: new Date().getTime(),
				sender:sender,
				arguments:{
					role:role,
					flexoName:strFlexoSchemeName,
					objAccess:objAccess
				},
				descriptione: {
					title:errTitle,
					text:textError,
					globalFlexo:globalFlexo
				}
			};

			ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
		} else {
			//Сохранение объекта прав в redis
			var multi = client.multi();
			var key;

			key = strFlexoAccessRoleScheme( role, strFlexoSchemeName );

			multi.SET( key, JSON.stringify( objForSave ) );

			multi.SADD( setRoleToAllFlexoSchemeAccess( role ), strFlexoSchemeName );

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

/**
 * Сохранение модель в redis
 *
 * @param client - ссылка на клиент redis
 * @param user - строка, логин пользователя
 * @param strFlexoSchemeName - строка, имя flexo схемы
 * @param objAccess - объект с описанием прав доступа по пользователю
 * @param callback (err, reply)
 * 		err - ошибка от node_redis
 * 		reply - true в случае успешного сохранения
 */
AccessModuleFlexo.saveForUser = function saveForUser( client, sender, user, strFlexoSchemeName,
													  objAccess, globalFlexo, callback ){
	var objDescriptioneError;
	//Валидация и проверка целостности объекта flexo прав по пользователю
	validationAndCheckIntegrityAccessForUser( objAccess, globalFlexo, function( errTitle, objForSave,
		type, variant,	textError ) {
		if ( errTitle ) {
			//Логирование ошибки
			objDescriptioneError = {
				type: type,
				variant: variant,
				place: 'Controller.AccessModuleFlexo.saveForUser',
				time: new Date().getTime(),
				sender:sender,
				arguments:{
					user:user,
					flexoName:strFlexoSchemeName,
					objAccess:objAccess
				},
				descriptione: {
					title:errTitle,
					text:textError,
					globalFlexo:globalFlexo
				}
			};

			ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);
		} else {
			var multi = client.multi();
			var key;

			//Сохранение объекта прав в redis
			key = strFlexoAccessUserScheme( user, strFlexoSchemeName );

			multi.SET( key, JSON.stringify( objForSave ) );

			//Сохраняем связку юзера и названия flexo схем по которым есть права
			multi.SADD( setUserToAllFlexoSchemeAccess( user ), strFlexoSchemeName );

			multi.EXEC( function( err, replies ) {
				if ( err ) {
					callback( err );
				} else {
					callback( null, true );
				}
			} );
		}
	} );
};

//Валидация и проверка целостности объекта flexo прав по роли
function validationAndCheckIntegrityAccessForRole(objectAccess, globalFlexo, callback){

	if ( _.isUndefined( objectAccess ) && _.isEmpty( objectAccess ) ) {
		callback( 'Controller: incorrect parameter query.access.objAccess', null,
			'invalid_function_arguments', 1,
			'Объект прав query.access.objAccess неопределен или пуст' );
		return;
	}

	var objAccess = _.clone( objectAccess );

	var read = objAccess.read;

	if ( !_.isUndefined( read ) ) {

		if ( _.isUndefined( read['(all)'] ) && !_.isNumber( read['(all)'] ) ){
			callback( 'Controller: incorrect parameter ["(all)"] in query.access.objAccess.read',
				null, 'invalid_function_arguments', 2, 'В объекте прав ' +
					'query.access.objAccess.read спец. ' +
					'параметр (all) не определен или не является числом');
			return;
		} else if ( _.isUndefined( read.fields ) && !_.isArray( read.fields ) ){
			callback('Controller: incorrect parameter read.fields in query.access.objAccess',
				null, 'invalid_function_arguments', 3, 'В объекте прав query.access.objAccess ' +
					'параметр read.fields не определен или не является массивом');
			return;
		}

		if ( _.isUndefined( globalFlexo.read ) ) {
			if( read.fields.length !== 0 ) {
				callback('Controller: error integrity in read.fields in query.access.objAccess',
					null, 'loss_integrity', 1, 'В глобальном объекте c описанием flexo нет полей ' +
						'доступных на чтение, а следовательно в объекте прав ' +
						'query.access.objAccess параметр read.fields' +
						'содержит поля, которых нет в глобальном описании flexo');
				return;
			}
		} else {
			if( _.difference( read.fields, globalFlexo.read ).length !== 0 ) {
				callback('Controller: error integrity in read.fields in query.access.objAccess',
					null, 'loss_integrity', 2, 'В объекте прав ' +
						'query.access.objAccess параметр read.fields' +
						'содержит поля, которых нет в глобальном описании flexo');
				return;
			}
		}
	}

	var modify = objAccess.modify;

	if ( !_.isUndefined( modify ) ) {

		if ( _.isUndefined( modify['(all)'] ) && !_.isNumber( modify['(all)'] ) ) {
			callback( 'Controller: incorrect parameter ["(all)"] in query.access.objAccess.modify',
				null, 'invalid_function_arguments', 4, 'В объекте прав ' +
					'query.access.objAccess.modify спец. ' +
					'параметр (all) не определен или не является числом');
			return;
		} else if ( _.isUndefined( modify.fields ) && !_.isArray( modify.fields ) ){
			callback('Controller: incorrect parameter modify.fields in query.access.objAccess',
				null, 'invalid_function_arguments', 5, 'В объекте прав query.access.objAccess ' +
					'параметр modify.fields не определен или не является массивом');
			return;
		}

		if ( _.isUndefined( globalFlexo.modify ) ) {
			if( modify.fields.length !== 0 ) {
				callback('Controller: error integrity in modify.fields in query.access.objAccess',
					null, 'loss_integrity', 3, 'В глобальном объекте c описанием flexo нет полей ' +
						'доступных на модификацию, а следовательно в объекте прав ' +
						'query.access.objAccess параметр modify.fields' +
						'содержит поля, которых нет в глобальном описании flexo');
				return;
			}
		} else {
			if( _.difference( modify.fields, globalFlexo.modify ).length !== 0 ) {
				callback('Controller: error integrity in modify.fields in query.access.objAccess',
					null, 'loss_integrity', 4, 'В объекте прав ' +
						'query.access.objAccess параметр modify.fields' +
						'содержит поля, которых нет в глобальном описании flexo');
				return;
			}
		}
	}

	var create = objAccess.create;

	if ( !_.isUndefined( create ) ) {

		if ( _.isUndefined( create['(all)'] ) && !_.isNumber( create['(all)'] ) ) {
			callback( 'Controller: incorrect parameter ["(all)"] in query.access.objAccess.create',
				null, 'invalid_function_arguments', 6, 'В объекте прав ' +
					'query.access.objAccess.create спец. ' +
					'параметр (all) не определен или не является числом');
			return;
		} else if ( _.isUndefined( create.fields ) && !_.isArray( create.fields ) ) {
			callback('Controller: incorrect parameter create.fields in query.access.objAccess',
				null, 'invalid_function_arguments', 7, 'В объекте прав query.access.objAccess ' +
					'параметр create.fields не определен или не является массивом');
			return;
		}

		if ( _.isUndefined( globalFlexo.modify ) ) {
			if( create.fields.length !== 0 ) {
				callback('Controller: error integrity in create.fields in query.access.objAccess',
					null, 'loss_integrity', 5, 'В глобальном объекте c описанием flexo нет полей ' +
						'доступных на модификацию, а следовательно в объекте прав ' +
						'query.access.objAccess параметр create.fields' +
						'содержит поля, которых нет в глобальном описании flexo');
				return;
			}
		} else {
			if( _.difference( create.fields, globalFlexo.modify ).length !== 0 ) {
				callback('Controller: error integrity in create.fields in query.access.objAccess',
					null, 'loss_integrity', 6, 'В объекте прав ' +
						'query.access.objAccess параметр create.fields' +
						'содержит поля, которых нет в глобальном описании flexo');
				return;
			}
		}
	}

	if ( _.isUndefined( objAccess.createAll ) ) {
		if ( !_.isUndefined( create ) ) {
			if ( create['(all)'] === 0){
				if (create.fields.length ) {
					objAccess.createAll = 1;
				} else {
					objAccess.createAll = 0;
				}
			} else {
				if (create.fields.length === globalFlexo.modify.length ) {
					objAccess.createAll = 0;
				} else {
					objAccess.createAll = 1;
				}
			}
		}
	} else if ( !_.isNumber( objAccess.createAll ) ) {
		callback( 'Controller: incorrect parameter createAll in query.access.objAccess',
			null, 'invalid_function_arguments', 8, 'В объекте прав query.access.objAccess ' +
				'параметр createAll не является числом');
		return;
	}

	if ( !_.isUndefined( objAccess.delete ) ){

		if ( !_.isNumber( objAccess.delete ) ) {
			callback( 'Controller: incorrect parameter delete in query.access.objAccess',
				null, 'invalid_function_arguments', 9, 'В объекте прав query.access.objAccess ' +
					'параметр delete не является числом');
			return;
		}
	}

	callback( null, objAccess );
}

//Валидация и проверка целостности объекта flexo прав по пользователю
function validationAndCheckIntegrityAccessForUser(objectAccess, globalFlexo, callback){

	if ( _.isUndefined( objectAccess ) || _.isEmpty( objectAccess ) ) {
		callback( 'Controller: incorrect parameter query.access.objAccess', null,
			'invalid_function_arguments', 1,
			'Объект прав query.access.objAccess неопределен или пуст' );
		return;
	}

	var objAccess = _.clone( objectAccess );

	var read = objAccess.read;

	if ( !_.isUndefined( read ) ) {

		if ( !_.isUndefined( read['(all)'] ) ){
			if ( !_.isNumber( read['(all)'] ) ) {
				callback( 'Controller: incorrect parameter ["(all)"] in query.access.objAccess.read',
					null, 'invalid_function_arguments', 2, 'В объекте прав ' +
						'query.access.objAccess.read спец. ' +
						'параметр (all) определен и не является числом');
				return;
			}
		}

		if ( _.isUndefined( read.fieldsAdd ) && !_.isArray( read.fieldsAdd ) ) {
			callback('Controller: incorrect parameter read.fieldsAdd in query.access.objAccess',
				null, 'invalid_function_arguments', 3, 'В объекте прав query.access.objAccess ' +
					'параметр read.fieldsAdd не определен или не является массивом');
			return;
		} else if( _.isUndefined( read.fieldsDel ) && !_.isArray( read.fieldsDel ) ) {
			callback('Controller: incorrect parameter read.fieldsDel in query.access.objAccess',
				null, 'invalid_function_arguments', 4, 'В объекте прав query.access.objAccess ' +
					'параметр read.fieldsDel не определен или не является массивом');
			return;
		}

		if ( _.isUndefined( globalFlexo.read ) ) {
			if( read.fieldsAdd.length !== 0 ) {
				callback('Controller: error integrity in read.fieldsAdd in query.access.objAccess',
					null, 'loss_integrity', 1, 'В глобальном объекте c описанием flexo нет полей ' +
						'доступных на чтение, а следовательно в объекте прав ' +
						'query.access.objAccess параметр read.fieldsAdd' +
						'содержит поля, которых нет в глобальном описании flexo');
				return;
			} else if( read.fieldsDel.length !== 0 ) {
				callback('Controller: error integrity in read.fieldsDel in query.access.objAccess',
					null, 'loss_integrity', 2, 'В глобальном объекте c описанием flexo нет полей ' +
						'доступных на чтение, а следовательно в объекте прав ' +
						'query.access.objAccess параметр read.fieldsDel' +
						'содержит поля, которых нет в глобальном описании flexo');
				return;
			}
		} else {
			if( _.difference( read.fieldsDel, globalFlexo.read ).length !== 0 ) {
				callback('Controller: error integrity in read.fieldsAdd in query.access.objAccess',
					null, 'loss_integrity', 3, 'В объекте прав ' +
						'query.access.objAccess параметр read.fieldsAdd' +
						'содержит поля, которых нет в глобальном описании flexo');
				return;
			} else if( _.difference( read.fieldsDel, globalFlexo.read ).length !== 0 ) {
				callback('Controller: error integrity in read.fieldsDel in query.access.objAccess',
					null, 'loss_integrity', 4, 'В объекте прав ' +
						'query.access.objAccess параметр read.fieldsDel' +
						'содержит поля, которых нет в глобальном описании flexo');
				return;
			}
		}
	}

	var modify = objAccess.modify;

	if ( !_.isUndefined( modify ) ) {

		if ( !_.isUndefined( modify['(all)'] ) ){
			if ( !_.isNumber( modify['(all)'] ) ) {
				callback( 'Controller: incorrect parameter ["(all)"] in query.access.objAccess.modify',
					null, 'invalid_function_arguments', 5, 'В объекте прав ' +
						'query.access.objAccess.modify спец. ' +
						'параметр (all) определен и не является числом');
				return;
			}
		}

		if ( _.isUndefined( modify.fieldsAdd ) && !_.isArray( modify.fieldsAdd ) ) {
			callback('Controller: incorrect parameter modify.fieldsAdd in query.access.objAccess',
				null, 'invalid_function_arguments', 6, 'В объекте прав query.access.objAccess ' +
					'параметр modify.fieldsAdd не определен или не является массивом');
			return;
		} else if( _.isUndefined( modify.fieldsDel ) && !_.isArray( modify.fieldsDel ) ) {
			callback('Controller: incorrect parameter modify.fieldsDel in query.access.objAccess',
				null, 'invalid_function_arguments', 7, 'В объекте прав query.access.objAccess ' +
					'параметр modify.fieldsDel не определен или не является массивом');
			return;
		}

		if ( _.isUndefined( globalFlexo.modify ) ) {
			if( modify.fieldsAdd.length !== 0 ) {
				callback('Controller: error integrity in modify.fieldsAdd in query.access.objAccess',
					null, 'loss_integrity', 5, 'В глобальном объекте c описанием flexo нет полей ' +
						'доступных на модификацию, а следовательно в объекте прав ' +
						'query.access.objAccess параметр modify.fieldsAdd' +
						'содержит поля, которых нет в глобальном описании flexo');
				return;
			} else if( modify.fieldsDel.length !== 0 ) {
				callback('Controller: error integrity in modify.fieldsDel in query.access.objAccess',
					null, 'loss_integrity', 6, 'В глобальном объекте c описанием flexo нет полей ' +
						'доступных на модификацию, а следовательно в объекте прав ' +
						'query.access.objAccess параметр modify.fieldsDel' +
						'содержит поля, которых нет в глобальном описании flexo');
				return;
			}
		} else {
			if( _.difference( modify.fieldsDel, globalFlexo.modify ).length !== 0 ) {
				callback('Controller: error integrity in modify.fieldsAdd in query.access.objAccess',
					null, 'loss_integrity', 7, 'В объекте прав ' +
						'query.access.objAccess параметр modify.fieldsAdd' +
						'содержит поля, которых нет в глобальном описании flexo');
				return;
			} else if( _.difference( modify.fieldsDel, globalFlexo.modify ).length !== 0 ) {
				callback('Controller: error integrity in modify.fieldsDel in query.access.objAccess',
					null, 'loss_integrity', 8, 'В объекте прав ' +
						'query.access.objAccess параметр modify.fieldsDel' +
						'содержит поля, которых нет в глобальном описании flexo');
				return;
			}
		}
	}

	var create = objAccess.create;

	if ( !_.isUndefined( create ) ) {

		if ( !_.isUndefined( create['(all)'] ) ){
			if ( !_.isNumber( create['(all)'] ) ) {
				callback( 'Controller: incorrect parameter ["(all)"] in query.access.objAccess.create',
					null, 'invalid_function_arguments', 8, 'В объекте прав ' +
						'query.access.objAccess.create спец. ' +
						'параметр (all) определен и не является числом');
				return;
			}
		}

		if ( _.isUndefined( create.fieldsAdd ) && !_.isArray( create.fieldsAdd ) ) {
			callback('Controller: incorrect parameter create.fieldsAdd in query.access.objAccess',
				null, 'invalid_function_arguments', 9, 'В объекте прав query.access.objAccess ' +
					'параметр create.fieldsAdd не определен или не является массивом');
			return;
		} else if( _.isUndefined( create.fieldsDel ) && !_.isArray( create.fieldsDel ) ) {
			callback('Controller: incorrect parameter create.fieldsDel in query.access.objAccess',
				null, 'invalid_function_arguments', 10, 'В объекте прав query.access.objAccess ' +
					'параметр create.fieldsDel не определен или не является массивом');
			return;
		}

		if ( _.isUndefined( globalFlexo.modify ) ) {
			if( create.fieldsAdd.length !== 0 ) {
				callback('Controller: error integrity in create.fieldsAdd in query.access.objAccess',
					null, 'loss_integrity', 9, 'В глобальном объекте c описанием flexo нет полей ' +
						'доступных на модификацию, а следовательно в объекте прав ' +
						'query.access.objAccess параметр create.fieldsAdd' +
						'содержит поля, которых нет в глобальном описании flexo');
				return;
			} else if( create.fieldsDel.length !== 0 ) {
				callback('Controller: error integrity in create.fieldsDel in query.access.objAccess',
					null, 'loss_integrity', 10, 'В глобальном объекте c описанием flexo нет полей ' +
						'доступных на модификацию, а следовательно в объекте прав ' +
						'query.access.objAccess параметр create.fieldsDel' +
						'содержит поля, которых нет в глобальном описании flexo');
				return;
			}
		} else {
			if( _.difference( create.fieldsDel, globalFlexo.modify ).length !== 0 ) {
				callback('Controller: error integrity in create.fieldsAdd in query.access.objAccess',
					null, 'loss_integrity', 11, 'В объекте прав ' +
						'query.access.objAccess параметр create.fieldsAdd' +
						'содержит поля, которых нет в глобальном описании flexo');
				return;
			} else if( _.difference( create.fieldsDel, globalFlexo.modify ).length !== 0 ) {
				callback('Controller: error integrity in create.fieldsDel in query.access.objAccess',
					null, 'loss_integrity', 12, 'В объекте прав ' +
						'query.access.objAccess параметр create.fieldsDel' +
						'содержит поля, которых нет в глобальном описании flexo');
				return;
			}
		}
	}

	if ( _.isUndefined( objAccess.createAll ) ) {
		if ( !_.isUndefined( create ) ) {
			if ( !_.isUndefined( create['(all)'] ) ){
			 	if ( create['(all)'] === 0){
					if (create.fieldsAdd.length ) {
						objAccess.createAll = 1;
					} else {
						objAccess.createAll = 0;
					}
				} else {
					if (create.fieldsDel.length === globalFlexo.modify.length ) {
						objAccess.createAll = 0;
					} else {
						objAccess.createAll = 1;
					}
				}
			} else {
				if (create.fieldsAdd.length ) {
					objAccess.createAll = 1;
				} else {
					objAccess.createAll = 0;
				}
			}
		} else {
			objAccess.createAll = 0;
		}
	} else if ( !_.isNumber( objAccess.createAll ) ) {
		callback( 'Controller: incorrect parameter createAll in query.access.objAccess',
			null, 'invalid_function_arguments', 11, 'В объекте прав query.access.objAccess ' +
				'параметр createAll не является числом');
		return;
	}

	if ( !_.isUndefined( objAccess.delete ) ){

		if ( !_.isNumber( objAccess.delete ) ) {
			callback( 'Controller: incorrect parameter delete in query.access.objAccess',
				null, 'invalid_function_arguments', 12, 'В объекте прав query.access.objAccess ' +
					'параметр delete не является числом');
			return;
		}
	}

	callback( null, objAccess );
}


/**
 * Поиск модели прав для flexo схемы и заданной роли в redis
 *
 * @param client - объект, клиент redis
 * @param role - строка, название роли
 * @param flexoSchemeName - строка, название flexo схемы
 * @param callback (err, reply)
 * 		err - ошибка от node_redis, или ошибка синализирующая об отсутствии запрашиваемого объекта
 * 		reply - возвращается искомый объект прав
 */
AccessModuleFlexo.findForRole = function findForRole( client, sender, role, flexoSchemeName, callback ) {
	var objDescriptioneError;
	//Получаем объекты прав для заданной flexo схемы и роли
	client.GET( strFlexoAccessRoleScheme( role, flexoSchemeName ), function( err, reply ) {
		if ( err ) {
			callback( err );
		} else if ( reply ) {
			var objAccess = JSON.parse(reply);

			callback( null, objAccess );
		} else {
			//Логирование ошибки
			/*objDescriptioneError = {
				type: "non-existent_data",
				variant: 1,
				place: 'Controller.AccessModuleFlexo.findForRole',
				time: new Date().getTime(),
				sender:sender,
				arguments:{
					role:role,
					flexoName:flexoSchemeName
				},
				descriptione: {
					title:'Controller: No requested object access',
					text:'Запрашивается не существующий объект прав на flexo по роли'
				}
			};

			ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);*/
			callback(new Error('Controller: No requested object access'));
		}
	});
};

/**
 * Поиск модели прав для flexo схемы и заданной роли в redis
 *
 * @param client - ссылка на клиент redis
 * @param user - строка, логин пользоватея
 * @param flexoSchemeName - строка, название flexo схемы
 * @param callback (err, reply)
 * 		err - ошибка от node_redis или ошибка сигнализирующая об отсутствии объекта прав
 * 		reply - искомый объект прав
 */
AccessModuleFlexo.findForUser = function findForUser( client, sender, user, flexoSchemeName, callback ) {
	var objDescriptioneError;
	//Получаем объекты прав для заданной flexo схемы и роли
	client.GET(  strFlexoAccessUserScheme( user, flexoSchemeName ), function( err, reply ) {
		if ( err ) {
			callback( err );
		} else if ( reply ) {
			var objAccess = JSON.parse( reply );

			callback( null, objAccess );
		} else {
			/*//Логирование ошибки
			objDescriptioneError = {
				type: "non-existent_data",
				variant: 1,
				place: 'Controller.AccessModuleFlexo.findForUser',
				time: new Date().getTime(),
				sender:sender,
				arguments:{
					user:user,
					flexoName:flexoSchemeName
				},
				descriptione: {
					title:'Controller: No requested object access',
					text:'Запрашивается не существующий объект прав на flexo по пользователю'
				}
			};

			ModuleErrorLogging.saveAndReturnError(client, objDescriptioneError, callback);*/
			callback( new Error ( 'Controller: No requested object access' ) );
		}
	});
};

AccessModuleFlexo.accessDataPreparation = function accessDataPreparation(client, sender,
	flexoSchemesName, globalFlexoSchemes, callback){

	//Получаем объекты прав и формируем в нужном виде права по роли
	accessDataPreparationForRole( client, sender, globalFlexoSchemes, flexoSchemesName,
		function( err, objAccessFromRole ) {
		if ( err ) {
			callback ( err );
		} else {
			//Получаем объекты прав и формируем в нужном виде права по пользователю
			accessDataPreparationForUser( client, sender, globalFlexoSchemes, flexoSchemesName,
				objAccessFromRole, function( err, objAccess ) {
				if ( err ) {
					callback ( err );
				} else {
					callback ( null, objAccess );
				}
			} );
		}
	} );

};

/**
 * Получаем объекты прав и формируем в нужном виде права
 *
 * @param client - ссылка на объект клиента redis
 * @param role - строка, название роли
 * @param globalFlexoSchemes - ссылка на глобальный объект с описанием flexo схем
 * @param flexoSchemesName - массив, запрашиваемых flexo схем
 * @param callback (err, reply)
 * 		err - ошибка от node_redis
 * 		reply - возвращается искомый объект прав сгруппированный по flexo схемам
 */
function accessDataPreparationForRole( client, sender, globalFlexoSchemes, flexoSchemesName, callback ) {
	var role = sender.role;

	var multi = client.multi();
	//Формируем команды для получения объектов прав по указанным схемам
	for( var i = 0; i < flexoSchemesName.length; i++ ) {
		multi.GET( strFlexoAccessRoleScheme( role, flexoSchemesName[i] ) );
	}

	multi.EXEC( function ( err, replies ) {
		if ( err ) {
			callback ( err );
		} else {
			//Формируем объект прав
			var objAccessForOneScheme;
			var objAccess = {};
			//Объект для сохранения информации об нарушениях целостности
			var aDescriptioneError = [];
			for( var i = 0; i < replies.length; i++) {
				if( replies[i] ){
					objAccessForOneScheme = JSON.parse( replies[i] );

					objAccess[flexoSchemesName[i]] = {};

					//Информация для заданной flexo из глобального конфига
					var dataFlexoConfig = globalFlexoSchemes[flexoSchemesName[i]];
					//Переменная для хранения полей разрешенных правами flexo
					var fields;
					//Переменная для хранения различия между полями из правами и полями из
					// глобального конфига
					var difference;
					//Переменная для содержания описания ошибки
					var objDescriptioneError;

					//Права на чтение
					if ( !_.isUndefined( objAccessForOneScheme.read ) ) {

						if ( objAccessForOneScheme.read['(all)'] ) {
							fields = _.difference( dataFlexoConfig.read,
								objAccessForOneScheme.read.fields );
						} else {
							fields = objAccessForOneScheme;

							//Проверяем целостность прав на чтение
							//Права на flexo не должны по полям превышать глобальных прав
							difference = _.difference( fields, dataFlexoConfig.read );
							if( difference.length !== 0 ) {
								//Логируем нарушение целостности
								objDescriptioneError = {
									type: "loss_integrity",
									variant: 1,
									place: 'Controller.AccessModuleFlexo.accessDataPreparation',
									time: new Date().getTime(),
									sender:sender,
									arguments:{
										flexoName:flexoSchemesName[i]
									},
									descriptione: {
										text:'Нарушение целостности, так как объект прав по роли на ' +
											'flexo на чтение содержит поля которых нет в ' +
											'глобальном описании flexo',
										globalFlexo:dataFlexoConfig,
										objAccessRole:objAccessForOneScheme
									}
								};

								aDescriptioneError.push(objDescriptioneError);

								//Присутствует нарушение целостности, обрезаем права
								fields = _.difference( fields, difference );
							}

						}
						//Сохраняем права на чтение
						objAccess[flexoSchemesName[i]]['read'] = fields;

					} else {
						objAccess[flexoSchemesName[i]]['read'] = [];
					}

					//Права на модификацию
					if ( !_.isUndefined( objAccessForOneScheme.modify ) ) {
						if ( objAccessForOneScheme.modify['(all)'] ) {
							fields = _.difference( dataFlexoConfig.modify,
								objAccessForOneScheme.modify.fields );
						} else {
							fields = objAccessForOneScheme;

							//Проверяем целостность прав на модификацию
							//Права на flexo не должны по полям превышать глобальных прав
							difference = _.difference( fields, dataFlexoConfig.modify );
							if( difference.length !== 0 ) {
								//Логируем нарушение целостности
								objDescriptioneError = {
									type: "loss_integrity",
									variant: 2,
									place: 'Controller.AccessModuleFlexo.accessDataPreparation',
									time: new Date().getTime(),
									sender:sender,
									arguments:{
										flexoName:flexoSchemesName[i]
									},
									descriptione: {
										text:'Нарушение целостности, так как объект прав по роли на ' +
											'flexo на модификацию содержит поля которых нет в ' +
											'глобальном описании flexo',
										globalFlexo:dataFlexoConfig,
										objAccessRole:objAccessForOneScheme
									}
								};

								aDescriptioneError.push(objDescriptioneError);

								//Присутствует нарушение целостности, обрезаем права
								fields = _.difference( fields, difference );
							}
						}
						//Сохраняем права на модификацию
						objAccess[flexoSchemesName[i]]['modify'] = fields;

					} else {
						//Сохраняем права на модификацию
						objAccess[flexoSchemesName[i]]['modify'] = [];
					}

					//Права на создание
					if ( !_.isUndefined( objAccessForOneScheme.create ) ) {
						if ( objAccessForOneScheme.create['(all)'] ) {
							fields = _.difference( dataFlexoConfig.modify,
								objAccessForOneScheme.create.fields );
						} else {
							fields = objAccessForOneScheme;

							difference = _.difference( fields, dataFlexoConfig['modify']);

							if( difference.length !== 0 ) {
								//Логируем нарушение целостности
								objDescriptioneError = {
									type: "loss_integrity",
									variant: 3,
									place: 'Controller.AccessModuleFlexo.accessDataPreparation',
									time: new Date().getTime(),
									sender:sender,
									arguments:{
										flexoName:flexoSchemesName[i]
									},
									descriptione: {
										text:'Нарушение целостности, так как объект прав по роли на ' +
											'flexo на создание содержит поля которых нет в ' +
											'глобальном описании flexo',
										globalFlexo:dataFlexoConfig,
										objAccessRole:objAccessForOneScheme
									}
								};

								aDescriptioneError.push(objDescriptioneError);

								//Присутствует нарушение целостности, обрезаем права
								fields = _.difference( fields, difference );
							}
						}

						//Сохраняем права на создание
						objAccess[flexoSchemesName[i]]['create'] = fields;

						//Права на создание всего документа
						if( objAccessForOneScheme['createAll'] ) {
							objAccess[flexoSchemesName[i]]['createAll'] = 1;
						} else {
							objAccess[flexoSchemesName[i]]['createAll'] = 0;
						}

					} else {
						//Сохраняем права на создание
						objAccess[flexoSchemesName[i]]['create'] = [];
						objAccess[flexoSchemesName[i]]['createAll'] = 0;
					}

                    //Удаление
					if( objAccessForOneScheme['delete'] ) {
						objAccess[flexoSchemesName[i]]['delete'] = 1;
					} else {
						objAccess[flexoSchemesName[i]]['delete'] = 0;
					}
				} else {
					objAccess[flexoSchemesName[i]] = {
						read:[],
						modify:[],
						create:[],
						createAll:0,
						delete:0
					}
				}
			}
			if (aDescriptioneError.length !== 0 ){
				ModuleErrorLogging.save(client, aDescriptioneError, function( err, reply ) {
					if ( err ) {
						callback( err );
					} else {
						callback(null, objAccess);
					}
				});
			} else {
				callback(null, objAccess);
			}
		}
	} );
}

/**
 * Получаем объекты прав по пользователю и пересекаем права с правами по роли
 *
 * @param client - ссылка на клиент redis
 * @param user - строка, логин пользователя
 * @param globalFlexoSchemes - ссылка на глобальный объект с информацией о flexo схемах
 * @param flexoSchemesName - массив, запрашиваемых flexo схем
 * @param callback (err, reply)
 * 		err - ошибка от node_redis
 * 		reply - возвращается искомый объект прав сгруппированный по flexo схемам
 */
function accessDataPreparationForUser( client, sender, globalFlexoSchemes, flexoSchemesName,
									   objAccessFromRole, callback ) {
	var user = sender.login;
	var role = sender.role;

	var multi = client.multi();
	//Формируем команды для получения объектов прав по указанным схемам
	for( var i = 0; i < flexoSchemesName.length; i++ ) {
		multi.GET( strFlexoAccessUserScheme( user, flexoSchemesName[i] ) );
	}

	multi.EXEC( function ( err, replies ) {
		if ( err ) {
			callback ( err );
		} else {
			//Формируем объект прав
			var objAccessForOneScheme;
			var objAccess = {};
			//Объект для сохранения информации об нарушениях целостности
			var aDescriptioneError = [];
			//Переменная для содержания описания ошибки
			var objDescriptioneError;

			for( var i = 0; i < replies.length; i++) {
				if( replies[i] ){
					objAccessForOneScheme = JSON.parse( replies[i] );

					objAccess[flexoSchemesName[i]] = {};

					//Массив для хранения с разрешенными правами на flexo
					var fields;
					//Информация для заданной flexo из глобального конфига
					var dataFlexoConfig = globalFlexoSchemes[flexoSchemesName[i]];
					//Переменная для хранения различия между полями из правами и полями из
					// глобального конфига
					var difference;
					//Переманная для хранения flexo прав по пользователю
					var roleAccess = objAccessFromRole[flexoSchemesName[i]];

					//Права на чтение
					if ( !_.isUndefined( objAccessForOneScheme.read ) ) {

						if ( !_.isUndefined( objAccessForOneScheme.read['(all)'] ) ) {
							if ( objAccessForOneScheme.read['(all)'] === 1 ) {
								fields = _.difference(dataFlexoConfig.read,
									objAccessForOneScheme.read.fieldsDel);

								//Сохраняем права на чтение
								objAccess[flexoSchemesName[i]]['read'] = fields;
							} else if ( objAccessForOneScheme.read['(all)'] === 0 ) {
								fields = objAccessForOneScheme.read.fieldsAdd;

								//Проверяем целостность прав на чтение
								//Права на flexo не должны по полям превышать глобальных прав
								difference = _.difference( fields, dataFlexoConfig.read );
								if( difference.length !== 0 ) {
									//Логируем нарушение целостности
									objDescriptioneError = {
										type: "loss_integrity",
										variant: 4,
										place: 'Controller.AccessModuleFlexo.accessDataPreparation',
										time: new Date().getTime(),
										sender:sender,
										arguments:{
											flexoName:flexoSchemesName[i]
										},
										descriptione: {
											text:'Нарушение целостности, так как объект прав по ' +
												'пользователю на flexo на чтение содержит поля ' +
												'которых нет в глобальном описании flexo',
											globalFlexo:dataFlexoConfig,
											objAccessUser:objAccessForOneScheme
										}
									};

									//Логируем нарушение целостности
									aDescriptioneError.push(objDescriptioneError);

									//Присутствует нарушение целостности, обрезаем права
									fields = _.difference( fields, difference );

								}
								//Сохраняем права на чтение
								objAccess[flexoSchemesName[i]]['read'] = fields
							}
						} else {
							fields = _.union(roleAccess.read, objAccessForOneScheme.read.fieldsAdd);
							fields = _.difference(fields, objAccessForOneScheme.read.fieldsDel);

							//Проверяем целостность прав на чтение
							//Права на flexo не должны по полям превышать глобальных прав
							difference = _.difference( fields, dataFlexoConfig.read );
							if( difference.length !== 0 ) {
								//Логируем нарушение целостности
								objDescriptioneError = {
									type: "loss_integrity",
									variant: 5,
									place: 'Controller.AccessModuleFlexo.accessDataPreparation',
									time: new Date().getTime(),
									sender:sender,
									arguments:{
										flexoName:flexoSchemesName[i]
									},
									descriptione: {
										text:'Нарушение целостности, так как объект прав на ' +
											'flexo на чтение содержит поля которых нет в ' +
											'глобальном описании flexo',
										globalFlexo:dataFlexoConfig,
										objAccessRole:roleAccess,
										objAccessUser:objAccessForOneScheme
									}
								};

								aDescriptioneError.push(objDescriptioneError);

								//Присутствует нарушение целостности, обрезаем права
								fields = _.difference( fields, difference );
							}
							//Сохраняем права на чтение
							objAccess[flexoSchemesName[i]]['read'] = fields
						}

					} else {
						objAccess[flexoSchemesName[i]]['read'] = roleAccess['read'];
					}

					//Права на модификацию
					if ( !_.isUndefined( objAccessForOneScheme.modify ) ) {

						if ( !_.isUndefined( objAccessForOneScheme.modify['(all)'] ) ) {
							if ( objAccessForOneScheme.modify['(all)'] === 1 ) {
								fields = _.difference(dataFlexoConfig.modify,
									objAccessForOneScheme.modify.fieldsDel);

								//Сохраняем права на чтение
								objAccess[flexoSchemesName[i]]['modify'] = fields;
							} else if ( objAccessForOneScheme.modify['(all)'] === 0 ) {
								fields = objAccessForOneScheme.modify.fieldsAdd;

								//Проверяем целостность прав на чтение
								//Права на flexo не должны по полям превышать глобальных прав
								difference = _.difference( fields, dataFlexoConfig.modify );
								if( difference.length !== 0 ) {
									//Логируем нарушение целостности
									objDescriptioneError = {
										type: "loss_integrity",
										variant: 6,
										place: 'Controller.AccessModuleFlexo.accessDataPreparation',
										time: new Date().getTime(),
										sender:sender,
										arguments:{
											flexoName:flexoSchemesName[i]
										},
										descriptione: {
											text:'Нарушение целостности, так как объект прав по ' +
												'пользователю на flexo на модификацию содержит поля ' +
												'которых нет в глобальном описании flexo',
											globalFlexo:dataFlexoConfig,
											objAccessUser:objAccessForOneScheme
										}
									};

									aDescriptioneError.push(objDescriptioneError);

									//Присутствует нарушение целостности, обрезаем права
									fields = _.difference( fields, difference );

								}
								//Сохраняем права на чтение
								objAccess[flexoSchemesName[i]]['modify'] = fields
							}
						} else {
							fields = _.union(roleAccess.modify,
								objAccessForOneScheme.modify.fieldsAdd);
							fields = _.difference(fields, objAccessForOneScheme.modify.fieldsDel);

							//Проверяем целостность прав на чтение
							//Права на flexo не должны по полям превышать глобальных прав
							difference = _.difference( fields, dataFlexoConfig.modify );
							if( difference.length !== 0 ) {
								//Логируем нарушение целостности
								objDescriptioneError = {
									type: "loss_integrity",
									variant: 7,
									place: 'Controller.AccessModuleFlexo.accessDataPreparation',
									time: new Date().getTime(),
									sender:sender,
									arguments:{
										flexoName:flexoSchemesName[i]
									},
									descriptione: {
										text:'Нарушение целостности, так как объект прав на ' +
											'flexo на модификацию содержит поля которых нет в ' +
											'глобальном описании flexo',
										globalFlexo:dataFlexoConfig,
										objAccessRole:roleAccess,
										objAccessUser:objAccessForOneScheme
									}
								};

								aDescriptioneError.push(objDescriptioneError);

								//Присутствует нарушение целостности, обрезаем права
								fields = _.difference( fields, difference );
							}

							//Сохраняем права на чтение
							objAccess[flexoSchemesName[i]]['modify'] = fields
						}

					} else {
						objAccess[flexoSchemesName[i]]['modify'] = roleAccess['modify'];
					}

					//Права на создание
					if ( !_.isUndefined( objAccessForOneScheme.create ) ) {

						if ( !_.isUndefined( objAccessForOneScheme.create['(all)'] ) ) {
							if ( objAccessForOneScheme.create['(all)'] === 1 ) {
								fields = _.difference(dataFlexoConfig.modify,
									objAccessForOneScheme.create.fieldsDel);

								//Сохраняем права на чтение
								objAccess[flexoSchemesName[i]]['create'] = fields;
							} else if ( objAccessForOneScheme.create['(all)'] === 0 ) {
								fields = objAccessForOneScheme.create.fieldsAdd;

								//Проверяем целостность прав на чтение
								//Права на flexo не должны по полям превышать глобальных прав
								difference = _.difference( fields, dataFlexoConfig.modify );
								if( difference.length !== 0 ) {
									//Логируем нарушение целостности
									objDescriptioneError = {
										type: "loss_integrity",
										variant: 8,
										place: 'Controller.AccessModuleFlexo.accessDataPreparation',
										time: new Date().getTime(),
										sender:sender,
										arguments:{
											flexoName:flexoSchemesName[i]
										},
										descriptione: {
											text:'Нарушение целостности, так как объект прав по ' +
												'пользователю на flexo на создание содержит поля ' +
												'которых нет в глобальном описании flexo',
											globalFlexo:dataFlexoConfig,
											objAccessUser:objAccessForOneScheme
										}
									};

									aDescriptioneError.push(objDescriptioneError);

									//Присутствует нарушение целостности, обрезаем права
									fields = _.difference( fields, difference );

								}
								//Сохраняем права на чтение
								objAccess[flexoSchemesName[i]]['create'] = fields
							}
						} else {
							fields = _.union(roleAccess.create,
								objAccessForOneScheme.create.fieldsAdd);
							fields = _.difference(fields, objAccessForOneScheme.create.fieldsDel);

							//Проверяем целостность прав на чтение
							//Права на flexo не должны по полям превышать глобальных прав
							difference = _.difference( fields, dataFlexoConfig.modify );
							if( difference.length !== 0 ) {
								//Логируем нарушение целостности
								objDescriptioneError = {
									type: "loss_integrity",
									variant: 9,
									place: 'Controller.AccessModuleFlexo.accessDataPreparation',
									time: new Date().getTime(),
									sender:sender,
									arguments:{
										flexoName:flexoSchemesName[i]
									},
									descriptione: {
										text:'Нарушение целостности, так как объект прав на ' +
											'flexo на создание содержит поля которых нет в ' +
											'глобальном описании flexo',
										globalFlexo:dataFlexoConfig,
										objAccessRole:roleAccess,
										objAccessUser:objAccessForOneScheme
									}
								};

								aDescriptioneError.push(objDescriptioneError);

								//Присутствует нарушение целостности, обрезаем права
								fields = _.difference( fields, difference );
							}

							//Сохраняем права на чтение
							objAccess[flexoSchemesName[i]]['create'] = fields
						}

					} else {
						objAccess[flexoSchemesName[i]]['create'] = roleAccess['create'];
					}

					//Права на создание всего документа
					if( !_.isUndefined( objAccessForOneScheme['createAll'] ) ) {
						if( objAccessForOneScheme['createAll'] ) {
							objAccess[flexoSchemesName[i]]['createAll'] = 1;
						} else {
							objAccess[flexoSchemesName[i]]['createAll'] = 0;
						}
					} else {
						objAccess[flexoSchemesName[i]]['create'] = roleAccess['createAll'];
					}

					//Удаление
					if( !_.isUndefined( objAccessForOneScheme['delete'] ) ) {
						if( objAccessForOneScheme['delete'] ) {
							objAccess[flexoSchemesName[i]]['delete'] = 1;
						} else {
							objAccess[flexoSchemesName[i]]['delete'] = 0;
						}
					} else {
						objAccess[flexoSchemesName[i]]['delete'] = roleAccess['delete'];
					}
				} else {
					objAccess[flexoSchemesName[i]] = objAccessFromRole[flexoSchemesName[i]];
				}
			}

			if (aDescriptioneError.length !== 0 ){
				ModuleErrorLogging.save(client, aDescriptioneError, function( err, reply ) {
					if ( err ) {
						callback( err );
					} else {
						callback(null, objAccess);
					}
				});
			} else {
				callback(null, objAccess);
			}
		}
	} );
}

/**
 * Удаление модели прав для flexo схемы по роли в redis
 * @param client - ссылка на клиент redis
 * @param role - строка, название роли
 * @param flexoSchemeName - строка, название flexo схемы
 * @param callback (err, reply)
 * 		err - ошибка от node_redis
 * 		reply - - true в случае успешного удаления
 */
AccessModuleFlexo.deleteForRole = function deleteForRole( client, role, flexoSchemeName, callback ){
	var multi = client.multi();
	var key;

	//Формируем команды на удаление
	key = strFlexoAccessRoleScheme( role, flexoSchemeName );
	multi.DEL( key );

	multi.SREM( setRoleToAllFlexoSchemeAccess( role ), flexoSchemeName);

	multi.EXEC( function( err ) {
		if ( err ) {
			callback( err );
		} else {
			callback( null, true );
		}
	});
};

/**
 * Удаление модели прав для flexo схемы и логина пользователя в redis
 *
 * @param client - ссылка на клиент redis
 * @param user - строка, логин пользователя
 * @param flexoSchemeName - строка, название flexo схемы
 * @param callback (err, reply)
 * 		err - ошибка от node_redis
 * 		reply - - true в случае успешного удаления
 */
AccessModuleFlexo.deleteForUser = function deleteForUser( client, user, flexoSchemeName, callback ){
	var multi = client.multi();
	var key;

	//Формируем команды на удаление
	key = strFlexoAccessUserScheme( user, flexoSchemeName );
	multi.DEL( key );
	multi.SREM( setUserToAllFlexoSchemeAccess( user ), flexoSchemeName );

	multi.EXEC( function( err ) {
		if ( err ) {
			callback( err );
		} else {
			callback( null, true );
		}
	});
};


//Формирование ключа REDIS (SET) для сохранения связки роли юзера и названия flexo схем по
// которым у него есть права
function setRoleToAllFlexoSchemeAccess( role ) {
	return 'role:all:flexoSchemeName:' + role;
}

//Формирование строки ключа Redis (STRING) для прав относящиеся к заданной flexo схемы и роли
function strFlexoAccessRoleScheme( role, flexoSchemeName ) {
	return 'flexo:role:access:' + role + ':' + flexoSchemeName;
}

//Формирование ключа Redis (SET) для множества всех ключей с правами
function setAllAccess(){
	return 'all:access:';
}

//Формирование ключа REDIS (SET) для сохранения связки логина юзера и названия flexo схем по
// которым у него есть права
function setUserToAllFlexoSchemeAccess( user ) {
	return 'user:all:flexoSchemeName:' + user;
}

//Формирование строки ключа Redis (STRING) для прав относящиеся к заданной flexo схемы и логина
//пользователя
function strFlexoAccessUserScheme( user, flexoSchemeName ) {
	return 'flexo:user:access:' + user + ':' + flexoSchemeName;
}

module.exports = AccessModuleFlexo;