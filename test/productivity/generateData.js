var async = require( 'async' );
var _ = require('underscore');

var GenerateDataForFlexo = {};

var controller;
var sender;
var libOfViews;
var useLibOfViews = {};
var _views;
var _flexos;
var configTest;

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

GenerateDataForFlexo.init = function init(oContoller, oSender, oLibOfViews, o_views, o_flexos, oConfigTest){
	controller = oContoller;
	sender = oSender;
	libOfViews = oLibOfViews;
	_views = o_views;
	_flexos = o_flexos;
	configTest = oConfigTest;
	return true;
};

GenerateDataForFlexo.saveFlexoAccessForRole = function saveFlexoAccessForRole( callback ) {
	//Вставляем разрешения для всех схем
	var listOfFlexoScheme = Object.keys( _flexos );
	//Объект прав для flexo по роли (все разрешено)
	var objAccessForRole = {
		read: { '(all)':1, 'fields':[] },
		modify: { '(all)':1, 'fields':[] },
		create: { '(all)':1, 'fields':[] },
		createAll: 1,
		delete: 1
	};

	async.map(listOfFlexoScheme,
		function( flexoSchemeName, cb ){
			//Формируем запрос на сохранение прав
			var queryForSave = {
				access:{
					flexoSchemeName: flexoSchemeName,
					role:sender.role,
					objAccess: objAccessForRole
				}
			};
			controller.create(queryForSave, sender, cb);
		},
		callback
	);
};

GenerateDataForFlexo.saveViewAccessForRole = function saveViewAccessForRole( arg, callback ) {
	//Вставляем разрешения для всех схем
	var listOfViewScheme = Object.keys( _views );
	//Объект прав для view по роли (все разрешено)
	var objAccessForRole = {
		'(all)':1,
		'viewIds':[],
		'(useId)':0
	};

	async.map(listOfViewScheme,
		function( viewSchemeName, cb ){
			//Формируем запрос на сохранение прав
			var queryForSave = {
				access:{
					viewName: viewSchemeName,
					role:sender.role,
					objAccess: objAccessForRole
				}
			};
			controller.create(queryForSave, sender, cb);
		},
		callback
	);
};

GenerateDataForFlexo.fillTestFlexos2_3 = function fillTestFlexos2_3( callback ) {
	var viewName = 'testView2_3';
	libOfViews[viewName] = [];

	//Формируем запрос на множественную вставку
	var queryToCreate = [];
	var query; //Один документ на вставку
	var listOfVids = getListOfVids(viewName, 'modify');

	var countOfDoc = configTest.optionsForGenerateData.countInsert[viewName] ||
		configTest.optionsForGenerateData.сountInsertsInFlexo;

	for( var i = 0; i < countOfDoc; i++ ) {
		query = {};
		for( var j = 0; j < listOfVids.length; j++ ) {
			var flexoShemeName = _views[viewName][listOfVids[j]]._flexo.scheme[0];
			var flexoFieldName = _views[viewName][listOfVids[j]]._flexo.scheme[1];

			var type = _flexos[flexoShemeName][flexoFieldName].type;
			var randNumber;

			if ( type === 'string' ) {
				query[listOfVids[j]] = generatorString(1,
					configTest.optionsForGenerateData.maxGenerateString);
			} else if ( type === 'number' ) {
				query[listOfVids[j]] = getRandom(1,
					configTest.optionsForGenerateData.maxGenerateNumber);
			} else if ( 'tV19' === listOfVids[j] ) {
				if ( configTest.optionsForGenerateData.uniqDependId ) {
					query[listOfVids[j]] = getIndexOfUniqDependId('testView2_2');
				} else {
					randNumber = getRandom(0, (libOfViews['testView2_2'].length - 1));
					query[listOfVids[j]] = libOfViews['testView2_2'][randNumber]['tV01'];
				}
			} else if ('tV18' === listOfVids[j] ) {
				if ( configTest.optionsForGenerateData.uniqDependId ) {
					query[listOfVids[j]] = getIndexOfUniqDependId('testView2_1');
				} else {
					randNumber = getRandom(0, (libOfViews['testView2_1'].length - 1));
					query[listOfVids[j]] = libOfViews['testView2_1'][randNumber]['tV01'];
				}
			}
		}
		queryToCreate.push(query);

		//Сохраняем данные в словарь
		libOfViews[viewName].push(query);
	}

	insertGenerateDataToOneFlexo( viewName, queryToCreate, callback);
};

GenerateDataForFlexo.fillTestFlexos4_3 = function fillTestFlexos4_3( callback ) {
	var viewName = 'testView4_3';
	libOfViews[viewName] = [];

	//Формируем запрос на множественную вставку
	var queryToCreate = [];
	var query; //Один документ на вставку
	var listOfVids = getListOfVids(viewName, 'modify');

	var countOfDoc = configTest.optionsForGenerateData.countInsert[viewName] ||
		configTest.optionsForGenerateData.сountInsertsInFlexo;

	for( var i = 0; i < countOfDoc; i++ ) {
		query = {};
		for( var j = 0; j < listOfVids.length; j++ ) {
			var flexoShemeName = _views[viewName][listOfVids[j]]._flexo.scheme[0];
			var flexoFieldName = _views[viewName][listOfVids[j]]._flexo.scheme[1];

			var type = _flexos[flexoShemeName][flexoFieldName].type;
			var randNumber;

			if ( type === 'string' ) {
				query[listOfVids[j]] = generatorString(1,
					configTest.optionsForGenerateData.maxGenerateString);
			} else if ( type === 'number' ) {
				query[listOfVids[j]] = getRandom(1,
					configTest.optionsForGenerateData.maxGenerateNumber);
			} else if ( 'tV19' === listOfVids[j] ) {
				if ( configTest.optionsForGenerateData.uniqDependId ) {
					query[listOfVids[j]] = getIndexOfUniqDependId('testView4_2');
				} else {
					//Определяем количество вставлемых связей
					randNumber = getRandom(0, (libOfViews['testView4_2'].length - 1));
					query[listOfVids[j]] = libOfViews['testView4_2'][randNumber]['tV01'];
				}
			} else if ('tV18' === listOfVids[j] ) {
				if ( configTest.optionsForGenerateData.uniqDependId ) {
					query[listOfVids[j]] = getIndexOfUniqDependId('testView4_1');
				} else {
					//Определяем количество вставлемых связей
					randNumber = getRandom(0, (libOfViews['testView4_1'].length - 1));
					query[listOfVids[j]] = libOfViews['testView4_1'][randNumber]['tV01'];
				}
			}
		}
		queryToCreate.push(query);

		//Сохраняем данные в словарь
		libOfViews[viewName].push(query);
	}

	insertGenerateDataToOneFlexo( viewName, queryToCreate, callback);
};

GenerateDataForFlexo.fillTestFlexos4_4 = function fillTestFlexos4_4( callback ) {
	var viewName = 'testView4_4';
	libOfViews[viewName] = [];

	//Формируем запрос на множественную вставку
	var queryToCreate = [];
	var query; //Один документ на вставку
	var listOfVids = getListOfVids(viewName, 'modify');

	var countOfDoc = configTest.optionsForGenerateData.countInsert[viewName] ||
		configTest.optionsForGenerateData.сountInsertsInFlexo;

	for( var i = 0; i < countOfDoc; i++ ) {
		query = {};
		for( var j = 0; j < listOfVids.length; j++ ) {
			var flexoShemeName = _views[viewName][listOfVids[j]]._flexo.scheme[0];
			var flexoFieldName = _views[viewName][listOfVids[j]]._flexo.scheme[1];

			var type = _flexos[flexoShemeName][flexoFieldName].type;
			var randNumber;

			if ( type === 'string' ) {
				query[listOfVids[j]] = generatorString(1,
					configTest.optionsForGenerateData.maxGenerateString);
			} else if ( type === 'number' ) {
				query[listOfVids[j]] = getRandom(1,
					configTest.optionsForGenerateData.maxGenerateNumber);
			} else if ('tV18' === listOfVids[j] || 'tV19' === listOfVids[j] ) {
				if ( configTest.optionsForGenerateData.uniqDependId ) {
					if ( !query[listOfVids[j]]){
						var id = getIndexOfUniqDependId('testView4_3');
						query['tV18'] = id;
						query['tV19'] = id;
					}
				} else {
					randNumber = getRandom(0, (libOfViews['testView4_3'].length - 1));
					query['tV18'] = libOfViews['testView4_3'][randNumber]['tV01'];
					query['tV19'] = libOfViews['testView4_3'][randNumber]['tV01'];
				}
			}
		}
		queryToCreate.push(query);

		//Сохраняем данные в словарь
		libOfViews[viewName].push(query);
	}

	insertGenerateDataToOneFlexo( viewName, queryToCreate, callback);
};

GenerateDataForFlexo.simpleFillingTestFlexos = function simpleFillingTestFlexos( viewName, callback ){
	libOfViews[viewName] = [];

	//Формируем запрос на множественную вставку
	var queryToCreate = [];
	var query; //Один документ на вставку
	var listOfVids = getListOfVids(viewName, 'modify');

	var countOfDoc = configTest.optionsForGenerateData.countInsert[viewName] ||
		configTest.optionsForGenerateData.сountInsertsInFlexo;

	for( var i = 0; i < countOfDoc; i++ ) {
		query = {};
		for( var j = 0; j < listOfVids.length; j++ ) {
			var flexoShemeName = _views[viewName][listOfVids[j]]._flexo.scheme[0];
			var flexoFieldName = _views[viewName][listOfVids[j]]._flexo.scheme[1];

			var type = _flexos[flexoShemeName][flexoFieldName].type;

			if ( type === 'string' ) {
				query[listOfVids[j]] = generatorString(1,
					configTest.optionsForGenerateData.maxGenerateString);
			} else if ( type === 'number' ) {
				query[listOfVids[j]] = getRandom(1,
					configTest.optionsForGenerateData.maxGenerateNumber);
			}
		}
		queryToCreate.push(query);

		//Сохраняем данные в словарь
		libOfViews[viewName].push(query);
	}

	insertGenerateDataToOneFlexo( viewName, queryToCreate, callback);
};

GenerateDataForFlexo.fillTestFlexosWithOneOfId =
	function fillTestFlexosWithOneOfId( viewName, motherViewName, callback ) {
	libOfViews[viewName] = [];

	//Формируем запрос на множественную вставку
	var queryToCreate = [];
	var query; //Один документ на вставку
	var listOfVids = getListOfVids(viewName, 'modify');

		var countOfDoc = configTest.optionsForGenerateData.countInsert[viewName] ||
			configTest.optionsForGenerateData.сountInsertsInFlexo;

		for( var i = 0; i < countOfDoc; i++ ) {
		query = {};
		for( var j = 0; j < listOfVids.length; j++ ) {
			var flexoShemeName = _views[viewName][listOfVids[j]]._flexo.scheme[0];
			var flexoFieldName = _views[viewName][listOfVids[j]]._flexo.scheme[1];

			var type = _flexos[flexoShemeName][flexoFieldName].type;

			if ( type === 'string' ) {
				query[listOfVids[j]] = generatorString(1,
					configTest.optionsForGenerateData.maxGenerateString);
			} else if ( type === 'number' ) {
				query[listOfVids[j]] = getRandom(1,
					configTest.optionsForGenerateData.maxGenerateNumber);
			} else if ( 'tV18' === listOfVids[j] ) {
				if ( configTest.optionsForGenerateData.uniqDependId ) {
					query[listOfVids[j]] = getIndexOfUniqDependId(motherViewName);
				} else {
					var randNumber = getRandom(0, (libOfViews[motherViewName].length - 1));
					query[listOfVids[j]] = libOfViews[motherViewName][randNumber]['tV01'];
				}
			}
		}
		queryToCreate.push(query);

		//Сохраняем данные в словарь
		libOfViews[viewName].push(query);
	}

	insertGenerateDataToOneFlexo( viewName, queryToCreate, callback);
};

//Зарезервирован (не используется)
GenerateDataForFlexo.fillTestFlexosWithOneArrayOfId =
	function fillTestFlexosWithOneArrayOfId( viewName, motherViewName, callback ) {
	libOfViews[viewName] = [];

	//Формируем запрос на множественную вставку
	var queryToCreate = [];
	var query; //Один документ на вставку
	var listOfVids = getListOfVids(viewName, 'modify');

	var countOfDoc = configTest.optionsForGenerateData.countInsert[viewName] ||
		configTest.optionsForGenerateData.сountInsertsInFlexo;

	for( var i = 0; i < countOfDoc; i++ ) {
		query = {};
		for( var j = 0; j < listOfVids.length; j++ ) {
			var flexoShemeName = _views[viewName][listOfVids[j]]._flexo.scheme[0];
			var flexoFieldName = _views[viewName][listOfVids[j]]._flexo.scheme[1];

			var type = _flexos[flexoShemeName][flexoFieldName].type;

			if ( type === 'string' ) {
				query[listOfVids[j]] = generatorString(1,
					configTest.optionsForGenerateData.maxGenerateString);
			} else if ( type === 'number' ) {
				query[listOfVids[j]] = getRandom(1,
					configTest.optionsForGenerateData.maxGenerateNumber);
			} else if ( 'tV18' === listOfVids[j] ) {
				//Определяем количество вставлемых связей
				var countOfvId = getRandom( 1,
					configTest.optionsForGenerateData.maxCountIdsInDepend );

				query[listOfVids[j]] = [];
				for(var k = 0; k < countOfvId; k++ ) {
					var randNumber = getRandom(0, (libOfViews[motherViewName].length - 1));
					query[listOfVids[j]].push( libOfViews[motherViewName][randNumber]['tV01'] );
				}
			}
		}
		queryToCreate.push(query);

		//Сохраняем данные в словарь
		libOfViews[viewName].push(query);
	}

	insertGenerateDataToOneFlexo( viewName, queryToCreate, callback);
};

function insertGenerateDataToOneFlexo( viewName, queryToCreate, callback ){
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
		if ( err ) {
			callback( err );
		} else {
			//Сохраняем данные
			var dateStart = new Date().getTime();

			var objectToCreate = {
				type:'create',
				place: sender.place,
				request:queryToCreate,
				viewName:viewName
			};

			controller.queryToView ( objectToCreate, socket,
				function(err, documents ){
					if( err ) {
						callback( err )
					} else {
						console.log('✓ - Вставка ' +
							configTest.optionsForGenerateData.сountInsertsInFlexo +
							' сгенерированных данных для ' + viewName +': ' +
							( new Date().getTime() - dateStart ) + ' ms.');
						//Сохраняем _id и tsUpdate в словарик
						for( var i = 0; i < documents.length ; i++ ){
							libOfViews[viewName][i]['tV01'] = documents[i]['tV01'];
							libOfViews[viewName][i]['tV02'] = documents[i]['tV02'];
						}

						callback( );
					}
				});
		}
	});
}

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


function getIndexOfUniqDependId(viewName){
	if ( !useLibOfViews[viewName] || useLibOfViews[viewName].length === 0 ){
		useLibOfViews[viewName] = _.clone(libOfViews[viewName])
	}
	var index = getRandom(0, (useLibOfViews[viewName].length -1));
	var id = useLibOfViews[viewName][index]['tV01'];
	useLibOfViews[viewName].splice(index, 1);
	return id;
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

module.exports = GenerateDataForFlexo;