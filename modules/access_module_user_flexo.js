var underscore = require('underscore');

var AccessModuleUserFlexo = {};

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
AccessModuleUserFlexo.save = function save( client, user, strFlexoSchemeName, objAccess, callback ){
	var multi = client.multi();
	var key;

	//Сохранение объекта прав в redis
	key = strFlexoAccessUserScheme( user, strFlexoSchemeName );

	multi.SET( key, JSON.stringify( objAccess ) );

	//Сохраняем связку юзера и названия flexo схем по которым есть права
	multi.SADD( setUserToAllFlexoSchemeAccess( user ), strFlexoSchemeName );

	multi.EXEC( function( err, replies ) {
		if ( err ) {
			callback( err );
		} else {
			callback( null, true );
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
AccessModuleUserFlexo.find = function find( client, user, flexoSchemeName, callback ) {

	//Получаем объекты прав для заданной flexo схемы и роли
	client.GET(  strFlexoAccessUserScheme( user, flexoSchemeName ), function( err, reply ) {
		if ( err ) {
			callback( err );
		} else if ( reply ) {
			var objAccess = JSON.parse( reply );

			callback( null, objAccess );
		} else {
			callback(new Error( 'Controller: No requested object access (user: ' + user +', ' +
				'flexoScheme: ' + flexoSchemeName + ')' ) );
		}
	});
};

/**
 * Получаем объекты прав и формируем в нужном виде права
 *
 * @param client - ссылка на клиент redis
 * @param user - строка, логин пользователя
 * @param globalFlexoSchemes - ссылка на глобальный объект с информацией о flexo схемах
 * @param flexoSchemesName - массив, запрашиваемых flexo схем
 * @param callback (err, reply)
 * 		err - ошибка от node_redis
 * 		reply - возвращается искомый объект прав сгруппированный по flexo схемам
 */
AccessModuleUserFlexo.accessDataPreparation =
	function accessDataPreparation( client, user, globalFlexoSchemes, flexoSchemesName, callback ) {
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

			for( var i = 0; i < replies.length; i++) {
				if( replies[i] ){
					objAccessForOneScheme = JSON.parse( replies[i] );
					//ToDo: доделать проверку на создание схемы если нет никаких прав
					objAccess[flexoSchemesName[i]] = {};

					//Информация для заданной flexo из глобального конфига
					var dataFromFlexoConfig = globalFlexoSchemes[flexoSchemesName[i]];
					//Переменная для хранения различия между полями из правами и полями из
					// глобального конфига
					var difference;

					//Права на чтение
					var readFields = accessDataPreparationForMethod( 'read', objAccessForOneScheme,
						dataFromFlexoConfig['read'] );
					//Проверяем целостность прав на чтение
					//Права на flexo не должны по полям превышать глобальных прав
					var resultReadFields = underscore.difference( readFields[0], readFields[1] );
					difference = underscore.difference( resultReadFields,
						dataFromFlexoConfig['read'] );
					if( difference.length !== 0 ){
						//Логируем нарушение целостности
						aDescriptioneError.push({
							type:'loss_integrity',
							variant: 1,
							place: 'AccessModuleUserFlexo.accessDataPreparation',
							time: new Date().getTime(),
							descriptione: {
								flexoSchemesName: flexoSchemesName[i],
								user: user
							}
						});

						//Присутствует нарушение целостности, обрезаем права
						readFields[0] = underscore.difference( readFields[0], difference );
					}
					//Сохраняем права на чтение
					if( readFields[0].length !== 0 || readFields[1].length !== 0 ){
						objAccess[flexoSchemesName[i]]['read'] = readFields;
					}

					//Права на модификацию
					var modifyFields = accessDataPreparationForMethod( 'modify',
						objAccessForOneScheme, dataFromFlexoConfig['modify'] );
					//Проверяем целостность прав на модификацию
					//Права на flexo не должны по полям превышать глобальных прав
					var resultModifyFields = underscore.difference( modifyFields[0],
						modifyFields[1] );
					difference = underscore.difference( resultModifyFields,
						dataFromFlexoConfig['modify'] );
					if( difference.length !== 0 ) {
						//Логируем нарушение целостности
						aDescriptioneError.push({
							type:'loss_integrity',
							variant: 2,
							place: 'AccessModuleUserFlexo.accessDataPreparation',
							time: new Date().getTime(),
							descriptione: {
								flexoSchemesName: flexoSchemesName[i],
								user: user
							}
						});

						//Присутствует нарушение целостности, обрезаем права
						modifyFields[0] = underscore.difference( modifyFields[0], difference );
					}
					//Сохраняем права на модификацию
					if( modifyFields[0].length !== 0 || modifyFields[1].length !== 0 ) {
						objAccess[flexoSchemesName[i]]['modify'] = modifyFields;
					}

					//Права на создание
					var createFields = accessDataPreparationForMethod( 'create',
						objAccessForOneScheme, dataFromFlexoConfig['modify']);
					//Проверяем целостность прав на создание
					//Права на flexo не должны по полям превышать глобальных прав
					var resultCreateFields = underscore.difference( createFields[0],
						createFields[1] );
					difference = underscore.difference( resultCreateFields,
						dataFromFlexoConfig['modify'] );
					if( difference.length !== 0 ){
						//Логируем нарушение целостности
						aDescriptioneError.push({
							type:'loss_integrity',
							variant: 3,
							place: 'AccessModuleUserFlexo.accessDataPreparation',
							time: new Date().getTime(),
							descriptione: {
								flexoSchemesName: flexoSchemesName[i],
								user: user
							}
						});

						//Присутствует нарушение целостности, обрезаем права
						createFields[0] = underscore.difference( createFields[0], difference );
					}
					//Сохраняем права на создание
					if( createFields[0].length !== 0 || createFields[1].length !== 0 ) {
						objAccess[flexoSchemesName[i]]['create'] = createFields;
					}

					//Права на создание всего документа
					if( !underscore.isUndefined( objAccessForOneScheme['createAll'] ) ) {
						if( objAccessForOneScheme['createAll'] ) {
							objAccess[flexoSchemesName[i]]['createAll'] = 1;
						} else {
							objAccess[flexoSchemesName[i]]['createAll'] = 0;
						}
					}

					//Удаление
					if( !underscore.isUndefined( objAccessForOneScheme['delete'] ) ) {
						if( objAccessForOneScheme['delete'] ) {
							objAccess[flexoSchemesName[i]]['delete'] = 1;
						} else {
							objAccess[flexoSchemesName[i]]['delete'] = 0;
						}
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
};

/**
 * Возвращает массив с двумя вложенными массивами разрешенных полей и не разрешенных полей
 * для выполнения указанной операции с БД, для указанной flexo схемы
 *
 * @param method - строка, тип операции
 * @param objAccess - объект с данными о доступе
 * @param fieldsGlobalFlexoScheme -  объект с данными из схем flexo коллекций
 * @returns {*}
 */
function accessDataPreparationForMethod( method, objAccess, fieldsGlobalFlexoScheme ){
	var permissionFields = [];
	var notPermissionFields = [];

	if ( objAccess[method] ) {
		//Проверяем наличие спец команды (all)
		var temp = objAccess[method]['(all)'];
		if( !underscore.isUndefined(temp)) {
			//Проверяется на равенство 1, так как запрет всех полей по роли должно
			// соответстввать отсутствию полей в правах
			if ( objAccess[method]['(all)'] === 1 ){
				//Получаем все поля из объекта прав
				var fields = Object.keys( objAccess[method] );
				//Формируем списки которые необходимо добавить или удалить
				for ( var j = 0; j < fields.length; j++ ) {
					if ( fields[j] !== '(all)' ) {
						if ( objAccess[method][fields[j]] === 1 ){
							permissionFields.push( fields[j] );
						} else {
							notPermissionFields.push( fields[j] );
						}
					}
				}

				//Пересекаем права
				permissionFields = underscore.union( fieldsGlobalFlexoScheme, permissionFields );
			} else {
				//Получаем все поля из объекта прав
				var fields = Object.keys(objAccess[method]);
				//Формируем списки которые необходимо добавить или удалить
				for ( var j = 0; j < fields.length; j++ ) {
					if ( fields[j] !== '(all)' ) {
						if (objAccess[method][fields[j]] === 1){
							permissionFields.push( fields[j] );
						} else {
							notPermissionFields.push( fields[j] );
						}
					}
				}

				//Объединяем права
				notPermissionFields = underscore.union( fieldsGlobalFlexoScheme,
					notPermissionFields );
				//Из запрещенных вычитаем разрешенные (так как '(all)' запрещает все поля, то
				//разрешенные отдельные поля более приоритетны
				notPermissionFields = underscore.difference( notPermissionFields,
					permissionFields );
			}
		} else {
			//Получаем все поля из объекта прав
			var fields = Object.keys( objAccess[method] );
			//Формируем списки которые необходимо добавить или удалить
			for ( var j = 0; j < fields.length; j++) {
				//Проверяется, так как в роли при отсутствия спец команды (all) поля с
				// запретом равносильны отсутствию полей
				if ( objAccess[method][fields[j]] === 1 ){
					permissionFields.push( fields[j] );
				} else {
					notPermissionFields.push( fields[j] );
				}
			}
		}
	}

	return [permissionFields, notPermissionFields];
}

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
AccessModuleUserFlexo.delete = function remove( client, user, flexoSchemeName, callback ){
	var multi = client.multi();
	var key;

	//Формируем команды на удаление
	key = strFlexoAccessUserScheme( user, flexoSchemeName );
	multi.DEL( key );
	multi.SREM( setUserToAllFlexoSchemeAccess( user ), flexoSchemeName );

	//ToDo:Временно удаляем ключ в множестве предназначенного для быстрого удаления всех прав
	multi.SREM( setAllAccess(), key );

	multi.EXEC( function( err ) {
		if ( err ) {
			callback( err );
		} else {
			callback( null, true );
		}
	});
};

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

//Формирование ключа Redis (SET) для множества всех ключей с правами
function setAllAccess(){
	return 'all:access:';
}

module.exports = AccessModuleUserFlexo;