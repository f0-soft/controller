var underscore = require('underscore');

var AccessModuleRoleView = {};

/**
 * Сохранение модели в redis
 *
 * @param objAccess - объект прав для view роли
 * @param callback (err, reply)
 * 		err - ошибка от node_redis
 * 		reply - true в случае успешного сохранения
 */
AccessModuleRoleView.save = function save( client, role, viewName, objAccess, callback ){
	var multi = client.multi();
	var key; //Формируемый ключ redis

	//Сохранение объекта прав в redis
	key = strViewAccessRole( viewName, role );
	//ToDo:Проверка объекта objAccess
	multi.SET( key, JSON.stringify(objAccess));

	//ToDo:Временно сохраняем ключ в множество для быстрого удаления всех прав
	multi.SADD( setAllAccess(), key );


	multi.EXEC( function( err ) {
		if ( err ) {
			callback( err );
		} else {
			callback( null, true );
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
AccessModuleRoleView.find = function find( client, role, viewName, callback ) {

	client.GET(  strViewAccessRole( viewName, role), function( err, reply ) {
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
 * Удаление модели прав для view в redis по заданному списку flexo scheme
 *
 * @param callback (err, reply)
 * 		err - ошибка от node_redis
 * 		reply - - true в случае успешного удаления
 */
AccessModuleRoleView.delete = function remove(client, role, viewName, callback){
	var multi = client.multi();
	var key;

	//Формируем команды на удаление
	key = strViewAccessRole( viewName, role );
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

/**
 * Возвращаем подготовленный объект с правами на view для будущего определения пересечения прав
 *
 * @returns - объект с подготовленными данными
 */
AccessModuleRoleView.accessPreparation = function accessPreparation( objAccess, viewConfig ) {
	//Формируем объект со справочниками из полей для будущего определения пересечения прав
    var objReturnAccessForRole = {};
	objReturnAccessForRole['add'] = [];
	objReturnAccessForRole['del'] = [];

	var listOf_Vid = Object.keys(objAccess);
	for( var i = 0; i < listOf_Vid.length; i++ ) {
		if( objAccess[listOf_Vid[i]] === 1 ) {
			if( listOf_Vid[i] === '(all)' ) {
				objReturnAccessForRole['add'] = underscore.union( objReturnAccessForRole['add'],
					Object.keys(viewConfig) );
			} else {
				objReturnAccessForRole['add'].push(listOf_Vid[i]);
			}
		} else {
			if( listOf_Vid[i] !== '(all)' ) {
				objReturnAccessForRole['del'].push(listOf_Vid[i]);
			}
		}
	}

	//Возвращаем объект с правами на роль
	return objReturnAccessForRole;
};

//Формирование строки ключа Redis (STRING) для прав относящиеся к view для заданной роли
function strViewAccessRole( viewName, role ) {
	return 'view:role:access:' + viewName + ':' + role;
}

//Формирование ключа Redis (SET) для множества всех ключей с правами
function setAllAccess(){
	return 'all:access:';
}

module.exports = AccessModuleRoleView;
