var underscore = require('underscore');

var AccessModuleUserFlexo = {};

/**
 * Сохранение модель в redis
 *
 * @param callback (err, reply)
 * 		err - ошибка от node_redis
 * 		reply - true в случае успешного сохранения
 */
AccessModuleUserFlexo.save = function save( client, user, strFlexoSchemeName, objAccess, callback ){
	var multi = client.multi();
	var key;

	//Сохранение объекта прав в redis
	key = strFlexoAccessUserScheme( user, strFlexoSchemeName );

	multi.SET( key, JSON.stringify(objAccess));

	//ToDo:Временно сохраняем ключ в множество для быстрого удаления всех прав
	multi.SADD( setAllAccess, key );

	multi.EXEC( function( err ) {
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
 * @param flexoSchemeName - строка, название flexo схемы
 * @param callback (err, reply)
 * 		err - ошибка от node_redis
 * 		reply - возвращается искомый объект прав
 */
AccessModuleUserFlexo.find = function find( client, user, flexoSchemeName, callback ) {

	//Получаем объекты прав для заданной flexo схемы и роли
	client.GET(  strFlexoAccessUserScheme( user, flexoSchemeName ), function( err, reply ) {
		if ( err ) {
			callback( err );
		} else if ( reply ) {
			var objAccess = JSON.parse(reply);

			callback( null, objAccess );
		} else {
			callback(new Error( 'No requested object access (user: ' + user +', flexoScheme: ' +
				flexoSchemeName + ')' ) );
		}
	});
};

/**
 * Формирование объект права на чтение для запрашиваемых схем
 *
 * @param flexoSchemesName - массив строк, названия запрашиваемых схем
 * @param globalFlexoSchemes - объект с данными из схем flexo коллекций
 * @param callback
 */
AccessModuleUserFlexo.findReadAccesses =
	function findReadAccesses( client, user, globalFlexoSchemes, flexoSchemesName, callback ) {
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
			var objReadAccess = {};

			for( var i = 0; i < replies.length; i++) {
				if( replies[i] ){
					objAccessForOneScheme = JSON.parse( replies[i] );

					objReadAccess[flexoSchemesName[i]] =
						accessDataPreparationForMethod('read', objAccessForOneScheme,
							globalFlexoSchemes[flexoSchemesName[i]]['read']);
				}
			}
			callback(null, objReadAccess)
		}
	} );
};

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

			for( var i = 0; i < replies.length; i++) {
				if( replies[i] ){
					objAccessForOneScheme = JSON.parse( replies[i] );
					//ToDo: доделать проверку на создание схемы если нет никаких прав
					objAccess[flexoSchemesName[i]] = {};

					//Права на чтение
					var readFields = accessDataPreparationForMethod('read', objAccessForOneScheme,
						globalFlexoSchemes[flexoSchemesName[i]]['read']);
					//Проверяем целостность прав на чтение
					//Права на flexo не должны по полям превышать глобальных прав
					var resultReadFields = underscore.difference(readFields[0], readFields[1]);
					var differenceRead = underscore.difference(resultReadFields,
						globalFlexoSchemes[flexoSchemesName[i]]['read']);
					if( differenceRead.length !== 0 ){
						//ToDo: доделать сигнализацию о нарушении целостности
						//Присутствует нарушение целостности, обрезаем права
						readFields[0] = underscore.difference(readFields[0], differenceRead);
					}
					//Сохраняем права на чтение
					if(readFields[0].length !== 0 || readFields[1].length !== 0){
						objAccess[flexoSchemesName[i]]['read'] = readFields;
					}

					//Права на модификацию
					var modifyFields = accessDataPreparationForMethod('modify', objAccessForOneScheme,
						globalFlexoSchemes[flexoSchemesName[i]]['modify']);
					//Проверяем целостность прав на модификацию
					//Права на flexo не должны по полям превышать глобальных прав
					var resultModifyFields = underscore.difference(modifyFields[0], modifyFields[1]);
					var differenceModify = underscore.difference(resultModifyFields,
						globalFlexoSchemes[flexoSchemesName[i]]['modify']);
					if( differenceModify.length !== 0 ){
						//ToDo: доделать сигнализацию о нарушении целостности
						//Присутствует нарушение целостности, обрезаем права
						modifyFields[0] = underscore.difference(modifyFields[0], differenceModify);
					}
					//Сохраняем права на модификацию
					if(modifyFields[0].length !== 0 || modifyFields[1].length !== 0){
						objAccess[flexoSchemesName[i]]['modify'] = modifyFields;
					}

					//Права на создание
					var createFields = accessDataPreparationForMethod('create', objAccessForOneScheme,
						globalFlexoSchemes[flexoSchemesName[i]]['modify']);
					//Проверяем целостность прав на создание
					//Права на flexo не должны по полям превышать глобальных прав
					var resultCreateFields = underscore.difference(createFields[0], createFields[1]);
					var differenceCreate = underscore.difference(resultCreateFields,
						globalFlexoSchemes[flexoSchemesName[i]]['modify']);
					if( differenceCreate.length !== 0 ){
						//ToDo: доделать сигнализацию о нарушении целостности
						//Присутствует нарушение целостности, обрезаем права
						createFields[0] = underscore.difference(createFields[0], differenceCreate);
					}
					//Сохраняем права на создание
					if(createFields[0].length !== 0 || createFields[1].length !== 0){
						objAccess[flexoSchemesName[i]]['create'] = createFields;
					}

					//Права на создание всего документа
					if(objAccessForOneScheme['createAll']){
						objAccess[flexoSchemesName[i]]['createAll'] = 1;
					} else {
						objAccess[flexoSchemesName[i]]['createAll'] = 0;
					}

					//Удаление
					if(objAccessForOneScheme['delete']){
						objAccess[flexoSchemesName[i]]['delete'] = 1;
					} else {
						objAccess[flexoSchemesName[i]]['delete'] = 0;
					}
				}
			}
			callback(null, objAccess)
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
function accessDataPreparationForMethod(method, objAccess, fieldsGlobalFlexoScheme){
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
				var fields = Object.keys(objAccess[method]);
				//Формируем списки которые необходимо добавить или удалить
				for ( var j = 0; j < fields.length; j++) {
					if ( fields[j] !== '(all)' ) {
						if (objAccess[method][fields[j]] === 1){
							permissionFields.push(fields[j]);
						} else {
							notPermissionFields.push(fields[j]);
						}
					}
				}

				//Пересекаем права
				permissionFields = underscore.union(fieldsGlobalFlexoScheme, permissionFields);
			} else {
				//Получаем все поля из объекта прав
				var fields = Object.keys(objAccess[method]);
				//Формируем списки которые необходимо добавить или удалить
				for ( var j = 0; j < fields.length; j++) {
					if ( fields[j] !== '(all)' ) {
						if (objAccess[method][fields[j]] === 1){
							permissionFields.push(fields[j]);
						} else {
							notPermissionFields.push(fields[j]);
						}
					}
				}

				//Объединяем права
				notPermissionFields = underscore.union(fieldsGlobalFlexoScheme, notPermissionFields);
			}
		} else {
			//Получаем все поля из объекта прав
			var fields = Object.keys(objAccess[method]);
			//Формируем списки которые необходимо добавить или удалить
			for ( var j = 0; j < fields.length; j++) {
				//Проверяется, так как в роли при отсутствия спец команды (all) поля с
				// запретом равносильны отсутствию полей
				if (objAccess[method][fields[j]] === 1){
					permissionFields.push(fields[j]);
				} else {
					notPermissionFields.push(fields[j]);
				}
			}
		}
	}

	return [permissionFields, notPermissionFields];
}

/**
 * Удаление модели прав для flexo схемы и логина пользователя в redis
 *
 * @param flexoSchemeName - строка название flexo схемы
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
	//ToDo:Временно удаляем ключ в множестве предназначенного для быстрого удаления всех прав
	multi.SREM( setAllAccess(), key);

	multi.EXEC( function( err ) {
		if ( err ) {
			callback( err );
		} else {
			callback( null, true );
		}
	});
};

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