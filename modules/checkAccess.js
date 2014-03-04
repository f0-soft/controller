var _ = require('underscore');

//Функция проверяет наличие разрешения на выполнения запроса на чтение
exports.checkRead = function checkRead( viewName, queries, socketView, globalViewConfig, READ,
										MODIFY ) {
	//ToDo:
	if( (! queries.selector && typeof(queries.selector) !== "object" ) ||
		!globalViewConfig[viewName] ){
		return false;
	}

	//Переменная для хранения списка view в селекторе
	var viewsFromSelector = Object.keys( queries.selector );
	var _vidsFromSelector; //Список идентификаторов из селектора
	var unresolvedFields; //Переменная хранит результат пересечения двух массивов

	//Обходим селектор
	for( var i = 0; i < viewsFromSelector.length; i++ ) {
		if( !queries.selector[viewsFromSelector[i]] &&
			typeof(queries.selector[viewsFromSelector[i]]) !== "object"){
			return false
		}

		//Получаем список идентификаторов из селектора
		_vidsFromSelector = Object.keys( queries.selector[viewsFromSelector[i]] );

		//Проверяем наличие разрешений в глобальной переменной
		if (!globalViewConfig[viewsFromSelector[i]]){
			return false;
		}

		//Пересекаем с разрешенным списком _vids
		if ( !socketView[viewsFromSelector[i]] ){
			//Нет описания о идентификаторов принадлежных к данной view, поэтому не может быть
			// запросов на не существующие идентификаторы
			return false;
		} else {
			unresolvedFields  = _.difference( _vidsFromSelector,
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
		//Объединяем массива для проверок в один
		var _vidsForSort =  Object.keys(queries.options.sort);
		//Пересекаем с разрешенным списком _vids
		unresolvedFields  = _.difference( _vidsForSort, socketView[viewName].ids  );

		if ( unresolvedFields.length !== 0 ) {
			return false;
		}

		//Проверяем имеет ли запрашиваемый _vids доступ на чтение в глобальной переменной
		for( var n=0; n < _vidsForSort.length; n++ ) {
			_vidsDataFromViewConfig = globalViewConfig[viewName][_vidsForSort[n]];
			if ( !( _vidsDataFromViewConfig && _vidsDataFromViewConfig.flexo &&
				_vidsDataFromViewConfig.flexo.length > 1 &&	( _vidsDataFromViewConfig.type === READ ||
				_vidsDataFromViewConfig.type === MODIFY ) ) ) {
				return false;
			}
		}
	}

	return true;
};

//Функция проверяет наличие разрешения на выполнения запроса на создание
exports.checkCreate = function checkCreate( viewName, queries, listOfAllowed_vids, globalViewConfig,
											MODIFY ) {
	//Список идентификаторов _vids view из запроса на проверку
	var _vidsForCheck = [];
	//Список не разрешенных полей
	var unresolvedFields;
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

	for( var i = 0; i < queries.length; i++ ) {
		var _vidsFromOneDocument = [];

		if( typeof(queries[i]) !== "object" ){
			return false;
		}

		if( !_.isEmpty( queries[i] ) ) {
			_vidsFromOneDocument = Object.keys( queries[i] );
		}

		_vidsForCheck = _.union(_vidsForCheck, _vidsFromOneDocument);
	}

	if( _vidsForCheck.length === 0 ) {
		return false;
	}

	//Пересекаем с разрешенным списком _vids
	unresolvedFields  = _.difference(_vidsForCheck, listOfAllowed_vids);

	if (unresolvedFields.length !== 0){
		return false;
	}

	//Проверяем имеет ли запрашиваемый _vids доступ к flexo в глобальной переменной
	for( var j = 0; j < _vidsForCheck.length; j++ ) {
		_vidsDataFromViewConfig = dataFromViewConfig[_vidsForCheck[j]];
		if (!( _vidsDataFromViewConfig && _vidsDataFromViewConfig.flexo &&
			_vidsDataFromViewConfig.flexo.length > 1 &&
			//_vidsDataFromViewConfig.type === CREATE ) ) {
			_vidsDataFromViewConfig.type === MODIFY ) ) {
			return false;
		}
	}

	return true;
};


//Функция проверяет наличие разрешения на выполнения запроса на модификацию
exports.checkModify = function checkModify( viewName, queries, listOfAllowed_vids, globalViewConfig,
											MODIFY ) {
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

		if( !_.isEmpty( queries[i].properties ) ) {
			_vidsFromOneDocument = Object.keys( queries[i].properties );
		}
		_vidsForCheck = _.union( _vidsForCheck, _vidsFromOneDocument );
	}

	if( _vidsForCheck.length === 0 ) {
		return false;
	}

	//Пересекаем с разрешенным списком _vids
	unresolvedFields  = _.difference( _vidsForCheck, listOfAllowed_vids );

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
};

//Функция проверяет наличие разрешения на выполнения запроса на удаление
exports.checkDelete = function checkDelete( viewName, queries, listOfAllowed_vids,
											globalViewConfig, DELETE ) {
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

		if( !_.isEmpty( queries[i] ) ) {
			_vidsFromOneDocument = Object.keys( queries[i] );
		}
		_vidsForCheck = _.union( _vidsForCheck, _vidsFromOneDocument );
	}

	if( _vidsForCheck.length === 0 ) {
		return false;
	}

	//Пересекаем с разрешенным списком _vids
	unresolvedFields  = _.difference( _vidsForCheck, listOfAllowed_vids );

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
	flexoScheme = _.uniq( flexoScheme );

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
