var LibOfTestFunction = {};

var controller;
var libOfViews;
var _views;
var _flexos;

//Словарь используемый для генерации строк
var charString = ['й','ц','у','к','е','н','г','ш','щ',
	'з','з','х','ъ','ф','ы','в','а','п','р','о','л',
	'д','ж','э','я','ч','с','м','и','т','ь','б','ю','Й',
	'Ц','У','К','Е','Н','Г','Ш','Щ','З','Х',
	'Ъ','Ф','Ы','В','А','П','Р','О','Л','Д','Ж','Э',
	'Я','Ч','С','М','И','Т','Ь','Б','Ю','q',
	'w','e','r','t','y','u','i','o','p','a','s','d','f',
	'g','h','j','k','l','z','x','c','v','b','n','m',
	'1','2','3','4','5','6','7','8','9','0','Q',
	'W','E','R','T','Y','U','I','O','P','A','S','D','F',
	'G','H','J','K','L','Z','X','C','V','B','N','M'];

LibOfTestFunction.init = function init(oController, oLibOfViews, o_views, o_flexos){
	controller = oController;
	libOfViews = oLibOfViews;
	_views = o_views;
	_flexos = o_flexos;
	return true;
};

LibOfTestFunction.simpleFind = function simpleFind(viewName, request, sender, callback){

	var socket = {
		login: sender.login,
		role: sender.role,
		userId: sender.userId
	};

	var object = {
		viewName:viewName,
		place: sender.place
	};

	var timeStart = new Date().getTime();
	controller.getTemplate( object, socket, function( err, config, template, time ) {
		if ( err ){
			callback ( err );
		} else {

			var objectToQuery = {
				type:'read',
				place: sender.place,
				request:request,
				viewName:viewName
			};

			controller.queryToView ( objectToQuery, socket, function( err, documents, count/*, time*/){
				callback(err, documents, count, time-timeStart);
			});
		}
	});
};

LibOfTestFunction.simpleInsert = function simpleInsert(viewName, request, sender, callback){
	var socket = {
		login: sender.login,
		role: sender.role,
		userId: sender.userId
	};

	var object = {
		viewName:viewName,
		place: sender.place
	};

	controller.getTemplate( object, socket, function( err, config, template ) {
		if ( err ){
			callback ( err );
		} else {
			var objectToQuery = {
				type:'create',
				place: sender.place,
				request:request,
				viewName:viewName
			};

			controller.queryToView ( objectToQuery, socket, callback);
		}
	});
};

LibOfTestFunction.simpleModify = function simpleModify(viewName, request, sender, callback){
	var socket = {
		login: sender.login,
		role: sender.role,
		userId: sender.userId
	};

	var object = {
		viewName:viewName,
		place: sender.place
	};

	controller.getTemplate( object, socket, function( err, config, template ) {
		if ( err ){
			callback ( err );
		} else {
			var objectToQuery = {
				type:'modify',
				place: sender.place,
				request:request,
				viewName:viewName
			};

			controller.queryToView ( objectToQuery, socket, callback);
		}
	});
};

LibOfTestFunction.simpleDelete = function simpleDelete(viewName, request, sender, callback){
	var socket = {
		login: sender.login,
		role: sender.role,
		userId: sender.userId
	};

	var object = {
		viewName:viewName,
		place: sender.place
	};

	controller.getTemplate( object, socket, function( err, config, template ) {
		if ( err ){
			callback ( err );
		} else {
			var objectToQuery = {
				type:'delete',
				place: sender.place,
				request:request,
				viewName:viewName
			};

			controller.queryToView ( objectToQuery, socket, callback);
		}
	});
};

LibOfTestFunction.formingSimpleFindQuery = function formingSimpleFindQuery(viewName, motherView, flexoName, findOption) {

	if ( findOption === 'OneValAnyStrField' ) {
		//Ищем одно строковое поле
		var listOfStrFields = getListOfFlexoNameWithType( 'string', flexoName );
		var oneRandField = listOfStrFields[getRandom(0, (listOfStrFields.length - 1))];
		//Ищем viewId для этого поля на чтение
		var viewIdRead =  getViewIdWithType('read', viewName, flexoName, oneRandField);
		if ( !viewIdRead ) {
			//Если не находи по чтению, смотрим модификацию
			viewIdRead =  getViewIdWithType('modify', viewName, flexoName, oneRandField);
		}
		//Ищем viewId для этого поля на создание
		if ( motherView ) {
			var viewIdCreate =  getViewIdWithType('modify', motherView, flexoName, oneRandField);
			//Выбираем случайное значение из словарика данных для выбранной viewId
			var indexInLib = getRandom(0, (libOfViews[motherView].length-1) );
			var valueOfViewIdForRead = libOfViews[motherView][indexInLib][viewIdCreate];
		} else {
			var viewIdCreate =  getViewIdWithType('modify', viewName, flexoName, oneRandField);
			//Выбираем случайное значение из словарика данных для выбранной viewId
			var indexInLib = getRandom(0, (libOfViews[viewName].length-1) );
			var valueOfViewIdForRead = libOfViews[viewName][indexInLib][viewIdCreate];
		}

		if ( viewIdRead && viewIdCreate ) {
			//Формируем запрос на чтение
			var request = {selector:{}};
			request.selector[viewName] = {};
			request.selector[viewName][viewIdRead] = valueOfViewIdForRead;
			return request;
		} else {
			return false;
		}

		//Формируем запрос на чтение
		var request = { selector: {'testManager':{ m3:buffer.obj[1].managers['m5']} } };
	} else if ( findOption === 'OneValAnyNumField' ) {
		//Ищем одно строковое поле
		var listOfStrFields = getListOfFlexoNameWithType( 'number', flexoName );
		var oneRandField = listOfStrFields[getRandom(0, (listOfStrFields.length - 1))];
		//Ищем viewId для этого поля на чтение
		var viewIdRead =  getViewIdWithType('read', viewName, flexoName, oneRandField);
		if ( !viewIdRead ) {
			//Если не находи по чтению, смотрим модификацию
			viewIdRead =  getViewIdWithType('modify', viewName, flexoName, oneRandField);
		}
		//Ищем viewId для этого поля на создание
		if ( motherView ) {
			var viewIdCreate =  getViewIdWithType('modify', motherView, flexoName, oneRandField);
			//Выбираем случайное значение из словарика данных для выбранной viewId
			var indexInLib = getRandom(0, (libOfViews[motherView].length-1) );
			var valueOfViewIdForRead = libOfViews[motherView][indexInLib][viewIdCreate];
		} else {
			var viewIdCreate =  getViewIdWithType('modify', viewName, flexoName, oneRandField);
			//Выбираем случайное значение из словарика данных для выбранной viewId
			var indexInLib = getRandom(0, (libOfViews[viewName].length-1) );
			var valueOfViewIdForRead = libOfViews[viewName][indexInLib][viewIdCreate];
		}

		if ( viewIdRead && viewIdCreate ) {
			//Формируем запрос на чтение
			var request = {selector:{}};
			request.selector[viewName] = {};
			request.selector[viewName][viewIdRead] = valueOfViewIdForRead;
			return request;
		} else {
			return false;
		}
	} else if ( findOption === 'SomeValAnyNumField' ) {

	} else if (findOption === 'generalId'){

		var indexInLib = getRandom(0, (libOfViews[motherView].length-1) );
		var valueOfViewIdForRead = libOfViews[motherView][indexInLib]['tV01'];

		//Формируем запрос на чтение
		var request = {selector:{}};
		request.selector[viewName] = {};
		request.selector[viewName]['tV01'] = valueOfViewIdForRead;
		return request;
	}
};

LibOfTestFunction.formingSimpleInsertQuery = function formingSimpleInsertQuery(viewName, countOfDoc,
	lengthOfString, minNumber, maxNumber){

	//Формируем запрос на множественную вставку
	var queryToCreate = [];
	var query; //Один документ на вставку
	var listOfVids = getListOfVids(viewName, 'modify');

	for( var i = 0; i < countOfDoc; i++ ) {
		query = {};
		for( var j = 0; j < listOfVids.length; j++ ) {
			var flexoShemeName = _views[viewName][listOfVids[j]]._flexo.scheme[0];
			var flexoFieldName = _views[viewName][listOfVids[j]]._flexo.scheme[1];

			var type = _flexos[flexoShemeName][flexoFieldName].type;

			if ( type === 'string' ) {
				query[listOfVids[j]] = generatorString(lengthOfString, lengthOfString);
			} else if ( type === 'number' ) {
				query[listOfVids[j]] = getRandom(minNumber, maxNumber);
			}
		}
		queryToCreate.push(query);
	}
	return queryToCreate;
};

LibOfTestFunction.formingInsertQueryWithOneDependId =
	function formingInsertQueryWithOneDependId(viewName, countOfDoc, lengthOfString,
											   minNumber, maxNumber, motherViewName){

	//Формируем запрос на множественную вставку
	var queryToCreate = [];
	var query; //Один документ на вставку
	var listOfVids = getListOfVids(viewName, 'modify');

	for( var i = 0; i < countOfDoc; i++ ) {
		query = {};
		for( var j = 0; j < listOfVids.length; j++ ) {
			var flexoShemeName = _views[viewName][listOfVids[j]]._flexo.scheme[0];
			var flexoFieldName = _views[viewName][listOfVids[j]]._flexo.scheme[1];

			var type = _flexos[flexoShemeName][flexoFieldName].type;

			if ( type === 'string' ) {
				query[listOfVids[j]] = generatorString(lengthOfString, lengthOfString);
			} else if ( type === 'number' ) {
				query[listOfVids[j]] = getRandom(minNumber, maxNumber);
			} else if ( 'tV18' === listOfVids[j] ) {
				var randNumber = getRandom(0, (libOfViews[motherViewName].length - 1));
				query[listOfVids[j]] = libOfViews[motherViewName][randNumber]['tV01'];
			}
		}
		queryToCreate.push(query);
	}

	return queryToCreate;
};

LibOfTestFunction.formingSpecialInsertQueryVariant1 =
	function formingSpecialInsertQueryVariant1(viewName, countOfDoc, lengthOfString, minNumber,
											   maxNumber, motherViewNames){
	//Формируем запрос на множественную вставку
	var queryToCreate = [];
	var query; //Один документ на вставку
	var listOfVids = getListOfVids(viewName, 'modify');

	for( var i = 0; i < countOfDoc; i++ ) {
		query = {};
		for( var j = 0; j < listOfVids.length; j++ ) {
			var flexoShemeName = _views[viewName][listOfVids[j]]._flexo.scheme[0];
			var flexoFieldName = _views[viewName][listOfVids[j]]._flexo.scheme[1];

			var type = _flexos[flexoShemeName][flexoFieldName].type;

			if ( type === 'string' ) {
				query[listOfVids[j]] = generatorString(lengthOfString, lengthOfString);
			} else if ( type === 'number' ) {
				query[listOfVids[j]] = getRandom(minNumber, maxNumber);
			} else if ( 'tV18' === listOfVids[j] ) {
				var randNumber = getRandom(0, (libOfViews[motherViewNames[0]].length - 1));
				query[listOfVids[j]] = libOfViews[motherViewNames[0]][randNumber]['tV01'];
			} else if ( 'tV19' === listOfVids[j] ) {
				var randNumber = getRandom(0, (libOfViews[motherViewNames[1]].length - 1));
				query[listOfVids[j]] = libOfViews[motherViewNames[1]][randNumber]['tV01'];
			}
		}
		queryToCreate.push(query);
	}

	return queryToCreate;

};


LibOfTestFunction.formingSimpleModifyQuery =
	function formingSimpleInsertQuery(viewName, modifyOption, countOfDoc, lengthOfString,
									  minNumber, maxNumber, motherViewName){
		//Формируем запрос на множественную модификацию
		var queryToModify = [];
		var query; //Один документ на вставку
		var listOfVids = getListOfVids(viewName, 'modify');

		if ( modifyOption === 'ModifyOneStrVal' ) {
			for( var i = 0; i < countOfDoc; i++ ) {
				query = {};

				//Выбираем документ для изменения
				var index = getRandom(0, (libOfViews[viewName].length - 1));
				var id = libOfViews[viewName][index]['tV01'];
				var tsUpdate = libOfViews[viewName][index]['tV02'];
				query.selector = {};
				query.selector['tV01'] = id;
				query.selector['tV02'] = tsUpdate;

				query.properties = {};

				for( var j = 0; j < listOfVids.length; j++ ) {
					var flexoShemeName = _views[viewName][listOfVids[j]]._flexo.scheme[0];
					var flexoFieldName = _views[viewName][listOfVids[j]]._flexo.scheme[1];

					var type = _flexos[flexoShemeName][flexoFieldName].type;

					if ( type === 'string' ) {
						var generateVal = generatorString(lengthOfString, lengthOfString);
						query.properties[listOfVids[j]] = generateVal;

						break;
					}
				}
				libOfViews[viewName].splice(index, 1);
				queryToModify.push(query);
			}
		} else if (modifyOption === 'ModifyOneNumVal') {
			for( var i = 0; i < countOfDoc; i++ ) {
				query = {};

				//Выбираем документ для изменения
				var index = getRandom(0, (libOfViews[viewName].length - 1));
				var id = libOfViews[viewName][index]['tV01'];
				var tsUpdate = libOfViews[viewName][index]['tV02'];
				query.selector = {};
				query.selector['tV01'] = id;
				query.selector['tV02'] = tsUpdate;

				query.properties = {};

				for( var j = 0; j < listOfVids.length; j++ ) {
					var flexoShemeName = _views[viewName][listOfVids[j]]._flexo.scheme[0];
					var flexoFieldName = _views[viewName][listOfVids[j]]._flexo.scheme[1];

					var type = _flexos[flexoShemeName][flexoFieldName].type;

					if ( type === 'number' ) {
						var generateVal = getRandom(minNumber, maxNumber);
						query.properties[listOfVids[j]] = generateVal;

						break;
					}
				}
				libOfViews[viewName].splice(index, 1);
				queryToModify.push(query);
			}
		} else if ( modifyOption === 'ModifyAllStrVal' ) {
			for( var i = 0; i < countOfDoc; i++ ) {
				query = {};

				//Выбираем документ для изменения
				var index = getRandom(0, (libOfViews[viewName].length - 1));
				var id = libOfViews[viewName][index]['tV01'];
				var tsUpdate = libOfViews[viewName][index]['tV02'];
				query.selector = {};
				query.selector['tV01'] = id;
				query.selector['tV02'] = tsUpdate;

				query.properties = {};

				for( var j = 0; j < listOfVids.length; j++ ) {
					var flexoShemeName = _views[viewName][listOfVids[j]]._flexo.scheme[0];
					var flexoFieldName = _views[viewName][listOfVids[j]]._flexo.scheme[1];

					var type = _flexos[flexoShemeName][flexoFieldName].type;

					if ( type === 'string' ) {
						var generateVal = generatorString(lengthOfString, lengthOfString);
						query.properties[listOfVids[j]] = generateVal;
					}
				}
				libOfViews[viewName].splice(index, 1);
				queryToModify.push(query);
			}
		} else if (modifyOption === 'ModifyAllNumVal') {
			for( var i = 0; i < countOfDoc; i++ ) {
				query = {};

				//Выбираем документ для изменения
				var index = getRandom(0, (libOfViews[viewName].length - 1));
				var id = libOfViews[viewName][index]['tV01'];
				var tsUpdate = libOfViews[viewName][index]['tV02'];
				query.selector = {};
				query.selector['tV01'] = id;
				query.selector['tV02'] = tsUpdate;

				query.properties = {};

				for( var j = 0; j < listOfVids.length; j++ ) {
					var flexoShemeName = _views[viewName][listOfVids[j]]._flexo.scheme[0];
					var flexoFieldName = _views[viewName][listOfVids[j]]._flexo.scheme[1];

					var type = _flexos[flexoShemeName][flexoFieldName].type;

					if ( type === 'number' ) {
						var generateVal = getRandom(minNumber, maxNumber);
						query.properties[listOfVids[j]] = generateVal;
					}
				}
				libOfViews[viewName].splice(index, 1);
				queryToModify.push(query);
			}
		} else if ( modifyOption === 'ModifyDependId' ) {
			for( var i = 0; i < countOfDoc; i++ ) {
				query = {};

				//Выбираем документ для изменения
				var index = getRandom(0, (libOfViews[viewName].length - 1));
				var id = libOfViews[viewName][index]['tV01'];
				var tsUpdate = libOfViews[viewName][index]['tV02'];
				query.selector = {};
				query.selector['tV01'] = id;
				query.selector['tV02'] = tsUpdate;

				query.properties = {};

				for( var j = 0; j < listOfVids.length; j++ ) {
					var flexoShemeName = _views[viewName][listOfVids[j]]._flexo.scheme[0];
					var flexoFieldName = _views[viewName][listOfVids[j]]._flexo.scheme[1];

					var type = _flexos[flexoShemeName][flexoFieldName].type;

					if ( type === 'id' && listOfVids[j] !== 'tV01' ) {
						var randNumber = getRandom(0, (libOfViews[motherViewName].length - 1));
						var value = libOfViews[motherViewName][randNumber]['tV01'];
						query.properties[listOfVids[j]] = value;
					}
				}
				libOfViews[viewName].splice(index, 1);
				queryToModify.push(query);
			}
		}

		return queryToModify;
};

LibOfTestFunction.formingSpecialModifyQueryVariant1 = function
	formingSpecialModifyQueryVariant1(viewName, modifyOption, countOfDoc, lengthOfString, minNumber,
									  maxNumber, motherViewName){
	//Формируем запрос на множественную модификацию
	var queryToModify = [];
	var query; //Один документ на вставку
	var listOfVids = getListOfVids(viewName, 'modify');

	if ( modifyOption === 'ModifyOneStrVal' ) {
		for( var i = 0; i < countOfDoc; i++ ) {
			query = {};

			//Выбираем документ для изменения
			var index = getRandom(0, (libOfViews[viewName].length - 1));
			var id = libOfViews[viewName][index]['tV01'];
			var tsUpdate = libOfViews[viewName][index]['tV02'];
			query.selector = {};
			query.selector['tV01'] = id;
			query.selector['tV02'] = tsUpdate;

			query.properties = {};

			for( var j = 0; j < listOfVids.length; j++ ) {
				var flexoShemeName = _views[viewName][listOfVids[j]]._flexo.scheme[0];
				var flexoFieldName = _views[viewName][listOfVids[j]]._flexo.scheme[1];

				var type = _flexos[flexoShemeName][flexoFieldName].type;

				if ( type === 'string' ) {
					var generateVal = generatorString(lengthOfString, lengthOfString);
					query.properties[listOfVids[j]] = generateVal;

					break;
				}
			}
			libOfViews[viewName].splice(index, 1);
			queryToModify.push(query);
		}
	} else if (modifyOption === 'ModifyOneNumVal') {
		for( var i = 0; i < countOfDoc; i++ ) {
			query = {};

			//Выбираем документ для изменения
			var index = getRandom(0, (libOfViews[viewName].length - 1));
			var id = libOfViews[viewName][index]['tV01'];
			var tsUpdate = libOfViews[viewName][index]['tV02'];
			query.selector = {};
			query.selector['tV01'] = id;
			query.selector['tV02'] = tsUpdate;

			query.properties = {};

			for( var j = 0; j < listOfVids.length; j++ ) {
				var flexoShemeName = _views[viewName][listOfVids[j]]._flexo.scheme[0];
				var flexoFieldName = _views[viewName][listOfVids[j]]._flexo.scheme[1];

				var type = _flexos[flexoShemeName][flexoFieldName].type;

				if ( type === 'number' ) {
					var generateVal = getRandom(minNumber, maxNumber);
					query.properties[listOfVids[j]] = generateVal;

					break;
				}
			}
			libOfViews[viewName].splice(index, 1);
			queryToModify.push(query);
		}
	} else if ( modifyOption === 'ModifyAllStrVal' ) {
		for( var i = 0; i < countOfDoc; i++ ) {
			query = {};

			//Выбираем документ для изменения
			var index = getRandom(0, (libOfViews[viewName].length - 1));
			var id = libOfViews[viewName][index]['tV01'];
			var tsUpdate = libOfViews[viewName][index]['tV02'];
			query.selector = {};
			query.selector['tV01'] = id;
			query.selector['tV02'] = tsUpdate;

			query.properties = {};

			for( var j = 0; j < listOfVids.length; j++ ) {
				var flexoShemeName = _views[viewName][listOfVids[j]]._flexo.scheme[0];
				var flexoFieldName = _views[viewName][listOfVids[j]]._flexo.scheme[1];

				var type = _flexos[flexoShemeName][flexoFieldName].type;

				if ( type === 'string' ) {
					var generateVal = generatorString(lengthOfString, lengthOfString);
					query.properties[listOfVids[j]] = generateVal;
				}
			}
			libOfViews[viewName].splice(index, 1);
			queryToModify.push(query);
		}
	} else if (modifyOption === 'ModifyAllNumVal') {
		for( var i = 0; i < countOfDoc; i++ ) {
			query = {};

			//Выбираем документ для изменения
			var index = getRandom(0, (libOfViews[viewName].length - 1));
			var id = libOfViews[viewName][index]['tV01'];
			var tsUpdate = libOfViews[viewName][index]['tV02'];
			query.selector = {};
			query.selector['tV01'] = id;
			query.selector['tV02'] = tsUpdate;

			query.properties = {};

			for( var j = 0; j < listOfVids.length; j++ ) {
				var flexoShemeName = _views[viewName][listOfVids[j]]._flexo.scheme[0];
				var flexoFieldName = _views[viewName][listOfVids[j]]._flexo.scheme[1];

				var type = _flexos[flexoShemeName][flexoFieldName].type;

				if ( type === 'number' ) {
					var generateVal = getRandom(minNumber, maxNumber);
					query.properties[listOfVids[j]] = generateVal;
				}
			}
			libOfViews[viewName].splice(index, 1);
			queryToModify.push(query);
		}
	} else if ( modifyOption === 'ModifyDependId' ) {
		for( var i = 0; i < countOfDoc; i++ ) {
			query = {};

			//Выбираем документ для изменения
			var index = getRandom(0, (libOfViews[viewName].length - 1));
			var id = libOfViews[viewName][index]['tV01'];
			var tsUpdate = libOfViews[viewName][index]['tV02'];
			query.selector = {};
			query.selector['tV01'] = id;
			query.selector['tV02'] = tsUpdate;

			query.properties = {};

			for( var j = 0; j < listOfVids.length; j++ ) {
				var flexoShemeName = _views[viewName][listOfVids[j]]._flexo.scheme[0];
				var flexoFieldName = _views[viewName][listOfVids[j]]._flexo.scheme[1];

				var type = _flexos[flexoShemeName][flexoFieldName].type;

				if ( type === 'id' && listOfVids[j] === 'tV18' ) {
					var randNumber = getRandom(0, (libOfViews[motherViewName[0]].length - 1));
					var value = libOfViews[motherViewName[0]][randNumber]['tV01'];
					query.properties[listOfVids[j]] = value;
				} else if ( type === 'id' && listOfVids[j] === 'tV19' ) {
					var randNumber = getRandom(0, (libOfViews[motherViewName[1]].length - 1));
					var value = libOfViews[motherViewName[1]][randNumber]['tV01'];
					query.properties[listOfVids[j]] = value;
				}
			}
			libOfViews[viewName].splice(index, 1);
			queryToModify.push(query);
		}
	}

	return queryToModify;
};


LibOfTestFunction.formingSimpleDeleteQuery = function formingSimpleDeleteQuery(viewName, countDoc){
	var queryToDelete = [];
	var query;
	for( var i = 0; i < countDoc; i++ ) {
		query = {};
		//Выбираем документ для изменения
		var index = getRandom(0, (libOfViews[viewName].length - 1));
		var id = libOfViews[viewName][index]['tV01'];
		var tsUpdate = libOfViews[viewName][index]['tV02'];

		query['tV01'] = id;
		query['tV02'] = tsUpdate;
		libOfViews[viewName].splice(index, 1);
		queryToDelete.push(query);
	}

	return queryToDelete;
};

function getListOfVids( viewName, type ) {
	var listOfVids = Object.keys( _views[viewName] );
	var filtredList = [];

	for( var i = 0; i < listOfVids.length; i++ ){
		if ( _views[viewName][listOfVids[i]]._flexo.type === type ) {
			filtredList.push(listOfVids[i]);
		}
	}

	return filtredList;
}

function getListOfFlexoNameWithType( type, flexoName ) {
	var listOfFields = Object.keys( _flexos[flexoName] );
	var resultList = [];
	for( var i = 0; i < listOfFields.length; i++ ){
		if( _flexos[flexoName][listOfFields[i]].type === type ) {
			resultList.push(listOfFields[i]);
		}
	}

	return resultList;
}

function getViewIdWithType( type, viewName, flexoName, flexoFieldName ) {
	var listOfViewIds = Object.keys( _views[viewName] );
	for( var i=0; i < listOfViewIds.length; i++ ) {
		if( _views[viewName][listOfViewIds[i]]._flexo &&
			_views[viewName][listOfViewIds[i]]._flexo.type === type &&
			_views[viewName][listOfViewIds[i]]._flexo.scheme[0] === flexoName &&
			_views[viewName][listOfViewIds[i]]._flexo.scheme[1] === flexoFieldName ) {
			return listOfViewIds[i];
		}
	}

	return null;
}

//Создаем случайное число в заданных пределах
function getRandom(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

//Генерирует строку
function generatorString (z , g) {
	var stringLength = getRandom(z,g);
	var str = '';
	for(var i = 0; i < stringLength; i++){
		str = str + charString[getRandom(0,charString.length-1)];
	}

	return str;
}

module.exports = LibOfTestFunction;

