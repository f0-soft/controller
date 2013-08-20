var underscore = require('underscore');

var AccessModuleUserView = {};

/**
 * Сохранение модели в redis
 *
 * @param callback (err, reply)
 * 		err - ошибка от node_redis
 * 		reply - true в случае успешного сохранения
 */
AccessModuleUserView.save = function save( client, user, viewName, objAccess, callback ){
	var multi = client.multi();
	var key; //Формируемый ключ redis

	//Сохранение объекта прав в redis
	key = strViewAccessUser( viewName, user );
	//ToDo:Проверка объекта objAccess
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
 * Поиск модели прав для view в redis
 *
 * @param callback (err, reply)
 * 		err - ошибка от node_redis
 * 		reply - возвращается искомый объект прав
 */
AccessModuleUserView.find = function find( client, user, viewName, callback ) {

	client.GET(  strViewAccessUser( viewName, user), function( err, reply ) {
		if ( err ) {
			callback( err );
		} else {
			if ( reply ) {
				var objAccess  = JSON.parse(reply);

				callback( null, objAccess );
			} else {
				callback(new Error('No requested object access (user: ' + user +', ' +
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
AccessModuleUserView.delete = function remove(client, user, viewName, callback){
	var multi = client.multi();
	var key;

	//Формируем команды на удаление
	key = strViewAccessUser( viewName, user );
	multi.DEL( key );
	//ToDo:Временно удаляем ключ в множестве предназначенного для быстрого удаления всех прав
	multi.SREM( setAllAccess(), key);

	multi.EXEC( function( err ) {
		if ( err ) {
			callback( err );
		} else {
			//ToDo:Доделать возможность удаления не всех данных из уже имеющимся в модели
			callback( null, true );
		}
	});
};

/**
 * Возвращаем подготовленный объект с правами на view для будущего определения пересечения прав
 *
 * @returns {{}} - объект с подготовленными данными
 */
AccessModuleUserView.accessPreparation = function accessPreparation( objAccess, viewConfig ) {
	//Формируем объект со справочниками из полей для будущего определения пересечения прав
	var objReturnAccessForUser = {};
	objReturnAccessForUser['add'] = [];
	objReturnAccessForUser['del'] = [];

	var listOf_Vid = Object.keys(objAccess);
	for( var i = 0; i < listOf_Vid.length; i++ ) {
		if( objAccess[listOf_Vid[i]] === 1 ) {
			if( listOf_Vid[i] === '(all)' ) {
				objReturnAccessForUser['add'] = underscore.union( objReturnAccessForUser['add'],
					Object.keys(viewConfig) );
			} else {
				objReturnAccessForUser['add'].push(listOf_Vid[i]);
			}
		} else {
			if( listOf_Vid[i] === '(all)' ) {
				objReturnAccessForUser['del'] = underscore.union( objReturnAccessForUser['add'],
					Object.keys(viewConfig) );
			} else {
				objReturnAccessForUser['del'].push(listOf_Vid[i]);
			}
		}
	}

	//Возвращаем объект с правами на роль
	return objReturnAccessForUser;
};

//Формирование строки ключа Redis (STRING) для прав относящиеся к view для заданной схемы и
//пользователю
function strViewAccessUser( viewName, user ) {
	return 'view:user:access:' + viewName + ':' + user;
}

//Формирование ключа Redis (SET) для множества всех ключей с правами
function setAllAccess(){
	return 'all:access:';
}

module.exports = AccessModuleUserView;